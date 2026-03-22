import { Hono } from 'hono';
import type { Env, AddressRecord, FlagRecord, SignalData, CheckResult } from '../types';
import { lookupAddress } from '../lib/erc8004';
import { getAddressInfo } from '../lib/blockscout';
import { score } from '../lib/scoring';
import { checkFreeTier, verifyPayment, buildPaymentRequest, FREE_CHECKS_PER_DAY } from '../lib/mpp';

export const checkRouter = new Hono<{ Bindings: Env }>();

const RATE_LIMIT = 100;
const CACHE_TTL = 3600;

async function rateLimit(env: Env, ip: string): Promise<boolean> {
  try {
    const key = `ratelimit:${ip}`;
    const raw = await env.KV.get(key);
    const count = raw ? parseInt(raw, 10) : 0;
    if (count >= RATE_LIMIT) return false;
    await env.KV.put(key, String(count + 1), { expirationTtl: 3600 });
    return true;
  } catch {
    return true; // fail open
  }
}

export async function performCheck(
  address: string,
  chain: string,
  env: Env
): Promise<CheckResult> {
  const normalAddress = address.toLowerCase();
  const cacheKey = `check:${chain}:${normalAddress}`;

  // KV cache
  try {
    const cached = await env.KV.get(cacheKey);
    if (cached) return JSON.parse(cached) as CheckResult;
  } catch {
    // cache miss
  }

  // Step 1: DB lookups in parallel
  const [dbAddr, dbFlags] = await Promise.all([
    env.DB.prepare(
      `SELECT a.*, s.name, s.safety_md_url, s.verified
       FROM addresses a
       JOIN services s ON a.domain = s.domain
       WHERE LOWER(a.address) = LOWER(?) AND a.chain = ?`
    )
      .bind(address, chain)
      .first<AddressRecord>()
      .catch(() => null),

    env.DB.prepare(
      `SELECT * FROM flags WHERE LOWER(address) = LOWER(?) AND chain = ?`
    )
      .bind(address, chain)
      .all<FlagRecord>()
      .then((r) => r.results)
      .catch(() => [] as FlagRecord[]),
  ]);

  // Step 2: On-chain + external lookups (pass known agentId from DB if available)
  const [erc8004Info, blockscoutInfo] = await Promise.all([
    chain === 'base' ? lookupAddress(address, dbAddr?.erc8004_agent_id ?? null) : Promise.resolve(null),
    chain === 'base' ? getAddressInfo(address) : Promise.resolve(null),
  ]);

  const topFlag = dbFlags[0] ?? null;

  // Estimate unique payers from check log
  let unique_payers = 0;
  try {
    const payerResult = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM check_log WHERE LOWER(address) = LOWER(?) AND chain = ? AND result = 'safe'`
    )
      .bind(address, chain)
      .first<{ cnt: number }>();
    unique_payers = payerResult?.cnt ?? 0;
  } catch {
    unique_payers = 0;
  }

  const signals: SignalData = {
    address,
    chain,
    safety_md_published: dbAddr !== null,
    domain_match: dbAddr !== null,
    service_name: dbAddr?.name ?? null,
    service_domain: dbAddr?.domain ?? null,
    service_verified: dbAddr?.verified === 1,
    label: dbAddr?.label ?? null,
    protocols: dbAddr?.protocols ?? null,
    flagged: dbFlags.length > 0,
    flag_source: topFlag?.source ?? null,
    flag_reason: topFlag?.reason ?? null,
    erc8004_registered: erc8004Info !== null,
    erc8004_agent_id: erc8004Info?.agent_id ?? null,
    erc8004_reputation_score: erc8004Info?.reputation_score ?? null,
    erc8004_reputation_count: erc8004Info?.reputation_count ?? null,
    is_contract: blockscoutInfo?.is_contract ?? false,
    tx_count: blockscoutInfo?.tx_count ?? 0,
    age_days: blockscoutInfo?.age_days ?? null,
    unique_payers,
  };

  const scored = score(signals);

  const result: CheckResult = {
    address,
    chain,
    safe: scored.safe,
    risk: scored.risk,
    reason: scored.reason,
    signals,
    service: dbAddr
      ? {
          name: dbAddr.name ?? null,
          domain: dbAddr.domain,
          safety_md_url: dbAddr.safety_md_url ?? null,
          verified: dbAddr.verified === 1,
          label: dbAddr.label ?? null,
          protocols: dbAddr.protocols ? dbAddr.protocols.split(',').filter(Boolean) : [],
          erc8004_agent_id: dbAddr.erc8004_agent_id ?? erc8004Info?.agent_id ?? null,
        }
      : null,
    checked_at: new Date().toISOString(),
  };

  // Cache & log (non-blocking)
  await Promise.allSettled([
    env.KV.put(cacheKey, JSON.stringify(result), { expirationTtl: CACHE_TTL }),
    env.DB.prepare(
      `INSERT INTO check_log (address, chain, result, risk) VALUES (?, ?, ?, ?)`
    )
      .bind(address, chain, scored.safe ? 'safe' : 'unsafe', scored.risk)
      .run(),
  ]);

  return result;
}

checkRouter.get('/:address', async (c) => {
  const address = c.req.param('address');
  const chain = c.req.query('chain') ?? 'base';

  if (!address.startsWith('0x') || address.length !== 42) {
    return c.json({ error: 'Invalid address. Must be 0x-prefixed, 42 characters.' }, 400);
  }

  const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown';

  // Rate limit (hard cap regardless of payment)
  const allowed = await rateLimit(c.env, ip);
  if (!allowed) {
    return c.json({ error: 'Rate limit exceeded. Max 100 requests per hour.' }, 429);
  }

  // MPP payment gate
  // Check for x-payment header first (paid path)
  const xPayment = c.req.header('x-payment') ?? c.req.header('X-Payment');
  if (xPayment) {
    const { valid, reason } = await verifyPayment(c.env, xPayment);
    if (!valid) {
      return c.json({ error: `Payment verification failed: ${reason}` }, 402);
    }
    // Paid — skip free tier, add payment header to response
    c.header('x-payment-accepted', 'true');
  } else {
    // No payment — check free tier
    const { allowed: freeAllowed, remaining } = await checkFreeTier(c.env, ip);
    if (!freeAllowed) {
      // Free tier exhausted — return 402 with payment request
      c.header('Content-Type', 'application/json');
      c.header('x-free-tier-limit', String(FREE_CHECKS_PER_DAY));
      return c.json(buildPaymentRequest(address, chain), 402);
    }
    c.header('x-free-checks-remaining', String(remaining));
  }

  try {
    const result = await performCheck(address, chain, c.env);
    return c.json(result);
  } catch {
    return c.json({ error: 'Check failed. Please try again.' }, 503);
  }
});

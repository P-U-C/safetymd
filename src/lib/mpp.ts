/**
 * MPP (Machine Payment Protocol) x402 payment layer for safety.md
 *
 * Flow:
 *   1. Agent calls GET /v1/check/:address
 *   2. If no x-payment header → 402 with payment-request JSON
 *   3. Agent pays via Tempo MPP, gets a payment receipt token
 *   4. Agent retries with x-payment: <receipt>
 *   5. Worker verifies receipt against Tempo RPC → serves result
 *
 * Free tier: FREE_CHECKS_PER_DAY checks/day per IP (no payment needed)
 * Paid tier: unlimited checks, 0.01 USDC per check on Tempo mainnet
 *
 * Tempo mainnet:
 *   Chain ID: 4217
 *   RPC: https://rpc.tempo.xyz
 *   USDC: use native stablecoin (TIP-20)
 *
 * Reference: https://mpp.dev/overview
 */

import type { Env } from '../types';

export const FREE_CHECKS_PER_DAY = 10;
export const PRICE_USDC = '0.01'; // per check
export const PRICE_WEI = '10000'; // 0.01 USDC in 6-decimal wei
export const MPP_PRICE_USDC = 10000; // numeric constant for tests

// Supported chains for payment settlement
const SUPPORTED_CHAINS = [
  { name: 'base',  chainId: 8453,  rpc: 'https://base-rpc.publicnode.com', network: 'base' },
  { name: 'tempo', chainId: 4217,  rpc: 'https://rpc.tempo.xyz',           network: 'tempo' },
] as const;

const TEMPO_RPC = 'https://rpc.tempo.xyz'; // kept for on-chain verify compat

// Our payment receiving address (same deployer wallet)
const PAYMENT_ADDRESS = '0xB1e55EdD3176Ce9C9aF28F15b79e0c0eb8Fe51AA';

// Service description for payment-request
const SERVICE_NAME = 'safety.md';
const SERVICE_DESCRIPTION = 'ERC-8004 agent address safety check';

/**
 * Build an x402 payment-request response body per MPP spec.
 * Returns the full 402 payload agents should parse.
 */
export function buildPaymentRequest(address: string, chain: string): object {
  const resource = `https://safetymd.p-u-c.workers.dev/v1/check/${address}?chain=${chain}`;
  return {
    version: '1.0',
    error: 'Payment required',
    accepts: SUPPORTED_CHAINS.map((c) => ({
      scheme: 'exact',
      network: c.network,
      chainId: c.chainId,
      maxAmountRequired: PRICE_WEI,
      resource,
      description: `${SERVICE_DESCRIPTION} for ${address} on ${chain}`,
      mimeType: 'application/json',
      payTo: PAYMENT_ADDRESS,
      maxTimeoutSeconds: 60,
      asset: 'USDC',
      outputSchema: null,
      extra: {
        name: SERVICE_NAME,
        version: '0.1.0',
        supportedChains: SUPPORTED_CHAINS.map((x) => ({ chainId: x.chainId, network: x.network })),
      },
    })),
  };
}

/**
 * Check free tier usage for an IP.
 * Returns { allowed: true } if within free tier, { allowed: false } if exhausted.
 */
export async function checkFreeTier(
  env: Env,
  ip: string
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `freetier:${today}:${ip}`;
    const raw = await env.KV.get(key);
    const used = raw ? parseInt(raw, 10) : 0;
    if (used < FREE_CHECKS_PER_DAY) {
      // Increment counter; expires at end of day (86400s)
      const ttl = 86400 - (Math.floor(Date.now() / 1000) % 86400);
      await env.KV.put(key, String(used + 1), { expirationTtl: Math.max(ttl, 3600) });
      return { allowed: true, remaining: FREE_CHECKS_PER_DAY - used - 1 };
    }
    return { allowed: false, remaining: 0 };
  } catch {
    // Fail open — don't block on KV errors
    return { allowed: true, remaining: FREE_CHECKS_PER_DAY };
  }
}

/**
 * Verify an MPP payment receipt token.
 *
 * The x-payment header contains a base64-encoded JSON payment receipt
 * per the x402 / MPP spec. We verify:
 *   1. Receipt is parseable
 *   2. Recipient matches our address
 *   3. Amount >= required price
 *   4. Not already used (check KV for receipt hash)
 *   5. Optionally verify on-chain tx via Tempo RPC
 *
 * Fails open (returns valid=true) if Tempo RPC is unreachable,
 * to avoid blocking agents when chain is slow.
 */
export async function verifyPayment(
  env: Env,
  xPayment: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Decode receipt
    const decoded = atob(xPayment);
    const receipt = JSON.parse(decoded) as {
      txHash?: string;
      from?: string;
      to?: string;
      amount?: string;
      chainId?: number;
      payload?: string;
    };

    // Basic field checks
    if (!receipt.txHash) return { valid: false, reason: 'missing txHash' };
    if (!receipt.to) return { valid: false, reason: 'missing to' };

    // Recipient must match our address
    if (receipt.to.toLowerCase() !== PAYMENT_ADDRESS.toLowerCase()) {
      return { valid: false, reason: 'wrong recipient' };
    }

    // Amount check (if provided)
    if (receipt.amount !== undefined) {
      const paid = BigInt(receipt.amount);
      const required = BigInt(PRICE_WEI);
      if (paid < required) {
        return { valid: false, reason: `underpayment: got ${paid}, need ${required}` };
      }
    }

    // Replay protection — check if txHash was already used
    const usedKey = `payment:used:${receipt.txHash}`;
    const alreadyUsed = await env.KV.get(usedKey).catch(() => null);
    if (alreadyUsed) {
      return { valid: false, reason: 'receipt already used' };
    }

    // Mark receipt as used (24h TTL — enough to prevent replay)
    await env.KV.put(usedKey, '1', { expirationTtl: 86400 }).catch(() => null);

    // Optional: on-chain verification (try each supported chain, fail open if all unreachable)
    try {
      let verified: boolean | null = null;
      for (const c of SUPPORTED_CHAINS) {
        const result = await verifyOnChain(receipt.txHash, receipt.to, c.rpc);
        if (result === true) { verified = true; break; }
        if (result === false) { verified = false; break; }
        // null = unreachable, try next
      }
      if (verified === false) {
        return { valid: false, reason: 'on-chain verification failed' };
      }
    } catch {
      // RPC error → fail open
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'invalid receipt format' };
  }
}

/**
 * Verify tx on Tempo chain via eth_getTransactionReceipt.
 * Returns true if confirmed, false if rejected/not found, null if RPC unreachable.
 */
async function verifyOnChain(
  txHash: string,
  expectedTo: string,
  rpc: string,
): Promise<boolean | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const resp = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'safetymd/0.1' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      }),
      signal: controller.signal,
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      result?: { status?: string; to?: string } | null;
    };
    if (!json.result) return null;
    // status 0x1 = success
    if (json.result.status !== '0x1') return false;
    // Verify recipient
    if (json.result.to && json.result.to.toLowerCase() !== expectedTo.toLowerCase()) {
      return false;
    }
    return true;
  } catch {
    return null; // RPC unreachable → caller fails open
  } finally {
    clearTimeout(timer);
  }
}

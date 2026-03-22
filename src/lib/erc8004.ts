/**
 * ERC-8004 identity & reputation lookups via manual ABI encoding.
 * No ethers.js / web3.js — pure fetch + hex manipulation.
 *
 * Precomputed 4-byte selectors (keccak256 of function signature, first 4 bytes):
 *   agentIdByAddress(address)      → 0x79ce7ac1
 *   getReputationSummary(uint256)  → 0xb9b1f48c
 */

import type { ERC8004Info } from '../types';

const BASE_RPC = 'https://mainnet.base.org';
const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const REPUTATION_REGISTRY = '0xb1E55ED55ac94dB9a725D6263b15B286a82f0f46';

const SEL_AGENT_ID_BY_ADDRESS = '79ce7ac1';
const SEL_GET_REPUTATION_SUMMARY = 'b9b1f48c';

function padLeft(hex: string, bytes: number): string {
  return hex.replace(/^0x/, '').padStart(bytes * 2, '0');
}

function hexToU256(hex: string): bigint {
  return BigInt('0x' + hex.replace(/^0x/, ''));
}

async function ethCall(to: string, data: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const resp = await fetch(BASE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to, data }, 'latest'],
      }),
      signal: controller.signal,
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { result?: string; error?: unknown };
    if (json.error || !json.result || json.result === '0x') return null;
    return json.result;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Returns agent ID or null if not registered / error. */
async function getAgentIdByAddress(address: string): Promise<number | null> {
  const addr = padLeft(address, 32); // 12 zero bytes + 20 byte address
  const data = '0x' + SEL_AGENT_ID_BY_ADDRESS + addr;
  const result = await ethCall(IDENTITY_REGISTRY, data);
  if (!result) return null;
  const hex = result.replace(/^0x/, '');
  if (hex.length < 64) return null;
  const id = hexToU256(hex.slice(0, 64));
  if (id === 0n) return null;
  return Number(id);
}

/** Returns { totalScore, count } or null on error. */
async function getReputationSummary(
  agentId: number
): Promise<{ totalScore: bigint; count: bigint } | null> {
  const idHex = padLeft(agentId.toString(16), 32);
  const data = '0x' + SEL_GET_REPUTATION_SUMMARY + idHex;
  const result = await ethCall(REPUTATION_REGISTRY, data);
  if (!result) return null;
  const hex = result.replace(/^0x/, '');
  if (hex.length < 128) return null;
  const totalScore = hexToU256(hex.slice(0, 64));
  const count = hexToU256(hex.slice(64, 128));
  return { totalScore, count };
}

/** Full ERC-8004 lookup for an address. Returns null if not registered. */
export async function lookupAddress(address: string): Promise<ERC8004Info | null> {
  try {
    const agentId = await getAgentIdByAddress(address);
    if (agentId === null) return null;

    const rep = await getReputationSummary(agentId);
    return {
      agent_id: agentId,
      reputation_score: rep ? Number(rep.totalScore) : null,
      reputation_count: rep ? Number(rep.count) : null,
    };
  } catch {
    return null;
  }
}

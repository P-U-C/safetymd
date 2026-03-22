/**
 * ERC-8004 identity & reputation lookups via manual ABI encoding.
 * No ethers.js / web3.js — pure fetch + hex manipulation.
 *
 * The ERC-8004 Identity Registry is an ERC-721 NFT contract.
 * There is no agentIdByAddress() function — lookup strategy:
 *   1. If caller provides a known agentId (from DB seed), verify via ownerOf(agentId)
 *   2. Otherwise check balanceOf(address) > 0 to confirm ERC-8004 registration
 *   3. getFeedback(agentId) returns reputation history from Reputation Registry
 *
 * Selectors (keccak256 first 4 bytes):
 *   ownerOf(uint256)     → 0x6352211e
 *   balanceOf(address)   → 0x70a08231
 *   getFeedback(uint256) → 0x1106a382
 */

import type { ERC8004Info } from '../types';

const BASE_RPCS = [
  'https://base.llamarpc.com',
  'https://mainnet.base.org',
  'https://base-rpc.publicnode.com',
  'https://1rpc.io/base',
];
const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const REPUTATION_REGISTRY = '0xb1E55ED55ac94dB9a725D6263b15B286a82f0f46';

const SEL_OWNER_OF = '6352211e';
const SEL_BALANCE_OF = '70a08231';
const SEL_GET_FEEDBACK = '1106a382';

function padLeft(hex: string, bytes: number): string {
  return hex.replace(/^0x/, '').padStart(bytes * 2, '0');
}

function hexToU256(hex: string): bigint {
  return BigInt('0x' + hex.replace(/^0x/, ''));
}

async function ethCall(to: string, data: string): Promise<string | null> {
  for (const rpc of BASE_RPCS) {
    try {
      // AbortSignal.timeout() is the correct CF Workers API (no setTimeout needed)
      const resp = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'safetymd/0.1' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to, data }, 'latest'],
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) continue;
      const json = (await resp.json()) as { result?: string; error?: unknown };
      if (json.error || !json.result || json.result === '0x') continue;
      return json.result;
    } catch {
      // try next RPC
    }
  }
  return null;
}

/**
 * Verify address owns a specific agentId NFT via ownerOf(tokenId).
 * Returns true if the address is the owner.
 */
async function verifyOwnership(address: string, agentId: number): Promise<boolean> {
  const idHex = padLeft(agentId.toString(16), 32);
  const data = '0x' + SEL_OWNER_OF + idHex;
  const result = await ethCall(IDENTITY_REGISTRY, data);
  if (!result) return false;
  const owner = '0x' + result.slice(-40);
  return owner.toLowerCase() === address.toLowerCase();
}

/**
 * Check if address holds any ERC-8004 NFTs (balanceOf > 0).
 * Faster than ownership check when agentId is unknown.
 */
async function hasERC8004(address: string): Promise<boolean> {
  const addrHex = padLeft(address, 32);
  const data = '0x' + SEL_BALANCE_OF + addrHex;
  const result = await ethCall(IDENTITY_REGISTRY, data);
  if (!result) return false;
  return hexToU256(result) > 0n;
}

/**
 * Get feedback count from Reputation Registry for a known agentId.
 * getFeedback returns an array — we parse the length from the ABI-encoded response.
 */
async function getFeedbackCount(agentId: number): Promise<number | null> {
  const idHex = padLeft(agentId.toString(16), 32);
  const data = '0x' + SEL_GET_FEEDBACK + idHex;
  const result = await ethCall(REPUTATION_REGISTRY, data);
  if (!result) return null;
  const hex = result.replace(/^0x/, '');
  // ABI-encoded dynamic array: offset (32 bytes) + length (32 bytes) + items
  if (hex.length < 128) return 0;
  const count = hexToU256(hex.slice(64, 128));
  return Number(count);
}

/**
 * Full ERC-8004 lookup for an address.
 * If knownAgentId is provided (from DB), verify ownership directly.
 * Otherwise fall back to balanceOf check.
 */
export async function lookupAddress(
  address: string,
  knownAgentId?: number | null
): Promise<ERC8004Info | null> {
  try {
    let agentId: number | null = null;

    if (knownAgentId != null) {
      // Fast path: verify the seeded agentId
      const owns = await verifyOwnership(address, knownAgentId);
      if (owns) agentId = knownAgentId;
    } else {
      // Slow path: just check if registered at all
      const registered = await hasERC8004(address);
      if (!registered) return null;
      // agentId unknown without enumeration — return registered=true with no score
      return { agent_id: null, reputation_score: null, reputation_count: null };
    }

    if (agentId === null) return null;

    const count = await getFeedbackCount(agentId);
    return {
      agent_id: agentId,
      reputation_score: count ?? null,
      reputation_count: count ?? null,
    };
  } catch {
    return null;
  }
}

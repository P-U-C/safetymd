/**
 * Blockscout API integration for Base mainnet.
 * Fetches address metadata: contract status, tx count, age.
 *
 * Base mainnet genesis: ~June 2023 (block 0).
 * Block rate: ~2 blocks/second.
 */

import type { BlockscoutInfo } from '../types';

const BASE_URL = 'https://base.blockscout.com/api/v2/addresses';

// Base mainnet approximate genesis timestamp (2023-07-13T00:00:00Z)
const BASE_GENESIS_TS = 1689206400000; // ms
const BASE_BLOCK_TIME_MS = 500; // ~2 blocks/sec = 500ms per block

function estimateAgeDays(creationBlock: number): number {
  const blockMs = BASE_GENESIS_TS + creationBlock * BASE_BLOCK_TIME_MS;
  const age = Date.now() - blockMs;
  return Math.max(0, Math.floor(age / (1000 * 60 * 60 * 24)));
}

export async function getAddressInfo(address: string): Promise<BlockscoutInfo | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const resp = await fetch(`${BASE_URL}/${address}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!resp.ok) return null;

    const data = (await resp.json()) as {
      is_contract?: boolean;
      transactions_count?: string | number;
      token_transfers_count?: string | number;
      creation_transaction_block_number?: number | null;
      block_number_balance_updated_at?: number | null;
    };

    const txCount =
      typeof data.transactions_count === 'string'
        ? parseInt(data.transactions_count, 10)
        : (data.transactions_count ?? 0);

    const creationBlock = data.creation_transaction_block_number ?? null;
    const ageDays = creationBlock !== null ? estimateAgeDays(creationBlock) : null;

    return {
      is_contract: data.is_contract ?? false,
      tx_count: isNaN(txCount) ? 0 : txCount,
      age_days: ageDays,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

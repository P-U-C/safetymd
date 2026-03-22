import { Hono } from 'hono';
import type { Env } from '../types';
import { performCheck } from './check';

export const batchRouter = new Hono<{ Bindings: Env }>();

interface BatchItem {
  address: string;
  chain?: string;
}

batchRouter.post('/', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }

  if (!body || typeof body !== 'object' || !Array.isArray((body as { addresses?: unknown }).addresses)) {
    return c.json({ error: 'Body must be { addresses: [...] }' }, 400);
  }

  const items = (body as { addresses: unknown[] }).addresses;
  if (items.length === 0) {
    return c.json({ error: 'addresses array is empty.' }, 400);
  }
  if (items.length > 20) {
    return c.json({ error: 'Maximum 20 addresses per batch request.' }, 400);
  }

  // Validate all items first
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as BatchItem;
    if (!item || typeof item.address !== 'string') {
      return c.json({ error: `Item ${i}: address must be a string.` }, 400);
    }
    if (!item.address.startsWith('0x') || item.address.length !== 42) {
      return c.json({ error: `Item ${i}: invalid address format.` }, 400);
    }
  }

  const results = await Promise.all(
    items.map(async (item) => {
      const { address, chain = 'base' } = item as BatchItem;
      try {
        return await performCheck(address, chain, c.env);
      } catch {
        return {
          address,
          chain: chain ?? 'base',
          error: 'Check failed.',
        };
      }
    })
  );

  return c.json({ results, count: results.length });
});

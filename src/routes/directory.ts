import { Hono } from 'hono';
import type { Env } from '../types';

export const directoryRouter = new Hono<{ Bindings: Env }>();

directoryRouter.get('/', async (c) => {
  const chain = c.req.query('chain');
  const protocol = c.req.query('protocol');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10), 200);
  const offset = parseInt(c.req.query('offset') ?? '0', 10);

  try {
    let query: string;
    const params: (string | number)[] = [];

    if (chain && protocol) {
      query = `
        SELECT a.address, a.chain, a.label, a.protocols, a.erc8004_agent_id, a.erc8004_verified,
               s.name, s.domain, s.safety_md_url, s.verified
        FROM addresses a
        JOIN services s ON a.domain = s.domain
        WHERE a.chain = ? AND (a.protocols LIKE ? OR a.protocols = ?)
        ORDER BY s.verified DESC, s.name ASC
        LIMIT ? OFFSET ?
      `;
      params.push(chain, `%${protocol}%`, protocol, limit, offset);
    } else if (chain) {
      query = `
        SELECT a.address, a.chain, a.label, a.protocols, a.erc8004_agent_id, a.erc8004_verified,
               s.name, s.domain, s.safety_md_url, s.verified
        FROM addresses a
        JOIN services s ON a.domain = s.domain
        WHERE a.chain = ?
        ORDER BY s.verified DESC, s.name ASC
        LIMIT ? OFFSET ?
      `;
      params.push(chain, limit, offset);
    } else if (protocol) {
      query = `
        SELECT a.address, a.chain, a.label, a.protocols, a.erc8004_agent_id, a.erc8004_verified,
               s.name, s.domain, s.safety_md_url, s.verified
        FROM addresses a
        JOIN services s ON a.domain = s.domain
        WHERE a.protocols LIKE ? OR a.protocols = ?
        ORDER BY s.verified DESC, s.name ASC
        LIMIT ? OFFSET ?
      `;
      params.push(`%${protocol}%`, protocol, limit, offset);
    } else {
      query = `
        SELECT a.address, a.chain, a.label, a.protocols, a.erc8004_agent_id, a.erc8004_verified,
               s.name, s.domain, s.safety_md_url, s.verified
        FROM addresses a
        JOIN services s ON a.domain = s.domain
        ORDER BY s.verified DESC, s.name ASC
        LIMIT ? OFFSET ?
      `;
      params.push(limit, offset);
    }

    const stmt = c.env.DB.prepare(query);
    // D1 bind doesn't support spread, so bind params positionally
    const bound = params.reduce((s: D1PreparedStatement, p) => s.bind(p), stmt);
    const result = await bound.all<{
      address: string;
      chain: string;
      label: string | null;
      protocols: string | null;
      erc8004_agent_id: number | null;
      erc8004_verified: number;
      name: string | null;
      domain: string;
      safety_md_url: string;
      verified: number;
    }>();

    const entries = result.results.map((r) => ({
      address: r.address,
      chain: r.chain,
      label: r.label,
      protocols: r.protocols ? r.protocols.split(',').filter(Boolean) : [],
      erc8004_agent_id: r.erc8004_agent_id,
      erc8004_verified: r.erc8004_verified === 1,
      service: {
        name: r.name,
        domain: r.domain,
        safety_md_url: r.safety_md_url,
        verified: r.verified === 1,
      },
    }));

    return c.json({
      entries,
      count: entries.length,
      limit,
      offset,
      filters: { chain: chain ?? null, protocol: protocol ?? null },
    });
  } catch {
    return c.json({ error: 'Directory query failed.' }, 503);
  }
});

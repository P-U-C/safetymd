import { Hono } from 'hono';
import type { Env, ServiceRecord, AddressRecord } from '../types';

export const servicesRouter = new Hono<{ Bindings: Env }>();

servicesRouter.get('/:domain', async (c) => {
  const domain = c.req.param('domain').toLowerCase();
  if (!domain || domain.length < 3) {
    return c.json({ error: 'Invalid domain.' }, 400);
  }

  try {
    const [service, addresses] = await Promise.all([
      c.env.DB.prepare(`SELECT * FROM services WHERE domain = ?`).bind(domain).first<ServiceRecord>(),
      c.env.DB.prepare(`SELECT * FROM addresses WHERE domain = ?`)
        .bind(domain)
        .all<AddressRecord>()
        .then((r) => r.results),
    ]);

    if (!service) {
      return c.json({ error: 'Service not found.' }, 404);
    }

    return c.json({
      service,
      addresses: addresses.map((a) => ({
        address: a.address,
        chain: a.chain,
        label: a.label,
        protocols: a.protocols ? a.protocols.split(',').filter(Boolean) : [],
        erc8004_agent_id: a.erc8004_agent_id,
        erc8004_verified: a.erc8004_verified === 1,
      })),
    });
  } catch {
    return c.json({ error: 'Database error.' }, 503);
  }
});

servicesRouter.post('/register', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }

  const b = body as Record<string, unknown>;
  const domain = typeof b.domain === 'string' ? b.domain.trim().toLowerCase() : '';
  const name = typeof b.name === 'string' ? b.name.trim() : null;
  const safety_md_url =
    typeof b.safety_md_url === 'string'
      ? b.safety_md_url.trim()
      : `https://${domain}/.well-known/safety.md`;

  if (!domain || domain.length < 3) {
    return c.json({ error: 'domain is required.' }, 400);
  }
  if (!safety_md_url.startsWith('https://')) {
    return c.json({ error: 'safety_md_url must start with https://.' }, 400);
  }

  try {
    await c.env.DB.prepare(
      `INSERT INTO services (domain, name, safety_md_url, crawl_status, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', datetime('now'), datetime('now'))
       ON CONFLICT(domain) DO UPDATE SET
         name = COALESCE(excluded.name, name),
         safety_md_url = excluded.safety_md_url,
         crawl_status = 'pending',
         updated_at = datetime('now')`
    )
      .bind(domain, name, safety_md_url)
      .run();

    return c.json({ success: true, domain, message: 'Service registered. Crawl scheduled.' }, 201);
  } catch {
    return c.json({ error: 'Registration failed.' }, 503);
  }
});

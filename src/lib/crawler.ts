import type { Env } from '../types';
import { parseFrontmatter } from './yaml';

const CRAWL_TIMEOUT_MS = 5000;

async function fetchSafetyMd(domain: string): Promise<{ url: string; content: string } | null> {
  const urls = [
    `https://${domain}/.well-known/safety.md`,
    `https://${domain}/safety.md`,
  ];
  for (const url of urls) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CRAWL_TIMEOUT_MS);
    try {
      const resp = await fetch(url, {
        headers: { Accept: 'text/markdown, text/plain, */*' },
        signal: controller.signal,
      });
      if (resp.ok) {
        const content = await resp.text();
        clearTimeout(timer);
        return { url, content };
      }
    } catch {
      // try next
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function crawlAll(env: Env): Promise<void> {
  let domains: string[] = [];
  try {
    const result = await env.DB.prepare(
      `SELECT domain FROM services WHERE crawl_status != 'skip'`
    ).all<{ domain: string }>();
    domains = result.results.map((r) => r.domain);
  } catch {
    return;
  }

  for (const domain of domains) {
    try {
      await crawlDomain(domain, env);
    } catch {
      // log failure, continue
      await env.DB.prepare(
        `UPDATE services SET crawl_status='error', updated_at=datetime('now') WHERE domain=?`
      )
        .bind(domain)
        .run();
    }
  }
}

async function crawlDomain(domain: string, env: Env): Promise<void> {
  const result = await fetchSafetyMd(domain);
  if (!result) {
    await env.DB.prepare(
      `UPDATE services SET crawl_status='not_found', last_crawled=datetime('now'), updated_at=datetime('now') WHERE domain=?`
    )
      .bind(domain)
      .run();
    return;
  }

  const { url, content } = result;
  const hash = await hashContent(content);
  const parsed = parseFrontmatter(content);

  await env.DB.prepare(
    `UPDATE services SET
      safety_md_url=?,
      safety_md_hash=?,
      last_crawled=datetime('now'),
      crawl_status='ok',
      raw_yaml=?,
      updated_at=datetime('now')
    WHERE domain=?`
  )
    .bind(url, hash, parsed ? JSON.stringify(parsed) : null, domain)
    .run();

  if (parsed && Array.isArray(parsed.addresses)) {
    for (const addr of parsed.addresses as Array<Record<string, unknown>>) {
      const address = String(addr.address ?? '').trim();
      const chain = String(addr.chain ?? 'ethereum').trim().toLowerCase();
      const protocols = Array.isArray(addr.protocols)
        ? (addr.protocols as string[]).join(',')
        : String(addr.protocols ?? '');
      const label = addr.label ? String(addr.label) : null;

      if (!address.startsWith('0x') || address.length !== 42) continue;

      await env.DB.prepare(
        `INSERT INTO addresses (address, chain, domain, protocols, label)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(address, chain) DO UPDATE SET
           domain=excluded.domain,
           protocols=excluded.protocols,
           label=excluded.label`
      )
        .bind(address, chain, domain, protocols, label)
        .run();
    }
  }
}

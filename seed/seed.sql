-- Seed known services
INSERT OR IGNORE INTO services (domain, name, safety_md_url, crawl_status, verified) VALUES
  ('oracle.b1e55ed.permanentupperclass.com', 'b1e55ed', 'https://oracle.b1e55ed.permanentupperclass.com/.well-known/safety.md', 'skip', 1),
  ('alchemy.com', 'Alchemy', 'https://alchemy.com/.well-known/safety.md', 'pending', 0),
  ('dune.com', 'Dune Analytics', 'https://dune.com/.well-known/safety.md', 'pending', 0),
  ('browserbase.com', 'Browserbase', 'https://browserbase.com/.well-known/safety.md', 'pending', 0),
  ('fal.ai', 'fal.ai', 'https://fal.ai/.well-known/safety.md', 'pending', 0),
  ('nansen.ai', 'Nansen', 'https://nansen.ai/.well-known/safety.md', 'pending', 0),
  ('parallel.xyz', 'Parallel Web Systems', 'https://parallel.xyz/.well-known/safety.md', 'pending', 0),
  ('merit.systems', 'Merit Systems', 'https://merit.systems/.well-known/safety.md', 'pending', 0);

-- b1e55ed real address
INSERT OR IGNORE INTO addresses (address, chain, domain, protocols, label, erc8004_agent_id, erc8004_verified) VALUES
  ('0xB1e55EdD3176Ce9C9aF28F15b79e0c0eb8Fe51AA', 'base', 'oracle.b1e55ed.permanentupperclass.com', 'erc20,eth', 'b1e55ed Oracle', 28362, 1);

-- Placeholder addresses for other services
INSERT OR IGNORE INTO addresses (address, chain, domain, protocols, label) VALUES
  ('0x0000000000000000000000000000000000000001', 'ethereum', 'alchemy.com', 'erc20', 'Alchemy Payments'),
  ('0x0000000000000000000000000000000000000002', 'ethereum', 'dune.com', 'erc20', 'Dune Analytics Payments'),
  ('0x0000000000000000000000000000000000000003', 'ethereum', 'browserbase.com', 'erc20', 'Browserbase Payments'),
  ('0x0000000000000000000000000000000000000004', 'ethereum', 'fal.ai', 'erc20', 'fal.ai Payments'),
  ('0x0000000000000000000000000000000000000005', 'ethereum', 'nansen.ai', 'erc20', 'Nansen Payments'),
  ('0x0000000000000000000000000000000000000006', 'ethereum', 'parallel.xyz', 'erc20', 'Parallel Payments'),
  ('0x0000000000000000000000000000000000000007', 'ethereum', 'merit.systems', 'erc20', 'Merit Systems Payments');

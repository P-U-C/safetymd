CREATE TABLE IF NOT EXISTS services (
  domain TEXT PRIMARY KEY,
  name TEXT,
  safety_md_url TEXT NOT NULL,
  safety_md_hash TEXT,
  last_crawled TEXT,
  crawl_status TEXT DEFAULT 'pending',
  verified INTEGER DEFAULT 0,
  raw_yaml TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS addresses (
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  domain TEXT NOT NULL REFERENCES services(domain),
  protocols TEXT,
  label TEXT,
  erc8004_agent_id INTEGER,
  erc8004_verified INTEGER DEFAULT 0,
  PRIMARY KEY (address, chain)
);

CREATE TABLE IF NOT EXISTS flags (
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  source TEXT NOT NULL,
  reason TEXT,
  flagged_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (address, chain, source)
);

CREATE TABLE IF NOT EXISTS check_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  result TEXT NOT NULL,
  risk TEXT NOT NULL,
  checked_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_checks_address ON check_log (address, chain);
CREATE INDEX IF NOT EXISTS idx_checks_time ON check_log (checked_at);

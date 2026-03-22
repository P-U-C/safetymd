export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ENVIRONMENT: string;
}

export interface ServiceRecord {
  domain: string;
  name: string | null;
  safety_md_url: string;
  safety_md_hash: string | null;
  last_crawled: string | null;
  crawl_status: string;
  verified: number;
  raw_yaml: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddressRecord {
  address: string;
  chain: string;
  domain: string;
  protocols: string | null;
  label: string | null;
  erc8004_agent_id: number | null;
  erc8004_verified: number;
  // joined from services
  name?: string | null;
  safety_md_url?: string;
  verified?: number;
}

export interface FlagRecord {
  address: string;
  chain: string;
  source: string;
  reason: string | null;
  flagged_at: string;
}

export interface SignalData {
  address: string;
  chain: string;
  // DB signals
  safety_md_published: boolean;
  domain_match: boolean;
  service_name: string | null;
  service_domain: string | null;
  service_verified: boolean;
  label: string | null;
  protocols: string | null;
  // flag signals
  flagged: boolean;
  flag_source: string | null;
  flag_reason: string | null;
  // ERC-8004 signals
  erc8004_registered: boolean;
  erc8004_agent_id: number | null;
  erc8004_reputation_score: number | null;
  erc8004_reputation_count: number | null;
  // Blockscout signals
  is_contract: boolean;
  tx_count: number;
  age_days: number | null;
  // computed
  unique_payers: number;
}

export interface CheckResult {
  address: string;
  chain: string;
  safe: boolean;
  risk: RiskLevel;
  reason: string;
  signals: SignalData;
  service: {
    name: string | null;
    domain: string | null;
    safety_md_url: string | null;
    verified: boolean;
    label: string | null;
    protocols: string[];
    erc8004_agent_id: number | null;
  } | null;
  checked_at: string;
}

export interface ERC8004Info {
  agent_id: number | null;
  reputation_score: number | null;
  reputation_count: number | null;
}

export interface BlockscoutInfo {
  is_contract: boolean;
  tx_count: number;
  age_days: number | null;
}

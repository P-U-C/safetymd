import { describe, it, expect } from 'vitest';
import { score } from '../src/lib/scoring';
import type { SignalData } from '../src/types';

describe('scoring', () => {
  const baseSignals: SignalData = {
    address: '0x0000000000000000000000000000000000000000',
    chain: 'ethereum',
    safety_md_published: false,
    domain_match: false,
    service_name: null,
    service_domain: null,
    service_verified: false,
    label: null,
    protocols: null,
    flagged: false,
    flag_source: null,
    flag_reason: null,
    erc8004_registered: false,
    erc8004_agent_id: null,
    erc8004_reputation_score: null,
    erc8004_reputation_count: null,
    is_contract: false,
    tx_count: 0,
    age_days: null,
    unique_payers: 0,
  };

  it('should mark flagged addresses as critical risk', () => {
    const signals: SignalData = {
      ...baseSignals,
      flagged: true,
      flag_source: 'chainalysis',
      flag_reason: 'sanctioned',
    };

    const result = score(signals);

    expect(result.safe).toBe(false);
    expect(result.risk).toBe('critical');
    expect(result.reason).toContain('flagged');
  });

  it('should mark verified service with safety.md + ERC-8004 as low risk', () => {
    const signals: SignalData = {
      ...baseSignals,
      safety_md_published: true,
      domain_match: true,
      erc8004_registered: true,
      service_name: 'Uniswap',
      erc8004_agent_id: 123,
      service_verified: true,
    };

    const result = score(signals);

    expect(result.safe).toBe(true);
    expect(result.risk).toBe('low');
    expect(result.reason).toContain('verified');
  });

  it('should mark established address with age + payers as low risk', () => {
    const signals: SignalData = {
      ...baseSignals,
      age_days: 365,
      unique_payers: 50,
      tx_count: 1000,
    };

    const result = score(signals);

    expect(result.safe).toBe(true);
    expect(result.risk).toBe('low');
    expect(result.reason).toContain('days old');
  });

  it('should mark very new address with few txs as high risk', () => {
    const signals: SignalData = {
      ...baseSignals,
      age_days: 3,
      tx_count: 2,
      safety_md_published: false,
      erc8004_registered: false,
    };

    const result = score(signals);

    expect(result.safe).toBe(false);
    expect(result.risk).toBe('high');
    expect(result.reason).toContain('High risk');
  });

  it('should mark address with partial signals as medium risk', () => {
    const signals: SignalData = {
      ...baseSignals,
      safety_md_published: true,
      age_days: 15,
      tx_count: 10,
      erc8004_registered: false,
    };

    const result = score(signals);

    expect(result.safe).toBe(true);
    expect(result.risk).toBe('medium');
    expect(result.reason).toContain('partial trust signals');
  });

  it('should return safe=false when flagged=true', () => {
    const signals: SignalData = {
      ...baseSignals,
      flagged: true,
    };

    const result = score(signals);

    expect(result.safe).toBe(false);
  });

  it('should return safe=true for verified service', () => {
    const signals: SignalData = {
      ...baseSignals,
      safety_md_published: true,
      domain_match: true,
      erc8004_registered: true,
      service_verified: true,
    };

    const result = score(signals);

    expect(result.safe).toBe(true);
  });
});

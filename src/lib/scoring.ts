import type { SignalData, RiskLevel } from '../types';

export interface ScoreResult {
  safe: boolean;
  risk: RiskLevel;
  reason: string;
}

export function score(signals: SignalData): ScoreResult {
  // Rule 1: flagged → critical
  if (signals.flagged) {
    const detail = [signals.flag_source, signals.flag_reason].filter(Boolean).join(': ');
    return {
      safe: false,
      risk: 'critical',
      reason: `Address is flagged${detail ? ` — ${detail}` : ''}. Do not send funds.`,
    };
  }

  // Rule 2: no safety_md + no erc8004 + very new + few txs → high
  if (
    !signals.safety_md_published &&
    !signals.erc8004_registered &&
    signals.tx_count < 5 &&
    (signals.age_days === null || signals.age_days < 7)
  ) {
    return {
      safe: false,
      risk: 'high',
      reason:
        'Address has no safety.md registration, no ERC-8004 identity, fewer than 5 transactions, and is less than 7 days old. High risk of fraud.',
    };
  }

  // Rule 3a: strong signals via safety.md + domain match + erc8004
  if (signals.safety_md_published && signals.domain_match && signals.erc8004_registered) {
    const parts: string[] = [];
    if (signals.service_name) parts.push(`Registered service: ${signals.service_name}`);
    if (signals.erc8004_agent_id) parts.push(`ERC-8004 agent #${signals.erc8004_agent_id}`);
    if (signals.service_verified) parts.push('domain verified');
    return {
      safe: true,
      risk: 'low',
      reason: `Address verified via safety.md and ERC-8004. ${parts.join(', ')}.`,
    };
  }

  // Rule 3b: strong signals via age + payers + clean
  if (!signals.flagged && signals.age_days !== null && signals.age_days > 30 && signals.unique_payers > 10) {
    return {
      safe: true,
      risk: 'low',
      reason: `Address is ${signals.age_days} days old with ${signals.unique_payers} known payers and no flags. Low risk.`,
    };
  }

  // Rule 4: partial signals → medium
  const positives: string[] = [];
  const negatives: string[] = [];

  if (signals.safety_md_published) positives.push('has safety.md');
  else negatives.push('no safety.md');

  if (signals.erc8004_registered) positives.push('ERC-8004 registered');
  else negatives.push('no ERC-8004 identity');

  if (signals.age_days !== null && signals.age_days > 7) positives.push(`${signals.age_days}d old`);
  if (signals.tx_count > 5) positives.push(`${signals.tx_count} txs`);

  const summary = [
    positives.length ? `Positive: ${positives.join(', ')}.` : '',
    negatives.length ? `Missing: ${negatives.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    safe: true,
    risk: 'medium',
    reason: `Address has partial trust signals. ${summary} Proceed with caution.`,
  };
}

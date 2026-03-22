import { describe, it, expect } from 'vitest';
import { buildPaymentRequest, FREE_CHECKS_PER_DAY, PRICE_WEI } from '../src/lib/mpp';

describe('mpp', () => {
  describe('buildPaymentRequest', () => {
    it('should return valid payment-request structure', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const chain = 'ethereum';
      const result = buildPaymentRequest(address, chain);

      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('accepts');
      expect((result as any).version).toBe('1.0');
      expect((result as any).error).toBe('Payment required');
    });

    it('should include correct payment details', () => {
      const address = '0xtest';
      const chain = 'base';
      const result = buildPaymentRequest(address, chain) as any;

      expect(result.accepts).toBeInstanceOf(Array);
      expect(result.accepts.length).toBeGreaterThan(0);

      const baseOption = result.accepts.find((a: any) => a.chainId === 8453);
      expect(baseOption).toBeDefined();
      expect(baseOption.maxAmountRequired).toBe('10000'); // 0.01 USDC in 6-decimal
      expect(baseOption.payTo).toBe('0xB1e55EdD3176Ce9C9aF28F15b79e0c0eb8Fe51AA');
      expect(baseOption.asset).toBe('USDC');
    });

    it('should support Tempo chain (4217)', () => {
      const result = buildPaymentRequest('0xtest', 'ethereum') as any;
      const tempoOption = result.accepts.find((a: any) => a.chainId === 4217);

      expect(tempoOption).toBeDefined();
      expect(tempoOption.network).toBe('tempo');
      expect(tempoOption.maxAmountRequired).toBe('10000');
    });

    it('should include resource URL in payment request', () => {
      const address = '0xabc';
      const chain = 'polygon';
      const result = buildPaymentRequest(address, chain) as any;

      const option = result.accepts[0];
      expect(option.resource).toContain(`/v1/check/${address}`);
      expect(option.resource).toContain(`chain=${chain}`);
    });
  });

  describe('constants', () => {
    it('should have correct free tier limit', () => {
      expect(FREE_CHECKS_PER_DAY).toBe(10);
    });

    it('should have correct price in wei (0.01 USDC = 10000)', () => {
      expect(PRICE_WEI).toBe('10000');
    });

    it('should support Base mainnet (8453)', () => {
      const result = buildPaymentRequest('0xtest', 'test') as any;
      const chains = result.accepts.map((a: any) => a.chainId);
      expect(chains).toContain(8453);
    });

    it('should support Tempo mainnet (4217)', () => {
      const result = buildPaymentRequest('0xtest', 'test') as any;
      const chains = result.accepts.map((a: any) => a.chainId);
      expect(chains).toContain(4217);
    });
  });
});

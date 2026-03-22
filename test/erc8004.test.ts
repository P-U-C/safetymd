import { describe, it, expect } from 'vitest';
import { padLeft, hexToU256, SEL_OWNER_OF, SEL_BALANCE_OF, SEL_GET_FEEDBACK } from '../src/lib/erc8004';

describe('erc8004 ABI encoding helpers', () => {
  describe('padLeft', () => {
    it('should pad hex to 32 bytes (64 chars)', () => {
      const result = padLeft('0x1', 32);
      expect(result).toBe('0000000000000000000000000000000000000000000000000000000000000001');
      expect(result.length).toBe(64);
    });

    it('should handle addresses correctly', () => {
      const addr = '0xb1e55ed55ac94db9a725d6263b15b286a82f0f46';
      const result = padLeft(addr, 32);
      expect(result).toBe('000000000000000000000000b1e55ed55ac94db9a725d6263b15b286a82f0f46');
      expect(result.length).toBe(64);
    });

    it('should handle hex without 0x prefix', () => {
      const result = padLeft('ff', 32);
      expect(result).toBe('00000000000000000000000000000000000000000000000000000000000000ff');
    });

    it('should not truncate already-padded values', () => {
      const hex = '0000000000000000000000000000000000000000000000000000000000000001';
      const result = padLeft(hex, 32);
      expect(result).toBe(hex);
    });
  });

  describe('hexToU256', () => {
    it('should parse hex to bigint correctly', () => {
      expect(hexToU256('0x0')).toBe(0n);
      expect(hexToU256('0x1')).toBe(1n);
      expect(hexToU256('0xff')).toBe(255n);
      expect(hexToU256('0x100')).toBe(256n);
    });

    it('should handle large numbers', () => {
      const hex = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const result = hexToU256(hex);
      expect(result).toBe(BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935'));
    });

    it('should handle hex without 0x prefix', () => {
      expect(hexToU256('ff')).toBe(255n);
    });
  });

  describe('function selectors', () => {
    it('ownerOf(uint256) selector should be 6352211e', () => {
      expect(SEL_OWNER_OF).toBe('6352211e');
    });

    it('balanceOf(address) selector should be 70a08231', () => {
      expect(SEL_BALANCE_OF).toBe('70a08231');
    });

    it('getFeedback(uint256) selector should be 1106a382', () => {
      expect(SEL_GET_FEEDBACK).toBe('1106a382');
    });
  });
});

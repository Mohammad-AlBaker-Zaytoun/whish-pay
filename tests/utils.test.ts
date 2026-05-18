import { describe, it, expect, afterEach } from 'vitest';
import {
  generateExternalId,
  validateAmount,
  isValidCurrency,
  validatePaymentRequest,
  parseCallbackUrl,
  getEnvironmentFromNodeEnv,
} from '../src/utils';
import { WhishValidationError } from '../src/errors';

describe('generateExternalId', () => {
  it('generates a unique numeric ID', () => {
    const id1 = generateExternalId();
    const id2 = generateExternalId();

    expect(typeof id1).toBe('number');
    expect(typeof id2).toBe('number');
  });

  it('generates IDs within safe integer range', () => {
    for (let i = 0; i < 100; i++) {
      const id = generateExternalId();
      expect(id).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
      expect(id).toBeGreaterThan(0);
    }
  });

  it('generates mostly unique IDs with sufficient entropy', () => {
    const ids = new Set<number>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateExternalId());
    }
    expect(ids.size).toBeGreaterThanOrEqual(90);
  });

  it('generates non-empty values', () => {
    const id = generateExternalId();
    expect(id).toBeTruthy();
    expect(id).not.toBe(0);
  });
});

describe('validateAmount', () => {
  it('returns true for exact match', () => {
    expect(validateAmount(100, 100, 'USD')).toBe(true);
    expect(validateAmount(1500000, 1500000, 'LBP')).toBe(true);
  });

  it('returns true within default USD tolerance (0.02)', () => {
    expect(validateAmount(99.99, 100, 'USD')).toBe(true);
    expect(validateAmount(100.01, 100, 'USD')).toBe(true);
    expect(validateAmount(99.98, 100, 'USD')).toBe(true);
    expect(validateAmount(100.02, 100, 'USD')).toBe(true);
  });

  it('returns false outside default USD tolerance', () => {
    expect(validateAmount(99.97, 100, 'USD')).toBe(false);
    expect(validateAmount(100.03, 100, 'USD')).toBe(false);
  });

  it('returns true within default LBP tolerance (100)', () => {
    expect(validateAmount(1500050, 1500000, 'LBP')).toBe(true);
    expect(validateAmount(1499950, 1500000, 'LBP')).toBe(true);
    expect(validateAmount(1500100, 1500000, 'LBP')).toBe(true);
  });

  it('returns false outside default LBP tolerance', () => {
    expect(validateAmount(1500101, 1500000, 'LBP')).toBe(false);
    expect(validateAmount(1499899, 1500000, 'LBP')).toBe(false);
  });

  it('respects custom tolerance', () => {
    expect(validateAmount(99, 100, 'USD', 1)).toBe(true);
    expect(validateAmount(98, 100, 'USD', 1)).toBe(false);
    expect(validateAmount(99.5, 100, 'USD', 0.5)).toBe(true);
    expect(validateAmount(99.4, 100, 'USD', 0.5)).toBe(false);
  });

  it('returns false for NaN received amount', () => {
    expect(validateAmount(NaN, 100, 'USD')).toBe(false);
  });

  it('returns false for NaN expected amount', () => {
    expect(validateAmount(100, NaN, 'USD')).toBe(false);
  });

  it('returns false for Infinity received amount', () => {
    expect(validateAmount(Infinity, 100, 'USD')).toBe(false);
  });

  it('returns false for negative received amount compared to positive expected', () => {
    expect(validateAmount(-100, 100, 'USD')).toBe(false);
  });

  it('returns false for zero received amount when expected is positive', () => {
    expect(validateAmount(0, 100, 'USD')).toBe(false);
  });

  it('returns true for zero compared to zero', () => {
    expect(validateAmount(0, 0, 'USD')).toBe(true);
  });
});

describe('isValidCurrency', () => {
  it('returns true for valid currencies', () => {
    expect(isValidCurrency('USD')).toBe(true);
    expect(isValidCurrency('LBP')).toBe(true);
    expect(isValidCurrency('AED')).toBe(true);
  });

  it('returns false for invalid currencies', () => {
    expect(isValidCurrency('EUR')).toBe(false);
    expect(isValidCurrency('GBP')).toBe(false);
    expect(isValidCurrency('usd')).toBe(false);
    expect(isValidCurrency('')).toBe(false);
  });
});

describe('validatePaymentRequest', () => {
  const validRequest = {
    amount: 100,
    currency: 'USD' as const,
    invoice: 'Order #123',
    externalId: 1234567890,
    successCallbackUrl: 'https://example.com/success',
    failureCallbackUrl: 'https://example.com/failure',
    successRedirectUrl: 'https://example.com/success-page',
    failureRedirectUrl: 'https://example.com/failure-page',
  };

  it('does not throw for valid request', () => {
    expect(() => validatePaymentRequest(validRequest)).not.toThrow();
  });

  it('throws for missing amount', () => {
    expect(() =>
      validatePaymentRequest({ ...validRequest, amount: 0 })
    ).toThrow(WhishValidationError);
  });

  it('throws for negative amount', () => {
    expect(() =>
      validatePaymentRequest({ ...validRequest, amount: -10 })
    ).toThrow(WhishValidationError);
  });

  it('throws for NaN amount', () => {
    expect(() =>
      validatePaymentRequest({ ...validRequest, amount: NaN })
    ).toThrow(WhishValidationError);
  });

  it('throws for invalid currency', () => {
    expect(() =>
      validatePaymentRequest({ ...validRequest, currency: 'EUR' as never })
    ).toThrow(WhishValidationError);
  });

  it('throws for empty invoice', () => {
    expect(() =>
      validatePaymentRequest({ ...validRequest, invoice: '' })
    ).toThrow(WhishValidationError);
  });

  it('throws for invalid external ID type', () => {
    expect(() =>
      validatePaymentRequest({ ...validRequest, externalId: 'abc' as never })
    ).toThrow(WhishValidationError);
  });

  it('throws for external ID exceeding MAX_SAFE_INTEGER', () => {
    expect(() =>
      validatePaymentRequest({ ...validRequest, externalId: Number.MAX_SAFE_INTEGER + 1 })
    ).toThrow(WhishValidationError);
  });

  it('throws for invalid URL', () => {
    expect(() =>
      validatePaymentRequest({ ...validRequest, successCallbackUrl: 'not-a-url' })
    ).toThrow(WhishValidationError);
  });
});

describe('parseCallbackUrl', () => {
  it('parses valid callback URL', () => {
    const result = parseCallbackUrl(
      'https://example.com/callback?externalId=1234567890&currency=USD'
    );

    expect(result.externalId).toBe(1234567890);
    expect(result.currency).toBe('USD');
  });

  it('parses failure callback with error details', () => {
    const result = parseCallbackUrl(
      'https://example.com/callback?externalId=123&currency=LBP&errorCode=USER_CANCELLED&errorMessage=User%20cancelled'
    );

    expect(result.externalId).toBe(123);
    expect(result.currency).toBe('LBP');
    expect(result.errorCode).toBe('USER_CANCELLED');
    expect(result.errorMessage).toBe('User cancelled');
  });

  it('returns null for missing externalId', () => {
    const result = parseCallbackUrl('https://example.com/callback?currency=USD');

    expect(result.externalId).toBeNull();
    expect(result.currency).toBe('USD');
  });

  it('returns null for missing currency', () => {
    const result = parseCallbackUrl('https://example.com/callback?externalId=123');

    expect(result.externalId).toBe(123);
    expect(result.currency).toBeNull();
  });

  it('returns null for all params when URL has no query string', () => {
    const result = parseCallbackUrl('https://example.com/callback');

    expect(result.externalId).toBeNull();
    expect(result.currency).toBeNull();
  });

  it('returns null for invalid URL', () => {
    const result = parseCallbackUrl('not-a-url');

    expect(result.externalId).toBeNull();
    expect(result.currency).toBeNull();
  });

  it('returns null currency for unsupported currency code', () => {
    const result = parseCallbackUrl(
      'https://example.com/callback?externalId=123&currency=EUR'
    );

    expect(result.externalId).toBe(123);
    expect(result.currency).toBeNull();
  });
});

describe('getEnvironmentFromNodeEnv', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns production for production NODE_ENV', () => {
    process.env.NODE_ENV = 'production';
    expect(getEnvironmentFromNodeEnv()).toBe('production');
  });

  it('returns sandbox for development NODE_ENV', () => {
    process.env.NODE_ENV = 'development';
    expect(getEnvironmentFromNodeEnv()).toBe('sandbox');
  });

  it('returns sandbox for test NODE_ENV', () => {
    process.env.NODE_ENV = 'test';
    expect(getEnvironmentFromNodeEnv()).toBe('sandbox');
  });

  it('returns sandbox for undefined NODE_ENV', () => {
    delete process.env.NODE_ENV;
    expect(getEnvironmentFromNodeEnv()).toBe('sandbox');
  });
});

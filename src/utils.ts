import * as crypto from 'crypto';
import { DEFAULTS, SUPPORTED_CURRENCIES } from './constants';
import { WhishValidationError } from './errors';
import type { WhishCurrency, PaymentRequest } from './types';

// Process-local monotonic counter for same-millisecond collision avoidance (wraps at 100)
let _idCounter = 0;

/**
 * Generates a high-entropy numeric external ID suitable for most payment flows.
 *
 * The ID combines a millisecond timestamp, a process-local monotonic counter,
 * and a random digit to minimise collision risk even for rapid repeated calls.
 *
 * @returns A unique numeric ID safe for use as Whish externalId
 *
 * @example
 * ```typescript
 * const externalId = generateExternalId();
 * // Returns something like: 1706652000000123
 * ```
 */
export function generateExternalId(): number {
  const timestamp = Date.now();

  // Monotonic counter (00–99) ensures distinct values within the same millisecond
  const counter = _idCounter++ % 100;

  // Single cryptographically random digit adds extra entropy
  const randomDigit = crypto.randomBytes(1).readUInt8(0) % 10;

  // Combine: timestamp (13 digits) * 1000 + counter (2 digits) * 10 + random digit (0–9)
  // Maximum: ~1748260400000 * 1000 + 990 + 9 = 1748260400000999 < MAX_SAFE_INTEGER
  const externalId = timestamp * 1000 + counter * 10 + randomDigit;

  if (externalId > DEFAULTS.maxSafeInteger) {
    return timestamp;
  }

  return externalId;
}

/**
 * Validates that two amounts match within a given tolerance.
 *
 * Useful for verifying payment amounts in callbacks where small
 * rounding differences may occur, especially with LBP conversions.
 *
 * @param receivedAmount - Amount received from Whish callback
 * @param expectedAmount - Amount expected from your order
 * @param currency - Currency code (affects default tolerance)
 * @param tolerance - Custom tolerance (defaults based on currency)
 * @returns true if amounts match within tolerance
 *
 * @example
 * ```typescript
 * // Validate USD payment (0.02 tolerance)
 * const isValid = validateAmount(99.99, 100.00, 'USD');
 *
 * // Validate LBP payment (100 tolerance for rounding)
 * const isValid = validateAmount(1500050, 1500000, 'LBP');
 *
 * // Custom tolerance
 * const isValid = validateAmount(99.50, 100.00, 'USD', 0.50);
 * ```
 */
export function validateAmount(
  receivedAmount: number,
  expectedAmount: number,
  currency: WhishCurrency,
  tolerance?: number
): boolean {
  // Default tolerances based on currency
  // Using 0.02 for USD to account for floating point precision issues
  const defaultTolerance = currency === 'LBP' ? 100 : 0.02;
  const actualTolerance = tolerance ?? defaultTolerance;

  // Round to avoid floating point precision issues
  const difference = Math.abs(
    Math.round((receivedAmount - expectedAmount) * 10000) / 10000
  );
  return difference <= actualTolerance;
}

/**
 * Validates a currency code is supported by Whish
 *
 * @param currency - Currency code to validate
 * @returns true if currency is supported
 */
export function isValidCurrency(currency: string): currency is WhishCurrency {
  return SUPPORTED_CURRENCIES.includes(currency as WhishCurrency);
}

/**
 * Validates a payment request has all required fields
 *
 * @param request - Payment request to validate
 * @throws WhishValidationError if validation fails
 */
export function validatePaymentRequest(request: PaymentRequest): void {
  if (
    typeof request.amount !== 'number' ||
    !Number.isFinite(request.amount) ||
    request.amount <= 0
  ) {
    throw new WhishValidationError('Amount must be a finite positive number', 'amount');
  }

  if (!request.currency || !isValidCurrency(request.currency)) {
    throw new WhishValidationError(
      `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`,
      'currency'
    );
  }

  if (!request.invoice || typeof request.invoice !== 'string') {
    throw new WhishValidationError('Invoice must be a non-empty string', 'invoice');
  }

  if (
    typeof request.externalId !== 'number' ||
    !Number.isSafeInteger(request.externalId) ||
    request.externalId <= 0
  ) {
    throw new WhishValidationError(
      'External ID must be a positive safe integer',
      'externalId'
    );
  }

  const urlFields = [
    'successCallbackUrl',
    'failureCallbackUrl',
    'successRedirectUrl',
    'failureRedirectUrl',
  ] as const;

  for (const field of urlFields) {
    if (!request[field] || typeof request[field] !== 'string') {
      throw new WhishValidationError(`${field} must be a valid URL string`, field);
    }

    try {
      new URL(request[field]);
    } catch {
      throw new WhishValidationError(`${field} must be a valid URL`, field);
    }
  }
}

/**
 * Determines the API environment from NODE_ENV
 *
 * @returns 'production' if NODE_ENV is 'production', otherwise 'sandbox'
 */
export function getEnvironmentFromNodeEnv(): 'sandbox' | 'production' {
  // Safe access for environments where process might not be defined
  const nodeEnv = typeof process !== 'undefined' && process.env ? process.env.NODE_ENV : undefined;
  return nodeEnv === 'production' ? 'production' : 'sandbox';
}

/**
 * Parses callback URL parameters for success/failure handlers
 *
 * @param url - Full callback URL with query parameters
 * @returns Parsed callback data
 *
 * @example
 * ```typescript
 * const data = parseCallbackUrl('https://example.com/callback?externalId=123&currency=USD');
 * // Returns: { externalId: 123, currency: 'USD' }
 * ```
 */
/**
 * Parses a string value as a strictly valid positive integer externalId.
 * Rejects any value containing non-digit characters, negative numbers,
 * zero, decimals, or values exceeding Number.MAX_SAFE_INTEGER.
 */
function parseExternalId(value: string | null): number | null {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return null;
  if (parsed <= 0) return null;
  return parsed;
}

export function parseCallbackUrl(url: string): {
  externalId: number | null;
  currency: WhishCurrency | null;
  errorCode?: string;
  errorMessage?: string;
} {
  try {
    const parsedUrl = new URL(url);
    const params = parsedUrl.searchParams;

    return {
      externalId: parseExternalId(params.get('externalId')),
      currency: (() => {
        const c = params.get('currency');
        return c && isValidCurrency(c) ? c : null;
      })(),
      errorCode: params.get('errorCode') ?? undefined,
      errorMessage: params.get('errorMessage') ?? undefined,
    };
  } catch {
    return {
      externalId: null,
      currency: null,
    };
  }
}

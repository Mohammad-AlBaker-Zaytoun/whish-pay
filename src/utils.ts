import * as crypto from 'crypto';
import { DEFAULTS, SUPPORTED_CURRENCIES } from './constants';
import { WhishValidationError } from './errors';
import type { WhishCurrency, PaymentRequest } from './types';

/**
 * Generates a cryptographically secure unique external ID for payments.
 *
 * The ID combines a millisecond timestamp with a random component to ensure
 * uniqueness even for simultaneous payment requests.
 *
 * @returns A unique numeric ID safe for use as Whish externalId
 *
 * @example
 * ```typescript
 * const externalId = generateExternalId();
 * // Returns something like: 1706652000000123456
 * ```
 */
export function generateExternalId(): number {
  // Use millisecond precision timestamp (13 digits)
  const timestamp = Date.now();

  // Generate cryptographically secure 4-byte random number
  const randomBytes = crypto.randomBytes(4);
  const randomValue = randomBytes.readUInt32BE(0);

  // Scale random to 6 digits (0 to 999,999) to stay within safe integer range
  // timestamp (13 digits) * 1,000,000 + random (6 digits) = 19 digits max
  // MAX_SAFE_INTEGER is ~9 * 10^15 (16 digits)
  // So we use timestamp * 1000 + random % 1000 to stay safe
  const randomComponent = randomValue % 1000;

  // Combine: timestamp (13 digits) * 1000 + random (3 digits)
  // This gives us 16 digits max, within safe integer range
  const externalId = timestamp * 1000 + randomComponent;

  // Verify it fits in JavaScript's safe integer range (should always be true now)
  if (externalId > DEFAULTS.maxSafeInteger) {
    // Fallback: Just use timestamp
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
  if (!request.amount || request.amount <= 0) {
    throw new WhishValidationError('Amount must be a positive number', 'amount');
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

  if (!request.externalId || typeof request.externalId !== 'number') {
    throw new WhishValidationError('External ID must be a number', 'externalId');
  }

  if (request.externalId > DEFAULTS.maxSafeInteger) {
    throw new WhishValidationError(
      'External ID exceeds maximum safe integer',
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
  return process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
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
export function parseCallbackUrl(url: string): {
  externalId: number | null;
  currency: WhishCurrency | null;
  errorCode?: string;
  errorMessage?: string;
} {
  try {
    const parsedUrl = new URL(url);
    const params = parsedUrl.searchParams;

    const externalIdStr = params.get('externalId');
    const currencyStr = params.get('currency');

    return {
      externalId: externalIdStr ? parseInt(externalIdStr, 10) : null,
      currency: currencyStr && isValidCurrency(currencyStr) ? currencyStr : null,
      errorCode: params.get('errorCode') || undefined,
      errorMessage: params.get('errorMessage') || undefined,
    };
  } catch {
    return {
      externalId: null,
      currency: null,
    };
  }
}

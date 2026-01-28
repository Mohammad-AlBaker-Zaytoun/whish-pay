/**
 * whish-pay - Whish Money Payment Gateway SDK for Node.js
 *
 * A simple, type-safe, zero-dependency client for integrating
 * Whish Money payments into your Node.js application.
 *
 * @packageDocumentation
 * @module whish-pay
 *
 * @example
 * ```typescript
 * import { WhishClient } from 'whish-pay';
 *
 * const whish = new WhishClient({
 *   channel: process.env.WHISH_CHANNEL!,
 *   secret: process.env.WHISH_SECRET!,
 *   websiteUrl: process.env.WEBSITE_URL!,
 * });
 *
 * const { collectUrl } = await whish.createPayment({
 *   amount: 100,
 *   currency: 'USD',
 *   invoice: 'Order #123',
 *   externalId: whish.generateExternalId(),
 *   successCallbackUrl: 'https://example.com/api/success',
 *   failureCallbackUrl: 'https://example.com/api/failure',
 *   successRedirectUrl: 'https://example.com/success',
 *   failureRedirectUrl: 'https://example.com/failure',
 * });
 * ```
 */

// Main client
export { WhishClient } from './WhishClient';

// Types
export type {
  WhishConfig,
  PaymentRequest,
  PaymentResponse,
  StatusResponse,
  RateResponse,
  BalanceResponse,
  WhishApiResponse,
  WhishCurrency,
  PaymentStatus,
  Environment,
} from './types';

// Errors
export {
  WhishError,
  WhishConfigError,
  WhishApiError,
  WhishNetworkError,
  WhishValidationError,
  WhishParseError,
  ERROR_CODES,
} from './errors';

// Utilities
export {
  generateExternalId,
  validateAmount,
  isValidCurrency,
  validatePaymentRequest,
  parseCallbackUrl,
} from './utils';

// Constants
export {
  WHISH_API_URLS,
  WHISH_ENDPOINTS,
  SUPPORTED_CURRENCIES,
  PAYMENT_STATUSES,
} from './constants';

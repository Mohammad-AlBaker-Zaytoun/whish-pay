import { SUPPORTED_CURRENCIES, PAYMENT_STATUSES } from './constants';

/**
 * Supported currency codes for Whish payments
 */
export type WhishCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Payment status returned by Whish API
 */
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * Environment for Whish API
 */
export type Environment = 'sandbox' | 'production';

/**
 * Configuration options for WhishClient
 */
export interface WhishConfig {
  /**
   * Channel ID provided by Whish
   * @example "10195189"
   */
  channel: string;

  /**
   * Secret key provided by Whish (keep this secure!)
   */
  secret: string;

  /**
   * Your website URL registered with Whish
   * @example "https://yourdomain.com"
   */
  websiteUrl: string;

  /**
   * API environment. If not specified, auto-detects from NODE_ENV
   * @default auto-detect from NODE_ENV
   */
  environment?: Environment;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;
}

/**
 * Payment request parameters
 */
export interface PaymentRequest {
  /**
   * Amount to be paid by the customer
   * @example 100.00
   */
  amount: number;

  /**
   * Currency code for the payment
   * @example "USD"
   */
  currency: WhishCurrency;

  /**
   * Invoice details/description about the payment
   * @example "Order #12345"
   */
  invoice: string;

  /**
   * Unique transaction ID provided by your system
   * Use `whish.generateExternalId()` to generate a secure unique ID
   */
  externalId: number;

  /**
   * URL Whish will call (GET) after successful payment
   * Should include externalId in response handling
   * @example "https://yourdomain.com/api/whish/callback/success"
   */
  successCallbackUrl: string;

  /**
   * URL Whish will call (GET) after failed payment
   * @example "https://yourdomain.com/api/whish/callback/failure"
   */
  failureCallbackUrl: string;

  /**
   * URL to redirect user after successful payment
   * @example "https://yourdomain.com/checkout/success"
   */
  successRedirectUrl: string;

  /**
   * URL to redirect user after failed payment
   * @example "https://yourdomain.com/checkout/failure"
   */
  failureRedirectUrl: string;
}

/**
 * Response from creating a payment
 */
export interface PaymentResponse {
  /**
   * Whether the payment was created successfully
   */
  success: boolean;

  /**
   * URL where user should be redirected to complete payment
   * Only present when success is true
   */
  collectUrl?: string;

  /**
   * Error code if payment creation failed
   */
  code?: string | null;

  /**
   * Dialog message from Whish API
   */
  dialog?: {
    title?: string;
    message?: string;
  } | null;
}

/**
 * Response from checking payment status
 */
export interface StatusResponse {
  /**
   * Current status of the payment
   */
  collectStatus: PaymentStatus;

  /**
   * Amount charged (if available)
   */
  amount?: number;

  /**
   * Currency of the payment
   */
  currency?: string;

  /**
   * Whish transaction ID
   */
  transactionId?: string;

  /**
   * Additional data from Whish API response
   */
  additionalData?: Record<string, unknown>;
}

/**
 * Response from getting rate/fees
 */
export interface RateResponse {
  /**
   * Current rate/fee percentage
   * @example 0.01 (represents 1%)
   */
  rate: number;
}

/**
 * Response from getting account balance
 */
export interface BalanceResponse {
  /**
   * Account balance details
   */
  balanceDetails: {
    /**
     * Current account balance
     */
    balance: number;
  };
}

/**
 * Raw API response wrapper from Whish
 */
export interface WhishApiResponse<T> {
  /**
   * Whether the request was successful
   */
  status: boolean;

  /**
   * Error code if status is false
   */
  code: string | null;

  /**
   * Dialog with title/message for user display
   */
  dialog: {
    title?: string;
    message?: string;
  } | null;

  /**
   * Extra data (usually null)
   */
  extra: unknown;

  /**
   * Response payload
   */
  data: T;
}

/**
 * Internal payment URL response from Whish API
 */
export interface WhishPaymentUrlData {
  /**
   * Payment page URL (new format)
   */
  collectUrl?: string;

  /**
   * Payment page URL (legacy format)
   */
  whishUrl?: string;
}

/**
 * Whish API base URLs for different environments
 */
export const WHISH_API_URLS = {
  /** Sandbox/Testing environment URL */
  sandbox: 'https://lb.sandbox.whish.money/itel-service/api',
  /** Production/Live environment URL */
  production: 'https://whish.money/itel-service/api',
} as const;

/**
 * Whish API endpoint paths
 */
export const WHISH_ENDPOINTS = {
  /** Create W2W payment - POST */
  createPayment: '/payment/whish',
  /** Get payment status - POST */
  getStatus: '/payment/collect/status',
  /** Get rate/fees - POST */
  getRate: '/payment/whish/rate',
  /** Get account balance - GET */
  getBalance: '/payment/account/balance',
} as const;

/**
 * Default configuration values
 */
export const DEFAULTS = {
  /** Request timeout in milliseconds (30 seconds) */
  timeout: 30000,
  /** Maximum safe integer for external ID validation */
  maxSafeInteger: Number.MAX_SAFE_INTEGER,
} as const;

/**
 * Supported currencies
 */
export const SUPPORTED_CURRENCIES = ['USD', 'LBP', 'AED'] as const;

/**
 * Payment status values
 */
export const PAYMENT_STATUSES = ['success', 'failed', 'pending'] as const;

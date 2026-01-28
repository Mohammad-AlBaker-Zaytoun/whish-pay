import { WHISH_API_URLS, WHISH_ENDPOINTS, DEFAULTS } from './constants';
import {
  WhishConfigError,
  WhishApiError,
  WhishNetworkError,
  WhishParseError,
} from './errors';
import {
  generateExternalId,
  validatePaymentRequest,
  getEnvironmentFromNodeEnv,
  validateAmount,
} from './utils';
import type {
  WhishConfig,
  PaymentRequest,
  PaymentResponse,
  StatusResponse,
  RateResponse,
  BalanceResponse,
  WhishApiResponse,
  WhishPaymentUrlData,
  WhishCurrency,
  Environment,
} from './types';

/**
 * Whish Money Payment Gateway Client
 *
 * A type-safe, zero-dependency client for integrating Whish Money payments
 * into your Node.js application.
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
 * // Create a payment
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
 *
 * // Redirect user to collectUrl
 * ```
 */
export class WhishClient {
  private readonly channel: string;
  private readonly secret: string;
  private readonly websiteUrl: string;
  private readonly environment: Environment;
  private readonly timeout: number;
  private readonly baseUrl: string;

  /**
   * Creates a new WhishClient instance
   *
   * @param config - Configuration options
   * @throws WhishConfigError if required configuration is missing
   *
   * @example
   * ```typescript
   * const whish = new WhishClient({
   *   channel: '10195189',
   *   secret: 'your_secret_key',
   *   websiteUrl: 'https://yourdomain.com',
   *   environment: 'sandbox', // Optional: auto-detects from NODE_ENV
   *   timeout: 30000, // Optional: 30 seconds default
   * });
   * ```
   */
  constructor(config: WhishConfig) {
    // Validate required configuration
    if (!config.channel) {
      throw new WhishConfigError('channel is required');
    }
    if (!config.secret) {
      throw new WhishConfigError('secret is required');
    }
    if (!config.websiteUrl) {
      throw new WhishConfigError('websiteUrl is required');
    }

    this.channel = config.channel;
    this.secret = config.secret;
    this.websiteUrl = config.websiteUrl;
    this.environment = config.environment ?? getEnvironmentFromNodeEnv();
    this.timeout = config.timeout ?? DEFAULTS.timeout;
    this.baseUrl = WHISH_API_URLS[this.environment];
  }

  /**
   * Generates a cryptographically secure unique external ID for payments.
   *
   * The ID combines a timestamp with a random component to ensure uniqueness
   * even for simultaneous payment requests.
   *
   * @returns A unique numeric ID safe for use as Whish externalId
   *
   * @example
   * ```typescript
   * const externalId = whish.generateExternalId();
   * ```
   */
  generateExternalId(): number {
    return generateExternalId();
  }

  /**
   * Validates that two amounts match within a given tolerance.
   *
   * Useful for verifying payment amounts in callbacks where small
   * rounding differences may occur.
   *
   * @param receivedAmount - Amount received from Whish callback
   * @param expectedAmount - Amount expected from your order
   * @param currency - Currency code (affects default tolerance)
   * @param tolerance - Custom tolerance (optional)
   * @returns true if amounts match within tolerance
   */
  validateAmount(
    receivedAmount: number,
    expectedAmount: number,
    currency: WhishCurrency,
    tolerance?: number
  ): boolean {
    return validateAmount(receivedAmount, expectedAmount, currency, tolerance);
  }

  /**
   * Creates a new Whish payment and returns the payment URL.
   *
   * After calling this method, redirect the user to the returned `collectUrl`
   * where they will complete the payment on Whish's secure payment page.
   *
   * @param request - Payment request parameters
   * @returns Payment response with collectUrl for redirect
   * @throws WhishValidationError if request validation fails
   * @throws WhishApiError if Whish API returns an error
   * @throws WhishNetworkError if unable to reach Whish API
   *
   * @example
   * ```typescript
   * const { collectUrl } = await whish.createPayment({
   *   amount: 100,
   *   currency: 'USD',
   *   invoice: 'Order #123',
   *   externalId: whish.generateExternalId(),
   *   successCallbackUrl: 'https://example.com/api/whish/callback/success',
   *   failureCallbackUrl: 'https://example.com/api/whish/callback/failure',
   *   successRedirectUrl: 'https://example.com/checkout/success',
   *   failureRedirectUrl: 'https://example.com/checkout/failure',
   * });
   *
   * // Redirect user to payment page
   * // In Express: res.redirect(collectUrl)
   * // In Next.js: redirect(collectUrl) or return NextResponse.redirect(collectUrl)
   * ```
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Validate request before sending
    validatePaymentRequest(request);

    const url = `${this.baseUrl}${WHISH_ENDPOINTS.createPayment}`;

    const response = await this.makeRequest<WhishApiResponse<WhishPaymentUrlData>>(
      url,
      'POST',
      request
    );

    if (!response.status) {
      return {
        success: false,
        code: response.code,
        dialog: response.dialog,
      };
    }

    // Handle both collectUrl (new) and whishUrl (legacy) response formats
    const collectUrl = response.data.collectUrl || response.data.whishUrl;

    if (!collectUrl) {
      throw new WhishApiError(
        'No payment URL returned from Whish API',
        'NO_PAYMENT_URL',
        response.dialog
      );
    }

    return {
      success: true,
      collectUrl,
    };
  }

  /**
   * Gets the status of a payment transaction.
   *
   * Use this method to verify payments in your callback handlers
   * before updating order status.
   *
   * @param currency - The currency of the payment
   * @param externalId - The external ID used when creating the payment
   * @returns Payment status details
   * @throws WhishApiError if Whish API returns an error
   * @throws WhishNetworkError if unable to reach Whish API
   *
   * @example
   * ```typescript
   * const status = await whish.getPaymentStatus('USD', 1234567890);
   *
   * if (status.collectStatus === 'success') {
   *   // Payment successful - update order status
   *   await updateOrder(externalId, 'paid');
   * } else if (status.collectStatus === 'failed') {
   *   // Payment failed - restore inventory
   *   await restoreInventory(externalId);
   * } else {
   *   // Payment pending - check again later
   * }
   * ```
   */
  async getPaymentStatus(
    currency: WhishCurrency,
    externalId: number
  ): Promise<StatusResponse> {
    const url = `${this.baseUrl}${WHISH_ENDPOINTS.getStatus}`;

    const response = await this.makeRequest<WhishApiResponse<StatusResponse>>(
      url,
      'POST',
      { currency, externalId }
    );

    if (!response.status) {
      throw new WhishApiError(
        response.dialog?.message || 'Failed to get payment status',
        response.code || 'API_ERROR',
        response.dialog
      );
    }

    return response.data;
  }

  /**
   * Gets the current rate/fees that will be applied to payments.
   *
   * The rate is typically around 1% (0.01) but may vary.
   * This is useful for displaying the final amount to users before payment.
   *
   * @param amount - Amount to be paid
   * @param currency - Currency code
   * @returns Current rate/fee percentage
   * @throws WhishApiError if Whish API returns an error
   * @throws WhishNetworkError if unable to reach Whish API
   *
   * @example
   * ```typescript
   * const { rate } = await whish.getRate(100, 'USD');
   * const fee = 100 * rate; // e.g., 100 * 0.01 = $1 fee
   * ```
   */
  async getRate(amount: number, currency: WhishCurrency): Promise<RateResponse> {
    const url = `${this.baseUrl}${WHISH_ENDPOINTS.getRate}`;

    const response = await this.makeRequest<WhishApiResponse<RateResponse>>(
      url,
      'POST',
      { amount, currency }
    );

    if (!response.status) {
      throw new WhishApiError(
        response.dialog?.message || 'Failed to get rate',
        response.code || 'API_ERROR',
        response.dialog
      );
    }

    return response.data;
  }

  /**
   * Gets the current account balance.
   *
   * Note: Currently only LBP balance is returned via API.
   *
   * @returns Account balance details
   * @throws WhishApiError if Whish API returns an error
   * @throws WhishNetworkError if unable to reach Whish API
   *
   * @example
   * ```typescript
   * const { balanceDetails } = await whish.getBalance();
   * console.log(`Balance: ${balanceDetails.balance}`);
   * ```
   */
  async getBalance(): Promise<BalanceResponse> {
    const url = `${this.baseUrl}${WHISH_ENDPOINTS.getBalance}`;

    const response = await this.makeRequest<WhishApiResponse<BalanceResponse>>(
      url,
      'GET'
    );

    if (!response.status) {
      throw new WhishApiError(
        response.dialog?.message || 'Failed to get balance',
        response.code || 'API_ERROR',
        response.dialog
      );
    }

    return response.data;
  }

  /**
   * Returns the current environment (sandbox or production)
   */
  getEnvironment(): Environment {
    return this.environment;
  }

  /**
   * Returns the base URL being used for API requests
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Makes an HTTP request to the Whish API
   */
  private async makeRequest<T>(
    url: string,
    method: 'GET' | 'POST',
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      channel: this.channel,
      secret: this.secret,
      websiteurl: this.websiteUrl,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (method === 'POST' && body) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new WhishParseError(
          `Unexpected response type: ${contentType}. Response: ${text.substring(0, 200)}`
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof WhishParseError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new WhishNetworkError(`Request timed out after ${this.timeout}ms`);
        }
        throw new WhishNetworkError(`Network request failed: ${error.message}`, error);
      }

      throw new WhishNetworkError('Unknown network error occurred');
    }
  }
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WhishClient } from '../src/WhishClient';
import {
  WhishConfigError,
  WhishApiError,
  WhishNetworkError,
  WhishValidationError,
} from '../src/errors';
import { WHISH_API_URLS, WHISH_ENDPOINTS } from '../src/constants';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('WhishClient', () => {
  const validConfig = {
    channel: '10195189',
    secret: 'test_secret',
    websiteUrl: 'https://example.com',
  };

  const validPaymentRequest = {
    amount: 100,
    currency: 'USD' as const,
    invoice: 'Order #123',
    externalId: 1234567890,
    successCallbackUrl: 'https://example.com/api/success',
    failureCallbackUrl: 'https://example.com/api/failure',
    successRedirectUrl: 'https://example.com/success',
    failureRedirectUrl: 'https://example.com/failure',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('creates instance with valid config', () => {
      const client = new WhishClient(validConfig);
      expect(client).toBeInstanceOf(WhishClient);
    });

    it('throws WhishConfigError for missing channel', () => {
      expect(() => new WhishClient({ ...validConfig, channel: '' })).toThrow(
        WhishConfigError
      );
    });

    it('throws WhishConfigError for missing secret', () => {
      expect(() => new WhishClient({ ...validConfig, secret: '' })).toThrow(
        WhishConfigError
      );
    });

    it('throws WhishConfigError for missing websiteUrl', () => {
      expect(() => new WhishClient({ ...validConfig, websiteUrl: '' })).toThrow(
        WhishConfigError
      );
    });

    it('uses sandbox environment by default', () => {
      const client = new WhishClient(validConfig);
      expect(client.getEnvironment()).toBe('sandbox');
      expect(client.getBaseUrl()).toBe(WHISH_API_URLS.sandbox);
    });

    it('uses production environment when specified', () => {
      const client = new WhishClient({ ...validConfig, environment: 'production' });
      expect(client.getEnvironment()).toBe('production');
      expect(client.getBaseUrl()).toBe(WHISH_API_URLS.production);
    });
  });

  describe('generateExternalId', () => {
    it('generates non-empty unique numeric IDs', () => {
      const client = new WhishClient(validConfig);
      const id1 = client.generateExternalId();
      const id2 = client.generateExternalId();

      expect(typeof id1).toBe('number');
      expect(id1).toBeGreaterThan(0);
      expect(id1).not.toBe(id2);
    });
  });

  describe('validateAmount', () => {
    it('validates amounts correctly', () => {
      const client = new WhishClient(validConfig);

      expect(client.validateAmount(100, 100, 'USD')).toBe(true);
      expect(client.validateAmount(99.99, 100, 'USD')).toBe(true);
      expect(client.validateAmount(99.97, 100, 'USD')).toBe(false);
    });
  });

  describe('createPayment', () => {
    it('creates payment successfully', async () => {
      const client = new WhishClient(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: true,
          code: null,
          dialog: null,
          extra: null,
          data: { collectUrl: 'https://whish.money/pay/abc123' },
        }),
      });

      const result = await client.createPayment(validPaymentRequest);

      expect(result.success).toBe(true);
      expect(result.collectUrl).toBe('https://whish.money/pay/abc123');
    });

    it('handles legacy whishUrl response format', async () => {
      const client = new WhishClient(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: true,
          code: null,
          dialog: null,
          extra: null,
          data: { whishUrl: 'https://whish.money/pay/legacy123' },
        }),
      });

      const result = await client.createPayment(validPaymentRequest);

      expect(result.success).toBe(true);
      expect(result.collectUrl).toBe('https://whish.money/pay/legacy123');
    });

    it('returns error response for failed API call', async () => {
      const client = new WhishClient(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: false,
          code: 'INVALID_AMOUNT',
          dialog: { message: 'Amount is invalid' },
          extra: null,
          data: null,
        }),
      });

      const result = await client.createPayment(validPaymentRequest);

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_AMOUNT');
      expect(result.dialog?.message).toBe('Amount is invalid');
    });

    it('throws WhishValidationError for invalid amount', async () => {
      const client = new WhishClient(validConfig);

      await expect(
        client.createPayment({ ...validPaymentRequest, amount: -1 })
      ).rejects.toThrow(WhishValidationError);
    });

    it('sends correct endpoint, method, and headers', async () => {
      const client = new WhishClient(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: true,
          data: { collectUrl: 'https://whish.money/pay/test' },
        }),
      });

      await client.createPayment(validPaymentRequest);

      const [calledUrl, calledOptions] = mockFetch.mock.calls[0] as [string, RequestInit];

      expect(calledUrl).toBe(`${WHISH_API_URLS.sandbox}${WHISH_ENDPOINTS.createPayment}`);
      expect(calledOptions.method).toBe('POST');
      expect(calledOptions.headers).toMatchObject({
        'Content-Type': 'application/json',
        channel: validConfig.channel,
        secret: validConfig.secret,
        websiteurl: validConfig.websiteUrl,
      });
    });

    it('sends correct request body', async () => {
      const client = new WhishClient(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: true,
          data: { collectUrl: 'https://whish.money/pay/test' },
        }),
      });

      await client.createPayment(validPaymentRequest);

      const [, calledOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(calledOptions.body as string);

      expect(body).toMatchObject({
        amount: validPaymentRequest.amount,
        currency: validPaymentRequest.currency,
        invoice: validPaymentRequest.invoice,
        externalId: validPaymentRequest.externalId,
        successCallbackUrl: validPaymentRequest.successCallbackUrl,
        failureCallbackUrl: validPaymentRequest.failureCallbackUrl,
        successRedirectUrl: validPaymentRequest.successRedirectUrl,
        failureRedirectUrl: validPaymentRequest.failureRedirectUrl,
      });
    });
  });

  describe('getPaymentStatus', () => {
    it('returns success status', async () => {
      const client = new WhishClient(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: true,
          code: null,
          dialog: null,
          extra: null,
          data: { collectStatus: 'success', amount: 100, currency: 'USD' },
        }),
      });

      const result = await client.getPaymentStatus('USD', 1234567890);

      expect(result.collectStatus).toBe('success');
      expect(result.amount).toBe(100);
      expect(result.currency).toBe('USD');
    });

    it('returns pending status', async () => {
      const client = new WhishClient(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: true,
          code: null,
          dialog: null,
          extra: null,
          data: { collectStatus: 'pending', amount: 100, currency: 'USD' },
        }),
      });

      const result = await client.getPaymentStatus('USD', 1234567890);

      expect(result.collectStatus).toBe('pending');
    });

    it('returns failed status', async () => {
      const client = new WhishClient(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: true,
          code: null,
          dialog: null,
          extra: null,
          data: { collectStatus: 'failed', amount: 100, currency: 'USD' },
        }),
      });

      const result = await client.getPaymentStatus('USD', 1234567890);

      expect(result.collectStatus).toBe('failed');
    });

    it('throws WhishApiError for failed API response', async () => {
      const client = new WhishClient(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: false,
          code: 'TRANSACTION_NOT_FOUND',
          dialog: { message: 'Transaction not found' },
          extra: null,
          data: null,
        }),
      });

      await expect(client.getPaymentStatus('USD', 9999999)).rejects.toThrow(
        WhishApiError
      );
    });
  });

  describe('getRate', () => {
    it('returns rate successfully', async () => {
      const client = new WhishClient(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: true,
          code: null,
          dialog: null,
          extra: null,
          data: { rate: 0.01 },
        }),
      });

      const result = await client.getRate(100, 'USD');

      expect(result.rate).toBe(0.01);
    });
  });

  describe('getBalance', () => {
    it('returns balance successfully', async () => {
      const client = new WhishClient(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: true,
          code: null,
          dialog: null,
          extra: null,
          data: { balanceDetails: { balance: 217.718 } },
        }),
      });

      const result = await client.getBalance();

      expect(result.balanceDetails.balance).toBe(217.718);
    });
  });

  describe('network errors', () => {
    it('throws WhishNetworkError for fetch failure', async () => {
      const client = new WhishClient(validConfig);

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        client.createPayment(validPaymentRequest)
      ).rejects.toThrow(WhishNetworkError);
    });

    it('throws WhishNetworkError for timeout (AbortError)', async () => {
      const client = new WhishClient({ ...validConfig, timeout: 100 });

      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 50);
        });
      });

      await expect(
        client.createPayment(validPaymentRequest)
      ).rejects.toThrow(WhishNetworkError);
    });
  });

  describe('HTTP error handling', () => {
    it('throws WhishApiError with httpStatus 400 and code from JSON body', async () => {
      const client = new WhishClient(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          code: 'INVALID_REQUEST',
          dialog: { message: 'Invalid request parameters' },
        }),
      });

      await expect(client.getPaymentStatus('USD', 123)).rejects.toMatchObject({
        name: 'WhishApiError',
        code: 'INVALID_REQUEST',
        httpStatus: 400,
      });
    });

    it('throws WhishApiError with httpStatus 401 for unauthorized', async () => {
      const client = new WhishClient(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          code: 'UNAUTHORIZED',
          dialog: { message: 'Invalid credentials' },
        }),
      });

      await expect(client.getPaymentStatus('USD', 123)).rejects.toMatchObject({
        name: 'WhishApiError',
        code: 'UNAUTHORIZED',
        httpStatus: 401,
      });
    });

    it('throws WhishApiError with httpStatus 500 for server error JSON', async () => {
      const client = new WhishClient(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          code: 'INTERNAL_ERROR',
          dialog: { message: 'Server error' },
        }),
      });

      await expect(client.createPayment(validPaymentRequest)).rejects.toMatchObject({
        name: 'WhishApiError',
        httpStatus: 500,
      });
    });

    it('throws WhishApiError with httpStatus for HTTP 500 non-JSON response', async () => {
      const client = new WhishClient(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'text/html' }),
      });

      await expect(client.createPayment(validPaymentRequest)).rejects.toMatchObject({
        name: 'WhishApiError',
        httpStatus: 500,
      });
    });

    it('throws WhishParseError for HTTP 200 with non-JSON response', async () => {
      const client = new WhishClient(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
      });

      const { WhishParseError: WPE } = await import('../src/errors');
      await expect(client.createPayment(validPaymentRequest)).rejects.toThrow(WPE);
    });

    it('uses dialog.message as the error message when available', async () => {
      const client = new WhishClient(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          code: 'FORBIDDEN',
          dialog: { message: 'Access denied' },
        }),
      });

      const error = await client.getPaymentStatus('USD', 123).catch((e: unknown) => e);
      expect(error).toMatchObject({
        name: 'WhishApiError',
        message: 'Access denied',
        httpStatus: 403,
      });
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  WhishError,
  WhishConfigError,
  WhishApiError,
  WhishNetworkError,
  WhishValidationError,
  WhishParseError,
  ERROR_CODES,
} from '../src/errors';

describe('WhishError', () => {
  it('creates error with message and code', () => {
    const error = new WhishError('Test error', 'TEST_CODE');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(WhishError);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('WhishError');
    expect(error.dialog).toBeUndefined();
  });

  it('creates error with dialog', () => {
    const dialog = { title: 'Error Title', message: 'Error Message' };
    const error = new WhishError('Test error', 'TEST_CODE', dialog);

    expect(error.dialog).toEqual(dialog);
  });

  it('handles null dialog', () => {
    const error = new WhishError('Test error', 'TEST_CODE', null);

    expect(error.dialog).toBeUndefined();
  });

  it('has proper stack trace', () => {
    const error = new WhishError('Test error', 'TEST_CODE');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('WhishError');
  });
});

describe('WhishConfigError', () => {
  it('creates config error with INVALID_CONFIG code', () => {
    const error = new WhishConfigError('Missing channel');

    expect(error).toBeInstanceOf(WhishError);
    expect(error).toBeInstanceOf(WhishConfigError);
    expect(error.message).toBe('Missing channel');
    expect(error.code).toBe('INVALID_CONFIG');
    expect(error.name).toBe('WhishConfigError');
  });
});

describe('WhishApiError', () => {
  it('creates API error with code and dialog', () => {
    const dialog = { message: 'Invalid amount' };
    const error = new WhishApiError('API failed', 'INVALID_AMOUNT', dialog);

    expect(error).toBeInstanceOf(WhishError);
    expect(error).toBeInstanceOf(WhishApiError);
    expect(error.message).toBe('API failed');
    expect(error.code).toBe('INVALID_AMOUNT');
    expect(error.dialog).toEqual(dialog);
    expect(error.name).toBe('WhishApiError');
    expect(error.httpStatus).toBeUndefined();
  });

  it('creates API error with HTTP status', () => {
    const error = new WhishApiError('Unauthorized', 'AUTH_ERROR', null, 401);

    expect(error.httpStatus).toBe(401);
  });

  it('handles null dialog', () => {
    const error = new WhishApiError('API failed', 'ERROR', null);

    expect(error.dialog).toBeUndefined();
  });
});

describe('WhishNetworkError', () => {
  it('creates network error with NETWORK_ERROR code', () => {
    const error = new WhishNetworkError('Connection failed');

    expect(error).toBeInstanceOf(WhishError);
    expect(error).toBeInstanceOf(WhishNetworkError);
    expect(error.message).toBe('Connection failed');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.name).toBe('WhishNetworkError');
    expect(error.cause).toBeUndefined();
  });

  it('creates network error with cause', () => {
    const cause = new Error('Socket timeout');
    const error = new WhishNetworkError('Connection failed', cause);

    expect(error.cause).toBe(cause);
  });
});

describe('WhishValidationError', () => {
  it('creates validation error with VALIDATION_ERROR code', () => {
    const error = new WhishValidationError('Invalid amount');

    expect(error).toBeInstanceOf(WhishError);
    expect(error).toBeInstanceOf(WhishValidationError);
    expect(error.message).toBe('Invalid amount');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.name).toBe('WhishValidationError');
    expect(error.field).toBeUndefined();
  });

  it('creates validation error with field name', () => {
    const error = new WhishValidationError('Amount must be positive', 'amount');

    expect(error.field).toBe('amount');
  });
});

describe('WhishParseError', () => {
  it('creates parse error with PARSE_ERROR code', () => {
    const error = new WhishParseError('Invalid JSON');

    expect(error).toBeInstanceOf(WhishError);
    expect(error).toBeInstanceOf(WhishParseError);
    expect(error.message).toBe('Invalid JSON');
    expect(error.code).toBe('PARSE_ERROR');
    expect(error.name).toBe('WhishParseError');
  });
});

describe('ERROR_CODES', () => {
  it('contains all expected error codes', () => {
    expect(ERROR_CODES.INVALID_CONFIG).toBe('INVALID_CONFIG');
    expect(ERROR_CODES.NETWORK_ERROR).toBe('NETWORK_ERROR');
    expect(ERROR_CODES.API_ERROR).toBe('API_ERROR');
    expect(ERROR_CODES.PARSE_ERROR).toBe('PARSE_ERROR');
    expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ERROR_CODES.AMOUNT_MISMATCH).toBe('AMOUNT_MISMATCH');
    expect(ERROR_CODES.TIMEOUT).toBe('TIMEOUT');
    expect(ERROR_CODES.NO_PAYMENT_URL).toBe('NO_PAYMENT_URL');
  });

  it('is readonly (const assertion)', () => {
    // TypeScript ensures this at compile time, but we can verify values exist
    const codes = Object.keys(ERROR_CODES);
    expect(codes.length).toBe(8);
  });
});

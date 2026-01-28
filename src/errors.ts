/**
 * Base error class for all Whish-related errors
 */
export class WhishError extends Error {
  /**
   * Error code for programmatic handling
   */
  public readonly code: string;

  /**
   * Optional dialog message from Whish API
   */
  public readonly dialog?: {
    title?: string;
    message?: string;
  };

  constructor(
    message: string,
    code: string,
    dialog?: { title?: string; message?: string } | null
  ) {
    super(message);
    this.name = 'WhishError';
    this.code = code;
    this.dialog = dialog ?? undefined;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WhishError);
    }
  }
}

/**
 * Error thrown when WhishClient configuration is invalid
 */
export class WhishConfigError extends WhishError {
  constructor(message: string) {
    super(message, 'INVALID_CONFIG');
    this.name = 'WhishConfigError';
  }
}

/**
 * Error thrown when Whish API returns an error response
 */
export class WhishApiError extends WhishError {
  /**
   * HTTP status code from the response
   */
  public readonly httpStatus?: number;

  constructor(
    message: string,
    code: string,
    dialog?: { title?: string; message?: string } | null,
    httpStatus?: number
  ) {
    super(message, code, dialog);
    this.name = 'WhishApiError';
    this.httpStatus = httpStatus;
  }
}

/**
 * Error thrown when network request fails
 */
export class WhishNetworkError extends WhishError {
  /**
   * Original error that caused the network failure
   */
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message, 'NETWORK_ERROR');
    this.name = 'WhishNetworkError';
    this.cause = cause;
  }
}

/**
 * Error thrown when validation fails
 */
export class WhishValidationError extends WhishError {
  /**
   * Field that failed validation
   */
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'WhishValidationError';
    this.field = field;
  }
}

/**
 * Error thrown when response parsing fails
 */
export class WhishParseError extends WhishError {
  constructor(message: string) {
    super(message, 'PARSE_ERROR');
    this.name = 'WhishParseError';
  }
}

/**
 * Error codes used throughout the library
 */
export const ERROR_CODES = {
  INVALID_CONFIG: 'INVALID_CONFIG',
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  TIMEOUT: 'TIMEOUT',
} as const;

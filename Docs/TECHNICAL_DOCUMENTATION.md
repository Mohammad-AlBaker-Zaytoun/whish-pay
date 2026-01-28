# Whish-Pay SDK - Technical Documentation

## Overview

**whish-pay** is a TypeScript SDK for integrating the Whish Money payment gateway into Node.js applications. This document provides comprehensive technical details for developers implementing the SDK.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Installation & Setup](#installation--setup)
3. [Configuration](#configuration)
4. [API Reference](#api-reference)
5. [Error Handling](#error-handling)
6. [Type Definitions](#type-definitions)
7. [Security Implementation](#security-implementation)
8. [Framework Integration Guides](#framework-integration-guides)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)
11. [API Endpoint Reference](#api-endpoint-reference)

---

## Architecture

### Module Structure

```
whish-pay/
├── src/
│   ├── index.ts           # Public exports
│   ├── WhishClient.ts     # Main client class
│   ├── types.ts           # TypeScript interfaces
│   ├── errors.ts          # Custom error classes
│   ├── utils.ts           # Utility functions
│   └── constants.ts       # API URLs, defaults
├── dist/
│   ├── index.js           # CommonJS build
│   ├── index.mjs          # ESM build
│   ├── index.d.ts         # TypeScript declarations
│   └── index.d.mts        # ESM declarations
└── tests/
    ├── WhishClient.test.ts
    └── utils.test.ts
```

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| Framework Agnostic | No framework-specific code; works with any Node.js backend |
| Type Safety | Full TypeScript with strict mode enabled |
| Zero Dependencies | Uses only Node.js built-in `crypto` module |
| Server-Side Only | Designed exclusively for backend execution |
| Tree-Shakeable | ESM + CJS dual builds for optimal bundling |

### Data Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│   Your      │───▶│  whish-pay  │───▶│   Whish     │
│   Browser   │    │   Server    │    │    SDK      │    │   API       │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                  │                  │                  │
      │ 1. Initiate     │                  │                  │
      │    payment      │                  │                  │
      │─────────────────▶                  │                  │
      │                  │ 2. Create       │                  │
      │                  │    payment      │                  │
      │                  │─────────────────▶                  │
      │                  │                  │ 3. API request  │
      │                  │                  │─────────────────▶
      │                  │                  │                  │
      │                  │                  │ 4. collectUrl   │
      │                  │                  │◀─────────────────
      │                  │ 5. Return URL   │                  │
      │                  │◀─────────────────                  │
      │ 6. Redirect     │                  │                  │
      │    to Whish     │                  │                  │
      │◀─────────────────                  │                  │
      │                  │                  │                  │
      │ 7. User pays on Whish Money        │                  │
      │                  │                  │                  │
      │ 8. Callback     │                  │                  │
      │─────────────────▶                  │                  │
      │                  │ 9. Verify       │                  │
      │                  │─────────────────▶                  │
      │                  │                  │ 10. Status      │
      │                  │                  │─────────────────▶
      │                  │                  │◀─────────────────
      │                  │◀─────────────────                  │
      │ 11. Redirect    │                  │                  │
      │     to success  │                  │                  │
      │◀─────────────────                  │                  │
```

---

## Installation & Setup

### Installation

```bash
# npm
npm install whish-pay

# yarn
yarn add whish-pay

# pnpm
pnpm add whish-pay
```

### Basic Setup

```typescript
import { WhishClient } from 'whish-pay';

const whish = new WhishClient({
  channel: process.env.WHISH_CHANNEL!,
  secret: process.env.WHISH_SECRET!,
  websiteUrl: process.env.WEBSITE_URL!,
  environment: 'sandbox', // or 'production'
});
```

### Environment Variables

Create a `.env` file:

```bash
# Required
WHISH_CHANNEL=your_channel_id
WHISH_SECRET=your_secret_key
WEBSITE_URL=https://yourdomain.com

# Optional
NODE_ENV=production  # Auto-switches to production API
```

---

## Configuration

### WhishConfig Interface

```typescript
interface WhishConfig {
  /** Whish Money channel ID */
  channel: string;

  /** Whish Money secret key */
  secret: string;

  /** Your website URL (registered with Whish) */
  websiteUrl: string;

  /** API environment (default: 'sandbox') */
  environment?: 'sandbox' | 'production';

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}
```

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `channel` | string | Yes | - | Your Whish Money channel ID |
| `secret` | string | Yes | - | Your Whish Money secret key |
| `websiteUrl` | string | Yes | - | Your registered website URL |
| `environment` | string | No | `'sandbox'` | API environment |
| `timeout` | number | No | `30000` | Request timeout (ms) |

### Environment Detection

The SDK can auto-detect the environment from `NODE_ENV`:

```typescript
import { getEnvironmentFromNodeEnv } from 'whish-pay';

// Returns 'production' if NODE_ENV === 'production'
// Returns 'sandbox' otherwise
const env = getEnvironmentFromNodeEnv();
```

---

## API Reference

### WhishClient Class

#### Constructor

```typescript
constructor(config: WhishConfig)
```

Creates a new WhishClient instance.

**Throws:** `WhishConfigError` if configuration is invalid.

---

#### createPayment()

```typescript
async createPayment(request: PaymentRequest): Promise<PaymentResponse>
```

Creates a new payment and returns the payment URL.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `request` | `PaymentRequest` | Payment details |

**Returns:** `PaymentResponse` with `collectUrl` for redirect.

**Example:**

```typescript
const result = await whish.createPayment({
  amount: 100.00,
  currency: 'USD',
  invoice: 'Order #12345',
  externalId: whish.generateExternalId(),
  successCallbackUrl: 'https://example.com/api/callback/success',
  failureCallbackUrl: 'https://example.com/api/callback/failure',
  successRedirectUrl: 'https://example.com/success',
  failureRedirectUrl: 'https://example.com/failure',
});

if (result.success) {
  // Redirect user to result.collectUrl
  console.log('Payment URL:', result.collectUrl);
} else {
  // Handle error
  console.error('Error:', result.code, result.dialog?.message);
}
```

---

#### getPaymentStatus()

```typescript
async getPaymentStatus(
  currency: WhishCurrency,
  externalId: number
): Promise<StatusResponse>
```

Retrieves the status of a payment.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `currency` | `WhishCurrency` | Payment currency |
| `externalId` | `number` | External ID used when creating payment |

**Returns:** `StatusResponse` with payment status and details.

**Throws:** `WhishApiError` if payment not found.

**Example:**

```typescript
try {
  const status = await whish.getPaymentStatus('USD', 1234567890123456);

  if (status.collectStatus === 'success') {
    console.log('Payment successful!');
    console.log('Amount:', status.amount, status.currency);
  }
} catch (error) {
  if (error instanceof WhishApiError) {
    console.error('Status check failed:', error.message);
  }
}
```

---

#### getRate()

```typescript
async getRate(
  amount: number,
  currency: WhishCurrency
): Promise<RateResponse>
```

Gets the current rate and fees for a transaction.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `amount` | `number` | Transaction amount |
| `currency` | `WhishCurrency` | Currency code |

**Returns:** `RateResponse` with rate information.

**Example:**

```typescript
const rateInfo = await whish.getRate(100, 'USD');
console.log('Rate:', rateInfo.rate);
```

---

#### getBalance()

```typescript
async getBalance(): Promise<BalanceResponse>
```

Gets the merchant account balance.

**Returns:** `BalanceResponse` with balance details.

**Example:**

```typescript
const balance = await whish.getBalance();
console.log('Balance:', balance.balanceDetails.balance);
```

---

#### generateExternalId()

```typescript
generateExternalId(): number
```

Generates a cryptographically secure unique external ID.

**Returns:** A unique numeric ID safe for use as Whish externalId.

**Example:**

```typescript
const externalId = whish.generateExternalId();
// Returns something like: 1706652000000123
```

**Implementation Details:**
- Combines millisecond timestamp with cryptographic random bytes
- Guaranteed to be within JavaScript's safe integer range
- Uses Node.js `crypto.randomBytes()` for randomness

---

#### validateAmount()

```typescript
validateAmount(
  receivedAmount: number,
  expectedAmount: number,
  currency: WhishCurrency,
  tolerance?: number
): boolean
```

Validates that received amount matches expected amount within tolerance.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `receivedAmount` | `number` | Amount from callback |
| `expectedAmount` | `number` | Expected amount from order |
| `currency` | `WhishCurrency` | Currency (affects default tolerance) |
| `tolerance` | `number` | Optional custom tolerance |

**Default Tolerances:**
- USD/AED: 0.02 (2 cents)
- LBP: 100 (rounding tolerance)

**Example:**

```typescript
// Verify payment amount
const isValid = whish.validateAmount(99.99, 100.00, 'USD');
// Returns: true (within 0.02 tolerance)

// Custom tolerance
const isValid = whish.validateAmount(99.50, 100.00, 'USD', 0.50);
// Returns: true (within 0.50 tolerance)
```

---

#### getEnvironment()

```typescript
getEnvironment(): 'sandbox' | 'production'
```

Returns the current environment setting.

---

#### getBaseUrl()

```typescript
getBaseUrl(): string
```

Returns the base URL for the current environment.

---

## Error Handling

### Error Class Hierarchy

```
WhishError (base)
├── WhishConfigError    - Invalid configuration
├── WhishApiError       - API returned error response
├── WhishNetworkError   - Network/connection failure
├── WhishValidationError - Request validation failed
└── WhishParseError     - Response parsing failed
```

### Error Properties

#### WhishError (Base Class)

```typescript
class WhishError extends Error {
  code: string;           // Error code for programmatic handling
  dialog?: {              // Optional dialog from Whish API
    title?: string;
    message?: string;
  };
}
```

#### WhishApiError

```typescript
class WhishApiError extends WhishError {
  httpStatus?: number;    // HTTP status code
}
```

#### WhishNetworkError

```typescript
class WhishNetworkError extends WhishError {
  cause?: Error;          // Original error
}
```

#### WhishValidationError

```typescript
class WhishValidationError extends WhishError {
  field?: string;         // Field that failed validation
}
```

### Error Codes

| Code | Class | Description |
|------|-------|-------------|
| `INVALID_CONFIG` | WhishConfigError | Missing or invalid configuration |
| `NETWORK_ERROR` | WhishNetworkError | Failed to reach Whish API |
| `API_ERROR` | WhishApiError | Whish API returned error |
| `PARSE_ERROR` | WhishParseError | Failed to parse response |
| `VALIDATION_ERROR` | WhishValidationError | Request validation failed |
| `TIMEOUT` | WhishNetworkError | Request timed out |

### Error Handling Examples

```typescript
import {
  WhishClient,
  WhishApiError,
  WhishNetworkError,
  WhishValidationError,
  WhishConfigError,
} from 'whish-pay';

try {
  const result = await whish.createPayment(paymentRequest);
} catch (error) {
  if (error instanceof WhishValidationError) {
    // Invalid request data
    console.error(`Validation error on field '${error.field}': ${error.message}`);
  } else if (error instanceof WhishApiError) {
    // Whish API returned an error
    console.error(`API error [${error.code}]: ${error.dialog?.message}`);
    if (error.httpStatus === 401) {
      // Authentication issue
    }
  } else if (error instanceof WhishNetworkError) {
    // Network failure
    console.error('Network error:', error.message);
    if (error.code === 'TIMEOUT') {
      // Request timed out
    }
  } else if (error instanceof WhishConfigError) {
    // Configuration issue
    console.error('Config error:', error.message);
  }
}
```

---

## Type Definitions

### Core Types

```typescript
/** Supported currencies */
type WhishCurrency = 'USD' | 'LBP' | 'AED';

/** API environments */
type WhishEnvironment = 'sandbox' | 'production';

/** Payment status values */
type CollectStatus = 'success' | 'failed' | 'pending';
```

### Request Types

```typescript
interface PaymentRequest {
  /** Payment amount */
  amount: number;

  /** Currency code */
  currency: WhishCurrency;

  /** Invoice/order description */
  invoice: string;

  /** Unique external ID for tracking */
  externalId: number;

  /** Server callback URL for success */
  successCallbackUrl: string;

  /** Server callback URL for failure */
  failureCallbackUrl: string;

  /** User redirect URL for success */
  successRedirectUrl: string;

  /** User redirect URL for failure */
  failureRedirectUrl: string;
}
```

### Response Types

```typescript
interface PaymentResponse {
  /** Whether the request was successful */
  success: boolean;

  /** Payment URL for customer redirect */
  collectUrl?: string;

  /** Error code if failed */
  code?: string | null;

  /** Dialog message from API */
  dialog?: {
    title?: string;
    message?: string;
  } | null;
}

interface StatusResponse {
  /** Payment status */
  collectStatus: CollectStatus;

  /** Payment amount */
  amount?: number;

  /** Payment currency */
  currency?: string;

  /** Transaction ID from Whish */
  transactionId?: string;
}

interface RateResponse {
  /** Current rate/fee */
  rate: number;
}

interface BalanceResponse {
  /** Balance details */
  balanceDetails: {
    balance: number;
  };
}
```

### API Response Format

```typescript
interface WhishApiResponse<T> {
  /** Request success status */
  status: boolean;

  /** Error code (null if successful) */
  code: string | null;

  /** User-facing dialog message */
  dialog: {
    title?: string;
    message?: string;
  } | null;

  /** Extra metadata */
  extra: unknown;

  /** Response data */
  data: T;
}
```

---

## Security Implementation

### External ID Generation

The SDK uses cryptographically secure random number generation:

```typescript
function generateExternalId(): number {
  // Millisecond timestamp (13 digits)
  const timestamp = Date.now();

  // Cryptographically secure random bytes
  const randomBytes = crypto.randomBytes(4);
  const randomValue = randomBytes.readUInt32BE(0);

  // Scale to stay within safe integer range
  const randomComponent = randomValue % 1000;

  // Combine: timestamp * 1000 + random (16 digits max)
  return timestamp * 1000 + randomComponent;
}
```

**Security Properties:**
- Uses Node.js `crypto.randomBytes()` (CSPRNG)
- Combines timestamp for uniqueness across time
- Stays within JavaScript's `Number.MAX_SAFE_INTEGER`
- Prevents transaction ID collisions

### Input Validation

All payment requests are validated before sending:

```typescript
function validatePaymentRequest(request: PaymentRequest): void {
  // Amount validation
  if (!request.amount || request.amount <= 0) {
    throw new WhishValidationError('Amount must be positive', 'amount');
  }

  // Currency validation
  if (!isValidCurrency(request.currency)) {
    throw new WhishValidationError('Invalid currency', 'currency');
  }

  // URL validation
  for (const field of urlFields) {
    try {
      new URL(request[field]);
    } catch {
      throw new WhishValidationError(`Invalid URL: ${field}`, field);
    }
  }

  // External ID validation
  if (request.externalId > Number.MAX_SAFE_INTEGER) {
    throw new WhishValidationError('External ID too large', 'externalId');
  }
}
```

### Request Timeout

All requests have configurable timeouts using `AbortController`:

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), this.timeout);

try {
  const response = await fetch(url, {
    signal: controller.signal,
    // ...
  });
} finally {
  clearTimeout(timeoutId);
}
```

---

## Framework Integration Guides

### Next.js App Router

#### Payment API Route

```typescript
// app/api/whish/payment/route.ts
import { WhishClient } from 'whish-pay';
import { NextResponse } from 'next/server';

const whish = new WhishClient({
  channel: process.env.WHISH_CHANNEL!,
  secret: process.env.WHISH_SECRET!,
  websiteUrl: process.env.WEBSITE_URL!,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = await whish.createPayment({
      amount: body.amount,
      currency: body.currency,
      invoice: body.invoice,
      externalId: whish.generateExternalId(),
      successCallbackUrl: `${process.env.WEBSITE_URL}/api/whish/callback/success`,
      failureCallbackUrl: `${process.env.WEBSITE_URL}/api/whish/callback/failure`,
      successRedirectUrl: `${process.env.WEBSITE_URL}/checkout/success`,
      failureRedirectUrl: `${process.env.WEBSITE_URL}/checkout/failure`,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Payment creation failed:', error);
    return NextResponse.json(
      { error: 'Payment creation failed' },
      { status: 500 }
    );
  }
}
```

#### Success Callback Handler

```typescript
// app/api/whish/callback/success/route.ts
import { WhishClient } from 'whish-pay';
import { NextResponse } from 'next/server';

const whish = new WhishClient({
  channel: process.env.WHISH_CHANNEL!,
  secret: process.env.WHISH_SECRET!,
  websiteUrl: process.env.WEBSITE_URL!,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const externalId = searchParams.get('externalId');
  const currency = searchParams.get('currency') as 'USD' | 'LBP' | 'AED';

  if (!externalId || !currency) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    // Verify payment status with Whish
    const status = await whish.getPaymentStatus(currency, Number(externalId));

    if (status.collectStatus === 'success') {
      // Update your database
      // await db.orders.update({ externalId, status: 'paid' });

      return NextResponse.json({ success: true, status });
    } else {
      return NextResponse.json({ success: false, status });
    }
  } catch (error) {
    console.error('Status verification failed:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
```

#### Failure Callback Handler

```typescript
// app/api/whish/callback/failure/route.ts
import { parseCallbackUrl } from 'whish-pay';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const callbackData = parseCallbackUrl(request.url);

  if (callbackData.externalId) {
    // Update your database
    // await db.orders.update({
    //   externalId: callbackData.externalId,
    //   status: 'failed',
    //   errorCode: callbackData.errorCode,
    //   errorMessage: callbackData.errorMessage,
    // });
  }

  return NextResponse.json({
    success: false,
    errorCode: callbackData.errorCode,
    errorMessage: callbackData.errorMessage,
  });
}
```

### Express.js

```typescript
import express from 'express';
import { WhishClient, WhishApiError, parseCallbackUrl } from 'whish-pay';

const app = express();
app.use(express.json());

const whish = new WhishClient({
  channel: process.env.WHISH_CHANNEL!,
  secret: process.env.WHISH_SECRET!,
  websiteUrl: process.env.WEBSITE_URL!,
});

// Create payment
app.post('/api/whish/payment', async (req, res) => {
  try {
    const result = await whish.createPayment({
      amount: req.body.amount,
      currency: req.body.currency,
      invoice: req.body.invoice,
      externalId: whish.generateExternalId(),
      successCallbackUrl: `${process.env.WEBSITE_URL}/api/whish/callback/success`,
      failureCallbackUrl: `${process.env.WEBSITE_URL}/api/whish/callback/failure`,
      successRedirectUrl: `${process.env.WEBSITE_URL}/success`,
      failureRedirectUrl: `${process.env.WEBSITE_URL}/failure`,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Payment creation failed' });
  }
});

// Success callback
app.get('/api/whish/callback/success', async (req, res) => {
  const { externalId, currency } = req.query;

  try {
    const status = await whish.getPaymentStatus(
      currency as 'USD' | 'LBP' | 'AED',
      Number(externalId)
    );

    if (status.collectStatus === 'success') {
      // Update database...
      res.redirect('/success');
    } else {
      res.redirect('/failure');
    }
  } catch (error) {
    res.redirect('/failure');
  }
});

// Failure callback
app.get('/api/whish/callback/failure', (req, res) => {
  const data = parseCallbackUrl(req.url);
  // Log error, update database...
  res.redirect('/failure');
});

app.listen(3000);
```

### Fastify

```typescript
import Fastify from 'fastify';
import { WhishClient } from 'whish-pay';

const fastify = Fastify();

const whish = new WhishClient({
  channel: process.env.WHISH_CHANNEL!,
  secret: process.env.WHISH_SECRET!,
  websiteUrl: process.env.WEBSITE_URL!,
});

fastify.post('/api/whish/payment', async (request, reply) => {
  const body = request.body as any;

  const result = await whish.createPayment({
    amount: body.amount,
    currency: body.currency,
    invoice: body.invoice,
    externalId: whish.generateExternalId(),
    successCallbackUrl: `${process.env.WEBSITE_URL}/api/callback/success`,
    failureCallbackUrl: `${process.env.WEBSITE_URL}/api/callback/failure`,
    successRedirectUrl: `${process.env.WEBSITE_URL}/success`,
    failureRedirectUrl: `${process.env.WEBSITE_URL}/failure`,
  });

  return result;
});

fastify.listen({ port: 3000 });
```

---

## Testing

### Unit Testing with Vitest

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WhishClient } from 'whish-pay';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('WhishClient', () => {
  const config = {
    channel: 'test_channel',
    secret: 'test_secret',
    websiteUrl: 'https://example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates payment successfully', async () => {
    const client = new WhishClient(config);

    mockFetch.mockResolvedValueOnce({
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        status: true,
        data: { collectUrl: 'https://whish.money/pay/abc123' },
      }),
    });

    const result = await client.createPayment({
      amount: 100,
      currency: 'USD',
      invoice: 'Test Order',
      externalId: 1234567890,
      successCallbackUrl: 'https://example.com/success',
      failureCallbackUrl: 'https://example.com/failure',
      successRedirectUrl: 'https://example.com/success',
      failureRedirectUrl: 'https://example.com/failure',
    });

    expect(result.success).toBe(true);
    expect(result.collectUrl).toBe('https://whish.money/pay/abc123');
  });
});
```

### Integration Testing (Sandbox)

```typescript
import { WhishClient } from 'whish-pay';

// Only run with real credentials
const runIntegrationTests = process.env.WHISH_CHANNEL && process.env.WHISH_SECRET;

describe.skipIf(!runIntegrationTests)('Integration Tests', () => {
  const whish = new WhishClient({
    channel: process.env.WHISH_CHANNEL!,
    secret: process.env.WHISH_SECRET!,
    websiteUrl: 'https://example.com',
    environment: 'sandbox',
  });

  it('gets rate from sandbox API', async () => {
    const rate = await whish.getRate(100, 'USD');
    expect(rate).toHaveProperty('rate');
    expect(typeof rate.rate).toBe('number');
  });

  it('gets balance from sandbox API', async () => {
    const balance = await whish.getBalance();
    expect(balance).toHaveProperty('balanceDetails');
    expect(balance.balanceDetails).toHaveProperty('balance');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## Troubleshooting

### Common Issues

#### 1. WhishConfigError: Missing configuration

**Problem:** Client throws error on initialization.

**Solution:** Ensure all required config values are provided:

```typescript
// Check environment variables are set
console.log('Channel:', process.env.WHISH_CHANNEL);
console.log('Secret:', process.env.WHISH_SECRET ? '[SET]' : '[MISSING]');
console.log('Website URL:', process.env.WEBSITE_URL);
```

#### 2. WhishNetworkError: Request timeout

**Problem:** Requests timing out.

**Solution:** Increase timeout in configuration:

```typescript
const whish = new WhishClient({
  // ...
  timeout: 60000, // 60 seconds
});
```

#### 3. WhishApiError: Invalid credentials

**Problem:** API returns authentication error.

**Solution:**
- Verify credentials are correct
- Check if using sandbox credentials with production URL (or vice versa)
- Ensure websiteUrl matches registered URL with Whish

#### 4. Payment URL not working

**Problem:** Customer cannot complete payment.

**Solution:**
- Verify callback URLs are publicly accessible
- Check that URLs use HTTPS
- Ensure URLs are registered with Whish Money

#### 5. Callback not received

**Problem:** Server doesn't receive callback after payment.

**Solution:**
- Verify callback URL is publicly accessible (not localhost)
- Check server logs for incoming requests
- Ensure firewall allows incoming connections
- Test callback URL manually with curl

### Debug Mode

Enable verbose logging for debugging:

```typescript
const whish = new WhishClient({
  channel: process.env.WHISH_CHANNEL!,
  secret: process.env.WHISH_SECRET!,
  websiteUrl: process.env.WEBSITE_URL!,
});

// Log before making requests
console.log('Environment:', whish.getEnvironment());
console.log('Base URL:', whish.getBaseUrl());
```

---

## API Endpoint Reference

### Base URLs

| Environment | URL |
|-------------|-----|
| Sandbox | `https://lb.sandbox.whish.money/itel-service/api` |
| Production | `https://whish.money/itel-service/api` |

### Required Headers (All Requests)

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `channel` | Your Whish channel ID |
| `secret` | Your Whish secret key |
| `websiteurl` | Your registered website URL |

### Endpoints

#### Create Payment

```
POST /payment/whish
```

**Request Body:**
```json
{
  "amount": 100.00,
  "currency": "USD",
  "invoice": "Order #12345",
  "externalId": 1706652000000123,
  "successCallbackUrl": "https://example.com/api/callback/success",
  "failureCallbackUrl": "https://example.com/api/callback/failure",
  "successRedirectUrl": "https://example.com/success",
  "failureRedirectUrl": "https://example.com/failure"
}
```

**Success Response:**
```json
{
  "status": true,
  "code": null,
  "dialog": null,
  "extra": null,
  "data": {
    "collectUrl": "https://whish.money/pay/abc123"
  }
}
```

#### Check Payment Status

```
POST /payment/collect/status
```

**Request Body:**
```json
{
  "currency": "USD",
  "externalId": 1706652000000123
}
```

**Success Response:**
```json
{
  "status": true,
  "code": null,
  "dialog": null,
  "extra": null,
  "data": {
    "collectStatus": "success",
    "amount": 100.00,
    "currency": "USD"
  }
}
```

#### Get Rate

```
POST /payment/whish/rate
```

**Request Body:**
```json
{
  "amount": 100,
  "currency": "USD"
}
```

**Success Response:**
```json
{
  "status": true,
  "code": null,
  "dialog": null,
  "extra": null,
  "data": {
    "rate": 0.01
  }
}
```

#### Get Balance

```
GET /payment/account/balance
```

**Success Response:**
```json
{
  "status": true,
  "code": null,
  "dialog": null,
  "extra": null,
  "data": {
    "balanceDetails": {
      "balance": 217.718
    }
  }
}
```

---

## Appendix

### Exported Members

```typescript
// Classes
export { WhishClient } from './WhishClient';

// Error Classes
export {
  WhishError,
  WhishConfigError,
  WhishApiError,
  WhishNetworkError,
  WhishValidationError,
  WhishParseError,
  ERROR_CODES,
} from './errors';

// Utility Functions
export {
  generateExternalId,
  validateAmount,
  isValidCurrency,
  validatePaymentRequest,
  parseCallbackUrl,
  getEnvironmentFromNodeEnv,
} from './utils';

// Constants
export {
  WHISH_API_URLS,
  SUPPORTED_CURRENCIES,
  DEFAULTS,
} from './constants';

// Types
export type {
  WhishConfig,
  WhishCurrency,
  WhishEnvironment,
  PaymentRequest,
  PaymentResponse,
  StatusResponse,
  RateResponse,
  BalanceResponse,
  WhishApiResponse,
  CollectStatus,
} from './types';
```

### Package Information

| Property | Value |
|----------|-------|
| Package Name | `whish-pay` |
| Version | 1.0.0 |
| License | MIT |
| Node.js | >= 18.0.0 |
| TypeScript | >= 5.0 |
| Bundle Formats | ESM, CommonJS |
| Dependencies | None (zero dependencies) |

### Related Documents

- [Business Documentation](./BUSINESS_DOCUMENTATION.md)
- [README](../README.md)
- [Changelog](../CHANGELOG.md)

---

*Document Version: 1.0.0*
*Last Updated: January 2025*

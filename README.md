# whish-pay

> Unofficial Whish Money payment client for Node.js — Simple, type-safe, zero dependencies

[![npm version](https://img.shields.io/npm/v/whish-pay.svg)](https://www.npmjs.com/package/whish-pay)
[![npm downloads](https://img.shields.io/npm/dm/whish-pay.svg)](https://www.npmjs.com/package/whish-pay)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

> **⚠️ UNOFFICIAL PACKAGE — NOT AFFILIATED WITH WHISH MONEY**
>
> This is an unofficial, community-created package for integrating [Whish Money](https://whish.money) payments.
> It is **not** affiliated with, endorsed by, or maintained by Whish Money or any of its affiliates.
>
> Before going to production, verify all API endpoint details, authentication headers, and payload formats
> against your official **Whish merchant documentation** or by contacting Whish Money support directly.

---

A lightweight, framework-agnostic client for integrating [Whish Money](https://whish.money) payments into your Node.js application. Works with Next.js App Router, Express, Fastify, Hono, or any other Node.js backend.

## Features

- **Zero Dependencies** — No external runtime dependencies
- **Type-Safe** — Full TypeScript support with comprehensive type definitions
- **Framework Agnostic** — Works with any Node.js backend
- **Secure by Design** — Server-side only; secrets never reach the client
- **Simple API** — Single client class with intuitive methods
- **Multi-Currency** — Supports USD, LBP, and AED
- **Dual Package** — Ships both ESM and CommonJS builds

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Payment Flow](#payment-flow)
- [Callback Verification](#callback-verification)
- [Framework Examples](#framework-examples)
- [Production Safety Checklist](#production-safety-checklist)
- [Error Handling](#error-handling)
- [TypeScript Types](#typescript-types)
- [Security](#security)
- [Testing](#testing)
- [Changelog](#changelog)
- [License](#license)

---

## Installation

```bash
npm install whish-pay
```

```bash
yarn add whish-pay
```

```bash
pnpm add whish-pay
```

**Node.js ≥ 18.0.0 required** (uses native `fetch` and `crypto`).

---

## Quick Start

```typescript
import { WhishClient } from 'whish-pay';

const whish = new WhishClient({
  channel: process.env.WHISH_CHANNEL!,
  secret: process.env.WHISH_SECRET!,
  websiteUrl: process.env.WEBSITE_URL!,
});

const externalId = whish.generateExternalId();

// Always call createPayment from your backend — never from the client
const result = await whish.createPayment({
  amount: 100.00,
  currency: 'USD',
  invoice: 'Order #12345',
  externalId,
  successCallbackUrl: 'https://yourdomain.com/api/whish/callback/success',
  failureCallbackUrl: 'https://yourdomain.com/api/whish/callback/failure',
  successRedirectUrl: 'https://yourdomain.com/checkout/success',
  failureRedirectUrl: 'https://yourdomain.com/checkout/failure',
});

if (result.success) {
  // Save externalId to your database before redirecting
  // await db.orders.update({ externalId, status: 'awaiting_payment' });

  // Redirect user to Whish payment page
  // collectUrl example: "https://whish.money/pay/abc123"
  redirect(result.collectUrl!);
}
```

---

## Environment Variables

```bash
# .env.local (Next.js) or .env (Node.js)

# Required — provided by Whish Money in your merchant portal
WHISH_CHANNEL=your_channel_id
WHISH_SECRET=your_secret_key
WEBSITE_URL=https://yourdomain.com

# Optional — controls which API endpoint is used
# Omit or set to anything other than "production" to use sandbox
NODE_ENV=production
```

> **Never commit `.env` files to version control. Never expose `WHISH_SECRET` to the browser.**

---

## API Reference

### `new WhishClient(config)`

Creates a new client instance. Throws `WhishConfigError` if any required field is missing.

```typescript
const whish = new WhishClient({
  channel: string,       // Channel ID from Whish merchant portal
  secret: string,        // Secret key from Whish (keep server-side only)
  websiteUrl: string,    // Your registered website URL

  // Optional
  environment?: 'sandbox' | 'production', // Default: auto-detects from NODE_ENV
  timeout?: number,                        // Request timeout in ms (default: 30000)
});
```

---

### `createPayment(request)`

Creates a new payment and returns the URL to redirect the user to.

```typescript
const result = await whish.createPayment({
  amount: 100,                             // Payment amount (positive number)
  currency: 'USD',                         // 'USD' | 'LBP' | 'AED'
  invoice: 'Order #123',                   // Description shown to the user
  externalId: whish.generateExternalId(),  // Unique numeric ID from your system
  successCallbackUrl: 'https://yourdomain.com/api/whish/callback/success',
  failureCallbackUrl: 'https://yourdomain.com/api/whish/callback/failure',
  successRedirectUrl: 'https://yourdomain.com/checkout/success',
  failureRedirectUrl: 'https://yourdomain.com/checkout/failure',
});

if (result.success) {
  // redirect user to result.collectUrl
} else {
  // result.code — Whish error code
  // result.dialog?.message — human-readable message
}
```

**Returns** `PaymentResponse`:

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the payment URL was created |
| `collectUrl` | `string?` | URL to redirect the user to (when success) |
| `code` | `string?` | Whish error code (when not success) |
| `dialog` | `{ title?, message? }?` | Human-readable error (when not success) |

---

### `getPaymentStatus(currency, externalId)`

Checks the current status of a payment. **Always call this before marking an order as paid.**

```typescript
const status = await whish.getPaymentStatus('USD', externalId);

switch (status.collectStatus) {
  case 'success':
    // Payment confirmed — safe to mark order as paid (once, idempotently)
    break;
  case 'failed':
    // Payment failed — restore inventory, notify user
    break;
  case 'pending':
    // Still in progress — do not mark as paid
    break;
}
```

**Returns** `StatusResponse`:

| Field | Type | Description |
|-------|------|-------------|
| `collectStatus` | `'success' \| 'failed' \| 'pending'` | Current payment state |
| `amount` | `number?` | Amount charged |
| `currency` | `string?` | Currency of the payment |
| `transactionId` | `string?` | Whish internal transaction ID |

---

### `getRate(amount, currency)`

Returns the current fee/rate that will be applied to a payment.

```typescript
const { rate } = await whish.getRate(100, 'USD');
const fee = 100 * rate; // e.g. 100 * 0.01 = $1.00 fee
```

---

### `getBalance()`

Returns the current account balance. Note: only LBP balance is available via API.

```typescript
const { balanceDetails } = await whish.getBalance();
console.log(balanceDetails.balance);
```

---

### `generateExternalId()`

Generates a cryptographically secure, unique numeric ID suitable for use as `externalId`. Combines a millisecond timestamp with a random component.

```typescript
const externalId = whish.generateExternalId();
// e.g. 1706652000000123
```

Store this ID in your database alongside the order before calling `createPayment`.

---

### `validateAmount(received, expected, currency, tolerance?)`

Validates that a received payment amount matches your expected amount within a tolerance. Useful for verifying callbacks where minor floating-point differences may appear.

```typescript
// Default tolerances: USD/AED = 0.02, LBP = 100
whish.validateAmount(99.99, 100, 'USD')   // true
whish.validateAmount(99.97, 100, 'USD')   // false

// Custom tolerance
whish.validateAmount(99.50, 100, 'USD', 0.50) // true
```

---

## Payment Flow

```
1. Your server creates an order in the database
   → status: 'awaiting_payment', externalId saved

2. Your server calls whish.createPayment()
   → receives collectUrl

3. You redirect the user to collectUrl (Whish payment page)

4. User completes (or cancels) payment on Whish

5. Whish calls your successCallbackUrl or failureCallbackUrl (server-to-server)

6. Your callback handler calls whish.getPaymentStatus()
   → verifies the status is truly 'success'
   → verifies amount/currency against your order record

7. Only then: mark the order as paid (idempotently)

8. Whish redirects user to your successRedirectUrl or failureRedirectUrl
```

---

## Callback Verification

> **⚠️ IMPORTANT — Read before handling callbacks**
>
> A callback or redirect to your success URL does **NOT** guarantee the payment was completed.
> Query parameters can be forged. Redirects can be triggered manually.
>
> **Always verify payment status server-side before marking an order as paid.**

### Correct verification flow

```typescript
import { WhishClient, parseCallbackUrl } from 'whish-pay';

// 1. Parse the callback URL Whish called
const { externalId, currency } = parseCallbackUrl(request.url);

if (!externalId || !currency) {
  // Malformed callback — log and ignore
  return;
}

// 2. Fetch authoritative status from Whish API
const status = await whish.getPaymentStatus(currency, externalId);

// 3. Verify status is actually 'success'
if (status.collectStatus !== 'success') {
  // Payment not confirmed — do not mark as paid
  return;
}

// 4. Load your order from the database using externalId
// const order = await db.orders.findByExternalId(externalId);
// if (!order) return; // Unknown externalId

// 5. Verify amount and currency match your order record
// if (!whish.validateAmount(status.amount!, order.amount, order.currency)) {
//   // Amount mismatch — possible tampering, do not mark as paid
//   return;
// }

// 6. Mark order as paid — idempotently (check if not already paid)
// if (order.status !== 'paid') {
//   await db.orders.markPaid(order.id);
// }
```

### `parseCallbackUrl(url)`

Extracts `externalId`, `currency`, and optional error details from a Whish callback URL.

```typescript
import { parseCallbackUrl } from 'whish-pay';

const data = parseCallbackUrl(request.url);
// {
//   externalId: 1706652000000123,
//   currency: 'USD',
//   errorCode?: 'USER_CANCELLED',
//   errorMessage?: 'User cancelled the payment',
// }
```

Returns `null` for `externalId` or `currency` if the parameter is missing or invalid.

---

## Framework Examples

### Next.js App Router

See the full working example in [`examples/next-app-router/`](./examples/next-app-router/).

**Create payment API route:**

```typescript
// app/api/whish/create-payment/route.ts
import { WhishClient, WhishApiError } from 'whish-pay';
import { NextResponse } from 'next/server';

const whish = new WhishClient({
  channel: process.env.WHISH_CHANNEL!,
  secret: process.env.WHISH_SECRET!,
  websiteUrl: process.env.WEBSITE_URL!,
});

export async function POST(request: Request) {
  const { amount, currency, orderId, invoice } = await request.json();

  const externalId = whish.generateExternalId();

  // TODO: Save externalId to your order in the database before creating the payment
  // await db.orders.update(orderId, { externalId, status: 'awaiting_payment' });

  const result = await whish.createPayment({
    amount,
    currency,
    invoice,
    externalId,
    successCallbackUrl: `${process.env.WEBSITE_URL}/api/whish/callback/success`,
    failureCallbackUrl: `${process.env.WEBSITE_URL}/api/whish/callback/failure`,
    successRedirectUrl: `${process.env.WEBSITE_URL}/checkout/success`,
    failureRedirectUrl: `${process.env.WEBSITE_URL}/checkout/failure`,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.dialog?.message ?? 'Payment creation failed' },
      { status: 400 }
    );
  }

  return NextResponse.json({ collectUrl: result.collectUrl, externalId });
}
```

**Success callback handler:**

```typescript
// app/api/whish/callback/success/route.ts
import { WhishClient, parseCallbackUrl } from 'whish-pay';
import { NextResponse } from 'next/server';

const whish = new WhishClient({
  channel: process.env.WHISH_CHANNEL!,
  secret: process.env.WHISH_SECRET!,
  websiteUrl: process.env.WEBSITE_URL!,
});

export async function GET(request: Request) {
  const { externalId, currency } = parseCallbackUrl(request.url);

  if (!externalId || !currency) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // Always verify with Whish — never trust the callback URL alone
  const status = await whish.getPaymentStatus(currency, externalId);

  if (status.collectStatus !== 'success') {
    return NextResponse.json(
      { error: 'Payment not confirmed', status: status.collectStatus },
      { status: 400 }
    );
  }

  // TODO: Load your order by externalId, verify amount, then mark as paid (idempotently)
  // const order = await db.orders.findByExternalId(externalId);
  // if (order && order.status !== 'paid') {
  //   await db.orders.markPaid(order.id);
  // }

  return NextResponse.json({ ok: true });
}
```

---

### Express.js

```typescript
import express from 'express';
import { WhishClient, parseCallbackUrl, WhishApiError } from 'whish-pay';

const app = express();
app.use(express.json());

const whish = new WhishClient({
  channel: process.env.WHISH_CHANNEL!,
  secret: process.env.WHISH_SECRET!,
  websiteUrl: process.env.WEBSITE_URL!,
});

// Create payment
app.post('/api/whish/payment', async (req, res) => {
  const { amount, currency, orderId, invoice } = req.body;

  try {
    const externalId = whish.generateExternalId();

    // TODO: Save externalId to your order before calling createPayment
    // await db.orders.update(orderId, { externalId });

    const result = await whish.createPayment({
      amount,
      currency,
      invoice,
      externalId,
      successCallbackUrl: `${process.env.WEBSITE_URL}/api/whish/callback/success`,
      failureCallbackUrl: `${process.env.WEBSITE_URL}/api/whish/callback/failure`,
      successRedirectUrl: `${process.env.WEBSITE_URL}/checkout/success`,
      failureRedirectUrl: `${process.env.WEBSITE_URL}/checkout/failure`,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.dialog?.message });
    }

    res.json({ collectUrl: result.collectUrl, externalId });
  } catch (error) {
    if (error instanceof WhishApiError) {
      return res.status(502).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Success callback — called server-to-server by Whish
app.get('/api/whish/callback/success', async (req, res) => {
  const callbackData = parseCallbackUrl(
    `${process.env.WEBSITE_URL}${req.originalUrl}`
  );
  const { externalId, currency } = callbackData;

  if (!externalId || !currency) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    // Verify with Whish — never trust query params alone
    const status = await whish.getPaymentStatus(currency, externalId);

    if (status.collectStatus !== 'success') {
      return res.status(400).json({ error: 'Payment not confirmed' });
    }

    // TODO: Mark order as paid idempotently
    // await db.orders.markPaid(externalId);

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Failure callback
app.get('/api/whish/callback/failure', async (req, res) => {
  const { externalId, errorCode, errorMessage } = parseCallbackUrl(
    `${process.env.WEBSITE_URL}${req.originalUrl}`
  );

  // TODO: Update order status to 'failed', restore inventory if needed
  // await db.orders.markFailed(externalId, errorCode);

  res.json({ ok: true });
});

app.listen(3000);
```

---

## Production Safety Checklist

Before going live, verify all of the following:

- [ ] `WHISH_CHANNEL` and `WHISH_SECRET` are environment variables — never hardcoded
- [ ] `WHISH_SECRET` is server-side only — never sent to the browser or logged
- [ ] `createPayment` is always called from your backend, never from client-side code
- [ ] `externalId` is saved to your database **before** calling `createPayment`
- [ ] All callback and redirect URLs use HTTPS
- [ ] Callback handlers call `getPaymentStatus()` before marking any order as paid
- [ ] Callbacks are treated as signals only — status is verified via API, not query params
- [ ] Amount and currency are verified against your own order record before marking paid
- [ ] Order confirmation is idempotent — processing the same `externalId` twice is safe
- [ ] Failed payment attempts are logged without exposing secrets or full response bodies
- [ ] Your sandbox credentials are different from your production credentials
- [ ] `NODE_ENV=production` is set correctly in your production environment
- [ ] You have tested the full payment flow end-to-end in sandbox before going live

---

## Error Handling

All errors extend `WhishError` and include a `code` field for programmatic handling.

```typescript
import {
  WhishError,
  WhishConfigError,
  WhishApiError,
  WhishNetworkError,
  WhishValidationError,
  WhishParseError,
} from 'whish-pay';

try {
  const result = await whish.createPayment(paymentRequest);
} catch (error) {
  if (error instanceof WhishConfigError) {
    // Invalid client configuration — fix before deploying
    console.error('Config error:', error.message);

  } else if (error instanceof WhishValidationError) {
    // Request validation failed before reaching the API
    console.error('Validation error:', error.message, '| Field:', error.field);

  } else if (error instanceof WhishApiError) {
    // Whish API returned a non-success response
    // error.code — Whish error code
    // error.dialog?.message — user-facing message from Whish
    // error.httpStatus — HTTP status code (if set)
    console.error('API error:', error.code, error.dialog?.message);

  } else if (error instanceof WhishNetworkError) {
    // Could not reach Whish API (timeout, DNS, etc.)
    console.error('Network error:', error.message);

  } else if (error instanceof WhishParseError) {
    // Unexpected response format from Whish API
    console.error('Parse error:', error.message);
  }
}
```

### Error codes

| Code | Class | Meaning |
|------|-------|---------|
| `INVALID_CONFIG` | `WhishConfigError` | Missing required config field |
| `VALIDATION_ERROR` | `WhishValidationError` | Invalid payment request field |
| `API_ERROR` | `WhishApiError` | Whish API returned an error |
| `NO_PAYMENT_URL` | `WhishApiError` | API succeeded but returned no URL |
| `NETWORK_ERROR` | `WhishNetworkError` | Request failed or timed out |
| `PARSE_ERROR` | `WhishParseError` | Unexpected response format |
| `TIMEOUT` | `WhishNetworkError` | Request exceeded timeout |

---

## TypeScript Types

All public types are exported from the main package entry point:

```typescript
import type {
  WhishConfig,       // Constructor config
  PaymentRequest,    // createPayment() input
  PaymentResponse,   // createPayment() return value
  StatusResponse,    // getPaymentStatus() return value
  RateResponse,      // getRate() return value
  BalanceResponse,   // getBalance() return value
  WhishApiResponse,  // Raw Whish API response wrapper
  WhishCurrency,     // 'USD' | 'LBP' | 'AED'
  PaymentStatus,     // 'success' | 'failed' | 'pending'
  Environment,       // 'sandbox' | 'production'
} from 'whish-pay';
```

---

## Security

See [SECURITY.md](./SECURITY.md) for the full security policy.

Key principles:
- Never expose `WHISH_SECRET` to client-side code or logs
- Rotate credentials immediately if leaked
- Always verify payment status server-side via `getPaymentStatus()`
- Use HTTPS for all callback and redirect URLs
- Never mark an order as paid based on a redirect URL or query parameters alone

To report a security issue with this package, open an issue at
[GitHub Issues](https://github.com/Mohammad-AlBaker-Zaytoun/whish-pay/issues).

---

## Testing

Use the sandbox environment during development and CI:

```typescript
const whish = new WhishClient({
  channel: process.env.WHISH_CHANNEL!,
  secret: process.env.WHISH_SECRET!,
  websiteUrl: process.env.WEBSITE_URL!,
  environment: 'sandbox', // Explicit sandbox — safe for tests
});
```

Auto-detection from `NODE_ENV`:

| `NODE_ENV` | Environment used |
|------------|-----------------|
| `production` | Production API |
| anything else | Sandbox API |

Run the package test suite:

```bash
npm install
npm run build
npm test
```

---

## API Environments

| Environment | Base URL |
|-------------|----------|
| Sandbox | `https://lb.sandbox.whish.money/itel-service/api` |
| Production | `https://whish.money/itel-service/api` |

> Verify these URLs against your official Whish merchant documentation before going live,
> as endpoints may change without notice.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full release history.

---

## License

MIT License — see [LICENSE](./LICENSE) for details.

---

## Support

- **Package issues**: [GitHub Issues](https://github.com/Mohammad-AlBaker-Zaytoun/whish-pay/issues)
- **Whish API support**: Contact Whish Money directly for merchant credentials and API documentation

---

> This package is maintained by [Zaytoun Solutions](https://www.zaytounsolutions.com).
> It is not affiliated with or endorsed by Whish Money.

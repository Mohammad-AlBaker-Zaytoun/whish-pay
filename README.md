# whish-pay

> Whish Money Payment Gateway SDK for Node.js - Simple, type-safe, zero dependencies

[![npm version](https://img.shields.io/npm/v/whish-pay.svg)](https://www.npmjs.com/package/whish-pay)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, framework-agnostic SDK for integrating [Whish Money](https://whish.money) payments into your Node.js application. Works with Next.js, Express, Fastify, Hono, or any other Node.js backend.

## Features

- **Zero Dependencies** - No external runtime dependencies
- **Type-Safe** - Full TypeScript support with comprehensive type definitions
- **Framework Agnostic** - Works with any Node.js backend
- **Secure** - Server-side only, secrets never exposed to client
- **Simple API** - Single client class with intuitive methods
- **Multi-Currency** - Supports USD, LBP, and AED currencies

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

## Quick Start

```typescript
import { WhishClient } from 'whish-pay';

// Initialize the client
const whish = new WhishClient({
  channel: process.env.WHISH_CHANNEL!,
  secret: process.env.WHISH_SECRET!,
  websiteUrl: process.env.WEBSITE_URL!,
});

// Create a payment
const { collectUrl } = await whish.createPayment({
  amount: 100.00,
  currency: 'USD',
  invoice: 'Order #12345',
  externalId: whish.generateExternalId(),
  successCallbackUrl: 'https://yourdomain.com/api/whish/callback/success',
  failureCallbackUrl: 'https://yourdomain.com/api/whish/callback/failure',
  successRedirectUrl: 'https://yourdomain.com/checkout/success',
  failureRedirectUrl: 'https://yourdomain.com/checkout/failure',
});

// Redirect user to payment page
// collectUrl: "https://whish.money/pay/abc123"
```

## Configuration

### Environment Variables

```bash
# Required
WHISH_CHANNEL=your_channel_id      # Provided by Whish
WHISH_SECRET=your_secret_key       # Provided by Whish (keep secure!)
WEBSITE_URL=https://yourdomain.com # Your registered website URL

# Optional
NODE_ENV=production                # Auto-switches to production API
```

### Client Options

```typescript
const whish = new WhishClient({
  // Required
  channel: string,      // Channel ID from Whish
  secret: string,       // Secret key from Whish
  websiteUrl: string,   // Your website URL

  // Optional
  environment?: 'sandbox' | 'production', // Default: auto-detect from NODE_ENV
  timeout?: number,     // Request timeout in ms (default: 30000)
});
```

## API Reference

### `createPayment(request)`

Creates a new payment and returns the payment URL.

```typescript
const result = await whish.createPayment({
  amount: 100,                    // Payment amount
  currency: 'USD',                // 'USD' | 'LBP' | 'AED'
  invoice: 'Order #123',          // Description shown to user
  externalId: whish.generateExternalId(), // Unique transaction ID
  successCallbackUrl: '...',      // Whish calls this on success (server-to-server)
  failureCallbackUrl: '...',      // Whish calls this on failure (server-to-server)
  successRedirectUrl: '...',      // User redirected here after success
  failureRedirectUrl: '...',      // User redirected here after failure
});

if (result.success) {
  // Redirect user to result.collectUrl
} else {
  // Handle error: result.code, result.dialog?.message
}
```

### `getPaymentStatus(currency, externalId)`

Verifies the status of a payment. Use this in your callback handlers.

```typescript
const status = await whish.getPaymentStatus('USD', externalId);

// status.collectStatus: 'success' | 'failed' | 'pending'
// status.amount: number (if available)
// status.currency: string (if available)
```

### `getRate(amount, currency)`

Gets the current rate/fees for payments.

```typescript
const { rate } = await whish.getRate(100, 'USD');
// rate: 0.01 (1% fee)
const fee = amount * rate; // $1 fee on $100
```

### `getBalance()`

Gets your Whish account balance.

```typescript
const { balanceDetails } = await whish.getBalance();
// balanceDetails.balance: number
```

### `generateExternalId()`

Generates a cryptographically secure unique ID for payments.

```typescript
const externalId = whish.generateExternalId();
// Returns a unique numeric ID
```

### `validateAmount(received, expected, currency, tolerance?)`

Validates payment amounts match within tolerance.

```typescript
// Default tolerance: USD = 0.01, LBP = 100
const isValid = whish.validateAmount(99.99, 100, 'USD'); // true
const isValid = whish.validateAmount(99.98, 100, 'USD'); // false

// Custom tolerance
const isValid = whish.validateAmount(99, 100, 'USD', 1); // true
```

## Framework Examples

### Next.js (App Router)

**Create Payment API Route:**

```typescript
// app/api/whish/payment/route.ts
import { WhishClient } from 'whish-pay';
import { NextResponse } from 'next/server';

const whish = new WhishClient({
  channel: process.env.WHISH_CHANNEL!,
  secret: process.env.WHISH_SECRET!,
  websiteUrl: process.env.WEBSITE_URL!,
});

export async function POST(request: Request) {
  const { amount, currency, orderId, invoice } = await request.json();

  try {
    const externalId = whish.generateExternalId();

    const result = await whish.createPayment({
      amount,
      currency,
      invoice,
      externalId,
      successCallbackUrl: `${process.env.WEBSITE_URL}/api/whish/callback/success`,
      failureCallbackUrl: `${process.env.WEBSITE_URL}/api/whish/callback/failure`,
      successRedirectUrl: `${process.env.WEBSITE_URL}/checkout/success?orderId=${orderId}`,
      failureRedirectUrl: `${process.env.WEBSITE_URL}/checkout/failure?orderId=${orderId}`,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.dialog?.message || 'Payment creation failed' },
        { status: 400 }
      );
    }

    // Save externalId to your order for later verification
    // await updateOrder(orderId, { externalId, status: 'awaiting_payment' });

    return NextResponse.json({ collectUrl: result.collectUrl, externalId });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
```

**Success Callback Handler:**

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

  try {
    // Verify payment with Whish
    const status = await whish.getPaymentStatus(currency, externalId);

    if (status.collectStatus === 'success') {
      // Update your order status
      // await updateOrder(externalId, { status: 'paid' });

      return NextResponse.json({ success: true, externalId });
    }

    return NextResponse.json(
      { success: false, status: status.collectStatus },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500 }
    );
  }
}
```

### Express.js

```typescript
import express from 'express';
import { WhishClient, parseCallbackUrl } from 'whish-pay';

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
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Success callback
app.get('/api/whish/callback/success', async (req, res) => {
  const { externalId, currency } = req.query;

  try {
    const status = await whish.getPaymentStatus(
      currency as 'USD' | 'LBP',
      Number(externalId)
    );

    if (status.collectStatus === 'success') {
      // Update order status...
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false });
    }
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Failure callback
app.get('/api/whish/callback/failure', async (req, res) => {
  const { externalId, errorCode, errorMessage } = req.query;
  // Handle failure, restore inventory, etc.
  res.json({ success: false, errorCode, errorMessage });
});

app.listen(3000);
```

## Error Handling

The SDK provides specific error classes for different failure scenarios:

```typescript
import {
  WhishError,
  WhishConfigError,
  WhishApiError,
  WhishNetworkError,
  WhishValidationError,
} from 'whish-pay';

try {
  const result = await whish.createPayment(request);
} catch (error) {
  if (error instanceof WhishConfigError) {
    // Invalid configuration
    console.error('Config error:', error.message);
  } else if (error instanceof WhishValidationError) {
    // Request validation failed
    console.error('Validation error:', error.message, 'Field:', error.field);
  } else if (error instanceof WhishApiError) {
    // Whish API returned an error
    console.error('API error:', error.code, error.dialog?.message);
  } else if (error instanceof WhishNetworkError) {
    // Network request failed
    console.error('Network error:', error.message);
  }
}
```

## Payment Flow

1. **Create Order** - Create an order in your database with status `awaiting_payment`
2. **Create Payment** - Call `whish.createPayment()` with order details
3. **Save External ID** - Store the `externalId` with your order for later verification
4. **Redirect User** - Send user to the `collectUrl` to complete payment
5. **Handle Callback** - Whish calls your callback URL after payment
6. **Verify Payment** - Call `whish.getPaymentStatus()` to verify
7. **Update Order** - Update order status based on payment result

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Your App   │────▶│ Whish API   │────▶│ Whish Page  │
│             │     │             │     │  (Payment)  │
└─────────────┘     └─────────────┘     └──────┬──────┘
       ▲                                        │
       │            ┌─────────────┐             │
       └────────────│  Callback   │◀────────────┘
                    │  Handler    │
                    └─────────────┘
```

## Security Best Practices

1. **Keep secrets secure** - Never expose `WHISH_SECRET` to the client
2. **Validate callbacks** - Always verify payment status with `getPaymentStatus()`
3. **Use HTTPS** - All callback URLs must use HTTPS in production
4. **Validate amounts** - Use `validateAmount()` to prevent amount manipulation
5. **Idempotency** - Handle duplicate callbacks gracefully
6. **Unique external IDs** - Use `generateExternalId()` for collision-free IDs

## Testing

Use the sandbox environment for testing:

```typescript
const whish = new WhishClient({
  channel: process.env.WHISH_CHANNEL!,
  secret: process.env.WHISH_SECRET!,
  websiteUrl: process.env.WEBSITE_URL!,
  environment: 'sandbox', // Explicitly use sandbox
});
```

Or set `NODE_ENV=development` to auto-select sandbox.

## API Environments

| Environment | Base URL |
|-------------|----------|
| Sandbox | `https://lb.sandbox.whish.money/itel-service/api` |
| Production | `https://whish.money/itel-service/api` |

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  WhishConfig,
  PaymentRequest,
  PaymentResponse,
  StatusResponse,
  WhishCurrency,
  PaymentStatus,
} from 'whish-pay';
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/Mohammad-AlBaker-Zaytoun/whish-pay/issues)
- **Whish Support**: Contact Whish Money for API credentials and merchant support

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

Made with ❤️ by Zaytoun Solutions
www.zaytounsolutions.com
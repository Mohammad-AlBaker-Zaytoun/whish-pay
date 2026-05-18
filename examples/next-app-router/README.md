# whish-pay — Next.js App Router Example

This example shows how to integrate `whish-pay` into a Next.js 13/14/15 application
using the App Router.

> **Unofficial package** — not affiliated with Whish Money.
> Verify endpoint details with your official Whish merchant documentation.

## File Overview

```
app/
  api/
    whish/
      create-payment/
        route.ts          ← POST: creates a Whish payment, returns collectUrl
      callback/
        success/
          route.ts        ← GET: Whish calls this server-to-server on success
        failure/
          route.ts        ← GET: Whish calls this server-to-server on failure
components/
  PayWithWhishButton.tsx  ← Client component that triggers the payment
```

## Environment Variables

Create a `.env.local` file:

```bash
WHISH_CHANNEL=your_channel_id
WHISH_SECRET=your_secret_key
WEBSITE_URL=https://yourdomain.com

# Keep NODE_ENV=production in your production deployment
NODE_ENV=production
```

`WHISH_SECRET` is read only by the server-side API routes. It is never bundled
into client JavaScript.

## Payment Flow

```
1. User clicks PayWithWhishButton
   → browser POST /api/whish/create-payment

2. API route calls whish.createPayment() (server-side only)
   → saves externalId to database
   → returns { collectUrl, externalId }

3. Browser redirects user to collectUrl (Whish payment page)

4. User completes payment on Whish

5. Whish calls GET /api/whish/callback/success (server-to-server)
   → handler calls whish.getPaymentStatus() to verify
   → verifies amount/currency against order record
   → marks order as paid (idempotently)

6. Whish redirects user to /checkout/success (or /checkout/failure)
```

## Key Safety Rules

- **Never call `WhishClient` from a client component** — it would expose your secret.
- **Always verify status via `getPaymentStatus()`** before marking an order as paid.
  Redirects and callbacks can be triggered manually; only the API response is trustworthy.
- **Save `externalId` before calling `createPayment()`** so you can always find the order
  even if your server crashes between creating the payment and receiving the callback.
- **Mark orders as paid idempotently** — Whish may call your callback more than once.
- **Use HTTPS** for all callback and redirect URLs in production.

## Running Locally

```bash
# Install dependencies
npm install

# Add your .env.local
cp .env.example .env.local   # then fill in your values

# Start development server
npm run dev
```

Use `environment: 'sandbox'` or set `NODE_ENV=development` to test against
the Whish sandbox without real money.

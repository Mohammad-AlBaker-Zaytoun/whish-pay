# Security Policy

## Scope

This document covers security considerations for the **whish-pay** npm package itself.
For questions about Whish Money's platform security, contact Whish Money directly.

## Secret Handling

`WHISH_CHANNEL` and `WHISH_SECRET` are sensitive credentials provided by Whish Money.

**Rules that must never be broken:**

- Never include `WHISH_SECRET` in client-side JavaScript or any bundle delivered to browsers.
- Never log `WHISH_SECRET`, full request headers, or raw API responses that may contain credentials.
- Never commit credentials to version control — use environment variables or a secrets manager.
- Never pass credentials through query parameters or URL fragments.
- If credentials are accidentally exposed (committed to a public repo, logged, etc.),
  rotate them with Whish Money immediately and treat the old values as compromised.

## Server-Side Only

`WhishClient` must only be instantiated and used on the server:

- In Next.js: only inside API routes (`app/api/`, `pages/api/`) or Server Actions.
  Never import or use `WhishClient` in a component file or any code that ships to the browser.
- In Express / Fastify / Hono: only inside route handlers, never in static middleware
  that runs on shared infrastructure with client code.

## Payment Verification

**Never mark an order as paid based on a redirect URL or callback query parameters alone.**
Both can be triggered by anyone without completing a real payment.

The only authoritative source of payment truth is `getPaymentStatus()`:

1. Parse `externalId` and `currency` from the callback URL.
2. Call `whish.getPaymentStatus(currency, externalId)` to fetch the current status from Whish.
3. Verify `collectStatus === 'success'`.
4. Verify the returned `amount` and `currency` match your order record.
5. Only then mark the order as paid, idempotently.

## HTTPS

All callback and redirect URLs (`successCallbackUrl`, `failureCallbackUrl`,
`successRedirectUrl`, `failureRedirectUrl`) must use HTTPS in production.
Using HTTP allows callback parameters to be intercepted or modified in transit.

## Credential Rotation

If you suspect your `WHISH_SECRET` has been compromised:

1. Contact Whish Money support to rotate your credentials immediately.
2. Revoke or invalidate any sessions or orders that may have been created with the
   compromised credentials.
3. Audit logs for unusual payment creation or status check patterns.
4. Update your environment variables with the new credentials and redeploy.

## Dependency Security

`whish-pay` has zero runtime dependencies, which eliminates supply-chain risk from
transitive packages at runtime. Dev dependencies (TypeScript, Vitest, tsup, ESLint) are
only used during development and are not included in the published package.

## Reporting a Security Issue

To report a security vulnerability in this package (e.g., a logic flaw that could allow
payment bypass, credential leakage through the package API, or similar):

1. **Do not open a public GitHub issue** for confirmed or suspected security vulnerabilities.
2. Open a **private** report via GitHub's Security Advisory feature at:
   `https://github.com/Mohammad-AlBaker-Zaytoun/whish-pay/security/advisories/new`
3. Alternatively, contact the maintainer directly through the email listed on
   [the npm package page](https://www.npmjs.com/package/whish-pay).

Please include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigations

You can expect an acknowledgement within 72 hours and a resolution timeline within 14 days
for confirmed vulnerabilities.

## Disclaimer

This package is unofficial and not affiliated with Whish Money. The maintainers make no
guarantees about the correctness or completeness of the API integration. Always verify
endpoint details and authentication requirements against your official Whish merchant
documentation before production use.

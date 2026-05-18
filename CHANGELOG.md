# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-05-19

### Added

- **Unofficial disclaimer** prominently in README and package description, clarifying this package
  is not affiliated with or endorsed by Whish Money.
- **Production safety checklist** in README — 13-point checklist for going live safely.
- **Next.js App Router examples** in `examples/next-app-router/` — create-payment route,
  success/failure callback handlers, and a client-side PayWithWhishButton component.
- **SECURITY.md** — security policy, secret-handling guidance, and responsible disclosure instructions.
- Additional edge-case tests for `validateAmount` (NaN, Infinity, zero, negative inputs).
- Additional tests for `getPaymentStatus` with `pending` and `failed` statuses.
- Test coverage for `createPayment` request body correctness.

### Changed

- README fully rewritten with clearer structure: disclaimer, callback verification guidance,
  corrected flow diagram, framework examples, error code table, and types reference.
- Callback handling section now explicitly warns that redirect/callback URLs alone are not
  proof of payment — `getPaymentStatus()` must be called to confirm.
- Package description updated to "Unofficial Whish Money payment client for Node.js" to
  accurately reflect the package's unofficial status.

### Security

- Added explicit guidance: never expose `WHISH_SECRET` client-side or in logs.
- Documented the correct server-side payment verification flow to prevent order fraud.
- Clarified that redirect query parameters must not be trusted as proof of payment.

---

## [1.0.3] - 2025-01-29

### Added

- `homepage` field in package.json for npm registry
- TypeScript and npm downloads badges in README

### Changed

- Repository URL format normalized to git+https://
- Updated documentation version references

### Fixed

- Added .bat and .claude/ to .gitignore for cleaner repositories

## [1.0.2] - 2025-01-28

### Added

- `getEnvironmentFromNodeEnv()` utility now exported from main module
- `NO_PAYMENT_URL` error code to ERROR_CODES constant
- `additionalData` field to StatusResponse for extra API response data
- Comprehensive error class tests (15 new tests)
- `sideEffects: false` for better tree-shaking
- ES Module support with `"type": "module"`

### Changed

- Improved type safety: replaced index signature in StatusResponse
- Refactored API error handling with helper method to reduce duplication
- Use nullish coalescing (`??`) instead of OR (`||`) for null checks
- Safer `process.env` access for non-Node environments
- Sanitized error messages to avoid logging sensitive response content
- Fixed README documentation: corrected default tolerance from 0.01 to 0.02

### Fixed

- ESLint config renamed to `.eslintrc.cjs` for ES module compatibility
- Package exports updated to match ES module build output

## [1.0.1] - 2025-01-28

### Changed

- Updated README documentation

## [1.0.0] - 2025-01-28

### Added

- Initial release of `whish-pay`
- `WhishClient` class with full Whish Money API support
- `createPayment()` — Create W2W payments and get payment URL
- `getPaymentStatus()` — Check payment status by external ID
- `getRate()` — Get current rate/fees for payments
- `getBalance()` — Get account balance
- `generateExternalId()` — Cryptographically secure unique ID generation
- `validateAmount()` — Amount validation with currency tolerance
- Full TypeScript support with comprehensive type definitions
- Custom error classes for better error handling
- ESM and CommonJS dual builds
- Zero runtime dependencies

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-28

### Added

- Initial release of `whish-pay`
- `WhishClient` class with full Whish Money API support
- `createPayment()` - Create W2W payments and get payment URL
- `getPaymentStatus()` - Check payment status by external ID
- `getRate()` - Get current rate/fees for payments
- `getBalance()` - Get account balance
- `generateExternalId()` - Cryptographically secure unique ID generation
- `validateAmount()` - Amount validation with currency tolerance
- Full TypeScript support with comprehensive type definitions
- Custom error classes for better error handling
- ESM and CommonJS dual builds
- Zero runtime dependencies

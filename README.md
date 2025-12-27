# Universal Reliability Kernel (URK) V2

The Universal Reliability Kernel is a sovereign-grade, firm-agnostic Digital Identity & Compliance Node. It empowers any Corporate Service Provider (CSP) to act as a **Universal Bridge**, issuing W3C Verifiable Credentials with advanced Zero-Knowledge Solvency proofs.

## V2 Hardening Features

### 1. Advanced ZK-Solvency Architecture
- **Protocol**: PLONK/Halo2 (Trusted Setup Free).
- **Privacy**: Proves `Assets - Liabilities > Threshold` without revealing raw values.
- **Security**: Uses DID-Anchored Nullifiers to prevent replay attacks and cross-institution tracking.
- **Witness**: Supports Firm-Signed Data Commitments.

### 2. Provider Agnosticism
- **Dynamic Registry**: Loads Issuer DIDs and jurisdictional metadata from environment variables or `keystore.json`.
- **Multi-Jurisdictional**: Supports simultaneous operation for multiple entities (e.g., Cayman, BVI, SG).

### 3. Integrated Risk Engine
- **5% Audit Roulette**: Cryptographically secure PRNG triggers a manual spot check for 5% of all verification events.
- **Immutable Logging**: Audit selection is logged as `AUDIT_SAMPLING_VERIFIED` in the compliance ledger.

### 4. Infrastructure Hardening
- **HSM Support**: Built-in driver for **AWS KMS** and **Azure Key Vault** (configurable via `HSM_PROVIDER`).
- **High-Availability Revocation**: Supports Redis-backed global revocation registry for real-time sanction propagation.

## Quick Start

### Prerequisites
- Node.js v18+
- Redis (optional, for high-availability revocation)
- AWS Credentials (optional, for HSM signing)

### Environment Configuration
Create a `.env` file:
```env
ISSUER_DIDS=did:web:csp.universal-bridge.io,did:web:fund-admin.example.com
HSM_PROVIDER=AWS_KMS (or LOCAL)
AWS_KMS_KEY_ID=alias/my-signing-key
REDIS_URL=redis://localhost:6379
STRICT_MODE=true
```

### Installation
```bash
npm install
```

### Running the Node
```bash
npm start
# Server listens on port 3000
```

## API Reference

### POST `/v1/passport/issue`
Issues a new Passport Credential.
- **Headers**: `x-issuer-did` (Required)
- **Body**: `{ legalName, assets, liabilities, zk_solvency: true/false, ... }`
- **Output**: Signed W3C Verifiable Credential (optional `zkSolvency` proof included).

### POST `/v1/passport/verify`
Verifies a Passport Credential.
- **Headers**: `x-jurisdiction` (Required, e.g. 'SG')
- **Body**: `{ credential: {...} }`
- **Output**: `{ verified: true, status: "ACTIVE" }` or `{ verified: false, reason: "ROULETTE_TRIGGER" }`

## Security Level: PRODUCTION CANDIDATE
This V2 release is designed for production pilots.
- **Key Management**: Use `HSM_PROVIDER=AWS_KMS` for FIPS 140-2 Level 3 security.
- **Audit**: All events are hash-chained in the Global Compliance Ledger.

---
© 2025 The Universal Bridge Protocol. All Rights Reserved.

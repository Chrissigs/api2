# Cayman Digital Reliance Framework

**The Enterprise Standard for Investor Warranty Verification and Automated Compliance.**

![License](https://img.shields.io/badge/license-Proprietary-red.svg)
![Version](https://img.shields.io/badge/version-2.0.0--ENTERPRISE-blue.svg)
![Status](https://img.shields.io/badge/status-Stable-green.svg)

## Overview

The **Cayman Digital Reliance Framework** is a multi-jurisdictional, firm-agnostic protocol designed to automate Anti-Money Laundering (AML) compliance and "Status Warranty" verification for the financial services industry.

This reference implementation provides a secure, audit-ready kernel for:
- **Rule-Based Compliance**: Dynamic validation of investor eligibility (e.g., Qualified Purchaser status) against Regulation 25 (Schedule 3) requirements.
- **Cryptographic Fairness**: Audit selection using a Cryptographically Secure Pseudo-Random Number Generator (CSPRNG) to ensure statistically fair and unpredictable regulatory audits.
- **Immutable Governance**: Tamper-evident logging of all compliance decisions and warranty events.

## Key Features

### 1. Polymorphic Compliance Kernel
The `ComplianceValidator` engine loads rule sets dynamically based on jurisdiction (e.g., Cayman Islands, Singapore VCC), allowing for rapid adaptation to regulatory changes without code deployments.

### 2. Audit Roulette Engine (CSPRNG)
To eliminate selection bias, the framework utilizes a Node.js native CSPRNG (`crypto.randomBytes`) to determine audit requirements.
- **Fairness**: Selection logic is `(Random_Value / Max_Int) < Threshold`.
- **Security**: 32-bytes of entropy ensure unpredictability, preventing "gaming" of the audit system.
- **Verifiability**: Every selection event generates a cryptographic proof logged in the audit trail.

### 3. Hardware Security Module (HSM) Support
The `KeyManager` service supports a "Bring Your Own Key" (BYOK) architecture, abstracting signing operations to support both local file-based keys (for development) and remote HSMs (AWS CloudHSM, Azure Key Vault) for production.

## Installation

```bash
git clone https://github.com/Chrissigs/api2.git
cd api2
npm install
```

## Usage

### Running the Compliance Validator
```bash
npm start
```

### Configuration
The framework is configured via JSON profiles in `config/`.
- `compliance/`: Regulatory schemas (e.g., `ky_reg25.json`).
- `tenant_profile.json`: Enterprise configuration (injected via deployment pipeline).

## Security

This codebase implements "Secure by Design" principles:
- **No Hardcoded Secrets**: All cryptographic keys and secrets must be injected via environment variables or HSM.
- **Fail-Closed Architecture**: Systems default to a "SUSPENDED" state if integrity checks fail.
- **Defense in Depth**: CSPRNG usage for all random-critical operations.

## License

Copyright (c) 2025 The Reliance Standards Body. All Rights Reserved.
Proprietary Source Code - For Authorized Reliance Network Members Only.

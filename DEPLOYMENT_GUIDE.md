# URK Generalization & Risk Engine - Deployment Guide

## Overview
This codebase contains the Universal Reliability Kernel (URK) "Project Passport", now generalized for firm-agnostic deployment. It supports "Jurisdictional Side-Loading" allowing any firm (Issuer) to deploy the kernel with their specific regulatory schemas and trust matrices.

## 1. Environment Configuration
The application is configured via environment variables.

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | API Port | `3000` |
| `ISSUER_DIDS` | Comma-separated list of Issuer DIDs to manage keys for | `did:web:compliance.firm-a.ky, did:web:compliance.firm-a.sg` |
| `HSM_PROVIDER` | `AWS_KMS` or `AZURE_VAULT` (Optional) | `AWS_KMS` |
| `REDIS_URL` | Redis Connection String for Revocation List (Optional) | `redis://localhost:6379` |

## 2. Jurisdictional Side-Loading
To support a new jurisdiction (e.g., Luxembourg), you do not need to modify the code.

### Step 1: Add Trust Matrix Entry
Update `data/trust_registry.json` to define which issuers are trusted by the new jurisdiction.
```json
"LUX": ["did:web:compliance.firm-a.lu", "did:web:compliance.firm-b.lu"]
```

### Step 2: Add Compliance Schema
Create a new JSON schema file in `data/schemas/{JURISDICTION_CODE}.json` (e.g., `data/schemas/LUX.json`).
This schema validates the `credentialSubject` of the Verifiable Credential.

**Example `LUX.json`:**
```json
{
    "description": "Luxembourg RAIF Requirements",
    "required": ["ConditionalAttributes"],
    "properties": {
        "ConditionalAttributes": {
            "type": "object",
            "required": ["SourceOfWealth"]
        }
    }
}
```

## 3. Risk Engine (Audit Roulette)
The system currently enforces a **5% Spot Check** probability on all verification requests (`/v1/passport/verify`).
- **Trigger**: Cryptographically secure PRNG (`crypto.randomInt`).
- **Response**: Returns `403 Forbidden` with reason `ROULETTE_TRIGGER`.
- **Action**: Administrators must check the `Global Compliance Ledger` for the generated `audit_ref`.

## 4. Security Infrastructure
- **HSM**: Configure `HSM_PROVIDER` to offload key management to AWS KMS or Azure KeyVault.
- **Revocation**: Configure `REDIS_URL` to enable high-availability revocation checking across all nodes.
- **Data Vault**: The `tenant_id` field in encryption packets allows for multi-tenant partitioning in S3/Blob Storage.

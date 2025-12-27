/**
 * UNIVERSAL RELIANCE KERNEL
 * Module: Universal Identity Circuit
 * Service: W3C Verifiable Credentials (VC)
 * Security Level: SOFTWARE PROTOTYPE (LOCAL KEYSTORE)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const HistoryService = require('./history_service');

const KEYSTORE_PATH = path.join(__dirname, '../../keystore.json');

const TRUST_REGISTRY_PATH = path.join(__dirname, '../../data/trust_registry.json');
let TRUST_MATRIX = {};

try {
    TRUST_MATRIX = JSON.parse(fs.readFileSync(TRUST_REGISTRY_PATH, 'utf8'));
} catch (e) {
    console.warn("Trust Registry not found or invalid, defaulting to empty.");
}

class VCService {

    constructor() {
        this.keys = {};
        this.ensureKeystore();
    }

    ensureKeystore() {
        // Define required personas via Environment Variables
        const issuersEnv = process.env.ISSUER_DIDS || '';
        const requiredPersonas = issuersEnv.split(',').filter(d => d.trim().length > 0);

        if (requiredPersonas.length === 0) {
            console.warn("[INIT] No ISSUER_DIDS defined in environment. Keystore may be empty.");
        }

        let keystore = {};
        if (fs.existsSync(KEYSTORE_PATH)) {
            try {
                keystore = JSON.parse(fs.readFileSync(KEYSTORE_PATH, 'utf8'));
            } catch (e) {
                console.error("Corrupt keystore, creating fresh one.");
            }
        }

        let updated = false;
        for (const did of requiredPersonas) {
            const cleanDid = did.trim();
            if (!keystore[cleanDid]) {
                console.log(`[INIT] Generating Ed25519 keys for ${cleanDid}...`);
                const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
                    modulusLength: 4096,
                    publicKeyEncoding: { type: 'spki', format: 'pem' },
                    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
                });
                keystore[cleanDid] = { privateKey, publicKey };
                updated = true;
            }
        }

        if (updated) {
            fs.writeFileSync(KEYSTORE_PATH, JSON.stringify(keystore, null, 2));
        }

        this.keys = keystore;
    }

    /**
     * Issues a Sovereign Passport Credential.
     * @param {object} kycData - The validated KYC data.
     * @param {string} issuerDid - The DID of the issuing branch (e.g. did:web:compliance.walkers.sg).
     * @param {object} jurisdictionMetadata - Specific regulatory metadata.
     * @param {boolean} generateZkProof - Whether to generate a ZK Solvency Proof.
     */
    async issuePassport(kycData, issuerDid, jurisdictionMetadata = {}, generateZkProof = false) {
        if (!this.keys[issuerDid]) {
            throw new Error(`Issuer DID ${issuerDid} not found in keystore.`);
        }

        // 1. Log to Global Compliance Ledger
        const auditHash = await HistoryService.logEvent('ISSUANCE_ATTEMPT', {
            issuer: issuerDid,
            subject: kycData.legalName
        }, issuerDid.split('.').pop().toUpperCase()); // e.g. SG, KY

        // 2. Prepare Firm-Signed Witness if ZK is requested
        let zkProofData = null;
        if (generateZkProof) {
            const witness = {
                assets: kycData.assets || 2000000, // Default mock value if not present
                liabilities: kycData.liabilities || 100000,
                threshold: 1000000, // Hardcoded standard for demo
                subject_did: kycData.did || `did:example:${crypto.randomUUID()}`,
                salt: crypto.randomBytes(32).toString('hex'), // In real-world, user provides this
                issuer_did: issuerDid,
                signature: 'firm-signed-commitment-mock'
            };
            const ZkService = require('./zk_service');
            zkProofData = await ZkService.generateSolvencyProof(witness, 'TIER_1M');
        }

        // 3. Construct the W3C Credential
        // Selective Disclosure: Filter fields if disclosureRequest is present
        const subjectData = {
            "id": kycData.did || `did:example:${crypto.randomUUID()}`, // Strict Identity Linkage
            "legalName": kycData.legalName,
            "complianceLevel": "GOLD",
            "trustScore": 99,
            ...jurisdictionMetadata
        };

        // If disclosureRequest exists (array of keys), only keep those keys + mandatory ones
        if (kycData.disclosureRequest && Array.isArray(kycData.disclosureRequest)) {
            const allowed = new Set(['id', 'trustScore', 'complianceLevel', ...kycData.disclosureRequest]);
            for (const key of Object.keys(subjectData)) {
                if (!allowed.has(key)) {
                    delete subjectData[key];
                }
            }
        }

        const credential = {
            "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://w3id.org/security/suites/ed25519-2020/v1"
            ],
            "id": `urn:uuid:${crypto.randomUUID()}`,
            "type": ["VerifiableCredential", "GlobalPassport"],
            "issuer": issuerDid,
            "issuanceDate": new Date().toISOString(),
            "credentialSubject": subjectData,
            "evidence": [{
                "id": `urn:ledger:${auditHash}`,
                "type": "ComplianceAuditRecord",
                "verifier": issuerDid
            }]
        };

        if (zkProofData) {
            credential.credentialSubject.zkSolvency = {
                proof: zkProofData.proof,
                publicSignals: zkProofData.publicSignals
            };
        }

        // 4. Sign the Credential (Ed25519)
        // Ed25519 does not use a pre-hash digest (e.g. SHA256), so we pass null as the algorithm.
        const dataBuffer = Buffer.from(JSON.stringify(credential));
        const signatureBuffer = crypto.sign(null, dataBuffer, this.keys[issuerDid].privateKey);
        const signature = signatureBuffer.toString('hex');

        // Attach proof
        credential.proof = {
            "type": "Ed25519Signature2020",
            "created": new Date().toISOString(),
            "verificationMethod": `${issuerDid}#key-1`,
            "proofPurpose": "assertionMethod",
            "proofValue": signature
        };

        console.log(`[ISSUER] Credential issued by ${issuerDid} for ${kycData.legalName}`);
        return credential;
    }

    /**
     * Verifies a credential against a relying jurisdiction's requirements.
     * @param {object} credential - The VC to verify.
     * @param {string} verifierJurisdiction - The jurisdiction code (e.g. 'SG', 'UAE').
     */
    async verify(credential, verifierJurisdiction) {
        const issuerDid = credential.issuer;

        // 1. Trust Matrix Check
        const trustedIssuers = TRUST_MATRIX[verifierJurisdiction] || [];
        const isTrusted = trustedIssuers.includes('*') || trustedIssuers.includes(issuerDid);

        if (!isTrusted) {
            console.warn(`[VERIFY] REJECTED: Issuer ${issuerDid} not trusted by ${verifierJurisdiction}`);
            return { verified: false, reason: `Issuer not trusted in ${verifierJurisdiction}` };
        }

        // 2. Dynamic Schema Validation
        const schemaValidation = this.validateSchema(credential, verifierJurisdiction);
        if (!schemaValidation.valid) {
            console.warn(`[VERIFY] REJECTED: Schema mismatch for ${verifierJurisdiction}: ${schemaValidation.error}`);
            return { verified: false, reason: `Schema mismatch: ${schemaValidation.error}` };
        }

        // 3. Cryptographic Verification
        if (!this.keys[issuerDid]) {
            // In real world, we fetch DID Doc. Here we check local keystore.
            return { verified: false, reason: "Issuer Unknown (Key not found)" };
        }

        const publicKey = this.keys[issuerDid].publicKey;

        // Detach proof for verification
        const proofValue = credential.proof.proofValue;
        const credentialCopy = { ...credential };
        delete credentialCopy.proof; // Remove proof to verify the original payload

        const verifyBuffer = Buffer.from(JSON.stringify(credentialCopy));
        const isSignatureValid = crypto.verify(
            null,
            verifyBuffer,
            publicKey,
            Buffer.from(proofValue, 'hex')
        );

        if (!isSignatureValid) {
            console.warn(`[VERIFY] REJECTED: Invalid Signature for ${credential.id}`);
            return { verified: false, reason: "Cryptographic signature invalid" };
        }

        // 3. Log Verification Event
        await HistoryService.logEvent('VERIFICATION', {
            credential_id: credential.id,
            verifier: verifierJurisdiction,
            result: 'SUCCESS'
        }, verifierJurisdiction);

        console.log(`[VERIFY] SUCCESS: Credential verified by ${verifierJurisdiction}`);
        return {
            verified: true,
            status: "ACTIVE",
            issuer: issuerDid,
            trust_score: credential.credentialSubject.trustScore
        };
    }

    validateSchema(credential, jurisdiction) {
        const schemaPath = path.join(__dirname, `../../data/schemas/${jurisdiction}.json`);

        if (!fs.existsSync(schemaPath)) {
            // No specific schema found for jurisdiction, assume generic valid
            return { valid: true };
        }

        try {
            const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
            const subject = credential.credentialSubject;

            // Simple check for required top-level properties in credentialSubject
            if (schema.required) {
                for (const field of schema.required) {
                    if (!subject[field]) {
                        return { valid: false, error: `Missing required field: ${field}` };
                    }
                }
            }

            // Check nested properties if defined
            if (schema.properties) {
                for (const [key, rules] of Object.entries(schema.properties)) {
                    if (subject[key] && rules.required) {
                        for (const subField of rules.required) {
                            if (!subject[key][subField]) {
                                return { valid: false, error: `Missing required sub-field: ${key}.${subField}` };
                            }
                        }
                    }
                }
            }

            return { valid: true };
        } catch (e) {
            console.error(`[SCHEMA] Error validating against ${jurisdiction}:`, e);
            return { valid: false, error: "Schema validation error" };
        }
    }
}

module.exports = new VCService();

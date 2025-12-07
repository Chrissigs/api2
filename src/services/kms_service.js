const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Key Management Service (KMS) Abstraction Layer
 * 
 * In a production environment, this service would interface with:
 * - AWS KMS
 * - HashiCorp Vault
 * - Cloud HSM
 * 
 * For this PC-1 implementation, it simulates a secure enclave by:
 * 1. Loading keys ONLY at initialization (or lazily).
 * 3. Delegating signing to `KeyManager`.
 */
const { getKeyManager } = require('./key_manager');

class KMSService {
    constructor() {
        this.initialized = false;
        this.keyManager = null;
        this.keyId = 'alias/bank-signing-key-01'; // Simulated Key ID
    }

    /**
     * Initialize the KMS connection.
     * In a real scenario, this might authenticate with AWS/Vault.
     * Here, we load the key from the certs directory into "secure memory".
     */
    initialize() {
        if (this.initialized) return;

        try {
            this.keyManager = getKeyManager();
            console.log('[KMS] Initialized via KeyManager.');
            this.initialized = true;
        } catch (error) {
            console.error('[KMS] CRITICAL: Failed to initialize KeyManager.', error);
            throw new Error('KMS_INIT_FAILURE');
        }
    }

    /**
     * Cryptographically signs data using the Bank's private key.
     * @param {object|string} payload - The data to sign.
     * @returns {string} - The JWT or signature.
     */
    signJWT(payload, options = {}) {
        if (!this.initialized) this.initialize();

        const jwt = require('jsonwebtoken');
        // RS256 is standard for JWT signing with RSA keys

        let signingKey;
        if (this.keyManager.constructor.name === 'FileKeyManager') {
            signingKey = this.keyManager.privateKey;
        } else {
            console.warn('[KMS] HSM detected, manual JWT signing (Mock)...');
            return this._manualHSMJwt(payload, options);
        }

        const token = jwt.sign(payload, signingKey, {
            algorithm: 'RS256',
            ...options
        });
        return token;
    }

    _manualHSMJwt(payload, options) {
        // Construct JWT Manually: Header.Payload.Signature
        const header = { alg: 'HS256', typ: 'JWT', kid: this.keyId };
        const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
        const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');

        const dataToSign = `${b64Header}.${b64Payload}`;
        const signature = this.keyManager.sign(dataToSign);
        const b64Signature = Buffer.from(signature, 'hex').toString('base64url');

        return `${dataToSign}.${b64Signature}`;
    }

    /**
     * Generic sign method for raw data (if needed).
     * @param {string} data 
     */
    signData(data) {
        if (!this.initialized) this.initialize();
        return this.keyManager.sign(data);
    }
}

module.exports = new KMSService();

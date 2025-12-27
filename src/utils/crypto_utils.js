const crypto = require('crypto');
const fs = require('fs');
const env = require('../config/env');

class CryptoUtils {
    constructor() {
        this.privateKey = null;
        this.publicKey = null;
        this.initKeys();
    }

    initKeys() {
        if (process.env.NODE_ENV === 'production') {
            if (env.HSM_PROVIDER !== 'AWS_KMS') {
                throw new Error("SECURITY FAULT: Production mode requires HSM_PROVIDER=AWS_KMS for FIPS 140-2 Level 3 compliance.");
            }
        }

        if (env.HSM_PROVIDER === 'AWS_KMS') {
            try {
                const { KMSClient, SignCommand } = require('@aws-sdk/client-kms');
                this.kmsClient = new KMSClient({ region: env.AWS_REGION || 'us-east-1' });
                this.keyId = env.AWS_KMS_KEY_ID;
                if (!this.keyId) throw new Error("AWS_KMS_KEY_ID is missing.");
                console.log(`[Crypto] AWS KMS Client initialized for Key ID: ${this.keyId} (FIPS 140-2 L3)`);
            } catch (e) {
                console.error("[Crypto] Failed to load AWS SDK or connect to KMS.", e);
                throw e; // Fail hard
            }
            return;
        }

        if (env.HSM_PROVIDER === 'AZURE_VAULT') {
            console.log(`[Crypto] Using HSM Provider: AZURE_VAULT`);
            // Initialize Azure KeyVault Client
            // this.credential = new DefaultAzureCredential();
            // this.keyClient = new KeyClient(env.AZURE_VAULT_URL, this.credential);
            return;
        }

        // Check for local keystore
        if (fs.existsSync(env.KEYSTORE_PATH)) {
            try {
                const keyData = JSON.parse(fs.readFileSync(env.KEYSTORE_PATH, 'utf-8'));
                this.privateKey = crypto.createPrivateKey(keyData.privateKey);
                this.publicKey = crypto.createPublicKey(keyData.publicKey);
                console.log('[Crypto] Loaded persistent local keys.');
            } catch (e) {
                console.error('[Crypto] Failed to load keys.', e);
                // In production, do NOT generate new keys if corrupt => Fail Closed
                if (process.env.NODE_ENV === 'production') throw e;
                this.generateAndSaveKeys();
            }
        } else {
            if (process.env.NODE_ENV === 'production') {
                throw new Error("SECURITY FAULT: No keystore found and local generation disabled in Production.");
            }
            console.log('[Crypto] No keystore found. Generating new keys.');
            this.generateAndSaveKeys();
        }
    }

    generateAndSaveKeys() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error("SECURITY VIOLATION: Attempted to generate local keys in Production environment.");
        }
        const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
        this.privateKey = privateKey;
        this.publicKey = publicKey;

        const exportData = {
            privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
            publicKey: publicKey.export({ type: 'spki', format: 'pem' })
        };

        // Ensure directory exists
        if (!fs.existsSync(env.DATA_DIR)) {
            fs.mkdirSync(env.DATA_DIR, { recursive: true });
        }

        fs.writeFileSync(env.KEYSTORE_PATH, JSON.stringify(exportData, null, 2), { mode: 0o600 }); // Secure permissions
        console.log('[Crypto] New keys generated and saved to keystore.');
    }

    async sign(data) {
        if (env.HSM_PROVIDER === 'AWS_KMS') {
            const { SignCommand } = require('@aws-sdk/client-kms');
            const command = new SignCommand({
                KeyId: this.keyId,
                Message: data,
                MessageType: 'RAW',
                SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256'
            });
            const response = await this.kmsClient.send(command);
            // Returns a Uint8Array, convert to hex or signature format as expected
            return Buffer.from(response.Signature).toString('hex');
        }

        if (env.HSM_PROVIDER === 'AZURE_VAULT') {
            // const keyInfo = await this.keyClient.getKey(env.AZURE_KEY_NAME);
            // const result = await this.cryptoClient.sign("RS256", data);
            // return result.signature;
            throw new Error("AZURE_VAULT Signing not fully implemented in this environment.");
        }

        if (!this.privateKey) throw new Error("Private Key not initialized");
        return crypto.sign(null, data, this.privateKey);
    }

    verify(data, signature, publicKeyPem) {
        // If no specific key provided, use our local public key (Self-Verification)
        const key = publicKeyPem ? crypto.createPublicKey(publicKeyPem) : this.publicKey;
        if (!key) throw new Error("No Public Key available for verification");

        return crypto.verify(null, data, key, signature);
    }

    getPublicKeyPem() {
        return this.publicKey.export({ type: 'spki', format: 'pem' });
    }
}

module.exports = new CryptoUtils();

/**
 * CAYMAN DIGITAL RELIANCE FRAMEWORK
 * Service: Key Management (HSM / File)
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

class IKeyManager {
    sign(data) { throw new Error('Not Implemented'); }
    getPublicKey() { throw new Error('Not Implemented'); }
}

class FileKeyManager extends IKeyManager {
    constructor(privateKeyPath) {
        super();
        this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
        // Derive public key from private key
        this.publicKey = crypto.createPublicKey(this.privateKey).export({ type: 'spki', format: 'pem' });
    }

    sign(data) {
        const sign = crypto.createSign('SHA256');
        sign.update(data);
        sign.end();
        return sign.sign(this.privateKey, 'hex');
    }

    getPublicKey() {
        return this.publicKey;
    }
}

class HSMKeyManager extends IKeyManager {
    constructor(config) {
        super();
        this.config = config;
        console.log('[HSM] Initialized with config:', config.provider);
    }

    sign(data) {
        // Stub for AWS CloudHSM / Azure KeyVault
        console.log('[HSM] Signing with Hardware Security Module...');
        // Simulate remote signing
        const hmac = crypto.createHmac('sha256', 'HSM_SECRET');
        hmac.update(data);
        return hmac.digest('hex'); // Mock signature
    }

    getPublicKey() {
        return "-----BEGIN PUBLIC KEY-----\nMOCK_HSM_PUBLIC_KEY\n-----END PUBLIC KEY-----";
    }
}

function getKeyManager() {
    if (process.env.USE_HSM === 'true') {
        return new HSMKeyManager({ provider: process.env.HSM_PROVIDER || 'AWS' });
    } else {
        // Default to local generic key for devs
        const keyPath = path.join(__dirname, '../../client-key.pem');
        // Ensure file exists, else generate one?
        if (!fs.existsSync(keyPath)) {
            // Check if mock key is available or generate on fly?
            // For now assume user has client-key.pem as per previous usage
            // Or return Error?
            // Let's create a temp one if missing for robustness in V2 refactor
            const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
                modulusLength: 2048,
            });
            fs.writeFileSync(keyPath, privateKey.export({ type: 'pkcs1', format: 'pem' }));
            fs.writeFileSync(path.join(__dirname, '../../client-cert.pem'), publicKey.export({ type: 'spki', format: 'pem' }));
        }
        return new FileKeyManager(keyPath);
    }
}

module.exports = { getKeyManager, FileKeyManager, HSMKeyManager };

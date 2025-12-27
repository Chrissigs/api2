const fs = require('fs');
const path = require('path');

/**
 * Provider Registry - Manages Dynamic Issuer Configurations
 * Loads issuer DIDs and metadata from environment or configuration files.
 */
class ProviderRegistry {
    constructor() {
        this.providers = new Map();
        this.loadProviders();
    }

    loadProviders() {
        // 1. Load from Environment Variables (Priority)
        const envIssuers = process.env.ISSUER_DIDS ? process.env.ISSUER_DIDS.split(',') : [];

        envIssuers.forEach(did => {
            const cleanDid = did.trim();
            if (cleanDid) {
                this.providers.set(cleanDid, {
                    id: cleanDid,
                    name: this._deriveName(cleanDid),
                    tier: 'TIER_1', // Default
                    jurisdiction: cleanDid.split('.').pop().toUpperCase()
                });
            }
        });

        // 2. Load from Keystore (Fallback/Supplement)
        const KEYSTORE_PATH = path.join(__dirname, '../../keystore.json');
        if (fs.existsSync(KEYSTORE_PATH)) {
            try {
                const keystore = JSON.parse(fs.readFileSync(KEYSTORE_PATH, 'utf8'));
                Object.keys(keystore).forEach(did => {
                    if (!this.providers.has(did)) {
                        this.providers.set(did, {
                            id: did,
                            name: this._deriveName(did),
                            tier: 'TIER_1',
                            jurisdiction: did.split('.').pop().toUpperCase()
                        });
                    }
                });
            } catch (e) {
                console.warn("Failed to load providers from keystore:", e.message);
            }
        }

        console.log(`[REGISTRY] Loaded ${this.providers.size} providers.`);
    }

    getProvider(id) {
        return this.providers.get(id);
    }

    getAllProviders() {
        return Array.from(this.providers.values());
    }

    _deriveName(did) {
        // did:web:compliance.firm-a.sg -> Firm A SG
        // did:web:universal-bridge.io -> Universal Bridge
        try {
            const parts = did.replace('did:web:', '').split('.');
            if (parts.length >= 2) {
                // Check if second to last is jurisdiction (e.g. walkers.sg)
                const namePart = parts[parts.length - 2];
                return namePart.charAt(0).toUpperCase() + namePart.slice(1);
            }
            return did;
        } catch (e) {
            return did;
        }
    }
}

module.exports = new ProviderRegistry();

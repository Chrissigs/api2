const fs = require('fs');
const env = require('../config/env');

// Ensure data directory exists
if (!fs.existsSync(env.DATA_DIR)) {
    fs.mkdirSync(env.DATA_DIR, { recursive: true });
}

class RevocationService {
    constructor() {
        this.registry = {};
        this.redisClient = null;
        this.useRedis = false;

        if (process.env.REDIS_URL) {
            this.initRedis();
        } else {
            console.log('[Revocation] No REDIS_URL found. Using local file storage.');
            this.loadRegistry();
        }
    }

    async initRedis() {
        try {
            const redis = require('redis');
            this.redisClient = redis.createClient({ url: process.env.REDIS_URL });
            this.redisClient.on('error', (err) => console.error('[Redis] Client Error', err));
            await this.redisClient.connect();
            this.useRedis = true;
            console.log('[Revocation] Connected to Redis for Global Revocation List.');
        } catch (e) {
            console.error('[Revocation] Failed to connect to Redis, falling back to local file.', e);
            this.loadRegistry();
        }
    }

    loadRegistry() {
        try {
            if (fs.existsSync(env.REVOCATION_PATH)) {
                const data = fs.readFileSync(env.REVOCATION_PATH, 'utf-8');
                this.registry = JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to load revocation registry:', e);
            this.registry = {};
        }
    }

    saveRegistry() {
        try {
            fs.writeFileSync(env.REVOCATION_PATH, JSON.stringify(this.registry, null, 2));
        } catch (e) {
            console.error('Failed to save revocation registry:', e);
        }
    }

    async isRevoked(id) {
        if (this.useRedis) {
            const reason = await this.redisClient.get(`revoked:${id}`);
            return !!reason;
        }
        return !!this.registry[id];
    }

    async getRevocationReason(id) {
        if (this.useRedis) {
            const reason = await this.redisClient.get(`revoked:${id}`);
            return reason || null;
        }
        return this.registry[id] || null;
    }

    async revokeCredential(id, reason = "UNSPECIFIED") {
        if (this.useRedis) {
            // Set with no expiration (permanent revocation)
            await this.redisClient.set(`revoked:${id}`, reason);
            // Also update local cache/file for backup
            this.registry[id] = reason;
            // We don't save to file every time to avoid IO lag, but maybe we should for persistence?
            // For now, Redis is primary.
        } else {
            this.registry[id] = reason;
            this.saveRegistry();
        }
        return true;
    }
}

module.exports = new RevocationService();

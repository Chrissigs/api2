/**
 * Hash Chained Logger (Audit Trail)
 */
const crypto = require('crypto');

class HashChainedLogger {
    constructor() {
        this.chain = [];
    }

    sanitize(data) {
        // Deep copy
        const clean = JSON.parse(JSON.stringify(data));

        // Redact specific fields
        if (clean.warranty_token) clean.warranty_token = '[REDACTED]';
        if (clean.shard_a) clean.shard_a = '[REDACTED]';

        // Hash PII
        if (clean.Nm && clean.Nm.FrstNm) {
            clean.Nm.FrstNm = crypto.createHash('sha256').update(clean.Nm.FrstNm).digest('hex');
        }
        if (clean.DtOfBirth) {
            clean.DtOfBirth = crypto.createHash('sha256').update(clean.DtOfBirth).digest('hex');
        }

        return clean;
    }
}

module.exports = { HashChainedLogger };

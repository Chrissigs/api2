const crypto = require('crypto');

class AuditService {
    /**
     * Determines if a request should trigger an audit based on a cryptographically secure random number.
     * Target pivot: exactly 5%.
     * @returns {boolean}
     */
    /**
     * Determines if a request should trigger an audit based on trust score and a CSPRNG.
     * Base Probability: 5%.
     * High Risk (Score < 80): 10%.
     * Critical Risk (Score < 50): 20%.
     * @param {number} trustScore - The trust score of the issuer (0-100).
     * @returns {boolean}
     */
    shouldTriggerAudit(trustScore = 100) {
        let threshold = 5; // Default 5%

        if (trustScore < 50) {
            threshold = 20;
        } else if (trustScore < 80) {
            threshold = 10;
        }

        // Generate a random integer between 0 (inclusive) and 100 (exclusive)
        const randomValue = crypto.randomInt(0, 100);

        // Return true if value is less than threshold
        // e.g. threshold 5 => 0,1,2,3,4 => 5%
        return randomValue < threshold;
    }
}

module.exports = new AuditService();

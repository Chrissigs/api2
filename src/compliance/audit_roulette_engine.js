/**
 * CAYMAN DIGITAL RELIANCE FRAMEWORK
 * Module: Audit Roulette Engine
 * 
 * Cryptographically Secure Pseudo-Random Number Generator (CSPRNG)
 * for regulatory audit selection.
 * 
 * Replaces deterministic VRF with Node.js native crypto.randomBytes
 * to ensure true entropy and prevent prediction of audit targets.
 */

const crypto = require('crypto');

class AuditRouletteEngine {

    /**
     * Selects whether an audit is required based on a cryptographically secure random value.
     * 
     * Logic:
     * Generates a random 32-bit unsigned integer.
     * Checks if (Random_Value / Max_Value) < Threshold.
     * 
     * @param {number} probability - Probability of selection (0.0 to 1.0). Default 0.015 (1.5%).
     * @returns {object} { selected: boolean, proof: string (hex) }
     */
    selectForAudit(probability = 0.015) {
        // 1. Generate 4 bytes of entropy (32-bit integer)
        const buffer = crypto.randomBytes(4);
        const randomValue = buffer.readUInt32BE(0);

        // 2. Define the maximum possible value for a 32-bit unsigned integer
        const MAX_UINT32 = 0xFFFFFFFF;

        // 3. Calculate the threshold value
        const threshold = MAX_UINT32 * probability;

        // 4. Determine selection
        const isSelected = randomValue < threshold;

        // 5. Generate a proof (the random seed used, hashed for safety in logs if needed, 
        // but here we return the hex of the random bytes as the direct proof of the draw)
        // We also generate a longer seed to log as "entropy_proof" if needed for deeper audits,
        // but the decision comes from the 4 bytes. 
        // Let's generate a separate 32-byte salt for the log proof to ensure uniqueness 
        // and link it to this specific decision event.
        const proofId = crypto.randomBytes(16).toString('hex');

        return {
            selected: isSelected,
            entropy_hex: buffer.toString('hex'),
            proof_id: proofId,
            probability_setting: probability
        };
    }
}

module.exports = new AuditRouletteEngine();

/**
 * ANTIGRAVITY CORE v2.0
 * Module: Polymorphic Compliance Kernel
 * 
 * Generic compliance engine that loads rules dynamically based on jurisdiction.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ComplianceValidator {

    constructor() {
        this.rulesCache = {};
        this.configPath = path.join(__dirname, '../../config/compliance');
    }

    /**
     * Loads compliance rules for a specific jurisdiction.
     * @param {string} ruleSetId - e.g., 'KY', 'SG_VCC'
     */
    getRules(ruleSetId) {
        if (this.rulesCache[ruleSetId]) {
            return this.rulesCache[ruleSetId];
        }

        const filePath = path.join(this.configPath, `${ruleSetId.toLowerCase()}_reg25.json`); // Naming convention?
        // Let's assume the file name mapping is handled or they are directly named.
        // For now, I'll try to find the file that matches or just use the ID if we name files nicely.
        // Actually, let's look for known files.
        // My task said I created `ky_reg25.json`.
        // I should probably standarize the filenames to `ky_reg25` or just `ky`.
        // Let's assume the input ID might be 'KY' and map it to `ky_reg25.json`.

        let filename;
        if (ruleSetId === 'KY') filename = 'ky_reg25.json';
        else filename = `${ruleSetId.toLowerCase()}.json`;

        const fullPath = path.join(this.configPath, filename);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`Compliance rules not found for ID: ${ruleSetId}`);
        }

        const rules = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        this.rulesCache[ruleSetId] = rules;
        return rules;
    }

    /**
     * Verifies if a counterparty meets the requirements of the jurisdiction.
     * @param {object} investorProfile 
     * @param {string} ruleSetId - Defaults to 'KY' for backward compatibility
     */
    validate(investorProfile, ruleSetId = 'KY') {
        const rules = this.getRules(ruleSetId);
        const reqs = rules.requirements;

        // Check 1: Jurisdiction Allow-list
        if (reqs.allowed_jurisdictions && !reqs.allowed_jurisdictions.includes(investorProfile.jurisdiction)) {
            return { eligible: false, reason: 'RESTRICTED_JURISDICTION' };
        }

        // Check 2: Investment Threshold
        const investmentAmount = investorProfile.investment_amount || 0;
        const meetsThreshold = reqs.minimum_investment !== undefined && investmentAmount >= reqs.minimum_investment;

        // Check 3: Regulatory Status / Backup
        // If they meet the threshold, they are eligible (e.g. QP).
        // If not, they must be a Regulated Entity (legacy check `is_regulated`).

        if (!meetsThreshold) {
            if (!investorProfile.is_regulated) {
                return { eligible: false, reason: 'INSUFFICIENT_INVESTMENT_AND_NOT_REGULATED' };
            }
        }

        return {
            eligible: true,
            status: meetsThreshold ? 'QUALIFIED_THRESHOLD_MET' : 'REGULATED_ENTITY_PASSPORTED',
            jurisdiction_rule: rules.jurisdiction_id
        };
    }

    /**
     * Verifiable Random Function (VRF) for Regulatory Audit Selection
     */
    verifyAuditSelection(seed, ruleSetId = 'KY') {
        const rules = this.getRules(ruleSetId);
        const probability = rules.requirements.vrf_probability || 0.015;

        // VRF Simulation
        const vrfKey = 'GLOBAL_COMPLIANCE_VRF_SECRET'; // In prod, use HSM
        const hmac = crypto.createHmac('sha256', vrfKey);
        hmac.update(seed);
        const proof = hmac.digest('hex');

        // Deterministic Sampling
        const value = parseInt(proof.substring(0, 8), 16);
        const threshold = 0xFFFFFFFF * probability;

        return {
            audit_required: value < threshold,
            proof: proof
        };
    }
}

const validator = new ComplianceValidator();
module.exports = validator;

// Helper to run self-test if called directly
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.includes('--test')) {
        console.log('Running ComplianceValidator Self-Test...');
        try {
            const rules = validator.getRules('KY');
            console.log('Loaded KY Rules:', rules.name);
            const result = validator.validate({ jurisdiction: 'KY', investment_amount: 6000000 }, 'KY');
            console.log('Validation Result (QP):', result);
            if (result.eligible && result.status === 'QUALIFIED_THRESHOLD_MET') {
                console.log('SELF-TEST PASSED');
                process.exit(0);
            } else {
                console.error('SELF-TEST FAILED');
                process.exit(1);
            }
        } catch (err) {
            console.error('SELF-TEST ERROR:', err);
            process.exit(1);
        }
    }
}

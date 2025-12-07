/**
 * Basic ISO 20022 Validator
 */
const crypto = require('crypto');

function validatePayload(payload) {
    // Basic structural check
    if (!payload.header || !payload.investor_profile || !payload.compliance_warranty) {
        return { valid: false, error: 'Missing required sections' };
    }

    const profile = payload.investor_profile;

    // Check TaxRes (Required)
    if (!profile.TaxRes || !Array.isArray(profile.TaxRes) || profile.TaxRes.length === 0) {
        return { valid: false, error: 'TaxRes required and must be non-empty array' };
    }

    // Check individual items if needed (optional for this mock)
    // ...

    return { valid: true };
}

module.exports = { validatePayload };

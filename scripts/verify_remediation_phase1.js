const compliance = require('../src/compliance/compliance_validator');
const kmsService = require('../src/services/kms_service');
const assert = require('assert');

console.log('--- Phase 1 Verification ---');

// 1. Verify Entropy
console.log('[TEST] Verifying Entropy Upgrade...');
let audits = 0;
const ITERATIONS = 10000;
for (let i = 0; i < ITERATIONS; i++) {
    const result = compliance.verifyAuditSelection('seed_' + i, 'KY');
    if (result.audit_required) {
        audits++;
    }
}
console.log(`[INFO] Audit Frequency: ${audits}/${ITERATIONS} (${(audits / ITERATIONS) * 100}%)`);
// Expect roughly 1.5%
assert.ok(audits > 0, 'Audit should trigger occasionally');
assert.ok(audits < 300, 'Audit should not trigger too often');
console.log('[PASS] Entropy check passed.');

// 2. Verify KMS Service
console.log('[TEST] Verifying KMS Service...');
kmsService.initialize();
const payload = { test: 'data' };
const token = kmsService.signJWT(payload, { expiresIn: '1h' });
console.log('[INFO] Generated Token:', token);
assert.ok(token.split('.').length === 3, 'Token should be a valid JWT');
console.log('[PASS] KMS Service signing passed.');

console.log('--- Phase 1 Verification Complete ---');

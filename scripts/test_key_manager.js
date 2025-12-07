const kms = require('../src/services/kms_service');
const assert = require('assert');

console.log('=== KEY MANAGER & KMS TEST SUITE ===');

async function testFileMode() {
    console.log('[TEST 1] File-based Key Manager (Legacy)');
    // Default mode
    process.env.USE_HSM = 'false';
    const { getKeyManager } = require('../src/services/key_manager');
    const mgr = getKeyManager();

    assert.strictEqual(mgr.constructor.name, 'FileKeyManager');
    console.log('   > Loader: FileKeyManager');

    kms.initialized = false;
    kms.keyManager = null; // Reset

    const token = kms.signJWT({ test: 'file' });
    console.log('   > Token:', token.substring(0, 30) + '...');

    assert.strictEqual(token.split('.').length, 3);
    console.log('[PASS] File-based signing successful.');
}

async function testHSMMode() {
    console.log('\n[TEST 2] HSM-based Key Manager (Cloud Native)');
    process.env.USE_HSM = 'true';

    // Clear cache to reload module config logic? 
    // Actually getKeyManager reads env var every call, but KMS initializes once.
    // We need to reset KMS.
    kms.initialized = false;
    kms.keyManager = null;

    const token = kms.signJWT({ test: 'hsm' });
    console.log('   > Token:', token.substring(0, 30) + '...');

    // Check header for 'alg': 'HS256' (our mock) vs RS256
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
    assert.strictEqual(header.alg, 'HS256', 'Mock HSM uses HS256 manual construction');

    console.log('[PASS] HSM-based signing successful.');
}

(async () => {
    try {
        await testFileMode();
        await testHSMMode();
        console.log('\n---------------------------------------------------');
        console.log('ALL KEY MANAGER TESTS PASSED.');
    } catch (err) {
        console.error('\n[FAIL] Test Failed:', err);
        process.exit(1);
    }
})();

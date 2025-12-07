const zkService = require('../src/services/zk_service');
const vcService = require('../src/services/vc_service');
const assert = require('assert');

console.log('=== IDENTITY & VC TEST SUITE ===');

async function testZK() {
    console.log('[TEST 1] ZK Generic Identity Circuit');

    const claims = [
        "John Doe",
        "1980-01-01",
        "US",
        "123-456-789"
    ];
    const salt = "RANDOM_SALT_123";

    console.log('1. Generating Proof for claims vector...');
    const result = await zkService.generateProof(claims, salt);

    console.log('   > Proof Status:', result.proof.status);
    console.log('   > Commitment:', result.publicSignals[0].substring(0, 32) + '...');

    assert.strictEqual(result.proof.status, 'VALID_SIMULATION');
    assert.ok(result.publicSignals[0]);

    console.log('2. Verifying Proof...');
    const isValid = await zkService.verifyProof(result.proof, result.publicSignals);
    assert.strictEqual(isValid, true);
    console.log('   > Verification Passed.');
    console.log('[PASS] ZK Logic verified.');
}

async function testVC() {
    console.log('\n[TEST 2] W3C DID Verifiable Credentials');

    const subject = "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK";
    const issuer = "did:web:antigravity.finance";
    const claims = {
        "name": "Jane Doe",
        "degree": "PhD in Computer Science",
        "clearance": "Top Secret"
    };

    console.log('1. Issuing VC...');
    const vc = await vcService.createCredential(subject, issuer, claims);

    console.log('   > Type:', vc.type.join(', '));
    console.log('   > Issuer:', vc.issuer);

    assert.strictEqual(vc.issuer, issuer);
    assert.strictEqual(vc.credentialSubject.id, subject);

    console.log('2. Verifying VC...');
    const isValid = await vcService.verifyCredential(vc);
    assert.strictEqual(isValid, true);
    console.log('   > Verification Passed.');
    console.log('[PASS] VC Logic verified.');
}

(async () => {
    try {
        await testZK();
        await testVC();
        console.log('\n---------------------------------------------------');
        console.log('ALL IDENTITY TESTS PASSED.');
    } catch (err) {
        console.error('\n[FAIL] Test Failed:', err);
        process.exit(1);
    }
})();

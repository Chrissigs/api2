const dataVault = require('../src/services/data_vault');
const assert = require('assert');

console.log('--- Phase 2 Verification ---');

async function verifyDataVault() {
    // 1. Test Upload
    console.log('[TEST] Verifying Data Vault Upload...');
    const payload = JSON.stringify({ secret: 'identity_data' });
    const metadata = { bank_id: 'BANK_TEST_01', timestamp: new Date().toISOString() };

    const packetRef = await dataVault.uploadPacket(payload, metadata);
    console.log('[INFO] Packet Reference:', packetRef);
    assert.ok(packetRef.startsWith('vault/BANK_TEST_01/'), 'Packet Ref format correct');
    console.log('[PASS] Upload successful.');

    // 2. Test Read Access (Should Fail)
    console.log('[TEST] Verifying Read Access Control (Default Deny)...');
    try {
        await dataVault.retrievePacket(packetRef, { role: 'BANK_USER' });
        assert.fail('Should have thrown ACCESS_DENIED');
    } catch (err) {
        assert.ok(err.message.includes('ACCESS_DENIED'), 'Correctly denied read access');
        console.log('[PASS] Read access denied as expected.');
    }

    // 3. Test Break-Glass Access
    console.log('[TEST] Verifying Break-Glass Access...');
    const data = await dataVault.retrievePacket(packetRef, {
        role: 'COMPLIANCE_OFFICER',
        break_glass_signature: 'valid_sig'
    });
    assert.strictEqual(data, payload, 'Retrieved data matches');
    console.log('[PASS] Break-glass access successful.');
}

verifyDataVault().then(() => {
    console.log('--- Phase 2 Verification Complete ---');
}).catch(err => {
    console.error('[FAIL] Verification failed:', err);
    process.exit(1);
});

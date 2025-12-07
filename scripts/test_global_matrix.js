const compliance = require('../src/compliance/compliance_validator');
const assert = require('assert');

console.log('=== GLOBAL COMPLIANCE MATRIX TEST ===');

const scenarios = [
    {
        name: 'Singapore VCC (Pass)',
        ruleSet: 'SG_VCC',
        profile: { jurisdiction: 'SG', investment_amount: 250000, is_regulated: true },
        expectEligible: true
    },
    {
        name: 'Singapore VCC (Fail - Low Amount)',
        ruleSet: 'SG_VCC',
        profile: { jurisdiction: 'SG', investment_amount: 50000, is_regulated: false },
        expectEligible: false
    },
    {
        name: 'Luxembourg RAIF (Pass - Well Informed)',
        ruleSet: 'LUX_RAIF',
        profile: { jurisdiction: 'EU', investment_amount: 150000, is_regulated: false },
        expectEligible: true
    },
    {
        name: 'Swiss FINMA (Pass)',
        ruleSet: 'CH_FINMA',
        profile: { jurisdiction: 'CH', investment_amount: 100000, is_regulated: true },
        expectEligible: true
    },
    {
        name: 'Wyoming DAO (Pass - Member)',
        ruleSet: 'US_DAO',
        profile: { jurisdiction: 'US', investment_amount: 100, is_regulated: false }, // Min amount 0
        expectEligible: true // Wait, if min amount is 0, it passes threshold. Logic is generic.
    }
];

let passed = 0;
let failed = 0;

scenarios.forEach(test => {
    try {
        console.log(`Testing: ${test.name}...`);
        const result = compliance.validate(test.profile, test.ruleSet);
        if (result.eligible === test.expectEligible) {
            console.log('  [PASS]');
            passed++;
        } else {
            console.error(`  [FAIL] Expected ${test.expectEligible}, got ${result.eligible}. Reason: ${result.reason}`);
            failed++;
        }
    } catch (err) {
        console.error(`  [ERROR] ${err.message}`);
        failed++;
    }
});

console.log('---------------------------------------------------');
console.log(`Total: ${scenarios.length}, Passed: ${passed}, Failed: ${failed}`);

if (failed > 0) process.exit(1);

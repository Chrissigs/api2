const compliance = require('../src/compliance/regulation_25_check');

console.log('Testing Audit Roulette (1000 iterations)...');

let auditCount = 0;
const iterations = 1000;

for (let i = 0; i < iterations; i++) {
    const result = compliance.verifyEligibleIntroducer({
        jurisdiction: 'KY',
        is_regulated: true
    });

    if (result.status === 'AUDIT_REQUIRED') {
        auditCount++;
    }
}

const percentage = (auditCount / iterations) * 100;
console.log(`Audit Count: ${auditCount}/${iterations}`);
console.log(`Percentage: ${percentage.toFixed(2)}%`);

if (percentage > 0.5 && percentage < 2.5) {
    console.log('PASS: Audit rate is within expected range (~1.5%)');
} else {
    console.log('WARN: Audit rate is outside expected range (might be random variance, run again)');
}

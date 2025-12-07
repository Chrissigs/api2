/**
 * Test Script for Audit Roulette Engine (CSPRNG)
 */
const auditRoulette = require('../src/compliance/audit_roulette_engine');

console.log('Starting CSPRNG Audit Roulette Test...');
console.log('----------------------------------------');

const TRIALS = 10000;
let selections = 0;
const PROBABILITY = 0.015; // 1.5%

const startTime = Date.now();

for (let i = 0; i < TRIALS; i++) {
    const result = auditRoulette.selectForAudit(PROBABILITY);
    if (result.selected) {
        selections++;
    }
}

const endTime = Date.now();
const observedRate = selections / TRIALS;
const expectedCount = TRIALS * PROBABILITY;

console.log(`Trials: ${TRIALS}`);
console.log(`Target Probability: ${PROBABILITY * 100}%`);
console.log(`Expected Selections: ~${expectedCount}`);
console.log(`Actual Selections: ${selections}`);
console.log(`Observed Rate: ${(observedRate * 100).toFixed(4)}%`);
console.log(`Time Taken: ${endTime - startTime}ms`);

console.log('----------------------------------------');

// Basic Statistical Sanity Check (Very loose for this small sample, just to catch major bugs)
// Standard Deviation for Binomial Distribution: sqrt(n * p * (1-p))
const stdDev = Math.sqrt(TRIALS * PROBABILITY * (1 - PROBABILITY));
const zScore = (selections - expectedCount) / stdDev;

console.log(`Standard Deviation: ${stdDev.toFixed(2)}`);
console.log(`Z-Score: ${zScore.toFixed(2)}`);

if (Math.abs(zScore) < 4) { // 99.99% confidence interval roughly
    console.log('RESULT: PASS (Within statistical variance)');
    process.exit(0);
} else {
    console.log('RESULT: WARNING (Distribution seems off, check RNG)');
    process.exit(1);
}

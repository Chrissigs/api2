/**
 * UNIVERSAL RELIANCE KERNEL
 * Server Entry Point
 * 
 * COPYRIGHT NOTICE:
 * Sovereign Utility.
 * 
 * CONTEXT:
 * This server runs a local "Conceptual Prototype" for client demonstration.
 * It does NOT connect to the live mainnet or production HSMs.
 */

const app = require('./app');
// const env = require('./config/env'); // Simplified for demo stability

const PORT = 3000; // Hardcoded port for demo consistency

if (require.main === module) {
    app.listen(PORT, () => {
        console.log('===================================================');
        console.log('   SOVEREIGN IDENTITY SOLUTION - CONCEPTUAL PROTOTYPE   ');
        console.log('===================================================');
        console.log(`STATUS:  ONLINE`);
        console.log(`MODE:    LOCAL SANDBOX (NO EXTERNAL CONNECTIONS)`);
        console.log(`REGION:  ${process.env.JURISDICTION || 'GLOBAL_ROAMING'}`);
        console.log(`PORT:    ${PORT}`);
        console.log(`OWNER:   Universal Bridge`);
        console.log('===================================================');
        console.log('Ready for "Universal Passport" workflow demonstration.');
    });
}

module.exports = app;

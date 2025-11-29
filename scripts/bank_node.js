const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const certsDir = path.join(__dirname, '../certs');

// Clause 4.6: Heartbeat Response Endpoint
// Validates continued access to cryptographic material as per Deed of Reliance.
app.post('/v1/heartbeat-response', (req, res) => {
    console.log('[BANK NODE] Heartbeat request received...');

    // Clause 4.6.1: Verify Certificate Access
    try {
        fs.accessSync(certsDir, fs.constants.R_OK);
        console.log('[BANK NODE] Certificate access verified.');
    } catch (err) {
        console.error('[BANK NODE] CRITICAL: Certificate access failure.');
        return res.status(500).json({
            status: 'ACCESS_DENIED',
            error: 'Certificate access failure'
        });
    }

    // Simulate network latency
    const delay = Math.floor(Math.random() * 2000);

    setTimeout(() => {
        res.status(200).json({ status: 'ACCESS_CONFIRMED' });
    }, delay);
});

// Client Trigger Endpoint
app.post('/client-trigger', async (req, res) => {
    const { amount, investorName, sourceAccount } = req.body;
    console.log(`[BANK NODE] Processing trigger for: ${investorName}`);

    // 2.1 Atomic Settlement: Verify Funds
    const paymentGateway = require('../src/payment-gateway');
    const paymentResult = await paymentGateway.processPayment(sourceAccount || 'VALID-GENERIC', amount, 'KYD');

    if (!paymentResult.success) {
        console.error('[BANK NODE] Settlement Failed:', paymentResult.error);
        return res.status(402).json({
            status: 'PAYMENT_FAILED',
            error: paymentResult.error,
            message: 'Settlement failed.'
        });
    }

    console.log(`[BANK NODE] Settlement Confirmed. Ref: ${paymentResult.transactionRef}`);

    // 1. Construct the Compliance Warranty Payload (The "Passport")
    const transactionId = `TXN-${Date.now()}`;

    // Prepare data for ZK Proof (Private Inputs)
    const privateIdentity = {
        legal_name: investorName || '[INVESTOR_DEMO_USER]',
        nationality: 'KY',
        tin: '123456789'
    };

    // 2.2 Zero-Knowledge Privacy: Generate Proof
    const zkService = require('../src/zk-service');
    const { proof, publicSignals } = zkService.generateProof(privateIdentity);

    // The "Passport" now contains NO PII, only the Proof.
    const investorIdentityData = {
        zk_proof: proof,
        public_signals: publicSignals,
        // We might still send nationality as a public claim if needed for routing, 
        // but the core identity is hidden.
        nationality: 'KY'
    };

    const complianceWarrantyData = {
        jurisdiction: 'KY',
        kyc_status: 'VERIFIED',
        screening_status: 'CLEAR',
        warranties: [
            'IDENTITY_VERIFIED',
            'AML_SCREENED',
            'SOURCE_OF_FUNDS_VALIDATED'
        ],
        payment_ref: paymentResult.transactionRef,
        indemnity_clause: 'CLAUSE_7.2_DEED_OF_RELIANCE'
    };

    // Sign the JWT using HSM
    // REFACTOR: Removed local private key reading. Using Cloud HSM simulation.
    const hsm = require('../src/hsm-service');

    // Ensure HSM is initialized (in a real app, this would happen at startup)
    if (!hsm.initialized) {
        hsm.initialize();
    }

    const token = hsm.signJWT({
        iss: 'BANK_CAYMAN_01',
        // ZK: We sign the proof hash, not the identity itself
        zk_proof_hash: require('crypto').createHash('sha256').update(JSON.stringify(proof)).digest('hex'),
        compliance_warranty: { kyc_status: complianceWarrantyData.kyc_status }
    }, { expiresIn: '1h' });

    const payload = {
        header: {
            transaction_id: transactionId,
            bank_id: 'BANK_CAYMAN_01',
            fund_id: 'FUND_ID_A',
            timestamp: new Date().toISOString()
        },
        investor_identity: investorIdentityData,
        compliance_warranty: {
            ...complianceWarrantyData,
            warranty_token: token
        }
    };

    // 2. Send to REGISTRY API (The Registry)
    // We need to use the Client Certs for mTLS if configured, but for local demo we might skip strict mTLS if it's too complex to setup axios with certs right now.
    // However, server.js expects mTLS headers or at least a token.
    // Let's try to send it.

    try {
        // We need to load the certs to make the request to the secure server
        // Note: These are TRANSPORT certs (mTLS), distinct from the SIGNING keys in the HSM.
        // It is acceptable to keep mTLS certs on disk as they are for channel security, not document signing.
        const httpsAgent = new https.Agent({
            cert: fs.readFileSync(path.join(certsDir, 'client-cert.pem')),
            key: fs.readFileSync(path.join(certsDir, 'client-key.pem')),
            ca: fs.readFileSync(path.join(certsDir, 'ca-cert.pem')),
            rejectUnauthorized: false // Self-signed CA
        });

        const axios = require('axios');

        console.log('[BANK NODE] Sending Warranty to REGISTRY API...');

        const response = await axios.post(`https://${process.env.API_HOST || 'localhost'}:3000/v1/onboard`, payload, {
            httpsAgent,
            headers: {
                'Authorization': 'Bearer ' + (process.env.API_AUTH_TOKEN),
                'Content-Type': 'application/json'
            }
        });

        console.log('[BANK NODE] REGISTRY API Response:', response.data);
        res.json({ status: 'SUCCESS', data: response.data });

    } catch (error) {
        console.error('[BANK NODE] Error calling REGISTRY API:', error.message);
        if (error.response) {
            console.error('[BANK NODE] Server Response:', error.response.data);
        }
        res.status(500).json({ status: 'ERROR', message: error.message });
    }
});

// HTTPS Options for mTLS (Bank Node also uses secure communication)
let httpsOptions = {};

try {
    httpsOptions = {
        key: fs.readFileSync(path.join(certsDir, 'server-key.pem')),
        cert: fs.readFileSync(path.join(certsDir, 'server-cert.pem')),
        ca: fs.readFileSync(path.join(certsDir, 'ca-cert.pem')),
        requestCert: false, // Bank node doesn't require client certs for heartbeat
        rejectUnauthorized: false // Allow connections without client auth for this demo
    };
} catch (err) {
    console.warn('[BANK NODE] Warning: Could not load certificates. Will try HTTP fallback.');
}

// Start the server
// Start the server
if (Object.keys(httpsOptions).length > 0) {
    // HTTPS on 3001 (For Server/Heartbeat)
    https.createServer(httpsOptions, app).listen(PORT, () => {
        console.log(`[BANK NODE] Secure Bank Node running on https://localhost:${PORT}`);
        console.log('[BANK NODE] Ready to respond to Heartbeat checks...');
    });

    // HTTP on 3002 (For Frontend Client Trigger to avoid SSL errors)
    const http = require('http');
    const HTTP_PORT = 3002;
    http.createServer(app).listen(HTTP_PORT, () => {
        console.log(`[BANK NODE] HTTP Bank Node running on http://localhost:${HTTP_PORT} (For Frontend)`);
    });

} else {
    // Fallback to HTTP for demo purposes
    app.listen(PORT, () => {
        console.log(`[BANK NODE] Bank Node running on http://localhost:${PORT} (INSECURE MODE)`);
        console.log('[BANK NODE] Ready to respond to Heartbeat checks...');
    });
}

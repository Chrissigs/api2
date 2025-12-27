const axios = require('axios');
const app = require('../src/app'); // Changed from server to app
const env = require('../src/config/env');

async function testPassportFlow() {
    console.log("Starting Passport Issuer Verification...");

    // 1. Start the Server Locally
    const PORT = 3005;
    const server = app.listen(PORT, () => { });

    // Default Auth Header
    const axiosConfig = {
        headers: { 'Authorization': `Bearer ${env.API_AUTH_TOKEN}` }
    };

    try {
        const baseURL = `http://localhost:${PORT}`;

        // 2. Test Issuance (Accredited)
        console.log("\n[TEST 1] Issuing Accredited Passport...");
        const kycData = {
            legalName: "John Doe",
            dateOfBirth: "1980-01-01",
            nationality: "KY",
            netWorth: 1500000, // > 1M
            address: "123 Seven Mile Beach"
        };

        const issueResponse = await axios.post(`${baseURL}/v1/passport/issue`, kycData, axiosConfig);

        const { credential, zk_proof } = issueResponse.data;
        console.log(" > VC Issued:", credential.id);

        // CHECK ISO MAPPING
        const subject = credential.credentialSubject;
        if (!subject.PstlAdr || subject.PstlAdr.StrtNm !== "123 Seven Mile Beach") {
            throw new Error("ISO Mapping Failed: PstlAdr missing or incorrect");
        }
        if (subject.Nm.FrstNm !== "John" || subject.Nm.Srnm !== "Doe") {
            throw new Error("ISO Mapping Failed: Name structure incorrect");
        }
        console.log(" > ISO 20022 Mapping: CONFIRMED");

        // CHECK ZK PROOF
        if (!zk_proof) throw new Error("Expected ZK Proof for accredited investor");
        console.log(" > ZK Proof: CONFIRMED");

        // 3. Test Verification (Valid)
        console.log("\n[TEST 2] Verifying Valid Passport...");
        const verifyResponse = await axios.post(`${baseURL}/v1/passport/verify`, { credential }, axiosConfig);
        console.log(" > Verification Result:", verifyResponse.data);

        if (!verifyResponse.data.verified) throw new Error("Verification failed for valid credential");

        // 4. Test Verification (Tampered)
        console.log("\n[TEST 3] Verifying Tampered Passport...");
        const tamperedCredential = JSON.parse(JSON.stringify(credential));
        tamperedCredential.credentialSubject.riskLevel = "HIGH"; // Tamper

        const verifyTampered = await axios.post(`${baseURL}/v1/passport/verify`, { credential: tamperedCredential }, axiosConfig);
        console.log(" > Tampered Result (Expected False):", verifyTampered.data.verified);

        if (verifyTampered.data.verified) throw new Error("Tampered credential should NOT be verified");

        // 5. Test Auth Failure
        console.log("\n[TEST 4] Testing Auth Failure...");
        try {
            await axios.post(`${baseURL}/v1/passport/issue`, kycData, { headers: { 'Authorization': 'Bearer bad-token' } });
            throw new Error("Auth should have failed");
        } catch (e) {
            if (e.response && e.response.status === 403) {
                console.log(" > Auth Rejection: CONFIRMED (403)");
            } else {
                throw e;
            }
        }

        console.log("\n[SUCCESS] All checks passed.");

    } catch (e) {
        console.error("\n[FAILURE] Test Failed:", e.message);
        if (e.response) {
            console.error("Response:", JSON.stringify(e.response.data, null, 2));
        }
    } finally {
        server.close();
    }
}

testPassportFlow();

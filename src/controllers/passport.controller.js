const vcService = require('../services/vc_service');
const historyService = require('../services/history_service');
const auditService = require('../services/audit_service');

const ProviderRegistry = require('../services/provider_registry');

exports.issuePassport = async (req, res, next) => {
    try {
        // Input is already validated and typed by Zod middleware
        const kycData = req.body;

        // Resolve Issuer DID from Body or Header
        const issuerDid = req.body.issuer || req.headers['x-issuer-did'];
        if (!issuerDid) {
            return res.status(400).json({ error: "Missing Issuer DID. Please provide 'issuer' in body or 'x-issuer-did' header." });
        }

        // Validate Issuer against Registry
        const provider = ProviderRegistry.getProvider(issuerDid);
        if (!provider && process.env.STRICT_MODE === 'true') {
            return res.status(400).json({ error: "Unknown Issuer DID." });
        }

        const generateZkProof = req.body.zk_solvency === true;

        // Delegate to Service with dynamic issuer
        const credential = await vcService.issuePassport(kycData, issuerDid, {}, generateZkProof);

        console.log(`[AUDIT] Issuance Complete for ${kycData.legalName} by ${issuerDid}`);
        res.status(201).json({ credential });
    } catch (error) {
        next(error);
    }
};

exports.verifyPassport = async (req, res, next) => {
    try {
        const { credential, jurisdiction } = req.body;

        // Resolve Jurisdiction from Body or Header
        const verifierJurisdiction = jurisdiction || req.headers['x-jurisdiction'];

        if (!verifierJurisdiction) {
            return res.status(400).json({ error: "Missing Target Jurisdiction. Please provide 'jurisdiction' in body or 'x-jurisdiction' header." });
        }

        const result = await vcService.verify(credential, verifierJurisdiction);

        // 5% Audit Roulette Trigger Logic
        if (result.verified && auditService.shouldTriggerAudit()) {
            console.warn(`[RISK ENGINE] Audit Triggered for ${credential.id}`);

            // Log Immutable Proof of Selection
            await historyService.logEvent(
                'AUDIT_SAMPLING_VERIFIED',
                {
                    credential_id: credential.id,
                    reason: "RANDOM_SPOT_CHECK",
                    probability: "0.05"
                },
                verifierJurisdiction
            );

            return res.status(403).json({
                verified: false,
                reason: "ROULETTE_TRIGGER",
                message: "Spot Check Protocol Initiated. Please contact Administrator for manual verification.",
                audit_ref: `AUDIT-${Date.now()}`
            });
        }

        if (!result.verified) {
            return res.json({
                verified: false,
                reason: result.reason || "INVALID_SIGNATURE_OR_REVOKED"
            });
        }

        return res.json(result);

    } catch (error) {
        next(error);
    }
};

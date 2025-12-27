const { z } = require('zod');

// Schema for Passport Issuance
const issuePassportSchema = z.object({
    legalName: z.string().min(2),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    netWorth: z.number().positive(),
    nationality: z.string().length(2), // ISO 3166-1 alpha-2
    address: z.string().optional(),
});

// Schema for Verification
const verifyCredentialSchema = z.object({
    credential: z.object({
        id: z.string(),
        proof: z.object({
            jws: z.string()
        }).passthrough(),
        issuer: z.string(),
        credentialSubject: z.record(z.any())
    }).passthrough()
});

const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({
                error: "Validation Error",
                details: err.errors
            });
        }
        next(err);
    }
};

module.exports = {
    checkIssuePassport: validate(issuePassportSchema),
    checkVerifyCredential: validate(verifyCredentialSchema)
};

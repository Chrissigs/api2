const express = require('express');
const router = express.Router();
const passportController = require('../controllers/passport.controller');
const authMiddleware = require('../middleware/auth');
const { checkIssuePassport, checkVerifyCredential } = require('../middleware/validation');

// Issue Global Passport: Protected + Validated
router.post('/issue',
    authMiddleware,
    checkIssuePassport,
    passportController.issuePassport
);

// Verify Global Passport: Protected + Validated
// (Note: Verification can be public depending on policy, but we protect it here for specific reliance)
router.post('/verify',
    authMiddleware,
    checkVerifyCredential,
    passportController.verifyPassport
);

module.exports = router;

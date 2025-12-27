const env = require('../config/env');

/**
 * Bearer Token Authentication Middleware
 * Enforces strict equality with API_AUTH_TOKEN
 */
module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: "Missing Authorization Header" });
    }

    const token = authHeader.split(' ')[1];

    if (token !== env.API_AUTH_TOKEN) {
        console.warn(`[AUTH] Failed login attempt from ${req.ip}`);
        return res.status(403).json({ error: "Invalid API Token" }); // 403 Forbidden
    }

    next();
};

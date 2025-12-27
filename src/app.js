const express = require('express');
const bodyParser = require('body-parser');
const passportRoutes = require('./routes/passport.routes');

const app = express();

app.use(bodyParser.json());

// API Routes
app.use('/v1/passport', passportRoutes);

// Health Check (Public)
app.get('/health', (req, res) => {
    res.json({ status: 'ACTIVE', role: 'ISSUER_NODE' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[ERROR]', err);
    res.status(500).json({ error: "Internal Server Error" });
});

module.exports = app;

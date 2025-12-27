const path = require('path');

module.exports = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    API_AUTH_TOKEN: process.env.API_AUTH_TOKEN || 'local-dev-token', // Secure default handling

    // Persistence Paths
    DATA_DIR: path.join(__dirname, '../../data'),
    KEYSTORE_PATH: path.join(__dirname, '../../data/keystore.json'),
    REVOCATION_PATH: path.join(__dirname, '../../data/revocation_registry.json'),

    // Crypto
    HSM_PROVIDER: process.env.HSM_PROVIDER, // 'AWS_KMS' | 'AZURE_VAULT' | undefined
};

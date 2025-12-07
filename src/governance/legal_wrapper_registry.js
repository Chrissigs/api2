/**
 * ANTIGRAVITY CORE v2.0
 * Module: Legal Wrapper Registry
 * 
 * Maps technical compliance events to specific legal frameworks.
 */

const fs = require('fs');
const path = require('path');

class LegalWrapperRegistry {
    constructor() {
        this.configPath = path.join(__dirname, '../../config/legal_templates.json');
        this.templates = this._loadTemplates();
    }

    _loadTemplates() {
        if (fs.existsSync(this.configPath)) {
            return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        }
        return {};
    }

    /**
     * Retrieves the legal template metadata for a given jurisdiction.
     * @param {string} jurisdictionId - e.g. 'KY', 'SG_VCC'
     */
    getTemplate(jurisdictionId) {
        // Handle generic inputs like 'SG' by mapping to default 'SG_VCC' if needed, 
        // or expect precise IDs. For now, precise Lookups.

        const template = this.templates[jurisdictionId];
        if (!template) {
            // Fallback for simple country codes if we have a default map?
            // For now, return Generic if not found? 
            // Or throw error to ensure strict legal compliance.
            throw new Error(`Legal Wrapper not found for Jurisdiction: ${jurisdictionId}`);
        }
        return template;
    }

    /**
     * Generates a legal disclaimer string for the transaction.
     */
    getDisclaimer(jurisdictionId) {
        const t = this.getTemplate(jurisdictionId);
        return `This transaction is governed by ${t.jurisdiction} law via the ${t.document_title} pursuant to ${t.clause_reference}.`;
    }
}

module.exports = new LegalWrapperRegistry();

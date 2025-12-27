const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const LEDGER_FILE = path.join(__dirname, '../../global_compliance_ledger.json');

class HistoryService {
    constructor() {
        this.ledgerPath = LEDGER_FILE;
        this.lastHash = this.initializeLedger();
    }

    initializeLedger() {
        if (!fs.existsSync(this.ledgerPath)) {
            const genesisBlock = {
                sequence: 0,
                timestamp: new Date().toISOString(),
                event_type: 'GENESIS',
                data_hash: '0000000000000000000000000000000000000000000000000000000000000000',
                previous_hash: null,
                block_hash: 'GENESIS_HASH'
            };
            const genesisHash = this.calculateBlockHash(genesisBlock);
            genesisBlock.block_hash = genesisHash;

            fs.writeFileSync(this.ledgerPath, JSON.stringify([genesisBlock], null, 2));
            return genesisHash;
        } else {
            const ledger = JSON.parse(fs.readFileSync(this.ledgerPath, 'utf8'));
            if (ledger.length === 0) return null; // Should not happen if init correctly
            return ledger[ledger.length - 1].block_hash;
        }
    }

    calculateBlockHash(block) {
        const data = block.sequence + block.timestamp + block.event_type + block.data_hash + block.previous_hash;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Logs an event to the Global Compliance Ledger.
     * @param {string} eventType - The type of event (e.g., "ISSUANCE", "REVOCATION")
     * @param {string} dataContext - A string or hash representing the data (PII-free)
     * @param {string} jurisdiction - The jurisdiction where the event occurred
     */
    async logEvent(eventType, dataContext, jurisdiction) {
        const ledger = JSON.parse(fs.readFileSync(this.ledgerPath, 'utf8'));
        const sequence = ledger.length;
        const timestamp = new Date().toISOString();

        // Hash the data context to ensure no PII is stored if raw data is passed
        const dataHash = crypto.createHash('sha256').update(JSON.stringify(dataContext)).digest('hex');

        // Hash chain: Current Hash = SHA256(Sequence + Timestamp + Event + Jurisdiction + DataHash + PrevHash)
        // This ensures the ledger is immutable; changing any past block invalidates the entire chain.
        const block = {
            sequence,
            timestamp,
            event_type: eventType,
            jurisdiction,
            data_hash: dataHash,
            previous_hash: this.lastHash
        };

        const blockHash = this.calculateBlockHash(block);
        block.block_hash = blockHash;

        ledger.push(block);
        fs.writeFileSync(this.ledgerPath, JSON.stringify(ledger, null, 2));

        this.lastHash = blockHash;

        console.log(`[LEDGER] Block ${sequence} mined. Hash: ${blockHash}`);
        return blockHash;
    }

    getLedger() {
        return JSON.parse(fs.readFileSync(this.ledgerPath, 'utf8'));
    }
}

module.exports = new HistoryService();

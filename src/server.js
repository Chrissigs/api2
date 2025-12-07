/**
 * Mock Server (The Hub) for Heartbeat Tests
 */

let bankStatus = 'ACTIVE';
let firstFailureTimestamp = null;

function getBankStatus() { return bankStatus; }
function setBankStatus(s) { bankStatus = s; }
function setPerformHeartbeatRequest(fn) { /* mock hook */ }
function setFirstFailureTimestamp(ts) { firstFailureTimestamp = ts; }

function transitionToWarning() {
    bankStatus = 'WARNING';
}

function checkGracePeriod() {
    if (firstFailureTimestamp && (Date.now() - firstFailureTimestamp > 15 * 60 * 1000)) {
        bankStatus = 'SUSPENDED';
    }
}

module.exports = {
    _test: {
        getBankStatus,
        setBankStatus,
        setPerformHeartbeatRequest,
        transitionToWarning,
        checkGracePeriod,
        setFirstFailureTimestamp
    }
};

// /war/warState.js
const players = {};
const alliances = {};  // { allianceName: [username1, username2, ...] }

let warInProgress = false;
let isWarOpen = false;
let warRunning = false;

function resetWar() {
    Object.keys(players).forEach(u => delete players[u]);
    Object.keys(alliances).forEach(a => delete alliances[a]);
    warInProgress = false;
    isWarOpen = false;
}

module.exports = {
    players,
    alliances,
    get warInProgress() { return warInProgress; },
    set warInProgress(value) { warInProgress = value; },
    get isWarOpen() { return isWarOpen; },
    set isWarOpen(value) { isWarOpen = value; },
    get warRunning() { return warRunning; },
    set warRunning(value) { warRunning = value; },
    resetWar,
};

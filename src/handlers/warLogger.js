// /war/warLogger.js
const fs = require('fs');
const path = require('path');

const winnersFilePath = path.join(__dirname, '../data/warWinners.json');

function saveWinnersToFile(topPlayers) {
    let data = [];
    if (fs.existsSync(winnersFilePath)) {
        try {
            const raw = fs.readFileSync(winnersFilePath, 'utf-8');
            data = JSON.parse(raw);
        } catch (err) {
            console.log('❌ خطأ في قراءة ملف الترتيب:', err.message);
        }
    }

    const time = new Date().toISOString();
    const entry = {
        time,
        winners: topPlayers
    };

    data.unshift(entry); // أحدث ترتيب في الأعلى

    fs.writeFileSync(winnersFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { saveWinnersToFile };

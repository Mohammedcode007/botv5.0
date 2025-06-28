const fs = require('fs');
const { createRoomMessage } = require('./messageUtils');
const gameData = require('./gameData.json');

let activePlayers = {};
let currentRound = 0;

function saveGameData() {
    fs.writeFileSync('./gameData.json', JSON.stringify(gameData, null, 2));
}

function assignRandomProfile(playerName) {
    const country = gameData.countries[Math.floor(Math.random() * gameData.countries.length)];
    const title = gameData.titles[Math.floor(Math.random() * gameData.titles.length)];
    const weapon = gameData.weapons[Math.floor(Math.random() * gameData.weapons.length)];

    return {
        country: country.name,
        flag: country.flag,
        title,
        points: 1000,
        weapon: { ...weapon }
    };
}

function handlePlayerAction(playerName, action) {
    if (activePlayers[playerName]) {
        return `🚫 اللاعب ${playerName} مشارك بالفعل في الجولة الحالية.`;
    }

    if (!gameData.players[playerName]) {
        gameData.players[playerName] = assignRandomProfile(playerName);
        saveGameData();
    }

    activePlayers[playerName] = {
        ...gameData.players[playerName],
        action
    };

    return `✅ تم تسجيل ${playerName} في الجولة كـ "${action}".`;
}

function startWarRound(io) {
    currentRound++;
    activePlayers = {};

    io.broadcast('⚔️ بدأت الحرب العالمية (جولة رقم: ' + currentRound + ')!\nاكتب "هجوم" أو "دفاع" أو "تحالف مع @اسم". أمامك 15 ثانية.');

    setTimeout(() => {
        resolveWar(io);
    }, gameData.gameSettings.roundDuration * 1000);
}

function resolveWar(io) {
    const playerNames = Object.keys(activePlayers);
    if (playerNames.length === 0) {
        io.broadcast('🚫 لم ينضم أحد للجولة الحالية. الحرب انتهت دون قتال.');
        return;
    }

    // محاكاة عشوائية
    const winner = playerNames[Math.floor(Math.random() * playerNames.length)];
    const winnerData = activePlayers[winner];

    // تحديث النقاط
    gameData.players[winner].points += 200;
    saveGameData();

    const message = `
🏆 انتهت الجولة رقم ${currentRound}!
🥇 الفائز: ${winner} ${winnerData.flag} ${winnerData.title}
🌍 دولته: ${winnerData.country}
🔫 سلاحه: ${winnerData.weapon.name}
💰 نقاطه الآن: ${gameData.players[winner].points}

🎯 الجولة القادمة تبدأ خلال 30 ثانية.
`;

    io.broadcast(message);
}

// استقبال أوامر اللاعبين
function handleGameCommand(message, playerName, io) {
    message = message.toLowerCase().trim();

    if (message === 'هجوم' || message === 'دفاع') {
        const result = handlePlayerAction(playerName, message);
        io.sendToPlayer(playerName, result);
    } else if (message.startsWith('تحالف مع')) {
        const partner = message.split('تحالف مع')[1]?.trim();
        if (partner) {
            const result = handlePlayerAction(playerName, `تحالف مع ${partner}`);
            io.sendToPlayer(playerName, result);
        }
    }
}

module.exports = {
    startWarRound,
    handleGameCommand
};

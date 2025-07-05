// legendFightGame.js

const fs = require('fs');
const path = require('path');
const { createRoomMessage } = require('../messageUtils');
const { loadRooms, addPoints } = require('../fileUtils');

const duelFilePath = path.join(__dirname, '../data/legendFight.json');
const leaderboardFilePath = path.join(__dirname, '../data/legendLeaderboard.json');

const initialState = {
    isActive: false,
    player1: null,
    player2: null,
    stage: 'idle',
    pending: {},
    lastPlayed: Date.now(),
    cooldowns: {},
    timeoutId: null
};

function loadData() {
    if (!fs.existsSync(duelFilePath)) fs.writeFileSync(duelFilePath, JSON.stringify(initialState, null, 2));
    return JSON.parse(fs.readFileSync(duelFilePath));
}

function saveData(data) {
    fs.writeFileSync(duelFilePath, JSON.stringify(data, null, 2));
}

function loadLeaderboard() {
    if (!fs.existsSync(leaderboardFilePath)) fs.writeFileSync(leaderboardFilePath, JSON.stringify({}, null, 2));
    return JSON.parse(fs.readFileSync(leaderboardFilePath));
}

function saveLeaderboard(data) {
    fs.writeFileSync(leaderboardFilePath, JSON.stringify(data, null, 2));
}

function resetGame() {
    const duel = loadData();
    if (duel.timeoutId) clearTimeout(duel.timeoutId);
    saveData({ ...initialState, cooldowns: duel.cooldowns });
}

const weapons = ['⚔️ سيف الجحيم', '🔫 مدفع العاصفة', '🪓 فأس العملاق', '🏹 قوس النار', '🗡️ خنجر الظلام'];
const countries = ['🇪🇬 مصر', '🇸🇾 سوريا', '🇸🇦 السعودية', '🇲🇦 المغرب', '🇹🇳 تونس'];
const trainings = ['🏃‍♂️ سرعة', '💪 قوة', '🧠 ذكاء', '🛡️ دفاع', '🔥 شراسة'];
const outfits = ['🧥 زي التنين', '🕶️ زي النينجا', '🎽 زي الجندي', '👘 زي الساموراي', '🧢 زي القائد'];

function handleLegendFightCommand(data, socket, ioSockets, isJoin = false) {
    const sender = data.from;
    const room = data.room;
    const body = data.body.trim();
    const userId = data.userId || sender;
    const now = Date.now();
    let duel = loadData();
    let leaderboard = loadLeaderboard();

    const isInProgress = duel.pending[sender] !== undefined;

    if (!isInProgress && duel.cooldowns[sender] && now - duel.cooldowns[sender] < 15 * 60 * 1000) {
        const wait = Math.ceil((15 * 60 * 1000 - (now - duel.cooldowns[sender])) / 1000);
        socket.send(JSON.stringify(createRoomMessage(room, `⏳ يجب الانتظار ${wait} ثانية قبل بدء قتال جديد.`)));
        return;
    }

    if (body === 'قتال') {
        if (duel.isActive && duel.player2 && !isJoin) {
            socket.send(JSON.stringify(createRoomMessage(room, '❗ يوجد قتال جارٍ بالفعل بين مقاتلين. انتظر حتى ينتهي.')));
            return;
        }
    }

    if (!isJoin && body === 'قتال') {
        duel.isActive = true;
        duel.stage = 'awaiting_weapon';
        duel.player1 = { username: sender, userId, selections: {} };
        duel.pending = { [sender]: 'weapon' };
        duel.lastPlayed = now;
        duel.cooldowns[sender] = now;

        const cancelTimeout = setTimeout(() => {
            const check = loadData();
            if (check.isActive) {
                resetGame();
                broadcastToAllRooms(ioSockets, `⏰ تم إلغاء القتال تلقائيًا لعدم التفاعل.`);
            }
        }, 2 * 60 * 1000);

        duel.timeoutId = cancelTimeout[Symbol.toPrimitive] ? cancelTimeout[Symbol.toPrimitive]() : cancelTimeout;
        saveData(duel);

        const weaponChoices = weapons.map((w, i) => `${i + 1}. ${w}`).join('\n');
        const msg = `🛡️ ${sender} بدأ القتال!\nاختر سلاحك:\n${weaponChoices}\nاكتب الرقم.`;
        socket.send(JSON.stringify(createRoomMessage(room, msg)));
        return;
    }

    if (duel.pending[sender]) {
        const stage = duel.pending[sender];
        const choice = parseInt(body);
        if (isNaN(choice) || choice < 1 || choice > 5) {
            socket.send(JSON.stringify(createRoomMessage(room, `❌ اختيار غير صالح. اختر رقم من 1 إلى 5.`)));
            return;
        }

        const playerKey = duel.player1?.username === sender ? 'player1' : 'player2';
        const player = duel[playerKey];

        if (stage === 'weapon') {
            player.selections.weapon = weapons[choice - 1];
            duel.pending[sender] = 'country';
            const countryChoices = countries.map((c, i) => `${i + 1}. ${c}`).join('\n');
            socket.send(JSON.stringify(createRoomMessage(room, `🌍 اختر دولتك:\n${countryChoices}`)));
        } else if (stage === 'country') {
            player.selections.country = countries[choice - 1];
            duel.pending[sender] = 'training';
            const trainChoices = trainings.map((t, i) => `${i + 1}. ${t}`).join('\n');
            socket.send(JSON.stringify(createRoomMessage(room, `💪 اختر نوع تدريبك:\n${trainChoices}`)));
        } else if (stage === 'training') {
            player.selections.training = trainings[choice - 1];
            duel.pending[sender] = 'outfit';
            const outfitChoices = outfits.map((o, i) => `${i + 1}. ${o}`).join('\n');
            socket.send(JSON.stringify(createRoomMessage(room, `👕 اختر زيك:\n${outfitChoices}`)));
        } else if (stage === 'outfit') {
            player.selections.outfit = outfits[choice - 1];
            delete duel.pending[sender];

            const card = `📇 بطاقة ${sender}:\n${player.selections.weapon}\n${player.selections.country}\n${player.selections.training}\n${player.selections.outfit}`;
            socket.send(JSON.stringify(createRoomMessage(room, card)));

            if (!duel.player2 || Object.keys(duel.pending).length > 0) {
                broadcastToAllRooms(ioSockets, `🛡️ المقاتل ${sender} جاهز! من يجرؤ على مواجهته؟ اكتب "قتال" لبدء التحدي.`);
            } else {
                duel.stage = 'complete';
                saveData(duel);
                fightBetweenPlayers(ioSockets, duel, leaderboard);
                return;
            }
        }
        saveData(duel);
        return;
    }

    if (isJoin && body === 'قتال' && duel.isActive && !duel.player2) {
        duel.player2 = { username: sender, userId, selections: {} };
        duel.pending[sender] = 'weapon';
        duel.cooldowns[sender] = now;
        saveData(duel);

        const weaponChoices = weapons.map((w, i) => `${i + 1}. ${w}`).join('\n');
        socket.send(JSON.stringify(createRoomMessage(room, `⚔️ ${sender}, اختر سلاحك:\n${weaponChoices}`)));
        return;
    }
}

function broadcastToAllRooms(ioSockets, message) {
    const rooms = loadRooms();
    rooms.forEach(room => {
        const socket = ioSockets[room.roomName || room];
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify(createRoomMessage(room.roomName, message)));
        }
    });
}

function fightBetweenPlayers(ioSockets, duel, leaderboard) {
    const p1 = duel.player1;
    const p2 = duel.player2;

    const winner = Math.random() < 0.5 ? p1.username : p2.username;
    try { addPoints(winner, 1000000000); } catch {}
    leaderboard[winner] = (leaderboard[winner] || 0) + 1;
    saveLeaderboard(leaderboard);

    const result = `⚔️ المعركة بين ${p1.username} و ${p2.username}:\n` +
        `- ${p1.username}: ${Object.values(p1.selections).join(', ')}\n` +
        `- ${p2.username}: ${Object.values(p2.selections).join(', ')}\n\n` +
        `🏆 الفائز هو: ${winner} (+1 فوز و 1,000,000,000 نقطة)`;

    broadcastToAllRooms(ioSockets, result);

    const sorted = Object.entries(leaderboard)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, score], i) => `#${i + 1} - ${name} | 🏆 الفوز: ${score}`)
        .join('\n');

    broadcastToAllRooms(ioSockets, `📊 ترتيب الأساطير:\n${sorted}`);
    resetGame();
}

module.exports = {
    handleLegendFightCommand,
    resetGame
};

const fs = require('fs');
const path = require('path');
const { createRoomMessage, createMainImageMessage } = require('../messageUtils');
const { addPoints, loadRooms, isUserBlocked, isUserVerified } = require('../fileUtils');

const duelFilePath = path.join(__dirname, '../data/whipDuel.json');
const leaderboardFilePath = path.join(__dirname, '../data/whipLeaderboard.json');
const cooldownFilePath = path.join(__dirname, '../data/whipCooldowns.json');

const COOLDOWN_DURATION = 5 * 60 * 1000;

const whipImages = [
    'https://toppng.com/uploads/preview/whip-png-11554025448mpxgth9qrx.png',
    'https://www.clipartmax.com/png/middle/131-1310539_lynn-anime-bone-whip.png'
];

function loadJsonFile(filePath, defaultValue = {}) {
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    return JSON.parse(fs.readFileSync(filePath));
}

function saveJsonFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getInitialDuelData() {
    return { isActive: false, player1: null, player2: null, startedAt: null, rooms: [], result: null };
}

function loadDuelData() {
    return loadJsonFile(duelFilePath, getInitialDuelData());
}

function saveDuelData(data) {
    saveJsonFile(duelFilePath, data);
}

function resetDuel() {
    saveDuelData(getInitialDuelData());
}

function loadLeaderboard() {
    return loadJsonFile(leaderboardFilePath, {});
}

function saveLeaderboard(data) {
    saveJsonFile(leaderboardFilePath, data);
}

function loadCooldowns() {
    return loadJsonFile(cooldownFilePath, {});
}

function saveCooldowns(data) {
    saveJsonFile(cooldownFilePath, data);
}

function broadcastToAllRooms(ioSockets, message) {
    const rooms = loadRooms();
    rooms.forEach(room => {
        if (room.gamesEnabled === false) return;
        const socket = ioSockets[room.roomName];
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify(createRoomMessage(room.roomName, message)));
        }
    });
}

function broadcastToRooms(ioSockets, roomNames, message) {
    const rooms = loadRooms();
    roomNames.forEach(roomName => {
        const roomData = rooms.find(r => r.roomName === roomName);
        if (roomData?.gamesEnabled === false) return;
        const socket = ioSockets[roomName];
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify(createRoomMessage(roomName, message)));
        }
    });
}

function handleWhipCommand(data, socket, ioSockets) {
    const sender = data.from;
    const room = data.room;
    const userId = data.userId || sender;
    const now = Date.now();

    if (isUserBlocked(sender)) {
        return socket.send(JSON.stringify(createRoomMessage(room, `🚫 تم منعك من استخدام الأوامر.`)));
    }
    if (!isUserVerified(sender)) {
        return socket.send(JSON.stringify(createRoomMessage(room, `🔒 فقط المستخدمين الموثقين يمكنهم استخدام هذا التحدي.`)));
    }

    const cooldowns = loadCooldowns();
    if (cooldowns[userId] && now - cooldowns[userId] < COOLDOWN_DURATION) {
        const remaining = Math.ceil((COOLDOWN_DURATION - (now - cooldowns[userId])) / 1000);
        return socket.send(JSON.stringify(createRoomMessage(room, `⏳ انتظر ${remaining} ثانية قبل المشاركة مرة أخرى في تحدي الجلد.`)));
    }

    let duelData = loadDuelData();

    if (!duelData.isActive) {
        duelData.isActive = true;
        duelData.player1 = { username: sender, userId };
        duelData.startedAt = now;
        duelData.rooms = [room];
        saveDuelData(duelData);

        cooldowns[userId] = now;
        saveCooldowns(cooldowns);

        broadcastToAllRooms(ioSockets, `🪢 ${sender} أعلن تحدي الجلد! أول من يكتب "جلد" خلال 30 ثانية سينضم للمجزرة 😂`);

        setTimeout(() => {
            const current = loadDuelData();
            if (current.isActive && !current.player2) {
                broadcastToRooms(ioSockets, current.rooms, `🥲 ماحدش جه يتجلد.. التحدي انتهى بلا ضحايا.`);
                resetDuel();
            }
        }, 30000);

        return;
    }

    if (duelData.player1.username === sender) {
        return socket.send(JSON.stringify(createRoomMessage(room, `❌ ماينفعش تجلد نفسك يا نجم.`)));
    }

    if (duelData.player2) {
        return socket.send(JSON.stringify(createRoomMessage(room, `⛔ في حد اتجلد خلاص، استنى الجولة الجاية.`)));
    }

    duelData.player2 = { username: sender, userId };
    if (!duelData.rooms.includes(room)) duelData.rooms.push(room);
    cooldowns[userId] = now;
    saveCooldowns(cooldowns);

    const players = [duelData.player1.username, duelData.player2.username];
    const winner = players[Math.floor(Math.random() * 2)];
    const loser = players.find(name => name !== winner);
    const prizePoints = 100000;

    try { addPoints(winner, prizePoints); } catch {}

    const jokes = [
        `😂 الجلد كان صوتو مسموع!`,
        `🤣 الضحية طلبت صباع صلح!`,
        `🥵 التحدي سخن جدًا!`,
        `🩹 محتاجين إسعاف للضحية حالًا!`
    ];
    const funnyComment = jokes[Math.floor(Math.random() * jokes.length)];

    const resultMsg = `🪓 ${duelData.player1.username} VS ${duelData.player2.username}
🏆 الفائز بالجلدة: ${winner} (+${prizePoints.toLocaleString()} نقطة)
😖 المجلووود: ${loser}

${funnyComment}`;

    const leaderboard = loadLeaderboard();
    leaderboard[winner] = (leaderboard[winner] || 0) + 1;
    saveLeaderboard(leaderboard);

    const sortedLeaders = Object.entries(leaderboard)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, wins], i) => `#${i + 1} - ${name} | 🪢 الجلدات: ${wins}`)
        .join('\n');

    const randomImage = whipImages[Math.floor(Math.random() * whipImages.length)];

    duelData.rooms.forEach(roomName => {
        const sock = ioSockets[roomName];
        if (sock && sock.readyState === 1) {
            // sock.send(JSON.stringify(createMainImageMessage(roomName, randomImage)));
            sock.send(JSON.stringify(createRoomMessage(roomName, resultMsg)));
            sock.send(JSON.stringify(createRoomMessage(roomName, `📊 ترتيب الجلادين:
${sortedLeaders}`)));
        }
    });

    duelData.isActive = false;
    duelData.result = { winner };
    saveDuelData(duelData);
    resetDuel();
}

module.exports = {
    handleWhipCommand,
    resetDuel
};

const fs = require('fs');
const path = require('path');
const { createRoomMessage, createMainImageMessage } = require('../messageUtils');
const { addPoints, loadRooms, isUserBlocked, isUserVerified } = require('../fileUtils');

// المسارات
const duelFilePath = path.join(__dirname, '../data/swordShieldDuel.json');
const leaderboardFilePath = path.join(__dirname, '../data/swordShieldLeaderboard.json');
const cooldownFilePath = path.join(__dirname, '../data/swordShieldCooldowns.json');

// مدة الانتظار بين المشاركات (5 دقائق)
const COOLDOWN_DURATION = 5 * 60 * 1000;

// صور المبارزة
const duelImages = [
    'https://i.pinimg.com/736x/49/35/9e/49359e810437b0e0ced86f673406086c.jpg',
    'https://i.pinimg.com/736x/e0/9a/f9/e09af90cfdbb789875c6ff06f731468c.jpg',
    'https://i.pinimg.com/736x/e0/9a/f9/e09af90cfdbb789875c6ff06f731468c.jpg'
];

// أدوات التعامل مع JSON
function loadJsonFile(filePath, defaultValue = {}) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    }
    return JSON.parse(fs.readFileSync(filePath));
}

function saveJsonFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getInitialDuelData() {
    return {
        isActive: false,
        player1: null,
        player2: null,
        startedAt: null,
        rooms: [],
        result: null
    };
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

function handleSwordCommand(data, socket, ioSockets) {
    const sender = data.from;
    const room = data.room;
    const userId = data.userId || sender;
    const now = Date.now();

if (isUserBlocked(sender)) {
    socket.send(JSON.stringify(createRoomMessage(room, `🚫 You are blocked.`)));
    return;
}

if (!isUserVerified(sender)) {
    socket.send(JSON.stringify(createRoomMessage(room, `⚠️ Only verified users can start this challenge.`)));
    return;
}


    const cooldowns = loadCooldowns();
    if (cooldowns[userId] && now - cooldowns[userId] < COOLDOWN_DURATION) {
        const remaining = Math.ceil((COOLDOWN_DURATION - (now - cooldowns[userId])) / 1000);
socket.send(JSON.stringify(createRoomMessage(room, `⏳ انتظر ${remaining} ثانية قبل بدء تحدٍ جديد.`)));
        return;
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

broadcastToAllRooms(ioSockets, `⚔️ ${sender} رفع سيفه! أول من يكتب "درع" خلال 30 ثانية سينضم للتحدي!`);

        setTimeout(() => {
            const current = loadDuelData();
            if (current.isActive && !current.player2) {
broadcastToRooms(ioSockets, current.rooms, `⏰ لم ينضم أحد للتحدي. انتهت الجولة تلقائيًا.`);
                resetDuel();
            }
        }, 30000);

        return;
    }

    // الرد بكلمة "درع"
if (duelData.player1.username === sender) {
    socket.send(JSON.stringify(createRoomMessage(room, `❌ لا يمكنك التحدي ضد نفسك.`)));
    return;
}

if (duelData.player2) {
    socket.send(JSON.stringify(createRoomMessage(room, `❌ تم ملء التحدي بالفعل.`)));
    return;
}

    duelData.player2 = { username: sender, userId };
    if (!duelData.rooms.includes(room)) duelData.rooms.push(room);

    cooldowns[userId] = now;
    saveCooldowns(cooldowns);

    const players = [duelData.player1.username, duelData.player2.username];
    const winner = players[Math.floor(Math.random() * 2)];
    const loser = players.find(p => p !== winner);
    const prizePoints = 100000;

    try {
        addPoints(winner, prizePoints);
    } catch {}

const resultMsg = `⚔️ ${duelData.player1.username} VS ${duelData.player2.username}
🏆 الفائز في معركة السيف والدرع: ${winner} (+${prizePoints.toLocaleString()} نقطة)
🔰 الخاسر: ${loser}`;

    duelData.result = { winner };
    duelData.isActive = false;

    const leaderboard = loadLeaderboard();
    leaderboard[winner] = (leaderboard[winner] || 0) + 1;
    saveLeaderboard(leaderboard);

 const sortedLeaders = Object.entries(leaderboard)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, wins], i) => `#${i + 1} - ${name} | 🛡️ الفوز: ${wins}`)
    .join('\n');


    const randomImage = duelImages[Math.floor(Math.random() * duelImages.length)];

    duelData.rooms.forEach(roomName => {
        const socket = ioSockets[roomName];
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify(createMainImageMessage(roomName, randomImage)));
            socket.send(JSON.stringify(createRoomMessage(roomName, resultMsg)));
            socket.send(JSON.stringify(createRoomMessage(roomName, `📊 أفضل المحاربين:\n${sortedLeaders}`)));
        }
    });

    saveDuelData(duelData);
    resetDuel();
}

module.exports = {
    handleSwordCommand,
    resetDuel
}; 
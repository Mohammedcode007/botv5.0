const fs = require('fs');
const path = require('path');
const { createRoomMessage, createMainImageMessage } = require('../messageUtils');
const { addPoints, loadRooms, isUserBlocked, isUserVerified } = require('../fileUtils');

// المسارات
const duelFilePath = path.join(__dirname, '../data/slapDuel.json');
const leaderboardFilePath = path.join(__dirname, '../data/slapLeaderboard.json');
const cooldownFilePath = path.join(__dirname, '../data/slapCooldowns.json');

// المدة المسموح بها بين المشاركات (5 دقائق)
const COOLDOWN_DURATION = 5 * 60 * 1000;

// صور الصفعة
const slapImages = [
    'https://i.pinimg.com/736x/a3/43/8e/a3438e4cccc1d98f18d857daf48cc6b9.jpg',
    'https://i.pinimg.com/736x/54/7e/fd/547efddc4da620c88f02dd4c9cef19f4.jpg',
    'https://i.pinimg.com/736x/96/80/21/9680219a8fada0ebe3da1d588966c191.jpg',
    'https://i.pinimg.com/736x/08/ff/7c/08ff7c3cc92460b43fa7f29df40e6049.jpg',
    'https://i.pinimg.com/736x/c8/fd/8b/c8fd8b743859d95fd43ee17cfe1b8652.jpg'
];

// أدوات ملفات JSON
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
        if (roomData?.gamesEnabled === false) return; // تجاهل الغرف المعطّلة للألعاب
        const socket = ioSockets[roomName];
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify(createRoomMessage(roomName, message)));
        }
    });
}

function broadcastToAllRooms(ioSockets, message) {
    const rooms = loadRooms();
    rooms.forEach(room => {
        const roomName = room.roomName || room;
                if (room.gamesEnabled === false) return; // تجاهل الغرف المعطّلة للألعاب

        const socket = ioSockets[roomName];
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify(createRoomMessage(roomName, message)));
        }
    });
}

function handleSlapCommand(data, socket, ioSockets) {
    const sender = data.from;
    if (isUserBlocked(data.from)) {
    const msg = `🚫 You are blocked.`;
    socket.send(JSON.stringify(createRoomMessage(data.room, msg)));
    return;
}

if (!isUserVerified(data.from)) {
    const msg = `⚠️ Sorry, this action is restricted to verified users only. Please contact the administration for further assistance.`;
    socket.send(JSON.stringify(createRoomMessage(data.room, msg)));
    return;
}
console.log('667777788888');

    const room = data.room;
    const userId = data.userId || sender;
    const now = Date.now();

    const cooldowns = loadCooldowns();
    if (cooldowns[userId] && now - cooldowns[userId] < COOLDOWN_DURATION) {
        const remaining = Math.ceil((COOLDOWN_DURATION - (now - cooldowns[userId])) / 1000);
        socket.send(JSON.stringify(createRoomMessage(room, `⏳ يجب الانتظار ${remaining} ثانية قبل المشاركة مجددًا في تحدي الصفعة.`)));
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

        broadcastToAllRooms(ioSockets, `🖐️ ${sender} بدأ تحدي الصفعة! أول من يكتب "صفعة" خلال 30 ثانية سينضم.`);

        setTimeout(() => {
            const current = loadDuelData();
            if (current.isActive && !current.player2) {
                broadcastToRooms(ioSockets, current.rooms, `⏰ لم ينضم أحد لتحدي الصفعة. انتهت الجولة.`);
                resetDuel();
            }
        }, 30000);

        return;
    }

    if (duelData.player1.username === sender) {
        socket.send(JSON.stringify(createRoomMessage(room, `❌ لا يمكنك تحدي نفسك.`)));
        return;
    }

    if (duelData.player2) {
        socket.send(JSON.stringify(createRoomMessage(room, `❌ التحدي مكتمل بالفعل.`)));
        return;
    }

    duelData.player2 = { username: sender, userId };
    if (!duelData.rooms.includes(room)) duelData.rooms.push(room);

    cooldowns[userId] = now;
    saveCooldowns(cooldowns);

    // تحديد الفائز عشوائيًا
    const players = [duelData.player1.username, duelData.player2.username];
    const winner = players[Math.floor(Math.random() * 2)];
    const loser = players.find(name => name !== winner);
    const prizePoints = 500000;

    try {
        addPoints(winner, prizePoints);
    } catch {}

    const resultMsg = `💥 ${duelData.player1.username} VS ${duelData.player2.username}\n🏆 الفائز بالصفعة: ${winner} (+${prizePoints.toLocaleString()} نقطة)\n😵 الضحية: ${loser}`;

    duelData.result = { winner };
    duelData.isActive = false;

    // تحديث الترتيب
    const leaderboard = loadLeaderboard();
    leaderboard[winner] = (leaderboard[winner] || 0) + 1;
    saveLeaderboard(leaderboard);

    // ترتيب العشرة الأوائل
    const sortedLeaders = Object.entries(leaderboard)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, wins], i) => `#${i + 1} - ${name} | 👋 الفوز: ${wins}`)
        .join('\n');

    const randomImage = slapImages[Math.floor(Math.random() * slapImages.length)];

    duelData.rooms.forEach(roomName => {
        const socket = ioSockets[roomName];
        if (socket && socket.readyState === 1) {
            const imageMessage = createMainImageMessage(roomName, randomImage);
            socket.send(JSON.stringify(imageMessage));
            socket.send(JSON.stringify(createRoomMessage(roomName, resultMsg)));
            socket.send(JSON.stringify(createRoomMessage(roomName, `📊 أقوى الصفّاعين:\n${sortedLeaders}`)));
        }
    });

    saveDuelData(duelData);
    resetDuel();
}

module.exports = {
    handleSlapCommand,
    resetDuel
};

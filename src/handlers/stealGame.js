const fs = require('fs');
const path = require('path');
const { createRoomMessage, createMainImageMessage } = require('../messageUtils');
const { addPoints, removePoints, loadRooms, isUserBlocked, isUserVerified } = require('../fileUtils');

const duelFilePath = path.join(__dirname, '../data/stealDuel.json');
const leaderboardFilePath = path.join(__dirname, '../data/stealLeaderboard.json');
const cooldownFilePath = path.join(__dirname, '../data/stealCooldown.json'); // ✅ ملف التبريد

// أدوات الملف
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
        room: null,
        rooms: [],
        startedAt: null,
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

function loadCooldown() {
    return loadJsonFile(cooldownFilePath, { lastStartedAt: 0 });
}

function saveCooldown(data) {
    saveJsonFile(cooldownFilePath, data);
}

function sendToRoom(ioSockets, roomName, message) {
    const rooms = loadRooms();
    const roomData = rooms.find(r => r.roomName === roomName);
    if (roomData?.gamesEnabled === false) return;
    const socket = ioSockets[roomName];
    if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify(createRoomMessage(roomName, message)));
    }
}

function sendToRooms(ioSockets, roomNames, message) {
    for (const room of roomNames) {
        sendToRoom(ioSockets, room, message);
    }
}

function sendImageToRoom(ioSockets, roomName, imageUrl, caption) {
    const rooms = loadRooms();
    const roomData = rooms.find(r => r.roomName === roomName);
    if (roomData?.gamesEnabled === false) return;
    const socket = ioSockets[roomName];
    if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify(createMainImageMessage(roomName, imageUrl, caption)));
    }
}

function sendImageToRooms(ioSockets, roomNames, imageUrl, caption) {
    for (const room of roomNames) {
        sendImageToRoom(ioSockets, room, imageUrl, caption);
    }
}

function broadcastToAllRooms(ioSockets, message) {
    const rooms = loadRooms();
    for (const room of rooms) {
        if (room.gamesEnabled === false) continue;
        const socket = ioSockets[room.roomName];
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify(createRoomMessage(room.roomName, message)));
        }
    }
}

// تنفيذ لعبة السرقة
function handleStealCommand(data, socket, ioSockets) {
    const sender = data.from;
    const room = data.room;
    const userId = data.userId || sender;
    const body = data.body.trim();

    if (isUserBlocked(sender)) {
        socket.send(JSON.stringify(createRoomMessage(room, `🚫 تم حظرك من استخدام الألعاب.`)));
        return;
    }

    if (!isUserVerified(sender)) {
        socket.send(JSON.stringify(createRoomMessage(room, `⚠️ هذه الميزة متاحة للمستخدمين الموثوقين فقط.`)));
        return;
    }

    const duelData = loadDuelData();
    const cooldownData = loadCooldown();
    const now = Date.now();

    const cooldownDuration = 5 * 60 * 1000; // ✅ 5 دقائق
    const timeSinceLast = now - cooldownData.lastStartedAt;

    // ✅ بداية اللعبة
    if (!duelData.isActive) {
        if (body === 'سرقة' || body === 'سرقه') {
            if (timeSinceLast < cooldownDuration) {
                const remaining = Math.ceil((cooldownDuration - timeSinceLast) / 1000);
                socket.send(JSON.stringify(createRoomMessage(room, `⏳ الرجاء الانتظار ${remaining} ثانية قبل بدء محاولة جديدة.`)));
                return;
            }

            duelData.isActive = true;
            duelData.player1 = { username: sender, userId };
            duelData.room = room;
            duelData.rooms = [room];
            duelData.startedAt = now;
            saveDuelData(duelData);

            cooldownData.lastStartedAt = now; // ⏱️ تحديث وقت البدء الأخير
            saveCooldown(cooldownData);

            const caption = `🕵️‍♂️ ${sender} يحاول تنفيذ عملية سرقة! من يتصدى له؟ أكتب "سرقة" خلال 30 ثانية للتصدي.`;
            broadcastToAllRooms(ioSockets, caption);

            setTimeout(() => {
                const check = loadDuelData();
                if (check.isActive && !check.player2) {
                    sendToRooms(ioSockets, check.rooms, `⌛ لم يتدخل أحد لإيقاف ${check.player1.username}. تم إحباط المحاولة تلقائيًا.`);
                    resetDuel();
                }
            }, 30000);
        }
        return;
    }

    if (duelData.player1.username === sender) {
        socket.send(JSON.stringify(createRoomMessage(room, `❌ لا يمكنك سرقة نفسك!`)));
        return;
    }

    if (duelData.player2) return;

    if (body === 'سرقة' || body === 'سرقه') {
        duelData.player2 = { username: sender, userId };
        if (!duelData.rooms.includes(room)) duelData.rooms.push(room);
        saveDuelData(duelData);

        const outcome = Math.random();
        const winner = outcome < 0.5 ? duelData.player1 : duelData.player2;
        const loser = outcome < 0.5 ? duelData.player2 : duelData.player1;

        const winPoints = 500000;
        const losePoints = 250000;

        try {
            addPoints(winner.username, winPoints);
            removePoints(loser.username, losePoints);
        } catch {}

        const resultMsg = `🔔 المواجهة:\n` +
            `💰 السارق: ${duelData.player1.username}\n` +
            `🛡️ الحارس: ${duelData.player2.username}\n\n` +
            `🏆 الفائز: ${winner.username} (+${winPoints})\n` +
            `💔 الخاسر: ${loser.username} (-${losePoints})`;

        const resultImage = 'https://i.pinimg.com/736x/e0/73/3e/e0733e7f03d8a4242e51b682cdd0cbe2.jpg';

        sendImageToRooms(ioSockets, duelData.rooms, resultImage, resultMsg);

        const leaderboard = loadLeaderboard();
        leaderboard[winner.username] = (leaderboard[winner.username] || 0) + 1;
        saveLeaderboard(leaderboard);

        const topPlayers = Object.entries(leaderboard)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, score], i) => `#${i + 1} - ${name} | 🥇 الانتصارات: ${score}`)
            .join('\n');

        sendToRooms(ioSockets, duelData.rooms, `📊 ترتيب أفضل اللصوص:\n${topPlayers}`);

        resetDuel();
    }
}

module.exports = {
    handleStealCommand,
    resetDuel,
};

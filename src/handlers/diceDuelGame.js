

const fs = require('fs');
const path = require('path');
const { createRoomMessage } = require('../messageUtils');
const { addPoints, loadRooms } = require('../fileUtils');

// مسارات الملفات
const duelFilePath = path.join(__dirname, '../data/diceDuel.json');
const cooldownFilePath = path.join(__dirname, '../data/diceCooldowns.json');
const leaderboardFilePath = path.join(__dirname, '../data/diceDuelLeaderboard.json');
const COOLDOWN_DURATION = 5 * 60 * 1000; // 5 دقائق = 300,000 ملي ثانية

// أدوات JSON
function loadJsonFile(filePath, defaultValue = {}) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    }
    return JSON.parse(fs.readFileSync(filePath));
}

function saveJsonFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// بيانات المبارزة
function getInitialDuelData() {
    return {
        isActive: false,
        player1: { username: null, userId: null, roll: null, wins: 0 },
        player2: { username: null, userId: null, roll: null, wins: 0 },
        startedAt: null,
        rooms: [],
        result: { winner: null, status: "waiting" },
        lastPlayed: Date.now()
    };
}

function loadDuelData() {
    return loadJsonFile(duelFilePath, getInitialDuelData());
}

function saveDuelData(data) {
    saveJsonFile(duelFilePath, data);
}

function resetDuel() {
    const newData = getInitialDuelData();
    saveDuelData(newData);
}

// التهدئة
function loadCooldowns() {
    return loadJsonFile(cooldownFilePath, {});
}

function saveCooldowns(data) {
    saveJsonFile(cooldownFilePath, data);
}

// الترتيب
function loadLeaderboard() {
    return loadJsonFile(leaderboardFilePath, {});
}

function saveLeaderboard(data) {
    saveJsonFile(leaderboardFilePath, data);
}

// إرسال إلى الغرف
function broadcastToRooms(ioSockets, roomNames, message) {
    roomNames.forEach(roomName => {
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
        const socket = ioSockets[roomName];
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify(createRoomMessage(roomName, message)));
        }
    });
}

// تشغيل التحدي
function handleDiceDuelCommand(data, socket, ioSockets) {
    const sender = data.from;
    const room = data.room;
    const userId = data.userId || sender;
    const now = Date.now();

    const cooldowns = loadCooldowns();
 if (cooldowns[sender] && now - cooldowns[sender] < COOLDOWN_DURATION) {
    const remaining = Math.ceil((COOLDOWN_DURATION - (now - cooldowns[sender])) / 1000);
    socket.send(JSON.stringify(createRoomMessage(room, `⏳ يجب الانتظار ${remaining} ثانية قبل أن تشارك مجددًا.`)));
    return;
}

    let duelData = loadDuelData();

    if (!duelData.isActive) {
        duelData.isActive = true;
        duelData.player1 = { username: sender, userId, roll: null, wins: 0 };
        duelData.startedAt = now;
        duelData.rooms = [room];
        duelData.result = { winner: null, status: "waiting" };
        duelData.lastPlayed = now;
        cooldowns[sender] = now;

        saveDuelData(duelData);
        saveCooldowns(cooldowns);

        broadcastToAllRooms(ioSockets, `🎯 ${sender} بدأ تحدي نرد! أول من يكتب "نرد" سينضم له خلال 60 ثانية.`);

        setTimeout(() => {
            const check = loadDuelData();
            if (check.isActive && !check.player2.username) {
                broadcastToRooms(ioSockets, check.rooms, `⏰ لم ينضم أحد لتحدي النرد. انتهت الجولة تلقائياً.`);
                resetDuel();
            }
        }, 60000);

        return;
    }

    if (duelData.player1.username === sender) {
        socket.send(JSON.stringify(createRoomMessage(room, `❌ لا يمكنك التحدي ضد نفسك.`)));
        return;
    }

    if (duelData.player2.username) {
        socket.send(JSON.stringify(createRoomMessage(room, `❌ يوجد تحدي نرد جارٍ بالفعل.`)));
        return;
    }

    duelData.player2 = { username: sender, userId, roll: null, wins: 0 };
    if (!duelData.rooms.includes(room)) duelData.rooms.push(room);
    cooldowns[sender] = now;
    duelData.lastPlayed = now;
    saveCooldowns(cooldowns);

    const roll1 = Math.floor(Math.random() * 6) + 1;
    const roll2 = Math.floor(Math.random() * 6) + 1;

    duelData.player1.roll = roll1;
    duelData.player2.roll = roll2;

    let resultMsg = `🎲 ${duelData.player1.username} رمى: ${roll1}\n🎲 ${duelData.player2.username} رمى: ${roll2}\n`;

    let winner = null;
    const prizePoints = 1000000;

    if (roll1 > roll2) {
        winner = duelData.player1.username;
        duelData.player1.wins += 1;
        try { addPoints(winner, prizePoints); } catch {}
        resultMsg += `🏆 الفائز: ${winner} (+${prizePoints.toLocaleString()} نقطة)`;
    } else if (roll2 > roll1) {
        winner = duelData.player2.username;
        duelData.player2.wins += 1;
        try { addPoints(winner, prizePoints); } catch {}
        resultMsg += `🏆 الفائز: ${winner} (+${prizePoints.toLocaleString()} نقطة)`;
    } else {
        resultMsg += `🤝 تعادل! لا نقاط.`;
    }

    duelData.result = { winner: winner, status: winner ? 'completed' : 'draw' };
    duelData.isActive = false;

    // تحديث الترتيب في الملف المنفصل
    if (winner) {
        const leaderboard = loadLeaderboard();
        leaderboard[winner] = (leaderboard[winner] || 0) + 1;
        saveLeaderboard(leaderboard);

        const sortedLeaders = Object.entries(leaderboard)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([username, wins], i) => `#${i + 1} - ${username} | 🏆 الفوز: ${wins}`)
            .join('\n');

        broadcastToRooms(ioSockets, duelData.rooms, resultMsg);
        broadcastToRooms(ioSockets, duelData.rooms, `📊 أفضل 10 لاعبين في تحديات النرد:\n${sortedLeaders}`);
    } else {
        broadcastToRooms(ioSockets, duelData.rooms, resultMsg);
    }

    saveDuelData(duelData);
    resetDuel();
}

module.exports = {
    handleDiceDuelCommand,
    resetDuel
};

const fs = require('fs');
const path = require('path');
const { createRoomMessage } = require('../messageUtils');
const { addPoints, loadRooms, isUserBlocked, isUserVerified } = require('../fileUtils');

// ملفات البيانات
const duelFilePath = path.join(__dirname, '../data/swordShieldDuel.json');
const cooldownFilePath = path.join(__dirname, '../data/swordShieldCooldowns.json');
const leaderboardFilePath = path.join(__dirname, '../data/swordShieldLeaderboard.json');

// أدوات قراءة وكتابة الملفات
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
        player1: { username: null, userId: null, choice: null, wins: 0 },
        player2: { username: null, userId: null, choice: null, wins: 0 },
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

// ترتيب اللاعبين
function loadLeaderboard() {
    return loadJsonFile(leaderboardFilePath, {});
}

function saveLeaderboard(data) {
    saveJsonFile(leaderboardFilePath, data);
}

// التهدئة
function loadCooldowns() {
    return loadJsonFile(cooldownFilePath, {});
}

function saveCooldowns(data) {
    saveJsonFile(cooldownFilePath, data);
}

// إعادة تعيين المبارزة دون حذف الترتيب
function resetDuel() {
    const duelData = getInitialDuelData();
    saveDuelData(duelData);
}

// إرسال رسالة لغرف محددة
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

// إرسال رسالة لكل الغرف
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

// تنفيذ أمر سيف ودرع
function handleSwordShieldCommand(data, socket, ioSockets) {
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

    const room = data.room;
    const userId = data.userId || sender;
    const body = data.body.trim();
    const now = Date.now();
const COOLDOWN_DURATION = 5 * 60 * 1000; // 5 دقائق = 300,000 ملي ثانية

    const cooldowns = loadCooldowns();
 if (cooldowns[sender] && now - cooldowns[sender] < COOLDOWN_DURATION) {
    const remaining = Math.ceil((COOLDOWN_DURATION - (now - cooldowns[sender])) / 1000);
    socket.send(JSON.stringify(createRoomMessage(room, `⏳ يجب الانتظار ${remaining} ثانية قبل أن تشارك مجددًا.`)));
    return;
}

    let duelData = loadDuelData();

    if (!duelData.isActive) {
        if (body === 'سيف') {
            duelData.isActive = true;
            duelData.player1 = { username: sender, userId, choice: 'sword', wins: 0 };
            duelData.startedAt = now;
            duelData.rooms = [room];
            duelData.result = { winner: null, status: "waiting" };
            duelData.lastPlayed = now;
            cooldowns[sender] = now;

            saveDuelData(duelData);
            saveCooldowns(cooldowns);

            broadcastToAllRooms(ioSockets, `⚔️ ${sender} بدأ لعبة السيف والدرع! أول من يكتب "درع" خلال 60 ثانية سينضم.`);

            setTimeout(() => {
                const check = loadDuelData();
                if (check.isActive && !check.player2.username) {
                    broadcastToRooms(ioSockets, check.rooms, `⏰ لم ينضم أحد للعبة. انتهت الجولة تلقائياً.`);
                    resetDuel();
                }
            }, 60000);
        }
        return;
    }

    if (duelData.player1.username === sender) {
        socket.send(JSON.stringify(createRoomMessage(room, `❌ لا يمكنك اللعب ضد نفسك.`)));
        return;
    }

    if (duelData.player2.username || duelData.player1.choice !== 'sword' || body !== 'درع') {
        return;
    }

    duelData.player2 = { username: sender, userId, choice: 'shield', wins: 0 };
    if (!duelData.rooms.includes(room)) duelData.rooms.push(room);
    cooldowns[sender] = now;
    duelData.lastPlayed = now;

    saveCooldowns(cooldowns);

    const outcome = Math.random();
    let resultMsg = `⚔️ ${duelData.player1.username} اختار: سيف\n🛡️ ${duelData.player2.username} اختار: درع\n`;
    let winner = null;

    if (outcome < 0.5) {
        winner = duelData.player1.username;
        duelData.player1.wins++;
        try { addPoints(winner, 1000000); } catch {}
        resultMsg += `🏆 السيف اخترق الدرع! الفائز: ${winner} (+1,000,000 نقطة)`;
    } else {
        winner = duelData.player2.username;
        duelData.player2.wins++;
        try { addPoints(winner, 1000000); } catch {}
        resultMsg += `🛡️ الدرع صد السيف! الفائز: ${winner} (+1,000,000 نقطة)`;
    }

    duelData.result = { winner, status: winner ? 'completed' : 'draw' };
    duelData.isActive = false;
    saveDuelData(duelData);

    // حفظ الترتيب
    const leaderboard = loadLeaderboard();
    if (winner) {
        leaderboard[winner] = (leaderboard[winner] || 0) + 1;
        saveLeaderboard(leaderboard);
    }

    broadcastToRooms(ioSockets, duelData.rooms, resultMsg);

    // عرض الترتيب
    const sortedLeaders = Object.entries(leaderboard)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([username, wins], i) => `#${i + 1} - ${username} | 🏆 الفوز: ${wins}`)
        .join('\n');

    broadcastToRooms(ioSockets, duelData.rooms, `📊 ترتيب أفضل اللاعبين:\n${sortedLeaders}`);

    resetDuel();
}

// تشغيل تلقائي عند الخمول
function checkIdleAndStart(ioSockets) {
    const duelData = loadDuelData();
    const now = Date.now();
    if (!duelData.isActive && now - duelData.lastPlayed >= 15 * 60 * 1000) {
        const dummyPlayer = '🤖 البوت';
        duelData.isActive = true;
        duelData.player1 = { username: dummyPlayer, userId: 'bot', choice: 'sword', wins: 0 };
        duelData.startedAt = now;
        duelData.rooms = [];
        duelData.result = { winner: null, status: "waiting" };
        duelData.lastPlayed = now;
        saveDuelData(duelData);

        broadcastToAllRooms(ioSockets, `⚔️ ${dummyPlayer} بدأ لعبة السيف والدرع! أول من يكتب "درع" خلال 60 ثانية سيتحدى البوت.`);

        setTimeout(() => {
            const check = loadDuelData();
            if (check.isActive && !check.player2.username) {
                broadcastToAllRooms(ioSockets, `⏰ لم ينضم أحد لتحدي البوت. انتهت الجولة تلقائياً.`);
                resetDuel();
            }
        }, 60000);
    }
}

module.exports = {
    handleSwordShieldCommand,
    resetDuel,
    checkIdleAndStart
};

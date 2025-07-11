const fs = require('fs');
const path = require('path');
const { createRoomMessage } = require('../messageUtils');
const { addPoints, loadRooms } = require('../fileUtils');

// المسارات
const duelFilePath = path.join(__dirname, '../data/coinDuel.json');
const cooldownFilePath = path.join(__dirname, '../data/coinCooldowns.json');
const leaderboardFilePath = path.join(__dirname, '../data/coinDuelLeaderboard.json');
const COOLDOWN_DURATION = 5 * 60 * 1000;

// أدوات JSON
function loadJsonFile(filePath, defaultValue = {}) {
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    return JSON.parse(fs.readFileSync(filePath));
}
function saveJsonFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
// الترتيب - تأكد أن هذا الكود موجود داخل الملف
function loadLeaderboard() {
    return loadJsonFile(leaderboardFilePath, {});
}
function saveLeaderboard(data) {
    saveJsonFile(leaderboardFilePath, data);
}

// بيانات التحدي
function getInitialDuelData() {
    return {
        isActive: false,
        player1: { username: null, userId: null, choice: null },
        player2: { username: null, userId: null, choice: null },
        rooms: [],
        result: { winner: null, coin: null },
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
    saveDuelData(getInitialDuelData());
}

// التهدئة
function loadCooldowns() {
    return loadJsonFile(cooldownFilePath, {});
}
function saveCooldowns(data) {
    saveJsonFile(cooldownFilePath, data);
}

// البث
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

// التنفيذ
function handleCoinDuelCommand(data, socket, ioSockets) {
    const sender = data.from;
    const room = data.room;
    const userId = data.userId || sender;
    const body = data.body.trim().toLowerCase();
    const now = Date.now();

    if (body !== 'ملك' && body !== 'كتابة') return;

    const cooldowns = loadCooldowns();
    if (cooldowns[sender] && now - cooldowns[sender] < COOLDOWN_DURATION) {
        const remaining = Math.ceil((COOLDOWN_DURATION - (now - cooldowns[sender])) / 1000);
        socket.send(JSON.stringify(createRoomMessage(room, `⏳ انتظر ${remaining} ثانية قبل المحاولة مرة أخرى.`)));
        return;
    }

    let duelData = loadDuelData();

    if (!duelData.isActive) {
        duelData.isActive = true;
        duelData.player1 = { username: sender, userId, choice: body };
        duelData.rooms = [room];
        duelData.lastPlayed = now;
        cooldowns[sender] = now;

        saveDuelData(duelData);
        saveCooldowns(cooldowns);

        broadcastToRooms(ioSockets, duelData.rooms, `🪙 ${sender} اختار "${body}". من سيقبل التحدي ويختار "${body === 'ملك' ? 'كتابة' : 'ملك'}"؟`);
        return;
    }

    if (duelData.player1.username === sender) {
        socket.send(JSON.stringify(createRoomMessage(room, `❌ لا يمكنك اللعب ضد نفسك.`)));
        return;
    }

    if (duelData.player2.username) {
        socket.send(JSON.stringify(createRoomMessage(room, `❌ يوجد تحدي جارٍ بالفعل.`)));
        return;
    }

    // تحقق من أن اللاعب الثاني يختار العكس
    const expectedChoice = duelData.player1.choice === 'ملك' ? 'كتابة' : 'ملك';
    if (body !== expectedChoice) {
        socket.send(JSON.stringify(createRoomMessage(room, `❌ يجب عليك اختيار "${expectedChoice}" لأن "${duelData.player1.username}" اختار "${duelData.player1.choice}".`)));
        return;
    }

    duelData.player2 = { username: sender, userId, choice: body };
    duelData.lastPlayed = now;
    cooldowns[sender] = now;

    // تنفيذ القرعة
    const coinResult = Math.random() < 0.5 ? 'ملك' : 'كتابة';
    const winner =
        duelData.player1.choice === coinResult
            ? duelData.player1.username
            : duelData.player2.username;

    const prizePoints = 1000000;
    try { addPoints(winner, prizePoints); } catch {}

    duelData.result = { coin: coinResult, winner };
    duelData.isActive = false;

    // ترتيب
    const leaderboard = loadLeaderboard();
    leaderboard[winner] = (leaderboard[winner] || 0) + 1;
    saveLeaderboard(leaderboard);

    const sorted = Object.entries(leaderboard)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, score], i) => `#${i + 1} - ${name} | 🏆 الفوز: ${score}`)
        .join('\n');

    const resultMsg = `🪙 النتيجة: ${coinResult}\n🎯 ${duelData.player1.username} اختار: ${duelData.player1.choice}\n🎯 ${duelData.player2.username} اختار: ${duelData.player2.choice}\n🏆 الفائز: ${winner} (+${prizePoints.toLocaleString()} نقطة)`;

    broadcastToRooms(ioSockets, duelData.rooms, resultMsg);
    broadcastToRooms(ioSockets, duelData.rooms, `📊 أفضل 10 لاعبين:\n${sorted}`);

    saveDuelData(duelData);
    saveCooldowns(cooldowns);
    resetDuel();
}

module.exports = {
    handleCoinDuelCommand,
    resetDuel
};

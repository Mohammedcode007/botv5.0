const fs = require('fs');
const path = require('path');
const { createRoomMessage } = require('../messageUtils');
const { addPoints, loadRooms, isUserBlocked, isUserVerified } = require('../fileUtils');

// المسارات
const duelFilePath = path.join(__dirname, '../data/spankDuel.json');
const cooldownFilePath = path.join(__dirname, '../data/spankCooldowns.json');
const leaderboardFilePath = path.join(__dirname, '../data/spankDuelLeaderboard.json');
const COOLDOWN_DURATION = 5 * 60 * 1000;

// أدوات JSON
function loadJsonFile(filePath, defaultValue = {}) {
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    return JSON.parse(fs.readFileSync(filePath));
}
function saveJsonFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// بيانات اللعبة
function getInitialDuelData() {
    return {
        isActive: false,
        player1: { username: null, userId: null, force: null, wins: 0 },
        player2: { username: null, userId: null, force: null, wins: 0 },
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
    saveDuelData(getInitialDuelData());
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

// إرسال الرسائل
function broadcastToRooms(ioSockets, roomNames, message) {
    const rooms = loadRooms();
    roomNames.forEach(roomName => {
        const room = rooms.find(r => r.roomName === roomName);
        if (room?.gamesEnabled === false) return;
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

// تشغيل اللعبة
function handleSpankDuelCommand(data, socket, ioSockets) {
    const sender = data.from;
    const room = data.room;
    const userId = data.userId || sender;
    const now = Date.now();

    if (isUserBlocked(sender)) {
        socket.send(JSON.stringify(createRoomMessage(room, `🚫 إبعد يا معاق، ممنوع عليك تلعب!`)));
        return;
    }

    if (!isUserVerified(sender)) {
        socket.send(JSON.stringify(createRoomMessage(room, `⚠️ لعبة السبـانك مش للي زيك، روح اتفعّل الأول وتعال.`)));
        return;
    }

    const cooldowns = loadCooldowns();
    if (cooldowns[sender] && now - cooldowns[sender] < COOLDOWN_DURATION) {
        const remaining = Math.ceil((COOLDOWN_DURATION - (now - cooldowns[sender])) / 1000);
        socket.send(JSON.stringify(createRoomMessage(room, `⏳ إهدى شوية، استنى ${remaining} ثانية قبل ما تدخل تاني.`)));
        return;
    }

    let duelData = loadDuelData();

    if (!duelData.isActive) {
        duelData.isActive = true;
        duelData.player1 = { username: sender, userId, force: null, wins: 0 };
        duelData.startedAt = now;
        duelData.rooms = [room];
        duelData.result = { winner: null, status: "waiting" };
        duelData.lastPlayed = now;
        cooldowns[sender] = now;

        saveDuelData(duelData);
        saveCooldowns(cooldowns);

        broadcastToAllRooms(ioSockets, `🍑 ${sender} دخل التحدي! أول واحد عنده الجرأة يكتب "سبانك" خلال 60 ثانية.`);

        setTimeout(() => {
            const check = loadDuelData();
            if (check.isActive && !check.player2.username) {
                broadcastToRooms(ioSockets, check.rooms, `😒 كله جبن؟ مفيش حد دخل التحدي، اتلغى.`)
                resetDuel();
            }
        }, 60000);
        return;
    }

    if (duelData.player1.username === sender) {
        socket.send(JSON.stringify(createRoomMessage(room, `❌ إنت هتسبّنك نفسك؟ في إيه!`)));
        return;
    }

    if (duelData.player2.username) {
        socket.send(JSON.stringify(createRoomMessage(room, `❌ في معركة سبـانك شغالة بالفعل، استنى دورك يا متحمس.`)));
        return;
    }

    duelData.player2 = { username: sender, userId, force: null, wins: 0 };
    if (!duelData.rooms.includes(room)) duelData.rooms.push(room);
    cooldowns[sender] = now;
    duelData.lastPlayed = now;
    saveCooldowns(cooldowns);

    const force1 = Math.floor(Math.random() * 100) + 1;
    const force2 = Math.floor(Math.random() * 100) + 1;

    duelData.player1.force = force1;
    duelData.player2.force = force2;

    let resultMsg = `🥵 ${duelData.player1.username} ضرب على الفخذ بقوة: ${force1}/100\n🥵 ${duelData.player2.username} ضرب على الفخذ بقوة: ${force2}/100\n`;

    let winner = null;
    const prizePoints = 88888;

    if (force1 > force2) {
        winner = duelData.player1.username;
        duelData.player1.wins += 1;
        try { addPoints(winner, prizePoints); } catch {}
        resultMsg += `🏆 يا ساتر! ${winner} نفّذ سبانك مدوِّي 🔥 (+${prizePoints.toLocaleString()} نقطة)`;
    } else if (force2 > force1) {
        winner = duelData.player2.username;
        duelData.player2.wins += 1;
        try { addPoints(winner, prizePoints); } catch {}
        resultMsg += `🏆 ${winner} ما رحمش خصمه! ضربة سبانك ساحقة 💥 (+${prizePoints.toLocaleString()} نقطة)`;
    } else {
        resultMsg += `🤝 التعادل! الاتنين ضربوا بنفس القوة.. ومفيش حد كسب.`;
    }

    duelData.result = { winner, status: winner ? 'completed' : 'draw' };
    duelData.isActive = false;

    if (winner) {
        const leaderboard = loadLeaderboard();
        leaderboard[winner] = (leaderboard[winner] || 0) + 1;
        saveLeaderboard(leaderboard);

        const sortedLeaders = Object.entries(leaderboard)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([username, wins], i) => `#${i + 1} - ${username} | 🍑 سبانكات: ${wins}`)
            .join('\n');

        broadcastToRooms(ioSockets, duelData.rooms, resultMsg);
        broadcastToRooms(ioSockets, duelData.rooms, `📊 أقوى 10 محترفين سبانك:\n${sortedLeaders}`);
    } else {
        broadcastToRooms(ioSockets, duelData.rooms, resultMsg);
    }

    saveDuelData(duelData);
    resetDuel();
}

module.exports = {
    handleSpankDuelCommand,
    resetDuel
};

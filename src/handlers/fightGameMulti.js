const fs = require('fs');
const path = require('path');
const { createRoomMessage } = require('../messageUtils');
const { addPoints, loadRooms } = require('../fileUtils');

const fightFilePath = path.join(__dirname, '../data/fightGameMulti.json');
const cooldownFilePath = path.join(__dirname, '../data/fightCooldowns.json');
const leaderboardFilePath = path.join(__dirname, '../data/fightLeaderboard.json');
const COOLDOWN_DURATION = 5 * 60 * 1000; // 5 دقائق

function loadJsonFile(filePath, defaultValue = {}) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    }
    return JSON.parse(fs.readFileSync(filePath));
}

function saveJsonFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getInitialFightData() {
    return {
        isActive: false,
        players: [], // [{ username, userId, power }]
        startedAt: null,
        rooms: [],
        result: { winner: null, status: "waiting" },
        lastPlayed: Date.now()
    };
}

function loadFightData() {
    return loadJsonFile(fightFilePath, getInitialFightData());
}

function saveFightData(data) {
    saveJsonFile(fightFilePath, data);
}

function resetFight() {
    const newData = getInitialFightData();
    saveFightData(newData);
}

function loadCooldowns() {
    return loadJsonFile(cooldownFilePath, {});
}

function saveCooldowns(data) {
    saveJsonFile(cooldownFilePath, data);
}

function loadLeaderboard() {
    return loadJsonFile(leaderboardFilePath, {});
}

function saveLeaderboard(data) {
    saveJsonFile(leaderboardFilePath, data);
}

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

function handleFightCommand(data, socket, ioSockets) {
    const sender = data.from;
    const room = data.room;
    const userId = data.userId || sender;
    const now = Date.now();

    const cooldowns = loadCooldowns();
    if (cooldowns[sender] && now - cooldowns[sender] < COOLDOWN_DURATION) {
        const remaining = Math.ceil((COOLDOWN_DURATION - (now - cooldowns[sender])) / 1000);
        socket.send(JSON.stringify(createRoomMessage(room, `🕒 انتظر ${remaining} ثانية قبل المشاركة مجددًا.`)));
        return;
    }

    let fightData = loadFightData();

    if (!fightData.isActive) {
        fightData = getInitialFightData();
        fightData.isActive = true;
        fightData.players.push({ username: sender, userId, power: null });
        fightData.startedAt = now;
        fightData.rooms = [room];
        cooldowns[sender] = now;
        fightData.lastPlayed = now;

        saveFightData(fightData);
        saveCooldowns(cooldowns);

        broadcastToAllRooms(ioSockets, `⚔️ ${sender} بدأ معركة! اكتب "قتال" للانضمام خلال 60 ثانية.`);

        setTimeout(() => {
            const updatedFight = loadFightData();
            if (!updatedFight.isActive || updatedFight.players.length < 2) {
                broadcastToRooms(ioSockets, updatedFight.rooms, `❌ لم ينضم عدد كافٍ من اللاعبين. تم إلغاء القتال.`);
                resetFight();
                return;
            }

            // توليد القوة لكل لاعب
            updatedFight.players = updatedFight.players.map(p => ({
                ...p,
                power: Math.floor(Math.random() * 100) + 1
            }));

            // ترتيب اللاعبين حسب القوة
            const sorted = [...updatedFight.players].sort((a, b) => b.power - a.power);
            const winner = sorted[0];
            const prizePoints = 1500000;

            let resultMsg = `🥊 نتائج المعركة:\n`;
            sorted.forEach(p => {
                resultMsg += `- ${p.username} ⚡ القوة: ${p.power}\n`;
            });

            resultMsg += `\n🏆 الفائز: ${winner.username} (+${prizePoints.toLocaleString()} نقطة)`;

            try { addPoints(winner.username, prizePoints); } catch {}

            updatedFight.result = { winner: winner.username, status: "completed" };
            updatedFight.isActive = false;
            saveFightData(updatedFight);

            // تحديث الترتيب
            const leaderboard = loadLeaderboard();
            leaderboard[winner.username] = (leaderboard[winner.username] || 0) + 1;
            saveLeaderboard(leaderboard);

            const sortedLeaders = Object.entries(leaderboard)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([username, wins], i) => `#${i + 1} - ${username} | 🏅 الانتصارات: ${wins}`)
                .join('\n');

            broadcastToRooms(ioSockets, updatedFight.rooms, resultMsg);
            broadcastToRooms(ioSockets, updatedFight.rooms, `📊 أفضل 10 مقاتلين:\n${sortedLeaders}`);

            resetFight();
        }, 60000);

        return;
    }

    const alreadyJoined = fightData.players.some(p => p.username === sender);
    if (alreadyJoined) {
        socket.send(JSON.stringify(createRoomMessage(room, `🚫 لقد انضممت بالفعل إلى هذه المعركة.`)));
        return;
    }

    fightData.players.push({ username: sender, userId, power: null });
    cooldowns[sender] = now;
    if (!fightData.rooms.includes(room)) fightData.rooms.push(room);

    saveFightData(fightData);
    saveCooldowns(cooldowns);

    socket.send(JSON.stringify(createRoomMessage(room, `✅ تم انضمامك بنجاح! انتظر حتى تبدأ المعركة.`)));
}

module.exports = {
    handleFightCommand,
    resetFight
};

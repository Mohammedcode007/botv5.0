const fs = require('fs');
const path = require('path');
const { createRoomMessage, createMainImageMessage } = require('../messageUtils');
const { addPoints, loadRooms } = require('../fileUtils');

const spitDuelFilePath = path.join(__dirname, '../data/spitDuel.json');
const spitLeaderboardFilePath = path.join(__dirname, '../data/spitLeaderboard.json');
const spitCooldownFilePath = path.join(__dirname, '../data/spitCooldowns.json');

const COOLDOWN_DURATION = 5 * 60 * 1000;

const spitImages = [
    'https://i.pinimg.com/736x/02/1d/80/021d80be15f9e46f40429cb06c02dbdf.jpg',
    'https://i.pinimg.com/736x/94/bd/0e/94bd0e3cd292f61b8fdaf3d88929e20a.jpg',
    'https://i.pinimg.com/736x/f6/ea/59/f6ea59a330f2f0bdb063fd2c8138f45a.jpg'
];

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
    return loadJsonFile(spitDuelFilePath, getInitialDuelData());
}

function saveDuelData(data) {
    saveJsonFile(spitDuelFilePath, data);
}

function resetDuel() {
    saveDuelData(getInitialDuelData());
}

function loadLeaderboard() {
    return loadJsonFile(spitLeaderboardFilePath, {});
}

function saveLeaderboard(data) {
    saveJsonFile(spitLeaderboardFilePath, data);
}

function loadCooldowns() {
    return loadJsonFile(spitCooldownFilePath, {});
}

function saveCooldowns(data) {
    saveJsonFile(spitCooldownFilePath, data);
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
        const roomName = room.roomName || room;
        if (room.gamesEnabled === false) return;
        const socket = ioSockets[roomName];
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify(createRoomMessage(roomName, message)));
        }
    });
}

function handleSpitCommand(data, socket, ioSockets) {
    const sender = data.from;
    const room = data.room;
    const userId = data.userId || sender;
    const now = Date.now();

    const cooldowns = loadCooldowns();
    if (cooldowns[userId] && now - cooldowns[userId] < COOLDOWN_DURATION) {
        const remaining = Math.ceil((COOLDOWN_DURATION - (now - cooldowns[userId])) / 1000);
        socket.send(JSON.stringify(createRoomMessage(room, `⏳ يجب الانتظار ${remaining} ثانية قبل المشاركة مجددًا في تحدي التف.`)));
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

        broadcastToAllRooms(ioSockets, `🤮 ${sender} بدأ تحدي التف! أول من يكتب "تف" خلال 30 ثانية سينضم.`);

        setTimeout(() => {
            const current = loadDuelData();
            if (current.isActive && !current.player2) {
                broadcastToRooms(ioSockets, current.rooms, "⏰ لم ينضم أحد لتحدي التف. انتهت الجولة.");
                resetDuel();
            }
        }, 30000);

        return;
    }

    if (duelData.player1.username === sender) {
        socket.send(JSON.stringify(createRoomMessage(room, "❌ لا يمكنك تحدي نفسك.")));
        return;
    }

    if (duelData.player2) {
        socket.send(JSON.stringify(createRoomMessage(room, "❌ التحدي مكتمل بالفعل.")));
        return;
    }

    duelData.player2 = { username: sender, userId };
    if (!duelData.rooms.includes(room)) duelData.rooms.push(room);

    cooldowns[userId] = now;
    saveCooldowns(cooldowns);

    const players = [duelData.player1.username, duelData.player2.username];
    const winner = players[Math.floor(Math.random() * 2)];
    const loser = players.find(name => name !== winner);
    const prizePoints = 300000;

    try {
        addPoints(winner, prizePoints);
    } catch {}

    const resultMsg = `🤮 ${duelData.player1.username} VS ${duelData.player2.username}\n🏆 الفائز في التحدي: ${winner} (+${prizePoints.toLocaleString()} نقطة)\n💔 الخاسر: ${loser}`;

    duelData.result = { winner };
    duelData.isActive = false;

    const leaderboard = loadLeaderboard();
    leaderboard[winner] = (leaderboard[winner] || 0) + 1;
    saveLeaderboard(leaderboard);

    const sortedLeaders = Object.entries(leaderboard)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, wins], i) => `#${i + 1} - ${name} | 🤮 الفوز: ${wins}`)
        .join('\n');

    const randomImage = spitImages[Math.floor(Math.random() * spitImages.length)];

    duelData.rooms.forEach(roomName => {
        const socket = ioSockets[roomName];
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify(createMainImageMessage(roomName, randomImage)));
            socket.send(JSON.stringify(createRoomMessage(roomName, resultMsg)));
            socket.send(JSON.stringify(createRoomMessage(roomName, `📊 أقوى المتفّين:\n${sortedLeaders}`)));
        }
    });

    saveDuelData(duelData);
    resetDuel();
}

module.exports = {
    handleSpitCommand,
    resetDuel
};

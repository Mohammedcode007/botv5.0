const fs = require('fs');
const path = require('path');
const { createRoomMessage } = require('../messageUtils');
const { loadRooms } = require('../fileUtils');

// المسارات
const bombSessionPath = path.join(__dirname, '../data/bombSession.json');
const leaderboardPath = path.join(__dirname, '../data/bombLeaderboard.json');
const choicesPath = path.join(__dirname, '../data/bombChoices.json');

// أدوات JSON
function loadJson(file, defaultValue = {}) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
    return JSON.parse(fs.readFileSync(file));
}

function saveJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ترتيب اللاعبين
function addWin(username) {
    const data = loadJson(leaderboardPath);
    data[username] = (data[username] || 0) + 1;
    saveJson(leaderboardPath, data);
}

function getLeaderboard() {
    const data = loadJson(leaderboardPath);
    return Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, wins], i) => `#${i + 1} - ${name}: 💣 ${wins} فوز`)
        .join('\n');
}

function broadcastToRooms(rooms, ioSockets, msg) {
    const allRooms = loadRooms();
    rooms.forEach(roomName => {
        const room = allRooms.find(r => r.roomName === roomName);
        if (room?.gamesEnabled === false) return;
        const socket = ioSockets[roomName];
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify(createRoomMessage(roomName, msg)));
        }
    });
}

// بدء القنبلة
function handleBombTrigger(data, socket, ioSockets) {
    const username = data.from;
    const room = data.room;

    let session = loadJson(bombSessionPath, { isActive: false });

    if (!session.isActive) {
        session = {
            isActive: true,
            player1: username,
            player2: null,
            rooms: [room]
        };
        saveJson(bombSessionPath, session);
        broadcastToRooms([room], ioSockets, `💣 ${username} أطلق قنبلة! ننتظر لاعبًا آخر...`);
        return;
    }

    if (session.player1 === username || session.player2 === username) {
        socket.send(JSON.stringify(createRoomMessage(room, `❗ أنت بالفعل مشارك.`)));
        return;
    }

    if (!session.player2) {
        session.player2 = username;
        if (!session.rooms.includes(room)) session.rooms.push(room);
        saveJson(bombSessionPath, session);

        const msg = `🔌 ${session.player1} و ${session.player2} في مواجهة!\nكل لاعب يرسل رقمًا (1 أو 2 أو 3) لفك القنبلة!`;

        broadcastToRooms(session.rooms, ioSockets, msg);
        saveJson(choicesPath, {});
    }
}

// استقبال رقم السلك
function handleBombChoice(data, socket, ioSockets) {
    const { from: username, room, body } = data;
    if (!['1', '2', '3'].includes(body)) return;

    const session = loadJson(bombSessionPath);
    if (!session.isActive || !session.player1 || !session.player2) return;

    if (![session.player1, session.player2].includes(username)) return;

    const choices = loadJson(choicesPath);
    if (choices[username]) return;

    choices[username] = body;
    saveJson(choicesPath, choices);

    const players = [session.player1, session.player2];
    if (players.every(p => choices[p])) {
        // تم الاختيار من الطرفين
        const winner = players[Math.floor(Math.random() * 2)];
        const loser = players.find(p => p !== winner);
        addWin(winner);

        const msg = `🎉 ${winner} فك القنبلة بنجاح!\n💥 ${loser} انفجرت به القنبلة!\n\n🏆 الترتيب:\n${getLeaderboard()}`;
        broadcastToRooms(session.rooms, ioSockets, msg);

        // إعادة التهيئة
        saveJson(bombSessionPath, { isActive: false });
        saveJson(choicesPath, {});
    }
}

module.exports = {
    handleBombTrigger,
    handleBombChoice
};

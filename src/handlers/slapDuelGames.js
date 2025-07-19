const fs = require('fs');
const path = require('path');
const { createRoomMessage, createMainImageMessage } = require('../messageUtils');
const { addPoints, loadRooms, isUserBlocked, isUserVerified } = require('../fileUtils');

const sessionPath = path.join(__dirname, '../data/bombGame.json');
const leaderboardPath = path.join(__dirname, '../data/bombLeaderboard.json');
const cooldownPath = path.join(__dirname, '../data/bombCooldown.json');

const COOLDOWN_DURATION = 5 * 60 * 1000;

const bombImages = [
    'https://i.pinimg.com/736x/c1/bb/7b/c1bb7b88b30789b93c03a578c77fdb7b.jpg',
    'https://i.pinimg.com/736x/af/86/6b/af866be47a511f75cb0b9d44c3c03e41.jpg'
];

function loadJson(file, def = {}) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(def, null, 2));
    return JSON.parse(fs.readFileSync(file));
}

function saveJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getInitialData() {
    return {
        isActive: false,
        player1: null,
        player2: null,
        rooms: [],
        result: null
    };
}

function broadcastToRooms(ioSockets, rooms, msg) {
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

function handleBombCommand(data, socket, ioSockets) {
    const sender = data.from;
    const room = data.room;
    const userId = data.userId || sender;
    const now = Date.now();

    if (isUserBlocked(sender)) {
        socket.send(JSON.stringify(createRoomMessage(room, `🚫 تم حظرك من المشاركة.`)));
        return;
    }

    if (!isUserVerified(sender)) {
        socket.send(JSON.stringify(createRoomMessage(room, `⚠️ فقط المستخدمين الموثقين يمكنهم اللعب.`)));
        return;
    }

    const cooldowns = loadJson(cooldownPath);
    if (cooldowns[userId] && now - cooldowns[userId] < COOLDOWN_DURATION) {
        const remaining = Math.ceil((COOLDOWN_DURATION - (now - cooldowns[userId])) / 1000);
        socket.send(JSON.stringify(createRoomMessage(room, `⏳ انتظر ${remaining} ثانية قبل المحاولة مرة أخرى.`)));
        return;
    }

    let session = loadJson(sessionPath, getInitialData());

    if (!session.isActive) {
        session.isActive = true;
        session.player1 = { username: sender, userId };
        session.rooms = [room];
        saveJson(sessionPath, session);
        cooldowns[userId] = now;
        saveJson(cooldownPath, cooldowns);

        broadcastToRooms(ioSockets, loadRooms().map(r => r.roomName), `💣 ${sender} أطلق قنبلة!\n✋ للانضمام أرسل "قنبله" أو "قنبلة"!`);

        // مؤقت لإلغاء القنبلة إذا لم ينضم أحد
        setTimeout(() => {
            const current = loadJson(sessionPath);
            if (current.isActive && !current.player2) {
                broadcastToRooms(ioSockets, current.rooms, `⏰ لم ينضم أحد. تم إلغاء القنبلة تلقائيًا.`);
                saveJson(sessionPath, getInitialData());
            }
        }, 30000);

        return;
    }

    if (session.player1.username === sender) {
        socket.send(JSON.stringify(createRoomMessage(room, `❌ لا يمكنك اللعب ضد نفسك.`)));
        return;
    }

    if (session.player2) {
        socket.send(JSON.stringify(createRoomMessage(room, `❌ القنبلة مفعّلة بالفعل بين لاعبين.`)));
        return;
    }

    session.player2 = { username: sender, userId };
    if (!session.rooms.includes(room)) session.rooms.push(room);

    cooldowns[userId] = now;
    saveJson(cooldownPath, cooldowns);

    const players = [session.player1.username, session.player2.username];
    const winner = players[Math.floor(Math.random() * 2)];
    const loser = players.find(p => p !== winner);
    const prizePoints = 50000;

    try {
        addPoints(winner, prizePoints);
    } catch {}

    const msg = `💣 ${session.player1.username} vs ${session.player2.username}\n🏆 الناجي من القنبلة: ${winner} (+${prizePoints.toLocaleString()} نقطة)\n💥 الخاسر: ${loser}`;
    const image = bombImages[Math.floor(Math.random() * bombImages.length)];

    // تحديث الترتيب
    const leaderboard = loadJson(leaderboardPath);
    leaderboard[winner] = (leaderboard[winner] || 0) + 1;
    saveJson(leaderboardPath, leaderboard);

    const top = Object.entries(leaderboard)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, score], i) => `#${i + 1} - ${name}: 💣 ${score} فوز`)
        .join('\n');

    session.rooms.forEach(r => {
        const sock = ioSockets[r];
        if (sock && sock.readyState === 1) {
            sock.send(JSON.stringify(createMainImageMessage(r, image)));
            sock.send(JSON.stringify(createRoomMessage(r, msg)));
            sock.send(JSON.stringify(createRoomMessage(r, `📊 ترتيب الناجين:\n${top}`)));
        }
    });

    saveJson(sessionPath, session);
    saveJson(sessionPath, getInitialData());
}

module.exports = {
    handleBombCommand
};


const { createRoomMessage, createMainImageMessage } = require('../messageUtils');
const { getUserLanguage, loadRooms, loadUserVerifyList, addPoints } = require('../fileUtils');
const warState = require('./warState');
const { createRandomPlayer } = require('./playerUtils');
const { saveWinnersToFile } = require('./warLogger');

const warStartImages = [
    'https://i.pinimg.com/736x/a3/bb/0b/a3bb0b2b6874a5675284e827f19286dd.jpg',
    'https://i.pinimg.com/736x/02/1f/c1/021fc14b82a244e1aafb574465b6ec33.jpg'
];
const winImages = [
    'https://i.pinimg.com/736x/9c/19/79/9c19797c454e0a1f13082a46a8d5db83.jpg',
    'https://i.pinimg.com/736x/76/3a/60/763a60fe29eead4c8e36b03e84d906b6.jpg'
];

let verifiedUsers = loadUserVerifyList();

function handleWarGameCommand(data, socket, ioSockets) {
    const sender = data.from;
    const room = data.room;
    if (!data.body) return;
    const body = data.body.trim().toLowerCase();
    const lang = getUserLanguage(sender) || 'ar';
    const isVerified = verifiedUsers.some(u => u.username === sender);

    if (!isVerified) {
        socket.send(JSON.stringify(createRoomMessage(room, `❌ غير مصرح لك بالانضمام للحرب.`)));
        return;
    }

    if (!warState.isWarOpen) {
        socket.send(JSON.stringify(createRoomMessage(room, lang === 'ar' ? '❌ لا يوجد حرب حالياً.' : 'No war running now.')));
        return;
    }

    if (warState.players[sender]) {
        socket.send(JSON.stringify(createRoomMessage(room, lang === 'ar' ? '⚠️ أنت بالفعل مشارك.' : 'Already joined.')));
        return;
    }

    // صيغة الانضمام: "هجوم تدريب=health تحالف=red"
    const parts = body.split(' ');
    const status = parts[0]; // هجوم، دفاع، تحالف
    let training = null;
    let allianceName = null;
    parts.forEach(part => {
        if (part.startsWith('تدريب=')) training = part.split('=')[1];
        if (part.startsWith('تحالف=')) allianceName = part.split('=')[1];
    });

    const validStatus = ['هجوم', 'دفاع', 'تحالف'];
    if (!validStatus.includes(status)) return;

    const playerData = createRandomPlayer(status, training);
    warState.players[sender] = playerData;

    if (allianceName) {
        if (!warState.alliances[allianceName]) warState.alliances[allianceName] = [];
        warState.alliances[allianceName].push(sender);
    }

    const joinMsg = lang === 'ar'
        ? `🎖️ انضممت كـ "${playerData.title}" من ${playerData.flag} ${playerData.country} بسلاح ${playerData.weapon.name}.\n🕹️ وضعك: ${status.toUpperCase()}.\n🎯 تدريب: ${training || 'لا يوجد'}\n🤝 تحالف: ${allianceName || 'بدون'}`
        : `🎖️ You joined as "${playerData.title}" from ${playerData.flag} ${playerData.country} with ${playerData.weapon.name}.\n🕹️ Status: ${status.toUpperCase()}.\n🎯 Training: ${training || 'None'}\n🤝 Alliance: ${allianceName || 'None'}`;

    socket.send(JSON.stringify(createRoomMessage(room, joinMsg)));
    socket.send(JSON.stringify(createMainImageMessage(room, playerData.image)));
}

function startWarAuto(ioSockets) {
    if (warState.warRunning) return;
    warState.warRunning = true;

    const startRound = () => {
        announceWar(ioSockets);

        setTimeout(() => {
            const playerCount = Object.keys(warState.players).length;
            if (playerCount === 0) {
                broadcastAll(ioSockets, `⚠️ لا يوجد مشاركين. انتهت الجولة.`);
                warState.isWarOpen = false;
                warState.resetWar();
                setTimeout(() => startRound(), 1800000); // 30 دقيقة
                return;
            }
            if (playerCount === 1) {
                const winnerName = Object.keys(warState.players)[0];
                try { addPoints(winnerName, 1000); } catch {}
                broadcastAll(ioSockets, `🥇 الفائز تلقائياً: ${winnerName} لعدم وجود منافسين.`);
                warState.isWarOpen = false;
                warState.resetWar();
                setTimeout(() => startRound(), 1800000);
                return;
            }

            startWar(ioSockets, () => {
                setTimeout(() => startRound(), 1800000);
            });

        }, 60000); // 60 ثانية باب الانضمام
    };

    startRound();
}

function announceWar(ioSockets) {
    warState.isWarOpen = true;
    broadcastAll(ioSockets,
        `🌍🔥 الحرب العالمية الثالثة بدأت 🔥🌍
🪖 اكتب (هجوم) أو (دفاع) أو (تحالف) مع تدريب وتحالف (مثلاً: هجوم تدريب=power تحالف=red)
⏳ لديك 60 ثانية للانضمام.`);
}

function startWar(ioSockets, callback) {
    if (warState.warInProgress) return;
    if (Object.keys(warState.players).length === 0) {
        broadcastAll(ioSockets, `⚠️ لا يمكن بدء الحرب، لا يوجد مشاركين.`);
        warState.isWarOpen = false;
        warState.resetWar();
        callback();
        return;
    }
    warState.warInProgress = true;
    broadcastAll(ioSockets, `🚀 بدأت الحرب! تستمر 15 ثانية...`);

    setTimeout(() => executeWar(ioSockets, callback), 15000);
}

function executeWar(ioSockets, callback) {
    // دعم التحالفات: زيادة صحة ونقاط لكل عضو في تحالف
    Object.entries(warState.alliances).forEach(([allianceName, members]) => {
        members.forEach(member => {
            const player = warState.players[member];
            if (!player) return;
            player.health = Math.min(player.health + 15, 100);
            player.points += 50;
        });
    });

    // تنفيذ هجوم كل لاعب على عدو عشوائي خارج تحالفه
    Object.entries(warState.players).forEach(([username, player]) => {
        let enemies = [];

        const playerAlliance = Object.entries(warState.alliances).find(([_, members]) => members.includes(username));
        const playerAllianceName = playerAlliance ? playerAlliance[0] : null;

        enemies = Object.entries(warState.players).filter(([enemyName]) => {
            if (enemyName === username) return false;
            if (playerAllianceName) {
                const enemyAlliance = Object.entries(warState.alliances).find(([_, members]) => members.includes(enemyName));
                return !enemyAlliance || enemyAlliance[0] !== playerAllianceName;
            }
            return true;
        });

        if (enemies.length === 0) return;

        const [targetName, target] = enemies[Math.floor(Math.random() * enemies.length)];

        const damageBase = player.weapon.power;
        const luckFactor = Math.floor(player.luck * 0.3);
        const damage = damageBase + Math.floor(Math.random() * luckFactor);

        target.health = Math.max(target.health - damage, 0);

        player.points += 50;
    });

    // تصفية الأحياء
    const alivePlayers = Object.entries(warState.players).filter(([_, p]) => p.health > 0);

    if (alivePlayers.length === 0) {
        broadcastAll(ioSockets, `⚠️ انتهت الحرب ولا يوجد فائز.`);
        warState.isWarOpen = false;
        warState.resetWar();
        callback();
        return;
    }

    // تقييم اللاعبين
    const scoredPlayers = alivePlayers.map(([username, p]) => ({
        username,
        ...p,
        finalScore: (p.health * 2) + p.points + Math.floor(p.luck * 1.5)
    }));

    scoredPlayers.sort((a, b) => b.finalScore - a.finalScore);

    const winner = scoredPlayers[0];

    try {
        addPoints(winner.username, 10000);
    } catch (err) {
        console.log('❌ خطأ في إضافة النقاط:', err.message);
    }

    const leaderboardMsg = scoredPlayers.slice(0, 10).map((p, i) =>
        `#${i + 1} - ${p.username} | ${p.country} ${p.flag} | ${p.title} | 🪖 ${p.weapon.name} | 💥 ${p.finalScore}`
    ).join('\n');

    broadcastAll(ioSockets, `📢 🏆 أفضل 10 لاعبين في الجولة:\n${leaderboardMsg}`);

    saveWinnersToFile(scoredPlayers.slice(0, 10));

    const winImage = winImages[Math.floor(Math.random() * winImages.length)];
    broadcastImage(ioSockets, winImage);

    broadcastAll(ioSockets,
        `🎖️ انتهت الحرب!\n🥇 الفائز: ${winner.username} ${winner.flag} ${winner.country} | ${winner.title} 🪖 ${winner.weapon.name}\n💰 تمت إضافة 10000 نقطة إلى رصيد الفائز.`);

    warState.isWarOpen = false;
    warState.resetWar();

    callback();
}

function broadcastAll(ioSockets, message) {
    const rooms = loadRooms();
    rooms.forEach(r => {
        const socket = ioSockets[r.roomName];
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify(createRoomMessage(r.roomName, message)));
        }
    });
}

function broadcastImage(ioSockets, url) {
    const rooms = loadRooms();
    rooms.forEach(r => {
        const socket = ioSockets[r.roomName];
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify(createMainImageMessage(r.roomName, url)));
        }
    });
}

module.exports = {
    handleWarGameCommand,
    startWarAuto
};


const fs = require('fs');
const path = require('path');
const { createRoomMessage, createMainImageMessage } = require('../messageUtils');
const { addPoints, loadRooms } = require('../fileUtils');

// المسارات
const duelFilePath = path.join(__dirname, '../data/bombDuel.json');
const cooldownFilePath = path.join(__dirname, '../data/bombCooldowns.json');
const leaderboardFilePath = path.join(__dirname, '../data/bombLeaderboard.json');

const COOLDOWN = 5 * 60 * 1000; // 5 دقائق

const successImages = [
    'https://i.pinimg.com/736x/e5/78/21/e57821d226319c669e8d3681c5c70d92.jpg'
];
const failImages = [
    'https://i.pinimg.com/736x/36/d0/5a/36d05ae41bb339febf50a8f847f53e61.jpg'
];

function loadJson(file, def = {}) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(def, null, 2));
    return JSON.parse(fs.readFileSync(file));
}

function saveJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getInitialBombData() {
    return {
        isActive: false,
        player1: null,
        player2: null,
        code: null,
        rooms: [],
        guesses: {}
    };
}

function loadBombData() {
    return loadJson(duelFilePath, getInitialBombData());
}

function saveBombData(data) {
    saveJson(duelFilePath, data);
}

function resetBomb() {
    saveBombData(getInitialBombData());
}

function loadCooldowns() {
    return loadJson(cooldownFilePath, {});
}

function saveCooldowns(data) {
    saveJson(cooldownFilePath, data);
}

function loadLeaderboard() {
    return loadJson(leaderboardFilePath, {});
}

function saveLeaderboard(data) {
    saveJson(leaderboardFilePath, data);
}

function broadcast(ioSockets, rooms, msg) {
    const allRooms = loadRooms();
    rooms.forEach(r => {
        const data = allRooms.find(room => room.roomName === r);
        if (data?.gamesEnabled === false) return;
        const socket = ioSockets[r];
        if (socket?.readyState === 1) {
            socket.send(JSON.stringify(createRoomMessage(r, msg)));
        }
    });
}

function handleBombCommand(data, socket, ioSockets) {
    const sender = data.from;
    const room = data.room;
    const userId = data.userId || sender;
    const cooldowns = loadCooldowns();
    const now = Date.now();

    if (cooldowns[userId] && now - cooldowns[userId] < COOLDOWN) {
        const remain = Math.ceil((COOLDOWN - (now - cooldowns[userId])) / 1000);
        socket.send(JSON.stringify(createRoomMessage(room, `⏳ انتظر ${remain} ثانية قبل المحاولة مجددًا.`)));
        return;
    }

    let game = loadBombData();

    if (!game.isActive) {
        game.isActive = true;
        game.player1 = { username: sender, userId, room };

        const allRooms = loadRooms().filter(r => r.gamesEnabled !== false).map(r => r.roomName);
        game.rooms = allRooms;

        saveBombData(game);


        broadcast(ioSockets, game.rooms, `💣 ${sender} بدأ لعبة القنبلة! اكتب "قنبله" للانضمام خلال 30 ثانية!`);

        setTimeout(() => {
            const updated = loadBombData();
            if (updated.isActive && !updated.player2) {
                broadcast(ioSockets, updated.rooms, "⌛ لم ينضم أحد للعبة القنبلة. انتهت الجولة.");
                resetBomb();
            }
        }, 30000);

        return;
    }

    if (game.player1.username === sender || game.player2?.username === sender) {
        socket.send(JSON.stringify(createRoomMessage(room, "❌ أنت مشارك بالفعل في اللعبة.")));
        return;
    }

    if (!game.player2) {
        game.player2 = { username: sender, userId, room };
        const room1 = game.player1.room;
        const room2 = room;
        game.rooms = [...new Set([room1, room2])];

game.code = Math.floor(1 + Math.random() * 3);
        saveBombData(game);

        cooldowns[userId] = now;
        saveCooldowns(cooldowns);


        broadcast(ioSockets, game.rooms, `🔢 ${sender} انضم!`);
        broadcast(ioSockets, game.rooms, 
`🧠 ${game.player1.username} و ${game.player2.username}، أرسل رقمًا (مثلاً: آخر لون لفك السلك) من 1️⃣ إلى 3️⃣ لمحاولة تفكيك القنبلة 💣!\n\n🔴 1️⃣\n🟠 2️⃣\n🟢 3️⃣`
        );

        setTimeout(() => {
            const currentGame = loadBombData();
            if (currentGame.isActive && Object.keys(currentGame.guesses).length < 2) {
                broadcast(ioSockets, currentGame.rooms, "⌛ انتهى الوقت ولم يتم إرسال التخمينات. انتهت الجولة.");
                resetBomb();
            }
        }, 30000);

        return;
    }
}

function handleBombAnswer(body, data, socket, ioSockets) {
    const sender = data.from;
    const userId = data.userId || sender;
    const room = data.room;

    let game = loadBombData();
    if (!game.isActive || !game.player2) return;

    const number = parseInt(body);
    if (isNaN(number) || number < 1 || number > 3) {
        return;
    }

    const isPlayer1 = game.player1.username === sender;
    const isPlayer2 = game.player2.username === sender;

    if (!isPlayer1 && !isPlayer2) return;

    if (game.guesses[sender]) {
        socket.send(JSON.stringify(createRoomMessage(room, `❗ لقد أرسلت تخمينك بالفعل.`)));
        return;
    }

    game.guesses[sender] = number;
    saveBombData(game);

    socket.send(JSON.stringify(createRoomMessage(room, `✅ ${sender} اخترت الرقم ${number}.`)));

    if (Object.keys(game.guesses).length < 2) return;

    const { player1, player2, code, rooms } = game;
    const g1 = game.guesses[player1.username];
    const g2 = game.guesses[player2.username];

    const success1 = g1 === code;
    const success2 = g2 === code;

    let resultMsg = '';
    let leaderboard = loadLeaderboard();

    if (success1 && !success2) {
        addPoints(player1.username, 100000);
        leaderboard[player1.username] = (leaderboard[player1.username] || 0) + 1;
        resultMsg = `🧯 ${player1.username} فك القنبلة بنجاح!\n💥 ${player2.username} فشل في تفكيكها.`;
    } else if (!success1 && success2) {
        addPoints(player2.username, 100000);
        leaderboard[player2.username] = (leaderboard[player2.username] || 0) + 1;
        resultMsg = `🧯 ${player2.username} فك القنبلة بنجاح!\n💥 ${player1.username} فشل في تفكيكها.`;
    } else {
        resultMsg = `🤝 كلا اللاعبين ${success1 ? "نجحا" : "فشلا"} في تفكيك القنبلة. تعادل!`;
    }



    saveLeaderboard(leaderboard);

    const top10 = Object.entries(leaderboard)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, wins], i) => `#${i + 1} - ${name} | 💣 الفوز: ${wins}`)
        .join('\n');


    const image = (success1 && success2) || (!success1 && !success2)
        ? failImages[0]
        : successImages[0];

    rooms.forEach(r => {
        const s = ioSockets[r];
        if (s?.readyState === 1) {
            s.send(JSON.stringify(createMainImageMessage(r, image)));
            s.send(JSON.stringify(createRoomMessage(r, resultMsg)));
            s.send(JSON.stringify(createRoomMessage(r, `📊 أقوى مفككي القنابل:\n${top10}`)));
        }
    });

    resetBomb();
}


module.exports = {
    handleBombCommand,
    handleBombAnswer
};

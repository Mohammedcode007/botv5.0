
// const { createRoomMessage, createMainImageMessage } = require('../messageUtils');
// const { getUserLanguage, loadRooms, loadUserVerifyList, updateUserPoints, addPoints } = require('../fileUtils');
// const gameData = require('../data/gameData.json');

// let verifiedUsers = loadUserVerifyList();

// const players = {};
// let warInProgress = false;
// let isWarOpen = false;
// let warRunning = false;

// // ✅ صور للاعبين عند الانضمام
// const playerImages = [
//     'https://i.pinimg.com/736x/94/34/5a/94345ad561d6526741a1681eee0b1bc5.jpg',
//     'https://i.pinimg.com/736x/2b/83/e1/2b83e19877633511de58547818131cef.jpg',
//     'https://i.pinimg.com/736x/09/11/a5/0911a5fd28446d0937da7bcc826f8155.jpg',
//     'https://i.pinimg.com/736x/5e/a1/b8/5ea1b8711a56889cc33aaf3ee8639fdd.jpg',
//     'https://i.pinimg.com/736x/32/99/36/3299369e00b51cf58bdea4fc53248070.jpg',
//     'https://i.pinimg.com/736x/dc/5d/ed/dc5ded7dc139af23cada904347f62450.jpg',
//     'https://i.pinimg.com/736x/aa/a9/50/aaa950f94a8e05d9ca23385a574a9913.jpg',
//     'https://i.pinimg.com/736x/50/cc/1e/50cc1e89b34df0fadc4cb711b35be521.jpg',
//     'https://i.pinimg.com/736x/b4/cf/60/b4cf60ff44110be1f376f1cc275cb388.jpg',
//     'https://i.pinimg.com/736x/12/79/e7/1279e7d27873b68288710b4fcb7639ab.jpg'
// ];

// // ✅ صور لبدء الحرب والفوز
// const warStartImages = [
//     'https://i.pinimg.com/736x/a3/bb/0b/a3bb0b2b6874a5675284e827f19286dd.jpg',
//     'https://i.pinimg.com/736x/02/1f/c1/021fc14b82a244e1aafb574465b6ec33.jpg'
// ];
// const winImages = [
//     'https://i.pinimg.com/736x/9c/19/79/9c19797c454e0a1f13082a46a8d5db83.jpg',
//     'https://i.pinimg.com/736x/76/3a/60/763a60fe29eead4c8e36b03e84d906b6.jpg'
// ];

// // ✅ إعلان بدء الحرب
// function announceWar(ioSockets) {
//     isWarOpen = true;

//     const startImage = warStartImages[Math.floor(Math.random() * warStartImages.length)];
//     broadcastImage(ioSockets, startImage);

//     broadcastAll(ioSockets, `
// 🌍🔥 الحرب العالمية الثالثة بدأت 🔥🌍
// 🪖 اكتب (هجوم) أو (دفاع) أو (تحالف) للانضمام.
// ⏳ الجولة تبدأ خلال 60 ثانية...
// 🏆 كن القائد الأعظم!
//     `);

//     let countdown = 60;
//     const countdownInterval = setInterval(() => {
//         countdown -= 5;
//         if (countdown <= 10 && countdown > 0) {
//             broadcastAll(ioSockets, `⏳ تبقى ${countdown} ثواني للانضمام...`);
//         }
//         if (countdown <= 0) {
//             clearInterval(countdownInterval);
//         }
//     }, 5000);
    
// }

// // ✅ دورة الحرب التلقائية
// function startWarAuto(ioSockets) {
//     if (warRunning) return;
//     warRunning = true;

//     const startRound = () => {
//         announceWar(ioSockets);

//         setTimeout(() => {
//             const playerCount = Object.keys(players).length;

//             if (playerCount === 0) {
//                 broadcastAll(ioSockets, `⚠️ لا يوجد مشاركين. ❌ انتهت الجولة.`);
//                 isWarOpen = false;
//                 resetWar();
//                 setTimeout(() => startRound(), 900000);
//             } else if (playerCount === 1) {
//                 const winnerName = Object.keys(players)[0];
//                 const winner = players[winnerName];

//                 const winImage = winImages[Math.floor(Math.random() * winImages.length)];
//                 broadcastImage(ioSockets, winImage);
//                 try {
//                     const finalPoints = addPoints(winnerName, 1000000);
//                     console.log(`✅ تم إضافة 100000 نقطة إلى ${winnerName}. المجموع الآن: ${finalPoints}`);
//                 } catch (error) {
//                     console.log('❌ خطأ أثناء إضافة النقاط:', error.message);
//                 }
//                 broadcastAll(ioSockets, `
// 🥇 الفائز تلقائياً: ${winnerName}
// ${winner.flag} ${winner.country} | ${winner.title}
// 🪖 السلاح: ${winner.weapon.name}
// 💥 النقاط: 1000000

// ✅ لعدم وجود منافسين.
//                 `);
//                 isWarOpen = false;
//                 resetWar();
//                 setTimeout(() => startRound(), 900000);
//             } else {
//                 startWar(ioSockets, startRound);
//             }
//         }, 60000);
//     };

//     startRound();
// }

// // ✅ انضمام اللاعب
// function handleWarGameCommand(data, socket, ioSockets) {
//     const sender = data.from;
//     const room = data.room;
//     const body = data.body.trim().toLowerCase();
//     const lang = getUserLanguage(sender) || 'ar';
//     const isVerified = verifiedUsers.some(u => u.username === sender);

//     if (!isVerified) {
//         const msg = `❌ You are not verified to join the World War.\n👉 Please contact the admin.`;
//         socket.send(JSON.stringify(createRoomMessage(room, msg)));
//         return;
//     }

//     const validCommands = ['دفاع', 'هجوم', 'تحالف'];
//     if (!validCommands.includes(body)) return;

//     if (!isWarOpen) {
//         const msg = lang === 'ar'
//             ? `❌ لا يوجد حرب حالياً. انتظر بدء الجولة القادمة.`
//             : `❌ No war is running now. Wait for the next round.`;
//         socket.send(JSON.stringify(createRoomMessage(room, msg)));
//         return;
//     }

//     if (players[sender]) {
//         const msg = lang === 'ar'
//             ? `⚠️ أنت بالفعل مشارك في الحرب.`
//             : `⚠️ You are already in the war.`;
//         socket.send(JSON.stringify(createRoomMessage(room, msg)));
//         return;
//     }

//     const randomCountry = gameData.countries[Math.floor(Math.random() * gameData.countries.length)];
//     const randomTitle = gameData.titles[Math.floor(Math.random() * gameData.titles.length)];
//     const randomWeapon = gameData.weapons[Math.floor(Math.random() * gameData.weapons.length)];
//     const randomImage = playerImages[Math.floor(Math.random() * playerImages.length)];

//     players[sender] = {
//         country: randomCountry.name,
//         flag: randomCountry.flag,
//         title: randomTitle,
//         weapon: randomWeapon,
//         status: body,
//         points: 1000
//     };

//     const joinMsg = lang === 'ar'
//         ? `🎖️ انضممت للحرب كـ "${randomTitle}" من ${randomCountry.flag} ${randomCountry.name}، بسلاح ${randomWeapon.name}.\n🕹️ وضعك: ${body.toUpperCase()}.`
//         : `🎖️ You joined the war as "${randomTitle}" from ${randomCountry.flag} ${randomCountry.name} with ${randomWeapon.name}.\n🕹️ Status: ${body.toUpperCase()}.`;

//     socket.send(JSON.stringify(createRoomMessage(room, joinMsg)));
//     socket.send(JSON.stringify(createMainImageMessage(room, randomImage)));
// }

// // ✅ بدء الحرب
// function startWar(ioSockets, callback) {
//     console.log('🚀 startWar تم استدعاؤها');

//     if (warInProgress) return;

//     const playerCount = Object.keys(players).length;
//     if (playerCount === 0) {
//         broadcastAll(ioSockets, `⚠️ لا يمكن بدء الحرب. لا يوجد مشاركين.`);
//         isWarOpen = false;
//         resetWar();
//         callback();
//         return;
//     }

//     warInProgress = true;
//     broadcastAll(ioSockets, `🚀 بدأت الحرب! تستمر لمدة 15 ثانية...`);

//     setTimeout(() => {
//         executeWar(ioSockets, callback);
//     }, 60000);
// }

// // ✅ تنفيذ الحرب
// function executeWar(ioSockets, callback) {
//     console.log('🚩 executeWar تم استدعاؤها');

//     const attackers = Object.entries(players).filter(([_, p]) => p.status === 'هجوم');
//     const defenders = Object.entries(players).filter(([_, p]) => p.status === 'دفاع');
//     const alliances = Object.entries(players).filter(([_, p]) => p.status === 'تحالف');

//     const results = {};

//     attackers.forEach(([username, player]) => {
//         const possibleTargets = defenders.length > 0
//             ? defenders
//             : alliances.length > 0
//                 ? alliances
//                 : attackers.filter(([u]) => u !== username);

//         if (possibleTargets.length === 0) return;

//         const target = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
//         const damage = player.weapon.power + Math.floor(Math.random() * 50);

//         if (!results[target[0]]) results[target[0]] = 0;
//         results[target[0]] -= damage;
//     });

//     alliances.forEach(([_, player]) => {
//         player.points += 100;
//     });

//     defenders.forEach(([_, player]) => {
//         player.points += 150;
//     });

//     Object.entries(results).forEach(([username, damage]) => {
//         if (players[username]) {
//             players[username].points += damage;
//             if (players[username].points < 0) players[username].points = 0;
//         }
//     });

//     const sortedPlayers = Object.entries(players).sort((a, b) => b[1].points - a[1].points);
//     console.log('finalPoints');

//     if (sortedPlayers.length === 0) {
//         broadcastAll(ioSockets, `⚠️ لا يوجد فائز لأن جميع اللاعبين انتهت نقاطهم.`);
//         isWarOpen = false;
//         resetWar();
//         callback();
//         return;
//     }

//     const winner = sortedPlayers[0];
//     const winnerName = winner[0];
//     const winnerData = winner[1];
//     console.log('⚠️ اسم الفائز:', winnerName);

//     try {
//         const finalPoints = addPoints(winnerName, 1000000);
//         console.log('✅ النقاط بعد الإضافة:', finalPoints);
//     } catch (error) {
//         console.log('❌ حدث خطأ أثناء إضافة النقاط:', error.message);
//     }
        
//     verifiedUsers = loadUserVerifyList();

//     const winImage = winImages[Math.floor(Math.random() * winImages.length)];
//     broadcastImage(ioSockets, winImage);

//     broadcastAll(ioSockets, `
// 🎖️ انتهت الحرب!

// 🥇 الفائز: ${winnerName}
// ${winnerData.flag} ${winnerData.country} | ${winnerData.title}
// 🪖 السلاح: ${winnerData.weapon.name}
// 💥 النقاط الحالية داخل الحرب: ${winnerData.points}
// 💰 تمت إضافة 1000000 نقطة إلى رصيدك الدائم 🎉

// 📢 شكرًا للمشاركة في الحرب العالمية.
//     `);

//     isWarOpen = false;
//     resetWar();
//     callback();
// }

// // ✅ إرسال رسالة لجميع الغرف
// function broadcastAll(ioSockets, message) {
//     const rooms = loadRooms();
//     rooms.forEach(roomObj => {
//         const roomName = roomObj.roomName;
//         const roomSocket = ioSockets[roomName];

//         if (roomSocket && roomSocket.readyState === 1) {
//             roomSocket.send(JSON.stringify(createRoomMessage(roomName, message)));
//         }
//     });
// }

// // ✅ إرسال صورة لجميع الغرف
// function broadcastImage(ioSockets, imageURL) {
//     const rooms = loadRooms();
//     rooms.forEach(roomObj => {
//         const roomName = roomObj.roomName;
//         const roomSocket = ioSockets[roomName];

//         if (roomSocket && roomSocket.readyState === 1) {
//             roomSocket.send(JSON.stringify(createMainImageMessage(roomName, imageURL)));
//         }
//     });
// }

// // ✅ إعادة تعيين الحرب
// function resetWar() {
//     Object.keys(players).forEach(u => delete players[u]);
//     warInProgress = false;
// }

// module.exports = {
//     handleWarGameCommand,
//     startWarAuto
// };

// /war/warEngine.js
// /war/warEngine.js
// /war/warEngine.js

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
                try { addPoints(winnerName, 1000000); } catch {}
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
        addPoints(winner.username, 1000000);
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
        `🎖️ انتهت الحرب!\n🥇 الفائز: ${winner.username} ${winner.flag} ${winner.country} | ${winner.title} 🪖 ${winner.weapon.name}\n💰 تمت إضافة 1000000 نقطة إلى رصيد الفائز.`);

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

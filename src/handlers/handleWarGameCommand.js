
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

const { createRoomMessage, createMainImageMessage } = require('../messageUtils');
const { getUserLanguage, loadRooms, loadUserVerifyList, addPoints } = require('../fileUtils');
const gameData = require('../data/gameData.json');

let verifiedUsers = loadUserVerifyList();

const players = {};
let warInProgress = false;
let isWarOpen = false;
let warRunning = false;

// إعدادات اللعبة الزمنية
const WAR_DURATION = 15000;      // مدة الحرب: 15 ثانية
const WAR_COOLDOWN = 900000;     // وقت الانتظار بين الجولات: 15 دقيقة
const WAR_JOIN_TIME = 60000;     // مدة الانضمام قبل بدء الحرب: 60 ثانية

const playerImages = [
    'https://i.pinimg.com/736x/94/34/5a/94345ad561d6526741a1681eee0b1bc5.jpg',
    'https://i.pinimg.com/736x/2b/83/e1/2b83e19877633511de58547818131cef.jpg',
    'https://i.pinimg.com/736x/09/11/a5/0911a5fd28446d0937da7bcc826f8155.jpg',
    'https://i.pinimg.com/736x/5e/a1/b8/5ea1b8711a56889cc33aaf3ee8639fdd.jpg',
    'https://i.pinimg.com/736x/32/99/36/3299369e00b51cf58bdea4fc53248070.jpg',
    'https://i.pinimg.com/736x/dc/5d/ed/dc5ded7dc139af23cada904347f62450.jpg',
    'https://i.pinimg.com/736x/aa/a9/50/aaa950f94a8e05d9ca23385a574a9913.jpg',
    'https://i.pinimg.com/736x/50/cc/1e/50cc1e89b34df0fadc4cb711b35be521.jpg',
    'https://i.pinimg.com/736x/b4/cf/60/b4cf60ff44110be1f376f1cc275cb388.jpg',
    'https://i.pinimg.com/736x/12/79/e7/1279e7d27873b68288710b4fcb7639ab.jpg'
];

const warStartImages = [
    'https://i.pinimg.com/736x/a3/bb/0b/a3bb0b2b6874a5675284e827f19286dd.jpg',
    'https://i.pinimg.com/736x/02/1f/c1/021fc14b82a244e1aafb574465b6ec33.jpg'
];
const winImages = [
    'https://i.pinimg.com/736x/9c/19/79/9c19797c454e0a1f13082a46a8d5db83.jpg',
    'https://i.pinimg.com/736x/76/3a/60/763a60fe29eead4c8e36b03e84d906b6.jpg'
];

function announceWar(ioSockets) {
    isWarOpen = true;

    const startImage = warStartImages[Math.floor(Math.random() * warStartImages.length)];
    broadcastImage(ioSockets, startImage);

    broadcastAll(ioSockets, `
🌍🔥 الحرب العالمية الثالثة بدأت 🔥🌍
🪖 اكتب (هجوم) أو (دفاع) أو (تحالف) للانضمام.
⏳ الجولة تبدأ خلال 60 ثانية...
🏆 كن القائد الأعظم!
    `);

    let countdown = 60;
    const countdownInterval = setInterval(() => {
        countdown -= 5;
        if (countdown % 15 === 0 || countdown <= 10) {
            broadcastAll(ioSockets, `⏳ تبقى ${countdown} ثانية للانضمام...`);
        }
        if (countdown <= 0) {
            clearInterval(countdownInterval);
        }
    }, 5000);
}

function startWarAuto(ioSockets) {
    if (warRunning) return;
    warRunning = true;

    const startRound = () => {
        announceWar(ioSockets);

        setTimeout(() => {
            const playerCount = Object.keys(players).length;

            if (playerCount === 0) {
                broadcastAll(ioSockets, `⚠️ لا يوجد مشاركين. ❌ انتهت الجولة.`);
                isWarOpen = false;
                resetWar();
                setTimeout(() => startRound(), WAR_COOLDOWN);
            } else if (playerCount === 1) {
                const winnerName = Object.keys(players)[0];
                const winner = players[winnerName];
                const winImage = winImages[Math.floor(Math.random() * winImages.length)];

                broadcastImage(ioSockets, winImage);

                try {
                    const finalPoints = addPoints(winnerName, 1000000);
                    console.log(`✅ تم إضافة 1000000 نقطة إلى ${winnerName}.`);
                } catch (error) {
                    console.log('❌ خطأ أثناء إضافة النقاط:', error.message);
                }

                broadcastAll(ioSockets, `
🥇 الفائز تلقائياً: ${winnerName}
${winner.flag} ${winner.country} | ${winner.title}
🪖 السلاح: ${winner.weapon.name}
💥 النقاط: 1000000

✅ لعدم وجود منافسين.
                `);

                isWarOpen = false;
                resetWar();
                setTimeout(() => startRound(), WAR_COOLDOWN);
            } else {
                startWar(ioSockets, startRound);
            }
        }, WAR_JOIN_TIME);
    };

    startRound();
}

function handleWarGameCommand(data, socket, ioSockets) {
    const sender = data.from;
    const room = data.room;
    const body = data.body.trim().toLowerCase();
    const lang = getUserLanguage(sender) || 'ar';
    const isVerified = verifiedUsers.some(u => u.username === sender);

    if (!isVerified) {
        socket.send(JSON.stringify(createRoomMessage(room, `❌ You are not verified to join the World War.`)));
        return;
    }

    const validCommands = ['دفاع', 'هجوم', 'تحالف'];
    if (!validCommands.includes(body)) return;

    if (!isWarOpen) {
        const msg = lang === 'ar'
            ? `❌ لا يوجد حرب حالياً. انتظر الجولة القادمة.`
            : `❌ No war is currently running. Please wait for the next round.`;
        socket.send(JSON.stringify(createRoomMessage(room, msg)));
        return;
    }

    if (players[sender]) {
        const msg = lang === 'ar'
            ? `⚠️ أنت بالفعل مشارك في الحرب.`
            : `⚠️ You are already participating.`;
        socket.send(JSON.stringify(createRoomMessage(room, msg)));
        return;
    }

    const country = gameData.countries[Math.floor(Math.random() * gameData.countries.length)];
    const title = gameData.titles[Math.floor(Math.random() * gameData.titles.length)];
    const weapon = gameData.weapons[Math.floor(Math.random() * gameData.weapons.length)];
    const image = playerImages[Math.floor(Math.random() * playerImages.length)];

    players[sender] = {
        country: country.name,
        flag: country.flag,
        title,
        weapon,
        status: body,
        points: 1000
    };

    const joinMsg = lang === 'ar'
        ? `🎖️ انضممت كـ "${title}" من ${country.flag} ${country.name}، بسلاح ${weapon.name}.\n🕹️ وضعك: ${body.toUpperCase()}.`
        : `🎖️ You joined as "${title}" from ${country.flag} ${country.name} with ${weapon.name}.\n🕹️ Status: ${body.toUpperCase()}.`;

    socket.send(JSON.stringify(createRoomMessage(room, joinMsg)));
    socket.send(JSON.stringify(createMainImageMessage(room, image)));
}

function startWar(ioSockets, callback) {
    if (warInProgress) return;
    warInProgress = true;

    broadcastAll(ioSockets, `🚀 بدأت الحرب! تستمر لمدة 15 ثانية...`);

    setTimeout(() => {
        try {
            executeWar(ioSockets, callback);
        } catch (e) {
            console.error('❌ خطأ في executeWar:', e);
            resetWar();
            callback();
        }
    }, WAR_DURATION);
}

function executeWar(ioSockets, callback) {
    const attackers = Object.entries(players).filter(([_, p]) => p.status === 'هجوم');
    const defenders = Object.entries(players).filter(([_, p]) => p.status === 'دفاع');
    const alliances = Object.entries(players).filter(([_, p]) => p.status === 'تحالف');

    const results = {};

    attackers.forEach(([username, player]) => {
        const targets = defenders.length ? defenders : (alliances.length ? alliances : attackers.filter(([u]) => u !== username));
        if (!targets.length) return;

        const [targetName] = targets[Math.floor(Math.random() * targets.length)];
        const damage = player.weapon.power + Math.floor(Math.random() * 50);
        results[targetName] = (results[targetName] || 0) - damage;
    });

    alliances.forEach(([_, p]) => p.points += 100);
    defenders.forEach(([_, p]) => p.points += 150);

    Object.entries(results).forEach(([u, dmg]) => {
        if (players[u]) {
            players[u].points += dmg;
            if (players[u].points < 0) players[u].points = 0;
        }
    });

    const sorted = Object.entries(players).sort((a, b) => b[1].points - a[1].points);
    if (!sorted.length) {
        broadcastAll(ioSockets, `⚠️ لا يوجد فائز.`);
        isWarOpen = false;
        resetWar();
        callback();
        return;
    }

    const [winnerName, winner] = sorted[0];
    try {
        const finalPoints = addPoints(winnerName, 1000000);
        console.log('✅ تم إضافة 1000000 نقطة إلى', winnerName);
    } catch (e) {
        console.log('❌ خطأ إضافة النقاط:', e.message);
    }

    verifiedUsers = loadUserVerifyList();

    const winImage = winImages[Math.floor(Math.random() * winImages.length)];
    broadcastImage(ioSockets, winImage);

    broadcastAll(ioSockets, `
🎖️ انتهت الحرب!

🥇 الفائز: ${winnerName}
${winner.flag} ${winner.country} | ${winner.title}
🪖 السلاح: ${winner.weapon.name}
💥 نقاط الحرب: ${winner.points}
💰 تمت إضافة 1000000 نقطة لرصيدك 🎉

📢 شكرًا لمشاركتكم!
    `);

    isWarOpen = false;
    resetWar();
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

function broadcastImage(ioSockets, imageURL) {
    const rooms = loadRooms();
    rooms.forEach(r => {
        const socket = ioSockets[r.roomName];
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify(createMainImageMessage(r.roomName, imageURL)));
        }
    });
}

function resetWar() {
    Object.keys(players).forEach(u => delete players[u]);
    warInProgress = false;
}

module.exports = {
    handleWarGameCommand,
    startWarAuto
};

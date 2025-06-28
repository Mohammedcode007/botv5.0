const { getUserLanguage, checkUserExistsOrNotify } = require('../fileUtils');
const { addPoints, incrementPikachuKills } = require('../fileUtils');
const { createRoomMessage, createMainImageMessage } = require('../messageUtils');

let pikachuAlive = true;
let currentKiller = null;
let pikachuKilledAt = null;
let pikachuRoom = null;

const messages = {
    ar: {
        pikachuAppeared: '⚡️ Pikachu is back! Send "fire or فاير" !',
        pikachuDeadReplies: [
            '⚠️ البيكاتشو مات خلاص، انت متأخر 😅',
            '🙃 للأسف، أحد سبقك وذبحه.',
            '🐲 انتهى الأمر! حاول المرة الجاية.',
            '☠️ تم قتل البيكاتشو بالفعل!',
            '⛔ مات الوحش.. الحظ في الجولة القادمة!'
        ],
        winnerMsg: (sender, roomName) => `🔥 ${sender} قتل البيكاتشو في غرفة [${roomName}]! +1000 💰`,
        announcement: (sender, roomName) => `📣 ${sender} قتل البيكاتشو في غرفة [${roomName}]!`
    },
    en: {
        pikachuAppeared: '⚡️ Pikachu is back! Send "fire or فاير" !',
        pikachuDeadReplies: [
            '⚠️ Pikachu is already dead, you are late 😅',
            '🙃 Sorry, someone else already killed it.',
            '🐲 The game is over! Try next time.',
            '☠️ Pikachu was already killed!',
            '⛔ The beast is dead.. better luck next round!'
        ],
        winnerMsg: (sender, roomName) => `🔥 ${sender} killed Pikachu in room [${roomName}]! +1000 💰`,
        announcement: (sender, roomName) => `📣 ${sender} killed Pikachu in room [${roomName}]!`
    }
};

function startPikachuEvent(ioSockets, rooms) {
    setInterval(() => {
        const message = messages.ar.pikachuAppeared; // Default message in Arabic
        rooms.forEach(room => {
            const socket = ioSockets[room.roomName];
            if (socket && socket.readyState === 1) {
                const broadcastMessage = createRoomMessage(room.roomName, message);
                socket.send(JSON.stringify(broadcastMessage));
            }
        });

        pikachuAlive = true;
        pikachuKilledAt = null;
        currentKiller = null;
        pikachuRoom = null;
        console.log('[⚡️ EVENT] Pikachu is now alive.');
    }, 15 * 60 * 1000); // ⏱️ كل 15 دقيقة
}
const quranVerses = [
    '﴿إِنَّ مَعَ الْعُسْرِ يُسْرًا﴾ [الشرح:6]',
    '﴿وَقُل رَّبِّ زِدْنِي عِلْمًا﴾ [طه:114]',
    '﴿فَإِنَّ مَعَ الْعُسْرِ يُسْرًا﴾ [الشرح:5]',
    '﴿إِنَّ اللَّهَ مَعَ الصَّابِرِينَ﴾ [البقرة:153]',
    '﴿وَمَن يَتَّقِ ٱللَّهَ يَجْعَل لَّهُۥ مَخْرَجًۭا﴾ [الطلاق:2]',
    '﴿إِنَّ رَحْمَتَ ٱللَّهِ قَرِيبٌۭ مِّنَ ٱلْمُحْسِنِينَ﴾ [الأعراف:56]'
];


function startQuranBroadcast(ioSockets, rooms) {
    setInterval(() => {
        const randomVerse = quranVerses[Math.floor(Math.random() * quranVerses.length)];
        rooms.forEach(room => {
            const socket = ioSockets[room.roomName];
            if (socket && socket.readyState === 1) {
                const broadcastMessage = createRoomMessage(room.roomName, `📖 آية اليوم:\n${randomVerse}`);
                socket.send(JSON.stringify(broadcastMessage));
            }
        });

        console.log('[📖 BROADCAST] Sent Quran verse to all rooms.');
    }, 5 * 60 * 1000); // ⏱️ كل 5 دقائق
}

const pikachuKillImages = [
    'https://i.pinimg.com/736x/14/7d/b0/147db085b6655ea13793016b442dc4eb.jpg',
    'https://i.pinimg.com/736x/c3/ac/22/c3ac22ef68e5aa4232953d408144837d.jpg',
    'https://i.pinimg.com/736x/e2/30/8e/e2308e6de64d30576f32a5fbf4ce64ec.jpg',
    'https://i.pinimg.com/736x/8f/d8/ed/8fd8ed06e9041a11cd49a26a363ea77a.jpg'
];
function handleFireCommand(data, socket, rooms, ioSockets) {
    const roomName = data.room;
    const sender = data.from;
    const lang = getUserLanguage(sender) || 'ar'; // Default language to Arabic if not specified
    const body = data.body.trim().toLowerCase();

    if (!checkUserExistsOrNotify(sender, roomName, socket)) return;

    // تعديل للتحقق من أن المستخدم أرسل "fire" أو "فاير"
    if (body !== 'fire' && body !== 'فاير') return;

    if (!pikachuAlive) {
        const reply = messages[lang].pikachuDeadReplies[Math.floor(Math.random() * messages[lang].pikachuDeadReplies.length)];
        const msg = createRoomMessage(roomName, reply);
        socket.send(JSON.stringify(msg));
        return;
    }

    if (pikachuKilledAt && Date.now() - pikachuKilledAt < 500) return;
    if (!socket || socket.readyState !== 1) return;

    // ✅ قتل البيكاتشو
    pikachuAlive = false;
    pikachuKilledAt = Date.now();
    currentKiller = sender;
    pikachuRoom = roomName;

    const totalPoints = addPoints(sender, 1000);
    const totalKills = incrementPikachuKills(sender);

    const winnerMsg = messages[lang].winnerMsg(sender, roomName);
    const personalMsg = createRoomMessage(roomName, winnerMsg);
    socket.send(JSON.stringify(personalMsg));


    // 🎉 نشر الخبر في جميع الغرف
    rooms.forEach(room => {
        const roomSocket = ioSockets[room.roomName];
        if (!roomSocket || roomSocket.readyState !== 1) return;
        if (room.roomName === roomName) return;

        const announcement = messages[lang].announcement(sender, roomName);
        roomSocket.send(JSON.stringify(createRoomMessage(room.roomName, announcement)));

        const randomImage = pikachuKillImages[Math.floor(Math.random() * pikachuKillImages.length)];
        const imageMessage = createMainImageMessage(room.roomName, randomImage);
        roomSocket.send(JSON.stringify(imageMessage));

    });

    console.log(`[🏆 Pikachu killed] By: ${sender} in room: ${roomName}`);
}


module.exports = {
    startPikachuEvent,
    handleFireCommand, startQuranBroadcast
};

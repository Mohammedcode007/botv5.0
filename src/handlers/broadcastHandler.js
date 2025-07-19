const fs = require('fs');
const path = require('path');
const { createRoomMessage, createGiftMessage,createChatMessage } = require('../messageUtils');
const { loadRooms, getUserLanguage, isUserBlocked, isUserVerified } = require('../fileUtils');

const broadcastsPath = path.join(__dirname, '../data/broadcasts.json');
const forbiddenWords = ['كلمةسيئة', 'شتيمة', 'حظر'];

const pendingBroadcasts = {};
const lastBroadcastSentTime = {};
const COOLDOWN_DURATION = 5 * 60 * 1000; // 5 دقائق

function generateShortId(length = 5) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function loadBroadcastData() {
    try {
        return JSON.parse(fs.readFileSync(broadcastsPath, 'utf-8'));
    } catch {
        return {};
    }
}

function saveBroadcastData(data) {
    fs.writeFileSync(broadcastsPath, JSON.stringify(data, null, 2));
}

function containsForbiddenWords(text) {
    return forbiddenWords.some(word => text.includes(word));
}

function getUserBroadcastLikes(username) {
    const data = loadBroadcastData();
    const userData = data[username];
    if (!userData) return 0;
    return userData.broadcasts.reduce((acc, b) => acc + (b.likes || 0), 0);
}

function handleBroadcastCommand(data, socket, senderName) {
    if (isUserBlocked(senderName)) {
    const msg = `🚫 You are blocked.`;
    socket.send(JSON.stringify(createRoomMessage(data.room, msg)));
    return;
}

if (!isUserVerified(senderName)) {
    const msg = `⚠️ Sorry, this action is restricted to verified users only. Please contact the administration for further assistance.`;
    socket.send(JSON.stringify(createRoomMessage(data.room, msg)));
    return;
}
    const now = Date.now();
    const lastSent = lastBroadcastSentTime[senderName];

    if (lastSent && now - lastSent < COOLDOWN_DURATION) {
        const lang = getUserLanguage(senderName) || 'ar';
        const waitMsg = lang === 'ar'
            ? '⏳ لا يمكنك إرسال برودكاست الآن. الرجاء الانتظار 5 دقائق بين كل برودكاست.'
            : '⏳ You must wait 5 minutes between each broadcast.';
        socket.send(JSON.stringify(createRoomMessage(data.room, waitMsg)));
        return;
    }

    lastBroadcastSentTime[senderName] = now;
    pendingBroadcasts[senderName] = socket;

    const lang = getUserLanguage(senderName) || 'ar';
    const msg = lang === 'ar'
        ? '📝 أرسل الآن نص البرودكاست أو صورة خلال 60 ثانية.'
        : '📝 Send your broadcast message or image within 60 seconds.';
    socket.send(JSON.stringify(createRoomMessage(data.room, msg)));

    setTimeout(() => {
        if (pendingBroadcasts[senderName]) {
            delete pendingBroadcasts[senderName];
            socket.send(JSON.stringify(createRoomMessage(data.room, '⏰ Time expired. No broadcast was sent.')));
        }
}, 60000);
}

function handleBroadcastText(data, senderName, ioSockets,socket) {
    if (!pendingBroadcasts[senderName]) return;
    if (containsForbiddenWords(data.body)) return;
if (isUserBlocked(senderName)) {
    const msg = `🚫 You are blocked.`;
    socket.send(JSON.stringify(createRoomMessage(data.room, msg)));
    return;
}

if (!isUserVerified(senderName)) {
    const msg = `⚠️ Sorry, this action is restricted to verified users only. Please contact the administration for further assistance.`;
    socket.send(JSON.stringify(createRoomMessage(data.room, msg)));
    return;
}

    if (data.body.length > 300) {
        const lang = getUserLanguage(senderName) || 'ar';
        const msg = lang === 'ar'
            ? '❌ لا يمكن أن تتجاوز رسالة البرودكاست 300 حرف.'
            : '❌ Broadcast message cannot exceed 300 characters.';
        const senderSocket = pendingBroadcasts[senderName];
        if (senderSocket) {
            senderSocket.send(JSON.stringify(createRoomMessage(data.room, msg)));
        }
        delete pendingBroadcasts[senderName];
        return;
    }

    const messageId = generateShortId();
    const rooms = loadRooms();
    const totalLikes = getUserBroadcastLikes(senderName);

    rooms.forEach(room => {
        const roomName = room.roomName || room;
        const targetSocket = ioSockets[roomName];
        if (targetSocket && targetSocket.readyState === 1) {
            const msg = 
`╔🎤 BROADCAST ╗
📢 From: ${senderName}
🏠 Room: ${data.room}
📝 Message:
${data.body}
❤️ Likes: ${totalLikes}
💖 React: love@${messageId}
`;
            targetSocket.send(JSON.stringify(createRoomMessage(roomName, msg)));
        }
    });

    const dataStore = loadBroadcastData();
    if (!dataStore[senderName]) dataStore[senderName] = { broadcasts: [] };
    dataStore[senderName].broadcasts.push({ id: messageId, likes: 0, likedBy: [] });
    saveBroadcastData(dataStore);

    delete pendingBroadcasts[senderName];
}

function handleBroadcastImage(data, senderName, ioSockets,socket) {
    if (!pendingBroadcasts[senderName] || !data.url) return;
if (isUserBlocked(senderName)) {
    const msg = `🚫 You are blocked.`;
    socket.send(JSON.stringify(createRoomMessage(data.room, msg)));
    return;
}

if (!isUserVerified(senderName)) {
    const msg = `⚠️ Sorry, this action is restricted to verified users only. Please contact the administration for further assistance.`;
    socket.send(JSON.stringify(createRoomMessage(data.room, msg)));
    return;
}

    const messageId = generateShortId();
    const rooms = loadRooms();
    const totalLikes = getUserBroadcastLikes(senderName);

    rooms.forEach(room => {
        const roomName = room.roomName || room;
        const targetSocket = ioSockets[roomName];
        if (targetSocket && targetSocket.readyState === 1) {
            const text = 
`╔ 📸 IMAGE BROADCAST ╗
📢 From: ${senderName}
🏠 Room: ${data.room}
❤️ Likes: ${totalLikes}
🆔 ID: ${messageId}
💖 React: love@${messageId}
`;
            targetSocket.send(JSON.stringify(createRoomMessage(roomName, text)));
            targetSocket.send(JSON.stringify(createGiftMessage(roomName, data.url)));
        }
    });

    const dataStore = loadBroadcastData();
    if (!dataStore[senderName]) dataStore[senderName] = { broadcasts: [] };
    dataStore[senderName].broadcasts.push({ id: messageId, likes: 0, likedBy: [] });
    saveBroadcastData(dataStore);

    delete pendingBroadcasts[senderName];
}

function handleBroadcastLike(data, senderName, socket) {
    const body = data.body.trim();
    if (isUserBlocked(senderName)) {
    const msg = `🚫 You are blocked.`;
    socket.send(JSON.stringify(createRoomMessage(data.room, msg)));
    return;
}

if (!isUserVerified(senderName)) {
    const msg = `⚠️ Sorry, this action is restricted to verified users only. Please contact the administration for further assistance.`;
    socket.send(JSON.stringify(createRoomMessage(data.room, msg)));
    return;
}
    if (!body.startsWith('love@')) return;

    const id = body.split('@')[1]?.trim();
    if (!id) return;

    const allData = loadBroadcastData();
    let found = false;

    for (const user in allData) {
        for (const broadcast of allData[user].broadcasts) {
            if (broadcast.id === id) {
                if (!broadcast.likedBy) broadcast.likedBy = [];
                if (!broadcast.likedBy.includes(senderName)) {
                    broadcast.likes = (broadcast.likes || 0) + 1;
                    broadcast.likedBy.push(senderName);
                    found = true;
                }
            }
        }
    }

    if (found) {
        saveBroadcastData(allData);
        const lang = getUserLanguage(senderName) || 'ar';
        const msg = lang === 'ar'
            ? `✅ تم إعجابك بالرسالة ${id}`
            : `✅ You liked message ${id}`;
        socket.send(JSON.stringify(createRoomMessage(data.room, msg)));
                const privateMsg = lang === 'ar'
            ? `❤️ ${senderName} أعجب برسالتك التي تحمل المعرف: ${id}`
            : `❤️ ${senderName} liked your message with ID: ${id}`;

        socket.send(JSON.stringify(
            createChatMessage(data.from, privateMsg)
        ));
    } else {
        socket.send(JSON.stringify(createRoomMessage(data.room, `⚠️ Message not found or already liked.`)));
    }
}

function handleTopBroadcasters(data, socket) {
    const allData = loadBroadcastData();
if (isUserBlocked(data.from)) {
    const msg = `🚫 You are blocked.`;
    socket.send(JSON.stringify(createRoomMessage(data.room, msg)));
    return;
}

if (!isUserVerified(data.from)) {
    const msg = `⚠️ Sorry, this action is restricted to verified users only. Please contact the administration for further assistance.`;
    socket.send(JSON.stringify(createRoomMessage(data.room, msg)));
    return;
}
    const ranking = Object.entries(allData).map(([username, info]) => ({
        username,
        likes: info.broadcasts.reduce((acc, b) => acc + (b.likes || 0), 0)
    }));

    const sorted = ranking.sort((a, b) => b.likes - a.likes).slice(0, 5);

    let msg = '🏆 Top 5 Broadcasters:\n';
    sorted.forEach((u, i) => {
        msg += `${i + 1}. ${u.username} - ❤️ ${u.likes} likes\n`;
    });

    socket.send(JSON.stringify(createRoomMessage(data.room, msg)));
}

module.exports = {
    handleBroadcastCommand,
    handleBroadcastText,
    handleBroadcastImage,
    handleBroadcastLike,
    handleTopBroadcasters,
    pendingBroadcasts
};

const { createMainImageMessage, createRoomMessage } = require('../messageUtils');
const { loadRooms, isUserBlocked, isUserVerified } = require('../fileUtils'); // تأكد أن هذا موجود

function handleImageGiftCommand(data, socket, ioSockets) {
    const body = data.body?.trim();
    const sender = data.from;
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
    if (!body.startsWith('link@')) return;

    const parts = body.split('@');

    if (parts.length < 3) {
        const errorMsg = createRoomMessage(data.room, '❌ Invalid format. Use: link@image_url@username');
        socket.send(JSON.stringify(errorMsg));
        return;
    }

    const imageURL = parts[1]?.trim();
    const targetUser = parts.slice(2).join('@').trim();

    if (!imageURL || !targetUser) {
        const errorMsg = createRoomMessage(data.room, '❌ Please provide a valid image URL and username.');
        socket.send(JSON.stringify(errorMsg));
        return;
    }

    const rooms = loadRooms(); // تحميل جميع الغرف

    rooms.forEach(room => {
        if (room.gamesEnabled === false) return; // تجاهل الغرف المعطّلة

        const socketForRoom = ioSockets[room.roomName];
        if (socketForRoom && socketForRoom.readyState === 1) {
            const imageMessage = createMainImageMessage(room.roomName, imageURL);
            const textMessage = createRoomMessage(room.roomName, `🎁 From ${sender} ➜ To ${targetUser}`);
            socketForRoom.send(JSON.stringify(imageMessage));
            socketForRoom.send(JSON.stringify(textMessage));
        }
    });
}

module.exports = {
    handleImageGiftCommand,
};

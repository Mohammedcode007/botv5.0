const { saveRooms, getRooms } = require('../fileUtils');
const { createRoomMessage } = require('../messageUtils');

// ✅ تفعيل الألعاب
function enableGames(data, senderName, roomName, currentLanguage, socket) {
    const rooms = getRooms();
    const targetRoom = rooms.find(r => r.roomName === roomName);

    if (targetRoom) {
        // أضف الخاصية إذا لم تكن موجودة
        if (typeof targetRoom.gamesEnabled === 'undefined') {
            targetRoom.gamesEnabled = false;
        }

        targetRoom.gamesEnabled = true;
        saveRooms(rooms);

        const confirmation = currentLanguage === 'ar'
            ? `✅ تم تفعيل الألعاب في الغرفة "${roomName}".`
            : `✅ Games have been enabled in room "${roomName}".`;

        if (socket && typeof socket.send === 'function') {
            socket.send(JSON.stringify(createRoomMessage(roomName, confirmation)));
        }

        console.log(`✅ [Games ON] by ${senderName} in room: ${roomName}`);
    }
}

// ✅ تعطيل الألعاب
function disableGames(data, senderName, roomName, currentLanguage, socket) {
    const rooms = getRooms();
    const targetRoom = rooms.find(r => r.roomName === roomName);

    if (targetRoom) {
        // أضف الخاصية إذا لم تكن موجودة
        if (typeof targetRoom.gamesEnabled === 'undefined') {
            targetRoom.gamesEnabled = false;
        }

        targetRoom.gamesEnabled = false;
        saveRooms(rooms);

        const confirmation = currentLanguage === 'ar'
            ? `🛑 تم تعطيل الألعاب في الغرفة "${roomName}".`
            : `🛑 Games have been disabled in room "${roomName}".`;

        if (socket && typeof socket.send === 'function') {
            socket.send(JSON.stringify(createRoomMessage(roomName, confirmation)));
        }

        console.log(`🛑 [Games OFF] by ${senderName} in room: ${roomName}`);
    }
}

module.exports = {
    enableGames,
    disableGames
};

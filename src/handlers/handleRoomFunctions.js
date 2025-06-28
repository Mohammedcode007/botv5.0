// src/handlers/handleDeleteRoomCommand.js
const { loadRooms, saveRooms, deleteRoom } = require('../fileUtils'); // Importing file utilities
const { getUserLanguage } = require('../fileUtils'); // استيراد دالة الحصول على لغة المستخدم
const {
    createChatMessage,
    createLoginMessage,
    createJoinRoomMessage,
    createErrorMessage
} = require('../messageUtils');
module.exports.handleDeleteRoomCommand = function handleDeleteRoomCommand(roomName, senderUsername, mainSocket) {
    const currentLanguage = getUserLanguage(senderUsername) || 'en'; // Get the current language of the user

    // Load the list of rooms from file
    const rooms = loadRooms();
    const room = rooms.find(r => r.roomName === roomName); // Find the room by name

    if (room) {
        
        // Check if the user is the master or admin of the room
        if (room.master === senderUsername || room.masterList.includes(senderUsername)) {
            // Delete the room using the deleteRoom function
            deleteRoom(roomName);
            saveRooms(rooms); // Ensure the room list is saved after deletion

            // Send a success message to the user
            const successMessage = currentLanguage === 'ar'
                ? `✅ تم حذف الغرفة "${roomName}".`
                : `✅ The room "${roomName}" has been deleted.`;

            const successResponse = createChatMessage(senderUsername, successMessage);
            mainSocket.send(JSON.stringify(successResponse));
        } else {
            // If the user doesn't have permission to delete the room
            const errorMessage = currentLanguage === 'ar'
                ? '❌ لا تملك الصلاحيات لحذف هذه الغرفة.'
                : '❌ You do not have permission to delete this room.';

            const errorResponse = createChatMessage(senderUsername, errorMessage);
            mainSocket.send(JSON.stringify(errorResponse));
        }
    } else {
        // If the room doesn't exist
        const errorMessage = currentLanguage === 'ar'
            ? `❌ الغرفة "${roomName}" غير موجودة.`
            : `❌ The room "${roomName}" does not exist.`;

        const errorResponse = createChatMessage(senderUsername, errorMessage);
        mainSocket.send(JSON.stringify(errorResponse));
    }
};

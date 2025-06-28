// src/handlers/handleJoinCommand.js
const WebSocket = require('ws');
const { loadRooms, roomExists, addRoom,saveRooms } = require('../fileUtils');
const { getUserLanguage } = require('../fileUtils'); // ✅ استيراد دالة اللغة
const {
    WEBSOCKET_URL
} = require('../constants');

const {
    createChatMessage,
    createLoginMessage,
    createJoinRoomMessage,
    createErrorMessage
} = require('../messageUtils');

module.exports = function handleJoinCommand(body, senderUsername, mainSocket) {
    const roomName = body.split('@')[1]?.trim();
    if (!roomName) return;

    const currentLanguage = getUserLanguage(senderUsername) || 'en'; // ✅ تحديد لغة المستخدم

    let rooms = loadRooms();

    if (roomExists(rooms, roomName)) {
        const errorText = currentLanguage === 'ar'
            ? `❌ الغرفة "${roomName}" موجودة بالفعل. سيتم تجاهل الانضمام.`
            : `❌ Room "${roomName}" already exists. Skipping join.`;

        const privateMessage = createErrorMessage(senderUsername, errorText);
        mainSocket.send(JSON.stringify(privateMessage));
        return;
    }

    const loginSocket = new WebSocket(WEBSOCKET_URL);

    loginSocket.onopen = () => {
        const loginMsg = createLoginMessage('test-bott', '12345678');
        loginSocket.send(JSON.stringify(loginMsg));
    };
    loginSocket.onmessage = (loginEvent) => {
    const loginData = JSON.parse(loginEvent.data);

    // فقط عندما تكون الرسالة نوعها 'success' أو 'error' نفعل شيء
    if (loginData.type === 'success' || loginData.type === 'error') {
        const loginText = currentLanguage === 'ar'
            ? (loginData.type === 'success'
                ? `✅ تم تسجيل الدخول بنجاح باسم test-bott`
                : `❌ فشل تسجيل الدخول باسم test-bott`)
            : (loginData.type === 'success'
                ? `✅ Login successful for test-bott`
                : `❌ Login failed for test-bott`);

        const privateMessage = createChatMessage(senderUsername, loginText);
        mainSocket.send(JSON.stringify(privateMessage));

        if (loginData.type === 'success') {
            const joinRoomMessage = createJoinRoomMessage(roomName);
            loginSocket.send(JSON.stringify(joinRoomMessage));

            const roomDetails = {
                roomName,
                master: senderUsername,
                username: 'test-bott',
                password: '12345678'
            };
            addRoom(rooms, roomDetails);
             saveRooms(rooms);        // حفظ الغرف بعد الإضافة
        rooms = loadRooms();     // تحديث الغرف في الذاكرة
        }
    }
};


    // loginSocket.onmessage = (loginEvent) => {
    //     const loginData = JSON.parse(loginEvent.data);

    //     const loginText = currentLanguage === 'ar'
    //         ? (loginData.type === 'success'
    //             ? `✅ تم تسجيل الدخول بنجاح باسم test-bott`
    //             : `❌ فشل تسجيل الدخول باسم test-bott`)
    //         : (loginData.type === 'success'
    //             ? `✅ Login successful for test-bott`
    //             : `❌ Login failed for test-bott`);

    //     const privateMessage = createChatMessage(senderUsername, loginText);
    //     mainSocket.send(JSON.stringify(privateMessage));

    //     if (loginData.type === 'success') {
    //         const joinRoomMessage = createJoinRoomMessage(roomName);
    //         loginSocket.send(JSON.stringify(joinRoomMessage));

    //         const roomDetails = {
    //             roomName,
    //             master: senderUsername,
    //             username: 'test-bott',
    //             password: '12345678'
    //         };
    //         addRoom(rooms, roomDetails);
    //     }
    // };

    loginSocket.onerror = (error) => {
        console.error('⚠️ WebSocket error during login:', error);
    };
};

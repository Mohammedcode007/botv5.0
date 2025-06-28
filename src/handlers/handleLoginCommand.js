// src/handlers/handleLoginCommand.js
const WebSocket = require('ws');
const { loadRooms, saveRooms, roomExists, addRoom } = require('../fileUtils');
const { WEBSOCKET_URL, DEFAULT_SESSION, DEFAULT_SDK, DEFAULT_VER, DEFAULT_ID, DEFAULT_JOIN_ID } = require('../constants'); // استيراد الثوابت
const { createChatMessage, createLoginMessage, createJoinRoomMessage, createErrorMessage } = require('../messageUtils'); // استيراد دوال الرسائل
const { getUserLanguage } = require('../fileUtils'); // استيراد دالة الحصول على لغة المستخدم

module.exports = function handleLoginCommand(body, senderUsername, mainSocket) {

    // الحصول على لغة المستخدم
    const userLanguage = getUserLanguage(senderUsername) || 'en'; // إذا كانت اللغة غير موجودة، نستخدم الإنجليزية كافتراضي

    const parts = body.split('#');
    if (parts.length >= 4) {

        const loginUsername = parts[1];
        const loginPassword = parts.slice(2, parts.length - 1).join('#');
        const roomName = parts[parts.length - 1];

        let rooms = loadRooms(); // تحميل الغرف من الملف

        // تحقق إذا كانت الغرفة موجودة مسبقاً
        if (roomExists(rooms, roomName)) {
            const privateMessage = createErrorMessage(senderUsername, userLanguage === 'ar'
                ? `❌ الغرفة "${roomName}" موجودة بالفعل. تم تخطي الانضمام.`
                : `❌ Room "${roomName}" already exists. Skipping join.`);
            mainSocket.send(JSON.stringify(privateMessage)); // إرسال الرسالة للمستخدم
            return;
        }

        // الاتصال بخادم WebSocket
        const loginSocket = new WebSocket(WEBSOCKET_URL); // استخدام الثابت WEBSOCKET_URL

        loginSocket.onopen = () => {
            const loginMsg = createLoginMessage(loginUsername, loginPassword); // استخدام دالة إنشاء رسالة الدخول
            loginSocket.send(JSON.stringify(loginMsg)); // إرسال رسالة الدخول
        };

       loginSocket.onmessage = (loginEvent) => {
    const loginData = JSON.parse(loginEvent.data);

    // فلترة فقط أول رد لتسجيل الدخول (نجاح أو فشل)
    if (loginData.type === 'success' || loginData.type === 'error') {
        const privateMessage = createChatMessage(senderUsername,
            loginData.type === 'success'
                ? (userLanguage === 'ar'
                    ? `✅ تم تسجيل الدخول بنجاح لـ ${loginUsername}`
                    : `✅ Login successful for ${loginUsername}`)
                : (userLanguage === 'ar'
                    ? `❌ فشل تسجيل الدخول لـ ${loginUsername}`
                    : `❌ Login failed for ${loginUsername}`)
        );
        mainSocket.send(JSON.stringify(privateMessage));
    }

    if (loginData.type === 'success') {
        // إرسال رسالة الانضمام
        const joinRoomMessage = createJoinRoomMessage(roomName);
        loginSocket.send(JSON.stringify(joinRoomMessage));

        const roomDetails = {
            roomName,
            master: senderUsername,
            username: loginUsername,
            password: loginPassword,
            masterList: [] // لتفادي مشاكل لاحقًا
        };

        addRoom(rooms, roomDetails);
    }
};

    }
};

// src/handlers/handleLoginCommand.js

const WebSocket = require('ws');
const { addRoom, roomExists } = require('../fileUtils');
const { getUserLanguage } = require('../fileUtils');
const { WEBSOCKET_URL } = require('../constants');

const {
    createChatMessage,
    createLoginMessage,
    createJoinRoomMessage,
    createErrorMessage
} = require('../messageUtils');

module.exports = function handleLoginCommand(body, senderUsername, mainSocket) {
    console.log(`🟨 تلقى أمر تسجيل الدخول: ${body} من المستخدم: ${senderUsername}`);

    const parts = body.split('#');
    if (parts.length < 4) {
        const currentLanguage = getUserLanguage(senderUsername) || 'en';
        const errorText = currentLanguage === 'ar'
            ? '❌ الصيغة غير صحيحة. الصيغة الصحيحة login#username#password#room'
            : '❌ Invalid format. Correct format is login#username#password#room';

        const privateMessage = createErrorMessage(senderUsername, errorText);
        if (mainSocket.readyState === WebSocket.OPEN) {
            mainSocket.send(JSON.stringify(privateMessage));
        }
        return;
    }

    const loginUsername = parts[1].trim();
    const loginPassword = parts[2].trim();
    const roomName = parts[3].trim();

    const currentLanguage = getUserLanguage(senderUsername) || 'en';

    console.log(`🔍 التحقق مما إذا كانت الغرفة "${roomName}" موجودة بالفعل...`);

    if (roomExists(roomName)) {
        console.log(`⚠️ الغرفة "${roomName}" موجودة بالفعل، لن يتم الانضمام مجددًا.`);
        const errorText = currentLanguage === 'ar'
            ? `❌ الغرفة "${roomName}" موجودة بالفعل. سيتم تجاهل الانضمام.`
            : `❌ Room "${roomName}" already exists. Skipping join.`;

        const privateMessage = createErrorMessage(senderUsername, errorText);
        if (mainSocket.readyState === WebSocket.OPEN) {
            mainSocket.send(JSON.stringify(privateMessage));
        }
        return;
    }

    console.log(`🌐 إنشاء اتصال WebSocket لتسجيل الدخول إلى البوت...`);
    const loginSocket = new WebSocket(WEBSOCKET_URL);

    loginSocket.onopen = () => {
        console.log('✅ WebSocket مفتوح، إرسال بيانات تسجيل الدخول...');
        const loginMsg = createLoginMessage(loginUsername, loginPassword);
        loginSocket.send(JSON.stringify(loginMsg));
    };

    loginSocket.onmessage = (loginEvent) => {
        const loginData = JSON.parse(loginEvent.data);
        console.log('📥 تم استقبال رسالة من السيرفر:', loginData);

        if (loginData.type === 'success' || loginData.type === 'error') {
            const loginText = currentLanguage === 'ar'
                ? (loginData.type === 'success'
                    ? `✅ تم تسجيل الدخول بنجاح باسم ${loginUsername}`
                    : `❌ فشل تسجيل الدخول باسم ${loginUsername}`)
                : (loginData.type === 'success'
                    ? `✅ Login successful for ${loginUsername}`
                    : `❌ Login failed for ${loginUsername}`);

            const privateMessage = createChatMessage(senderUsername, loginText);
            if (mainSocket.readyState === WebSocket.OPEN) {
                mainSocket.send(JSON.stringify(privateMessage));
            }

            if (loginData.type === 'success') {
                console.log(`📤 إرسال طلب الانضمام إلى الغرفة "${roomName}"...`);
                const joinRoomMessage = createJoinRoomMessage(roomName);
                loginSocket.send(JSON.stringify(joinRoomMessage));

                const roomDetails = {
                    roomName,
                    master: senderUsername,
                    username: loginUsername,
                    password: loginPassword
                };

                console.log('➕ محاولة إضافة الغرفة إلى ملف الغرف:', roomDetails);
                addRoom(roomDetails);
                console.log(`✅ تم تنفيذ addRoom بنجاح للغرفة "${roomName}".`);
            }
        }
    };

    loginSocket.onerror = (error) => {
        console.error('⚠️ خطأ في WebSocket أثناء تسجيل الدخول:', error);
    };
};

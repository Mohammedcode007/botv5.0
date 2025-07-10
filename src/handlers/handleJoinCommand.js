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

module.exports = function handleJoinCommand(body, senderUsername, mainSocket) {
    console.log(`🟨 تلقى أمر الانضمام: ${body} من المستخدم: ${senderUsername}`);

    const roomName = body.includes('@') ? body.split('@')[1].trim() : null;

    if (!roomName) {
        console.log(`❌ لم يتم تحديد اسم الغرفة بشكل صحيح في الأمر: ${body}`);
        const currentLanguage = getUserLanguage(senderUsername) || 'en';
        const errorText = currentLanguage === 'ar'
            ? '❌ لم يتم تحديد اسم الغرفة بشكل صحيح. الصيغة الصحيحة join@roomname'
            : '❌ Room name is missing. Correct format is join@roomname';

        const privateMessage = createErrorMessage(senderUsername, errorText);
        if (mainSocket.readyState === WebSocket.OPEN) {
            mainSocket.send(JSON.stringify(privateMessage));
        }
        return;
    }

    console.log(`🔍 التحقق مما إذا كانت الغرفة "${roomName}" موجودة بالفعل...`);

    const currentLanguage = getUserLanguage(senderUsername) || 'en';

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
        const loginMsg = createLoginMessage('𐦖𝆔.', 'sembaa');
        loginSocket.send(JSON.stringify(loginMsg));
    };

    loginSocket.onmessage = (loginEvent) => {
        const loginData = JSON.parse(loginEvent.data);
        console.log('📥 تم استقبال رسالة من السيرفر:', loginData);

        if (loginData.type === 'success' || loginData.type === 'error') {
            const loginText = currentLanguage === 'ar'
                ? (loginData.type === 'success'
                    ? `✅ تم تسجيل الدخول بنجاح باسم 𐦖𝆔.`
                    : `❌ فشل تسجيل الدخول باسم 𐦖𝆔.`)
                : (loginData.type === 'success'
                    ? `✅ Login successful for 𐦖𝆔.`
                    : `❌ Login failed for 𐦖𝆔.`);

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
                    username: '𐦖𝆔.',
                    password: 'sembaa'
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

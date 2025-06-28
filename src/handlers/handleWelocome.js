const { loadRooms, saveRooms, roomExists, addRoom } = require('../fileUtils');
const {
    createRoomMessage
} = require('../messageUtils');
// دالة إيقاف رسالة الترحيب
function disableWelcomeMessage(data, master, senderName, roomName, rooms, currentLanguage, socket) {
    if (data.body.startsWith('wec@off')) {
        if (master === senderName) {
            console.log(`✅ Disabling welcome message for room: ${roomName}`);

            // تعديل مباشر على كائن الغرفة دون إنشاء نسخة جديدة
            const targetRoom = rooms.find(r => r.roomName === roomName);
            if (targetRoom) {
                targetRoom.welcomeEnabled = false; // إيقاف خاصية الترحيب
            }

            const confirmation = currentLanguage === 'ar'
                ? `✅ تم إيقاف رسالة الترحيب للغرفة "${roomName}".`
                : `✅ Welcome message has been disabled for room "${roomName}".`;

            const confirmMessage = createRoomMessage(roomName, confirmation);
            socket.send(JSON.stringify(confirmMessage));
            console.log('✅ Welcome message disabled.');

            // حفظ التغييرات بعد التعديل المباشر
            saveRooms(rooms);

        } else {
            const errorText = currentLanguage === 'ar'
                ? '❌ أنت لست ماستر الغرفة ولا يمكنك إيقاف رسالة الترحيب.'
                : '❌ You are not the master of the room and cannot disable the welcome message.';

            const errorMessage = createRoomMessage(roomName, errorText);
            socket.send(JSON.stringify(errorMessage));
            console.log('❌ Unauthorized attempt to disable welcome message.');
        }
    }
}

// دالة تفعيل رسالة الترحيب
function enableWelcomeMessage(data, master, senderName, roomName, rooms, currentLanguage, socket) {
    if (data.body.startsWith('wec@on')) {
        if (master === senderName) {
            console.log(`✅ Enabling welcome message for room: ${roomName}`);

            // تعديل مباشر على كائن الغرفة
            const targetRoom = rooms.find(r => r.roomName === roomName);
            if (targetRoom) {
                targetRoom.welcomeEnabled = true; // تفعيل الترحيب دون تعديل الرسالة
            }

            const confirmation = currentLanguage === 'ar'
                ? `✅ تم تفعيل رسالة الترحيب للغرفة "${roomName}".`
                : `✅ Welcome message has been enabled for room "${roomName}".`;

            const confirmMessage = createRoomMessage(roomName, confirmation);
            socket.send(JSON.stringify(confirmMessage));
            console.log('✅ Welcome message enabled.');
            saveRooms(rooms);

        } else {
            const errorText = currentLanguage === 'ar'
                ? '❌ أنت لست ماستر الغرفة ولا يمكنك تفعيل رسالة الترحيب.'
                : '❌ You are not the master of the room and cannot enable the welcome message.';

            const errorMessage = createRoomMessage(roomName, errorText);
            socket.send(JSON.stringify(errorMessage));
            console.log('❌ Unauthorized attempt to enable welcome message.');
        }
    }
}


// دالة تعيين رسالة الترحيب
function setWelcomeMessage(data, master, senderName, roomName, rooms, currentLanguage, socket) {
    if (data.body.startsWith('setmsg@')) {
        const message = data.body.split('@')[1];

        if (message) {
            const welcomeMessage = message; // لا تستبدل $ هنا

            if (master === senderName) {
                console.log(`📝 Setting welcome message in room: ${roomName}`);

                const targetRoom = rooms.find(r => r.roomName === roomName);
                if (targetRoom) {
                    targetRoom.welcomeMessage = welcomeMessage;
                }

                const confirmation = currentLanguage === 'ar'
                    ? `✅ تم تعيين رسالة الترحيب للغرفة "${roomName}".`
                    : `✅ Welcome message has been set for room "${roomName}".`;

                const confirmMessage = createRoomMessage(roomName, confirmation);
                socket.send(JSON.stringify(confirmMessage));
                console.log('✅ Welcome message saved in memory.');
                saveRooms(rooms);

            } else {
                const errorText = currentLanguage === 'ar'
                    ? '❌ أنت لست ماستر الغرفة ولا يمكنك تعيين رسالة ترحيب.'
                    : '❌ You are not the master of the room and cannot set the welcome message.';

                const errorMessage = createRoomMessage(roomName, errorText);
                socket.send(JSON.stringify(errorMessage));
                console.log('❌ Unauthorized attempt to set welcome message.');
            }
        }
    }
}




module.exports = {
    setWelcomeMessage,
    enableWelcomeMessage,
    disableWelcomeMessage
}
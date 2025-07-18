
// const WebSocket = require('ws');
// const { addSilentRoom, loadSilentRooms, saveSilentRooms } = require('../fileUtils');
// const { getUserLanguage } = require('../fileUtils');
// const { WEBSOCKET_URL } = require('../constants');

// const {
//     createChatMessage,
//     createLoginMessage,
//     createJoinRoomMessage,
//     createErrorMessage
// } = require('../messageUtils');

// module.exports = function handleSilentJoinCommand(body, senderUsername, mainSocket) {
//     const currentLanguage = getUserLanguage(senderUsername) || 'en';
//     const lowerBody = body.toLowerCase();
//     const silentRooms = loadSilentRooms();

//     // ✅ أمر حذف جميع الغرف لهذا اليوزر
//     if (lowerBody.startsWith('rsb#') && body.split('#').length === 2) {
//         const username = body.split('#')[1]?.trim();

//         if (!username) {
//             const errorText = currentLanguage === 'ar'
//                 ? '❌ الصيغة غير صحيحة. الصيغة الصحيحة: rsb#username'
//                 : '❌ Invalid format. Correct format is: rsb#username';

//             const privateMessage = createErrorMessage(senderUsername, errorText);
//             if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));
//             return;
//         }

//         const filteredRooms = silentRooms.filter(
//             r => !(r.username === username && r.master === senderUsername)
//         );

//         const deletedCount = silentRooms.length - filteredRooms.length;
//         saveSilentRooms(filteredRooms);

//         const resultText = deletedCount > 0
//             ? (currentLanguage === 'ar'
//                 ? `✅ تم حذف ${deletedCount} غرفة/غرف للمستخدم "${username}" بنجاح.`
//                 : `✅ Successfully removed ${deletedCount} room(s) for username "${username}".`)
//             : (currentLanguage === 'ar'
//                 ? `⚠️ لا توجد غرف محفوظة للمستخدم "${username}" بواسطة حسابك.`
//                 : `⚠️ No rooms found for username "${username}" under your account.`);

//         const privateMessage = createChatMessage(senderUsername, resultText);
//         if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));
//         return;
//     }

//     // ✅ أمر حذف غرفة واحدة محددة
//     if (lowerBody.startsWith('rsb#') && body.split('#').length === 3) {
//         const parts = body.split('#');
//         const username = parts[1]?.trim();
//         const roomName = parts[2]?.trim();

//         if (!username || !roomName) {
//             const errorText = currentLanguage === 'ar'
//                 ? '❌ الصيغة غير صحيحة. الصيغة الصحيحة: rsb#username#room'
//                 : '❌ Invalid format. Correct format is: rsb#username#room';

//             const privateMessage = createErrorMessage(senderUsername, errorText);
//             if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));
//             return;
//         }

//         const filteredRooms = silentRooms.filter(
//             r => !(r.username === username && r.roomName === roomName && r.master === senderUsername)
//         );

//         const deletedCount = silentRooms.length - filteredRooms.length;
//         saveSilentRooms(filteredRooms);

//         const resultText = deletedCount > 0
//             ? (currentLanguage === 'ar'
//                 ? `✅ تم حذف الغرفة "${roomName}" للمستخدم "${username}" بنجاح.`
//                 : `✅ Successfully removed room "${roomName}" for username "${username}".`)
//             : (currentLanguage === 'ar'
//                 ? `⚠️ لا توجد غرفة باسم "${roomName}" للمستخدم "${username}" محفوظة بواسطة حسابك.`
//                 : `⚠️ No room named "${roomName}" for username "${username}" found under your account.`);

//         const privateMessage = createChatMessage(senderUsername, resultText);
//         if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));
//         return;
//     }

//     // ✅ أمر تغيير البروفايل
//     if (lowerBody.startsWith('profile#') && body.split('#').length === 3) {
//         const parts = body.split('#');
//         const targetUsername = parts[1]?.trim();
//         const newValue = parts[2]?.trim();

//         if (!targetUsername || !newValue) {
//             const errorText = currentLanguage === 'ar'
//                 ? '❌ الصيغة غير صحيحة. الصيغة الصحيحة: profile#username#value'
//                 : '❌ Invalid format. Correct format is: profile#username#value';

//             const privateMessage = createErrorMessage(senderUsername, errorText);
//             if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));
//             return;
//         }

//         const roomEntry = silentRooms.find(
//             r => r.username === targetUsername && r.master === senderUsername
//         );

//         if (!roomEntry) {
//             const errorText = currentLanguage === 'ar'
//                 ? `❌ لا تملك صلاحية تعديل بروفايل المستخدم "${targetUsername}".`
//                 : `❌ You do not have permission to update profile for username "${targetUsername}".`;

//             const privateMessage = createErrorMessage(senderUsername, errorText);
//             if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));
//             return;
//         }

//         const profileSocket = new WebSocket(WEBSOCKET_URL);

//         profileSocket.onopen = () => {
//             const loginMsg = createLoginMessage(roomEntry.username, roomEntry.password);
//             profileSocket.send(JSON.stringify(loginMsg));
//         };

//         profileSocket.onmessage = (event) => {
//             const data = JSON.parse(event.data);

//             if (data.handler === 'login_event') {
//                 const loginText = data.type === 'success'
//                     ? (currentLanguage === 'ar' ? `✅ تم تسجيل الدخول لتعديل بروفايل ${targetUsername}` : `✅ Login success to update profile for ${targetUsername}`)
//                     : (currentLanguage === 'ar' ? `❌ فشل تسجيل الدخول للمستخدم ${targetUsername}` : `❌ Login failed for ${targetUsername}`);

//                 const privateMessage = createChatMessage(senderUsername, loginText);
//                 if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));

//                 if (data.type === 'success') {
//                     const updateProfileMessage = {
//                         handler: 'profile_update',
//                         id: 'iQGlQEghwwsXRhvVqCND', // معرف ثابت للبروفايل (حسب النظام لديك)
//                         type: 'status', // يمكن تغييره إلى bio أو حسب نوع التحديث
//                         value: newValue
//                     };

//                     profileSocket.send(JSON.stringify(updateProfileMessage));

//                     const doneText = currentLanguage === 'ar'
//                         ? `✅ تم تحديث بروفايل "${targetUsername}" إلى: ${newValue}`
//                         : `✅ Profile for "${targetUsername}" updated to: ${newValue}`;

//                     const doneMessage = createChatMessage(senderUsername, doneText);
//                     if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(doneMessage));

//                     setTimeout(() => {
//                         profileSocket.close();
//                     }, 1000);
//                 }
//             }
//         };

//         profileSocket.onerror = (error) => {
//             console.error('⚠️ WebSocket error:', error);
//         };

//         profileSocket.onclose = (code, reason) => {
//             console.log(`❌ Connection closed for profile update: ${targetUsername} - Code: ${code}, Reason: ${reason}`);
//         }

//         return;
//     }

//     // ✅ أمر إضافة غرفة بصيغة SB#USERNAME#PASSWORD#ROOM
//     const parts = body.split('#');

//     if (parts.length !== 4 || parts[0].toLowerCase() !== 'sb') {
//         const errorText = currentLanguage === 'ar'
//             ? '❌ الصيغة غير صحيحة. الصيغة الصحيحة: SB#USERNAME#PASSWORD#ROOM'
//             : '❌ Invalid format. Correct format is: SB#USERNAME#PASSWORD#ROOM';

//         const privateMessage = createErrorMessage(senderUsername, errorText);
//         if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));
//         return;
//     }

//     const username = parts[1].trim();
//     const password = parts[2].trim();
//     const roomName = parts[3].trim();

//     if (!username || !password || !roomName) {
//         const errorText = currentLanguage === 'ar'
//             ? '❌ تأكد من إدخال اسم المستخدم وكلمة المرور واسم الغرفة بشكل صحيح.'
//             : '❌ Please ensure username, password, and room name are correctly provided.';

//         const privateMessage = createErrorMessage(senderUsername, errorText);
//         if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));
//         return;
//     }

//     const exists = silentRooms.some(
//         r => r.roomName === roomName && r.username === username
//     );

//     if (exists) {
//         const errorText = currentLanguage === 'ar'
//             ? `❌ الغرفة "${roomName}" موجودة بالفعل تحت المستخدم "${username}".`
//             : `❌ Room "${roomName}" already exists for username "${username}".`;

//         const privateMessage = createErrorMessage(senderUsername, errorText);
//         if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));
//         return;
//     }

//     const loginSocket = new WebSocket(WEBSOCKET_URL);
//     loginSocket.roomInfo = {
//         username: username,
//         roomName: roomName
//     };

//     loginSocket.onopen = () => {
//         const loginMsg = createLoginMessage(username, password);
//         loginSocket.send(JSON.stringify(loginMsg));
//     };

//     loginSocket.onmessage = (loginEvent) => {
//         const loginData = JSON.parse(loginEvent.data);

//         const loginText = loginData.type === 'success'
//             ? (currentLanguage === 'ar' ? `✅ تم تسجيل الدخول باسم ${username}` : `✅ Login success for ${username}`)
//             : (currentLanguage === 'ar' ? `❌ فشل تسجيل الدخول باسم ${username}` : `❌ Login failed for ${username}`);

//         const privateMessage = createChatMessage(senderUsername, loginText);
//         if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));

//         if (loginData.handler === 'login_event' && loginData.type === 'success') {
//             const joinRoomMessage = createJoinRoomMessage(roomName);
//             loginSocket.send(JSON.stringify(joinRoomMessage));

//             addSilentRoom({
//                 roomName: roomName,
//                 username: username,
//                 password: password,
//                 master: senderUsername
//             });
//         }
//     };

//     loginSocket.onclose = (code, reason) => {
//         console.log(`❌ Connection closed for room: ${loginSocket.roomInfo.roomName} - Code: ${code}, Reason: ${reason}`);
//         setTimeout(() => {
//             console.log(`🔄 Reconnecting to room: ${loginSocket.roomInfo.roomName}`);
//             handleSilentJoinCommand(`SB#${loginSocket.roomInfo.username}#${loginSocket.roomInfo.password}#${loginSocket.roomInfo.roomName}`, senderUsername, mainSocket);
//         }, 5000);
//     };

//     loginSocket.onerror = (error) => {
//         console.error('⚠️ WebSocket error:', error);
//     };
// };

const WebSocket = require('ws');
const { addSilentRoom, loadSilentRooms, saveSilentRooms } = require('../fileUtils');
const { getUserLanguage } = require('../fileUtils');
const { WEBSOCKET_URL } = require('../constants');
const {
    createChatMessage,
    createLoginMessage,
    createJoinRoomMessage,
    createErrorMessage
} = require('../messageUtils');

// ✅ دالة إرسال رسالة إلى الغرفة
const createRoomMessage = (roomName, body) => {
    return {
        handler: 'room_message',
        id: 'TclBVHgBzPGTMRTNpgWV',
        room: roomName,
        type: 'text',
        body,
        url: '',
        length: '',
    };
};

// ✅ قائمة المقابس النشطة للغرف الصامتة
const silentRoomSockets = [];

// ✅ إرسال نقطة "." كل دقيقة لضمان استمرار الاتصال
setInterval(() => {
    for (const socket of silentRoomSockets) {
        if (socket.readyState === WebSocket.OPEN && socket.roomInfo?.roomName) {
            const message = createRoomMessage(socket.roomInfo.roomName, '.');
            socket.send(JSON.stringify(message));
        }
    }
}, 60 * 1000);

module.exports = function handleSilentJoinCommand(body, senderUsername, mainSocket) {
    const currentLanguage = getUserLanguage(senderUsername) || 'en';
    const lowerBody = body.toLowerCase();
    const silentRooms = loadSilentRooms();

    // ✅ حذف جميع الغرف للمستخدم
    if (lowerBody.startsWith('rsb#') && body.split('#').length === 2) {
        const username = body.split('#')[1]?.trim();
        if (!username) {
            const msg = currentLanguage === 'ar'
                ? '❌ الصيغة غير صحيحة. الصيغة الصحيحة: rsb#username'
                : '❌ Invalid format. Correct format is: rsb#username';
            if (mainSocket.readyState === WebSocket.OPEN)
                mainSocket.send(JSON.stringify(createErrorMessage(senderUsername, msg)));
            return;
        }

        const filtered = silentRooms.filter(r => !(r.username === username && r.master === senderUsername));
        const deletedCount = silentRooms.length - filtered.length;
        saveSilentRooms(filtered);

        const resultText = deletedCount > 0
            ? (currentLanguage === 'ar'
                ? `✅ تم حذف ${deletedCount} غرفة/غرف للمستخدم "${username}".`
                : `✅ Removed ${deletedCount} room(s) for user "${username}".`)
            : (currentLanguage === 'ar'
                ? `⚠️ لا توجد غرف محفوظة لهذا المستخدم تحت حسابك.`
                : `⚠️ No rooms found for this user under your account.`);

        if (mainSocket.readyState === WebSocket.OPEN)
            mainSocket.send(JSON.stringify(createChatMessage(senderUsername, resultText)));
        return;
    }

    // ✅ حذف غرفة معينة
    if (lowerBody.startsWith('rsb#') && body.split('#').length === 3) {
        const [_, user, room] = body.split('#');
        const username = user?.trim();
        const roomName = room?.trim();

        if (!username || !roomName) {
            const msg = currentLanguage === 'ar'
                ? '❌ الصيغة غير صحيحة. الصيغة الصحيحة: rsb#username#room'
                : '❌ Invalid format. Correct format is: rsb#username#room';
            if (mainSocket.readyState === WebSocket.OPEN)
                mainSocket.send(JSON.stringify(createErrorMessage(senderUsername, msg)));
            return;
        }

        const filtered = silentRooms.filter(r => !(r.username === username && r.roomName === roomName && r.master === senderUsername));
        const deletedCount = silentRooms.length - filtered.length;
        saveSilentRooms(filtered);

        const resultText = deletedCount > 0
            ? (currentLanguage === 'ar'
                ? `✅ تم حذف الغرفة "${roomName}" للمستخدم "${username}".`
                : `✅ Room "${roomName}" removed for user "${username}".`)
            : (currentLanguage === 'ar'
                ? `⚠️ لا توجد هذه الغرفة محفوظة لهذا المستخدم.`
                : `⚠️ This room is not registered for this user.`);

        if (mainSocket.readyState === WebSocket.OPEN)
            mainSocket.send(JSON.stringify(createChatMessage(senderUsername, resultText)));
        return;
    }

    // ✅ تعديل البروفايل
    if (lowerBody.startsWith('profile#') && body.split('#').length === 3) {
        const [_, user, val] = body.split('#');
        const targetUsername = user?.trim();
        const newValue = val?.trim();

        if (!targetUsername || !newValue) {
            const msg = currentLanguage === 'ar'
                ? '❌ الصيغة غير صحيحة. الصيغة الصحيحة: profile#username#value'
                : '❌ Invalid format. Correct format is: profile#username#value';
            if (mainSocket.readyState === WebSocket.OPEN)
                mainSocket.send(JSON.stringify(createErrorMessage(senderUsername, msg)));
            return;
        }

        const roomEntry = silentRooms.find(r => r.username === targetUsername && r.master === senderUsername);
        if (!roomEntry) {
            const msg = currentLanguage === 'ar'
                ? `❌ لا تملك صلاحية تعديل هذا البروفايل.`
                : `❌ You do not have permission to edit this profile.`;
            if (mainSocket.readyState === WebSocket.OPEN)
                mainSocket.send(JSON.stringify(createErrorMessage(senderUsername, msg)));
            return;
        }

        const profileSocket = new WebSocket(WEBSOCKET_URL);
        profileSocket.onopen = () => {
            profileSocket.send(JSON.stringify(createLoginMessage(roomEntry.username, roomEntry.password)));
        };

        profileSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.handler === 'login_event') {
                const loginMsg = data.type === 'success'
                    ? (currentLanguage === 'ar'
                        ? `✅ تم تسجيل الدخول لتعديل بروفايل ${targetUsername}`
                        : `✅ Logged in to edit profile of ${targetUsername}`)
                    : (currentLanguage === 'ar'
                        ? `❌ فشل تسجيل الدخول.`
                        : `❌ Login failed.`);

                if (mainSocket.readyState === WebSocket.OPEN)
                    mainSocket.send(JSON.stringify(createChatMessage(senderUsername, loginMsg)));

                if (data.type === 'success') {
                    profileSocket.send(JSON.stringify({
                        handler: 'profile_update',
                        id: 'iQGlQEghwwsXRhvVqCND',
                        type: 'status',
                        value: newValue
                    }));

                    const doneMsg = currentLanguage === 'ar'
                        ? `✅ تم تحديث البروفايل إلى: ${newValue}`
                        : `✅ Profile updated to: ${newValue}`;

                    if (mainSocket.readyState === WebSocket.OPEN)
                        mainSocket.send(JSON.stringify(createChatMessage(senderUsername, doneMsg)));

                    setTimeout(() => profileSocket.close(), 1000);
                }
            }
        };
        profileSocket.onerror = (err) => console.error('WebSocket error:', err);
        profileSocket.onclose = () => {};
        return;
    }

    // ✅ إضافة غرفة جديدة بصيغة SB#USERNAME#PASSWORD#ROOM
    const parts = body.split('#');
    if (parts.length !== 4 || parts[0].toLowerCase() !== 'sb') {
        const msg = currentLanguage === 'ar'
            ? '❌ الصيغة غير صحيحة. الصيغة الصحيحة: SB#USERNAME#PASSWORD#ROOM'
            : '❌ Invalid format. Correct format is: SB#USERNAME#PASSWORD#ROOM';
        if (mainSocket.readyState === WebSocket.OPEN)
            mainSocket.send(JSON.stringify(createErrorMessage(senderUsername, msg)));
        return;
    }

    const username = parts[1].trim();
    const password = parts[2].trim();
    const roomName = parts[3].trim();

    if (!username || !password || !roomName) {
        const msg = currentLanguage === 'ar'
            ? '❌ تأكد من إدخال اسم المستخدم وكلمة المرور واسم الغرفة بشكل صحيح.'
            : '❌ Please provide all required fields.';
        if (mainSocket.readyState === WebSocket.OPEN)
            mainSocket.send(JSON.stringify(createErrorMessage(senderUsername, msg)));
        return;
    }

    const exists = silentRooms.some(r => r.roomName === roomName && r.username === username);
    if (exists) {
        const msg = currentLanguage === 'ar'
            ? `❌ الغرفة "${roomName}" موجودة بالفعل لهذا المستخدم.`
            : `❌ Room "${roomName}" already exists for this user.`;
        if (mainSocket.readyState === WebSocket.OPEN)
            mainSocket.send(JSON.stringify(createErrorMessage(senderUsername, msg)));
        return;
    }

    const loginSocket = new WebSocket(WEBSOCKET_URL);
    loginSocket.roomInfo = { username, roomName };

    loginSocket.onopen = () => {
        loginSocket.send(JSON.stringify(createLoginMessage(username, password)));
    };

    loginSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        const loginMsg = data.type === 'success'
            ? (currentLanguage === 'ar' ? `✅ تم تسجيل الدخول باسم ${username}` : `✅ Logged in as ${username}`)
            : (currentLanguage === 'ar' ? `❌ فشل تسجيل الدخول باسم ${username}` : `❌ Login failed for ${username}`);

        if (mainSocket.readyState === WebSocket.OPEN)
            mainSocket.send(JSON.stringify(createChatMessage(senderUsername, loginMsg)));

        if (data.handler === 'login_event' && data.type === 'success') {
            loginSocket.send(JSON.stringify(createJoinRoomMessage(roomName)));

            addSilentRoom({
                roomName,
                username,
                password,
                master: senderUsername
            });

            silentRoomSockets.push(loginSocket);
        }
    };

    loginSocket.onclose = (code, reason) => {
        console.log(`❌ Connection closed for room: ${roomName} - ${reason}`);
        setTimeout(() => {
            console.log(`🔄 Reconnecting to room: ${roomName}`);
            handleSilentJoinCommand(`SB#${username}#${password}#${roomName}`, senderUsername, mainSocket);
        }, 5000);
    };

    loginSocket.onerror = (err) => {
        console.error('WebSocket error:', err);
    };
};

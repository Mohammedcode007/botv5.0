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
//             if (mainSocket.readyState === WebSocket.OPEN) {
//                 mainSocket.send(JSON.stringify(privateMessage));
//             }
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
//         if (mainSocket.readyState === WebSocket.OPEN) {
//             mainSocket.send(JSON.stringify(privateMessage));
//         }

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
//             if (mainSocket.readyState === WebSocket.OPEN) {
//                 mainSocket.send(JSON.stringify(privateMessage));
//             }
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
//         if (mainSocket.readyState === WebSocket.OPEN) {
//             mainSocket.send(JSON.stringify(privateMessage));
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
//         if (mainSocket.readyState === WebSocket.OPEN) {
//             mainSocket.send(JSON.stringify(privateMessage));
//         }
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
//         if (mainSocket.readyState === WebSocket.OPEN) {
//             mainSocket.send(JSON.stringify(privateMessage));
//         }
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
//         if (mainSocket.readyState === WebSocket.OPEN) {
//             mainSocket.send(JSON.stringify(privateMessage));
//         }
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
//         if (mainSocket.readyState === WebSocket.OPEN) {
//             mainSocket.send(JSON.stringify(privateMessage));
//         }

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
//             handleSilentJoinCommand(`SB#${loginSocket.roomInfo.username}#${password}#${loginSocket.roomInfo.roomName}`, senderUsername, mainSocket);
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

module.exports = function handleSilentJoinCommand(body, senderUsername, mainSocket) {
    const currentLanguage = getUserLanguage(senderUsername) || 'en';
    const lowerBody = body.toLowerCase();
    const silentRooms = loadSilentRooms();

    // ✅ أمر حذف جميع الغرف لهذا اليوزر
    if (lowerBody.startsWith('rsb#') && body.split('#').length === 2) {
        const username = body.split('#')[1]?.trim();

        if (!username) {
            const errorText = currentLanguage === 'ar'
                ? '❌ الصيغة غير صحيحة. الصيغة الصحيحة: rsb#username'
                : '❌ Invalid format. Correct format is: rsb#username';

            const privateMessage = createErrorMessage(senderUsername, errorText);
            if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));
            return;
        }

        const filteredRooms = silentRooms.filter(
            r => !(r.username === username && r.master === senderUsername)
        );

        const deletedCount = silentRooms.length - filteredRooms.length;
        saveSilentRooms(filteredRooms);

        const resultText = deletedCount > 0
            ? (currentLanguage === 'ar'
                ? `✅ تم حذف ${deletedCount} غرفة/غرف للمستخدم "${username}" بنجاح.`
                : `✅ Successfully removed ${deletedCount} room(s) for username "${username}".`)
            : (currentLanguage === 'ar'
                ? `⚠️ لا توجد غرف محفوظة للمستخدم "${username}" بواسطة حسابك.`
                : `⚠️ No rooms found for username "${username}" under your account.`);

        const privateMessage = createChatMessage(senderUsername, resultText);
        if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));
        return;
    }

    // ✅ أمر حذف غرفة واحدة محددة
    if (lowerBody.startsWith('rsb#') && body.split('#').length === 3) {
        const parts = body.split('#');
        const username = parts[1]?.trim();
        const roomName = parts[2]?.trim();

        if (!username || !roomName) {
            const errorText = currentLanguage === 'ar'
                ? '❌ الصيغة غير صحيحة. الصيغة الصحيحة: rsb#username#room'
                : '❌ Invalid format. Correct format is: rsb#username#room';

            const privateMessage = createErrorMessage(senderUsername, errorText);
            if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));
            return;
        }

        const filteredRooms = silentRooms.filter(
            r => !(r.username === username && r.roomName === roomName && r.master === senderUsername)
        );

        const deletedCount = silentRooms.length - filteredRooms.length;
        saveSilentRooms(filteredRooms);

        const resultText = deletedCount > 0
            ? (currentLanguage === 'ar'
                ? `✅ تم حذف الغرفة "${roomName}" للمستخدم "${username}" بنجاح.`
                : `✅ Successfully removed room "${roomName}" for username "${username}".`)
            : (currentLanguage === 'ar'
                ? `⚠️ لا توجد غرفة باسم "${roomName}" للمستخدم "${username}" محفوظة بواسطة حسابك.`
                : `⚠️ No room named "${roomName}" for username "${username}" found under your account.`);

        const privateMessage = createChatMessage(senderUsername, resultText);
        if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));
        return;
    }

    // ✅ أمر تغيير البروفايل
    if (lowerBody.startsWith('profile#') && body.split('#').length === 3) {
        const parts = body.split('#');
        const targetUsername = parts[1]?.trim();
        const newValue = parts[2]?.trim();

        if (!targetUsername || !newValue) {
            const errorText = currentLanguage === 'ar'
                ? '❌ الصيغة غير صحيحة. الصيغة الصحيحة: profile#username#value'
                : '❌ Invalid format. Correct format is: profile#username#value';

            const privateMessage = createErrorMessage(senderUsername, errorText);
            if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));
            return;
        }

        const roomEntry = silentRooms.find(
            r => r.username === targetUsername && r.master === senderUsername
        );

        if (!roomEntry) {
            const errorText = currentLanguage === 'ar'
                ? `❌ لا تملك صلاحية تعديل بروفايل المستخدم "${targetUsername}".`
                : `❌ You do not have permission to update profile for username "${targetUsername}".`;

            const privateMessage = createErrorMessage(senderUsername, errorText);
            if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));
            return;
        }

        const profileSocket = new WebSocket(WEBSOCKET_URL);

        profileSocket.onopen = () => {
            const loginMsg = createLoginMessage(roomEntry.username, roomEntry.password);
            profileSocket.send(JSON.stringify(loginMsg));
        };

        profileSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.handler === 'login_event') {
                const loginText = data.type === 'success'
                    ? (currentLanguage === 'ar' ? `✅ تم تسجيل الدخول لتعديل بروفايل ${targetUsername}` : `✅ Login success to update profile for ${targetUsername}`)
                    : (currentLanguage === 'ar' ? `❌ فشل تسجيل الدخول للمستخدم ${targetUsername}` : `❌ Login failed for ${targetUsername}`);

                const privateMessage = createChatMessage(senderUsername, loginText);
                if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));

                if (data.type === 'success') {
                    const updateProfileMessage = {
                        handler: 'profile_update',
                        id: 'iQGlQEghwwsXRhvVqCND', // معرف ثابت للبروفايل (حسب النظام لديك)
                        type: 'status', // يمكن تغييره إلى bio أو حسب نوع التحديث
                        value: newValue
                    };

                    profileSocket.send(JSON.stringify(updateProfileMessage));

                    const doneText = currentLanguage === 'ar'
                        ? `✅ تم تحديث بروفايل "${targetUsername}" إلى: ${newValue}`
                        : `✅ Profile for "${targetUsername}" updated to: ${newValue}`;

                    const doneMessage = createChatMessage(senderUsername, doneText);
                    if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(doneMessage));

                    setTimeout(() => {
                        profileSocket.close();
                    }, 1000);
                }
            }
        };

        profileSocket.onerror = (error) => {
            console.error('⚠️ WebSocket error:', error);
        };

        profileSocket.onclose = (code, reason) => {
            console.log(`❌ Connection closed for profile update: ${targetUsername} - Code: ${code}, Reason: ${reason}`);
        }

        return;
    }

    // ✅ أمر إضافة غرفة بصيغة SB#USERNAME#PASSWORD#ROOM
    const parts = body.split('#');

    if (parts.length !== 4 || parts[0].toLowerCase() !== 'sb') {
        const errorText = currentLanguage === 'ar'
            ? '❌ الصيغة غير صحيحة. الصيغة الصحيحة: SB#USERNAME#PASSWORD#ROOM'
            : '❌ Invalid format. Correct format is: SB#USERNAME#PASSWORD#ROOM';

        const privateMessage = createErrorMessage(senderUsername, errorText);
        if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));
        return;
    }

    const username = parts[1].trim();
    const password = parts[2].trim();
    const roomName = parts[3].trim();

    if (!username || !password || !roomName) {
        const errorText = currentLanguage === 'ar'
            ? '❌ تأكد من إدخال اسم المستخدم وكلمة المرور واسم الغرفة بشكل صحيح.'
            : '❌ Please ensure username, password, and room name are correctly provided.';

        const privateMessage = createErrorMessage(senderUsername, errorText);
        if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));
        return;
    }

    const exists = silentRooms.some(
        r => r.roomName === roomName && r.username === username
    );

    if (exists) {
        const errorText = currentLanguage === 'ar'
            ? `❌ الغرفة "${roomName}" موجودة بالفعل تحت المستخدم "${username}".`
            : `❌ Room "${roomName}" already exists for username "${username}".`;

        const privateMessage = createErrorMessage(senderUsername, errorText);
        if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));
        return;
    }

    const loginSocket = new WebSocket(WEBSOCKET_URL);
    loginSocket.roomInfo = {
        username: username,
        roomName: roomName
    };

    loginSocket.onopen = () => {
        const loginMsg = createLoginMessage(username, password);
        loginSocket.send(JSON.stringify(loginMsg));
    };

    loginSocket.onmessage = (loginEvent) => {
        const loginData = JSON.parse(loginEvent.data);

        const loginText = loginData.type === 'success'
            ? (currentLanguage === 'ar' ? `✅ تم تسجيل الدخول باسم ${username}` : `✅ Login success for ${username}`)
            : (currentLanguage === 'ar' ? `❌ فشل تسجيل الدخول باسم ${username}` : `❌ Login failed for ${username}`);

        const privateMessage = createChatMessage(senderUsername, loginText);
        if (mainSocket.readyState === WebSocket.OPEN) mainSocket.send(JSON.stringify(privateMessage));

        if (loginData.handler === 'login_event' && loginData.type === 'success') {
            const joinRoomMessage = createJoinRoomMessage(roomName);
            loginSocket.send(JSON.stringify(joinRoomMessage));

            addSilentRoom({
                roomName: roomName,
                username: username,
                password: password,
                master: senderUsername
            });
        }
    };

    loginSocket.onclose = (code, reason) => {
        console.log(`❌ Connection closed for room: ${loginSocket.roomInfo.roomName} - Code: ${code}, Reason: ${reason}`);
        setTimeout(() => {
            console.log(`🔄 Reconnecting to room: ${loginSocket.roomInfo.roomName}`);
            handleSilentJoinCommand(`SB#${loginSocket.roomInfo.username}#${loginSocket.roomInfo.password}#${loginSocket.roomInfo.roomName}`, senderUsername, mainSocket);
        }, 5000);
    };

    loginSocket.onerror = (error) => {
        console.error('⚠️ WebSocket error:', error);
    };
};

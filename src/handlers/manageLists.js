const fs = require('fs');
const { masterListPath, adminListPath, blockedUsersPath, blockedRoomsPath } = require('../constants');
const { createChatMessage } = require('../messageUtils');
const { getUserLanguage,isUserInMasterList } = require('../fileUtils'); // ✅ استيراد دالة اللغة
const { verifiedUsersPath } = require('../constants');

const logPath = require('../constants').actionsLogPath;
const {
    createRoomMessage
} = require('../messageUtils');
function ensureFileExists(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    }
}

// ✅ دالة مساعدة لتحديد النص حسب اللغة
function translateMessage(key, lang, vars = {}) {
    const messages = {
        add_success: {
            en: `${vars.username} added to ${vars.listType} list.`,
            ar: `✅ تم إضافة ${vars.username} إلى قائمة ${vars.listType === 'master' ? 'الماستر' : 'الإداريين'}.`
        },
        add_exists: {
            en: `${vars.username} is already in the ${vars.listType} list.`,
            ar: `ℹ️ المستخدم ${vars.username} موجود بالفعل في قائمة ${vars.listType === 'master' ? 'الماستر' : 'الإداريين'}.`
        },
        remove_success: {
            en: `${vars.username} removed from ${vars.listType} list.`,
            ar: `🗑️ تم إزالة ${vars.username} من قائمة ${vars.listType === 'master' ? 'الماستر' : 'الإداريين'}.`
        },
        remove_not_found: {
            en: `${vars.username} is not in the ${vars.listType} list.`,
            ar: `⚠️ المستخدم ${vars.username} غير موجود في قائمة ${vars.listType === 'master' ? 'الماستر' : 'الإداريين'}.`
        },
        block_success: {
            en: `${vars.username} has been blocked.`,
            ar: `🚫 تم حظر ${vars.username}.`
        },
        block_exists: {
            en: `${vars.username} is already blocked.`,
            ar: `⚠️ ${vars.username} محظور بالفعل.`
        },
        unblock_success: {
            en: `${vars.username} has been unblocked.`,
            ar: `✅ تم إلغاء الحظر عن ${vars.username}.`
        },
        unblock_not_found: {
            en: `${vars.username} is not blocked.`,
            ar: `ℹ️ ${vars.username} غير محظور.`
        },
        block_room_success: {
            en: `Room ${vars.roomName} has been blocked.`,
            ar: `🚫 تم حظر الغرفة ${vars.roomName}.`
        },
        no_permission: {
            en: "You do not have permission to perform this action.",
            ar: "❌ لا تملك الصلاحيات للقيام بهذا الإجراء."
        },
        block_room_exists: {
            en: `Room ${vars.roomName} is already blocked.`,
            ar: `⚠️ الغرفة ${vars.roomName} محظورة بالفعل.`
        },
        unblock_room_success: {
            en: `Room ${vars.roomName} has been unblocked.`,
            ar: `✅ تم إلغاء الحظر عن الغرفة ${vars.roomName}.`
        },
        verified_add_success: {
            en: `${vars.username} has been marked as verified.`,
            ar: `✅ تم توثيق المستخدم ${vars.username}.`
        },
        verified_exists: {
            en: `${vars.username} is already verified.`,
            ar: `ℹ️ المستخدم ${vars.username} موثق بالفعل.`
        },
        verified_remove_success: {
            en: `${vars.username} has been removed from verified users.`,
            ar: `🗑️ تم إزالة توثيق المستخدم ${vars.username}.`
        },
        verified_not_found: {
            en: `${vars.username} is not verified.`,
            ar: `⚠️ المستخدم ${vars.username} غير موثق.`
        },

        unblock_room_not_found: {
            en: `Room ${vars.roomName} is not blocked.`,
            ar: `ℹ️ الغرفة ${vars.roomName} غير محظورة.`
        }
    };

    return messages[key][lang] || messages[key].en;
}

// إضافة مستخدم إلى قائمة
function addToList(listType, username, socket, senderUsername) {
    const lang = getUserLanguage(senderUsername) || 'en';
    let filePath;

    switch (listType) {
        case 'master':
            filePath = masterListPath;
            break;
        case 'admin':
            filePath = adminListPath;
            break;
        default:
            return;
    }

    ensureFileExists(filePath);
    const list = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const messageText = !list.includes(username)
        ? (() => {
            list.push(username);
            fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
            logAction('ADD_TO_LIST', username, senderUsername, listType); // ✅ تسجيل الحدث

            return translateMessage('add_success', lang, { username, listType });
        })()
        : translateMessage('add_exists', lang, { username, listType });

    const privateMessage = createChatMessage(senderUsername, messageText);
    socket.send(JSON.stringify(privateMessage));

}

// إزالة مستخدم من قائمة
function removeFromList(listType, username, socket, senderUsername) {
    const lang = getUserLanguage(senderUsername) || 'en';
    let filePath;

    switch (listType) {
        case 'master':
            filePath = masterListPath;
            break;
        case 'admin':
            filePath = adminListPath;
            break;
        default:
            return;
    }

    ensureFileExists(filePath);
    const list = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const messageText = (() => {
        const index = list.indexOf(username);
        if (index !== -1) {
            list.splice(index, 1);
            fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
            logAction('REMOVE_FROM_LIST', username, senderUsername, listType); // ✅ تسجيل الحدث

            return translateMessage('remove_success', lang, { username, listType });
        } else {
            return translateMessage('remove_not_found', lang, { username, listType });
        }
    })();

    const privateMessage = createChatMessage(senderUsername, messageText);
    socket.send(JSON.stringify(privateMessage));
}

// حظر مستخدم
function blockUser(username, socket, senderUsername) {
    const lang = getUserLanguage(senderUsername) || 'en';
    ensureFileExists(blockedUsersPath);
    const list = JSON.parse(fs.readFileSync(blockedUsersPath, 'utf8'));

    const messageText = !list.includes(username)
        ? (() => {
            list.push(username);
            fs.writeFileSync(blockedUsersPath, JSON.stringify(list, null, 2));
            logAction('BLOCK_USER', username, senderUsername); // ✅ تسجيل الحدث

            return translateMessage('block_success', lang, { username });
        })()
        : translateMessage('block_exists', lang, { username });

    const privateMessage = createChatMessage(senderUsername, messageText);
    socket.send(JSON.stringify(privateMessage));
}

// إلغاء حظر مستخدم
function unblockUser(username, socket, senderUsername) {
    const lang = getUserLanguage(senderUsername) || 'en';
    ensureFileExists(blockedUsersPath);
    const list = JSON.parse(fs.readFileSync(blockedUsersPath, 'utf8'));

    const messageText = (() => {
        const index = list.indexOf(username);
        if (index !== -1) {
            list.splice(index, 1);
            fs.writeFileSync(blockedUsersPath, JSON.stringify(list, null, 2));
            return translateMessage('unblock_success', lang, { username });
        } else {
            return translateMessage('unblock_not_found', lang, { username });
        }
    })();

    const privateMessage = createChatMessage(senderUsername, messageText);
    socket.send(JSON.stringify(privateMessage));
}

// حظر غرفة
function blockRoom(roomName, socket, senderUsername) {
    const lang = getUserLanguage(senderUsername) || 'en';
    ensureFileExists(blockedRoomsPath);
    const list = JSON.parse(fs.readFileSync(blockedRoomsPath, 'utf8'));

    const messageText = !list.includes(roomName)
        ? (() => {
            list.push(roomName);
            fs.writeFileSync(blockedRoomsPath, JSON.stringify(list, null, 2));
            logAction('BLOCK_ROOM', roomName, senderUsername, senderUsername); // Log the action

            return translateMessage('block_room_success', lang, { roomName });
        })()
        : translateMessage('block_room_exists', lang, { roomName });

    const privateMessage = createChatMessage(senderUsername, messageText);
    socket.send(JSON.stringify(privateMessage));
}

// إلغاء حظر غرفة
function unblockRoom(roomName, socket, senderUsername) {
    const lang = getUserLanguage(senderUsername) || 'en';
    ensureFileExists(blockedRoomsPath);
    const list = JSON.parse(fs.readFileSync(blockedRoomsPath, 'utf8'));

    const messageText = (() => {
        const index = list.indexOf(roomName);
        if (index !== -1) {
            list.splice(index, 1);
            fs.writeFileSync(blockedRoomsPath, JSON.stringify(list, null, 2));
            logAction('UNBLOCK_ROOM', roomName, senderUsername); // Log the action

            return translateMessage('unblock_room_success', lang, { roomName });
        } else {
            return translateMessage('unblock_room_not_found', lang, { roomName });
        }
    })();

    const privateMessage = createChatMessage(senderUsername, messageText);
    socket.send(JSON.stringify(privateMessage));
}



function loadVerifiedUsers() {
    try {
        const data = fs.readFileSync(verifiedUsersPath, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

function saveVerifiedUsers(list) {
    fs.writeFileSync(verifiedUsersPath, JSON.stringify(list, null, 2));
}

// ✅ إضافة مستخدم موثّق
function addVerifiedUser(username, socket, senderUsername, roomName) {
    const lang = getUserLanguage(senderUsername) || 'en';

    if (!isUserInMasterList(senderUsername)) {
        const message = translateMessage('no_permission', lang);
        sendAllMessages(message, senderUsername, roomName, socket);
        return;
    }

    const list = loadVerifiedUsers();
    const userExists = list.some(u => u.username.trim().toLowerCase() === username.trim().toLowerCase());

    if (userExists) {
        const message = translateMessage('verified_exists', lang, { username });
        sendAllMessages(message, senderUsername, roomName, socket);
        return;
    }

    list.push({ username: username.trim(), vip: false, points: 10 });
    saveVerifiedUsers(list);
    logAction('ADD_VERIFIED', username, senderUsername);

    const message = translateMessage('verified_add_success', lang, { username });
    sendAllMessages(message, senderUsername, roomName, socket);

    const privateMessageToUser = createChatMessage(username, message);
    socket.send(JSON.stringify(privateMessageToUser));
}

function autoVerifyUser(username) {
    const verifiedList = loadVerifiedUsers();
    const isAlreadyVerified = verifiedList.some(
        u => u.username.trim().toLowerCase() === username.trim().toLowerCase()
    );

    if (!isAlreadyVerified) {
        verifiedList.push({ username: username.trim(), vip: false, points: 10 });
        saveVerifiedUsers(verifiedList);
        logAction('AUTO_ADD_VERIFIED', username, 'System');
    }
}


// ✅ إزالة مستخدم موثّق
function removeVerifiedUser(username, socket, senderUsername, roomName) {
    const lang = getUserLanguage(senderUsername) || 'en';

    if (!isUserInMasterList(senderUsername)) {
        const message = translateMessage('no_permission', lang);
        sendAllMessages(message, senderUsername, roomName, socket);
        return;
    }

    const list = loadVerifiedUsers();
    const index = list.findIndex(u => u.username.trim().toLowerCase() === username.trim().toLowerCase());

    if (index === -1) {
        const message = translateMessage('verified_not_found', lang, { username });
        sendAllMessages(message, senderUsername, roomName, socket);
        return;
    }

    const removedUser = list.splice(index, 1)[0];
    saveVerifiedUsers(list);
    logAction('REMOVE_VERIFIED', removedUser.username, senderUsername);

    const message = translateMessage('verified_remove_success', lang, { username: removedUser.username });
    sendAllMessages(message, senderUsername, roomName, socket);

    const privateMessageToUser = createChatMessage(removedUser.username, message);
    socket.send(JSON.stringify(privateMessageToUser));
}



// ✅ دالة مساعدة لإرسال الرسائل الخاصة والعامة
function sendAllMessages(message, senderUsername, roomName, socket) {
    const privateMessage = createChatMessage(senderUsername, message);
    const roomMessage = createRoomMessage(roomName, message);

    socket.send(JSON.stringify(privateMessage));
    socket.send(JSON.stringify(roomMessage));
}

function isUserVerified(username) {
    return loadVerifiedUsers().some(u => u.username === username);
}


// ✅ إضافة مستخدم موثّق
// function addVerifiedUser(username, socket, senderUsername, RoomName) {
//     const lang = getUserLanguage(senderUsername) || 'en';

//     // التحقق إذا كان المستخدم الذي يحاول الإضافة هو من الماستر ليست
//     if (!isUserInMasterList(senderUsername)) {
//         const noPermissionMessage = translateMessage('no_permission', lang);
//         const errorMessage = createChatMessage(senderUsername, `❌ ${noPermissionMessage}`);
//         socket.send(JSON.stringify(errorMessage));
//         return;
//     }

//     ensureFileExists(verifiedUsersPath);
//     const list = JSON.parse(fs.readFileSync(verifiedUsersPath, 'utf8'));

//     const userExists = list.some(userObj => userObj.username === username);

//     const messageText = !userExists
//         ? (() => {
//             list.push({ username: username, vip: false, points: 10 });
//             fs.writeFileSync(verifiedUsersPath, JSON.stringify(list, null, 2));
//             logAction('ADD_VERIFIED', username, senderUsername);

//             const privateMessageToUser = createChatMessage(username, translateMessage('verified_add_success', lang, { username }));
//             socket.send(JSON.stringify(privateMessageToUser));

//             return translateMessage('verified_add_success', lang, { username });
//         })()
//         : translateMessage('verified_exists', lang, { username });

//     const privateMessage = createChatMessage(senderUsername, messageText);
//     socket.send(JSON.stringify(privateMessage));
//     const roomMessage = createRoomMessage(RoomName, messageText);
//     socket.send(JSON.stringify(roomMessage));
// }



// // ✅ إزالة مستخدم موثّق
// function removeVerifiedUser(username, socket, senderUsername, RoomName) {
//     const lang = getUserLanguage(senderUsername) || 'en';
//         if (!isUserInMasterList(senderUsername)) {
//         const noPermissionMessage = translateMessage('no_permission', lang);
//         const errorMessage = createChatMessage(senderUsername, `❌ ${noPermissionMessage}`);
//         socket.send(JSON.stringify(errorMessage));
//         return;
//     }
//     ensureFileExists(verifiedUsersPath);

//     // قراءة الملف وتحويله إلى مصفوفة من الكائنات
//     const list = JSON.parse(fs.readFileSync(verifiedUsersPath, 'utf8'));

//     // تطبيع الاسم
//     const normalizedUsername = username.trim().toLowerCase();

//     const messageText = (() => {
//         // البحث عن المستخدم بالتطبيع داخل الكائنات
//         const index = list.findIndex(userObj =>
//             userObj.username && userObj.username.trim().toLowerCase() === normalizedUsername
//         );

//         if (index !== -1) {
//             const removedUser = list.splice(index, 1)[0]; // حذف المستخدم
//             fs.writeFileSync(verifiedUsersPath, JSON.stringify(list, null, 2));
//             logAction('REMOVE_VERIFIED', removedUser.username, senderUsername); // تسجيل الحذف

//             const privateMessageToUser = createChatMessage(
//                 removedUser.username,
//                 translateMessage('verified_remove_success', lang, { username: removedUser.username })
//             );
//             socket.send(JSON.stringify(privateMessageToUser));

//             return translateMessage('verified_remove_success', lang, { username: removedUser.username });
//         } else {
//             return translateMessage('verified_not_found', lang, { username });
//         }
//     })();

//     // إرسال رسائل إلى المرسل والغرفة
//     const privateMessage = createChatMessage(senderUsername, messageText);
//     socket.send(JSON.stringify(privateMessage));

//     const roomMessage = createRoomMessage(RoomName, messageText);
//     socket.send(JSON.stringify(roomMessage));
// }




function logAction(actionType, targetUsername, actorUsername, listType = null) {
    ensureFileExists(logPath);
    const logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));

    const newLog = {
        timestamp: new Date().toISOString(),
        action: actionType,
        user: targetUsername,
        actor: actorUsername, // إضافة الشخص الذي قام بالفعل
        list: listType || null
    };

    logs.push(newLog);
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
}

module.exports = {
    addToList,
    removeFromList,
    blockUser,
    unblockUser,
    blockRoom,
    unblockRoom,
    logAction,
    loadVerifiedUsers,
    saveVerifiedUsers,
    addVerifiedUser,
    removeVerifiedUser,
    isUserVerified,
    autoVerifyUser
};

const { saveRooms, loadRooms, loadMasterList } = require('../fileUtils');
const { createRoomMessage } = require('../messageUtils');


// ✅ تغيير رتبة المستخدم داخل الغرفة
const changeUserRole = (room, targetUser, role, socket) => {
    const roleChangeMessage = {
        handler: 'room_admin',
        id: 'crom',
        type: 'change_role',
        room: room,
        t_username: targetUser,
        t_role: role
    };
    socket.send(JSON.stringify(roleChangeMessage));
};


// ✅ إخفاء حرفين من الكلمة لأغراض العرض
function maskTwoLetters(word) {
    if (word.length <= 2) {
        return '*'.repeat(word.length);
    }
    const chars = word.split('');
    chars[1] = '*';
    chars[chars.length - 1] = '*';
    return chars.join('');
}


// ✅ التحقق إذا كان المستخدم ماستر أو في masterList العامة أو الخاصة بالغرفة
function isUserMasterOrInMasterList(username, roomName) {
    const rooms = loadRooms();
    const room = rooms.find(r => r.roomName === roomName);

    if (room) {
        if (room.master === username) return true;
        if (Array.isArray(room.masterList) && room.masterList.includes(username)) return true;
    }

    const masterList = loadMasterList();
    if (Array.isArray(masterList) && masterList.includes(username)) return true;

    return false;
}


// ✅ التأكد من وجود الحقول اللازمة داخل بيانات الغرفة
function ensureRoomFields(room) {
    if (!room.bannedNameWords) room.bannedNameWords = [];
    if (!room.bannedMessageWords) room.bannedMessageWords = [];
    if (room.bannedNameEnabled === undefined) room.bannedNameEnabled = true;
    if (room.bannedMessageEnabled === undefined) room.bannedMessageEnabled = true;
}


// ✅ التعامل مع أوامر الكلمات المحظورة (إضافة، حذف، عرض، تفعيل، إيقاف)
function handleBannedWordCommand(type, action, word, senderName, roomName, rooms, currentLanguage, socket) {
    const room = rooms.find(r => r.roomName === roomName);
    if (!room) return;
    ensureRoomFields(room);

    if (!isUserMasterOrInMasterList(senderName, roomName)) {
        return sendMsg(roomName, currentLanguage === 'ar'
            ? '❌ ليس لديك صلاحية لتنفيذ هذا الأمر.'
            : '❌ You do not have permission.', socket);
    }

    const wordList = type === 'name' ? room.bannedNameWords : room.bannedMessageWords;
    const protectionField = type === 'name' ? 'bannedNameEnabled' : 'bannedMessageEnabled';

    const maskedWord = word ? maskTwoLetters(word) : '';

    switch (action) {
        case 'add':
            if (!word) return;
            if (!wordList.includes(word)) {
                wordList.push(word);
                saveRooms(rooms);
                sendMsg(roomName, currentLanguage === 'ar'
                    ? `✅ تمت إضافة "${maskedWord}" إلى قائمة الكلمات المحظورة على ${type === 'name' ? 'الأسماء' : 'الرسائل'}.`
                    : `✅ "${maskedWord}" added to ${type === 'name' ? 'name' : 'message'} banned words list.`, socket);
            } else {
                sendMsg(roomName, currentLanguage === 'ar'
                    ? `⚠️ الكلمة "${maskedWord}" موجودة بالفعل.`
                    : `⚠️ "${maskedWord}" already exists in the banned list.`, socket);
            }
            break;

        case 'rm':
            if (!word) return;
            if (wordList.includes(word)) {
                const index = wordList.indexOf(word);
                wordList.splice(index, 1);
                saveRooms(rooms);
                sendMsg(roomName, currentLanguage === 'ar'
                    ? `✅ تم حذف "${maskedWord}" من قائمة الكلمات المحظورة.`
                    : `✅ "${maskedWord}" removed from banned words list.`, socket);
            } else {
                sendMsg(roomName, currentLanguage === 'ar'
                    ? `⚠️ الكلمة "${maskedWord}" غير موجودة.`
                    : `⚠️ "${maskedWord}" not found in the banned list.`, socket);
            }
            break;

        case 'list':
            const list = wordList.length > 0
                ? wordList.map(w => maskTwoLetters(w)).join(', ')
                : (currentLanguage === 'ar' ? '🚫 لا توجد كلمات محظورة.' : '🚫 No banned words.');

            sendMsg(roomName, currentLanguage === 'ar'
                ? `🚫 قائمة الكلمات المحظورة على ${type === 'name' ? 'الأسماء' : 'الرسائل'}:\n${list}`
                : `🚫 ${type === 'name' ? 'Name' : 'Message'} banned words:\n${list}`, socket);
            break;

        case 'on':
        case 'off':
            room[protectionField] = action === 'on';
            saveRooms(rooms);
            sendMsg(roomName, currentLanguage === 'ar'
                ? (action === 'on'
                    ? `✅ تم تفعيل الحماية على ${type === 'name' ? 'الأسماء' : 'الرسائل'}.`
                    : `❌ تم إيقاف الحماية على ${type === 'name' ? 'الأسماء' : 'الرسائل'}.`)
                : (action === 'on'
                    ? `✅ ${type === 'name' ? 'Name' : 'Message'} protection enabled.`
                    : `❌ ${type === 'name' ? 'Name' : 'Message'} protection disabled.`), socket);
            break;
    }
}


// ✅ التحقق من الاسم عند انضمام المستخدم
function checkNameOnJoin(data, socket, roomName, rooms, currentLanguage) {
    const username = data.username;
    const room = rooms.find(r => r.roomName === roomName);
    if (!room) return;
    ensureRoomFields(room);

    if (!room.bannedNameEnabled) return;

    const wordsInName = username.split(/[\s,.!?،؛_\-]+/);

    const found = room.bannedNameWords.find(bannedWord =>
        wordsInName.some(namePart => namePart.toLowerCase() === bannedWord.toLowerCase())
    );

    if (found) {
        const maskedWord = maskTwoLetters(found);

        sendMsg(roomName, currentLanguage === 'ar'
            ? `🚫 تم حظر "${username}" لأن الاسم يحتوي على الكلمة المحظورة "${maskedWord}".`
            : `🚫 "${username}" was banned for having the banned word "${maskedWord}" in the name.`, socket);

        changeUserRole(roomName, username, 'outcast', socket);
    }
}


// ✅ التحقق من محتوى الرسائل النصية
function checkMessageContent(data, socket, roomName, rooms, currentLanguage) {
    const message = data.body;
    const sender = data.from;

    const room = rooms.find(r => r.roomName === roomName);
    if (!room) return;
    ensureRoomFields(room);

    if (!room.bannedMessageEnabled) return;

    const wordsInMessage = message?.split(/[\s,.!?،؛_\-]+/);

    const found = room.bannedMessageWords.find(bannedWord =>
        wordsInMessage?.some(msgWord => msgWord.toLowerCase() === bannedWord.toLowerCase())
    );

    if (found) {
        const maskedWord = maskTwoLetters(found);

        sendMsg(roomName, currentLanguage === 'ar'
            ? `🚫 تم حظر "${sender}" لأن الرسالة تحتوي على الكلمة المحظورة "${maskedWord}".`
            : `🚫 "${sender}" was banned for sending a message containing the banned word "${maskedWord}".`, socket);

        changeUserRole(roomName, sender, 'outcast', socket);
    }
}


// ✅ إرسال رسالة إلى الغرفة
function sendMsg(room, text, socket) {
    socket.send(JSON.stringify(createRoomMessage(room, text)));
}


// ✅ التصدير
module.exports = {
    handleBannedWordCommand,
    checkNameOnJoin,
    checkMessageContent,
    isUserMasterOrInMasterList,
    sendMsg,
    changeUserRole,
    maskTwoLetters,
    ensureRoomFields
};

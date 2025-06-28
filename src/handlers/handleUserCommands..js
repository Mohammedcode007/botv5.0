const {
    createRoomMessage
} = require('../messageUtils');
const { loadRooms, saveRooms, roomExists, addRoom } = require('../fileUtils');

function handleUserCommands(data, senderName, master, roomName, rooms, socket, currentLanguage) {
    const body = data.body.trim();

    // التحقق إذا كان المرسل هو الماستر أو في قائمة الماستر
    if (isUserMasterOrInMasterList(senderName, roomName)) {
        const [command, targetUser] = body.split('@').map(item => item.trim().toLowerCase()); // استخراج الأمر واسم المستخدم الهدف

        switch (command) {
            case 'o':
            case 'owner':
                if (master === senderName) {
                    makeOwner(roomName, targetUser, socket);
                    sendRoomMessage(roomName, `👑 User ${targetUser} is now the Owner.`, currentLanguage, socket);
                } else {
                    sendRoomMessage(roomName, currentLanguage === 'ar' ? `❌ لا يمكنك تعيين مالك جديد.` : `❌ You are not authorized to make someone the owner.`, currentLanguage, socket);
                }
                break;

            case 'a':
                if (master === senderName) {
                    makeAdmin(roomName, targetUser, socket);
                    sendRoomMessage(roomName, `🔧 User ${targetUser} is now an Admin.`, currentLanguage, socket);
                } else {
                    sendRoomMessage(roomName, currentLanguage === 'ar' ? `❌ لا يمكنك تعيين مشرف جديد.` : `❌ You are not authorized to make someone an admin.`, currentLanguage, socket);
                }
                break;

            case 'm':
            case 'member':
                if (master === senderName) {
                    makeMember(roomName, targetUser, socket);
                    sendRoomMessage(roomName, `👤 User ${targetUser} is now a Member.`, currentLanguage, socket);
                } else {
                    sendRoomMessage(roomName, currentLanguage === 'ar' ? `❌ لا يمكنك تعيين عضو جديد.` : `❌ You are not authorized to make someone a member.`, currentLanguage, socket);
                }
                break;

            case 'n':
            case 'none':
                removeRole(roomName, targetUser, socket);
                sendRoomMessage(roomName, `🚫 User ${targetUser} has lost their role.`, currentLanguage, socket);
                break;

            case 'b':
            case 'ban':
                banUser(roomName, targetUser, socket);
                sendRoomMessage(roomName, `❌ User ${targetUser} has been banned.`, currentLanguage, socket);
                break;

            case 'k':
            case 'kick':
                kickUser(roomName, targetUser, socket);
                sendRoomMessage(roomName, `🚷 User ${targetUser} has been kicked from the room.`, currentLanguage, socket);
                break;

            case 'cancel':
                sendRoomMessage(roomName, currentLanguage === 'ar' ? `تم إلغاء الأمر.` : `The action has been canceled.`, currentLanguage, socket);
                break;

            default:
                sendRoomMessage(roomName, currentLanguage === 'ar' ? `⚠️ أمر غير صالح: ${command}` : `⚠️ Invalid command: ${command}`, currentLanguage, socket);
                break;
        }
    } else {
        sendRoomMessage(roomName, currentLanguage === 'ar' ? `❌ أنت لست الماستر أو لست في قائمة الماستر.` : `❌ You are not the master or in the master list.`, currentLanguage, socket);
    }
}


// دوال مساعدة لتنفيذ الأوامر:
const makeOwner = (room, targetUser, socket) => changeUserRole(room, targetUser, 'owner', socket);
const makeAdmin = (room, targetUser, socket) => changeUserRole(room, targetUser, 'admin', socket);
const makeMember = (room, targetUser, socket) => changeUserRole(room, targetUser, 'member', socket);
const removeRole = (room, targetUser, socket) => changeUserRole(room, targetUser, 'none', socket);

const banUser = (room, targetUser, socket) => changeUserRole(room, targetUser, 'outcast', socket);

const kickUser = (room, targetUser, socket) => {
    const kickMessage = {
        handler: 'room_admin',
        id: 'crom',
        type: 'kick',
        room: room,
        t_username: targetUser,
        t_role: 'none'
    };
    socket.send(JSON.stringify(kickMessage));
};

// دالة تغيير الدور
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

// دالة إرسال رسالة إلى الغرفة
function sendRoomMessage(roomName, message, currentLanguage, socket) {
    const messageObject = createRoomMessage(roomName, message);
    socket.send(JSON.stringify(messageObject));
}

// دالة للتحقق إذا كان المستخدم ماستر أو في قائمة الماستر
function isUserMasterOrInMasterList(username, roomName) {
    const rooms = loadRooms();
    
    // التحقق مما إذا كان المستخدم ماستر في الغرفة
    const room = rooms.find(r => r.roomName === roomName);
    if (room) {
        // التحقق من أن المستخدم ماستر في الغرفة أو في قائمة الماستر
        if (room.master === username || room.masterList.includes(username)) {
            return true; // المستخدم ماستر في الغرفة أو في قائمة الماستر
        }
    }
    
    // إذا لم يكن في الغرفة، تحقق من قائمة الماستر العامة
    const masterList = loadMasterList();
    if (masterList.includes(username)) {
        return true; // المستخدم موجود في قائمة الماستر العامة
    }

    return false; // إذا لم يكن في أي من القائمتين
}

module.exports = {
    handleUserCommands
};

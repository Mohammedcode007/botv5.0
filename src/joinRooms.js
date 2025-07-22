

const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');


const { loadRooms, saveRooms, incrementRoomMessageCount, getUserLanguage, loadUsers, addUserToRoom, removeUserFromRoom, saveUsers, getRooms, normalizeName } = require('./fileUtils');
const { addToList, removeFromList, blockUser, blockRoom, addVerifiedUser, removeVerifiedUser, unblockUser, unblockRoom, autoVerifyUser } = require('./handlers/manageLists');
const { disableWelcomeMessage, enableWelcomeMessage, setWelcomeMessage } = require('./handlers/handleWelocome');
const { sendHelpInformation } = require('./handlers/sendHelpInformation');
const { handleUserCommands } = require('./handlers/handleUserCommands.');
const { handleGiftCommand, handleImageGift, handleGiftListRequest, handleGiftSelection } = require('./handlers/giftManager');
const { handleTradeKeywords } = require('./handlers/handleTradeKeywords');
const { handleMessage } = require('./handlers/userListHandler');
const { handlePlayCommand, handleSongReaction, handleSongShare, handlePlaySongInAllRooms, handleImageSearchCommand, handleImageGiftsearch } = require('./handlers/searchSoundCloud');
const { handleShowImageCommand } = require('./handlers/imagesSearch');
const { handleDrugKeywords } = require('./handlers/handleDrugKeywords');
const { handleBrideRequest, handleBrideCommands } = require('./handlers/handleBrideRequest');
const { handleGroomRequest, handleGroomCommands } = require('./handlers/groomHandler');
const { handleInRoomCommand } = require('./handlers/handleInRoomCommand');
const { sendUserRoomsMessage } = require('./handlers/sendUserRoomsMessage');
const { handleNotifyCommand } = require('./handlers/handleNotifyCommand');
const { createRoomMessage, createChatMessage, createMainImageMessage } = require('./messageUtils');

const { fetchUserProfile } = require('./handlers/profileFetcher');

const { startWarAuto, startWar } = require('./handlers/handleWarGameCommand');

const { handleWarGameCommand } = require('./handlers/handleWarGameCommand');
const { handleLeaderboard } = require('./handlers/handleLeaderboard');
const chokidar = require('chokidar');


const { handleTopRoomsCommand } = require('./handlers/handleTopRoomsCommand');
const { startPikachuEvent, handleFireCommand, startQuranBroadcast } = require('./handlers/pikachuEvent');
const { handleGiftListRequestAnimation, handleGiftSelectionAnimation } = require('./handlers/giftManageranimation');
const {
    handleBannedWordCommand,
    checkNameOnJoin,
    checkMessageContent,
    isUserMasterOrInMasterList
} = require('./handlers/bannedWordsManager');
const { handleDiceDuelCommand } = require('./handlers/diceDuelGame');
const { handleSwordShieldCommand } = require('./handlers/swordShieldGame');
const { handleLegendFightCommand } = require('./handlers/legendFightGame');
const { handleFightCommand } = require('./handlers/fightGameMulti');
const { handleBroadcasterAdminCommands, handleBroadcastMessageCommand } = require('./handlers/handleBroadcastMessageCommand');
const { handleMentionMessage, handleImageMessage } = require('./handlers/mentionHandler');
const { handleBroadcastCommand, handleBroadcastText, handleBroadcastImage, handleBroadcastLike, handleTopBroadcasters, pendingBroadcasts } = require('./handlers/broadcastHandler');
const { disableGames, enableGames } = require('./handlers/gameToggle');
const { handleCoinDuelCommand } = require('./handlers/coinDuel');
const { handleImageGiftCommand } = require('./handlers/handleImageGiftCommand');
const { handleWhipCommand } = require('./handlers/handleWhipCommand');
const { handleSlapCommand } = require('./handlers/handleSlapCommand');
const { handleSpitCommand } = require('./handlers/spitDuelHandler');
const { handleSwordCommand } = require('./handlers/handleSwordCommand');
const { handleNumberChoice, handleBombCommand, handleBombAnswer } = require('./handlers/bombGame');
const masterAdmin = [
    "ا◙☬ځُــۥـ☼ـڈ◄أڵـــســمـــٱ۽►ـۉد☼ــۥــۓ☬◙ا",
    "𝚞𝚕𝚝𝚛𝚊♂"
];
function containsForbiddenWords(profile) {
    const keywords = ['master', 'bot'];
    const fields = [
        profile.type,
        profile.status,
        profile.country,
        profile.gender,
        profile.user_id,
        profile.reg_date
    ];

    return fields.some(field => {
        if (!field) return false;
        const lower = String(field).toLowerCase();
        return keywords.some(kw => lower.includes(kw));
    });
}

const keywords = [
    'بورصة', 'تداول', 'شراء', 'بيع', 'تحليل', 'مضاربة', 'هبوط', 'صعود',
    'اشاعة', 'توصية', 'استثمار', 'حظ', 'سوق', 'مخاطرة', 'أرباح',
    'صيد', 'فرصة',
    'stock', 'trade', 'buy', 'sell', 'analysis', 'speculation', 'drop', 'rise',
    'rumor', 'recommendation', 'investment', 'luck', 'market', 'risk', 'profit',
    'catch', 'opportunity'
];

function joinRooms() {
    let rooms = loadRooms();

    // const rooms = loadRooms(path.join(__dirname, 'rooms.json'));
    const ioSockets = {};
    // مراقبة ملف rooms.json
    const watcher = chokidar.watch('./rooms.json', {
        persistent: true
    });

    watcher.on('change', (path) => {

        try {
            const data = fs.readFileSync('rooms.json', 'utf8');
            const updatedRooms = JSON.parse(data);

            updatedRooms.forEach(room => {
                if (!ioSockets[room.roomName]) {
                    console.log(`🚀 Connecting to new room: ${room.roomName}`);
                    createSocketForRoom(room);
                }
            });
        } catch (error) {
            console.error('❌ Error reading updated rooms.json:', error);
        }
    });
    // دالة لإنشاء وإعداد WebSocket مع إعادة الاتصال
    function createSocketForRoom(room) {
        let socket = new WebSocket('wss://chatp.net:5333/server');
        ioSockets[room.roomName] = socket;
        socket.roomInfo = room;
        socket._processedAddMas = new Set();

        socket.on('open', () => {
            const loginMessage = {
                handler: 'login',
                username: room.username,
                password: room.password,
                session: 'PQodgiKBfujFZfvJTnmM',
                sdk: '25',
                ver: '332',
                id: 'xOEVOVDfdSwVCjYqzmTT'
            };
            socket.send(JSON.stringify(loginMessage));
        });

        socket.on('message', (event) => {
            try {
                const data = JSON.parse(event);

                let senderName = data.from;
                let roomName = data.room || socket.roomInfo.roomName;
                const currentLanguage = getUserLanguage(senderName) || 'en';
                if (
                    data.handler === 'room_event' &&
                    data.room === '𝐊𝐢𝐧𝐠𝐬𝐎𝐟𝐒𝐢𝐧⛓️-pvt' &&
                    data.body?.trim().toLowerCase() === 'test'
                ) {


                }
                if (data.handler === 'room_event' && data.type === 'user_left' && data.username === "𐦖𝆔.") {

                    const joinRoomMessage = {
                        handler: 'room_join',
                        id: 'QvyHpdnSQpEqJtVbHbFY',
                        name: data.name
                    };
                    socket.send(JSON.stringify(joinRoomMessage));
                }
                if (data.handler === 'room_event') {
                    const senderName = data.from;
                    const avatarUrl = data.avatar_url || `https://api.multiavatar.com/${encodeURIComponent(senderName)}.png`;

                    const allUsers = loadUsers();
                    const userIndex = allUsers.findIndex(u => u.username === senderName);

                    if (userIndex !== -1) {
                        // ✅ تحديث الصورة فقط إذا اختلفت عن الحالية
                        if (allUsers[userIndex].profileUrl !== avatarUrl) {
                            allUsers[userIndex].profileUrl = avatarUrl;
                            saveUsers(allUsers);
                        }
                    } else {
                        // ❌ لا يتم الإضافة
                    }
                }


                // هنا استمر في التعامل مع الرسائل بنفس الطريقة الموجودة في كودك الأصلي
                // ... (الشفرة الخاصة بالتعامل مع الرسائل مثل أوامر addmas@ و removemas@ و svip@ ... الخ)

                // مثال على إعادة استخدام جزء بسيط من الكود الموجود للتوضيح:
                if (data.handler === 'login_event' && data.type === 'success') {
                    const joinRoomMessage = {
                        handler: 'room_join',
                        id: 'QvyHpdnSQpEqJtVbHbFY',
                        name: room.roomName
                    };
                    socket.send(JSON.stringify(joinRoomMessage));


                    const statusText = `
  <div style="color: #2196F3; font-family: 'Arial', sans-serif; font-size: 14px; font-weight: bold;">
    <p>🤖 <span style="color:#4CAF50;">إصدار البوت:</span> <b>v5.0</b></p>
    <p>🔗 [<b>المالك:</b> ${room.master}] — [<b>الغرفة:</b> ${room.roomName}]</p>
    <hr style="border: none; border-top: 1px solid #ccc;">
    <p>🆘 للمساعدة: <code>info</code> في خاص @𐦖𝆔.</p>
    <p>🚪 لدخول غرفتك: <code>join@اسم_الغرفة</code></p>
    <p>👤 دخول باسم مستخدم: <code>login#اسم#كلمة_المرور#الغرفة</code></p>
    <hr style="border: none; border-top: 1px solid #ccc;">
    <p>📝 أوامر سريعة:</p>
    <ul style="padding-left: 20px; color: #333;">
      <li>🎵 <code>.ps اسم_الأغنية</code></li>
      <li>🖼️ <code>bc</code> لإرسال صورة أو نص لكل الغرف</li>
      <li>🎮 <code>game@on</code> / <code>game@off</code></li>
      <li>📌 منشن بصورة: <code>@username</code> ثم إرسال الصورة</li>
    </ul>
    <hr style="border: none; border-top: 1px solid #ccc;">
    <p style="color: #FF5722;">⚙️ 𐦖𝆔. v5.0</p>
  </div>
`;


                    const updateStatusMessage = {
                        handler: 'profile_update',
                        id: 'iQGlQEghwwsXRhvVqCND',
                        type: 'status',
                        value: statusText
                    };
                    socket.send(JSON.stringify(updateStatusMessage));
                    if (!socket._warStarted) {
                        socket._warStarted = true; // منع التكرار
                        startWarAuto(ioSockets);
                    }
                    return;
                }
                if (data.handler === 'room_event' && data.body) {
                    const body = data.body.trim();

                    // لعبة الحرب
                    if (['دفاع', 'هجوم', 'تحالف'].includes(body)) {
                        handleWarGameCommand(data, socket, ioSockets);
                        return;
                    }


                    if (data.handler === 'room_event' && data.body) {
                        const body = data.body.trim().toLowerCase();
                        if (body === 'صفعة' || body === 'صفعه' || body === 'slap') {
                            handleSlapCommand(data, socket, ioSockets);
                        }else if (body === 'قنبله' || body === 'قنبلة' || body === 'bomb') {
    handleBombCommand(data, socket, ioSockets);
} else if (/^[1-5]$/.test(body)) {
    handleBombAnswer(body, data, socket, ioSockets);
}

                        else if (body === 'جلد' || body === 'whip' || body === 'جلده') {
                            handleWhipCommand(data, socket, ioSockets);
                        }
                         
                    }


                    if (body === 'سيف') {
                        handleSwordCommand(data, socket, ioSockets);
                    }
                    if (body === 'درع') {
                        handleSwordCommand(data, socket, ioSockets); // نفس الدالة تتعامل مع الرد
                    }



                    if (body === '.coin' || body === 'ملك' || body === 'كتابة') {
                        handleCoinDuelCommand(data, socket, ioSockets);
                        return;
                    }
                  if (body?.startsWith('link@') &&
    masterAdmin.includes(data.from)) {
    handleImageGiftCommand(data, socket, ioSockets);
    return;
}

                    // لعبة مبارزة النرد
                    if (body === 'نرد') {
                        handleDiceDuelCommand(data, socket, ioSockets);
                        return;
                    }
                    if (body === 'قتال') {
                        handleFightCommand(data, socket, ioSockets);
                        return;
                    }

                }

                // التحقق عند دخول المستخدم
                if (data.handler === 'room_event' && data.type === 'user_joined') {
                    checkNameOnJoin(data, socket, roomName, rooms, currentLanguage);
                }

                // التحقق من محتوى الرسائل النصية
                if (data.handler === 'room_event') {
                    checkMessageContent(data, socket, roomName, rooms, currentLanguage);
                }

                // أوامر الكلمات المحظورة على الأسماء
                if (data.body?.startsWith('bwname@add@')) {
                    handleBannedWordCommand('name', 'add', data.body.split('@')[2], senderName, roomName, rooms, currentLanguage, socket);
                } else if (data.body?.startsWith('bwname@rm@')) {
                    handleBannedWordCommand('name', 'rm', data.body.split('@')[2], senderName, roomName, rooms, currentLanguage, socket);
                } else if (data.body === 'bwname@list') {
                    handleBannedWordCommand('name', 'list', '', senderName, roomName, rooms, currentLanguage, socket);
                } else if (data.body === 'bwname@on') {
                    handleBannedWordCommand('name', 'on', '', senderName, roomName, rooms, currentLanguage, socket);
                } else if (data.body === 'bwname@off') {
                    handleBannedWordCommand('name', 'off', '', senderName, roomName, rooms, currentLanguage, socket);
                }

                // أوامر الكلمات المحظورة على الرسائل
                else if (data.body?.startsWith('bwmsg@add@')) {
                    handleBannedWordCommand('message', 'add', data.body.split('@')[2], senderName, roomName, rooms, currentLanguage, socket);
                } else if (data.body?.startsWith('bwmsg@rm@')) {
                    handleBannedWordCommand('message', 'rm', data.body.split('@')[2], senderName, roomName, rooms, currentLanguage, socket);
                } else if (data.body === 'bwmsg@list') {
                    handleBannedWordCommand('message', 'list', '', senderName, roomName, rooms, currentLanguage, socket);
                } else if (data.body === 'bwmsg@on') {
                    handleBannedWordCommand('message', 'on', '', senderName, roomName, rooms, currentLanguage, socket);
                } else if (data.body === 'bwmsg@off') {
                    handleBannedWordCommand('message', 'off', '', senderName, roomName, rooms, currentLanguage, socket);
                }
                if (data.handler === 'room_event' && data.body && data.body.startsWith('removemas@')) {
                    const targetUsername = data.body.split('@')[1]?.trim();
                    const roomName = data.room;

                    if (isUserMasterOrInMasterList(senderName, roomName)) {
                        console.log(`🔄 Removing ${targetUsername} from master list in room: ${roomName}`);

                        const updatedRooms = rooms.map(r => {
                            if (r.roomName === roomName) {
                                if (Array.isArray(r.masterList)) {
                                    if (r.masterList.includes(targetUsername)) {
                                        r.masterList = r.masterList.filter(user => user !== targetUsername);
                                        console.log(`✅ Removed ${targetUsername} from masterList in room "${roomName}"`);

                                        const message = currentLanguage === 'ar'
                                            ? `✅ تم إزالة ${targetUsername} من قائمة الماستر في الغرفة "${roomName}".`
                                            : `✅ ${targetUsername} has been removed from the master list in room "${roomName}".`;

                                        const confirmationMessage = createRoomMessage(roomName, message);
                                        socket.send(JSON.stringify(confirmationMessage));
                                    } else {
                                        const warningMessage = currentLanguage === 'ar'
                                            ? `❌ ${targetUsername} غير موجود في قائمة الماستر.`
                                            : `❌ ${targetUsername} is not in the master list.`;

                                        const errorMessage = createRoomMessage(roomName, warningMessage);
                                        socket.send(JSON.stringify(errorMessage));
                                    }
                                }
                            }
                            return r;
                        });

                        saveRooms(updatedRooms);

                    } else {
                        const warningMessage = currentLanguage === 'ar'
                            ? '❌ أنت لست ماستر الغرفة أو في قائمة الماستر، لا يمكنك إزالة أحد.'
                            : '❌ You are not the master or in the master list. You cannot remove anyone.';

                        const errorMessage = createRoomMessage(roomName, warningMessage);
                        socket.send(JSON.stringify(errorMessage));
                    }
                }

                // التعامل مع أوامر إضافية مثل addmas@
                if (data.handler === 'room_event' && data.body && data.body.startsWith('addmas@')) {
                    const targetUsername = data.body.split('@')[1]?.trim(); // اسم المستخدم المستهدف
                    const roomName = data.room;

                    if (isUserMasterOrInMasterList(senderName, roomName)) {
                        console.log(`🔄 Adding ${targetUsername} to master list in room: ${roomName}`);

                        const targetRoomIndex = rooms.findIndex(room => room.roomName === roomName);
                        if (targetRoomIndex !== -1) {
                            const targetRoom = rooms[targetRoomIndex];

                            if (!Array.isArray(targetRoom.masterList)) {
                                targetRoom.masterList = [];
                            }

                            if (!targetRoom.masterList.includes(targetUsername)) {
                                targetRoom.masterList.push(targetUsername);
                                console.log(`✅ Added ${targetUsername} to masterList in room "${roomName}"`);

                                const message = currentLanguage === 'ar'
                                    ? `✅ تم إضافة ${targetUsername} إلى قائمة الماستر في الغرفة "${roomName}".`
                                    : `✅ ${targetUsername} has been added to the master list in room "${roomName}".`;

                                const confirmationMessage = createRoomMessage(roomName, message);
                                socket.send(JSON.stringify(confirmationMessage));
                            } else {
                                const warningMessage = currentLanguage === 'ar'
                                    ? `❌ ${targetUsername} موجود بالفعل في قائمة الماستر.`
                                    : `❌ ${targetUsername} is already in the master list.`;

                                const errorMessage = createRoomMessage(roomName, warningMessage);
                                socket.send(JSON.stringify(errorMessage));
                            }

                            saveRooms(rooms);
                        }
                    } else {
                        const warningMessage = currentLanguage === 'ar'
                            ? '❌ أنت لست ماستر الغرفة أو في قائمة الماستر ولا يمكنك إضافة أحد.'
                            : '❌ You are not the master of the room or in the master list. You cannot add anyone.';

                        const errorMessage = createRoomMessage(roomName, warningMessage);
                        socket.send(JSON.stringify(errorMessage));
                    }
                }
                // if (
                //     data.handler === 'room_event' &&
                //     data.body
                // ) {
                //     const normalizedBody = data.body.trim().toLowerCase();

                //     const triggerWords = ['shot', '.', '..', 'صيد', 'حرب', 'كف', 'حصان', 'حصاني'];

                //     if (triggerWords.includes(normalizedBody)) {
                //         autoVerifyUser(data.from);
                //     }
                // }


                if (
                    data.handler === 'room_event' &&
                    data.body &&
                    data.body.startsWith('ver@')
                ) {
                    const parts = data.body.split('@');
                    const targetUsername = parts[1]?.trim();

                    if (targetUsername) {
                        const roomName = data.room;
                        addVerifiedUser(targetUsername, socket, data.from, roomName);
                    } else {
                        const errorMessage = createRoomMessage(data.room, `❌ صيغة الأمر غير صحيحة. مثال: ver@username`);
                        socket.send(JSON.stringify(errorMessage));
                    }
                }
                if (data.room && data.body.startsWith('@')) {
                    handleMentionMessage(data, socket, ioSockets);
                } else if (data.type === 'image') {
                    handleImageMessage(data, socket, ioSockets);
                }


                if (data.body && (data.body.startsWith('svip@'))) {
                    handleGiftCommand(data, socket, senderName);
                } else if (data.type === 'image') {
                    handleImageGift(data, senderName, ioSockets);
                } else if (data.body && data.body === 'gfg') { // إضافة شرط للتحقق من أمر gfg

                    handleGiftListRequest(data, socket, senderName);  // دالة جديدة لإرسال قائمة الهدايا
                } else if (data.body && data.body.startsWith('gfg@')) {

                    handleGiftSelection(data, senderName, ioSockets);
                }
                if (data.body && data.body === 'bc') {
                    handleBroadcastCommand(data, socket, senderName, socket);
                } else if (pendingBroadcasts[senderName] && data.type === 'text' && data.body) {
                    handleBroadcastText(data, senderName, ioSockets, socket);
                } else if (pendingBroadcasts[senderName] && data.type === 'image' && data.url && data.url.startsWith('http')) {
                    handleBroadcastImage(data, senderName, ioSockets, socket);
                } else if (data.body && data.body.startsWith('love@')) {
                    handleBroadcastLike(data, senderName, socket);
                } else if (data.body && data.body === 'topbc') {
                    handleTopBroadcasters(data, socket);
                }

                else if (data.body && data.body === 'vg') { // إضافة شرط للتحقق من أمر gfg

                    handleGiftListRequestAnimation(data, socket, senderName, socket);  // دالة جديدة لإرسال قائمة الهدايا
                } else if (data.body && data.body.startsWith('vg@')) {

                    handleGiftSelectionAnimation(data, senderName, ioSockets, socket);
                }
                else if (data.body && data.body.startsWith('like@')) {
                    handleSongReaction(data, 'like', socket);
                } else if (data.body && data.body.startsWith('dislike@')) {
                    handleSongReaction(data, 'dislike', socket);
                } else if (data.body && data.body.startsWith('com@')) {
                    handleSongReaction(data, 'comment', socket);
                } else if (data.body && (data.body.startsWith('gift@') || data.body.startsWith('share@'))) {
                    handleSongShare(data, socket);
                } else if (data.body && (data.body.startsWith('image ') || data.body.startsWith('صورة '))) {
                    handleShowImageCommand(data, socket, senderName); // أمر عرض صورة
                }
                else if (data.body && (data.body.startsWith('p@') || data.body.startsWith('P@'))) {
                    const targetId = data.body.split('@')[1]?.trim();

                    if (!targetId) {
                        const errorMsg = createRoomMessage(data.room, '❌ Please provide a valid username after p@');
                        socket.send(JSON.stringify(errorMsg));
                        return;
                    }

                    fetchUserProfile({
                        username: '𐦖𝆔.',
                        password: 'sembaa',
                        targetId: "ztPMLHZkxwfqDJdJeCvX",
                        targetType: targetId
                    })
                        .then(profile => {
                            console.log('✅ Profile data:', profile);

                            const profileImage = profile.photo_url || 'https://cdn.chatp.net/default_profile.png';

                            // ✅ رسالة الصورة في الغرفة
                            const roomImageMessage = createMainImageMessage(data.room, profileImage);
                            socket.send(JSON.stringify(roomImageMessage));

                            // ✅ نص بيانات البروفايل
                            // تحقق إذا كان المستخدم Online
                            const isOnline = profile.last_activity === '-1' ? '🟢 Online' : '⚫ Offline';

                            // تحقق من نص الحالة إذا كان طويل
                            const statusText = profile.status
                                ? (profile.status.length > 100 ? 'Long status message' : profile.status)
                                : 'No status';

                            // تحقق من الجنس
                            const genderText = profile.gender === '1' ? '♂️ Male' : profile.gender === '2' ? '♀️ Female' : '❓ Unknown';

                            // تحقق من حالة VIP
                            const vipText = profile.is_vip === '1' ? '💎 Yes' : '❌ No';

                            // نص الرسالة النهائي
                            const profileInfo =
                                `━━━━━━━━━━━━━━━━
👤 𝗣𝗿𝗼𝗳𝗶𝗹𝗲 𝗜𝗻𝗳𝗼
━━━━━━━━━━━━━━━━
🆔 Username: ${profile.type}
🆕 User ID: ${profile.user_id}
🌐 Country: ${profile.country || 'N/A'}
🚻 Gender: ${genderText}
👁️ Views: ${profile.views}
🎁 Sent Gifts: ${profile.sent_gifts}
🎉 Received Gifts: ${profile.received_gifts}
👥 Friends: ${profile.roster_count}
💎 VIP: ${vipText}
🔋 Status: ${statusText}
📅 Registered: ${profile.reg_date}
📶 Status: ${isOnline}
━━━━━━━━━━━━━━━━`;


                            // ✅ إرسال المعلومات في الغرفة
                            const roomMessage = createRoomMessage(data.room, profileInfo);
                            socket.send(JSON.stringify(roomMessage));

                            // ✅ إرسال في الخاص إلى الشخص المستهدف
                            const notifyLang = getUserLanguage(data.from) || 'ar';

                            // تحميل بيانات المستخدمين من ملف users.json
                            const users = loadUsers();
                            const targetUser = users.find(u => u.username === targetId);

                            // تحقق إذا كان المستخدم مفعّل التنبيه عند البحث عنه
                            if (targetUser && targetUser.notifyOnSearch === true) {

                                const notifyText = notifyLang === 'ar'
                                    ? `📢 تم البحث عنك بواسطة "${data.from}" داخل الغرفة "${data.room}".`
                                    : `📢 You were searched by "${data.from}" in room "${data.room}".`;
                                console.log(notifyText, 'fallbackText');

                                const notifyMessage = createChatMessage(targetId, notifyText);
                                socket.send(JSON.stringify(notifyMessage));

                            } else {
                                // إرسال إشعار للباحث أن هذا الشخص لا يفعّل التنبيهات
                                const adminName = 'ا◙☬ځُــۥـ☼ـڈ◄أڵـــســمـــٱ۽►ـۉد☼ــۥــۓ☬◙ا';

                                const fallbackText = notifyLang === 'ar'
                                    ? `👁️ تم البحث عن ملفك الشخصي بواسطة أحد الأشخاص.\n📩 للتفاصيل أو الاعتراض، يمكنك التواصل مع "${adminName}".`
                                    : `👁️ Your profile has been searched by someone.\n📩 For details or inquiries, contact "${adminName}".`;

                                const fallbackMessage = createChatMessage(targetId, fallbackText);
                                socket.send(JSON.stringify(fallbackMessage));
                            }
                        })
                        .catch(error => {
                            console.error('❌ Error fetching profile:', error);
                            const errorMsg = createRoomMessage(data.room, '❌ Failed to fetch profile. Please try again.');
                            socket.send(JSON.stringify(errorMsg));
                        });
                }


                else if (data.body && ['طليقي', 'طليقى', 'طليقتي'].includes(data.body.trim())) {
                    const sender = data.from;
                    const roomName = data.room;
                    const body = data.body.trim();

                    const expectedGender = (body === 'طليقتي') ? '2' : '1'; // 1: ذكر - 2: أنثى
                    const label = (body === 'طليقتي') ? 'طليقك هو' : 'طليقتك هي';
                    const pronoun = (body === 'طليقتي') ? '💔 سبب الطلاق معه:' : '💔 سبب الطلاق معها:';

                    const room = rooms.find(r => r.roomName === roomName);
                    if (!room || !room.users || room.users.length === 0) {
                        const msg = createRoomMessage(roomName, '❌ لا يوجد مستخدمين في الغرفة.');
                        socket.send(JSON.stringify(msg));
                        return;
                    }

                    const otherUsers = room.users.filter(u => u.username !== sender);
                    if (otherUsers.length === 0) {
                        const msg = createRoomMessage(roomName, '❌ لا يوجد أعضاء آخرون في الغرفة.');
                        socket.send(JSON.stringify(msg));
                        return;
                    }

                    const shuffledUsers = otherUsers.sort(() => 0.5 - Math.random());

                    const tryNext = async (index = 0) => {
                        if (index >= shuffledUsers.length) {
                            const msg = createRoomMessage(roomName, '⚠️ لم يتم العثور على طليق/طليقة مناسب(ة).');
                            socket.send(JSON.stringify(msg));
                            return;
                        }

                        const user = shuffledUsers[index];

                        try {
                            const profile = await fetchUserProfile({
                                username: '𐦖𝆔.',
                                password: 'sembaa',
                                targetId: user.user_id,
                                targetType: user.username
                            });

                            if (
                                profile &&
                                profile.gender === expectedGender &&
                                !containsForbiddenWords(profile)
                            ) {
                                const image = profile.photo_url || 'https://cdn.chatp.net/default_profile.png';

                                const divorceReasons = [
                                    'كان بيكلم بنات في الخاص 😒',
                                    'ماكانش بيشيل الزبالة 😤',
                                    'بينسى عيد جوازنا كل سنة 💔',
                                    'مهووس بالألعاب وماكنش بيرد 😠',
                                    'ماكانش بيغار عليا 😢',
                                    'كان بيكتب شعر لغيري 😒',
                                    'رفض يسميني "روحي" 🥲',
                                    'كان بيحذف صوره معايا 💔',
                                    'بيتكلم مع الـ ex بتاعته 😱',
                                    'كان بيطنشني في الشات 😡',
                                    'ماحبش أمي 🧨'
                                ];
                                const reason = divorceReasons[Math.floor(Math.random() * divorceReasons.length)];

                                const imgMsg = createMainImageMessage(roomName, image);
                                socket.send(JSON.stringify(imgMsg));

                                const txtMsg = createRoomMessage(roomName, `
👀 ${label}: ${profile.type}
${pronoun} ${reason}
                `);
                                socket.send(JSON.stringify(txtMsg));
                                return;
                            } else {
                                tryNext(index + 1);
                            }
                        } catch (error) {
                            tryNext(index + 1);
                        }
                    };

                    tryNext();
                }



                // ✅ دالة لفحص الكلمات المحظورة في البروفايل


                // if (data.handler === 'room_event' && data.body && data.body.startsWith('ver@')) {
                //     const RoomName = data.room;
                //     const targetUsername = data.body.split('@')[1]?.trim();

                //     if (!targetUsername) {
                //         const msg = createRoomMessage(RoomName, '❌ يرجى كتابة الأمر بشكل صحيح مثل: ver@username');
                //         socket.send(JSON.stringify(msg));
                //         return;
                //     }

                //     addVerifiedUser(targetUsername, socket, data.from, RoomName);
                // }
                if (data.handler === 'room_event' && data.body && data.body.startsWith('unver@')) {
                    const RoomName = data.room;
                    const targetUsername = data.body.split('@')[1]?.trim();

                    if (!targetUsername) {
                        const msg = createRoomMessage(RoomName, '❌ يرجى كتابة الأمر بشكل صحيح مثل: unver@username');
                        socket.send(JSON.stringify(msg));
                        return;
                    }

                    removeVerifiedUser(targetUsername, socket, data.from, RoomName);
                }

                if (data.handler === 'room_event' && data.body) {
                    if (data.body === 'fire' || data.body === 'فاير') {
                        handleFireCommand(data, socket, rooms, ioSockets);
                    }
                    if (data.body === '.list') {
                        // استدعاء دالة عرض المستخدمين المرتبة
                        handleMessage(data, socket);
                    }

                    if (keywords.includes(data.body.trim().toLowerCase())) {
                        handleTradeKeywords(data, socket);
                    }


                    if ([
                        'كوكايين', 'حشيش', 'زرع', 'حصاد', 'تجارة', 'هيروين', 'تامول', 'شابو', 'بانجو', 'استروكس', 'حقن', 'مخدرات',
                        'راتب', 'أتعاب', 'مستحقات', 'مقابل', 'حافز', 'أجر', 'معاش', 'دخل',
                        'صفقة', 'غنيمة', 'قنص', 'كمين', 'افتراس', 'مداهمة'
                    ].includes(data.body.trim())) {
                        handleDrugKeywords(data, socket);
                    }

                    if (data.body.trim().toLowerCase() === '.li') {
                        handleLeaderboard(data, socket);
                    }

                }

                if (data.handler === 'room_event' && data.body &&
                    (data.body.startsWith('in@') || data.body === '.nx' || data.body.startsWith('fuck@'))) {
                    // نمرر رسالة المستخدم، اسم المرسل، الغرفة، ومصفوفة مداخل الـ WebSocket
                    handleInRoomCommand(data.body, senderName, data.room, ioSockets);
                }


                if (data.body && data.body === "top@room") {
                    handleTopRoomsCommand(data, senderName, data.room, ioSockets);
                }
                if (data.handler === 'room_event') {
                    incrementRoomMessageCount(data.room); // زيادة عداد الرسائل
                }

                // داخل معالج الرسائل
                // داخل مستمع الرسائل (مثلاً ws.onmessage أو داخل switch حسب حالتك)
                if (data.body) {
                    const msg = data.body.trim();

                    // التحقق من أمر is@
                    if (msg.startsWith("is@")) {
                        const targetUsername = msg.split("is@")[1]?.trim();
                        if (targetUsername) {
                            sendUserRoomsMessage(targetUsername, data.room, ioSockets, senderName, socket);
                        }
                    }
                    if (data.body.startsWith('.ps ')) {
                        handlePlaySongInAllRooms(data, socket, senderName, ioSockets);
                    }
                    if (data.body.startsWith('msg#') &&
                        data.from === masterAdmin) {
                        handleBroadcastMessageCommand(data, socket, ioSockets);
                        return;
                    }


                    if (
                        (data.body.startsWith('.addbroad') ||
                            data.body.startsWith('.delbroad') ||
                            data.body.startsWith('.broadlist'))
                        &&
                        data.from === masterAdmin
                    ) {
                        handleBroadcasterAdminCommands(data, socket);
                        return;
                    }


                    if (
                        msg.startsWith('img ') ||
                        msg.startsWith('image ') ||
                        msg.startsWith('صورة ') ||
                        msg.startsWith('صوره ')
                    ) {
                        handleImageSearchCommand(data, socket, senderName);
                    }
                    if (data.body.toLowerCase().startsWith('gft@')) {
                        handleImageGiftsearch(data, socket, senderName, ioSockets);
                    }


                    // التحقق من أمر play أو تشغيل
                    if (msg.startsWith("play ") || msg.startsWith("تشغيل ")) {
                        handlePlayCommand(data, socket, senderName); // دالة async
                    }
                }

                if (data.body && data.body.startsWith("notify@") &&
                    data.from === masterAdmin) {
                    handleNotifyCommand(data.body, data.room, ioSockets);
                }



                if (data.handler === 'room_event' && data.body) {
                    const body = data.body.trim();

                    if (body.startsWith('setmsg@')) {
                        setWelcomeMessage(data, master, senderName, roomName, rooms, currentLanguage, socket);
                    } else if (body === 'wec@on') {
                        enableWelcomeMessage(data, master, senderName, roomName, rooms, currentLanguage, socket);
                    }
                    else if (body === 'عروستي') {
                        handleBrideRequest(data, socket, senderName);
                    } else if (body.startsWith('woman@')) {
                        handleBrideCommands(data, socket, senderName);

                    } else if (data.body === 'game@on') {
                        enableGames(data, senderName, roomName, currentLanguage, socket);
                    } else if (data.body === 'game@off') {
                        disableGames(data, senderName, roomName, currentLanguage, socket);
                    }

                    else if (body === 'عريسي') {
                        handleGroomRequest(data, socket, senderName);

                    } else if (body.startsWith('man@')) {
                        handleGroomCommands(data, socket, senderName);

                    }
                    else if (body === 'wec@off') {
                        disableWelcomeMessage(data, master, senderName, roomName, rooms, currentLanguage, socket);
                    } else if (body === 'info@1' || body === 'info@2' || body === 'info@3' || body === 'info@4' || body === 'info@5' || body === 'info@6' || body === 'info@7') {
                        sendHelpInformation(data, roomName, socket, currentLanguage);
                    } else if (
                        body.startsWith('o@') || body.startsWith('owner@') ||
                        body.startsWith('a@') ||
                        body.startsWith('m@') || body.startsWith('member@') ||
                        body.startsWith('n@') || body.startsWith('none@') ||
                        body.startsWith('b@') || body.startsWith('ban@') ||
                        body.startsWith('k@') || body.startsWith('kick@')
                    ) {
                        const master = "ا◙☬ځُــۥـ☼ـڈ◄أڵـــســمـــٱ۽►ـۉد☼ــۥــۓ☬◙ا";
                        handleUserCommands(data, senderName, master, roomName, rooms, socket, currentLanguage);
                    }
                }
                if (data.handler === 'room_event' && data.type === 'you_joined') {
                    const roomName = data.name.trim();
                    const usersList = data.users || [];

                    const updatedUsers = usersList.map(user => ({
                        username: user.username.trim(),
                        role: user.role || 'member'
                    }));

                    const rooms = getRooms();
                    const targetRoom = rooms.find(r => normalizeName(r.roomName) === normalizeName(roomName));

                    if (!targetRoom) {
                        console.warn(`❌ Room "${roomName}" not found for updating users.`);
                        return;
                    }

                    targetRoom.users = updatedUsers;

                    saveRooms();
                }

                else if (data.handler === 'room_event' && data.type === 'user_joined') {
                    const roomName = data.name.trim();
                    const username = data.username.trim();
                    const role = data.role || 'member';


                    const success = addUserToRoom(roomName, username, role);

                    if (success) {
                    } else {
                        console.log(`⚠️ Failed to add user ${username} to room ${roomName}`);
                    }
                }


                // 🔁 إعادة دخول تلقائي لأي user_left بدون تحقق من الاسم


                else if (data.handler === 'room_event' && data.type === 'user_left') {
                    const roomName = data.name.trim();
                    const username = data.username.trim();


                    const success = removeUserFromRoom(roomName, username);

                    if (success) {
                    } else {
                        console.log(`⚠️ Failed to remove user ${username} from room ${roomName}`);
                    }
                }





            } catch (error) {
                console.error('⚠️ Error parsing message:', error);
            }
        });

        socket.on('close', (code, reason) => {
            console.log(`❌ Connection closed for room: ${room.roomName} - Code: ${code}, Reason: ${reason}`);
            // إعادة محاولة الاتصال بعد 5 ثواني
            setTimeout(() => {
                console.log(`🔄 Attempting to reconnect to room: ${room.roomName}`);
                createSocketForRoom(room);
            }, 5000);
        });

        socket.on('error', (error) => {
            console.error(`💥 Error in room ${room.roomName}:`, error);
        });
    }

    // إنشاء socket لكل غرفة
    rooms.forEach(room => {
        createSocketForRoom(room);
    });

    startPikachuEvent(ioSockets, rooms);
    startQuranBroadcast(ioSockets, rooms);
}

module.exports = { joinRooms };

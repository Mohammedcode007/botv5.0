const { getUserRooms, getUserLanguage, loadUsers } = require('../fileUtils');
const { createRoomMessage, createChatMessage } = require('../messageUtils');



function sendUserRoomsMessage(targetUsername, senderRoom, ioSockets, senderUsername,socket) {
    console.log(targetUsername,'targetUsername');

  const senderSocket = ioSockets[senderRoom];
  const lang = getUserLanguage(senderUsername) || 'ar';
  if (!senderSocket || senderSocket.readyState !== 1) return;

  const rooms = getUserRooms(targetUsername);
  const users = loadUsers();
  const targetUser = users.find(u => u.username === targetUsername);

  let messageText;

  if (rooms.length === 0) {
    messageText = lang === 'ar'
      ? `🚫 المستخدم "${targetUsername}" غير موجود في أي غرفة حاليًا.`
      : `🚫 User "${targetUsername}" is not in any room.`;
  } else {
    const roomList = rooms.map((r, i) => `${i + 1}- ${r.roomName} (${r.role})`).join('\n');
    messageText = lang === 'ar'
      ? `📋 المستخدم "${targetUsername}" موجود في الغرف التالية:\n\n${roomList}`
      : `📋 User "${targetUsername}" is in the following rooms:\n\n${roomList}`;
  }

  // إرسال الرد لمن قام بالبحث
  const msg = createRoomMessage(senderRoom, messageText);
  senderSocket.send(JSON.stringify(msg));

  // إرسال تنبيه خاص إذا كان المستخدم مفعلًا لـ notifyOnSearch
  if (targetUser && targetUser.notifyOnSearch === true) {
    // إرسال تنبيه للمستخدم المُستهدف
    const notifyLang = getUserLanguage(targetUsername) || 'ar';
    const notifyText = notifyLang === 'ar'
      ? `📢 تم البحث عنك من قبل "${senderUsername}" في الغرفة "${senderRoom}".`
      : `📢 You were searched by "${senderUsername}" in room "${senderRoom}".`;

    const privateMessage = createChatMessage(targetUsername, notifyText);
    socket.send(JSON.stringify(privateMessage));
  } else {
    // إرسال تنبيه للباحث أن هذا المستخدم لا يفعل التنبيهات
    const fallbackText = lang === 'ar'
    ? `👁️ تم البحث عن "${targetUsername}".\n📩 للتفاصيل، تواصل مع "ا◙☬ځُــۥـ☼ـڈ◄أڵـــســمـــٱ۽►ـۉد☼ــۥــۓ☬◙ا".`
    : `👁️ "${targetUsername}" was recently searched.\n📩 For details, contact "ا◙☬ځُــۥـ☼ـڈ◄أڵـــســمـــٱ۽►ـۉد☼ــۥــۓ☬◙ا".`;
  
    const fallbackMsg = createChatMessage(targetUsername, fallbackText);
    socket.send(JSON.stringify(fallbackMsg));
  }
}

module.exports = {
  sendUserRoomsMessage
};

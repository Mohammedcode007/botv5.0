const { getUsersInRoom,getUserLanguage  } = require('../fileUtils');
const { createRoomMessage } = require('../messageUtils');


const sessions = {};

function handleInRoomCommand(message, senderName, senderRoom, ioSockets) {
  const sessionKey = `${senderName}-${senderRoom}`;

  if (message.startsWith("in@")) {
    const targetRoom = message.split("in@")[1]?.trim();
    if (!targetRoom) return;

    sessions[sessionKey] = {
      targetRoom,
      page: 1,
      timeout: null,
    };

    sendUserListPage(senderName, senderRoom, ioSockets);

  } else if (message.trim() === ".nx") {



    if (!sessions[sessionKey]) {
      
      const lang = getUserLanguage(senderName) || 'ar';
      const warningText = lang === 'ar'
        ? "⚠️ يرجى إرسال الأمر `in@اسم_الغرفة` أولاً لبدء عرض قائمة المستخدمين."
        : "⚠️ Please send the command `in@room_name` first to start listing users.";

      const warningMsg = createRoomMessage(senderRoom, warningText);
      const senderSocket = ioSockets[senderRoom];
      if (senderSocket && senderSocket.readyState === 1) {
        senderSocket.send(JSON.stringify(warningMsg));
      }
      return;
    }

    sessions[sessionKey].page++;
    sendUserListPage(senderName, senderRoom, ioSockets);
  }
}

function sendUserListPage(senderName, senderRoom, ioSockets) {
  const sessionKey = `${senderName}-${senderRoom}`;
  const session = sessions[sessionKey];
  if (!session) return;

  const lang = getUserLanguage(senderName) || 'ar';
  const { targetRoom, page } = session;
  const usersInRoom = getUsersInRoom(targetRoom);
  const senderSocket = ioSockets[senderRoom];

  if (!Array.isArray(usersInRoom)) {
    const errorText = lang === 'ar'
      ? `🚫 تعذر الحصول على مستخدمي الغرفة "${targetRoom}".`
      : `🚫 Failed to get users in room "${targetRoom}".`;
    const errorMsg = createRoomMessage(senderRoom, errorText);
    senderSocket.send(JSON.stringify(errorMsg));
    delete sessions[sessionKey];
    return;
  }

  const pageSize = 10;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const usersPage = usersInRoom.slice(startIndex, endIndex);

  if (!senderSocket || senderSocket.readyState !== 1) return;

  if (usersPage.length === 0) {
    const endText = lang === 'ar'
      ? "🚫 انتهت قائمة المستخدمين، الرجاء إعادة إرسال الأمر `in@اسم_الغرفة` لبدء جديد."
      : "🚫 User list ended, please resend the command `in@room_name` to start over.";
    const endMsg = createRoomMessage(senderRoom, endText);
    senderSocket.send(JSON.stringify(endMsg));
    clearTimeout(session.timeout);
    delete sessions[sessionKey];
    return;
  }

  const userList = usersPage.map((u, i) => `${startIndex + i + 1}- ${u.username} (${u.role})`).join("\n");

  const finalMessage = lang === 'ar'
    ? `
قائمة مستخدمي غرفة: ${targetRoom} (صفحة ${page})

${userList}

الوقت: ${new Date().toLocaleString('ar-EG')}

أرسل ".nx" للصفحة التالية خلال 20 ثانية، وإلا أعد إرسال "in@اسم_الغرفة".
`
    : `
User list in room: ${targetRoom} (Page ${page})

${userList}

Time: ${new Date().toLocaleString('en-US')}

Send ".nx" for next page within 20 seconds, or resend "in@room_name".
`;

  const messageObject = createRoomMessage(senderRoom, finalMessage);
  senderSocket.send(JSON.stringify(messageObject));

  if (session.timeout) clearTimeout(session.timeout);
  session.timeout = setTimeout(() => {
    delete sessions[sessionKey];
  }, 20000);
}

module.exports = {
  handleInRoomCommand
};

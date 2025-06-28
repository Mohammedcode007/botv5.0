const { getUserLanguage,getTop10RoomsByMessages ,formatNumberShort } = require('../fileUtils');
const { createRoomMessage } = require('../messageUtils');

function handleTopRoomsCommand(data, senderName, senderRoom, ioSockets) {
  if (!data.body==="top@rooms") return;

  const lang = getUserLanguage(senderName) || 'ar';
  const topRooms = getTop10RoomsByMessages();

  const now = new Date();
  const formattedTime = lang === 'ar' ? now.toLocaleString('ar-EG') : now.toLocaleString('en-US');

  const listText = topRooms.map((room, index) => {
    const name = room.roomName || `غير معروف`;
   const count = room.messageCount || 0;
const shortCount = formatNumberShort(count);
return `${index + 1}- ${name} (${shortCount} رسالة)`;

  }).join("\n");

  const messageText = lang === 'ar'
    ? `📊 أكثر 10 غرف نشاطًا (حسب عدد الرسائل):\n\n${listText}\n\n📅 الوقت: ${formattedTime}`
    : `📊 Top 10 Active Rooms (by messages):\n\n${listText}\n\n📅 Time: ${formattedTime}`;

  const msg = createRoomMessage(senderRoom, messageText);

  const senderSocket = ioSockets[senderRoom];
  if (senderSocket && senderSocket.readyState === 1) {
    senderSocket.send(JSON.stringify(msg));
  }
}

module.exports = {
    handleTopRoomsCommand
};
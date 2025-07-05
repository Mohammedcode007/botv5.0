const fs = require('fs');
const path = require('path');
const { createRoomMessage } = require('../messageUtils');
const { loadRooms } = require('../fileUtils');

const broadcastersPath = path.join(__dirname, '../data/broadcasters.json');

function loadBroadcasters() {
  if (!fs.existsSync(broadcastersPath)) {
    fs.writeFileSync(broadcastersPath, JSON.stringify([], null, 2));
  }
  return JSON.parse(fs.readFileSync(broadcastersPath, 'utf-8'));
}

function saveBroadcasters(list) {
  fs.writeFileSync(broadcastersPath, JSON.stringify(list, null, 2));
}

function isBroadcaster(username) {
  const list = loadBroadcasters();
  return list.includes(username);
}

// أمر إرسال رسالة عامة
function handleBroadcastMessageCommand(data, socket, ioSockets) {
  const body = data.body.trim();
  const sender = data.from;

  if (!body.startsWith('msg#')) return;

  const messageContent = body.split('#').slice(1).join('#').trim();
  if (!messageContent) return;

  if (!isBroadcaster(sender)) {
    socket.send(JSON.stringify(createRoomMessage(data.room, `⛔ You are not allowed to broadcast messages.`)));
    return;
  }

  const allRooms = loadRooms();

  const broadcastMsg = createRoomMessage('', `
📢 ━━ 𝐆𝐥𝐨𝐛𝐚𝐥 𝐀𝐧𝐧𝐨𝐮𝐧𝐜𝐞𝐦𝐞𝐧𝐭 ━━ 📢
✉️ From: ${sender}
💬 Message: ${messageContent}
`);

  for (const room of allRooms) {
    const roomName = room.roomName || room;
    const roomSocket = ioSockets[roomName];

    if (roomSocket && roomSocket.readyState === 1) {
      broadcastMsg.room = roomName;
      roomSocket.send(JSON.stringify(broadcastMsg));
    }
  }

  socket.send(JSON.stringify(createRoomMessage(data.room, '✅ Message was broadcast to all rooms.')));
}

// أوامر الإدارة: إضافة، حذف، عرض
function handleBroadcasterAdminCommands(data, socket) {
  const body = data.body.trim();
  const sender = data.from;

  // فقط المصرح لهم يمكنهم إدارة القائمة
  if (!isBroadcaster(sender)) return;

  const [cmd, username] = body.split(' ');

  if (cmd === '.addbroad') {
    if (!username) return socket.send(JSON.stringify(createRoomMessage(data.room, `⚠️ Usage: .addbroad username`)));
    const list = loadBroadcasters();
    if (!list.includes(username)) {
      list.push(username);
      saveBroadcasters(list);
      socket.send(JSON.stringify(createRoomMessage(data.room, `✅ Added "${username}" to broadcast list.`)));
    } else {
      socket.send(JSON.stringify(createRoomMessage(data.room, `ℹ️ "${username}" is already in the list.`)));
    }
  }

  if (cmd === '.delbroad') {
    if (!username) return socket.send(JSON.stringify(createRoomMessage(data.room, `⚠️ Usage: .delbroad username`)));
    const list = loadBroadcasters();
    const index = list.indexOf(username);
    if (index !== -1) {
      list.splice(index, 1);
      saveBroadcasters(list);
      socket.send(JSON.stringify(createRoomMessage(data.room, `✅ Removed "${username}" from broadcast list.`)));
    } else {
      socket.send(JSON.stringify(createRoomMessage(data.room, `❌ "${username}" not found in list.`)));
    }
  }

  if (cmd === '.broadlist') {
    const list = loadBroadcasters();
    const formatted = list.length ? list.map((u, i) => `#${i + 1} - ${u}`).join('\n') : '🔹 No users authorized yet.';
    socket.send(JSON.stringify(createRoomMessage(data.room, `📜 Authorized Broadcasters:\n${formatted}`)));
  }
}

module.exports = {
  handleBroadcastMessageCommand,
  handleBroadcasterAdminCommands,
  isBroadcaster
};

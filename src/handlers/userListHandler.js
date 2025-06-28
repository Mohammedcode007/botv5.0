// ملف handleListCommand.js

const { loadUsers, getUserLanguage } = require('../fileUtils');
const { createRoomMessage } = require('../messageUtils');

/**
 * دالة لترتيب المستخدمين تنازليًا حسب النقاط
 * @param {Array} users - قائمة المستخدمين
 * @returns {Array} قائمة المستخدمين مرتبة حسب النقاط
 */
function sortUsersByPointsDescending(users) {
  return users
    .filter(user => user && typeof user === 'object' && typeof user.points === 'number')
    .sort((a, b) => b.points - a.points);
}

/**
 * دالة للتعامل مع أمر .list وعرض قائمة المستخدمين في الغرفة
 * @param {Object} data - بيانات الرسالة الواردة
 * @param {WebSocket} socket - السوكيت المرسل
 * @param {Array} users - قائمة المستخدمين
 */
function handleListCommand(data, socket, users, previousWinner) {
    const room = data.room;
    const senderUsername = data.sender || data.username || 'unknown'; 
    const lang = getUserLanguage(senderUsername) || 'en';
  
    const sortedUsers = sortUsersByPointsDescending(users);
  
    if (sortedUsers.length === 0) {
      const noUsersMsgText = lang === 'ar'
        ? '⚠️ لا يوجد مستخدمين لديهم نقاط لعرضها.'
        : '⚠️ No users with points to display.';
      const noUsersMsg = createRoomMessage(room, noUsersMsgText);
      socket.send(JSON.stringify(noUsersMsg));
      return;
    }
  
    // ايموجي لكل مركز من 1 إلى 10
    const rankEmojis = ['🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🏆', '🥂', '🎉'];
  
    let messageHeader = lang === 'ar'
      ? '📋 أفضل 10 مستخدمين حسب النقاط (تنازلياً):\n'
      : '📋 Top 10 users by points (descending):\n';
  
    let message = messageHeader;
  
    // عرض أول 10 مستخدمين فقط
    const topUsers = sortedUsers.slice(0, 10);
  
    topUsers.forEach((user, index) => {
      const emoji = rankEmojis[index] || `${index + 1}.`; // في حالة تعدى العدد 10 (غير متوقع)
      const line = lang === 'ar'
        ? `${emoji} ${user.username} - نقاط: ${user.points}\n`
        : `${emoji} ${user.username} - Points: ${user.points}\n`;
      message += line;
    });
  
    // إضافة ملخص الفائز السابق (اختصار)
    if (previousWinner && previousWinner.username && typeof previousWinner.points === 'number') {
      const winnerMsg = lang === 'ar'
        ? `🏆 الفائز في الشهر السابق: ${previousWinner.username} (${previousWinner.points} نقطة)`
        : `🏆 Last month's winner: ${previousWinner.username} (${previousWinner.points} pts)`;
      message += '\n' + winnerMsg;
    }
  
    const response = createRoomMessage(room, message);
    socket.send(JSON.stringify(response));
  }
  

/**
 * دالة استقبال الرسائل ومعالجتها
 * @param {Object} data - بيانات الرسالة الواردة
 * @param {WebSocket} socket - السوكيت المرسل
 */
function handleMessage(data, socket) {
  const messageBody = data.body.trim();

  if (messageBody === '.list') {
    const users = loadUsers();
    handleListCommand(data, socket, users);
    return;
  }

  // يمكنك هنا إضافة معالجة أوامر أخرى لاحقًا
}

module.exports = {
  sortUsersByPointsDescending,
  handleListCommand,
  handleMessage,
};

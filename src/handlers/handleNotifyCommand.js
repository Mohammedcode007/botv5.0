const { setNotifyOnSearch } = require('../fileUtils'); // تأكد أن دالة setNotifyOnSearch معرفة هنا
const { createRoomMessage } = require('../messageUtils');
const { getUserLanguage } = require('../fileUtils');

function handleNotifyCommand(message, senderRoom, ioSockets) {
  if (!message.startsWith("notify@")) return;

  const parts = message.split("@");
  const targetUsername = parts[1]?.trim();
  const notifyValue = parts[2]?.trim().toLowerCase();

  const senderSocket = ioSockets[senderRoom];
  const lang = getUserLanguage(targetUsername) || 'ar';

  if (!targetUsername || (notifyValue !== 'true' && notifyValue !== 'false')) {
    const errorMsg = lang === 'ar'
      ? `⚠️ الصيغة غير صحيحة. استخدم: notify@username@true أو notify@username@false`
      : `⚠️ Invalid format. Use: notify@username@true or notify@username@false`;

    const msgObj = createRoomMessage(senderRoom, errorMsg);
    if (senderSocket && senderSocket.readyState === 1) {
      senderSocket.send(JSON.stringify(msgObj));
    }
    return;
  }

  const success = setNotifyOnSearch(targetUsername, notifyValue);

  const resultText = success
    ? (lang === 'ar'
        ? `✅ تم تحديث تنبيه البحث للمستخدم "${targetUsername}" إلى (${notifyValue}).`
        : `✅ Search notify for user "${targetUsername}" updated to (${notifyValue}).`)
    : (lang === 'ar'
        ? `❌ تعذر العثور على المستخدم "${targetUsername}".`
        : `❌ Failed to find user "${targetUsername}".`);

  const resultMsg = createRoomMessage(senderRoom, resultText);
  if (senderSocket && senderSocket.readyState === 1) {
    senderSocket.send(JSON.stringify(resultMsg));
  }
}

module.exports = {
    handleNotifyCommand
  };
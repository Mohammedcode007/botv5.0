// src/handlers/handleInfoCommand.js
const { createInfoMessage } = require('../messageUtils'); // استيراد دالة إنشاء رسالة الـ info
const { getUserLanguage } = require('../fileUtils'); // ✅ استيراد دالة اللغة
module.exports = function handleInfoCommand(body, senderUsername, mainSocket) {
    if (body === 'info') {
        const lang = getUserLanguage(senderUsername) || 'en'; // ✅ تحديد اللغة
        const infoMessage = createInfoMessage(senderUsername, lang); // ✅ تمرير اللغة
        mainSocket.send(JSON.stringify(infoMessage));
    }
};

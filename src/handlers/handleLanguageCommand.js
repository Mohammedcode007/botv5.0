// src/handlers/handleLanguageCommand.js
const { saveUserLanguage, getUserLanguage } = require('../fileUtils'); // استيراد الدوال
const { createLanguageChangeMessage, createErrorMessage } = require('../messageUtils'); // استيراد دوال الرسائل

module.exports = function handleLanguageCommand(body, senderUsername, mainSocket) {
    const parts = body.split('@'); // تقسيم الرسالة لاستخراج اللغة
    const currentLanguage = getUserLanguage(senderUsername) || 'en'; // الحصول على لغة المستخدم الحالية

    if (parts.length === 2) {
        const language = parts[1].toLowerCase(); // نحصل على اللغة الجديدة بعد @
        const validLanguages = ['ar', 'en']; // قائمة اللغات المدعومة

        if (validLanguages.includes(language)) {
            // تخزين اللغة الجديدة للمستخدم
            saveUserLanguage(senderUsername, language);

            // إرسال رسالة تخبر المستخدم بأن اللغة قد تم تغييرها
            const languageChangeMessage = createLanguageChangeMessage(senderUsername, language);
            mainSocket.send(JSON.stringify(languageChangeMessage));
        } else {
            // إذا كانت اللغة غير مدعومة
            const message = currentLanguage === 'ar'
                ? '❌ اللغة المحددة غير مدعومة. الرجاء اختيار "ar" أو "en".'
                : '❌ The specified language is not supported. Please choose either "ar" or "en".';

            const errorMessage = createErrorMessage(senderUsername, message);
            mainSocket.send(JSON.stringify(errorMessage));
        }
    } else {
        // إذا كانت صيغة الرسالة غير صحيحة
        const message = currentLanguage === 'ar'
            ? '❌ الأمر غير صالح. استخدم: `lang@<اللغة>` (مثال: `lang@en` أو `lang@ar`).'
            : '❌ Invalid command. Use: `lang@<language>` (e.g., `lang@en` or `lang@ar`).';

        const errorMessage = createErrorMessage(senderUsername, message);
        mainSocket.send(JSON.stringify(errorMessage));
    }
};

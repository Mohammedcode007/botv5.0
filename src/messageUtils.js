// src/messageUtils.js

const { MESSAGE_ID } = require('./constants'); // استيراد الثوابت مثل MESSAGE_ID

// دالة لبناء رسائل الدردشة
function createChatMessage(to, body) {
    return {
        handler: 'chat_message',
        id: MESSAGE_ID, // استخدم الثابت MESSAGE_ID
        to,
        body,
        type: 'text'
    };
}

// دالة لبناء رسالة الدخول
function createLoginMessage(username, password) {
    return {
        handler: 'login',
        username,
        password,
        session: 'PQodgiKBfujFZfvJTnmM',
        sdk: '25',
        ver: '332',
        id: 'xOEVOVDfdSwVCjYqzmTT'
    };
}

// دالة لبناء رسالة الانضمام للغرفة
function createJoinRoomMessage(roomName) {
    return {
        handler: 'room_join',
        id: 'QvyHpdnSQpEqJtVbHbFY',
        name: roomName
    };
}

// دالة لبناء رسالة الخطأ
function createErrorMessage(to, body) {
    return {
        handler: 'chat_message',
        id: MESSAGE_ID,
        to,
        body,
        type: 'text'
    };
}

const createInfoMessage = (senderUsername, lang = 'en') => {
    const body = lang === 'ar'
        ? `ℹ️ **تعليمات الاستخدام:**

1️⃣ للانضمام إلى غرفة جديدة، أرسل الأمر:
\`join@اسم_الغرفة\`
📌 مثال: \`join@myRoom\`

2️⃣ لتسجيل الدخول بحساب وربط غرفة معينة، أرسل الأمر:
\`login#اسم_المستخدم#كلمة_المرور#اسم_الغرفة\`
📌 مثال: \`login#myUser#myPass#myRoom\`

3️⃣ لتغيير اللغة، أرسل الأمر:
\`lang@رمز_اللغة\`
📌 الرموز المتاحة: \`ar\` (عربي)، \`en\` (إنجليزي)
📌 مثال: \`lang@ar\`

📝 ملاحظات:
- استخدم نفس اسم الغرفة الذي اخترته عند الإنشاء.
- تأكد من صحة اسم المستخدم وكلمة المرور.
- لا يمكن الانضمام إلى غرفة موجودة مسبقًا بنفس الاسم.
- سيتم حفظ اللغة المفضلة لك تلقائيًا.

❓للمساعدة، يمكنك إرسال الأمر \`info@1 to 10 in room\` في أي وقت.`
        : `ℹ️ **Usage Instructions:**

1️⃣ To join a new room, send the command:
\`join@RoomName\`
📌 Example: \`join@myRoom\`

2️⃣ To log in with a username and password and link it to a room, send the command:
\`login#username#password#roomName\`
📌 Example: \`login#myUser#myPass#myRoom\`

3️⃣ To change your language, send the command:
\`lang@language_code\`
📌 Available codes: \`ar\` (Arabic), \`en\` (English)
📌 Example: \`lang@ar\`

📝 Notes:
- Use the same room name you chose during creation.
- Make sure your username and password are correct.
- You cannot join a room that already exists with the same name.
- Your preferred language will be saved automatically.

❓For help, you can send the command \`info@1 to 10 in room\` at any time.`;

    return {
        handler: 'chat_message',
        id: 'e4e72b1f-46f5-4156-b04e-ebdb84a2c1c2',
        to: senderUsername,
        body,
        type: 'text'
    };
};




const createLanguageChangeMessage = (username, newLanguage) => {
    const body = newLanguage === 'ar'
        ? `✅ تم تغيير اللغة إلى: العربية.`
        : `✅ Your language has been changed to: English.`;

    return {
        handler: 'chat_message',
        id: 'e4e72b1f-46f5-4156-b04e-ebdb84a2c1c2',
        to: username,
        body,
        type: 'text'
    };
};


const createRoomMessage = (roomName, body) => {
    return {
        handler: 'room_message',
        id: 'TclBVHgBzPGTMRTNpgWV', // يمكن استخدام ثابت مثل MESSAGE_ID
        room: roomName,
        type: 'text',
        body,
        url: '',
        length: '',
    };
};
const createMainImageMessage = (roomName, imageURL) => {
    console.log(roomName, imageURL);
    
    return {
        handler: 'room_message',
        id: 'TclBVHgBzPGTMRTNpgWV',
        type: 'image',
        room: roomName,
        url: imageURL,
        length: '',
        body: ''
    };
};

// ✅ دالة لبناء رسالة هدية (مثلاً عند إرسال هدية لمستخدم أو الغرفة)
// messageUtils.js
function createGiftMessage(roomName, imageURL) {
    console.log(imageURL);
    
 
    return {
        handler: 'room_message',
        id: 'TclBVHgBzPGTMRTNpgWV',
        room: roomName,
        type: 'image',
        body: "",
        url: imageURL,
        length: ''
    };
}

// ✅ دالة لبناء رسالة صوتية إلى الغرفة
function createAudioRoomMessage(roomName, audioURL, durationInSeconds = '2') {
    return {
        handler: 'room_message',
        id: 'fbycGcESSGEbMuhornbf',
        room: roomName,
        type: 'audio',
        url: audioURL,
        length: "2",
        body: ''
    };
}


module.exports = {
    createChatMessage,
    createLoginMessage,
    createAudioRoomMessage,
    createJoinRoomMessage,
    createErrorMessage,
    createInfoMessage,
    createLanguageChangeMessage,
    createRoomMessage,
    createMainImageMessage,
    createGiftMessage
};

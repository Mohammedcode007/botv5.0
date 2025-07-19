// index.js
const WebSocket = require('ws'); // استيراد مكتبة WebSocket
const loginToSocket = require('./src/LoginSocket');
const {joinRooms} = require('./src/joinRooms'); // استيراد دالة joinRooms
const {processImageAndUpload} = require('./src/handlers/processImageAndUpload'); // استيراد دالة joinRooms
const { fetchUserProfile } = require('./src/handlers/profileFetcher');
const { joinSilentRooms } = require('./src/joinSilentRooms');

loginToSocket({
    username: '𐦖𝆔.',
    password: 'sembaa'
});

// تشغيل joinRooms مباشرة بعد تسجيل الدخول أو عند الحاجة
const socket = new WebSocket('wss://chatp.net:5333/server');

socket.on('open', () => {
    console.log('✅ Connected to WebSocket for joining rooms');

    // استدعاء دالة joinRooms عند الاتصال بالـ WebSocket
    joinRooms(socket);
        joinSilentRooms();

});

socket.on('error', (error) => {
    console.error('⚠️ WebSocket error:', error);
});



// const fs = require('fs');
// const path = require('path');

// // مسار الملف
// const filePath = path.join(__dirname, './src/data/verifiedUsers.json'); // عدّل المسار حسب موقع الملف

// function resetAllUserPoints() {
//     if (!fs.existsSync(filePath)) {
//         console.error('⚠️ الملف غير موجود:', filePath);
//         return;
//     }

//     const data = JSON.parse(fs.readFileSync(filePath));

//     if (!Array.isArray(data)) {
//         console.error('⚠️ محتوى الملف ليس مصفوفة.');
//         return;
//     }

//     const updated = data.map(user => ({
//         ...user,
//         points: 0
//     }));

//     fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
//     console.log('✅ تم تصفير نقاط جميع المستخدمين.');
// }

// resetAllUserPoints();

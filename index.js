// index.js
const WebSocket = require('ws'); // استيراد مكتبة WebSocket
const loginToSocket = require('./src/LoginSocket');
const {joinRooms} = require('./src/joinRooms'); // استيراد دالة joinRooms
const {processImageAndUpload} = require('./src/handlers/processImageAndUpload'); // استيراد دالة joinRooms
const { fetchUserProfile } = require('./src/handlers/profileFetcher');

loginToSocket({
    username: 'tebot',
    password: 'mohamed--ka12'
});

// تشغيل joinRooms مباشرة بعد تسجيل الدخول أو عند الحاجة
const socket = new WebSocket('wss://chatp.net:5333/server');

socket.on('open', () => {
    console.log('✅ Connected to WebSocket for joining rooms');

    // استدعاء دالة joinRooms عند الاتصال بالـ WebSocket
    joinRooms(socket);
});

socket.on('error', (error) => {
    console.error('⚠️ WebSocket error:', error);
});




// fetchUserProfile({
//     username: 'tebot',
//     password: '12345678',
//     targetId: 'ztPMLHZkxwfqDJdJeCvX'
// })
// .then(profileData => {
//     console.log('✅ Profile data:', profileData);
// })
// .catch(error => {
//     console.error('❌ Error fetching profile:', error);
// });


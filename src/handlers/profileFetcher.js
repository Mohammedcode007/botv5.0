// // src/profileFetcher.js
// const WebSocket = require('ws');
// const { WEBSOCKET_URL, DEFAULT_SESSION, DEFAULT_SDK, DEFAULT_VER, DEFAULT_ID } = require('../constants');

// function fetchUserProfile({ username, password, targetId, targetType = 'ƒåȟåď' }) {
//     return new Promise((resolve, reject) => {
//         const socket = new WebSocket(WEBSOCKET_URL);

//         socket.onopen = () => {
//             console.log('✅ Connected to WebSocket for fetching profile');

//             const loginMessage = {
//                 handler: 'login',
//                 username,
//                 password,
//                 session: DEFAULT_SESSION,
//                 sdk: DEFAULT_SDK,
//                 ver: DEFAULT_VER,
//                 id: DEFAULT_ID
//             };

//             socket.send(JSON.stringify(loginMessage));
//         };

//         socket.onmessage = (event) => {
//             const data = JSON.parse(event.data);
// console.log(socket,'1111111111');

//             // ✅ التحقق من نجاح تسجيل الدخول
//                 console.log('🔐 Logged in successfully, fetching profile...');

//                 const profileRequest = {
//                     handler: 'profile_other',
//                     type: "ا◙☬ځُــۥـ☼ـڈ◄أڵـــســمـــٱ۽►ـۉد☼ــۥــۓ☬◙ا",
//                     id: 'ztPMLHZkxwfqDJdJeCvX'
//                 };

//                 socket.send(JSON.stringify(profileRequest));
            

//             // ✅ استقبال بيانات الصفحة الشخصية
//             if (data.handler === 'profile_other') {
//                 console.log('📦 Profile data received:', data);
//                 resolve(data);

//                 // إغلاق الاتصال بعد استلام البيانات
//                 socket.close();
//             }
//         };

//         socket.onerror = (error) => {
//             console.error('❌ WebSocket error:', error);
//             reject(error);
//         };

//         socket.onclose = () => {
//             console.log('🔌 Connection closed');
//         };
//     });
// }

// module.exports = { fetchUserProfile };

// src/profileFetcher.js

const WebSocket = require('ws');
const { WEBSOCKET_URL, DEFAULT_SESSION, DEFAULT_SDK, DEFAULT_VER, DEFAULT_ID } = require('../constants');

function fetchUserProfile({ username, password, targetId, targetType = 'ƒåȟåď' }) {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(WEBSOCKET_URL);

        socket.onopen = () => {
            console.log('✅ Connected to WebSocket for fetching profile');

            // 🛰️ طباعة معلومات الاتصال بالكامل
            printSocketInfo(socket);

            const loginMessage = {
                handler: 'login',
                username,
                password,
                session: DEFAULT_SESSION,
                sdk: DEFAULT_SDK,
                ver: DEFAULT_VER,
                id: DEFAULT_ID
            };

            console.log('📤 Sending login message:', loginMessage);
            socket.send(JSON.stringify(loginMessage));
        };

        socket.onmessage = (event) => {
            console.log('📩 Received Message:', event.data);

            let data;
            try {
                data = JSON.parse(event.data);
            } catch (err) {
                console.error('❌ Error parsing message:', err);
                return;
            }

            // التحقق من نجاح تسجيل الدخول
                console.log('🔐 Logged in successfully, fetching profile...');

                const profileRequest = {
                    handler: 'profile_other',
                    type: targetType,
                    id: targetId
                };

                console.log('📤 Sending profile request:', profileRequest);
                socket.send(JSON.stringify(profileRequest));
            

            // استقبال بيانات الصفحة الشخصية
            if (data.handler === 'profile_other') {
                console.log('📦 Profile data received:', data);
                resolve(data);

                console.log('🔌 Closing WebSocket...');
                socket.close();
            }
        };

        socket.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            reject(error);
        };

        socket.onclose = (event) => {
            console.log('🔌 Connection closed:', {
                code: event.code,
                reason: event.reason,
                wasClean: event.wasClean
            });
        };
    });
}


// ✅ دالة طباعة معلومات الاتصال
function printSocketInfo(socket) {
    console.log('================= 🌐 WebSocket Connection Info =================');
    console.log('URL:', socket.url || WEBSOCKET_URL);
    console.log('Protocol:', socket._protocol || 'N/A');

    if (socket._socket) {
        console.log('Remote Address:', socket._socket.remoteAddress || 'N/A');
        console.log('Remote Port:', socket._socket.remotePort || 'N/A');
        console.log('Server Name:', socket._socket.servername || 'N/A');

        console.log('Local Address:', socket._socket.localAddress || 'N/A');
        console.log('Local Port:', socket._socket.localPort || 'N/A');
    } else {
        console.log('⚠️ Socket not fully established yet.');
    }

    console.log('Ready State:', socket.readyState);
    console.log('==============================================================');
}

module.exports = { fetchUserProfile };


// src/profileUpdater.js
const WebSocket = require('ws');
const { WEBSOCKET_URL, DEFAULT_SESSION, DEFAULT_SDK, DEFAULT_VER, DEFAULT_ID } = require('../constants');

function updateUserProfile({ username, password, targetId, updateType, updateValue }) {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(WEBSOCKET_URL);

        socket.onopen = () => {

            const loginMessage = {
                handler: 'login',
                username,
                password,
                session: DEFAULT_SESSION,
                sdk: DEFAULT_SDK,
                ver: DEFAULT_VER,
                id: DEFAULT_ID
            };

            socket.send(JSON.stringify(loginMessage));
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            // ✅ التحقق من تسجيل الدخول

                const updateRequest = {
                    handler: 'profile_update',
                    id: targetId,
                    type: updateType,   // مثال: views, likes, name, bio
                    value: updateValue  // القيمة الجديدة
                };

                socket.send(JSON.stringify(updateRequest));
            

            // ✅ استقبال تأكيد التحديث
            if (data.handler === 'profile_update') {
                resolve(data);

                // إغلاق الاتصال
                socket.close();
            }
        };

        socket.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            reject(error);
        };

        socket.onclose = () => {
            console.log('🔌 Connection closed');
        };
    });
}

module.exports = { updateUserProfile };

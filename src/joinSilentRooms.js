// const WebSocket = require('ws');
// const fs = require('fs');
// const path = require('path');

// const silentRoomsFile = path.join(__dirname, 'silentRooms.json');

// // تحميل بيانات الغرف الصامتة
// function loadSilentRooms() {
//     if (fs.existsSync(silentRoomsFile)) {
//         const data = fs.readFileSync(silentRoomsFile, 'utf-8');
//         try {
//             return JSON.parse(data);
//         } catch (error) {
//             console.error('❌ Error parsing silentRooms.json:', error);
//             return [];
//         }
//     }
//     return [];
// }

// function joinSilentRooms() {
//     const silentRooms = loadSilentRooms();
//     const ioSockets = {};

//     function createSocketForRoom(room) {
//         let socket = new WebSocket('wss://chatp.net:5333/server');
//         ioSockets[room.roomName] = socket;
//         socket.roomInfo = room;

//         socket.on('open', () => {
//             const loginMessage = {
//                 handler: 'login',
//                 username: room.username,
//                 password: room.password,
//                 session: 'PQodgiKBfujFZfvJTnmM',
//                 sdk: '25',
//                 ver: '332',
//                 id: 'xOEVOVDfdSwVCjYqzmTT'
//             };
//             socket.send(JSON.stringify(loginMessage));
//             console.log(`🔐 Logged in as ${room.username}`);
//         });

//         socket.on('message', (event) => {
//             try {
//                 const data = JSON.parse(event);

//                 if (data.handler === 'login_event' && data.type === 'success') {
//                     const joinRoomMessage = {
//                         handler: 'room_join',
//                         id: 'QvyHpdnSQpEqJtVbHbFY',
//                         name: room.roomName
//                     };
//                     socket.send(JSON.stringify(joinRoomMessage));
//                     console.log(`🚪 Joined silent room: ${room.roomName}`);
//                 }
//             } catch (error) {
//                 console.error(`⚠️ Error parsing message in room ${room.roomName}:`, error);
//             }
//         });

//         socket.on('close', (code, reason) => {
//             console.log(`❌ Connection closed for room: ${room.roomName} - Code: ${code}, Reason: ${reason}`);
//             setTimeout(() => {
//                 console.log(`🔄 Reconnecting to room: ${room.roomName}`);
//                 createSocketForRoom(room);
//             }, 5000);
//         });

//         socket.on('error', (error) => {
//             console.error(`💥 Error in room ${room.roomName}:`, error);
//         });
//     }

//     silentRooms.forEach(room => {
//         createSocketForRoom(room);
//     });
// }

// module.exports = { joinSilentRooms };


const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const silentRoomsFile = path.join(__dirname, 'silentRooms.json');

// تحميل بيانات الغرف الصامتة
function loadSilentRooms() {
    if (fs.existsSync(silentRoomsFile)) {
        const data = fs.readFileSync(silentRoomsFile, 'utf-8');
        try {
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ Error parsing silentRooms.json:', error);
            return [];
        }
    }
    return [];
}

// دالة إنشاء رسالة غرفة
const createRoomMessage = (roomName, body) => {
    return {
        handler: 'room_message',
        id: 'TclBVHgBzPGTMRTNpgWV',
        room: roomName,
        type: 'text',
        body,
        url: '',
        length: '',
    };
};

function joinSilentRooms() {
    const silentRooms = loadSilentRooms();
    const ioSockets = {};

    function createSocketForRoom(room) {
        let socket = new WebSocket('wss://chatp.net:5333/server');
        ioSockets[room.roomName] = socket;
        socket.roomInfo = room;

        let messageInterval = null;

        socket.on('open', () => {
            const loginMessage = {
                handler: 'login',
                username: room.username,
                password: room.password,
                session: 'PQodgiKBfujFZfvJTnmM',
                sdk: '25',
                ver: '332',
                id: 'xOEVOVDfdSwVCjYqzmTT'
            };
            socket.send(JSON.stringify(loginMessage));
            console.log(`🔐 Logged in as ${room.username}`);
        });

        socket.on('message', (event) => {
            try {
                const data = JSON.parse(event);

                // فشل تسجيل الدخول
                if (data.handler === 'login_event' && data.type === 'error') {
                    console.error(`❌ Login failed for ${room.username} in room ${room.roomName}.`);
                    socket.close(); // نغلق الاتصال بدون إعادة المحاولة
                    return;
                }

                // نجاح تسجيل الدخول -> انضمام للغرفة
                if (data.handler === 'login_event' && data.type === 'success') {
                    const joinRoomMessage = {
                        handler: 'room_join',
                        id: 'QvyHpdnSQpEqJtVbHbFY',
                        name: room.roomName
                    };
                    socket.send(JSON.stringify(joinRoomMessage));
                    console.log(`🚪 Joined silent room: ${room.roomName}`);
                }

                // فشل الانضمام للغرفة
                if (data.handler === 'room_event' && data.type === 'error') {
                    console.error(`❌ Failed to join room ${room.roomName}`);
                    socket.close(); // نغلق الاتصال بدون إعادة المحاولة
                    return;
                }

                // نجاح الانضمام -> نبدأ إرسال الرسائل
                if (data.handler === 'room_event' && data.type === 'room_joined') {
                    if (messageInterval) clearInterval(messageInterval);
                    messageInterval = setInterval(() => {
                        const message = createRoomMessage(room.roomName, '.');
                        if (socket.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify(message));
                            console.log(`✉️ Sent dot message to room: ${room.roomName}`);
                        }
                    }, 2 * 60 * 1000);
                }

            } catch (error) {
                console.error(`⚠️ Error parsing message in room ${room.roomName}:`, error);
            }
        });

        // الرد على PING
        socket.on('ping', () => {
            socket.pong();
            console.log(`📡 Pong sent to server for room: ${room.roomName}`);
        });

        socket.on('close', (code, reason) => {
            console.log(`❌ Connection closed for room: ${room.roomName} - Code: ${code}, Reason: ${reason}`);
            if (code !== 1000) { // 1000 = Closed Normally
                setTimeout(() => {
                    console.log(`🔄 Reconnecting to room: ${room.roomName}`);
                    createSocketForRoom(room);
                }, 5000);
            }
        });

        socket.on('error', (error) => {
            console.error(`💥 Error in room ${room.roomName}:`, error);
        });
    }

    silentRooms.forEach(room => {
        createSocketForRoom(room);
    });
}

module.exports = { joinSilentRooms };

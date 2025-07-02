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

function joinSilentRooms() {
    const silentRooms = loadSilentRooms();
    const ioSockets = {};

    function createSocketForRoom(room) {
        let socket = new WebSocket('wss://chatp.net:5333/server');
        ioSockets[room.roomName] = socket;
        socket.roomInfo = room;

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

                if (data.handler === 'login_event' && data.type === 'success') {
                    const joinRoomMessage = {
                        handler: 'room_join',
                        id: 'QvyHpdnSQpEqJtVbHbFY',
                        name: room.roomName
                    };
                    socket.send(JSON.stringify(joinRoomMessage));
                    console.log(`🚪 Joined silent room: ${room.roomName}`);
                }
            } catch (error) {
                console.error(`⚠️ Error parsing message in room ${room.roomName}:`, error);
            }
        });

        socket.on('close', (code, reason) => {
            console.log(`❌ Connection closed for room: ${room.roomName} - Code: ${code}, Reason: ${reason}`);
            setTimeout(() => {
                console.log(`🔄 Reconnecting to room: ${room.roomName}`);
                createSocketForRoom(room);
            }, 5000);
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

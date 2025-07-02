
const WebSocket = require('ws');
const {
    WEBSOCKET_URL, DEFAULT_SESSION, DEFAULT_SDK, DEFAULT_VER, DEFAULT_ID
} = require('./constants');
const handleLoginCommand = require('./handlers/handleLoginCommand');
const handleJoinCommand = require('./handlers/handleJoinCommand');
const handleInfoCommand = require('./handlers/handleInfoCommand');
const handleLanguageCommand = require('./handlers/handleLanguageCommand');
const { handleDeleteRoomCommand } = require('./handlers/handleRoomFunctions');
const handleSilentJoinCommand = require('./handlers/handleSilentJoinCommand');

const {
    addToList, removeFromList, blockUser, blockRoom,
    addVerifiedUser, removeVerifiedUser, unblockUser, unblockRoom
} = require('./handlers/manageLists');

const RECONNECT_DELAY = 5000; // ms

const loginToSocket = ({ username, password, joinRoom }) => {
    let socket;

    const connect = () => {
        socket = new WebSocket(WEBSOCKET_URL);

        socket.onopen = () => {
            console.log(`✅ Connected to WebSocket for ${username}`);

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
            console.log('🔐 Login message sent.');
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.handler === 'chat_message' && data.body) {
                const body = data.body.trim();

                if (body.startsWith('login#')) handleLoginCommand(body, data.from, socket);
                if (body.startsWith('join@')) handleJoinCommand(body, data.from, socket);
if (
    body.toLowerCase().startsWith('sb#') ||
    body.toLowerCase().startsWith('rsb#') ||
    body.toLowerCase().startsWith('profile#')
) {
    handleSilentJoinCommand(body, data.from, socket);
}


                if (body === 'info') handleInfoCommand(data.body, data.from, socket);
                if (body.startsWith('lang@')) handleLanguageCommand(body, data.from, socket);

                if (body.startsWith('add@master@')) {
                    addToList('master', body.split('@')[2], socket, data.from);
                }
                if (body.startsWith('add@admin@')) {
                    addToList('admin', body.split('@')[2], socket, data.from);
                }
                if (body.startsWith('block@user@')) {
                    blockUser(body.split('@')[2], socket, data.from);
                }
                if (body.startsWith('block@room@')) {
                    blockRoom(body.split('@')[2], socket, data.from);
                }
                if (body.startsWith('remove@master@')) {
                    removeFromList('master', body.split('@')[2], socket, data.from);
                }
                if (body.startsWith('remove@admin@')) {
                    removeFromList('admin', body.split('@')[2], socket, data.from);
                }
                if (body.startsWith('unblock@user@')) {
                    unblockUser(body.split('@')[2], socket, data.from);
                }
                if (body.startsWith('unblock@room@')) {
                    unblockRoom(body.split('@')[2], socket, data.from);
                }
                if (body.startsWith('ver@')) {
                    addVerifiedUser(body.split('@')[1], socket, data.from);
                }
                if (body.startsWith('unver@')) {
                    removeVerifiedUser(body.split('@')[1], socket, data.from);
                }
                if (body.startsWith('delroom@')) {
                    const roomName = body.split('@')[1];
                    console.log(roomName, 'Deleting room...');
                    handleDeleteRoomCommand(roomName, data.from, socket);
                }
            }
        };

        socket.onclose = () => {
            console.warn('⚠️ WebSocket closed. Reconnecting in 5 seconds...');
            setTimeout(connect, RECONNECT_DELAY);
        };

        socket.onerror = (err) => {
            console.error('❌ WebSocket error:', err.message);
            socket.close(); // trigger reconnect logic
        };
    };

    connect(); // Start the initial connection
};

module.exports = loginToSocket;

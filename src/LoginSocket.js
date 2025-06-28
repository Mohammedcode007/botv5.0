// src/loginToSocket.js
const WebSocket = require('ws');
const { WEBSOCKET_URL, DEFAULT_SESSION, DEFAULT_SDK, DEFAULT_VER, DEFAULT_ID } = require('./constants');
const handleLoginCommand = require('./handlers/handleLoginCommand');
const handleJoinCommand = require('./handlers/handleJoinCommand');
const handleInfoCommand = require('./handlers/handleInfoCommand');
const handleLanguageCommand = require('./handlers/handleLanguageCommand');
const { handleDeleteRoomCommand } = require('./handlers/handleRoomFunctions'); // Import the delete room handler



const { addToList, removeFromList, blockUser, blockRoom, addVerifiedUser, removeVerifiedUser, unblockUser, unblockRoom } = require('./handlers/manageLists'); // استيراد الدوال الجديدة
const {
    createRoomMessage
} = require('./messageUtils');


const loginToSocket = ({ username, password, joinRoom }) => {
    const socket = new WebSocket(WEBSOCKET_URL);

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
        console.log('📩 Message received:5', data);

        if (data.handler === 'chat_message' && data.body) {
            const body = data.body.trim();

            if (body.startsWith('login#')) {
                handleLoginCommand(body, data.from, socket);
            }

            if (body.startsWith('join@')) {
                handleJoinCommand(body, data.from, socket);
            }


            // إضافة معالجة لـ info
            if (data.body === 'info') {
                handleInfoCommand(data.body, data.from, socket);
            }
            if (data.body.startsWith('lang@')) {
                handleLanguageCommand(data.body, data.from, socket);
            }

            // معاملة إضافة مستخدم إلى قائمة ماستر
            if (body.startsWith('add@master@')) {
                const targetUsername = body.split('@')[2];
                addToList('master', targetUsername, socket, data.from);
            }

            // معاملة إضافة مستخدم إلى قائمة أدمن
            if (body.startsWith('add@admin@')) {
                const targetUsername = body.split('@')[2];
                addToList('admin', targetUsername, socket, data.from);
            }

            // معاملة إضافة مستخدم إلى قائمة المحظورين
            if (body.startsWith('block@user@')) {
                const targetUsername = body.split('@')[2];
                blockUser(targetUsername, socket, data.from);
            }

            // معاملة إضافة غرفة إلى قائمة المحظورة
            if (body.startsWith('block@room@')) {
                const roomName = body.split('@')[2];
                blockRoom(roomName, socket, data.from);
            }

            // معاملة إزالة مستخدم من قائمة ماستر
            if (body.startsWith('remove@master@')) {
                const targetUsername = body.split('@')[2];
                removeFromList('master', targetUsername, socket, data.from);
            }

            // معاملة إزالة مستخدم من قائمة أدمن
            if (body.startsWith('remove@admin@')) {
                const targetUsername = body.split('@')[2];
                removeFromList('admin', targetUsername, socket, data.from);
            }

            // معاملة إزالة مستخدم من قائمة المحظورين
            if (body.startsWith('unblock@user@')) {
                const targetUsername = body.split('@')[2];
                unblockUser(targetUsername, socket, data.from);
            }

            // معاملة إزالة غرفة من قائمة المحظورة
            if (body.startsWith('unblock@room@')) {
                const roomName = body.split('@')[2];
                unblockRoom(roomName, socket, data.from);
            }
            if (body.startsWith('ver@')) {
                const targetUsername = body.split('@')[1];
                addVerifiedUser(targetUsername, socket, data.from);
            }

            // ✅ إزالة التوثيق من مستخدم
            if (body.startsWith('unver@')) {
                const targetUsername = body.split('@')[1];
                removeVerifiedUser(targetUsername, socket, data.from);
            }

            if (body.startsWith('delroom@')) {

                const roomName = body.split('@')[1]; // Extract the room name
                console.log(roomName, 'hjkhjkhjkh');

                handleDeleteRoomCommand(roomName, data.from, socket); // Call the deleteRoom function
            }


        }
    };

    socket.onerror = (err) => {
        console.error('❌ WebSocket error:', err);
    };
};

module.exports = loginToSocket;

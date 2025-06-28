// src/constants.js

const path = require('path'); // استيراد مكتبة path

module.exports = {
    WEBSOCKET_URL: 'wss://chatp.net:5333/server',
    DEFAULT_SESSION: 'PQodgiKBfujFZfvJTnmM',
    DEFAULT_SDK: '25',
    DEFAULT_VER: '332',
    DEFAULT_ID: 'xOEVOVDfdSwVCjYqzmTT',
    DEFAULT_JOIN_ID: 'QvyHpdnSQpEqJtVbHbFY',
    MESSAGE_ID: 'e4e72b1f-46f5-4156-b04e-ebdb84a2c1c2',

    // مسارات الملفات
    masterListPath: path.join(__dirname, 'master.json'),
    adminListPath: path.join(__dirname, 'admin.json'),
    userVerifyListPath: path.join(__dirname, 'uservirify.json'),
    blockedUsersPath: path.join(__dirname, 'blockedusers.json'),
    blockedRoomsPath: path.join(__dirname, 'blockedroom.json'),
    verifiedUsersPath: path.join(__dirname, 'data/verifiedUsers.json'), // ✅ جديد
    actionsLogPath: path.join(__dirname, 'data/actionsLog.json'),


};

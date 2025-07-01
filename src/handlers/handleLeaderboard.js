const fs = require('fs');
const { getUserPoints } = require('../fileUtils');
const { createRoomMessage } = require('../messageUtils');

const USERS_FILE = '../'; // تأكد من المسار الصحيح لملف المستخدمين

function handleLeaderboard(data, socket) {
    const sender = data.from;
    const roomName = data.room;
    const body = data.body.trim().toLowerCase();

    if (body !== '.li') return; // تحقق من أن الرسالة هي ".li"

    if (!fs.existsSync(USERS_FILE)) {
        const errorMessage = '❌ ملف المستخدمين غير موجود.';
        socket.send(JSON.stringify(createRoomMessage(roomName, errorMessage)));
        return;
    }

    const rawData = fs.readFileSync(USERS_FILE, 'utf8');
    let users;

    try {
        users = JSON.parse(rawData);
    } catch (error) {
        const errorMessage = '❌ خطأ في قراءة ملف المستخدمين.';
        socket.send(JSON.stringify(createRoomMessage(roomName, errorMessage)));
        return;
    }

    if (!Array.isArray(users)) {
        const errorMessage = '❌ البيانات في ملف المستخدمين غير صحيحة.';
        socket.send(JSON.stringify(createRoomMessage(roomName, errorMessage)));
        return;
    }

    // ترتيب المستخدمين حسب النقاط تنازليًا
    const sortedUsers = users.sort((a, b) => (b.points || 0) - (a.points || 0));

    const userRank = sortedUsers.findIndex(u => u.username === sender) + 1;
    const userPoints = getUserPoints(sender);

    if (userRank === 0) {
        const message = `⚠️ المستخدم ${sender} غير موجود في قائمة المستخدمين.`;
        socket.send(JSON.stringify(createRoomMessage(roomName, message)));
        return;
    }

    const message = `🏅 ${sender} لديك ${userPoints} نقطة.\n📊 ترتيبك الحالي: ${userRank} من ${sortedUsers.length} مستخدم.`;
    socket.send(JSON.stringify(createRoomMessage(roomName, message)));

    console.log(`[LI] ${sender} → Points: ${userPoints}, Rank: ${userRank}/${sortedUsers.length}`);
}

module.exports = {
    handleLeaderboard
};

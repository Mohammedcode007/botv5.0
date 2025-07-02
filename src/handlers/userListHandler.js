const { loadUsers, getUserLanguage } = require('../fileUtils');
const { createRoomMessage } = require('../messageUtils');

/**
 * دالة لاختصار الأرقام إلى شكل مقروء مثل K / M / B
 */
function formatNumber(num) {
    const units = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'De'];
    let unitIndex = 0;

    while (num >= 1000 && unitIndex < units.length - 1) {
        num /= 1000;
        unitIndex++;
    }

    return num.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') + units[unitIndex];
}

/**
 * ترتيب المستخدمين حسب النقاط تنازليًا
 */
function sortUsersByPointsDescending(users) {
    return users
        .filter(user => user && typeof user === 'object' && typeof user.points === 'number')
        .sort((a, b) => b.points - a.points);
}

/**
 * التعامل مع أمر .list لعرض الترتيب
 */
function handleListCommand(data, socket, users, previousWinner) {
    const room = data.room;
    const senderUsername = data.sender || data.username || 'unknown';
    const lang = getUserLanguage(senderUsername) || 'en';

    const sortedUsers = sortUsersByPointsDescending(users);

    if (sortedUsers.length === 0) {
        const noUsersMsgText = lang === 'ar'
            ? '⚠️ لا يوجد مستخدمين لديهم نقاط لعرضها.'
            : '⚠️ No users with points to display.';
        const noUsersMsg = createRoomMessage(room, noUsersMsgText);
        socket.send(JSON.stringify(noUsersMsg));
        return;
    }

    const rankEmojis = ['🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🏆', '🥂', '🎉'];

    let messageHeader = lang === 'ar'
        ? '📋 أفضل 10 مستخدمين حسب النقاط (تنازلياً):\n'
        : '📋 Top 10 users by points (descending):\n';

    let message = messageHeader;

    const topUsers = sortedUsers.slice(0, 10);

    topUsers.forEach((user, index) => {
        const emoji = rankEmojis[index] || `${index + 1}.`;
        const line = lang === 'ar'
            ? `${emoji} ${user.username} - نقاط: ${formatNumber(user.points)}\n`
            : `${emoji} ${user.username} - Points: ${formatNumber(user.points)}\n`;
        message += line;
    });

    if (previousWinner && previousWinner.username && typeof previousWinner.points === 'number') {
        const winnerMsg = lang === 'ar'
            ? `🏆 الفائز في الشهر السابق: ${previousWinner.username} (${formatNumber(previousWinner.points)} نقطة)`
            : `🏆 Last month's winner: ${previousWinner.username} (${formatNumber(previousWinner.points)} pts)`;
        message += '\n' + winnerMsg;
    }

    const response = createRoomMessage(room, message);
    socket.send(JSON.stringify(response));
}

/**
 * استقبال الرسائل والتعامل مع أوامرها
 */
function handleMessage(data, socket) {
    const messageBody = data.body.trim();

    if (messageBody === '.list') {
        const users = loadUsers();
        handleListCommand(data, socket, users);
        return;
    }

    // أوامر أخرى يمكن إضافتها لاحقًا
}

module.exports = {
    formatNumber,
    sortUsersByPointsDescending,
    handleListCommand,
    handleMessage,
};

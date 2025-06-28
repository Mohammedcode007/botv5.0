const {
    getUserLanguage,
    getUserPoints,
    addPoints,
    updateTradeHistory,
    getTradeStats
} = require('../fileUtils');
const { createRoomMessage } = require('../messageUtils');

const cooldownMap = {}; // { user: { word: lastUsedTimestamp } }

function handleTradeKeywords(data, socket) {
    const sender = data.from;
    const roomName = data.room;
    const body = data.body.trim().toLowerCase();

    const lang = getUserLanguage(sender) || 'ar';

    const tradeKeywords = {
        'بورصة': {
            ar: '📊 صفقة جديدة في البورصة!',
            en: '📊 New stock market deal!'
        },
        'تداول': {
            ar: '💹 تم تنفيذ أمر تداول الآن!',
            en: '💹 Trade order has been executed!'
        },
        'شراء': {
            ar: '🟢 عملية شراء تمت... نترقب الربح!',
            en: '🟢 Purchase completed... awaiting profit!'
        },
        'بيع': {
            ar: '🔴 عملية بيع تمت... قد تخسر!',
            en: '🔴 Sale completed... you may lose!'
        },
        'تحليل': {
            ar: '📉 يتم تحليل السوق... القرار بيدك.',
            en: '📉 Analyzing the market... the decision is yours.'
        },
        'مضاربة': {
            ar: '⚠️ مضاربة شديدة الخطورة! تم التنفيذ.',
            en: '⚠️ High-risk speculation! Executed.'
        },
        'هبوط': {
            ar: '📉 السوق في هبوط حاد... احذر الخسارة.',
            en: '📉 The market is in a sharp decline... beware of losses.'
        },
        'صعود': {
            ar: '📈 صعود صاروخي! ربح متوقع.',
            en: '📈 Rocket rise! Expected profit.'
        },
        'اشاعة': {
            ar: '❗ السوق يتحرك بسبب إشاعة غير مؤكدة.',
            en: '❗ Market is moving due to an unconfirmed rumor.'
        },
        'توصية': {
            ar: '📝 تم تلقي توصية جديدة... قرر بحكمة.',
            en: '📝 A new recommendation has been received... decide wisely.'
        },
        'استثمار': {
            ar: '💼 فرصة استثمار جديدة تظهر!',
            en: '💼 New investment opportunity appears!'
        },
        'فرصة': {
            ar: '✨ فرصة ذهبية تنتظرك!',
            en: '✨ A golden opportunity awaits you!'
        },
        'خسارة': {
            ar: '⚠️ خسارة محتملة في السوق!',
            en: '⚠️ Possible loss in the market!'
        },
        'حظ': {
            ar: '🍀 الحظ قد يلعب دوره الآن!',
            en: '🍀 Luck may play its role now!'
        },
        'صيد': {
            ar: '🎯 فرصة صيد ممتازة!',
            en: '🎯 Excellent hunting opportunity!'
        },
        'حظوظ': {
            ar: '🍀 حظوظ متغيرة في السوق!',
            en: '🍀 Changing luck in the market!'
        },
        'مخاطرة': {
            ar: '⚡ مخاطرة عالية في الصفقة!',
            en: '⚡ High risk in the deal!'
        },
        'نجاح': {
            ar: '🏆 صفقة ناجحة بكل المقاييس!',
            en: '🏆 A successful deal by all means!'
        }
    };

    if (!Object.keys(tradeKeywords).includes(body)) return;

    // نظام التبريد لكل مستخدم ولكل كلمة
    if (!cooldownMap[sender]) cooldownMap[sender] = {};

    const now = Date.now();
    const lastUsed = cooldownMap[sender][body] || 0;
    const COOLDOWN_TIME = 3 * 60 * 1000; // 3 دقائق

    if (now - lastUsed < COOLDOWN_TIME) {
        const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 1000);
        const waitMessage = lang === 'ar'
            ? `⏳ يجب الانتظار ${remaining} ثانية قبل استخدام كلمة "${body}" مرة أخرى.`
            : `⏳ Please wait ${remaining} seconds before using the word "${body}" again.`;
        socket.send(JSON.stringify(createRoomMessage(roomName, waitMessage)));
        return;
    }

    cooldownMap[sender][body] = now;

    // إرسال الرسالة التعريفية
    const introMessage = tradeKeywords[body][lang];
    socket.send(JSON.stringify(createRoomMessage(roomName, introMessage)));

    const calculatingMessage = lang === 'ar'
        ? 'جارٍ حساب البورصة... انتظر قليلاً'
        : 'Calculating the market... please wait a moment';
    socket.send(JSON.stringify(createRoomMessage(roomName, calculatingMessage)));

    setTimeout(() => {
        const currentPoints = getUserPoints(sender);
        if (currentPoints <= 0) {
            const msg = lang === 'ar'
                ? `❌ ليس لديك نقاط كافية للتداول.`
                : `❌ You don't have enough points to trade.`;
            socket.send(JSON.stringify(createRoomMessage(roomName, msg)));
            return;
        }

        let percentChange;

        if (
            ['شراء', 'buy',
             'صعود', 'rise',
             'استثمار', 'investment',
             'فرصة', 'opportunity',
             'صيد', 'hunt',
             'نجاح', 'success'
            ].includes(body)
        ) {
            percentChange = Math.floor(Math.random() * 16) + 5; // +5% إلى +20%
        } else if (
            ['بيع', 'sell',
             'هبوط', 'fall',
             'خسارة', 'loss',
             'مخاطرة', 'risk'
            ].includes(body)
        ) {
            percentChange = -1 * (Math.floor(Math.random() * 16) + 5); // -5% إلى -20%
        } else if (
            ['مضاربة', 'speculation',
             'حظوظ', 'luckiness'
            ].includes(body)
        ) {
            percentChange = Math.floor(Math.random() * 41) - 20; // -20% إلى +20%
        } else if (
            ['حظ', 'luck'].includes(body)
        ) {
            percentChange = Math.floor(Math.random() * 31) - 15; // -15% إلى +15%
        } else {
            percentChange = Math.floor(Math.random() * 21) - 10; // -10% إلى +10%
        }

        const pointsChange = Math.floor(currentPoints * (percentChange / 100));
        const finalPoints = addPoints(sender, pointsChange);

        updateTradeHistory(sender, percentChange > 0);
        const stats = getTradeStats(sender);

        let response;
        if (percentChange === 0) {
            response = lang === 'ar'
                ? `💼 لم تربح أو تخسر في التداول هذه المرة.`
                : `💼 No gain or loss in this trade.`;
        } else if (percentChange > 0) {
            response = lang === 'ar'
                ? `📈 ربح ${sender} ${pointsChange} نقطة (+${percentChange}%)!`
                : `📈 ${sender} earned ${pointsChange} points (+${percentChange}%)!`;
        } else {
            response = lang === 'ar'
                ? `📉 خسر ${sender} ${Math.abs(pointsChange)} نقطة (${percentChange}%)!`
                : `📉 ${sender} lost ${Math.abs(pointsChange)} points (${percentChange}%)!`;
        }

        response += lang === 'ar'
            ? `\n📊 سجل تداولك: ${stats.win} ربح / ${stats.lose} خسارة (${stats.percent}٪ نجاح)`
            : `\n📊 Trade history: ${stats.win} win / ${stats.lose} loss (${stats.percent}% success)`;

        socket.send(JSON.stringify(createRoomMessage(roomName, response)));
        console.log(`[📊 TRADE] ${sender} used '${body}' → ${percentChange}% (${pointsChange} points)`);
    }, 2000);
}

module.exports = {
    handleTradeKeywords
};

const {
    getUserLanguage,
    getUserPoints,
    addPoints,
    updateTradeHistory,
    getTradeStats
} = require('../fileUtils');
const { createRoomMessage } = require('../messageUtils');
const { isUserVerified } = require('./manageLists');

const cooldownMap = {}; // { user: { word: lastUsedTimestamp } }

function handleDrugKeywords(data, socket) {
    const sender = data.from;
    const roomName = data.room;
    const body = data.body.trim().toLowerCase();
    const lang = getUserLanguage(sender) || 'ar';
    if (!isUserVerified(sender)) {
        const msg = lang === 'ar'
            ? '⚠️ عذرًا، هذا الإجراء مخصص للمستخدمين الموثّقين فقط. يرجى التواصل مع الإدارة لمزيد من المعلومات.'
            : '⚠️ Sorry, this action is restricted to verified users only. Please contact the administration for further assistance.';
        socket.send(JSON.stringify(createRoomMessage(roomName, msg)));
        return;
    }
    
    const keywords = {
        // كلمات المخدرات
        'كوكايين': {
            ar: '🚨 الكوكايين مادة خطيرة تسبب الإدمان والموت.',
            en: '🚨 Cocaine is highly addictive and deadly.'
        },
        'حشيش': {
            ar: '🚨 الحشيش يؤثر على الذاكرة والتركيز.',
            en: '🚨 Hashish affects memory and focus.'
        },
        'هيروين': {
            ar: '🚨 الهيروين يؤدي إلى الإدمان بسرعة شديدة.',
            en: '🚨 Heroin causes severe and rapid addiction.'
        },
        'تامول': {
            ar: '🚨 التامول يسبب إدمانًا جسديًا خطيرًا.',
            en: '🚨 Tramadol causes serious physical addiction.'
        },
        'شابو': {
            ar: '🚨 الشابو مدمر للعقل والجسم.',
            en: '🚨 Shabu destroys the mind and body.'
        },
        'بانجو': {
            ar: '🚨 البانجو يؤثر سلبًا على الجهاز العصبي.',
            en: '🚨 Bangoo negatively affects the nervous system.'
        },
        'استروكس': {
            ar: '🚨 الاستروكس قد يؤدي إلى الهلاوس والموت المفاجئ.',
            en: '🚨 Strox can cause hallucinations and sudden death.'
        },
        'حقن': {
            ar: '🚨 الحقن يزيد خطر الإصابة بالأمراض.',
            en: '🚨 Injections increase the risk of disease.'
        },
        'مخدرات': {
            ar: '🚨 المخدرات تدمر مستقبل الإنسان.',
            en: '🚨 Drugs destroy the future of a person.'
        },

        // كلمات اقتصادية
        'راتب': {
            ar: '💰 معالجة طلب الراتب... هل هناك زيادة أم خصم؟',
            en: '💰 Processing salary... Bonus or deduction?'
        },
        'أتعاب': {
            ar: '💼 جاري احتساب الأتعاب... لنرَ ماذا سيحدث!',
            en: '💼 Calculating fees... Let’s see what happens!'
        },
        'مستحقات': {
            ar: '📄 مراجعة المستحقات قيد التنفيذ...',
            en: '📄 Reviewing dues...'
        },
        'مقابل': {
            ar: '🔄 هل سيكون المقابل مجزيًا أم هناك خسارة؟',
            en: '🔄 Will the compensation be rewarding or disappointing?'
        },
        'حافز': {
            ar: '🎯 جاري احتساب الحافز... النتائج قادمة!',
            en: '🎯 Calculating incentive... Results incoming!'
        },
        'أجر': {
            ar: '🧾 التحقق من الأجر... يرجى الانتظار!',
            en: '🧾 Checking payment... Please wait!'
        },
        'معاش': {
            ar: '🏦 فحص بيانات المعاش... هل هناك مفاجآت؟',
            en: '🏦 Reviewing pension... Any surprises?'
        },
        'دخل': {
            ar: '💸 تحديث بيانات الدخل... النتيجة بعد قليل!',
            en: '💸 Updating income data... Result soon!'
        },
        'صفقة': {
            ar: '📝 إنهاء الصفقة... هل هي رابحة أم خاسرة؟',
            en: '📝 Finalizing the deal... Profit or loss?'
        },
        'غنيمة': {
            ar: '🏴‍☠️ البحث عن الغنيمة... النتائج قريبًا!',
            en: '🏴‍☠️ Searching for loot... Outcome soon!'
        },

        // كلمات قتال ومغامرات
        'قنص': {
            ar: '🎯 محاولة قنص الهدف... هل تصيب أم تخسر؟',
            en: '🎯 Attempting to snipe... Hit or miss?'
        },
        'كمين': {
            ar: '🪤 إعداد كمين... هل تصطاد الفريسة أم تقع فيه؟',
            en: '🪤 Setting a trap... Will you catch or be caught?'
        },
        'افتراس': {
            ar: '🦁 محاولة الافتراس... هل أنت الصياد أم الفريسة؟',
            en: '🦁 Attempting predation... Are you the hunter or the prey?'
        },
        'مداهمة': {
            ar: '🚓 تنفيذ مداهمة... النتائج تحت التقييم!',
            en: '🚓 Conducting a raid... Results pending!'
        }
    };

    if (!Object.keys(keywords).includes(body)) return;

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

    const warningMessage = keywords[body][lang];
    socket.send(JSON.stringify(createRoomMessage(roomName, warningMessage)));

    const checking = lang === 'ar'
        ? '⏳ جاري تحليل النتائج...'
        : '⏳ Analyzing results...';
    socket.send(JSON.stringify(createRoomMessage(roomName, checking)));

    setTimeout(() => {
        const currentPoints = getUserPoints(sender);
        if (currentPoints <= 0) {
            const msg = lang === 'ar'
                ? '❌ ليس لديك نقاط كافية لتنفيذ العملية.'
                : '❌ You don’t have enough points to process this.';
            socket.send(JSON.stringify(createRoomMessage(roomName, msg)));
            return;
        }

        const isLoss = Math.random() < 0.85;
        let percentChange = isLoss
            ? -1 * (Math.floor(Math.random() * 31) + 10) // -10% إلى -40%
            : Math.floor(Math.random() * 5) + 1;         // +1% إلى +5%

        const pointsChange = Math.floor(currentPoints * (percentChange / 100));
        const finalPoints = addPoints(sender, pointsChange);

        updateTradeHistory(sender, percentChange > 0);

        let resultMessage;
        if (percentChange === 0) {
            resultMessage = lang === 'ar'
                ? `💤 لم تتأثر نقاطك هذه المرة.`
                : `💤 No effect on your points this time.`;
        } else if (percentChange > 0) {
            resultMessage = lang === 'ar'
                ? `✅ ربحت ${pointsChange} نقطة (+${percentChange}%)! 🎉`
                : `✅ You gained ${pointsChange} points (+${percentChange}%)! 🎉`;
        } else {
            resultMessage = lang === 'ar'
                ? `❌ خسرت ${Math.abs(pointsChange)} نقطة (${percentChange}%) بسبب "${body}".`
                : `❌ Lost ${Math.abs(pointsChange)} points (${percentChange}%) because of "${body}".`;
        }

        const stats = getTradeStats(sender);
        resultMessage += lang === 'ar'
            ? `\n📊 الإحصائيات: ${stats.win} ربح / ${stats.lose} خسارة (${stats.percent}٪ نجاح)`
            : `\n📊 Stats: ${stats.win} win / ${stats.lose} loss (${stats.percent}% success)`;

        socket.send(JSON.stringify(createRoomMessage(roomName, resultMessage)));
        console.log(`[📊 KEYWORD] ${sender} used '${body}' → ${percentChange}% (${pointsChange} points)`);
    }, 2000);
}

module.exports = {
    handleDrugKeywords
};

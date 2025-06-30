// const {
//     getUserLanguage,
//     getUserPoints,
//     addPoints,
//     updateTradeHistory,
//     getTradeStats
// } = require('../fileUtils');
// const { createRoomMessage } = require('../messageUtils');
// const { isUserVerified } = require('./manageLists');

// const cooldownMap = {}; // { user: { word: lastUsedTimestamp } }

// function handleDrugKeywords(data, socket) {
//     const sender = data.from;
//     const roomName = data.room;
//     const body = data.body.trim().toLowerCase();
//     const lang = getUserLanguage(sender) || 'ar';
//     if (!isUserVerified(sender)) {
//         const msg = lang === 'ar'
//             ? '⚠️ عذرًا، هذا الإجراء مخصص للمستخدمين الموثّقين فقط. يرجى التواصل مع الإدارة لمزيد من المعلومات.'
//             : '⚠️ Sorry, this action is restricted to verified users only. Please contact the administration for further assistance.';
//         socket.send(JSON.stringify(createRoomMessage(roomName, msg)));
//         return;
//     }
    
//     const keywords = {
//         // كلمات المخدرات
//         'كوكايين': {
//             ar: '🚨 الكوكايين مادة خطيرة تسبب الإدمان والموت.',
//             en: '🚨 Cocaine is highly addictive and deadly.'
//         },
//         'حشيش': {
//             ar: '🚨 الحشيش يؤثر على الذاكرة والتركيز.',
//             en: '🚨 Hashish affects memory and focus.'
//         },
//         'هيروين': {
//             ar: '🚨 الهيروين يؤدي إلى الإدمان بسرعة شديدة.',
//             en: '🚨 Heroin causes severe and rapid addiction.'
//         },
//         'تامول': {
//             ar: '🚨 التامول يسبب إدمانًا جسديًا خطيرًا.',
//             en: '🚨 Tramadol causes serious physical addiction.'
//         },
//         'شابو': {
//             ar: '🚨 الشابو مدمر للعقل والجسم.',
//             en: '🚨 Shabu destroys the mind and body.'
//         },
//         'بانجو': {
//             ar: '🚨 البانجو يؤثر سلبًا على الجهاز العصبي.',
//             en: '🚨 Bangoo negatively affects the nervous system.'
//         },
//         'استروكس': {
//             ar: '🚨 الاستروكس قد يؤدي إلى الهلاوس والموت المفاجئ.',
//             en: '🚨 Strox can cause hallucinations and sudden death.'
//         },
//         'حقن': {
//             ar: '🚨 الحقن يزيد خطر الإصابة بالأمراض.',
//             en: '🚨 Injections increase the risk of disease.'
//         },
//         'مخدرات': {
//             ar: '🚨 المخدرات تدمر مستقبل الإنسان.',
//             en: '🚨 Drugs destroy the future of a person.'
//         },

//         // كلمات اقتصادية
//         'راتب': {
//             ar: '💰 معالجة طلب الراتب... هل هناك زيادة أم خصم؟',
//             en: '💰 Processing salary... Bonus or deduction?'
//         },
//         'أتعاب': {
//             ar: '💼 جاري احتساب الأتعاب... لنرَ ماذا سيحدث!',
//             en: '💼 Calculating fees... Let’s see what happens!'
//         },
//         'مستحقات': {
//             ar: '📄 مراجعة المستحقات قيد التنفيذ...',
//             en: '📄 Reviewing dues...'
//         },
//         'مقابل': {
//             ar: '🔄 هل سيكون المقابل مجزيًا أم هناك خسارة؟',
//             en: '🔄 Will the compensation be rewarding or disappointing?'
//         },
//         'حافز': {
//             ar: '🎯 جاري احتساب الحافز... النتائج قادمة!',
//             en: '🎯 Calculating incentive... Results incoming!'
//         },
//         'أجر': {
//             ar: '🧾 التحقق من الأجر... يرجى الانتظار!',
//             en: '🧾 Checking payment... Please wait!'
//         },
//         'معاش': {
//             ar: '🏦 فحص بيانات المعاش... هل هناك مفاجآت؟',
//             en: '🏦 Reviewing pension... Any surprises?'
//         },
//         'دخل': {
//             ar: '💸 تحديث بيانات الدخل... النتيجة بعد قليل!',
//             en: '💸 Updating income data... Result soon!'
//         },
//         'صفقة': {
//             ar: '📝 إنهاء الصفقة... هل هي رابحة أم خاسرة؟',
//             en: '📝 Finalizing the deal... Profit or loss?'
//         },
//         'غنيمة': {
//             ar: '🏴‍☠️ البحث عن الغنيمة... النتائج قريبًا!',
//             en: '🏴‍☠️ Searching for loot... Outcome soon!'
//         },

//         // كلمات قتال ومغامرات
//         'قنص': {
//             ar: '🎯 محاولة قنص الهدف... هل تصيب أم تخسر؟',
//             en: '🎯 Attempting to snipe... Hit or miss?'
//         },
//         'كمين': {
//             ar: '🪤 إعداد كمين... هل تصطاد الفريسة أم تقع فيه؟',
//             en: '🪤 Setting a trap... Will you catch or be caught?'
//         },
//         'افتراس': {
//             ar: '🦁 محاولة الافتراس... هل أنت الصياد أم الفريسة؟',
//             en: '🦁 Attempting predation... Are you the hunter or the prey?'
//         },
//         'مداهمة': {
//             ar: '🚓 تنفيذ مداهمة... النتائج تحت التقييم!',
//             en: '🚓 Conducting a raid... Results pending!'
//         }
//     };

//     if (!Object.keys(keywords).includes(body)) return;

//     if (!cooldownMap[sender]) cooldownMap[sender] = {};

//     const now = Date.now();
//     const lastUsed = cooldownMap[sender][body] || 0;
//     const COOLDOWN_TIME = 3 * 60 * 1000; // 3 دقائق

//     if (now - lastUsed < COOLDOWN_TIME) {
//         const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 1000);
//         const waitMessage = lang === 'ar'
//             ? `⏳ يجب الانتظار ${remaining} ثانية قبل استخدام كلمة "${body}" مرة أخرى.`
//             : `⏳ Please wait ${remaining} seconds before using the word "${body}" again.`;
//         socket.send(JSON.stringify(createRoomMessage(roomName, waitMessage)));
//         return;
//     }

//     cooldownMap[sender][body] = now;

//     const warningMessage = keywords[body][lang];
//     socket.send(JSON.stringify(createRoomMessage(roomName, warningMessage)));

//     const checking = lang === 'ar'
//         ? '⏳ جاري تحليل النتائج...'
//         : '⏳ Analyzing results...';
//     socket.send(JSON.stringify(createRoomMessage(roomName, checking)));

//     setTimeout(() => {
//         const currentPoints = getUserPoints(sender);
//         if (currentPoints <= 0) {
//             const msg = lang === 'ar'
//                 ? '❌ ليس لديك نقاط كافية لتنفيذ العملية.'
//                 : '❌ You don’t have enough points to process this.';
//             socket.send(JSON.stringify(createRoomMessage(roomName, msg)));
//             return;
//         }

//         const isLoss = Math.random() < 0.85;
//         let percentChange = isLoss
//             ? -1 * (Math.floor(Math.random() * 31) + 10) // -10% إلى -40%
//             : Math.floor(Math.random() * 5) + 1;         // +1% إلى +5%

//         const pointsChange = Math.floor(currentPoints * (percentChange / 100));
//         const finalPoints = addPoints(sender, pointsChange);

//         updateTradeHistory(sender, percentChange > 0);

//         let resultMessage;
//         if (percentChange === 0) {
//             resultMessage = lang === 'ar'
//                 ? `💤 لم تتأثر نقاطك هذه المرة.`
//                 : `💤 No effect on your points this time.`;
//         } else if (percentChange > 0) {
//             resultMessage = lang === 'ar'
//                 ? `✅ ربحت ${pointsChange} نقطة (+${percentChange}%)! 🎉`
//                 : `✅ You gained ${pointsChange} points (+${percentChange}%)! 🎉`;
//         } else {
//             resultMessage = lang === 'ar'
//                 ? `❌ خسرت ${Math.abs(pointsChange)} نقطة (${percentChange}%) بسبب "${body}".`
//                 : `❌ Lost ${Math.abs(pointsChange)} points (${percentChange}%) because of "${body}".`;
//         }

//         const stats = getTradeStats(sender);
//         resultMessage += lang === 'ar'
//             ? `\n📊 الإحصائيات: ${stats.win} ربح / ${stats.lose} خسارة (${stats.percent}٪ نجاح)`
//             : `\n📊 Stats: ${stats.win} win / ${stats.lose} loss (${stats.percent}% success)`;

//         socket.send(JSON.stringify(createRoomMessage(roomName, resultMessage)));
//         console.log(`[📊 KEYWORD] ${sender} used '${body}' → ${percentChange}% (${pointsChange} points)`);
//     }, 2000);
// }

// module.exports = {
//     handleDrugKeywords
// };

const {
    getUserLanguage,
    getUserPoints,
    addPoints,
    updateTradeHistory,
    getTradeStats
} = require('../fileUtils');

const { createRoomMessage } = require('../messageUtils');
const { isUserVerified } = require('./manageLists');

const createMainImageMessage = (roomName, imageURL) => {
    return {
        handler: 'room_message',
        id: 'TclBVHgBzPGTMRTNpgWV',
        type: 'image',
        room: roomName,
        url: imageURL,
        length: '',
        body: ''
    };
};

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
        // 🌿 زراعة وتجاره
        'زرع': {
            messages: [
                { ar: '🌱 زرعت طماطم! هل ستحصد محصولًا وفيرًا؟', en: '🌱 You planted tomatoes! Will it be a good harvest?' },
                { ar: '🌱 زرعت بصل... الرائحة قوية!', en: '🌱 You planted onions... strong smell!' },
                { ar: '🌱 زرعت قمح... لنأمل بحصاد جيد.', en: '🌱 You planted wheat... hoping for a good yield.' },
                { ar: '🌱 زرعت بطاطس... لنرى النتيجة!', en: '🌱 You planted potatoes... let’s see the result!' }
            ],
            image: 'https://i.pinimg.com/736x/92/79/f6/9279f678131864d188d3df0d2b8fb331.jpg'
        },
        'حصاد': {
            messages: [
                { ar: '🚜 بدأت حصاد المحصول... هل هو وفير؟', en: '🚜 Started harvesting... is it abundant?' },
                { ar: '🚜 يبدو أن الحصاد ضعيف قليلاً هذا الموسم.', en: '🚜 The harvest seems a bit weak this season.' },
                { ar: '🚜 محصول وفير! مبروك.', en: '🚜 Great harvest! Congratulations.' }
            ],
            image: 'https://i.pinimg.com/736x/11/34/a2/1134a2a2869357af74b882b6e02dbbfe.jpg'
        },
        'تجارة': {
            messages: [
                { ar: '📦 بدأت عملية تجارة جديدة... هل تربح أم تخسر؟', en: '📦 Starting a new trade... Profit or loss?' },
                { ar: '📈 صفقة جديدة قيد التنفيذ.', en: '📈 New deal in progress.' },
                { ar: '💼 تفاوض مع تاجر... النتائج قريباً!', en: '💼 Negotiating with a merchant... Results soon!' }
            ],
            image: 'https://i.pinimg.com/736x/b7/3e/ed/b73eed24c32526af9915d15d1b0d3992.jpg'
        },
    
        // 💰 اقتصاد وكنوز
        'راتب': {
            messages: [{ ar: '💰 جاري معالجة الراتب...', en: '💰 Processing salary...' }],
            image: 'https://i.pinimg.com/736x/7f/5c/35/7f5c35d775ffe3bdd6799717225088d2.jpg'
        },
        'غنيمة': {
            messages: [
                { ar: '🏴‍☠️ البحث عن الغنيمة... النتائج قريبًا!', en: '🏴‍☠️ Searching for loot... Outcome soon!' },
                { ar: '🏴‍☠️ هل تجد كنزًا أم فخًا؟', en: '🏴‍☠️ Will you find treasure or a trap?' }
            ],
            image: 'https://i.pinimg.com/736x/81/e7/4b/81e74b9c4c534737ceea4fff76097aac.jpg'
        },
        'كنز': {
            messages: [
                { ar: '🪙 وجدت خريطة كنز... جاري البحث!', en: '🪙 Found a treasure map... searching!' },
                { ar: '🪙 هل الحظ بجانبك للوصول إلى الكنز؟', en: '🪙 Is luck on your side to find the treasure?' }
            ],
            image: 'https://i.pinimg.com/736x/81/e7/4b/81e74b9c4c534737ceea4fff76097aac.jpg'
        },
    
        // 🔫 قتال ومغامرات
        'قنص': {
            messages: [{ ar: '🎯 محاولة قنص الهدف...', en: '🎯 Attempting to snipe...' }],
            image: 'https://i.pinimg.com/736x/e8/5d/41/e85d410c487f256302b9d608a6dd22ef.jpg'
        },
        'كمين': {
            messages: [{ ar: '🪤 إعداد كمين... هل تصطاد أم تقع فيه؟', en: '🪤 Setting a trap... Catch or be caught?' }],
            image: 'https://i.pinimg.com/736x/f3/89/d1/f389d1a69a8bfb6f387b8240988bd01e.jpg'
        },
        'صيد': {
            messages: [
                { ar: '🎣 بدأت رحلة صيد... هل تصطاد سمكة كبيرة؟', en: '🎣 Starting a fishing trip... Big catch or not?' },
                { ar: '🦌 محاولة صيد غزال...', en: '🦌 Trying to hunt a deer...' },
                { ar: '🦆 صيد البط في الأفق...', en: '🦆 Duck hunting in sight...' }
            ],
            image: 'https://i.pinimg.com/736x/bd/cd/ea/bdcdeae6e56ed3ff5ee0dbd74a077b96.jpg'
        },
        'مغامرة': {
            messages: [
                { ar: '🧭 بدأت مغامرة جديدة... هل تكون ناجحة؟', en: '🧭 Starting a new adventure... Will it succeed?' },
                { ar: '🏞️ استكشاف منطقة مجهولة...', en: '🏞️ Exploring an unknown area...' }
            ],
            image: 'https://i.pinimg.com/736x/ac/a9/b4/aca9b4d27b25a1a86bdfa1517cca87d3.jpg'
        },
    
        // 🚗 تهريب وسرقة
        'سرقة': {
            messages: [
                { ar: '🕶️ محاولة سرقة... هل تنجح أم تمسك بك الشرطة؟', en: '🕶️ Attempting a theft... Will you succeed or get caught?' },
                { ar: '💼 سرقة بنك تحت التنفيذ...', en: '💼 Bank heist in progress...' }
            ],
            image: 'https://i.pinimg.com/736x/fb/38/de/fb38de0039601932118955f63d7e256c.jpg'
        },
      
    
        // 🚫 مخدرات وتحذيرات
        'كوكايين': {
            messages: [{ ar: '🚨 الكوكايين مادة خطيرة تسبب الإدمان.', en: '🚨 Cocaine is highly addictive.' }],
            image: 'https://cliniclesalpes.com/wp-content/uploads/2024/04/Depositphotos_583141048_XL.jpg'
        },
        'حشيش': {
            messages: [{ ar: '🚨 الحشيش يؤثر على الذاكرة والتركيز.', en: '🚨 Hashish affects memory and focus.' }],
            image: 'https://s.mc-doualiya.com/media/display/2085e3fe-d2ce-11e8-b3dc-005056bff430/w:980/p:16x9/cigarette_cannabis.jpg'
        },
        'هيروين': {
            messages: [{ ar: '🚨 الهيروين يؤدي إلى الإدمان بسرعة.', en: '🚨 Heroin causes rapid addiction.' }],
            image: 'https://www.alshefaarehab.com/wp-content/uploads/2020/04/Heroin6-1.jpg'
        }
    };
    

    if (!Object.keys(keywords).includes(body)) return;

    if (!cooldownMap[sender]) cooldownMap[sender] = {};

    const now = Date.now();
    const lastUsed = cooldownMap[sender][body] || 0;
    const COOLDOWN_TIME = 3 * 60 * 1000; // ثلاث دقائق

    if (now - lastUsed < COOLDOWN_TIME) {
        const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 1000);
        const waitMessage = lang === 'ar'
            ? `⏳ يجب الانتظار ${remaining} ثانية قبل استخدام كلمة "${body}" مرة أخرى.`
            : `⏳ Please wait ${remaining} seconds before using the word "${body}" again.`;
        socket.send(JSON.stringify(createRoomMessage(roomName, waitMessage)));
        return;
    }

    cooldownMap[sender][body] = now;

    const keyword = keywords[body];
    const randomMessage = keyword.messages[Math.floor(Math.random() * keyword.messages.length)];
    const messageText = randomMessage[lang];
console.log(keyword);

    if (keyword.image) {
        socket.send(JSON.stringify(createMainImageMessage(roomName, keyword.image)));
    }

    socket.send(JSON.stringify(createRoomMessage(roomName, messageText)));

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

const fs = require('fs');
const path = require('path');
const { createRoomMessage, createGiftMessage } = require('../messageUtils'); // تأكد من مسار الاستيراد الصحيح
const { loadRooms, incrementUserGiftCount, loadUsers, getUserLanguage,loadGifts } = require('../fileUtils');

// كاش لتخزين توقيت آخر طلب "عروستي" لكل مستخدم
const lastBrideRequestTimes = new Map();

// دالة لتحميل بيانات العرائس من JSON
function loadBrides() {
    const filePath = path.join(__dirname, '../data/brides.json');
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading brides data:', error);
        return [];
    }
}
function addBride(name, imageUrl) {
    const filePath = path.join(__dirname, '../data/brides.json');
    let brides = [];

    try {
        const data = fs.readFileSync(filePath, 'utf8');
        brides = JSON.parse(data);
    } catch (err) {
        // لو الملف مش موجود أو فيه خطأ، نبدأ من مصفوفة فاضية
        brides = [];
    }

    // التحقق من وجود الاسم مسبقًا
    const exists = brides.some(b => b.username === name);
    if (exists) {
        return { success: false, message: '⚠️ هذه العروسة موجودة بالفعل.' };
    }

    brides.push({ username: name, image: imageUrl });

    try {
        fs.writeFileSync(filePath, JSON.stringify(brides, null, 2), 'utf8');
        return { success: true, message: `✅ تم إضافة العروسة: ${name}` };
    } catch (err) {
        console.error('Failed to write to brides.json:', err);
        return { success: false, message: '❌ حدث خطأ أثناء حفظ العروسة.' };
    }
}

// توليد تاريخ زواج عشوائي (من الغد إلى 10 أيام قدام)
function getRandomWeddingDate(lang) {
    const today = new Date();
    const daysToAdd = Math.floor(Math.random() * 10) + 1;
    const weddingDate = new Date(today.setDate(today.getDate() + daysToAdd));
    return weddingDate.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

// توقعات عشوائية بلغتين
const weddingPredictions = {
    ar: [
        '🎉 هيكون يوم مليان فرح وضحك',
        '💃 هتكون فيه رقصة العمر',
        '😅 هتحصل شوية مشاكل بسيطة بس هتعدي',
        '🌧️ احتمال تمطر بس الحب هيفضل ساطع',
        '🎊 الفرح هيكون فوق الخيال',
        '🥳 كل الناس هتتكلم عن الفرح ده',
        '😢 في حد هيندم إنه مجاش الفرح',
        '🎤 المغني هيغني أغنية مخصوص ليكم',
        '📸 المصور هيطلع صور خرافية',
        '👨‍👩‍👧‍👦 هتحسوا إن كل الناس بتحبكم',
        '🕺 واحد من المعازيم هيعمل رقصة غريبة',
        '🍰 التورتة هتكون أحلى من الخيال',
        '🚗 الكوشة هتوصلوا ليها بعربية كلاسيك تحفة',
    ],
    en: [
        '🎉 It will be a day full of joy and laughter',
        '💃 There will be a dance to remember',
        '😅 Some small problems might happen, but it’ll pass',
        '🌧️ It might rain, but love will shine through',
        '🎊 The wedding will be beyond imagination',
        '🥳 Everyone will talk about this wedding',
        '😢 Someone will regret missing the wedding',
        '🎤 The singer will perform a special song for you',
        '📸 The photographer will take amazing pictures',
        '👨‍👩‍👧‍👦 You will feel loved by everyone',
        '🕺 A guest will do a weird but funny dance',
        '🍰 The cake will be out of this world',
        '🚗 You’ll arrive in a stunning classic car',
    ],
};

function getRandomPrediction(lang) {
    const list = weddingPredictions[lang] || weddingPredictions['ar'];
    return list[Math.floor(Math.random() * list.length)];
}

function handleBrideRequest(data, socket, senderName) {

    const message = data.body.trim();
    if (message !== 'عروستي') return;

    const lang = getUserLanguage(senderName) || 'ar';
    const now = Date.now();
    const lastRequestTime = lastBrideRequestTimes.get(senderName) || 0;

    if (now - lastRequestTime < 60 * 1000) {
        const waitMsgText =
            lang === 'ar'
                ? `⏳ يمكنك طلب "عروستي" مرة كل دقيقة. حاول مرة أخرى بعد قليل.`
                : `⏳ You can request "My Bride" once every minute. Please wait a bit.`;
        socket.send(JSON.stringify(createRoomMessage(data.room, waitMsgText)));
        return;
    }

    lastBrideRequestTimes.set(senderName, now);

    const brides = loadBrides();
    if (brides.length === 0) {
        const errorMsgText =
            lang === 'ar'
                ? '⚠️ عذراً، لا توجد بيانات عن العرائس حالياً.'
                : '⚠️ Sorry, no bride data available at the moment.';
        socket.send(JSON.stringify(createRoomMessage(data.room, errorMsgText)));
        return;
    }

    const randomBride = brides[Math.floor(Math.random() * brides.length)];
    const weddingDate = getRandomWeddingDate(lang);
    const prediction = getRandomPrediction(lang);

    const responseText =
        lang === 'ar'
            ? `👰‍♀️ عروسة اليوم: ${randomBride.username}
📅 موعد الفرح: ${weddingDate}
💌 مرسل الطلب: ${senderName}
🔮 توقعات الفرح: ${prediction}`
            : `👰‍♀️ Bride of the Day: ${randomBride.username}
📅 Wedding Date: ${weddingDate}
💌 Requested by: ${senderName}
🔮 Wedding Prediction: ${prediction}`;

    socket.send(JSON.stringify(createRoomMessage(data.room, responseText)));

    const giftMsg = createGiftMessage(
        data.room,
        randomBride.image,
        senderName,
        randomBride.username,
        false,
        lang === 'ar' ? 'عروستي' : 'My Bride'
    );

    socket.send(JSON.stringify(giftMsg));
}

// تنظيف التوقيتات القديمة كل 10 دقائق
setInterval(() => {
    const now = Date.now();
    for (const [user, timestamp] of lastBrideRequestTimes.entries()) {
        if (now - timestamp > 5 * 60 * 1000) {
            lastBrideRequestTimes.delete(user);
        }
    }
}, 10 * 60 * 1000);


function handleBrideCommands(data, socket, senderName) {
    const message = data.body.trim();
    const lang = getUserLanguage(senderName) || 'ar';

    // تحقق إذا كان الأمر لإضافة عروسة: woman@username@url
    if (message.startsWith('woman@')) {
        const parts = message.split('@');
        if (parts.length !== 3) {
            const errMsg =
                lang === 'ar'
                    ? '⚠️ الصيغة غير صحيحة. استخدم: woman@الاسم@رابط_الصورة'
                    : '⚠️ Invalid format. Use: woman@name@image_url';
            socket.send(JSON.stringify(createRoomMessage(data.room, errMsg)));
            return;
        }

        const [_, username, imageUrl] = parts;

        if (!username || !imageUrl || !imageUrl.startsWith('http')) {
            const errMsg =
                lang === 'ar'
                    ? '⚠️ تأكد من كتابة الاسم والرابط بشكل صحيح.'
                    : '⚠️ Please make sure the name and URL are valid.';
            socket.send(JSON.stringify(createRoomMessage(data.room, errMsg)));
            return;
        }

        const result = addBride(username.trim(), imageUrl.trim());
        const responseText = lang === 'ar'
            ? result.message
            : result.success
                ? `✅ Bride "${username.trim()}" has been added successfully.`
                : `⚠️ Bride "${username.trim()}" already exists.`;

        socket.send(JSON.stringify(createRoomMessage(data.room, responseText)));
        return;
    }

   
}

module.exports = {
    handleBrideRequest,
    handleBrideCommands
};

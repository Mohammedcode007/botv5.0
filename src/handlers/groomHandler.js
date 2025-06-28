const fs = require('fs');
const path = require('path');
const { createRoomMessage, createGiftMessage } = require('../messageUtils');
const { getUserLanguage } = require('../fileUtils');

// كاش لتخزين توقيت آخر طلب "عريسي" لكل مستخدم
const lastGroomRequestTimes = new Map();

// دالة لتحميل بيانات العرسان
function loadGrooms() {
    const filePath = path.join(__dirname, '../data/grooms.json');
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading grooms data:', error);
        return [];
    }
}

// دالة لإضافة عريس جديد
function addGroom(name, imageUrl) {
    const filePath = path.join(__dirname, '../data/grooms.json');
    let grooms = [];

    try {
        const data = fs.readFileSync(filePath, 'utf8');
        grooms = JSON.parse(data);
    } catch (err) {
        grooms = [];
    }

    const exists = grooms.some(g => g.username === name);
    if (exists) {
        return { success: false, message: '⚠️ هذا العريس موجود بالفعل.' };
    }

    grooms.push({ username: name, image: imageUrl });

    try {
        fs.writeFileSync(filePath, JSON.stringify(grooms, null, 2), 'utf8');
        return { success: true, message: `✅ تم إضافة العريس: ${name}` };
    } catch (err) {
        console.error('Failed to write to grooms.json:', err);
        return { success: false, message: '❌ حدث خطأ أثناء حفظ العريس.' };
    }
}

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

const weddingPredictions = {
    ar: [
        '☁️ احتمال المطر يخرب الفرح ويخلي الناس تسيب الرقص!',
        '😬 العريس ممكن ينسى يلبس الجاكيت في نص الفرح!',
        '🍰 التورتة ممكن تقع وتتدحرج على الأرض، بس هتفضل محبوبة!',
        '🎤 المغني هيغلط في كلمات الأغاني ويخلي الكل يضحك!',
        '🚗 الكوشة ممكن تتأخر والعريس يطلع يمشي على رجليه!',
        '📸 المصور ممكن ينسى يطلع الصور ولا حد يشوفها!',
        '👗 فستان العروسة ممكن يتمزق بس محدش يلاحظ!',
        '💃 حمات العريس ممكن تتخانق مع المعازيم على صوت الموسيقى!',
        '🎊 احتمال واحد من المعازيم ينسى هو جاي عازم أو عريس!',
        '🥳 العيال الصغيرين ممكن يكسروا أغراض مهمة في القاعة!',
        '😓 العريس ممكن ينسى يرد على المعازيم لما يسألوه!',
        '💌 احتمال الدعوات توصل متأخرة ونص الناس ما ييجوش!',
        '🌪️ في احتمال عاصفة رملية تقلب المزاج في الفرح!',
        '😱 احتمال العريس يشوف رسالة غريبة على موبايله في يوم الفرح!',
        '💔 العروسة ممكن تكتشف سر صغير قبل الفرح بيوم!',
    ],
    en: [
        '☁️ It might rain and ruin the dance floor!',
        '😬 The groom might forget to wear his jacket halfway through!',
        '🍰 The cake might fall and roll on the floor, but still loved!',
        '🎤 The singer might mess up the lyrics and make everyone laugh!',
        '🚗 The wedding car might be late and the groom will walk in!',
        '📸 The photographer might forget to take pictures altogether!',
        '👗 The bride’s dress might tear but no one will notice!',
        '💃 The groom’s mom might argue with guests over the music volume!',
        '🎊 A guest might forget if they’re invited or the groom themselves!',
        '🥳 The kids might break important stuff in the venue!',
        '😓 The groom might forget to reply to guests asking questions!',
        '💌 The invitations might arrive late and half the people won’t come!',
        '🌪️ A sandstorm might ruin the wedding mood!',
        '😱 The groom might find a suspicious message on his phone on the wedding day!',
        '💔 The bride might discover a little secret just a day before the wedding!',
    ],
};

function getRandomPrediction(lang) {
    const list = weddingPredictions[lang] || weddingPredictions['ar'];
    return list[Math.floor(Math.random() * list.length)];
}

function handleGroomRequest(data, socket, senderName) {
    const message = data.body.trim();
    if (message !== 'عريسي') return;

    const lang = getUserLanguage(senderName) || 'ar';
    const now = Date.now();
    const lastRequestTime = lastGroomRequestTimes.get(senderName) || 0;

    if (now - lastRequestTime < 60 * 1000) {
        const waitMsg =
            lang === 'ar'
                ? `⏳ يمكنك طلب "عريسي" مرة كل دقيقة. حاول مرة أخرى بعد قليل.`
                : `⏳ You can request "My Groom" once every minute. Please wait a bit.`;
        socket.send(JSON.stringify(createRoomMessage(data.room, waitMsg)));
        return;
    }

    lastGroomRequestTimes.set(senderName, now);

    const grooms = loadGrooms();
    if (grooms.length === 0) {
        const noDataMsg =
            lang === 'ar'
                ? '⚠️ عذراً، لا توجد بيانات عن العرسان حالياً.'
                : '⚠️ Sorry, no groom data available at the moment.';
        socket.send(JSON.stringify(createRoomMessage(data.room, noDataMsg)));
        return;
    }

    const randomGroom = grooms[Math.floor(Math.random() * grooms.length)];
    const weddingDate = getRandomWeddingDate(lang);
    const prediction = getRandomPrediction(lang);

    const responseText =
        lang === 'ar'
            ? `🤵‍♂️ عريس اليوم: ${randomGroom.username}
📅 موعد الفرح: ${weddingDate}
💌 مرسل الطلب: ${senderName}
🔮 توقعات الفرح: ${prediction}`
            : `🤵‍♂️ Groom of the Day: ${randomGroom.username}
📅 Wedding Date: ${weddingDate}
💌 Requested by: ${senderName}
🔮 Wedding Prediction: ${prediction}`;

    socket.send(JSON.stringify(createRoomMessage(data.room, responseText)));

    const giftMsg = createGiftMessage(
        data.room,
        randomGroom.image,
        senderName,
        randomGroom.username,
        false,
        lang === 'ar' ? 'عريسي' : 'My Groom'
    );

    socket.send(JSON.stringify(giftMsg));
}

// تنظيف الكاش كل 10 دقائق
setInterval(() => {
    const now = Date.now();
    for (const [user, timestamp] of lastGroomRequestTimes.entries()) {
        if (now - timestamp > 5 * 60 * 1000) {
            lastGroomRequestTimes.delete(user);
        }
    }
}, 10 * 60 * 1000);

function handleGroomCommands(data, socket, senderName) {
    const message = data.body.trim();
    const lang = getUserLanguage(senderName) || 'ar';

    // تحقق من أمر الإضافة: man@username@url
    if (message.startsWith('man@')) {
        const parts = message.split('@');
        if (parts.length !== 3) {
            const errMsg =
                lang === 'ar'
                    ? '⚠️ الصيغة غير صحيحة. استخدم: man@الاسم@رابط_الصورة'
                    : '⚠️ Invalid format. Use: man@name@image_url';
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

        const result = addGroom(username.trim(), imageUrl.trim());
        const responseText = lang === 'ar'
            ? result.message
            : result.success
                ? `✅ Groom "${username.trim()}" has been added successfully.`
                : `⚠️ Groom "${username.trim()}" already exists.`;

        socket.send(JSON.stringify(createRoomMessage(data.room, responseText)));
        return;
    }
}

module.exports = {
    handleGroomRequest,
    handleGroomCommands,
};

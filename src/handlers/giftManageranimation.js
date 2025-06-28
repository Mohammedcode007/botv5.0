
const { loadRooms, incrementUserGiftCount, loadUsers, getUserLanguage,loadGifts,getUserProfileUrl, loadGiftsAnimation } = require('../fileUtils');
const { createGiftMessage } = require('../messageUtils');
const { createRoomMessage } = require('../messageUtils');
const { processAnimatedImageAndUpload } = require('./processImageAndUpload'); // تأكد من مسار الدالة

const pendingGifts = {}; // { senderName: { recipient, createdAt, socket } }
const userGiftStats = {}; // { username: { sent: 0, received: 0 } } لتتبع الهدايا

// دالة للتحقق من حالة الـ VIP
function isUserVip(username) {
    const users = loadUsers(); // هذه الدالة يجب أن تقوم بتحميل جميع المستخدمين من ملف أو قاعدة بيانات
    const user = users.find(u => u.username === username);
    return user && user.vip;
}

const lastGiftSentTime = {}; // لتخزين وقت آخر هدية تم إرسالها لكل مستخدم

function handleGiftCommandAnimation(data, socket, senderName) {
    const body = data.body;

    let recipient = null;
    let customMessage = '';
    let isSvip = false;

    // التحقق من أمر الهدية
    if (body.startsWith('gft@')) {
        const parts = body.split('@');
        if (parts.length >= 2) {
            recipient = parts[1].trim();
        }
    } else if (body.startsWith('svip@')) {
        const parts = body.split('@');
        isSvip = true;
        if (parts.length === 2 && parts[1].trim() !== '') {
            recipient = parts[1].trim(); // svip@username
        } else if (parts.length >= 3) {
            recipient = parts[1].trim();  // svip@username@customMessage
            customMessage = parts.slice(2).join('@').trim();
        }
    } else {
        return;
    }

    if (!recipient) return;

    // التحقق من وجود المستلم في قائمة المستخدمين
    const users = loadUsers(); // هذه الدالة يجب أن تقوم بتحميل جميع المستخدمين من ملف أو قاعدة بيانات
    const recipientUser = users.find(u => u.username === recipient);

    if (!recipientUser) {
        const lang = getUserLanguage(senderName) || 'ar';

        const userNotFoundText = lang === 'ar'
            ? `⚠️ المستخدم ${recipient} غير موجود! تأكد من اسم المستخدم وأعد المحاولة.` 
            : `⚠️ User ${recipient} not found! Please check the username and try again.`;

        const userNotFoundMsg = createRoomMessage(data.room, userNotFoundText);
        socket.send(JSON.stringify(userNotFoundMsg));

        return;
    }

    // التحقق من الوقت بين الهدايا
    const currentTime = Date.now();
    const lastSentTime = lastGiftSentTime[senderName];

    if (lastSentTime && currentTime - lastSentTime < 300000) { // 5 دقائق
        const lang = getUserLanguage(senderName) || 'ar';

        const waitMessage = lang === 'ar'
            ? `⚠️ يجب أن تنتظر 5 دقائق قبل إرسال هدية أخرى.`
            : `⚠️ You must wait 5 minutes before sending another gift.`;

        const waitMsg = createRoomMessage(data.room, waitMessage);
        socket.send(JSON.stringify(waitMsg));

        return;
    }

    // تحديث وقت آخر هدية تم إرسالها
    lastGiftSentTime[senderName] = currentTime;

    // التحقق من حالة الـ VIP
    if (!isUserVip(senderName)) {
        const lang = getUserLanguage(senderName) || 'ar';

        const vipMessageText = lang === 'ar'
            ? '⚠️ لا يمكنك إرسال هدية لأنك لست من أعضاء VIP. تواصل مع المشرف للحصول على صلاحيات VIP.'
            : '⚠️ You cannot send a gift because you are not a VIP. Please contact the admin to get VIP privileges.';
        
        const vipMessage = createRoomMessage(data.room, vipMessageText);
        socket.send(JSON.stringify(vipMessage));
        
        return;
    }

    // تتبع الهدايا المرسلة
    if (!userGiftStats[senderName]) {
        userGiftStats[senderName] = { sent: 0, received: 0 };
    }
    userGiftStats[senderName].sent++;

    // تخزين الهدية المعلقة
    pendingGifts[senderName] = {
        recipient,
        customMessage,
        isSvip,
        createdAt: Date.now(),
        socket
    };

    const waitMessage = isSvip
        ? `🎁 المستخدم ${senderName} يستعد لإرسال هدية ${recipient ? `إلى ${recipient}` : 'خاصة'}. الرجاء الانتظار... لديه 30 ثانية فقط. الهدايا المرسلة: ${userGiftStats[senderName].sent}`
        : `🎁 من فضلك أرسل الآن صورة الهدية إلى ${recipient}. لديك 30 ثانية فقط. الهدايا المرسلة: ${userGiftStats[senderName].sent}`;

    const response = createRoomMessage(data.room, waitMessage);
    socket.send(JSON.stringify(response));

    setTimeout(() => {
        if (pendingGifts[senderName]) {
            delete pendingGifts[senderName];
    
            const lang = getUserLanguage(senderName) || 'ar';
            const timeoutText = lang === 'ar'
                ? `⏰ انتهى الوقت! لم يتم إرسال صورة الهدية إلى ${pendingGifts[senderName]?.recipient || 'المستلم'}.`
                : `⏰ Time's up! The gift image was not sent to ${pendingGifts[senderName]?.recipient || 'the recipient'}.`;
    
            const timeoutMsg = createRoomMessage(data.room, timeoutText);
            socket.send(JSON.stringify(timeoutMsg));
        }
    }, 30000);
}



function handleImageGiftAnimation(data, senderName, ioSockets) {
    if (!pendingGifts.hasOwnProperty(senderName)) return;
    if (!data.url) return;

    const pending = pendingGifts[senderName];
    const { recipient, customMessage, isSvip } = pending;

    const rooms = loadRooms();

    // تحديث العدادات
    incrementUserGiftCount(senderName, 'sentGifts');
    incrementUserGiftCount(recipient, 'receivedGifts');

    // تحميل المستخدمين بعد التحديث
    const users = loadUsers();
    const senderData = users.find(u => u.username === senderName);
    const recipientData = users.find(u => u.username === recipient);

    const sentCount = senderData?.sentGifts || 0;
    const receivedCount = senderData?.receivedGifts || 0;

    // تحديد اللغة
    const lang = getUserLanguage(senderName) || 'ar';

    rooms.forEach(room => {
        const roomName = room.roomName || room;
        const targetSocket = ioSockets ? ioSockets[roomName] : pending.socket;

        if (!targetSocket || targetSocket.readyState !== 1) return;

 const detailText = lang === 'ar'
  ? `╔═══ SUPER GIFT ═══╗  
🏰 𝑹𝒐𝒐𝒎: ${data.room}  
👑 𝑭𝒓𝒐𝒎: ${senderName}  
💖 𝑻𝒐: ${recipient}  
📝 𝑴𝒆𝒔𝒔𝒂𝒈𝒆: “${customMessage || '—'}” 🎉  
🎁 𝑺𝒆𝒏𝒕: ${sentCount} | 🌟 𝑹𝒆𝒄𝒆𝒊𝒗𝒆𝒅: ${receivedCount}  
╚════════════════╝`
  : `╔═══ SUPER GIFT ═══╗  
🏰 𝑹𝒐𝒐𝒎: ${data.room}  
👑 𝑭𝒓𝒐𝒎: ${senderName}  
💖 𝑻𝒐: ${recipient}  
📝 𝑴𝒆𝒔𝒔𝒂𝒈𝒆: “${customMessage || '—'}” 🎉  
🎁 𝑺𝒆𝒏𝒕: ${sentCount} | 🌟 𝑹𝒆𝒄𝒆𝒊𝒗𝒆𝒅: ${receivedCount}  
╚════════════════╝`;

        const detailMsg = createRoomMessage(roomName, detailText);
        targetSocket.send(JSON.stringify(detailMsg));

        // إرسال صورة الهدية
        const giftMsg = createGiftMessage(
            roomName,
            data.url,
            senderName,
            recipient,
            isSvip,
            customMessage
        );
        targetSocket.send(JSON.stringify(giftMsg));
    });

    delete pendingGifts[senderName];
}





const imgbbKey = 'f00c125d8886eadb1fa054fcfa76c040';



async function handleGiftSelectionAnimation(data, senderName, ioSockets) {
    console.log('🚀 بدء تنفيذ handleGiftSelection');
    const body = data.body;
    const parts = body.split('@');
    console.log('🧠 أمر الإدخال:', parts);

    if (parts.length < 3 || parts[0] !== 'gf') {
        console.log('❌ الأمر غير صحيح أو عدد العناصر أقل من 3');
        return;
    }

    const giftId = parseInt(parts[1], 10);
    const recipient = parts[2].trim();

    console.log('🎁 giftId:', giftId);
    console.log('👤 recipient:', recipient);

    if (isNaN(giftId)) {
        console.log('❌ giftId ليس رقمًا صحيحًا');
        return;
    }

    const gifts = loadGiftsAnimation();
    console.log('🎁 قائمة الهدايا:', gifts);

    const gift = gifts.find(g => g.id === giftId);
    if (!gift) {
        console.log(`❌ لم يتم العثور على الهدية برقم id: ${giftId}`);
        return;
    }
    console.log('✅ تم العثور على الهدية:', gift);

    const users = loadUsers();
    const senderData = users.find(u => u.username === senderName);
    const recipientData = users.find(u => u.username === recipient);
    console.log('👤 بيانات المرسل:', senderData);
    console.log('👤 بيانات المستلم:', recipientData);

    if (!recipientData) {
        console.log(`❌ لم يتم العثور على المستلم: ${recipient}`);
        return;
    }

    const profileUrl = getUserProfileUrl(senderName);
    console.log('🖼️ رابط بروفايل المرسل:', profileUrl);

    if (!profileUrl) {
        console.log('❌ رابط بروفايل المرسل غير موجود');
        return;
    }

    try {



        // تحديث العدادات
        incrementUserGiftCount(senderName, 'sentGifts');
        incrementUserGiftCount(recipient, 'receivedGifts');

        const updatedUsers = loadUsers();
        const updatedSender = updatedUsers.find(u => u.username === senderName);
        const updatedRecipient = updatedUsers.find(u => u.username === recipient);

        const sentCount = updatedSender?.sentGifts || 0;
        const receivedCount = updatedRecipient?.receivedGifts || 0;

        console.log('📊 عدادات المرسل:', sentCount);
        console.log('📊 عدادات المستلم:', receivedCount);

        const lang = getUserLanguage(senderName) || 'ar';
        const detailText = lang === 'ar'
        ? `🎁 ANIMATION GIFT 🎁\n\n${gift.name}\n← ${senderName}\n← ${recipient}\n\n🖱️ اضغط علي الصوره`
        : `🎁 ANIMATION GIFT 🎁\n\n${gift.name}\n→ ${senderName}\n→ ${recipient}\n\n🖱️ Click the image .`;
    

        const rooms = loadRooms();
        console.log('🏠 الغرف:', rooms);

        rooms.forEach(room => {
            const roomName = room.roomName || room;
            const targetSocket = ioSockets[roomName];

            if (!targetSocket) {
                console.log(`⚠️ لا يوجد socket للغرفة: ${roomName}`);
                return;
            }
            if (targetSocket.readyState !== 1) {
                console.log(`⚠️ socket مغلق للغرفة: ${roomName}`);
                return;
            }

            console.log(`📤 إرسال رسالة إلى الغرفة: ${roomName}`);
            const detailMsg = createRoomMessage(roomName, detailText);
            targetSocket.send(JSON.stringify(detailMsg));

            const giftMsg = createGiftMessage(
                roomName,
                gift.url,
                senderName,
                recipient,
                false,
                `🎁 ${senderName} أرسل هدية خاصة إلى ${recipient}! 🌟`
            );
            targetSocket.send(JSON.stringify(giftMsg));
        });

        console.log('✅ انتهى إرسال الهدية بنجاح.');

    } catch (err) {
        console.error('❌ خطأ أثناء تجهيز صورة الهدية:', err.message);
    }
}



function handleGiftListRequestAnimation(data, socket, senderName) {
    // تحميل قائمة الهدايا
    const gifts = loadGiftsAnimation();
    
    // تقسيم القائمة إلى نصفين
    const midpoint = Math.ceil(gifts.length / 2);
    const firstHalf = gifts.slice(0, midpoint);
    const secondHalf = gifts.slice(midpoint);

    // تحضير الرسالة الأولى
    let firstMessage = '🎁 Available gifts (Part 1):\n';
    firstHalf.forEach((gift, index) => {
        firstMessage += `${index + 1}. ${gift.name}\n`;
    });

    // تحضير الرسالة الثانية
    let secondMessage = '🎁 Available gifts (Part 2):\n';
    secondHalf.forEach((gift, index) => {
        // نبدأ العد من الرقم بعد نهاية الجزء الأول
        secondMessage += `${midpoint + index + 1}. ${gift.name}\n`;
    });

    // إرسال الرسالتين منفصلتين
    socket.send(JSON.stringify(createRoomMessage(data.room, firstMessage)));
    socket.send(JSON.stringify(createRoomMessage(data.room, secondMessage)));
}




module.exports = {
    handleGiftCommandAnimation,
    handleImageGiftAnimation,
    handleGiftSelectionAnimation,
    handleGiftListRequestAnimation
};

//src/fileUtils
const fs = require('fs');
const path = require('path');

const roomsFilePath = path.join(__dirname, '..', 'rooms.json');
const usersLangFilePath = './usersLang.json';
const usersFilePath = './usersLang.json'; // مسار ملف المستخدمين
const { masterListPath, adminListPath, blockedUsersPath, blockedRoomsPath, userVerifyListPath } = require('./constants');
const USERS_FILE = path.join(__dirname, './data/verifiedUsers.json');
const { createRoomMessage } = require('./messageUtils');






// ✅ تحميل الغرف
function loadRooms() {
    console.log('📥 جاري تحميل ملف الغرف...');
    if (fs.existsSync(roomsFilePath)) {
        try {
            const data = fs.readFileSync(roomsFilePath, 'utf-8');
            const parsed = JSON.parse(data);

            console.log(`📄 محتوى ملف الغرف:`, parsed);

            if (Array.isArray(parsed)) {
                console.log(`✅ تم تحميل الغرف بنجاح. عدد الغرف: ${parsed.length}`);
                return parsed;
            } else {
                console.error('❌ rooms.json لا يحتوي على مصفوفة. سيتم إرجاع مصفوفة فارغة.');
                return [];
            }
        } catch (error) {
            console.error('❌ خطأ أثناء قراءة rooms.json:', error);
            return [];
        }
    } else {
        console.warn('⚠️ ملف rooms.json غير موجود، سيتم إنشاء ملف جديد.');
        return [];
    }
}

// ✅ حفظ الغرف
function saveRooms(rooms) {
    console.log('💾 محاولة حفظ ملف الغرف...');
    if (!Array.isArray(rooms)) {
        console.error('❌ محاولة حفظ rooms لكن القيمة ليست Array:', rooms);
        return;
    }

    if (rooms.length === 0) {
        console.warn('⚠️ تحذير: محاولة حفظ قائمة غرف فارغة! لن يتم الحفظ لتجنب المسح.');
        return;
    }

    const currentData = loadRooms();
    const isSame = JSON.stringify(currentData) === JSON.stringify(rooms);

    if (isSame) {
        console.log('✅ لم يتم التغيير في الغرف. لم يتم الحفظ.');
        return;
    }

    try {
        fs.writeFileSync(roomsFilePath, JSON.stringify(rooms, null, 2));
        console.log(`✅ تم حفظ الغرف بنجاح. عدد الغرف الحالي: ${rooms.length}`);
    } catch (error) {
        console.error('❌ خطأ أثناء حفظ الغرف:', error);
    }
}

// ✅ إضافة غرفة جديدة
function addRoom(room) {
    console.log('➕ محاولة إضافة غرفة:', room);

    if (!room.roomName) {
        console.error('❌ لا يمكن إضافة غرفة بدون اسم.');
        return;
    }

    const rooms = loadRooms();

    if (!Array.isArray(rooms)) {
        console.error('❌ خطأ: rooms ليست مصفوفة:', rooms);
        return;
    }

    const exists = rooms.some(r => r.roomName === room.roomName);

    if (exists) {
        console.warn(`⚠️ الغرفة "${room.roomName}" موجودة بالفعل. لن تتم الإضافة.`);
        return;
    }

    rooms.push(room);
    saveRooms(rooms);
    console.log(`✅ تم إضافة الغرفة "${room.roomName}" بنجاح.`);
}

// ✅ التحقق من وجود غرفة
function roomExists(roomName) {
    console.log(`🔍 التحقق مما إذا كانت الغرفة "${roomName}" موجودة...`);

    const rooms = loadRooms();

    if (!Array.isArray(rooms)) {
        console.error('❌ خطأ: rooms ليست مصفوفة عند التحقق من وجود الغرفة.');
        return false;
    }

    const exists = rooms.some(room => room.roomName === roomName);

    if (exists) {
        console.log(`✅ الغرفة "${roomName}" موجودة.`);
    } else {
        console.log(`❌ الغرفة "${roomName}" غير موجودة.`);
    }

    return exists;
}








function deleteRoom(roomName) {
    
    const rooms = loadRooms(); // تحميل الغرف من الملف

    // البحث عن الغرفة التي تحمل نفس الاسم
    const roomIndex = rooms.findIndex(room => room.roomName === roomName);

    if (roomIndex !== -1) {
        // إذا كانت الغرفة موجودة، نقوم بحذفها من المصفوفة
        rooms.splice(roomIndex, 1);
        saveRooms(rooms); // حفظ التعديلات على الملف
    } else {
    }
}

// function addRoom(rooms, newRoom) {
//     rooms.push(newRoom);
//     saveRooms(rooms);
// }

function loadUserLanguage() {
    if (fs.existsSync(usersLangFilePath)) {
        const data = fs.readFileSync(usersLangFilePath);
        return JSON.parse(data);
    }
    return {};
}

function saveUserLanguage(username, language) {
    const usersLang = loadUserLanguage();
    usersLang[username] = language;
    fs.writeFileSync(usersLangFilePath, JSON.stringify(usersLang, null, 2));
}


function getUserLanguage(username) {
    try {
        const data = fs.readFileSync(usersFilePath, 'utf8');
        const users = JSON.parse(data);

        // التحقق من وجود اسم المستخدم في الملف
        if (users.hasOwnProperty(username)) {
            return users[username]; // إرجاع اللغة المرتبطة باسم المستخدم
        } else {
            return null; // إذا لم يكن هناك اسم المستخدم في البيانات
        }
    } catch (error) {
        console.error('Error reading users file:', error);
        return null; // إرجاع null في حالة حدوث خطأ
    }
}

// دوال التعامل مع ملفات المستخدمين والبيانات الأخرى (master, admin, userverify, blocked)
function loadMasterList() {
    if (fs.existsSync(masterListPath)) {
        const data = fs.readFileSync(masterListPath);
        return JSON.parse(data);
    }
    return [];
}

function saveMasterList(masterList) {
    fs.writeFileSync(masterListPath, JSON.stringify(masterList, null, 2));
}
function formatNumber(num) {
    const units = ['', 'K', 'M', 'B', 'T', 'Q', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']; 
    let unitIndex = 0;

    while (Math.abs(num) >= 1000 && unitIndex < units.length - 1) {
        num /= 1000;
        unitIndex++;
    }

    return num.toFixed(1).replace(/\.0$/, '') + units[unitIndex];
}


function loadAdminList() {
    if (fs.existsSync(adminListPath)) {
        const data = fs.readFileSync(adminListPath);
        return JSON.parse(data);
    }
    return [];
}

function saveAdminList(adminList) {
    fs.writeFileSync(adminListPath, JSON.stringify(adminList, null, 2));
}



function updateUserPoints(username, addedPoints) {
    
    if (!fs.existsSync(USERS_FILE)) {
        return;
    }

    const data = fs.readFileSync(USERS_FILE, 'utf8');

    let users;
    try {
        users = JSON.parse(data);
    } catch (error) {
        return;
    }

    // تأكد أن users مصفوفة
    if (!Array.isArray(users)) {
        return;
    }

    const user = users.find(u => u.username === username);

    if (user) {
        if (typeof user.points !== 'number') user.points = 0;
        user.points += addedPoints;
    } else {
        // إضافة مستخدم جديد إذا لم يكن موجودًا
        users.push({
            username: username,
            points: addedPoints,
            vip: false
        });
    }

    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 4), 'utf8');
}



function loadUserVerifyList() {
    if (fs.existsSync(USERS_FILE)) {
        const data = fs.readFileSync(USERS_FILE);
        return JSON.parse(data);
    }
    return [];
}

function saveUserVerifyList(userVerifyList) {
    fs.writeFileSync(userVerifyListPath, JSON.stringify(userVerifyList, null, 2));
}

function loadBlockedUsers() {
    if (fs.existsSync(blockedUsersPath)) {
        const data = fs.readFileSync(blockedUsersPath);
        return JSON.parse(data);
    }
    return [];
}

function saveBlockedUsers(blockedUsers) {
    fs.writeFileSync(blockedUsersPath, JSON.stringify(blockedUsers, null, 2));
}

function loadBlockedRooms() {
    if (fs.existsSync(blockedRoomsPath)) {
        const data = fs.readFileSync(blockedRoomsPath);
        return JSON.parse(data);
    }
    return [];
}

function saveBlockedRooms(blockedRooms) {
    fs.writeFileSync(blockedRoomsPath, JSON.stringify(blockedRooms, null, 2));
}

// دوال للتحقق من وجود المستخدمين أو الغرف في القوائم
function isUserInMasterList(username) {
    const masterList = loadMasterList();
    return masterList.includes(username);
}

function isUserInAdminList(username) {
    const adminList = loadAdminList();
    return adminList.includes(username);
}

function isUserVerified(username) {
    const userVerifyList = loadUserVerifyList();
    return userVerifyList.includes(username);
}

function isUserBlocked(username) {
    const blockedUsers = loadBlockedUsers();
    return blockedUsers.includes(username);
}

function isRoomBlocked(roomName) {
    const blockedRooms = loadBlockedRooms();
    return blockedRooms.includes(roomName);
}
function isUserMasterOrInMasterList(username, roomName) {
    const rooms = loadRooms();
    
    // التحقق مما إذا كان المستخدم ماستر في الغرفة
    const room = rooms.find(r => r.roomName === roomName);
    if (room) {
        // التحقق من أن المستخدم ماستر في الغرفة أو في قائمة الماستر
        if (room.master === username || room.masterList.includes(username)) {
            return true; // المستخدم ماستر في الغرفة أو في قائمة الماستر
        }
    }
    
    // إذا لم يكن في الغرفة، تحقق من قائمة الماستر العامة
    const masterList = loadMasterList();
    if (masterList.includes(username)) {
        return true; // المستخدم موجود في قائمة الماستر العامة
    }

    return false; // إذا لم يكن في أي من القائمتين
}


// تحميل المستخدمين من الملف
function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
}

// حفظ المستخدمين في الملف
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}
function getUserProfileUrl(username) {
    const users = loadUsers();
    const user = users.find(u => u.username === username);
    if (user && user.profileUrl) {
      return user.profileUrl;
    } else {
      // إرجاع رابط افتراضي إذا لم يوجد المستخدم أو لم تكن له صورة
      return `https://api.multiavatar.com/${encodeURIComponent(username)}.png`;
    }
  }
function incrementUserGiftCount(username, type) {
    const users = loadUsers();

    const user = users.find(u => u.username === username);
    if (!user) return; // المستخدم غير موجود

    // تأكد من وجود الحقول
    if (typeof user.sentGifts !== 'number') user.sentGifts = 0;
    if (typeof user.receivedGifts !== 'number') user.receivedGifts = 0;

    if (type === 'sentGifts') user.sentGifts += 1;
    else if (type === 'receivedGifts') user.receivedGifts += 1;

    saveUsers(users);
}
// زيادة النقاط للمستخدم
function addPoints(username, amount = 1000) {
    
    const users = loadUsers();
    const user = users.find(u => u.username === username);
    if (user) {
        user.points = (user.points || 0) + amount;
        saveUsers(users);
        return user.points;
    }
    return null;
}

function getUserRooms(username) {
    const rooms = loadRooms();
    if (!Array.isArray(rooms)) return [];
  
    return rooms.flatMap(room => {
      const foundUser = room.users?.find(u => u.username === username);
      if (foundUser) {
        return [{ roomName: room.roomName, role: foundUser.role }];
      }
      return [];
    });
  }
  

 
// زيادة عداد قتل البيكاتشو
function incrementPikachuKills(username) {
    const users = loadUsers();
    const user = users.find(u => u.username === username);
    if (user) {
        user.pikachuKills = (user.pikachuKills || 0) + 1;
        saveUsers(users);
        return user.pikachuKills;
    }
    return null;
}

function checkUserExistsOrNotify(username, roomName, socket) {
    const users = loadUsers();
    const userExists = users.some(u => u.username === username);

    if (!userExists) {
        const lang = getUserLanguage(username) || 'en';

        const notifyMessage = lang === 'ar'
            ? `📢 عزيزي ${username}، يرجى مراسلة "ا◙☬ځُــۥـ☼ـڈ◄أڵـــســمـــٱ۽►ـۉد☼ــۥــۓ☬◙ا" لتوثيق الحساب.`
            : `📢 Dear ${username}, please contact "ا◙☬ځُــۥـ☼ـڈ◄أڵـــســمـــٱ۽►ـۉد☼ــۥــۓ☬◙ا" to verify your account.`;

        const msg = createRoomMessage(roomName, notifyMessage);
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify(msg));
        }
        return false;
    }

    return true;
}
// جلب عدد نقاط المستخدم
function getUserPoints(username) {
    const users = loadUsers();
    const user = users.find(u => u.username === username);
    return user ? (user.points || 0) : 0;
}
function updateTradeHistory(username, wasWin) {
    const users = loadUsers();
    let user = users.find(u => u.username === username);

    if (!user) return;

    // التأكد من وجود كائن سجل التداول
    if (!user.trades || typeof user.trades !== 'object') {
        user.trades = { win: 0, lose: 0 };
    }

    if (wasWin) {
        user.trades.win += 1;
    } else {
        user.trades.lose += 1;
    }

    saveUsers(users);
}

function getTradeStats(username) {
    const users = loadUsers();
    const user = users.find(u => u.username === username);

    if (!user || !user.trades || typeof user.trades !== 'object') {
        return { win: 0, lose: 0, total: 0, percent: 0 };
    }

    const { win, lose } = user.trades;
    const total = win + lose;
    const percent = total === 0 ? 0 : Math.round((win / total) * 100);

    return { win, lose, total, percent };
}






function loadGifts() {
    const filePath = path.join(__dirname, 'data', 'exampleGifts.json');

    // التحقق من وجود الملف
    if (!fs.existsSync(filePath)) {
        // إنشاء مجلد data إذا لم يكن موجودًا
        const dirPath = path.join(__dirname, 'data');
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }

        // إنشاء الملف مع بيانات افتراضية
        const defaultGifts = [
            { id: 1, name: 'Red Rose', urls: ['https://example.com/gift1.png'] },
            { id: 2, name: 'Chocolate Box', urls: ['https://example.com/gift2.png'] },
            { id: 3, name: 'Golden Trophy', urls: ['https://example.com/gift3.png'] }
        ];

        fs.writeFileSync(filePath, JSON.stringify(defaultGifts, null, 2), 'utf8');
        return defaultGifts;
    }

    // قراءة البيانات من الملف
    const data = fs.readFileSync(filePath, 'utf8');
    const gifts = JSON.parse(data);

    // اختيار رابط عشوائي لكل هدية
    gifts.forEach(gift => {
        const randomIndex = Math.floor(Math.random() * gift.urls.length);
        gift.url = gift.urls[randomIndex];  // اختيار رابط عشوائي
    });

    return gifts;
}


function loadGiftsAnimation() {
    const filePath = path.join(__dirname, 'data', 'gifts.json');

    // التحقق من وجود الملف
    if (!fs.existsSync(filePath)) {
        // إنشاء مجلد data إذا لم يكن موجودًا
        const dirPath = path.join(__dirname, 'data');
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }

        // إنشاء الملف مع بيانات افتراضية
        const defaultGifts = [
            { id: 1, name: 'Red Rose', urls: ['https://example.com/gift1.png'] },
            { id: 2, name: 'Chocolate Box', urls: ['https://example.com/gift2.png'] },
            { id: 3, name: 'Golden Trophy', urls: ['https://example.com/gift3.png'] }
        ];

        fs.writeFileSync(filePath, JSON.stringify(defaultGifts, null, 2), 'utf8');
        return defaultGifts;
    }

    // قراءة البيانات من الملف
    const data = fs.readFileSync(filePath, 'utf8');
    const gifts = JSON.parse(data);

    // اختيار رابط عشوائي لكل هدية
    gifts.forEach(gift => {
        const randomIndex = Math.floor(Math.random() * gift.urls.length);
        gift.url = gift.urls[randomIndex];  // اختيار رابط عشوائي
    });

    return gifts;
}

// دالة لعرض قائمة الهدايا المتاحة
function showAvailableGifts(socket, room) {
    const gifts = loadGifts();
    let message = '🎁 Available Gifts:\n';
    
    gifts.forEach(gift => {
        message += `${gift.id}. ${gift.name}\n`;
    });

    const giftListMessage = createRoomMessage(room, message);
    socket.send(JSON.stringify(giftListMessage));
}
// جلب مستخدمي غرفة معينة مع أدوارهم
function getUsersInRoom(roomName) {
  const rooms = loadRooms();
  const room = rooms.find(r => r.roomName === roomName);
  if (!room) {
    return null; // الغرفة غير موجودة
  }
  return room.users || [];
}


// دالة لتحديث عدد الرسائل في الغرفة عند إرسال رسالة
function incrementRoomMessageCount(roomName) {
  if (!roomName) return;

  const rooms = loadRooms();
  const roomIndex = rooms.findIndex(room => room.roomName === roomName);

  if (roomIndex === -1) return; // الغرفة غير موجودة

  // إضافة الخاصية إذا لم تكن موجودة فعلاً
  if (!rooms[roomIndex].hasOwnProperty("messageCount")) {
    rooms[roomIndex].messageCount = 0;
  }

  // زيادة عدد الرسائل بمقدار 1
  rooms[roomIndex].messageCount += 1;

  // حفظ التعديلات
  saveRooms(rooms);
}
function getTop10RoomsByMessages() {
  const rooms = loadRooms();

  // ترتيب الغرف تنازليًا حسب messageCount، وإذا لم تكن موجودة نعتبرها 0
  const sortedRooms = rooms
    .map(room => ({
      ...room,
      messageCount: room.hasOwnProperty("messageCount") ? room.messageCount : 0
    }))
    .sort((a, b) => b.messageCount - a.messageCount);

  // جلب أول 10 فقط
  const top10Rooms = sortedRooms.slice(0, 10);

  return top10Rooms;
}
function formatNumberShort(n) {
  if (n < 1000) return n.toString();

  const units = [
    "", "k", "M", "B", "T",  // ألف - مليون - مليار - تريليون
    "Q",   // Quadrillion
    "Qi",  // Quintillion
    "Sx",  // Sextillion
    "Sp",  // Septillion
    "Oc",  // Octillion
    "No"   // Nonillion
  ];

  const order = Math.floor(Math.log10(n) / 3);
  const unit = units[order] || `e${order * 3}`;
  const num = n / Math.pow(1000, order);

  return num % 1 === 0 ? `${num}${unit}` : `${num.toFixed(1)}${unit}`;
}

function setNotifyOnSearch(username, value) {
    const users = loadUsers();
  
    const user = users.find(u => u.username === username);
    if (!user) return false;
  
    user.notifyOnSearch = (value === 'true'); // التأكد من التحويل إلى Boolean
  
    saveUsers(users);
    return true;
  }
  

module.exports = {
    loadRooms,getUsersInRoom,getTop10RoomsByMessages, formatNumberShort,saveRooms,showAvailableGifts,loadGifts, roomExists, addRoom, saveUserLanguage, loadUserLanguage, getUserLanguage,
    loadMasterList, saveMasterList,incrementRoomMessageCount, isUserInMasterList,getUserPoints,
    loadAdminList, saveAdminList, isUserInAdminList,
    loadUserVerifyList, saveUserVerifyList, isUserVerified,
    loadBlockedUsers, saveBlockedUsers, isUserBlocked,
    loadBlockedRooms, saveBlockedRooms, isRoomBlocked,isUserMasterOrInMasterList,deleteRoom,  loadUsers,
    saveUsers,incrementUserGiftCount,updateUserPoints,
    addPoints,loadGiftsAnimation,
    incrementPikachuKills,checkUserExistsOrNotify,
    updateTradeHistory,   // ✅ هنا
    getTradeStats  ,
    getUserRooms   ,
    formatNumber,
    getUserProfileUrl,
    setNotifyOnSearch    // ✅ وهنا
};


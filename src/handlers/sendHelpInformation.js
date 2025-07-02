const { loadRooms, saveRooms, roomExists, addRoom } = require('../fileUtils');
const { createRoomMessage } = require('../messageUtils');

function sendHelpInformation(data, roomName, socket, currentLanguage) {
    let helpMessage = '';

    if (data.body.startsWith('info@1')) {
        if (currentLanguage === 'ar') {
            helpMessage = `
📝 أوامر الترحيب المتاحة:

1. setmsg@نص: لتعيين رسالة الترحيب. يمكنك استخدام علامة \`$\` لتمثيل اسم المستخدم. 
مثال: \`setmsg@أهلاً بك $ في الغرفة\` سيُرسل "أهلاً بك [اسم المستخدم] في الغرفة".

2. wec@on: لتفعيل رسالة الترحيب في الغرفة.

3. wec@off: لإيقاف رسالة الترحيب في الغرفة.

🔔 ملاحظة: علامة \`$\` سيتم استبدالها تلقائيًا باسم المستخدم عند إرسال رسالة الترحيب.
            `;
        } else {
            helpMessage = `
📝 Available welcome commands:

1. setmsg@text: Used to set the welcome message. You can use \`$\` to represent the username. 
Example: \`setmsg@Welcome $ to the room\` will send "Welcome [username] to the room".

2. wec@on: To enable the welcome message in the room.

3. wec@off: To disable the welcome message in the room.

🔔 Note: The \`$\` symbol will be replaced automatically with the username when sending the welcome message.
            `;
        }

    } else if (data.body.startsWith('info@2')) {
        if (currentLanguage === 'ar') {
            helpMessage = `
💊 شرح كلمات المخدرات:
عند كتابة أي كلمة مثل "حشيش" أو "بودرة" أو "برشام" داخل الغرفة، سيقوم البوت بإرسال ردود تلقائية تتفاعل مع الكلمة، وتخصم نقاط من المستخدم.

🧠 الهدف منها هو التوعية وتقديم تجربة تفاعلية، لكنها تؤثر على نقاطك بشكل سلبي.

📊 شرح كلمات البورصة:
عند كتابة كلمات مثل "تداول" أو "بيع" أو "شراء" أو "صعود" أو "هبوط"، يقوم البوت بمحاكاة عملية تداول حقيقية، يحسب من خلالها نسبة الربح أو الخسارة، ويحدث نقاطك.

⚠️ التداول يحتوي على نسبة مخاطرة، ويمكن أن تكسب أو تخسر بناءً على حظك ونقاطك الحالية.
            `;
        } else {
            helpMessage = `
💊 Drug-related keywords:
When typing words like "weed", "powder", or "pills", the bot responds automatically and deducts points from the user.

🧠 This feature is for awareness and interactive fun, but it negatively affects your points.

📊 Stock Market keywords:
Typing words like "trade", "sell", "buy", "up", or "down" simulates a trading action. The bot will calculate profit or loss percentage and update your points accordingly.

⚠️ Trading carries a risk, and you may win or lose based on luck and your current points.
            `;
        }
    } else if (data.body.startsWith('info@3')) {
        if (currentLanguage === 'ar') {
            helpMessage = `
⚙️ شرح أوامر الصلاحيات (الرتب):

- o@اسم_المستخدم أو owner@اسم_المستخدم: لجعل المستخدم مالك الغرفة.
- a@اسم_المستخدم: لجعل المستخدم مشرف.
- m@اسم_المستخدم أو member@اسم_المستخدم: لجعل المستخدم عضو.
- n@اسم_المستخدم أو none@اسم_المستخدم: لإزالة جميع الرتب من المستخدم.
- b@اسم_المستخدم أو ban@اسم_المستخدم: لحظر المستخدم.
- k@اسم_المستخدم أو kick@اسم_المستخدم: لطرد المستخدم من الغرفة.

يرجى استبدال \`اسم_المستخدم\` باسم المستخدم المستهدف.
            `;
        } else {
            helpMessage = `
⚙️ Permissions (roles) commands explanation:

- o@username or owner@username: Make user room owner.
- a@username: Make user admin.
- m@username or member@username: Make user member.
- n@username or none@username: Remove all roles from user.
- b@username or ban@username: Ban the user.
- k@username or kick@username: Kick the user from the room.

Please replace \`username\` with the targeted username.
            `;
        }
    } else if (data.body.startsWith('info@4')) {
        if (currentLanguage === 'ar') {
            helpMessage = `
🎁 أوامر الهدايا والتفاعل:

- svip@اسم_المستخدم: إرسال هدية خاصة (هدية سوبر VIP) للمستخدم.
- gfg: طلب قائمة الهدايا المتاحة.
- gfg@رقم_الهدية: اختيار هدية معينة من القائمة وإرسالها.
            `;
        } else {
            helpMessage = `
🎁 Gift and interaction commands:

- svip@username: Send a special super VIP gift to a user.
- gfg: Request the list of available gifts.
- gfg@gift_number: Select a specific gift from the list and send it.
            `;
        }
    } else if (data.body.startsWith('info@5')) {
        if (currentLanguage === 'ar') {
            helpMessage = `
🎵 أوامر تشغيل الأغاني والتفاعل معها:

- play <اسم_الأغنية> أو تشغيل <اسم_الأغنية>: لتشغيل أغنية معينة.
- like@رقم_الأغنية: للإعجاب بأغنية.
- dislike@رقم_الأغنية: عدم الإعجاب بالأغنية.
- com@رقم_الأغنية: لإضافة تعليق على الأغنية.
- gift@رقم_الأغنية أو share@رقم_الأغنية: لمشاركة أو إرسال هدية مع الأغنية.
- image <رابط_الصورة> أو صورة <رابط_الصورة>: لعرض صورة في الغرفة.
            `;
        } else {
            helpMessage = `
🎵 Music play and interaction commands:

- play <song_name> or تشغيل <song_name>: To play a specific song.
- like@song_number: Like a song.
- dislike@song_number: Dislike a song.
- com@song_number: Add comment to a song.
- gift@song_number or share@song_number: Share or send gift with the song.
- image <image_url> or صورة <image_url>: Show an image in the room.
            `;
        }
    }    else if (data.body.startsWith('info@6')) {
        if (currentLanguage === 'ar') {
            helpMessage = `
🚫 أوامر الكلمات المحظورة:

🔹 حظر الكلمات في أسماء المستخدمين:
- bwname@add@كلمة: لإضافة كلمة ممنوعة في أسماء المستخدمين.
- bwname@rm@كلمة: لإزالة كلمة من قائمة الحظر.
- bwname@list: عرض قائمة الكلمات المحظورة.
- bwname@on: تفعيل نظام الحظر للأسماء.
- bwname@off: تعطيل نظام الحظر للأسماء.

🔹 حظر الكلمات في الرسائل:
- bwmsg@add@كلمة: لإضافة كلمة ممنوعة في الرسائل.
- bwmsg@rm@كلمة: لإزالة كلمة من قائمة الحظر.
- bwmsg@list: عرض قائمة الكلمات المحظورة.
- bwmsg@on: تفعيل نظام الحظر للرسائل.
- bwmsg@off: تعطيل نظام الحظر للرسائل.

⚠️ سيتم اتخاذ إجراءات عند استخدام كلمات ممنوعة بحسب إعدادات الغرفة.
            `;
        } else {
            helpMessage = `
🚫 Banned words commands:

🔹 Ban words in usernames:
- bwname@add@word: Add a banned word for usernames.
- bwname@rm@word: Remove a banned word.
- bwname@list: Show banned words list.
- bwname@on: Enable banned words filter for usernames.
- bwname@off: Disable banned words filter for usernames.

🔹 Ban words in messages:
- bwmsg@add@word: Add a banned word for messages.
- bwmsg@rm@word: Remove a banned word.
- bwmsg@list: Show banned words list.
- bwmsg@on: Enable banned words filter for messages.
- bwmsg@off: Disable banned words filter for messages.

⚠️ Actions will be taken if banned words are used, based on the room's configuration.
            `;
        }
    }else if (data.body.startsWith('info@7')) {
    if (currentLanguage === 'ar') {
        helpMessage = `
🤖 أوامر البوت الصامت:

🔹 إدخال بوت صامت إلى غرفة:
- SB@username@password@room
➡️ مثال: SB@tebot@pass123@myroom
▪️ يقوم بإدخال البوت باسم (username) إلى الغرفة (room) بكلمة المرور (password).
▪️ يتم حفظ الغرفة باسمك كمالك للغرفة الصامتة، ولا يمكن لأي شخص إخراجها إلا أنت.

🔹 حذف غرفة معينة من الغرف الصامتة:
- RSB@username@room
➡️ مثال: RSB@tebot@myroom
▪️ يقوم بحذف البوت (username) من الغرفة (room) إذا كنت أنت من أدخلته.

🔹 حذف جميع الغرف المسجلة لهذا البوت:
- RSB@username
➡️ مثال: RSB@tebot
▪️ يحذف كل الغرف التي أدخلها هذا البوت بشرط أن تكون أنت من أضافها.

⚠️ ملاحظات هامة:
- لا يمكن إضافة بوت لغرفة إذا كان نفس البوت موجودًا في قائمة الغرف الأساسية.
- لا يمكن إضافة غرفة للبوت إذا كان نفس البوت موجودًا في قائمة الغرف الصامتة.
        `;
    } else {
        helpMessage = `
🤖 Silent bot commands:

🔹 Add a silent bot to a room:
- SB@username@password@room
➡️ Example: SB@tebot@pass123@myroom
▪️ Adds the bot (username) to the room (room) with the given password.
▪️ The room is saved under your account as the master, and only you can remove it.

🔹 Remove a specific room for this bot:
- RSB@username@room
➡️ Example: RSB@tebot@myroom
▪️ Removes the bot (username) from the room (room) if you were the one who added it.

🔹 Remove all rooms for this bot:
- RSB@username
➡️ Example: RSB@tebot
▪️ Removes all rooms that this bot is in under your account.

⚠️ Important notes:
- You cannot add a bot to a silent room if it already exists in the main room list.
- You cannot add a bot to the main room list if it already exists in silent rooms.
        `;
    }
}



    if (helpMessage) {
        const helpMessageObject = createRoomMessage(roomName, helpMessage);
        socket.send(JSON.stringify(helpMessageObject));
        console.log('📘 Sent help message for:', data.body, roomName);
    }
}

module.exports = {
    sendHelpInformation
};

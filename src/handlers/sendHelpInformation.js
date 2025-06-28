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

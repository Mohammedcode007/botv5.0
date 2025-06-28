const axios = require('axios');
const { createRoomMessage, createMainImageMessage, createChatMessage } = require('../messageUtils');
const { getUserLanguage } = require('../fileUtils');

// تخزين الصور النشطة: معرف صغير => بيانات الصورة
const activeImages = {};

// دالة توليد معرف قصير عشوائي (6 أحرف)
function generateShortId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}
async function translateToEnglish(text) {
  try {
    const response = await axios.post('https://libretranslate.de/translate', {
      q: text,
      source: 'ar',
      target: 'en',
      format: 'text'
    }, {
      headers: { 'accept': 'application/json' }
    });

    return response.data.translatedText;
  } catch (error) {
    console.error('❌ خطأ في الترجمة:', error.message);
    return text; // fallback to original if translation fails
  }
}

// دالة البحث عن الصور عبر Pixabay API

async function searchImages(query) {
  const API_KEY = '50313598-7829614b67907d1ba22ef29df';

  if (!query || typeof query !== 'string' || query.trim() === '') {
    console.error('⚠️ قيمة البحث غير صالحة');
    return [];
  }

  try {
    const translatedQuery = await translateToEnglish(query);

    const response = await axios.get('https://pixabay.com/api/', {
      params: {
        key: API_KEY,
        q: translatedQuery,
        image_type: 'photo',
        per_page: 5,
        safesearch: true
      }
    });

    console.log(response.data);
    return response.data.hits;
  } catch (error) {
    console.error('❌ خطأ أثناء البحث عن الصور:', error.response?.data || error.message);
    return [];
  }
}




// دالة تنفيذ أمر عرض صورة في الغرفة
async function handleShowImageCommand(data, socket, senderName) {
  const body = data.body.trim();
  if (!body.startsWith('image ') && !body.startsWith('صورة ')) return;

  const imageQuery = body.split(' ').slice(1).join(' ').trim();
  if (!imageQuery) return;

  const lang = getUserLanguage(senderName) || 'ar';

  const loadingMsg = lang === 'ar'
    ? '⏳ جارٍ البحث عن الصورة... يرجى الانتظار'
    : '⏳ Searching for image... please wait';

  socket.send(JSON.stringify(createRoomMessage(data.room, loadingMsg)));

  try {
    const results = await searchImages(imageQuery);
    if (!results || results.length === 0) {
      const msg = lang === 'ar'
        ? `❗ لم يتم العثور على أي صورة لكلمة: "${imageQuery}"`
        : `❗ No image found for: "${imageQuery}"`;
      socket.send(JSON.stringify(createRoomMessage(data.room, msg)));
      return;
    }

    const image = results[0];
    let imageId;
    do {
      imageId = generateShortId();
    } while (activeImages[imageId]);

    activeImages[imageId] = {
      id: imageId,
      url: image.largeImageURL,
      tags: image.tags,
      user: image.user,
      room: data.room,
      sender: senderName,
    };

    // إرسال صورة مع رسالة نصية مع الأوامر للتفاعل (مثلاً لايك، تعليق، مشاركة)
    socket.send(JSON.stringify(createMainImageMessage(data.room, image.largeImageURL)));

    const text = lang === 'ar'
      ?
      `🖼️ ${senderName} عرض صورة بعنوان: "${image.tags}"

(المعرف: ${imageId})

يمكنك التفاعل مع الصورة باستخدام الأوامر التالية:

❤️ إعجاب: like@${imageId}

💬 تعليق: com@${imageId}@username نص_تعليقك

📤 مشاركة الصورة: sh@${imageId}@اسم_المستخدم`
      :
      `🖼️ ${senderName} showed an image titled: "${image.tags}"

(ID: ${imageId})

You can interact with the image using the following commands:

❤️ Like: like@${imageId}

💬 Comment: com@${imageId}@username your comment

📤 Share the image: sh@${imageId}@username`;

    socket.send(JSON.stringify(createRoomMessage(data.room, text)));

  } catch (error) {
    const msg = lang === 'ar'
      ? '❌ حدث خطأ أثناء البحث عن الصورة.'
      : '❌ An error occurred while searching for the image.';
    socket.send(JSON.stringify(createRoomMessage(data.room, msg)));
    console.error(error);
  }
}

// دالة التعامل مع التفاعلات على الصور: like@id, comment@id نص
function handleImageReaction(data, actionType, socket) {
  const sender = data.from;
  const room = data.room;
  const body = data.body.trim();

  const parts = body.split('@');
  if (parts.length < 2) return;

  const imageId = parts[1].trim();
  const comment = parts.slice(2).join('@').trim();

  const image = activeImages[imageId];
  if (!image) {
    socket.send(JSON.stringify(createChatMessage(sender, `❗ لم يتم العثور على الصورة بهذا المعرف: ${imageId}`)));
    return;
  }

  const targetUser = image.sender;

  let privateMsg = '';
  if (actionType === 'like') privateMsg = `❤️ ${sender} أعجب بالصورة التي عرضتها.`;
  if (actionType === 'comment') privateMsg = `💬 ${sender} علّق على صورتك: ${comment}`;

  socket.send(JSON.stringify(createChatMessage(targetUser, privateMsg)));

  let publicMsg = '';
  if (actionType === 'like') publicMsg = `❤️ ${sender} أعجب بصورة ${targetUser}`;
  if (actionType === 'comment') publicMsg = `💬 ${sender} علّق على صورة ${targetUser}`;

  socket.send(JSON.stringify(createRoomMessage(room, publicMsg)));
}

// التصدير
module.exports = {
  searchImages,
  handleShowImageCommand,
  handleImageReaction,
  activeImages
};

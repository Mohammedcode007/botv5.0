
const axios = require('axios');
const cheerio = require('cheerio');
const { loadRooms, incrementUserGiftCount, loadUsers, getUserLanguage, loadGifts } = require('../fileUtils');
const { createRoomMessage, createAudioRoomMessage, createChatMessage,createMainImageMessage,createGiftMessage } = require('../messageUtils');
const { exec } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer');

const ytdl = require('@distube/ytdl-core');
const ytSearch = require('yt-search');
const cookiesPath = path.join(__dirname, '..', '..', 'cookies.txt'); // مسار ملف الكوكيز

const ytDlpPath = path.join(__dirname, '..', '..', 'yt-dlp.exe');
// تخزين الأغاني النشطة: معرف صغير => بيانات الأغنية
const activeSongs = {};



// // دالة توليد معرف قصير عشوائي للأغنية (6 أحرف أرقام وحروف)
function generateShortId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}





function getAudioUrl(videoUrl) {
  return new Promise((resolve, reject) => {
    const cmd = `"${ytDlpPath}" -f bestaudio -g --cookies "${cookiesPath}" "${videoUrl}"`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) return reject(error);
      resolve(stdout.trim());
    });
  });
}

async function searchSongMp3(songName) {
  try {
    const result = await ytSearch(songName);
    const video = result.videos.length > 0 ? result.videos[0] : null;
    if (!video) return null;

    const info = await ytdl.getInfo(video.url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

    return {
      title: video.title,
      ytUrl: video.url,
      mp3Url: format.url,
      thumb: video.thumbnail || video.image,
    };
  } catch (err) {
    console.error('Search or Download Error:', err.message);
    return null;
  }
}




const activeImages = {}; // تخزين الصور حسب معرف فريد مشابه للأغاني

function generateShortId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

async function searchBingImage(keyword) {
  const query = encodeURIComponent(keyword);
  const url = `https://www.bing.com/images/search?q=${query}`;

  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const $ = cheerio.load(data);
    const firstImage = $('a.iusc').first().attr('m');

    if (firstImage) {
      const json = JSON.parse(firstImage);
      return json.murl;
    }

    return null;
  } catch (error) {
    console.error('Error fetching image from Bing:', error.message);
    return null;
  }
}


async function handleImageSearchCommand(data, socket, senderName) {
  const body = data.body.trim().toLowerCase();

  if (
    !body.startsWith('.img ') &&
    !body.startsWith('img ') &&
    !body.startsWith('صوره ') &&
    !body.startsWith('صورة ')
  ) return;

  const keyword = body.split(' ').slice(1).join(' ').trim();
  if (!keyword) return;

  try {
    // استخدام Puppeteer لجلب رابط صورة من بحث جوجل
    const imageUrl = await searchBingImage(keyword);
    if (!imageUrl) {
      console.error('No image found on Google Images for:', keyword);
      return;
    }

    const imageId = generateShortId();

    // تخزين بيانات الصورة
    activeImages[imageId] = {
      id: imageId,
      url: imageUrl,
      sender: senderName,
      room: data.room,
      keyword,
    };

    // إرسال الصورة فقط دون وصف
    const imageMessage = createMainImageMessage(data.room, imageUrl);
    socket.send(JSON.stringify(imageMessage));

    // إرسال رسالة اختيارية تحفز على الإهداء
    const note = `🎁 To gift this image, type: gft@${imageId}@username`;
    socket.send(JSON.stringify(createRoomMessage(data.room, note)));

  } catch (error) {
    console.error('Google Image search error:', error.message);
  }
}


// async function handleImageSearchCommand(data, socket, senderName) {
//   const body = data.body.trim().toLowerCase();

//   if (
//     !body.startsWith('.img ') &&
//     !body.startsWith('img ') &&
//     !body.startsWith('صوره ') &&
//     !body.startsWith('صورة ')
//   ) return;

//   const keyword = body.split(' ').slice(1).join(' ').trim();
//   if (!keyword) return;

//   try {
//     const response = await axios.get('https://api.unsplash.com/search/photos', {
//       params: { query: keyword, per_page: 1 },
//       headers: {
//         Authorization: 'Client-ID aq-u8R0fgFn-me82Trf1GgwyTP2vdtJmIsB8VBDXIzc'
//       }
//     });

//     const images = response.data.results;
//     if (!images || images.length === 0) return;

//     const imageUrl = images[0].urls.regular;
//     const imageId = generateShortId();

//     // تخزين بيانات الصورة
//     activeImages[imageId] = {
//       id: imageId,
//       url: imageUrl,
//       sender: senderName,
//       room: data.room,
//       keyword,
//     };

//     // إرسال الصورة فقط دون وصف
//     const imageMessage = createMainImageMessage(data.room, imageUrl);
//     socket.send(JSON.stringify(imageMessage));

//     // إرسال رسالة اختيارية تحفز على الإهداء
//     const note = `🎁 To gift this image, type: gft@${imageId}@username`;
//     socket.send(JSON.stringify(createRoomMessage(data.room, note)));

//   } catch (error) {
//     console.error('Unsplash search error:', error.message);
//   }
// }

function handleImageGiftsearch(data, socket, senderName, ioSockets) {
  const body = data.body.trim();
  if (!body.toLowerCase().startsWith('gft@')) return;

  const parts = body.split('@');
  if (parts.length < 3) return;

  const imageId = parts[1].trim();
  const targetUser = parts[2].trim();

  const imageData = activeImages[imageId];
  if (!imageData) {
    socket.send(JSON.stringify(createRoomMessage(data.room, `❗ Image not found.`)));
    return;
  }

  const lang = getUserLanguage(senderName) || 'ar';
  const imageUrl = imageData.url;
  const imageMsg = createMainImageMessage(targetUser, imageUrl);
  const allRooms = loadRooms();

  // رسالة البث الموحدة
  const broadcastText =
    lang === 'ar'
      ? `🎁 هدية بصرية جميلة من ${senderName} إلى ${targetUser}! 📸`
      : `🎁 A beautiful visual gift from ${senderName} to ${targetUser}! 📸`;

  for (const room of allRooms) {
    const roomSocket = ioSockets[room.roomName];
    if (roomSocket && roomSocket.readyState === 1) {
      // إرسال الرسالة النصية في كل غرفة
      roomSocket.send(JSON.stringify(
        createRoomMessage(room.roomName, broadcastText)
      ));

      // إرسال الصورة في كل غرفة
      roomSocket.send(JSON.stringify(
        createMainImageMessage(room.roomName, imageUrl)
      ));
    }
  }

  // إرسال الصورة للمستخدم المستهدف بشكل خاص
  if (ioSockets[targetUser] && ioSockets[targetUser].readyState === 1) {
    ioSockets[targetUser].send(JSON.stringify(imageMsg));
  }

  // تأكيد للمرسل
  const confirmText =
    lang === 'ar'
      ? `✅ تم إرسال الصورة كهدية إلى ${targetUser}`
      : `✅ The image was gifted to ${targetUser}`;
  socket.send(JSON.stringify(createChatMessage(senderName, confirmText)));
}



async function handlePlayCommand(data, socket, senderName) {
  
  const body = data.body.trim();
  if (!body.startsWith('play ') && !body.startsWith('تشغيل ')) return;

  const songName = body.split(' ').slice(1).join(' ').trim();
  if (!songName) return;

  const lang = getUserLanguage(senderName) || 'ar';

  const loadingMsg = lang === 'ar'
    ? '⏳ جارٍ تحميل طلبك... يرجى الانتظار قليلاً'
    : '⏳ Loading your request... please wait a moment';
  socket.send(JSON.stringify(createRoomMessage(data.room, loadingMsg)));

  try {
    const song = await searchSongMp3(songName);
    if (!song) {
      const msg = lang === 'ar'
        ? `❗ لم يتم العثور على أي أغنية بعنوان: "${songName}"`
        : `❗ No track found for: "${songName}"`;
      socket.send(JSON.stringify(createRoomMessage(data.room, msg)));
      return;
    }

    // توليد معرف قصير فريد للأغنية
    let songId;
    do {
      songId = generateShortId();
    } while (activeSongs[songId]);

    activeSongs[songId] = {
      id: songId,
      title: song.title,
      url: song.mp3Url,
      sender: senderName,
      room: data.room
    };

    // إرسال الأغنية كرابط صوتي
    socket.send(JSON.stringify(createAudioRoomMessage(data.room, song.mp3Url)));

    const text = lang === 'ar'
    ? `
🎵 "${song.title}" (طلب: ${senderName})\nID: ${songId}
❤️ like@${songId}
👎 dislike@${songId}
`
    : `
🎵 "${song.title}" (by ${senderName})\nID: ${songId}
❤️ like@${songId}
👎 dislike@${songId}
  `
  ;
  

    socket.send(JSON.stringify(createRoomMessage(data.room, text)));

  } catch (error) {
    const msg = lang === 'ar'
      ? `❌ حدث خطأ أثناء البحث أو جلب رابط الأغنية.`
      : `❌ An error occurred while searching or fetching the audio link.`;
    socket.send(JSON.stringify(createRoomMessage(data.room, msg)));
    console.error(error);
  }
}

// دالة التعامل مع التفاعلات على الأغاني: like@id, dislike@id, comment@id نص
function handleSongReaction(data, actionType, socket) {
  const sender = data.from;
  const room = data.room;
  const body = data.body.trim();

  const parts = body.split('@');
  if (parts.length < 2) return;

  const songId = parts[1].trim();
  const comment = parts.slice(2).join('@').trim();

  const song = activeSongs[songId];
  if (!song) {
    socket.send(JSON.stringify(createChatMessage(sender, `❗ لم يتم العثور على الأغنية بهذا المعرف: ${songId}`)));
    return;
  }

  const targetUser = song.sender;

  let privateMsg = '';
  if (actionType === 'like') privateMsg = `❤️ ${sender} أعجب بالأغنية "${song.title}" التي قمت بتشغيلها.`;
  if (actionType === 'dislike') privateMsg = `👎 ${sender} لم يُعجبه تشغيلك لأغنية "${song.title}".`;
  if (actionType === 'comment') privateMsg = `💬 ${sender} علّق على أغنيتك "${song.title}": ${comment}`;

  socket.send(JSON.stringify(createChatMessage(targetUser, privateMsg)));

  let publicMsg = '';
  if (actionType === 'like') publicMsg = `❤️ ${sender} أعجب بأغنية ${targetUser}`;
  if (actionType === 'dislike') publicMsg = `👎 ${sender} لم يعجبه اختيار ${targetUser}`;
  if (actionType === 'comment') publicMsg = `💬 ${sender} علّق على أغنية ${targetUser}`;

  socket.send(JSON.stringify(createRoomMessage(room, publicMsg)));
}

// دالة التعامل مع المشاركة (sh@id@username) والهدايا (gift@id@username)
function handleSongShare(data, socket) {
  
  const sender = data.from;
  const lang = getUserLanguage(sender) || 'ar';
  const body = data.body.trim();

  const parts = body.split('@');
  if (parts.length < 3) return;

  const action = parts[0].toLowerCase();
  const songId = parts[1].trim();
  const targetUser = parts[2].trim();

  const song = activeSongs[songId];
  if (!song) {
    const notFoundMsg = lang === 'ar'
      ? `❗ لم يتم العثور على الأغنية بهذا المعرف: ${songId}`
      : `❗ Song with ID ${songId} not found.`;
    socket.send(JSON.stringify(createChatMessage(sender, notFoundMsg)));
    return;
  }

  // إرسال الأغنية للمستلم
  socket.send(JSON.stringify(createAudioRoomMessage(targetUser, song.url, song.duration)));

  const giftText = action === 'gift'
    ? (lang === 'ar'
      ? `🎁 ${sender} أرسل لك أغنية كهدية: "${song.title}"`
      : `🎁 ${sender} sent you a song as a gift: "${song.title}"`)
    : (lang === 'ar'
      ? `📤 ${sender} شارك معك أغنية: "${song.title}"`
      : `📤 ${sender} shared a song with you: "${song.title}"`);

  socket.send(JSON.stringify(createChatMessage(targetUser, giftText)));

  const confirmText = action === 'gift'
    ? (lang === 'ar'
      ? `✅ تم إرسال الأغنية "${song.title}" كهدية إلى ${targetUser}`
      : `✅ Song "${song.title}" was sent as a gift to ${targetUser}`)
    : (lang === 'ar'
      ? `✅ تم مشاركة الأغنية "${song.title}" مع ${targetUser}`
      : `✅ Song "${song.title}" was shared with ${targetUser}`);

  socket.send(JSON.stringify(createChatMessage(sender, confirmText)));
}

// async function handlePlaySongInAllRooms(data, socket, senderName, ioSockets) {
//   const body = data.body.trim();
//   if (!body.startsWith('.ps ')) return;

//   const songName = body.slice(4).trim();
//   if (!songName) return;

//   const lang = getUserLanguage(senderName) || 'ar';

//   const loadingMsg = lang === 'ar'
//     ? '📡 جارٍ إرسال الأغنية لجميع الغرف...'
//     : '📡 Sending the song to all rooms...';
//   socket.send(JSON.stringify(createRoomMessage(data.room, loadingMsg)));

//   try {
//     const song = await searchSongMp3(songName);
//     if (!song) {
//       const notFoundMsg = lang === 'ar'
//         ? `❗ لم يتم العثور على أغنية بعنوان "${songName}"`
//         : `❗ No song found for "${songName}"`;
//       socket.send(JSON.stringify(createRoomMessage(data.room, notFoundMsg)));
//       return;
//     }

//     // توليد معرف فريد
//     let songId;
//     do {
//       songId = generateShortId();
//     } while (activeSongs[songId]);

//     // حفظ بيانات الأغنية
//     activeSongs[songId] = {
//       id: songId,
//       title: song.title,
//       url: song.mp3Url,
//       sender: senderName,
//     };

//     const audioMsg = createAudioRoomMessage('', song.mp3Url);
//     const textMsg = createRoomMessage('', `🎶 "${song.title}"\n❤️ like@${songId} | 💬 com@${songId}@username@تعليق`);

//     const allRooms = loadRooms(); // تأكد أن الدالة لا تحتاج مسار

//     for (const room of allRooms) {
//       const roomName = room.roomName;
//       const roomSocket = ioSockets[roomName];

//       if (roomSocket && roomSocket.readyState === 1) {
//         audioMsg.room = roomName;
//         textMsg.room = roomName;

//         roomSocket.send(JSON.stringify(audioMsg));
//         roomSocket.send(JSON.stringify(textMsg));
//       }
//     }

//     const confirmMsg = lang === 'ar'
//       ? `✅ تم إرسال الأغنية "${song.title}" إلى جميع الغرف.`
//       : `✅ The song "${song.title}" was sent to all rooms.`;
//     socket.send(JSON.stringify(createRoomMessage(data.room, confirmMsg)));

//   } catch (error) {
//     const errMsg = lang === 'ar'
//       ? `❌ حدث خطأ أثناء إرسال الأغنية.`
//       : `❌ Error occurred while sending the song.`;
//     socket.send(JSON.stringify(createRoomMessage(data.room, errMsg)));
//     console.error(error);
//   }
// }


async function handlePlaySongInAllRooms(data, socket, senderName, ioSockets) {
  const body = data.body.trim();
  if (!body.startsWith('.ps ')) return;

  const songName = body.slice(4).trim();
  if (!songName) return;

  const lang = getUserLanguage(senderName) || 'ar';

  const loadingMsg = lang === 'ar'
    ? '📡 جارٍ إرسال الأغنية إلى جميع الغرف...'
    : '📡 Sending the song to all rooms...';
  socket.send(JSON.stringify(createRoomMessage(data.room, loadingMsg)));

  try {
    const song = await searchSongMp3(songName);
    if (!song) {
      const notFoundMsg = lang === 'ar'
        ? `❗ لم يتم العثور على أغنية بعنوان "${songName}"`
        : `❗ No song found for "${songName}"`;
      socket.send(JSON.stringify(createRoomMessage(data.room, notFoundMsg)));
      return;
    }


    // توليد معرف فريد للأغنية
    let songId;
    do {
      songId = generateShortId();
      
    } while (activeSongs[songId]);

    activeSongs[songId] = {
      id: songId,
      title: song.title,
      url: song.mp3Url,
      sender: senderName,
    };

    // تحضير الرسائل
    const audioMsg = createAudioRoomMessage('', song.mp3Url);
const textMsg = createRoomMessage(
  '',
  `
【🎙️𝐑𝐚𝐝𝐢𝐨 𝐁𝐫𝐨𝐚𝐝𝐜𝐚𝐬𝐭 】

𝐑𝐨𝐨𝐦: 『 ${data.room} 』
𝐍𝐨𝐰 𝐏𝐥𝐚𝐲𝐢𝐧𝐠: ❝ ${song.title} ❞
𝐑𝐞𝐪𝐮𝐞𝐬𝐭𝐞𝐝 𝐁𝐲: ⟪ ${senderName} ⟫

𝐋𝐢𝐤𝐞 ➤ like@${songId}
𝐃𝐢𝐬𝐥𝐢𝐤𝐞 ➤ dislike@${songId}
𝐂𝐨𝐦𝐦𝐞𝐧𝐭 ➤ com@${songId}@your message
`
);

    

    const allRooms = loadRooms();

    for (const room of allRooms) {
      const roomName = room.roomName;
      const roomSocket = ioSockets[roomName];

      if (roomSocket && roomSocket.readyState === 1) {
        // تحديد الغرفة لكل رسالة
        audioMsg.room = roomName;
        textMsg.room = roomName;

        // إرسال الصورة الرئيسية إن وجدت
        if (song.thumb) {
          const imageMsg = createMainImageMessage(roomName, song.thumb);
          roomSocket.send(JSON.stringify(imageMsg));
        }

        // إرسال الصوت والنص
        roomSocket.send(JSON.stringify(audioMsg));
        roomSocket.send(JSON.stringify(textMsg));
      }
    }

    const confirmMsg = lang === 'ar'
      ? `✅ تم إرسال "${song.title}" إلى جميع الغرف بنجاح.`
      : `✅ "${song.title}" was broadcast to all rooms successfully.`;
    socket.send(JSON.stringify(createRoomMessage(data.room, confirmMsg)));

  } catch (error) {
    const errMsg = lang === 'ar'
      ? `❌ حدث خطأ أثناء إرسال الأغنية.`
      : `❌ Error occurred while broadcasting the song.`;
    socket.send(JSON.stringify(createRoomMessage(data.room, errMsg)));
    console.error(error);
  }
}

// التصدير
module.exports = {
  // searchTrack,
  // getClientId,
  handlePlayCommand,
  handleSongReaction,
  handleSongShare,
  handlePlaySongInAllRooms,
  handleImageSearchCommand,
  activeSongs,
  handleImageGiftsearch
};

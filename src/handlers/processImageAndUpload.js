

// const { createCanvas, loadImage } = require('canvas');
// const sharp = require('sharp');
// const axios = require('axios');
// const FormData = require('form-data');
// const fetch = require('node-fetch');

// async function processImageAndUpload(imageUrl, imgbbApiKey, overlayImageUrl, frameImageUrl) {
//   try {
//     console.log('🚀 بدء معالجة الصورة...');

//     // ✅ تحميل صورة الخلفية وعمل ضبابية
//     const baseBuffer = await (await fetch(imageUrl)).buffer();
//     const blurredBaseBuffer = await sharp(baseBuffer)
//       .resize({ width: 1000, height: 1000 }) // تأكد أن الصورة مربعة لتكون دائرة
//       .blur(20)
//       .toBuffer();

//     const baseImage = await loadImage(blurredBaseBuffer);
//     const size = Math.min(baseImage.width, baseImage.height);
//     const canvas = createCanvas(size, size);
//     const ctx = canvas.getContext('2d');

//     // ✅ عمل قص للخلفية على شكل دائرة
//     ctx.beginPath();
//     ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2, true);
//     ctx.closePath();
//     ctx.clip();

//     // ✅ رسم الخلفية
//     ctx.drawImage(baseImage, 0, 0, size, size);

//     // ✅ تحميل التراكب (الصورة الأمامية)
//     const overlayBuffer = await (await fetch(overlayImageUrl)).buffer();
//     const overlayImage = await loadImage(overlayBuffer);

//     const maxOverlayWidth = size / 2.5;
//     const overlayWidth = Math.min(overlayImage.width, maxOverlayWidth);
//     const overlayHeight = (overlayImage.height / overlayImage.width) * overlayWidth;

//     const x = (size - overlayWidth) / 2;
//     const y = (size - overlayHeight) / 2;

//     ctx.shadowColor = 'rgba(0,0,0,0.6)';
//     ctx.shadowBlur = 30;
//     ctx.drawImage(overlayImage, x, y, overlayWidth, overlayHeight);
//     ctx.shadowBlur = 0;

//     // ✅ إضافة الإطار إن وجد
//     if (frameImageUrl) {
//       const frameBuffer = await (await fetch(frameImageUrl)).buffer();
//       const frameImage = await loadImage(frameBuffer);

//       const framePadding = overlayWidth * 0.5;
//       const frameX = x - framePadding;
//       const frameY = y - framePadding;
//       const frameW = overlayWidth + framePadding * 2;
//       const frameH = overlayHeight + framePadding * 2;

//       ctx.drawImage(frameImage, frameX, frameY, frameW, frameH);
//     }

//     // ✅ إخراج الصورة النهائية
//     const outBuffer = canvas.toBuffer('image/png');

//     // ✅ تجهيز نموذج الرفع
//     const form = new FormData();
//     form.append('image', outBuffer.toString('base64'));

//     const uploadRes = await axios.post(
//       `https://api.imgbb.com/1/upload?key=${imgbbApiKey}`,
//       form,
//       { headers: form.getHeaders() }
//     );

//     const imageLink = uploadRes.data.data.url;
//     console.log('✅ تم رفع الصورة بنجاح:', imageLink);
//     return imageLink;

//   } catch (err) {
//     console.error('❌ خطأ في معالجة أو رفع الصورة:', err.message);
//     return null;
//   }
// }

// module.exports = {
//   processImageAndUpload
// };
const { createCanvas, loadImage } = require('canvas');
const sharp = require('sharp');
const fetch = require('node-fetch');
const GIFEncoder = require('gifencoder');
const axios = require('axios');
const FormData = require('form-data');

async function processAnimatedImageAndUpload(imageUrl, imgbbApiKey, overlayImageUrl, frameImageUrl) {
  try {
    const size = 500;
    const encoder = new GIFEncoder(size, size + 60); // مساحة إضافية للنص أسفل الصورة
    const canvas = createCanvas(size, size + 60);
    const ctx = canvas.getContext('2d');

    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(100);
    encoder.setQuality(10);

    // تحميل الخلفية مع ضبابية أخف
    const baseBuffer = await (await fetch(imageUrl)).buffer();
    const blurredBaseBuffer = await sharp(baseBuffer).resize(size, size).blur(5).toBuffer();
    const baseImage = await loadImage(blurredBaseBuffer);

    const overlayBuffer = await (await fetch(overlayImageUrl)).buffer();
    const overlayImage = await loadImage(overlayBuffer);

    const frameBuffer = await (await fetch(frameImageUrl)).buffer();
    const frameImage = await loadImage(frameBuffer);

    const frames = 30;
    for (let i = 0; i < frames; i++) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 🎯 رسم الخلفية الدائرية
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(baseImage, 0, 0, size, size);
      ctx.restore();

      const centerX = size / 2;
      const centerY = size / 2;

      const rotation = (i / frames) * Math.PI * 2;

      // 🎯 رسم الإطار يدور
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      const frameSize = size * 0.8;
      ctx.drawImage(frameImage, -frameSize / 2, -frameSize / 2, frameSize, frameSize);
      ctx.restore();

      // 🎯 رسم التراكب يدور بالعكس
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-rotation);
      const overlaySize = size * 0.4;
      ctx.drawImage(overlayImage, -overlaySize / 2, -overlaySize / 2, overlaySize, overlaySize);
      ctx.restore();

      // 🎯 إضافة نص أسفل الصورة
      const text = "Open Image";
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 8;
      ctx.fillText(text, centerX, size + 40);
      ctx.shadowBlur = 0;

      encoder.addFrame(ctx);
    }

    encoder.finish();

    const buffer = encoder.out.getData();

    // رفع إلى imgbb
    const form = new FormData();
    form.append('image', buffer.toString('base64'));

    const uploadRes = await axios.post(
      `https://api.imgbb.com/1/upload?key=${imgbbApiKey}`,
      form,
      { headers: form.getHeaders() }
    );

    const imageLink = uploadRes.data.data.url;
    console.log('✅ تم رفع الصورة المتحركة بنجاح:', imageLink);
    return imageLink;

  } catch (err) {
    console.error('❌ خطأ في معالجة أو رفع الصورة المتحركة:', err.message);
    return null;
  }
}

module.exports = {
  processAnimatedImageAndUpload
};

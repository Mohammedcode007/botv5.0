// prokeralaHoroscope.js
const axios = require('axios');
const qs = require('qs');

const CLIENT_ID = 'b9caadfd-1158-4788-8e6c-e6a735e7c91a';
const CLIENT_SECRET = 'Z5iDnZ0bQDrchwwUmDYwJnWzRWd4depCY6St8J5q';

async function getAccessToken() {
  const data = qs.stringify({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  try {
    const res = await axios.post('https://api.prokerala.com/token', data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return res.data.access_token;
  } catch (err) {
    console.error('❌ Token Error:', err.response?.data || err.message);
    return null;
  }
}

async function getDailyHoroscope(sign = 'leo', language = 'ar') {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await axios.get('https://api.prokerala.com/v2/astrology/horoscope/daily', {
      headers: { Authorization: `Bearer ${token}` },
      params: { sign, language },
    });

    return res.data.horoscope; // تحقق أن هذا المسار صحيح حسب الاستجابة الجديدة
  } catch (err) {
    console.error('❌ Horoscope Error:', err.response?.data || err.message);
    return null;
  }
}


// تصدير الدالة
module.exports = { getDailyHoroscope };

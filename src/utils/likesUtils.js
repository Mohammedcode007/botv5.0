const fs = require('fs');
const path = require('path');

const likesFilePath = path.join(__dirname, '../data/songLikes.json');

function loadLikes() {
  if (!fs.existsSync(likesFilePath)) return {};
  return JSON.parse(fs.readFileSync(likesFilePath, 'utf-8'));
}

function saveLikes(data) {
  fs.writeFileSync(likesFilePath, JSON.stringify(data, null, 2));
}

function incrementLike(user) {
  const data = loadLikes();
  data[user] = (data[user] || 0) + 1;
  saveLikes(data);
}

function getUserLikes(user) {
  const data = loadLikes();
  return data[user] || 0;
}

module.exports = {
  loadLikes,
  saveLikes,
  incrementLike,
  getUserLikes
};

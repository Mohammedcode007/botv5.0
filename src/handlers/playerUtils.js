// /war/playerUtils.js
const gameData = require('../data/gameData.json');

const playerImages = [
    'https://i.pinimg.com/736x/94/34/5a/94345ad561d6526741a1681eee0b1bc5.jpg',
    'https://i.pinimg.com/736x/2b/83/e1/2b83e19877633511de58547818131cef.jpg',
    'https://i.pinimg.com/736x/09/11/a5/0911a5fd28446d0937da7bcc826f8155.jpg',
    // أضف باقي الصور
];

function getRandomPlayerImage() {
    return playerImages[Math.floor(Math.random() * playerImages.length)];
}

function createRandomPlayer(status, training = null) {
    const randomCountry = gameData.countries[Math.floor(Math.random() * gameData.countries.length)];
    const randomTitle = gameData.titles[Math.floor(Math.random() * gameData.titles.length)];
    const randomWeapon = gameData.weapons[Math.floor(Math.random() * gameData.weapons.length)];

    let health = 100;
    let luck = Math.floor(Math.random() * 100) + 1;
    let power = randomWeapon.power;

    // تأثير التدريب
    if (training === 'health') health += 30;
    if (training === 'power') power += 10;
    if (training === 'luck') luck += 20;

    return {
        country: randomCountry.name,
        flag: randomCountry.flag,
        title: randomTitle,
        weapon: { ...randomWeapon, power },
        status,
        points: 1000,
        health,
        luck,
        training,
        image: getRandomPlayerImage()
    };
}

module.exports = { createRandomPlayer };

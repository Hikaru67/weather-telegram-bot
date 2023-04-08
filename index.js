const puppeteer = require('puppeteer');
const fs = require('fs');
const sharp = require('sharp')
const { Telegraf } = require('telegraf');
require('dotenv').config();
const BOT_TOKEN = process.env.BOT_TOKEN
const CHANNEL_ID = process.env.CHANNEL_ID

async function searchWeather(keyword, rainCheck = false) {
    const url = `https://www.google.com/search?q=${keyword}&oq=${keyword}&aqs=chrome..69i57.7198j1j7&sourceid=chrome&ie=UTF-8`;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, {waitUntil: 'networkidle2'});
    if (rainCheck) {
        await page.evaluate(async (id) => {
            document.querySelector('#wob_rain').click()
        });
    }
    // await page.waitForNavigation();

    // Chụp ảnh màn hình
    const screenshotPath = `images/${keyword}-thoi-tiet-${new Date().toISOString()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Cắt lấy 1/4 ảnh trên cùng
    const imageBuffer = await fs.promises.readFile(screenshotPath);
    const { width, height } = await page.evaluate(() => {
        const { width, height } = document.body.getBoundingClientRect();
        return { width, height };
    });
    const croppedImage = await sharp(imageBuffer)
        .extract({ width: Math.floor(width), height: Math.floor(height / 4), left: 0, top: 0 })
        .toBuffer();

    // Đóng trình duyệt
    await browser.close();
    fs.unlinkSync(screenshotPath);

    // Trả về file buffer của ảnh đã cắt
    return croppedImage;
}

// Gửi ảnh lên kênh Telegram
async function sendPhotoToTelegram(photoBuffer) {
    const bot = new Telegraf(BOT_TOKEN);
    await bot.telegram.sendPhoto(CHANNEL_ID, { source: photoBuffer });
}


const cron = require('node-cron');

cron.schedule('0 6 * * *', () => {
    const keyword = 'thời tiết mễ trì hà nội'
    // Sử dụng hàm searchWeather() và sendPhotoToTelegram()
    searchWeather(keyword)
        .then(photoBuffer => sendPhotoToTelegram(photoBuffer))
        .catch(error => console.log(error));

    searchWeather(keyword, true)
        .then(photoBuffer => sendPhotoToTelegram(photoBuffer))
        .catch(error => console.log(error));
});
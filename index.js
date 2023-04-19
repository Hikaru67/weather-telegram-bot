const puppeteer = require('puppeteer');
const fs = require('fs');
const sharp = require('sharp')
const { Telegraf } = require('telegraf');
require('dotenv').config();
const BOT_TOKEN = process.env.BOT_TOKEN
const CHANNEL_ID = process.env.CHANNEL_ID
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', { flags: 'w' });
var log_stdout = process.stdout;

console.warn = function (d) { //
    log_file.write(util.format(d) + '\n');
    log_stdout.write(util.format(d) + '\n');
};

async function searchWeather(keyword, rainCheck = false) {
    const url = `https://www.google.com/search?q=${keyword}&oq=${keyword}&ie=UTF-8`;
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36");
    await page.goto(url, { waitUntil: 'networkidle2' });
    acp = await page.$x("(//button[contains(text(), '')])[4]")
    if (acp[0]) {
        await acp[0].click()
    }

    if (rainCheck) {
        await page.evaluate(async () => {
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
        .extract({ width: Math.floor(width), height: Math.floor(height * 9 / 32), left: 0, top: 0 })
        .toBuffer();

    // Đóng trình duyệt
    await browser.close();
    // Xóa file
    // fs.unlinkSync(screenshotPath);

    // Trả về file buffer của ảnh đã cắt
    return croppedImage;
}

// Gửi ảnh lên kênh Telegram
async function sendPhotoToTelegram(photoBuffer) {
    const bot = new Telegraf(BOT_TOKEN);
    await bot.telegram.sendPhoto(CHANNEL_ID, { source: photoBuffer });
    console.log('Send image successully');
}


const cron = require('node-cron');

cron.schedule('0 6 * * *', () => {
    const keyword = 'thời tiết mễ trì hà nội độ C'
    // Sử dụng hàm searchWeather() và sendPhotoToTelegram()
    searchWeather(keyword)
        .then(photoBuffer => sendPhotoToTelegram(photoBuffer))
        .catch(error => console.warn(error));

    searchWeather(keyword, true)
        .then(photoBuffer => sendPhotoToTelegram(photoBuffer))
        .catch(error => console.warn(error));
});

const keyword = 'thời tiết mễ trì hà nội độ C'
searchWeather(keyword)
    .then(photoBuffer => sendPhotoToTelegram(photoBuffer))
    .catch(error => console.warn(error));

searchWeather(keyword, true)
    .then(photoBuffer => sendPhotoToTelegram(photoBuffer))
    .catch(error => console.warn(error));

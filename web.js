const argv = require("yargs").argv;
const puppeteer = require("puppeteer");
const download = require("image-downloader");

module.exports.baseUrl = "https://ark.gamepedia.com";

let browserInstance;
let broswerSemaphore = false;
module.exports.getBrowser = async () => {
    if (!browserInstance && !broswerSemaphore) {
        broswerSemaphore = true; // mark awaited constructor
        browserInstance = await puppeteer.launch({ headless: argv.d ? false : true, userDataDir: "./cache" });
    }
    return browserInstance;
};

let imgPageInstance;
let imgPageSemaphore = false;
async function getImgPage() {
    if (!imgPageInstance && !imgPageSemaphore) {
        imgPageSemaphore = true; // mark awaited constructor
        const b = await module.exports.getBrowser();
        imgPageInstance = await b.newPage();
    }
    return imgPageInstance;
}

module.exports.getImage = async (url, dest) => {
    const imgSelector = decodeURI(
        `img[alt="${url
            .replace(module.exports.baseUrl, "")
            .substr(1)
            .replace(/_/g, " ")}"]`
    );
    const ip = await getImgPage();
    await ip.goto(url);
    await ip.waitForSelector(imgSelector);

    const imgUrl = await ip.evaluate(imgSelector => {
        return document.querySelector(imgSelector).getAttribute("src");
    }, imgSelector);

    const result = await download.image({ url: imgUrl, dest: dest });
    console.log(`downloaded ${url} to ${result.filename}`);
    return result.filename;
};

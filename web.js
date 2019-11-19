const argv = require("yargs").argv;
const puppeteer = require("puppeteer");
const download = require("image-downloader");

let instance;
let semaphore = false;
const getInstance = async () => {
    if (!instance && !semaphore) {
        semaphore = true; // mark awaited constructor
        instance = await puppeteer.launch({ headless: argv.d ? true : false, userDataDir: "./cache" });
    }
    return instance;
};

async function getImage(url, file) {
    const result = await download.image({ url: url, dest: file });
    console.log(`downloaded ${url} to ${result.filename}`);
}

module.exports.browser = getInstance;
module.exports.getImage = getImage;

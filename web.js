const argv = require("yargs").argv;
const nodeUrl = require("url");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const download = require("image-downloader");
const png = require("png-metadata");
const logger = require("tracer").colorConsole({ level: argv.d ? "debug" : "warn" });

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

module.exports.getImage = async (url, destFolder) => {
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

    const filename = this.getFileName(imgUrl);
    const dest = path.join(destFolder, filename);
    const u = new URL(imgUrl);
    const version = u.searchParams.get("version");

    if (fs.existsSync(dest)) {
        if (getPNGMetadata(dest, "vers") === version) {
            logger.debug(`skipping ${imgUrl} same version already exists`);
            return dest;
        }
    }

    try {
        const result = await download.image({ url: imgUrl, dest: dest });
        logger.debug(`downloaded ${imgUrl} to ${result.filename}`);

        writePNGMetadata(dest, "vers", version);
    } catch (error) {
        logger.error(error);
    }

    return dest;
};

function writePNGMetadata(fileName, key, value) {
    let buffer = png.readFileSync(fileName);
    let chunkList = png.splitChunk(buffer);
    // append
    const iend = chunkList.pop(); // remove IEND
    const newchunk = png.createChunk(key, value);
    chunkList.push(newchunk);
    chunkList.push(iend);
    // join
    var newpng = png.joinChunk(chunkList);
    fs.writeFileSync(fileName, newpng, "binary");
}

function getPNGMetadata(fileName, key) {
    let buffer = png.readFileSync(fileName);
    let chunkList = png.splitChunk(buffer);
    let result = null;

    for (const chunk of chunkList) {
        if (chunk.type === key) {
            result = chunk.data;
        }
    }

    return result;
}

module.exports.getFileName = url => {
    const pathname = nodeUrl.parse(url).pathname;
    const basename = path.basename(pathname);
    const decodedBasename = decodeURIComponent(basename);
    return decodedBasename;
};

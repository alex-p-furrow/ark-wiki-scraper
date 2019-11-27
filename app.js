const argv = require("yargs").argv;
const fs = require("fs");
const path = require("path");
const logger = require("tracer").colorConsole({ level: argv.d ? "debug" : "warn" });
const web = require("./web.js");
const itemCategoryMaps = require("./itemCategoryMaps.json");
const creatureDlcMaps = require("./creatureDlcMaps.json");

async function main() {
    const browser = await web.getBrowser();

    fs.mkdirSync("dist/images", { recursive: true });

    if (argv.i) {
        logger.info("Scraping ark items...");
        const items = await getItems();

        for (let i = 0; i < items.length; i++) {
            try {
                const fn = await web.getImage(items[i].imagePage, "dist/images");
                items[i].imageName = path.parse(fn).base;
            } catch (error) {
                logger.error(error);
            }
        }

        fs.writeFile("dist/items.json", JSON.stringify(items, null, 4), error => {
            if (error) {
                logger.error(error);
            }
        });

        logger.info(`${items.length} items scraped.`);
    }

    if (argv.c) {
        logger.info("Scraping ark creatures...");
        const creatures = await getCreatures();

        for (let i = 0; i < creatures.length; i++) {
            try {
                const fn = await web.getImage(creatures[i].imagePage, "dist/images");
                creatures[i].imageName = path.parse(fn).base;
            } catch (error) {
                logger.error(error);
            }
        }

        fs.writeFile("dist/creatures.json", JSON.stringify(creatures, null, 4), error => {
            if (error) {
                logger.error(error);
            }
        });

        logger.info(`${creatures.length} creatures scraped.`);
    }

    browser.close();
}

async function getCreatures() {
    const containerSelector = `div[id="mw-content-text"] div.mw-parser-output`;
    const browser = await web.getBrowser();
    const page = await browser.newPage();

    await page.goto(`${web.baseUrl}/Creature_IDs`);
    await page.waitForSelector(containerSelector);

    let results = await page.evaluate(
        (containerSelector, baseUrl, creatureDlcMaps) => {
            let tables = document.querySelectorAll(`${containerSelector} table`);
            let items = [];

            for (var i = 0; i < creatureDlcMaps.length; i++) {
                let rows = tables[creatureDlcMaps[i].tableIndex].querySelectorAll(`tbody tr`);

                for (const r of rows) {
                    items.push({
                        name: r.children[0].querySelector("a[title]").innerText,
                        dlc: creatureDlcMaps[i].name,
                        category: r.children[1].querySelector("a").innerText,
                        imagePage: baseUrl + r.children[0].querySelector("a.image").getAttribute("href"),
                        wikiUrl: baseUrl + r.children[0].querySelector("a[title]").getAttribute("href"),
                        nameTag: r.children[2].innerText,
                        entityId: r.children[3].innerText,
                        blueprintPath: r.children[4].querySelector("span").innerText
                    });
                }
            }

            return items;
        },
        containerSelector,
        web.baseUrl,
        creatureDlcMaps
    );

    return results;
}

async function getItems() {
    const browser = await web.getBrowser();
    const page = await browser.newPage();
    await page.goto(`${web.baseUrl}/Item_IDs`);

    let items = [];

    for (var i = 0; i < itemCategoryMaps.length; i++) {
        await page.click(`div[data-page="${itemCategoryMaps[i].dataPage}"] h3 span.jslink`);
        await page.waitForSelector(`div.pageloader-contentloaded[data-page="${itemCategoryMaps[i].dataPage}"]`);

        let results = await page.evaluate(
            (dataPage, baseUrl, category) => {
                let rows = document.querySelectorAll(`div[data-page="${dataPage}"] tbody tr`);
                let catItems = [];

                for (const r of rows) {
                    // check the class name and blueprint cells
                    // if there is no class name or blueprint data ignore it
                    if (r.children[4].children.length > 0 && r.children[5].children.length > 0) {
                        let id = Number.parseInt(r.children[3].innerText);

                        catItems.push({
                            id: Number.isNaN(id) ? null : id,
                            name: r.children[0].querySelector("a[title]").innerText,
                            category: category,
                            imagePage: baseUrl + r.children[0].querySelector("a.image").getAttribute("href"),
                            wikiUrl: baseUrl + r.children[0].querySelector("a[title]").getAttribute("href"),
                            stackSize: Number.parseInt(r.children[2].innerText),
                            className: r.children[4].querySelector("span").innerText,
                            blueprintPath: r.children[5].querySelector("span").innerText
                        });
                    }
                }

                return catItems;
            },
            itemCategoryMaps[i].dataPage,
            web.baseUrl,
            itemCategoryMaps[i].name
        );

        items = items.concat(results);
    }

    return items;
}

main();

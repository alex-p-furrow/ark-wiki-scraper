const puppeteer = require("puppeteer");
const fs = require("fs");
const categoryMaps = require("./categoryMaps.json");

async function GetCategories() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto("https://ark.gamepedia.com/Item_IDs");

    let categories = [];

    for (var i = 0; i < categoryMaps.length; i++) {
        let category = { name: categoryMaps[i].name, items: [] };

        await page.click(`div[data-page="${categoryMaps[i].dataPage}"] h3 span.jslink`);
        await page.waitForSelector(
            `div.pageloader-contentloaded[data-page="${categoryMaps[i].dataPage}"]`
        );

        let results = await page.evaluate(dataPage => {
            let rows = document.querySelectorAll(`div[data-page="${dataPage}"] tbody tr`);
            let items = [];

            for (const r of rows) {
                // check the class name and blueprint cells
                // if there is no class name or blueprint data ignore it
                if (r.children[4].children.length > 0 && r.children[5].children.length > 0) {
                    let id = Number.parseInt(r.children[3].innerText);

                    items.push({
                        image: r.children[0].querySelector("a.image").getAttribute("href"),
                        stackSize: Number.parseInt(r.children[2].innerText),
                        id: Number.isNaN(id) ? null : id,
                        className: r.children[4].querySelector("span").innerText,
                        blueprintPath: r.children[5].querySelector("span").innerText
                    });
                }
            }

            return items;
        }, categoryMaps[i].dataPage);

        category.items = results.slice();
        categories.push(category);
    }

    fs.mkdirSync("dist", { recursive: true });
    fs.writeFile("dist/items.json", JSON.stringify(categories, null, 4), error => {
        if (error) {
            console.log(error);
        }
    });

    browser.close();
}

GetCategories();

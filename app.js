const argv = require("yargs").argv;
const fs = require("fs");
const web = require("./web.js");
const categoryMaps = require("./categoryMaps.json");

async function main() {
    const browser = await web.getBrowser();

    fs.mkdirSync("dist/images", { recursive: true });

    if (argv.i) {
        const items = await getItems();

        for (let i = 0; i < items.length; i++) {
            try {
                const fn = await web.getImage(items[i].imagePage, "dist/images");
                items[i].imagePath = fn;
            } catch (error) {
                console.log(error);
            }
        }

        fs.writeFile("dist/items.json", JSON.stringify(items, null, 4), error => {
            if (error) {
                console.log(error);
            }
        });
    }

    browser.close();
}

async function getItems() {
    const browser = await web.getBrowser();
    const page = await browser.newPage();
    await page.goto(`${web.baseUrl}/Item_IDs`);

    let items = [];

    for (var i = 0; i < categoryMaps.length; i++) {
        await page.click(`div[data-page="${categoryMaps[i].dataPage}"] h3 span.jslink`);
        await page.waitForSelector(`div.pageloader-contentloaded[data-page="${categoryMaps[i].dataPage}"]`);

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
                            imagePath: null,
                            wikiUrl: baseUrl + r.children[0].querySelector("a[title]").getAttribute("href"),
                            stackSize: Number.parseInt(r.children[2].innerText),
                            className: r.children[4].querySelector("span").innerText,
                            blueprintPath: r.children[5].querySelector("span").innerText
                        });
                    }
                }

                return catItems;
            },
            categoryMaps[i].dataPage,
            web.baseUrl,
            categoryMaps[i].name
        );

        items = items.concat(results);
    }

    return items;
}

main();

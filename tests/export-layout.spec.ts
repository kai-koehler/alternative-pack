import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

type AppOption = { id: string; name: string };
type Category = {
    name: string;
    order: number;
    mainstream_apps: AppOption[];
    private_alternatives: AppOption[];
};

const categories = (
    JSON.parse(
        fs.readFileSync(path.join(process.cwd(), "data", "apps.json"), "utf8"),
    ) as { categories: Category[] }
).categories.sort((a, b) => a.order - b.order);

const longestOptions = (options: AppOption[], count: number) =>
    [...options].sort((a, b) => b.name.length - a.name.length).slice(0, count);

async function selectLongestOptions(
    page: Page,
    category: Category,
    alternativeCount: 1 | 2 | 3,
) {
    const row = page.locator(`[data-category="${category.name}"]`);
    const mainstream = longestOptions(category.mainstream_apps, 1)[0];
    const alternatives = longestOptions(
        category.private_alternatives,
        alternativeCount,
    );

    await row.locator("button").first().click();
    await page
        .getByRole("menuitemradio")
        .filter({ has: page.getByText(mainstream.name, { exact: true }) })
        .click();
    await row.locator("button").last().click();

    for (const alternative of alternatives) {
        await page
            .getByRole("menuitemcheckbox")
            .filter({ has: page.getByText(alternative.name, { exact: true }) })
            .click();
    }

    await page.keyboard.press("Escape");

    return { mainstream, alternatives };
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const SYSTEM_FONT_NOTICE =
    "The Alternative Pack fonts didn't load, so this image uses a system font.";

// The card layout itself is checked in tests/pack-image-unit.mjs. This checks
// that the browser exports every pack size with the longest names, in the web
// fonts and in a system font, using the real logos.
for (const [alternativeCount, systemFont] of [
    [1, false],
    [3, false],
    [3, true],
] as const) {
    test(`exports ${alternativeCount} ${alternativeCount === 1 ? "alternative" : "alternatives"} per category at every pack size${systemFont ? " in a system font" : ""}`, async ({
        page,
    }, testInfo) => {
        test.setTimeout(240_000);
        if (systemFont) {
            await page.route("**/_next/static/media/*.woff2*", (route) =>
                route.abort("blockedbyclient"),
            );
        }
        const loadedLogos = new Set<string>();
        page.on("response", (response) => {
            const match = /\/app-logos\/([^/?]+)\.jpg/.exec(response.url());
            if (match && response.ok()) loadedLogos.add(match[1]);
        });
        await page.goto("/create");
        const status = page
            .locator('[data-export-feedback="sidebar"]')
            .getByRole("status");
        const selected: string[] = [];
        let previous: Buffer | null = null;

        for (const [index, category] of categories.entries()) {
            const { mainstream, alternatives } = await selectLongestOptions(
                page,
                category,
                alternativeCount,
            );
            selected.push(mainstream.id, ...alternatives.map(({ id }) => id));
            const count = index + 1;
            await expect(page.locator("#pack-count")).toHaveText(
                `${count} ${count === 1 ? "switch" : "switches"}`,
            );

            // One, two and three columns, the move to four, and the densest.
            if (![1, 2, 3, 4, 12, 13, categories.length].includes(count)) {
                continue;
            }
            await test.step(`${count} categories with the longest names`, async () => {
                await expect(page.locator("#download-sidebar")).toBeEnabled();
                const [download] = await Promise.all([
                    page.waitForEvent("download"),
                    page.locator("#download-sidebar").click(),
                ]);
                const exportPath = testInfo.outputPath(
                    `export-${count}${systemFont ? "-system-font" : ""}.png`,
                );
                await download.saveAs(exportPath);
                const png = fs.readFileSync(exportPath);
                expect(png.subarray(0, 8)).toEqual(PNG_SIGNATURE);
                expect(png.readUInt32BE(16)).toBe(3000);
                expect(png.readUInt32BE(20)).toBe(3000);
                if (systemFont) {
                    await expect(status).toHaveText(SYSTEM_FONT_NOTICE);
                } else {
                    await expect(status).toHaveText("");
                }

                const pixels = await sharp(png).removeAlpha().raw().toBuffer();
                if (previous) expect(pixels.equals(previous)).toBe(false);
                previous = pixels;
                // Every app drawn so far had its own logo, not a letter tile.
                expect(selected.filter((id) => !loadedLogos.has(id))).toEqual(
                    [],
                );
            });
        }
    });
}

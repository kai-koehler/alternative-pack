import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

type Catalog = {
    categories: Array<{
        name: string;
        mainstream_apps: Array<{ id: string; name: string }>;
        private_alternatives: Array<{ id: string; name: string }>;
    }>;
};

const catalog = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "apps.json"), "utf8"),
) as Catalog;

const STORAGE_KEY = "alternative-pack:v1";

test("catalog includes requested alternatives", () => {
    const expectedAlternatives = [
        { category: "Messaging", id: "imessage", name: "iMessage" },
        { category: "Drive", id: "icloud", name: "iCloud" },
        {
            category: "Calendar",
            id: "apple_calendar",
            name: "Apple Calendar",
        },
        { category: "Contacts", id: "tuta_mail", name: "Tuta Contacts" },
        { category: "Mail", id: "thundermail", name: "Thundermail" },
        { category: "Mail", id: "all_inkl", name: "All-Inkl Webmail" },
        { category: "Photos", id: "ugreen_nas", name: "UGREEN NAS Photos" },
        { category: "Drive", id: "ugreen_nas", name: "UGREEN NAS" },
        { category: "Messaging", id: "line", name: "LINE" },
        { category: "Notes", id: "upnote", name: "UpNote" },
        { category: "Calendar", id: "all_inkl", name: "All-Inkl CalDAV" },
        { category: "Contacts", id: "all_inkl", name: "All-Inkl CardDAV" },
        { category: "Payments", id: "wero", name: "Wero" },
        { category: "Payments", id: "bunq", name: "bunq" },
        { category: "Payments", id: "bank_transfer", name: "Bank Transfer" },
        {
            category: "Computer OS",
            id: "windows",
            name: "Windows (for Gaming)",
        },
        { category: "Computer OS", id: "bazzite", name: "Bazzite" },
        { category: "Computer OS", id: "cachyos", name: "CachyOS" },
        { category: "Domain Hosting", id: "all_inkl", name: "All-Inkl" },
    ];

    for (const expectedAlternative of expectedAlternatives) {
        const category = catalog.categories.find(
            (item) => item.name === expectedAlternative.category,
        );

        expect(category?.private_alternatives).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: expectedAlternative.id,
                    name: expectedAlternative.name,
                }),
            ]),
        );
    }
});

/** Alternative pickers with nothing picked show "Pick". */
const pickButtons = (page: Page) =>
    page.locator("button").filter({ hasText: /^Pick$/ });

const mailMainstream = (page: Page) =>
    page.getByRole("button", { name: /^Mail app you used before:/ });

const mailAlternatives = (page: Page) =>
    page.getByRole("button", { name: /^Mail alternatives:/ });

const packCount = (page: Page) => page.locator("#pack-count");

async function selectMailAlternatives(
    page: Page,
    names = ["Proton Mail"],
    closeMenu = true,
) {
    await mailAlternatives(page).click();

    for (const [index, name] of names.entries()) {
        await page
            .getByRole("menuitemcheckbox")
            .filter({ hasText: name })
            .click();

        await expect(mailAlternatives(page)).toHaveText(
            index === 0 ? name : `${names[0]} +${index}`,
        );
    }

    if (closeMenu) {
        await page.keyboard.press("Escape");
        await expect(page.locator('[role="menu"]')).toBeHidden();
    }
}

test("home page links into the pack builder", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Alternative Pack");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Your switches to alternative apps, in one image",
    );
    await expect(
        page.getByRole("link", { name: "Create your pack" }),
    ).toHaveAttribute("href", "/create");
    await expect(
        page.getByRole("img", { name: "Example of an Alternative Pack image" }),
    ).toHaveAttribute("data-preview-ready", "true");
});

test("create page renders the full catalog and starts with exports disabled", async ({
    page,
}) => {
    await page.goto("/create");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Create your Alternative Pack",
    );
    await expect(page.locator("[data-category]")).toHaveCount(
        catalog.categories.length,
    );
    await expect(pickButtons(page)).toHaveCount(catalog.categories.length);
    await expect(
        page.getByRole("heading", { name: "Mail", exact: true }),
    ).toBeVisible();
    await expect(mailMainstream(page)).toHaveText("Gmail");
    await expect(page.getByText("0/3").first()).toBeVisible();
    await expect(packCount(page)).toHaveText("0 switches");
    await expect(page.locator("#download-sidebar")).toBeDisabled();
    await expect(page.locator("#share-sidebar")).toBeDisabled();
    await expect(
        page.getByRole("button", { name: "Reset all picks" }),
    ).toBeDisabled();
});

test("the alternatives picker presents a multi-select menu", async ({
    page,
}) => {
    await page.goto("/create");

    await mailAlternatives(page).click();

    const menu = page.getByRole("menu");
    await expect(menu.getByText("Alternatives", { exact: true })).toBeVisible();
    await expect(menu.getByText("0/3")).toBeVisible();
    await expect(
        page.getByRole("menuitemcheckbox").filter({ hasText: "Proton Mail" }),
    ).toBeVisible();
    // The menu is portalled to <body>, which sets the page font.
    await expect(menu).toHaveCSS("font-family", /roboto/i);
});

test("the page and the image use the bundled fonts", async ({ page }) => {
    await page.goto("/create");
    await selectMailAlternatives(page);
    await expect(page.locator("#download-sidebar")).toBeEnabled();

    const fonts = await page.evaluate(async () => {
        await document.fonts.ready;
        return {
            heading: getComputedStyle(document.querySelector("h1")!).fontFamily,
            body: getComputedStyle(document.body).fontFamily,
            loaded: Array.from(document.fonts)
                .filter((face) => face.status === "loaded")
                .map((face) => `${face.family} ${face.weight}`),
            sources: performance
                .getEntriesByType("resource")
                .map((entry) => entry.name)
                .filter((name) => name.includes(".woff2")),
        };
    });

    expect(fonts.heading).toMatch(/poppins/i);
    expect(fonts.body).toMatch(/roboto/i);
    // Poppins for headings, Roboto at the weights the image draws with.
    for (const face of [/poppins.* 600/i, /roboto.* 400/i, /roboto.* 500/i]) {
        expect(fonts.loaded.some((loaded) => face.test(loaded))).toBe(true);
    }
    // Self-hosted, as the CSP allows fonts only from the site.
    expect(fonts.sources.length).toBeGreaterThan(0);
    for (const source of fonts.sources) {
        expect(new URL(source).origin).toBe(new URL(page.url()).origin);
    }
});

test("selecting an alternative enables desktop export controls", async ({
    page,
}) => {
    await page.goto("/create");
    await selectMailAlternatives(page);

    await expect(page.locator("#download-sidebar")).toBeEnabled();
    await expect(page.locator("#share-sidebar")).toBeEnabled();
});

test("selecting multiple alternatives keeps one exportable pack", async ({
    page,
}) => {
    await page.goto("/create");
    await selectMailAlternatives(page, ["Proton Mail", "Tuta Mail"]);

    await expect(pickButtons(page)).toHaveCount(catalog.categories.length - 1);
    await expect(packCount(page)).toHaveText("1 switch");
    await expect(page.locator("#download-sidebar")).toBeEnabled();
    await expect(page.locator("#share-sidebar")).toBeEnabled();
});

test("alternative selection is capped at three per category", async ({
    page,
}) => {
    await page.goto("/create");
    await selectMailAlternatives(
        page,
        ["Proton Mail", "Tuta Mail", "Posteo"],
        false,
    );

    await expect(
        page.getByRole("menuitemcheckbox").filter({ hasText: "StartMail" }),
    ).toBeDisabled();
});

test("download creates an Alternative Pack PNG", async ({ page }) => {
    await page.goto("/create");
    await selectMailAlternatives(page, ["Proton Mail", "Tuta Mail"]);

    const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.locator("#download-sidebar").click(),
    ]);

    expect(download.suggestedFilename()).toBe("alternative-pack.png");

    const downloadedPath = await download.path();

    expect(downloadedPath).toBeTruthy();
    const png = fs.readFileSync(downloadedPath!);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    // 3000x3000, from the IHDR chunk.
    expect(png.readUInt32BE(16)).toBe(3000);
    expect(png.readUInt32BE(20)).toBe(3000);
});

test("share falls back to a PNG download when browser sharing is unavailable", async ({
    page,
}) => {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, "share", {
            configurable: true,
            value: undefined,
        });
        Object.defineProperty(navigator, "canShare", {
            configurable: true,
            value: undefined,
        });
        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: {
                write: async () => {
                    throw new Error("Clipboard blocked in test.");
                },
            },
        });
        Object.defineProperty(window, "ClipboardItem", {
            configurable: true,
            value: undefined,
        });
    });

    await page.goto("/create");
    await selectMailAlternatives(page);

    const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.locator("#share-sidebar").click(),
    ]);

    expect(download.suggestedFilename()).toBe("alternative-pack.png");
    await expect(page.getByRole("status")).toContainText(
        "Sharing is unavailable here",
    );
});

test("mobile layout keeps export controls visible and disabled until selection", async ({
    page,
}) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto("/create");

    await expect(page.locator("#share-mobile")).toBeVisible();
    await expect(page.locator("#download-mobile")).toBeVisible();
    await expect(page.locator("#share-sidebar")).toBeHidden();
    await expect(page.locator("#share-mobile")).toBeDisabled();
    await expect(page.locator("#download-mobile")).toBeDisabled();

    await selectMailAlternatives(page);

    await expect(page.locator("#share-mobile")).toBeEnabled();
    await expect(page.locator("#download-mobile")).toBeEnabled();
});

test("touch users can open and select an alternative on mobile", async ({
    browser,
}, testInfo) => {
    const context = await browser.newContext({
        baseURL: testInfo.project.use.baseURL,
        ignoreHTTPSErrors: testInfo.project.use.ignoreHTTPSErrors,
        reducedMotion: testInfo.project.use.reducedMotion,
        viewport: { width: 320, height: 740 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
    });

    try {
        const page = await context.newPage();

        await page.goto("/create");
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(500);
        await pickButtons(page).first().tap();
        await expect(
            page.getByRole("menuitemcheckbox").filter({
                hasText: "Proton Mail",
            }),
        ).toBeVisible();

        await page
            .getByRole("menuitemcheckbox")
            .filter({ hasText: "Proton Mail" })
            .tap();
        await page.keyboard.press("Escape");

        await expect(page.locator("#share-mobile")).toBeEnabled();
        await expect(page.locator("#download-mobile")).toBeEnabled();
    } finally {
        await context.close();
    }
});

test("the filter narrows categories by category or app name", async ({
    page,
}) => {
    await page.goto("/create");
    const filter = page.getByRole("searchbox", {
        name: "Filter categories and apps",
    });
    const cards = page.locator("[data-category]");

    await filter.fill("thunder");
    await expect(cards).toHaveCount(1);
    await expect(cards).toHaveAttribute("data-category", "Mail");

    await filter.fill("PAYMENTS");
    await expect(cards).toHaveCount(1);
    await expect(cards).toHaveAttribute("data-category", "Payments");

    await filter.fill("no such app");
    await expect(cards).toHaveCount(0);
    await expect(
        page.getByText("No category matches your filter."),
    ).toBeVisible();

    await filter.fill("");
    await expect(cards).toHaveCount(catalog.categories.length);
});

test("filtering keeps picks in hidden categories and closes an open menu", async ({
    page,
}) => {
    await page.goto("/create");
    await selectMailAlternatives(page, ["Proton Mail"], false);
    await expect(page.getByRole("menu")).toBeVisible();

    await page
        .getByRole("searchbox", { name: "Filter categories and apps" })
        .fill("browser");
    await expect(page.getByRole("menu")).toBeHidden();
    await expect(page.locator("[data-category]")).toHaveCount(1);
    await expect(packCount(page)).toHaveText("1 switch");
    await expect(page.locator("#download-sidebar")).toBeEnabled();
});

test("picks are saved in the browser and restored on the next visit", async ({
    page,
}) => {
    await page.goto("/create");
    await mailMainstream(page).click();
    await page.getByRole("menuitemradio", { name: "Outlook" }).click();
    await selectMailAlternatives(page, ["Proton Mail", "Tuta Mail"]);

    await expect
        .poll(() =>
            page.evaluate(
                (key) => JSON.parse(localStorage.getItem(key) ?? "null")?.Mail,
                STORAGE_KEY,
            ),
        )
        .toEqual({ main: "outlook", alts: ["proton_mail", "tuta_mail"] });

    await page.reload();
    await expect(mailMainstream(page)).toHaveAccessibleName(
        "Mail app you used before: Outlook",
    );
    await expect(mailAlternatives(page)).toHaveAccessibleName(
        "Mail alternatives: Proton Mail, Tuta Mail; 2 of 3 selected",
    );
    await expect(packCount(page)).toHaveText("1 switch");
    await expect(page.locator("#download-sidebar")).toBeEnabled();
});

test("saved picks that are no longer in the catalog are dropped", async ({
    page,
}) => {
    await page.addInitScript((key) => {
        localStorage.setItem(
            key,
            JSON.stringify({
                Mail: { main: "gone", alts: ["gone", "posteo"] },
                Removed: { main: "x", alts: ["y"] },
            }),
        );
    }, STORAGE_KEY);
    await page.goto("/create");

    await expect(mailAlternatives(page)).toHaveAccessibleName(
        "Mail alternatives: Posteo; 1 of 3 selected",
    );
    await expect(mailMainstream(page)).toHaveAccessibleName(
        "Mail app you used before: Gmail",
    );
});

test("the builder works without browser storage", async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(window, "localStorage", {
            configurable: true,
            get() {
                throw new DOMException("Storage is disabled.", "SecurityError");
            },
        });
    });
    const errors: Error[] = [];
    page.on("pageerror", (error) => errors.push(error));

    await page.goto("/create");
    await selectMailAlternatives(page);
    await expect(packCount(page)).toHaveText("1 switch");
    await expect(page.locator("#download-sidebar")).toBeEnabled();
    expect(errors).toEqual([]);
});

test("Reset clears every pick after confirming", async ({ page }) => {
    await page.goto("/create");
    await selectMailAlternatives(page, ["Proton Mail"]);
    const reset = page.getByRole("button", { name: "Reset all picks" });
    await expect(reset).toBeEnabled();

    page.once("dialog", (dialog) => dialog.dismiss());
    await reset.click();
    await expect(packCount(page)).toHaveText("1 switch");

    page.once("dialog", (dialog) => dialog.accept());
    await reset.click();
    await expect(packCount(page)).toHaveText("0 switches");
    await expect(pickButtons(page)).toHaveCount(catalog.categories.length);
    await expect(reset).toBeDisabled();
    await expect(page.locator("#download-sidebar")).toBeDisabled();
    // Nothing is kept once the pack is back to its start.
    await expect
        .poll(() =>
            page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
        )
        .toBeNull();
});

test("the preview draws the pack as it changes", async ({ page }) => {
    await page.goto("/create");
    const preview = page.getByRole("img", {
        name: "Preview of your Alternative Pack image",
    });
    await expect(preview).toHaveAttribute("data-preview-ready", "true");
    const empty = await preview.screenshot();

    // The preview follows picks while the menu is still open.
    await selectMailAlternatives(page, ["Proton Mail"], false);
    await expect
        .poll(async () => Buffer.compare(await preview.screenshot(), empty))
        .not.toBe(0);
});

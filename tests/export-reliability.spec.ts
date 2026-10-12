import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import fs from "node:fs";

const SYSTEM_FONT_NOTICE =
    "The Alternative Pack fonts didn't load, so this image uses a system font.";
const FONT_FILES = "**/_next/static/media/*.woff2*";

async function selectMail(page: Page, name = "Proton Mail") {
    await page.getByRole("button", { name: /^Mail alternatives:/ }).click();
    await page.getByRole("menuitemcheckbox").filter({ hasText: name }).click();
    await page.keyboard.press("Escape");
}

/** Counts PNG encodes. The preview only draws, so each is an export image. */
function countEncodes(page: Page) {
    return page.addInitScript(() => {
        const state = window as typeof window & { encodes: number };
        const toBlob = HTMLCanvasElement.prototype.toBlob;
        state.encodes = 0;
        HTMLCanvasElement.prototype.toBlob = function (...args) {
            state.encodes++;
            return toBlob.apply(this, args);
        };
    });
}

const encodes = (page: Page) =>
    page.evaluate(
        () => (window as typeof window & { encodes: number }).encodes,
    );

/** Makes PNG encoding fail until `window.failExports` is set to false. */
function failExports(page: Page) {
    return page.addInitScript(() => {
        const flags = window as unknown as { failExports: boolean };
        const toBlob = HTMLCanvasElement.prototype.toBlob;
        flags.failExports = true;
        HTMLCanvasElement.prototype.toBlob = function (callback, ...rest) {
            if (!flags.failExports) return toBlob.call(this, callback, ...rest);
            setTimeout(() => callback(null));
        };
    });
}

const recoverExports = (page: Page) =>
    page.evaluate(() => {
        (window as unknown as { failExports: boolean }).failExports = false;
    });

const exportFailed = (page: Page) =>
    page.getByRole("alert").filter({ hasText: "Export failed" });

test("editing defers capture and keeps an unchanged prepared image ready", async ({
    page,
}) => {
    await countEncodes(page);
    await page.goto("/create");
    await page.evaluate(() => document.fonts.ready);
    const picker = page.getByRole("button", {
        name: /^Mail alternatives:/,
    });
    await picker.click();
    await page
        .getByRole("menuitemcheckbox")
        .filter({ hasText: "Proton Mail" })
        .click();
    await page.waitForTimeout(750);
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(page.locator("#share-sidebar")).toBeDisabled();
    expect(await encodes(page)).toBe(0);

    await page.keyboard.press("Escape");
    await expect(page.locator("#share-sidebar")).toBeEnabled();
    expect(await encodes(page)).toBe(1);
    await picker.click();
    await page.waitForTimeout(500);
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(page.locator("#share-sidebar")).toBeEnabled();
    expect(await encodes(page)).toBe(1);
});

test("a missing logo is drawn as a letter tile and does not block export", async ({
    page,
}) => {
    await page.route("**/app-logos/proton_mail.jpg*", (route) => route.abort());
    await page.goto("/create");
    await selectMail(page);
    await expect(page.locator("#download-sidebar")).toBeEnabled();
    await expect(exportFailed(page)).toHaveCount(0);
    // The picker shows the same fallback.
    await expect(
        page.locator('[data-category="Mail"]').locator("[data-logo-fallback]"),
    ).toHaveCount(1);
    const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.locator("#download-sidebar").click(),
    ]);
    expect(download.suggestedFilename()).toBe("alternative-pack.png");
});

test("a stalled logo falls back after its timeout instead of hanging", async ({
    page,
}) => {
    test.setTimeout(60_000);
    // Never answered.
    await page.route("**/app-logos/proton_mail.jpg*", () => undefined);
    await page.goto("/create");
    await selectMail(page);
    await expect(page.locator("#download-sidebar")).toBeDisabled();
    // The 8s logo timeout, with room for a slow runner.
    await expect(page.locator("#download-sidebar")).toBeEnabled({
        timeout: 20_000,
    });
    await expect(exportFailed(page)).toHaveCount(0);
});

test("a failed export can be retried without an incomplete PNG", async ({
    page,
}) => {
    let downloads = 0;
    page.on("download", () => downloads++);
    await failExports(page);
    await page.goto("/create");
    await selectMail(page);
    await expect(exportFailed(page)).toBeVisible();
    await expect(page.locator("#share-sidebar")).toBeDisabled();
    await expect(page.locator("#download-sidebar")).toBeDisabled();
    expect(downloads).toBe(0);

    await recoverExports(page);
    await page.getByRole("button", { name: "Retry export" }).click();
    await expect(page.locator("#download-sidebar")).toBeEnabled();
    const downloaded = page.waitForEvent("download");
    await page.locator("#download-sidebar").click();
    expect((await downloaded).suggestedFilename()).toBe("alternative-pack.png");
});

test("sharing uses the ready PNG on the tap and invalidates it after selection changes", async ({
    page,
}) => {
    type Share = {
        active: boolean;
        inTap: boolean;
        capturesSinceTap: number;
        hash: string;
    };
    await page.addInitScript(() => {
        const state = window as typeof window & {
            reviewShares: Share[];
            captures: number;
            capturesAtTap: number;
            inTap: boolean;
        };
        state.reviewShares = [];
        state.captures = 0;
        state.capturesAtTap = 0;
        state.inTap = false;
        // Marks the click's own task, so a share() made after any await
        // (such as a fresh capture) is told apart from one made in the tap.
        window.addEventListener(
            "click",
            (event) => {
                if (!event.isTrusted) return;
                state.inTap = true;
                state.capturesAtTap = state.captures;
                setTimeout(() => (state.inTap = false));
            },
            { capture: true },
        );
        const toBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function (...args) {
            state.captures++;
            return toBlob.apply(this, args);
        };
        Object.defineProperty(navigator, "canShare", {
            configurable: true,
            value: () => true,
        });
        Object.defineProperty(navigator, "share", {
            configurable: true,
            value: async (payload: ShareData) => {
                const share = {
                    active: navigator.userActivation.isActive,
                    inTap: state.inTap,
                    capturesSinceTap: state.captures - state.capturesAtTap,
                };
                const bytes = await payload.files![0].arrayBuffer();
                const digest = await crypto.subtle.digest("SHA-256", bytes);
                const hash = Array.from(new Uint8Array(digest), (n) =>
                    n.toString(16).padStart(2, "0"),
                ).join("");
                state.reviewShares.push({ ...share, hash });
            },
        });
    });
    const shares = () =>
        page.evaluate(
            () =>
                (window as typeof window & { reviewShares: Share[] })
                    .reviewShares,
        );
    // The Download button hands over the same prepared image.
    const downloadHash = async () => {
        const [download] = await Promise.all([
            page.waitForEvent("download"),
            page.locator("#download-sidebar").click(),
        ]);
        const bytes = fs.readFileSync((await download.path())!);
        return createHash("sha256").update(bytes).digest("hex");
    };

    await page.goto("/create");
    await selectMail(page);
    await expect(page.locator("#share-sidebar")).toBeEnabled();
    await page.locator("#share-sidebar").click();
    await expect.poll(async () => (await shares()).length).toBe(1);
    const firstDownload = await downloadHash();

    await selectMail(page, "Tuta Mail");
    await expect(page.locator("#share-sidebar")).toBeDisabled();
    await expect(page.locator("#share-sidebar")).toBeEnabled();
    await page.locator("#share-sidebar").click();
    await expect.poll(async () => (await shares()).length).toBe(2);
    const secondDownload = await downloadHash();

    const [first, second] = await shares();
    for (const share of [first, second]) {
        expect(share).toMatchObject({
            active: true,
            inTap: true,
            capturesSinceTap: 0,
        });
    }
    expect(first.hash).toBe(firstDownload);
    expect(second.hash).toBe(secondDownload);
    expect(second.hash).not.toBe(first.hash);
});

test("retrying with the keyboard keeps focus and lands on Share when ready", async ({
    page,
}) => {
    await failExports(page);
    await page.goto("/create");
    await selectMail(page);
    const retry = page.getByRole("button", { name: "Retry export" });
    await expect(retry).toBeVisible();

    await recoverExports(page);
    await retry.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#share-sidebar")).toBeEnabled();
    await expect(page.locator("#share-sidebar")).toBeFocused();
    await expect(exportFailed(page)).toHaveCount(0);
});

test("a retry that fails again keeps focus on Retry", async ({ page }) => {
    await failExports(page);
    await page.goto("/create");
    await selectMail(page);
    const retry = page.getByRole("button", { name: "Retry export" });
    await retry.focus();
    await page.keyboard.press("Enter");
    await expect(retry).toBeVisible();
    await expect(retry).toBeFocused();
    await expect(page.locator("#download-sidebar")).toBeDisabled();
});

test("capture waits while the page is hidden instead of timing out", async ({
    page,
}) => {
    test.setTimeout(60_000);
    // Browsers stop animation frames in hidden tabs. Emulate that, because a
    // headless page cannot be backgrounded.
    await page.addInitScript(() => {
        let hidden = false;
        const pending: FrameRequestCallback[] = [];
        const requestFrame = window.requestAnimationFrame.bind(window);
        Object.defineProperty(Document.prototype, "visibilityState", {
            configurable: true,
            get: () => (hidden ? "hidden" : "visible"),
        });
        Object.defineProperty(Document.prototype, "hidden", {
            configurable: true,
            get: () => hidden,
        });
        window.requestAnimationFrame = (callback) => {
            if (!hidden) return requestFrame(callback);
            pending.push(callback);
            return 0;
        };
        (
            window as typeof window & { setHidden(value: boolean): void }
        ).setHidden = (value) => {
            hidden = value;
            document.dispatchEvent(new Event("visibilitychange"));
            if (!value) pending.splice(0).forEach(requestFrame);
        };
    });
    await page.goto("/create");
    await page.getByRole("button", { name: /^Mail alternatives:/ }).click();
    await page
        .getByRole("menuitemcheckbox")
        .filter({ hasText: "Proton Mail" })
        .click();
    // The user switches apps right after closing the picker.
    await page.keyboard.press("Escape");
    await page.evaluate(() =>
        (
            window as typeof window & { setHidden(value: boolean): void }
        ).setHidden(true),
    );
    // Longer than the 8s logo timeout.
    await page.waitForTimeout(9_000);
    await expect(
        page.getByRole("alert").filter({ hasText: "Export failed" }),
    ).toHaveCount(0);

    await page.evaluate(() =>
        (
            window as typeof window & { setHidden(value: boolean): void }
        ).setHidden(false),
    );
    await expect(page.locator("#download-sidebar")).toBeEnabled();
    await expect(
        page.getByRole("alert").filter({ hasText: "Export failed" }),
    ).toHaveCount(0);
});

test("a blocked font still exports, in a system font, and says so", async ({
    page,
}) => {
    // Content blockers and iOS Lockdown Mode can block web fonts.
    await page.route(FONT_FILES, (route) => route.abort("blockedbyclient"));
    await page.goto("/create");
    await selectMail(page);
    await expect(page.locator("#download-sidebar")).toBeEnabled();
    await expect(
        page.locator('[data-export-feedback="sidebar"]').getByRole("status"),
    ).toHaveText(SYSTEM_FONT_NOTICE);
    await expect(exportFailed(page)).toHaveCount(0);
});

test("a slow font falls back to a system font, then recovers", async ({
    page,
}) => {
    test.setTimeout(60_000);
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    await page.route(FONT_FILES, async (route) => {
        await released;
        await route.continue();
    });
    // Not waiting for the load event, which waits for the preloaded fonts.
    await page.goto("/create", { waitUntil: "domcontentloaded" });
    // The page runs: the preview is drawn once the renderer stops waiting.
    await expect(page.locator('canvas[data-preview-ready="true"]')).toHaveCount(
        1,
        { timeout: 15_000 },
    );
    await selectMail(page);
    const status = page
        .locator('[data-export-feedback="sidebar"]')
        .getByRole("status");
    // The renderer waits 5s for the fonts.
    await expect(page.locator("#download-sidebar")).toBeEnabled({
        timeout: 15_000,
    });
    await expect(status).toHaveText(SYSTEM_FONT_NOTICE);

    release();
    // The faces the image uses.
    expect(
        await page.evaluate(async () => {
            const specs = [
                "600 16px poppins",
                "400 16px roboto",
                "500 16px roboto",
            ];
            await Promise.all(specs.map((spec) => document.fonts.load(spec)));
            return specs.every((spec) => document.fonts.check(spec));
        }),
    ).toBe(true);
    await selectMail(page, "Tuta Mail");
    await expect(page.locator("#download-sidebar")).toBeEnabled();
    await expect(status).toHaveText("");
});

test("the system font notice stays while the pack is edited, so the page does not move", async ({
    page,
}) => {
    await page.route("**/_next/static/media/*.{ttf,woff2}*", (route) =>
        route.abort("blockedbyclient"),
    );
    await page.goto("/create");
    await selectMail(page);
    const status = page
        .locator('[data-export-feedback="sidebar"]')
        .getByRole("status");
    const notice = SYSTEM_FONT_NOTICE;
    await expect(page.locator("#download-sidebar")).toBeEnabled();
    await expect(status).toHaveText(notice);

    // If editing hid the notice until the next image was ready, the sidebar
    // would jump while the user picks.
    const picker = page.getByRole("button", {
        name: /^Photos alternatives:/,
    });
    const top = (await picker.boundingBox())!.y;
    await picker.click();
    await page
        .getByRole("menuitemcheckbox")
        .filter({ hasText: "Ente Photos" })
        .click();
    await expect(status).toHaveText(notice);
    expect((await picker.boundingBox())!.y).toBe(top);

    await page.keyboard.press("Escape");
    await expect(page.locator("#download-sidebar")).toBeEnabled();
    await expect(status).toHaveText(notice);
    expect((await picker.boundingBox())!.y).toBe(top);
});

test("glancing at a picker mid-capture does not restart the capture", async ({
    page,
}) => {
    await countEncodes(page);
    // A restart would abort the running capture.
    await page.addInitScript(() => {
        const state = window as typeof window & { aborts: number };
        const abort = AbortController.prototype.abort;
        state.aborts = 0;
        AbortController.prototype.abort = function (...args) {
            state.aborts++;
            return abort.apply(this, args);
        };
    });
    const aborts = () =>
        page.evaluate(
            () => (window as typeof window & { aborts: number }).aborts,
        );
    // Hold one logo back so the capture is still running when a picker opens.
    await page.route("**/app-logos/proton_mail.jpg*", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 3_000));
        await route.continue();
    });

    await page.goto("/create");
    await selectMail(page);
    // Past the capture delay, so the capture has started.
    await page.waitForTimeout(500);
    await expect(page.locator("#download-sidebar")).toBeDisabled();
    const abortsBefore = await aborts();
    const photos = page.getByRole("button", {
        name: /^Photos alternatives:/,
    });
    await photos.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);

    await expect(page.locator("#download-sidebar")).toBeEnabled();
    expect(await aborts()).toBe(abortsBefore);
    expect(await encodes(page)).toBe(1);
});

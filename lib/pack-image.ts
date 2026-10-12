// Draws the shareable Alternative Pack card (1500x1500) onto a canvas, and
// encodes it as a 3000x3000 PNG. Everything happens in the browser; nothing
// is uploaded.
import { poppins, roboto } from "@/app/fonts";
import { getAssetUrl } from "@/lib/assets";
import type { AppOption, PackItem } from "@/lib/pack";

export const PACK_IMAGE_SIZE = 1500;
const EXPORT_SCALE = 2;
const FONT_TIMEOUT_MS = 5000;
const LOGO_TIMEOUT_MS = 8000;

const MARGIN = 72;
const GRID_TOP = 300;
const GRID_BOTTOM = PACK_IMAGE_SIZE - MARGIN;
const GAP = 24;

const COLORS = {
    page: "#111317",
    layer: "#21242C",
    layerSecondary: "#373C49",
    border: "#373C49",
    heading: "#F0F2F4",
    body: "#D5D9E0",
    caption: "#848FA4",
    primary: "#00CCAA",
    primary100: "#002922",
};

const HEADING_FONT = poppins.style.fontFamily;
const BODY_FONT = roboto.style.fontFamily;
const firstFamily = (family: string) => family.split(",")[0].trim();

// Hugeicons "arrow-data-transfer-horizontal" (stroke rounded), 24x24.
const SWAP_ICON =
    "M19 9H6.659c-1.006 0-1.51 0-1.634-.309c-.125-.308.23-.672.941-1.398L8.211 5M5 15h12.341c1.006 0 1.51 0 1.634.309c.125.308-.23.672-.941 1.398L15.789 19";

type Logos = Map<string, HTMLImageElement | null>;

const logoCache = new Map<string, Promise<HTMLImageElement | null>>();

function abortError() {
    return new DOMException("Image preparation cancelled.", "AbortError");
}

/** Resolves to the loaded logo, or null when it cannot be loaded. */
function loadLogo(id: string) {
    let logo = logoCache.get(id);
    if (!logo) {
        logo = new Promise((resolve) => {
            const image = new Image();
            const timer = window.setTimeout(() => done(null), LOGO_TIMEOUT_MS);
            const done = (result: HTMLImageElement | null) => {
                window.clearTimeout(timer);
                image.onload = image.onerror = null;
                resolve(result);
            };
            image.decoding = "async";
            image.onload = () =>
                image.decode().then(
                    () => done(image),
                    () => done(null),
                );
            image.onerror = () => done(null);
            image.src = getAssetUrl(`/app-logos/${id}.jpg`);
        });
        // A logo that failed is tried again next time.
        logo.then((result) => {
            if (!result) logoCache.delete(id);
        });
        logoCache.set(id, logo);
    }
    return logo;
}

const unquote = (family: string) => family.replace(/^["']|["']$/g, "");
const WEIGHT_NAMES: Record<string, string> = { normal: "400", bold: "700" };

/**
 * Whether the page's face for `family` at `weight` has loaded. Checks the
 * face itself: WebKit's fonts.check() also passes for a face that failed.
 */
function faceLoaded(family: string, weight: string) {
    let found = false;
    let loaded = true;
    document.fonts.forEach((face) => {
        if (
            unquote(face.family) !== family ||
            (WEIGHT_NAMES[face.weight] ?? face.weight) !== weight
        ) {
            return;
        }
        found = true;
        if (face.status !== "loaded") loaded = false;
    });
    return found && loaded;
}

/** Loads both web fonts, and says whether they are ready for drawing. */
async function ensureFonts() {
    const faces = [
        [unquote(firstFamily(HEADING_FONT)), "600"],
        [unquote(firstFamily(BODY_FONT)), "400"],
        [unquote(firstFamily(BODY_FONT)), "500"],
    ] as const;
    try {
        await Promise.race([
            Promise.all(
                faces.map(([family, weight]) =>
                    document.fonts.load(`${weight} 20px "${family}"`),
                ),
            ),
            new Promise((resolve) =>
                window.setTimeout(resolve, FONT_TIMEOUT_MS),
            ),
        ]);
    } catch {
        // System fonts are an acceptable fallback.
    }
    return faces.every(([family, weight]) => faceLoaded(family, weight));
}

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawLogo(
    ctx: CanvasRenderingContext2D,
    app: AppOption,
    logo: HTMLImageElement | null | undefined,
    x: number,
    y: number,
    size: number,
) {
    ctx.save();
    roundRect(ctx, x, y, size, size, size * 0.22);
    ctx.clip();
    if (logo) {
        ctx.drawImage(logo, x, y, size, size);
    } else {
        ctx.fillStyle = COLORS.primary100;
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = COLORS.primary;
        ctx.font = `600 ${Math.round(size * 0.42)}px ${HEADING_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
            app.name.trim().charAt(0).toUpperCase(),
            x + size / 2,
            y + size / 2 + size * 0.03,
        );
    }
    ctx.restore();
}

/** Shrinks the font down to 70% to fit, then truncates with an ellipsis. */
function fitText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    fontSize: number,
    weight: number,
    family: string,
) {
    let size = fontSize;
    const minSize = Math.max(9, fontSize * 0.7);
    ctx.font = `${weight} ${size}px ${family}`;
    while (ctx.measureText(text).width > maxWidth && size > minSize) {
        size -= 0.5;
        ctx.font = `${weight} ${size}px ${family}`;
    }
    if (ctx.measureText(text).width <= maxWidth) return text;
    let cut = text;
    while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
        cut = cut.slice(0, -1);
    }
    return `${cut.trimEnd()}…`;
}

function drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    {
        size,
        weight = 400,
        family = BODY_FONT,
        color = COLORS.body,
        align = "left",
    }: {
        size: number;
        weight?: number;
        family?: string;
        color?: string;
        align?: CanvasTextAlign;
    },
) {
    const fitted = fitText(ctx, text, maxWidth, size, weight, family);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(fitted, x, y);
}

function drawArrow(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    length: number,
) {
    const head = length * 0.32;
    ctx.save();
    ctx.strokeStyle = COLORS.primary;
    ctx.lineWidth = Math.max(2, length * 0.09);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cx - length / 2, cy);
    ctx.lineTo(cx + length / 2, cy);
    ctx.moveTo(cx + length / 2 - head, cy - head);
    ctx.lineTo(cx + length / 2, cy);
    ctx.lineTo(cx + length / 2 - head, cy + head);
    ctx.stroke();
    ctx.restore();
}

function drawMark(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
) {
    const s = size / 24;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = COLORS.primary;
    roundRect(ctx, 0, 0, 24, 24, 6.5);
    ctx.fill();
    ctx.translate(12, 12);
    ctx.scale(0.66, 0.66);
    ctx.translate(-12, -12);
    ctx.strokeStyle = COLORS.page;
    ctx.lineWidth = 2.2 / 0.66;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke(new Path2D(SWAP_ICON));
    ctx.restore();
}

/** Columns, rows and card size for a pack of `count` categories. */
export function layoutFor(count: number) {
    const columns = count <= 12 ? Math.max(1, Math.min(count, 3)) : 4;
    const rows = Math.ceil(count / columns);
    const areaWidth = PACK_IMAGE_SIZE - MARGIN * 2;
    const areaHeight = GRID_BOTTOM - GRID_TOP;
    const width = (areaWidth - GAP * (columns - 1)) / columns;
    const maxHeight = count <= 3 ? 420 : 300;
    const height = Math.min(maxHeight, (areaHeight - GAP * (rows - 1)) / rows);
    const gridHeight = rows * height + (rows - 1) * GAP;
    const top = GRID_TOP + Math.max(0, (areaHeight - gridHeight) / 2);
    return { columns, rows, width, height, top };
}

/** Where each of `count` cards goes, in catalog order. */
export function cardRects(count: number) {
    const layout = layoutFor(count);
    return Array.from({ length: count }, (_, index) => {
        const row = Math.floor(index / layout.columns);
        const col = index % layout.columns;
        // Center an incomplete last row.
        const inRow =
            row === layout.rows - 1
                ? count - row * layout.columns
                : layout.columns;
        const rowWidth = inRow * layout.width + (inRow - 1) * GAP;
        const left = (PACK_IMAGE_SIZE - rowWidth) / 2;
        return {
            x: left + col * (layout.width + GAP),
            y: layout.top + row * (layout.height + GAP),
            width: layout.width,
            height: layout.height,
        };
    });
}

function drawCard(
    ctx: CanvasRenderingContext2D,
    item: PackItem,
    logos: Logos,
    x: number,
    y: number,
    w: number,
    h: number,
) {
    const k = h / 300; // scale relative to a 300px tall card
    const pad = Math.max(14, 24 * k);
    const main = { id: item.mainstream_app_id, name: item.mainstream_app_name };
    const alts = item.private_alternatives;

    ctx.fillStyle = COLORS.layer;
    roundRect(ctx, x, y, w, h, 22 * k + 4);
    ctx.fill();
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const labelSize = Math.max(13, 20 * k);
    drawText(
        ctx,
        item.category.toUpperCase(),
        x + pad,
        y + pad + labelSize * 0.8,
        w - pad * 2,
        { size: labelSize, weight: 500, color: COLORS.caption },
    );

    const contentTop = y + pad + labelSize * 1.5;
    const contentHeight = y + h - pad - contentTop;
    const arrowLength = Math.max(18, Math.min(40 * k, w * 0.08));
    const arrowGap = arrowLength * 0.5;
    const columnWidth = (w - pad * 2 - arrowLength - arrowGap * 2) / 2;
    const nameSize = Math.max(12, 22 * k);
    const logoSize = Math.min(
        columnWidth * 0.78,
        contentHeight - nameSize * 1.9,
        170,
    );
    const blockHeight = logoSize + nameSize * 1.7;
    const blockTop = contentTop + (contentHeight - blockHeight) / 2;
    const leftCenter = x + pad + columnWidth / 2;
    const rightX = x + w - pad - columnWidth;

    drawLogo(
        ctx,
        main,
        logos.get(main.id),
        leftCenter - logoSize / 2,
        blockTop,
        logoSize,
    );
    drawText(
        ctx,
        main.name,
        leftCenter,
        blockTop + logoSize + nameSize * 1.35,
        columnWidth,
        { size: nameSize, color: COLORS.caption, align: "center" },
    );

    drawArrow(
        ctx,
        x + pad + columnWidth + arrowGap + arrowLength / 2,
        blockTop + logoSize / 2,
        arrowLength,
    );

    if (alts.length === 1) {
        const alt = alts[0];
        const center = rightX + columnWidth / 2;
        drawLogo(
            ctx,
            alt,
            logos.get(alt.id),
            center - logoSize / 2,
            blockTop,
            logoSize,
        );
        drawText(
            ctx,
            alt.name,
            center,
            blockTop + logoSize + nameSize * 1.35,
            columnWidth,
            {
                size: nameSize,
                weight: 500,
                color: COLORS.heading,
                align: "center",
            },
        );
        return;
    }

    const rowGap = Math.max(6, 12 * k);
    const smallLogo = Math.min(
        (contentHeight - rowGap * (alts.length - 1)) / alts.length,
        logoSize * 0.5,
        64,
    );
    const listHeight = alts.length * smallLogo + (alts.length - 1) * rowGap;
    let rowY = blockTop + logoSize / 2 - listHeight / 2;
    const smallName = Math.max(11, Math.min(nameSize * 0.85, smallLogo * 0.5));
    const textGap = 10 * k + 4;
    for (const alt of alts) {
        drawLogo(ctx, alt, logos.get(alt.id), rightX, rowY, smallLogo);
        drawText(
            ctx,
            alt.name,
            rightX + smallLogo + textGap,
            rowY + smallLogo / 2 + smallName * 0.36,
            columnWidth - smallLogo - textGap,
            { size: smallName, weight: 500, color: COLORS.heading },
        );
        rowY += smallLogo + rowGap;
    }
}

function drawFrame(ctx: CanvasRenderingContext2D, count: number) {
    const size = PACK_IMAGE_SIZE;
    ctx.fillStyle = COLORS.page;
    ctx.fillRect(0, 0, size, size);

    const glow = ctx.createRadialGradient(
        size - 120,
        80,
        0,
        size - 120,
        80,
        760,
    );
    glow.addColorStop(0, "rgba(0, 204, 170, 0.16)");
    glow.addColorStop(1, "rgba(0, 204, 170, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    drawMark(ctx, MARGIN, MARGIN, 40);
    ctx.fillStyle = COLORS.primary;
    ctx.font = `500 22px ${BODY_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("MY ALTERNATIVE PACK", MARGIN + 56, MARGIN + 21);

    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = COLORS.heading;
    ctx.font = `600 64px ${HEADING_FONT}`;
    ctx.fillText("I switched to", MARGIN, MARGIN + 132);
    const lead = ctx.measureText("I switched to ").width;
    ctx.fillStyle = COLORS.primary;
    ctx.fillText("alternative apps.", MARGIN + lead, MARGIN + 132);

    ctx.fillStyle = COLORS.caption;
    ctx.font = `400 26px ${BODY_FONT}`;
    const label = count === 1 ? "1 switch" : `${count} switches`;
    ctx.fillText(`${label} and counting.`, MARGIN, MARGIN + 182);
}

function drawEmpty(ctx: CanvasRenderingContext2D) {
    const size = PACK_IMAGE_SIZE;
    ctx.fillStyle = COLORS.page;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = COLORS.layerSecondary;
    ctx.setLineDash([18, 14]);
    ctx.lineWidth = 4;
    roundRect(ctx, 120, 120, size - 240, size - 240, 60);
    ctx.stroke();
    ctx.setLineDash([]);
    drawMark(ctx, size / 2 - 60, size / 2 - 190, 120);
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.heading;
    ctx.font = `600 60px ${HEADING_FONT}`;
    ctx.fillText("Your pack is empty", size / 2, size / 2 + 30);
    ctx.fillStyle = COLORS.caption;
    ctx.font = `400 36px ${BODY_FONT}`;
    ctx.fillText(
        "Pick an alternative to get started.",
        size / 2,
        size / 2 + 100,
    );
}

/**
 * Draws `pack` (only categories with alternatives) onto `canvas` at
 * `pixelSize` square. Resolves once drawn, saying whether the web fonts were
 * used; without them the text is set in a system font.
 */
export async function renderPackImage(
    canvas: HTMLCanvasElement,
    pack: PackItem[],
    {
        pixelSize = PACK_IMAGE_SIZE,
        signal,
    }: { pixelSize?: number; signal?: AbortSignal } = {},
) {
    const fontLoaded = await ensureFonts();
    const apps = pack.flatMap((item) => [
        { id: item.mainstream_app_id, name: item.mainstream_app_name },
        ...item.private_alternatives,
    ]);
    const loaded = await Promise.all(apps.map((app) => loadLogo(app.id)));
    if (signal?.aborted) throw abortError();
    const logos: Logos = new Map(
        apps.map((app, index) => [app.id, loaded[index]]),
    );

    canvas.width = pixelSize;
    canvas.height = pixelSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable.");
    const scale = pixelSize / PACK_IMAGE_SIZE;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingQuality = "high";

    if (pack.length === 0) {
        drawEmpty(ctx);
        return { fontLoaded };
    }

    drawFrame(ctx, pack.length);
    const rects = cardRects(pack.length);
    pack.forEach((item, index) => {
        const { x, y, width, height } = rects[index];
        drawCard(ctx, item, logos, x, y, width, height);
    });
    return { fontLoaded };
}

/** Renders the pack as a 3000x3000 PNG. */
export async function createPackPng(pack: PackItem[], signal?: AbortSignal) {
    const canvas = document.createElement("canvas");
    const { fontLoaded } = await renderPackImage(canvas, pack, {
        pixelSize: PACK_IMAGE_SIZE * EXPORT_SCALE,
        signal,
    });
    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (result) =>
                result ? resolve(result) : reject(new Error("Empty image.")),
            "image/png",
        );
    });
    if (signal?.aborted) throw abortError();
    return { blob, fontLoaded };
}

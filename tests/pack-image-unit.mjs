import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { loadTsModule } from "./load-ts-module.mjs";

const { PACK_IMAGE_SIZE, cardRects } = await loadTsModule(
    path.join(process.cwd(), "lib", "pack-image.ts"),
    {
        "@/app/fonts": {
            poppins: { style: { fontFamily: "Poppins" } },
            roboto: { style: { fontFamily: "Roboto" } },
        },
        "@/lib/assets": { getAssetUrl: (url) => url },
    },
);

const categoryCount = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "apps.json"), "utf8"),
).categories.length;

// The title and tagline take the top of the image; cards keep a margin.
const MARGIN = 72;
const GRID_TOP = 300;

test("cards fit below the header and inside the margin at every pack size", () => {
    for (let count = 1; count <= categoryCount; count++) {
        const rects = cardRects(count);
        assert.equal(rects.length, count);
        for (const [index, rect] of rects.entries()) {
            const where = `card ${index + 1} of ${count}`;
            assert.ok(rect.x >= MARGIN - 0.01, where);
            assert.ok(
                rect.x + rect.width <= PACK_IMAGE_SIZE - MARGIN + 0.01,
                where,
            );
            assert.ok(rect.y >= GRID_TOP - 0.01, where);
            assert.ok(
                rect.y + rect.height <= PACK_IMAGE_SIZE - MARGIN + 0.01,
                where,
            );
        }
    }
});

test("cards never overlap and stay large enough to read", () => {
    for (let count = 1; count <= categoryCount; count++) {
        const rects = cardRects(count);
        for (const rect of rects) {
            // At the 3000px export this is at least 600x220.
            assert.ok(rect.width >= 300, `width at ${count}`);
            assert.ok(rect.height >= 110, `height at ${count}`);
        }
        for (let a = 0; a < rects.length; a++) {
            for (let b = a + 1; b < rects.length; b++) {
                const first = rects[a];
                const second = rects[b];
                const apart =
                    first.x + first.width <= second.x + 0.01 ||
                    second.x + second.width <= first.x + 0.01 ||
                    first.y + first.height <= second.y + 0.01 ||
                    second.y + second.height <= first.y + 0.01;
                assert.ok(apart, `cards ${a + 1} and ${b + 1} of ${count}`);
            }
        }
    }
});

test("cards keep catalog order, row by row, with a short last row centered", () => {
    const rects = cardRects(5);
    assert.deepEqual(
        rects.map(({ y }) => Math.round(y)),
        [rects[0].y, rects[0].y, rects[0].y, rects[3].y, rects[3].y].map(
            Math.round,
        ),
    );
    assert.ok(rects[1].x > rects[0].x && rects[2].x > rects[1].x);
    const lastRowCenter = (rects[3].x + rects[4].x + rects[4].width) / 2;
    assert.ok(Math.abs(lastRowCenter - PACK_IMAGE_SIZE / 2) < 0.01);
});

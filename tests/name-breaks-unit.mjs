import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadTsModule } from "./load-ts-module.mjs";

const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
);
const { nameParts } = await loadTsModule(
    path.join(repoRoot, "lib", "name-breaks.ts"),
);
const catalog = JSON.parse(
    await fs.readFile(path.join(repoRoot, "data", "apps.json"), "utf8"),
);

test("short words are left whole", () => {
    assert.deepEqual(nameParts("Proton Mail"), ["Proton Mail"]);
    assert.deepEqual(nameParts("Pop!_OS"), ["Pop!_OS"]);
    assert.deepEqual(nameParts("iCloud"), ["iCloud"]);
});

test("long words may wrap after a slash or a dot or between camelCase parts", () => {
    assert.deepEqual(nameParts("TranslateLocally"), ["Translate", "Locally"]);
    assert.deepEqual(nameParts("mailbox.org"), ["mailbox.", "org"]);
    assert.deepEqual(nameParts("Fileverse dDocs/dSheets"), [
        "Fileverse dDocs/",
        "dSheets",
    ]);
    assert.deepEqual(nameParts("OpenMandriva"), ["Open", "Mandriva"]);
});

test("every catalog name keeps its text", () => {
    for (const category of catalog.categories) {
        for (const app of [
            ...category.mainstream_apps,
            ...category.private_alternatives,
        ]) {
            assert.equal(nameParts(app.name).join(""), app.name);
        }
    }
});

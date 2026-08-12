#!/usr/bin/env node

// Manual, one-way lossy compression pass over the Workshop's blueprints
// gallery and the town Gallery's art gallery — the two content folders
// with large, frequently-replaced source images (see CLAUDE.md's "Asset
// files change out from under the code" section). Deliberately NOT wired
// into `npm run build`: re-compressing is a one-way lossy operation, so
// it should only happen when someone chooses to run it after adding new
// assets, not silently on every build.
//
// Format is preserved per file (a .png stays a .png, just recompressed) —
// filenames are hardcoded, exact-match strings in src/data/library.js,
// src/data/workshopContent.js, and src/scenes/GalleryScene.js, so this
// script never renames or changes a file's extension. That rules out
// blanket-converting everything to one target format (e.g. all-WebP):
// doing so would silently break those file lists. Re-run those files
// through their existing per-extension encoder instead.

import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const TARGET_DIRS = [
    "public/assets/documents/blueprints",
    "public/assets/images/gallery"
];

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 80;
const WEBP_QUALITY = 80;
const PNG_QUALITY = 80;
const AVIF_QUALITY = 80;

// Files already in this format under this size are assumed to already be
// web-reasonable — skipped entirely (no resize, no re-encode) rather than
// spending time re-compressing something that's already fine.
const SKIP_JPEG_UNDER_BYTES = 2 * 1024 * 1024;

// One encoder per extension, all targeting a "quality 80" equivalent.
// mozjpeg gives noticeably better JPEG compression than sharp's default
// libjpeg encoder at the same quality setting. PNG has no native lossy
// quality knob — `palette: true` engages libimagequant quantization,
// which is what makes PNG's own `quality` option meaningful.
const ENCODERS = {
    ".jpg": (image) => image.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }),
    ".jpeg": (image) => image.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }),
    ".png": (image) => image.png({ quality: PNG_QUALITY, palette: true }),
    ".webp": (image) => image.webp({ quality: WEBP_QUALITY }),
    ".avif": (image) => image.avif({ quality: AVIF_QUALITY })
};

function formatBytes(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

async function processFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const encode = ENCODERS[ext];
    const relPath = path.relative(PROJECT_ROOT, filePath);

    if (!encode) {
        console.log(`  skip (unsupported format): ${relPath}`);
        return null;
    }

    const { size: originalSize } = await stat(filePath);

    if ((ext === ".jpg" || ext === ".jpeg") && originalSize < SKIP_JPEG_UNDER_BYTES) {
        console.log(`  skip (already JPEG, under 2MB): ${relPath}`);
        return null;
    }

    // withoutEnlargement means this resize is a no-op for anything already
    // under MAX_DIMENSION wide — safe to call unconditionally rather than
    // checking metadata.width first.
    const pipeline = sharp(filePath).resize({
        width: MAX_DIMENSION,
        withoutEnlargement: true
    });

    const outputBuffer = await encode(pipeline).toBuffer();

    if (outputBuffer.length >= originalSize) {
        console.log(`  skip (no size improvement): ${relPath} (${formatBytes(originalSize)} -> ${formatBytes(outputBuffer.length)})`);
        return null;
    }

    await writeFile(filePath, outputBuffer);

    const savedPct = (100 * (1 - outputBuffer.length / originalSize)).toFixed(0);
    console.log(`  optimized: ${relPath} (${formatBytes(originalSize)} -> ${formatBytes(outputBuffer.length)}, -${savedPct}%)`);

    return { originalSize, newSize: outputBuffer.length };
}

async function processDir(relDir) {
    const dirPath = path.join(PROJECT_ROOT, relDir);
    console.log(`\n${relDir}/`);

    let entries;
    try {
        entries = await readdir(dirPath, { withFileTypes: true });
    } catch (err) {
        console.log(`  skip (folder not found): ${relDir}`);
        return [];
    }

    const results = [];

    for (const entry of entries) {
        if (!entry.isFile() || entry.name.startsWith(".")) continue;

        const result = await processFile(path.join(dirPath, entry.name));
        if (result) results.push(result);
    }

    return results;
}

async function main() {
    const allResults = [];

    for (const dir of TARGET_DIRS) {
        allResults.push(...await processDir(dir));
    }

    const totalOriginal = allResults.reduce((sum, r) => sum + r.originalSize, 0);
    const totalNew = allResults.reduce((sum, r) => sum + r.newSize, 0);

    console.log(`\n${allResults.length} file(s) optimized.`);
    if (allResults.length > 0) {
        const savedPct = (100 * (1 - totalNew / totalOriginal)).toFixed(0);
        console.log(`Total: ${formatBytes(totalOriginal)} -> ${formatBytes(totalNew)} (-${savedPct}%)`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

import { TILE } from "./MapData";

const TILE_SIZE = 32;
const GROUND_TEXTURE_KEY = "ground-layer";

// grass1/flowers1/flowers2/flowers4 are decorative "clump" sprites, not
// edge-to-edge tileable ground textures — measured directly: only 11-18%
// of each canvas is actually opaque, the rest is transparent padding
// around a small centered clump. Laying them out one-per-tile (even with
// a matching base color behind them) reads as sparse distinct squares on
// a flat field, not a continuous grassy area. Instead, each clump is
// cropped down to just its opaque content, then stamped at every tile
// position but drawn larger than the tile spacing, so neighboring stamps
// overlap enough to fully cover the base color beneath them.
const GRASS_VARIANTS = [
    { key: "grass1", upTo: 0.80 },
    { key: "flowers1", upTo: 0.87 },
    { key: "flowers2", upTo: 0.935 },
    { key: "flowers4", upTo: 1.00 }
];

const STAMP_DRAW_SIZE = 64; // drawn at 2 tiles per stamp, spaced 1 tile apart
const JITTER = 10; // px of deterministic per-tile wobble so it doesn't look grid-locked

// Deterministic pseudo-random value in [0, 1) for a coordinate (+ an
// optional salt for a second independent value at the same coordinate),
// so the ground texture doesn't change every time the map re-renders
// (e.g. re-entering World from a building).
function hashTile(x, y, salt = 0) {
    const v = Math.sin((x * 12.9898) + (y * 78.233) + salt) * 43758.5453;
    return v - Math.floor(v);
}

function pickGrassTexture(x, y) {
    const roll = hashTile(x, y);
    const variant = GRASS_VARIANTS.find((v) => roll < v.upTo);
    return variant ? variant.key : "grass1";
}

// Finds the bounding box of the non-transparent pixels in an image, by
// drawing it to an offscreen canvas and scanning the alpha channel.
function getOpaqueBounds(image) {

    const w = image.width;
    const h = image.height;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);

    const { data } = ctx.getImageData(0, 0, w, h);

    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {

            const alpha = data[(((y * w) + x) * 4) + 3];

            if (alpha > 10) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }

        }
    }

    if (minX > maxX) {
        return { sx: 0, sy: 0, sw: w, sh: h };
    }

    return { sx: minX, sy: minY, sw: (maxX - minX) + 1, sh: (maxY - minY) + 1 };

}

export default class TileRenderer {
    constructor(scene) {
        this.scene = scene;
        this.graphics = null;
        this.groundImage = null;
    }

    render(map) {
        if (!map || !map.length) return;

        // clear any previous graphics/image
        if (this.graphics) this.clear();

        const HEIGHT = map.length;
        const WIDTH = map[0].length;

        // Ground layer: the whole map is deterministic (same hash every
        // time), so the composited canvas only ever needs to be built once
        // per game session — re-entering World just reuses the cached
        // texture instead of re-stamping again.
        //
        // Built with plain Canvas2D drawImage rather than Phaser's
        // RenderTexture: RenderTexture.draw() flushes the WebGL pipeline
        // on every call, which made an earlier version of this take
        // upward of 15+ seconds for a map this size. drawImage in a loop
        // is the standard fast path for stamping a large tile grid.
        if (!this.scene.textures.exists(GROUND_TEXTURE_KEY)) {

            const canvas = document.createElement("canvas");
            canvas.width = WIDTH * TILE_SIZE;
            canvas.height = HEIGHT * TILE_SIZE;

            const ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = false;

            // Base fill so any hairline gap between overlapping clumps
            // (organic/rounded shapes never tile perfectly) still reads
            // as grass instead of a visible seam.
            ctx.fillStyle = "#88A95F";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const sourceImages = {};
            const bounds = {};

            GRASS_VARIANTS.forEach(({ key }) => {
                const image = this.scene.textures.get(key).getSourceImage();
                sourceImages[key] = image;
                bounds[key] = getOpaqueBounds(image);
            });

            for (let y = 0; y < HEIGHT; y++) {
                for (let x = 0; x < WIDTH; x++) {

                    const key = pickGrassTexture(x, y);
                    const image = sourceImages[key];
                    const { sx, sy, sw, sh } = bounds[key];

                    const jitterX = (hashTile(x, y, 1) - 0.5) * JITTER;
                    const jitterY = (hashTile(x, y, 2) - 0.5) * JITTER;

                    const dx = (x * TILE_SIZE) + (TILE_SIZE / 2) - (STAMP_DRAW_SIZE / 2) + jitterX;
                    const dy = (y * TILE_SIZE) + (TILE_SIZE / 2) - (STAMP_DRAW_SIZE / 2) + jitterY;

                    ctx.drawImage(
                        image,
                        sx, sy, sw, sh,
                        dx, dy, STAMP_DRAW_SIZE, STAMP_DRAW_SIZE
                    );

                }
            }

            this.scene.textures.addCanvas(GROUND_TEXTURE_KEY, canvas);

        }

        this.groundImage = this.scene.add.image(0, 0, GROUND_TEXTURE_KEY);
        this.groundImage.setOrigin(0, 0);

        // STONE/WATER stay flat-colored, drawn on top of the ground
        // texture so paths/plaza/water still read correctly.
        this.graphics = this.scene.add.graphics();

        for (let y = 0; y < HEIGHT; y++) {
            for (let x = 0; x < WIDTH; x++) {
                const tile = map[y][x];

                switch (tile) {
                    case TILE.GRASS:
                        continue;

                    case TILE.STONE:
                        this.graphics.fillStyle(0x9B9B9B);
                        break;

                    case TILE.WATER:
                        this.graphics.fillStyle(0x4A90E2);
                        break;

                    default:
                        this.graphics.fillStyle(0xff00ff);
                        break;
                }

                this.graphics.fillRect(
                    x * TILE_SIZE,
                    y * TILE_SIZE,
                    TILE_SIZE,
                    TILE_SIZE
                );
            }
        }
    }

    clear() {
        if (this.graphics) {
            this.graphics.clear();
            this.graphics.destroy();
            this.graphics = null;
        }

        if (this.groundImage) {
            this.groundImage.destroy();
            this.groundImage = null;
        }
    }
}

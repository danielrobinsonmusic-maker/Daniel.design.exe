import { TILE, FOUNTAIN_TILE, TOWN_SQUARE_BOUNDS } from "./MapData";
import { BUILDINGS } from "./Buildings";

const TILE_SIZE = 32;
const GROUND_TEXTURE_KEY = "ground-layer";

// grass-base.png is a genuinely seamless, fully-opaque tile — the actual
// ground coverage layer, drawn once per tile at normal tile size with no
// cropping/overlap needed since it already tiles edge-to-edge. grass-base1
// is a second variant (same seamless tiling, a few flowers/blades baked
// in) swapped in on a small fraction of tiles so the base layer doesn't
// look like one single texture repeated everywhere.
const GRASS_BASE_KEY = "grass-base";
const GRASS_BASE_ALT_KEY = "grass-base1";
const GRASS_BASE_ALT_CHANCE = 0.10;

// grass1/flowers1/flowers2/flowers4 are decorative "clump" sprites, not
// tileable textures — measured directly: only 11-18% of each canvas is
// actually opaque, the rest is transparent padding around a small
// centered clump. They're scattered sparsely on TOP of the base layer as
// decoration (not coverage), each drawn at its own natural cropped size.
const GRASS_VARIANTS = [
    { key: "grass1", upTo: 0.80 },
    { key: "flowers1", upTo: 0.87 },
    { key: "flowers2", upTo: 0.935 },
    { key: "flowers4", upTo: 1.00 }
];

const DECORATION_CHANCE = 0.12; // ~12% of tiles get a decoration on top of the base
const JITTER = 10; // px of deterministic per-tile wobble so it doesn't look grid-locked

// Deterministic pseudo-random value in [0, 1) for a coordinate (+ an
// optional salt for a second independent value at the same coordinate),
// so the ground texture doesn't change every time the map re-renders
// (e.g. re-entering World from a building).
function hashTile(x, y, salt = 0) {
    const v = Math.sin((x * 12.9898) + (y * 78.233) + salt) * 43758.5453;
    return v - Math.floor(v);
}

// Independent salted roll from the variant pick and jitter, so which
// tiles get a decoration doesn't correlate with which variant they'd get.
function shouldPlaceDecoration(x, y) {
    return hashTile(x, y, 3) < DECORATION_CHANCE;
}

// Own salt (4) so which tiles get the alt base doesn't correlate with
// which tiles get a decoration on top of it.
function shouldUseAltBase(x, y) {
    return hashTile(x, y, 4) < GRASS_BASE_ALT_CHANCE;
}

// One of 4 quarter-turns. Only 90-degree steps — the source tile stays
// square at any of them, so neighbors still butt edge-to-edge with no
// gaps, just with the stone pattern reoriented so identical tiles don't
// read as an obvious repeating grid. Takes its own salt so path.png and
// square1/square2 rotate independently rather than in lockstep.
function pickQuarterRotation(x, y, salt) {
    return Math.floor(hashTile(x, y, salt) * 4) * (Math.PI / 2);
}

// path1.png is reserved for the two approach tiles leading directly into
// each building's door — its own doorTile plus the tile immediately
// south of it (every door "only opens south", per Buildings.js, so that
// south neighbor is always the final step of the approach) — not a
// random roll, always those specific tiles for every building that has
// one. Building this lookup once (module load, BUILDINGS is static)
// rather than scanning BUILDINGS per tile in the render loop.
const ENTRANCE_APPROACH_TILES = new Set();
BUILDINGS.forEach((building) => {
    if (!building.doorTile) return;
    const { x, y } = building.doorTile;
    ENTRANCE_APPROACH_TILES.add(`${x},${y}`);
    ENTRANCE_APPROACH_TILES.add(`${x},${y + 1}`);
});

function isEntranceApproachTile(x, y) {
    return ENTRANCE_APPROACH_TILES.has(`${x},${y}`);
}

// path2.png is a straight-path variant swapped in on a fraction of the
// remaining STONE tiles (i.e. not a corner, not a doorway approach) so
// the path doesn't read as one tile repeated everywhere. Own salt (7) so
// this doesn't correlate with the grass variant/jitter rolls or the
// plain path.png rotation (salt 5).
const PATH_VARIANT_CHANCE = 0.35;

function shouldUsePathVariant(x, y) {
    return hashTile(x, y, 7) < PATH_VARIANT_CHANCE;
}

// path-corner.png's default orientation (measured directly — sampled
// pixel color along all 4 edges): its NORTH and EAST edges are clean
// path, its SOUTH and WEST edges are clean grass, and the curve bites
// into the SOUTHWEST corner. So a tile whose own north+east neighbors
// are STONE (and south/west aren't) needs this image undrawn (0
// rotation) — canvas ctx.rotate() turns clockwise for positive angles,
// so rotating that default 90/180/270 degrees clockwise walks the
// "path" edge pair around N+E -> E+S -> S+W -> W+N in the same order.
// Returns null for anything that isn't a clean 2-ADJACENT-neighbor turn
// (0/1/3/4 STONE neighbors, or the two opposite-neighbor "hallway"
// cases like N+S) — those keep rendering as plain path.png.
function getCornerRotation(north, east, south, west) {

    if (north && east && !south && !west) return 0;
    if (east && south && !west && !north) return Math.PI / 2;
    if (south && west && !north && !east) return Math.PI;
    if (west && north && !east && !south) return (3 * Math.PI) / 2;

    return null;

}

// The town square plaza renders as 3 concentric zones: square3.png marks
// a 5x5 patch (Chebyshev distance <= 2) centered on FOUNTAIN_TILE —
// "under the fountain, in a square shape around it" — square1.png rings
// the very outer edge of the plaza rectangle, and square2.png fills
// everything in between.
const FOUNTAIN_PATCH_RADIUS = 2;

function isNearFountain(x, y) {
    return Math.max(Math.abs(x - FOUNTAIN_TILE.x), Math.abs(y - FOUNTAIN_TILE.y)) <= FOUNTAIN_PATCH_RADIUS;
}

function isOuterPerimeter(x, y) {
    return x === TOWN_SQUARE_BOUNDS.minCol || x === TOWN_SQUARE_BOUNDS.maxCol
        || y === TOWN_SQUARE_BOUNDS.minRow || y === TOWN_SQUARE_BOUNDS.maxRow;
}

// Picks which of the 3 plaza images a tile should use by zone, falling
// back to whichever of the others actually loaded if its own zone's
// texture is missing — each zone's assets have gone missing/gotten
// renamed at least once already this session, so this stays visibly
// paved instead of dropping to flat gray over one absent file.
function pickPlazaImage(x, y, images) {

    if (isNearFountain(x, y)) {
        return images.square3 || images.square2 || images.square1;
    }

    if (isOuterPerimeter(x, y)) {
        return images.square1 || images.square2 || images.square3;
    }

    return images.square2 || images.square1 || images.square3;

}

// Picks among whichever variants actually loaded, keeping their relative
// shares proportional to GRASS_VARIANTS' authored weights rather than
// just falling through to grass1 for a missing texture's share.
function pickGrassVariant(x, y, availableVariants) {

    const roll = hashTile(x, y);

    let cumulative = 0;
    const weights = availableVariants.map((v) => {
        const index = GRASS_VARIANTS.indexOf(v);
        const previous = index > 0 ? GRASS_VARIANTS[index - 1].upTo : 0;
        return v.upTo - previous;
    });
    const weightTotal = weights.reduce((sum, w) => sum + w, 0);

    for (let i = 0; i < availableVariants.length; i++) {
        cumulative += weights[i] / weightTotal;
        if (roll < cumulative) return availableVariants[i].key;
    }

    return availableVariants[availableVariants.length - 1].key;

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
        // Read fresh every render() call (not just when the cache is being
        // built) — a new TileRenderer instance is created each time
        // WorldScene.create() runs, so an instance property set only
        // inside the cache-build block would stay undefined on every
        // later visit once the canvas is already cached, and the STONE/
        // PLAZA cases below would wrongly fall back to a flat gray
        // overpaint.
        this.hasPathTexture = this.scene.textures.exists("path");
        this.hasPath1Texture = this.scene.textures.exists("path1");
        this.hasPath2Texture = this.scene.textures.exists("path2");
        this.hasPathCornerTexture = this.scene.textures.exists("path-corner");
        this.hasSquare1Texture = this.scene.textures.exists("square1");
        this.hasSquare2Texture = this.scene.textures.exists("square2");
        this.hasSquare3Texture = this.scene.textures.exists("square3");
        this.hasAnySquareTexture = this.hasSquare1Texture || this.hasSquare2Texture || this.hasSquare3Texture;

        if (!this.scene.textures.exists(GROUND_TEXTURE_KEY)) {

            const canvas = document.createElement("canvas");
            canvas.width = WIDTH * TILE_SIZE;
            canvas.height = HEIGHT * TILE_SIZE;

            const ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = false;

            // Base layer: both grass-base images are genuinely seamless and
            // fully opaque, so each tile is just drawn once at normal tile
            // size — no cropping, no overlap, no fallback fill needed. The
            // alt variant only gets used where it actually loaded.
            const grassBase = this.scene.textures.get(GRASS_BASE_KEY).getSourceImage();
            const grassBaseAlt = this.scene.textures.exists(GRASS_BASE_ALT_KEY)
                ? this.scene.textures.get(GRASS_BASE_ALT_KEY).getSourceImage()
                : null;

            for (let y = 0; y < HEIGHT; y++) {
                for (let x = 0; x < WIDTH; x++) {

                    const useAlt = grassBaseAlt && shouldUseAltBase(x, y);

                    ctx.drawImage(
                        useAlt ? grassBaseAlt : grassBase,
                        x * TILE_SIZE, y * TILE_SIZE,
                        TILE_SIZE, TILE_SIZE
                    );

                }
            }

            // Decoration layer: sparse clumps scattered on top of the base,
            // each drawn at its own natural cropped-opaque size (no
            // doubling/overlap needed — this is decoration, not coverage).
            // Only variants whose texture actually loaded are used — a
            // missing file (Phaser logs a load error but doesn't throw)
            // would otherwise draw its "missing texture" placeholder tile
            // wherever that variant got picked.
            const availableVariants = GRASS_VARIANTS.filter(({ key }) => this.scene.textures.exists(key));

            const sourceImages = {};
            const bounds = {};

            availableVariants.forEach(({ key }) => {
                const image = this.scene.textures.get(key).getSourceImage();
                sourceImages[key] = image;
                bounds[key] = getOpaqueBounds(image);
            });

            for (let y = 0; y < HEIGHT; y++) {
                for (let x = 0; x < WIDTH; x++) {

                    if (!shouldPlaceDecoration(x, y)) continue;
                    if (!availableVariants.length) continue;

                    const key = pickGrassVariant(x, y, availableVariants);
                    const image = sourceImages[key];
                    const { sx, sy, sw, sh } = bounds[key];

                    const jitterX = (hashTile(x, y, 1) - 0.5) * JITTER;
                    const jitterY = (hashTile(x, y, 2) - 0.5) * JITTER;

                    const dx = (x * TILE_SIZE) + (TILE_SIZE / 2) - (sw / 2) + jitterX;
                    const dy = (y * TILE_SIZE) + (TILE_SIZE / 2) - (sh / 2) + jitterY;

                    ctx.drawImage(
                        image,
                        sx, sy, sw, sh,
                        dx, dy, sw, sh
                    );

                }
            }

            // STONE tiles (path/spur pavement outside the town square) get
            // path.png — a genuinely seamless, fully-opaque cobblestone
            // tile (same as the grass base: no cropping/overlap needed),
            // baked into this same cached canvas rather than drawn as a
            // live Graphics fill. Drawn last so it fully covers whatever
            // grass/decoration landed underneath. WATER has no real asset
            // yet, so it's left as a flat live-drawn fill below — out of
            // scope for this pass. PLAZA tiles (the town square rectangle)
            // normally get square1/square2/square3 instead (below) — they
            // only fall back to path.png here if none of those three
            // loaded, so the plaza still reads as pavement rather than
            // flat gray.
            //
            // Rotated a random quarter-turn per tile (deterministic, same
            // hash approach as everything else here) so the exact same
            // source image drawn at every tile doesn't read as an obvious
            // repeating stamp — EXCEPT at outer turns (exactly 2 ADJACENT
            // STONE neighbors, e.g. north+east but not north+south), where
            // path-corner.png is drawn instead at a specific, deterministic
            // rotation matching that neighbor pair (see getCornerRotation)
            // so the curve always faces the actual grass corner rather
            // than a random direction. Only applies to real STONE tiles,
            // not the plazaFallback case — a corner tile butting against
            // PLAZA pavement isn't a defined shape here.
            if (this.hasPathTexture) {

                const pathImage = this.scene.textures.get("path").getSourceImage();
                const cornerImage = this.hasPathCornerTexture
                    ? this.scene.textures.get("path-corner").getSourceImage()
                    : null;
                const path1Image = this.hasPath1Texture
                    ? this.scene.textures.get("path1").getSourceImage()
                    : null;
                const path2Image = this.hasPath2Texture
                    ? this.scene.textures.get("path2").getSourceImage()
                    : null;
                const half = TILE_SIZE / 2;
                const isStone = (tx, ty) => !!(map[ty] && map[ty][tx] === TILE.STONE);

                for (let y = 0; y < HEIGHT; y++) {
                    for (let x = 0; x < WIDTH; x++) {

                        const tile = map[y][x];
                        const plazaFallback = tile === TILE.PLAZA && !this.hasAnySquareTexture;

                        if (tile !== TILE.STONE && !plazaFallback) continue;

                        let image = pathImage;
                        let rotation = pickQuarterRotation(x, y, 5);
                        let isCorner = false;

                        if (cornerImage && tile === TILE.STONE) {

                            const cornerRotation = getCornerRotation(
                                isStone(x, y - 1),
                                isStone(x + 1, y),
                                isStone(x, y + 1),
                                isStone(x - 1, y)
                            );

                            if (cornerRotation !== null) {
                                image = cornerImage;
                                rotation = cornerRotation;
                                isCorner = true;
                            }

                        }

                        // Straight (non-corner) STONE tiles only. path1.png
                        // is reserved for the doorway approach tiles
                        // (always those specific tiles, not a roll);
                        // path2.png is a 35%-chance variant on whatever's
                        // left; everything else stays plain path.png. All
                        // three keep using the same random quarter-turn
                        // rolled above (salt 5) — every path tile rotates
                        // randomly regardless of which image it drew.
                        if (!isCorner && tile === TILE.STONE) {

                            if (path1Image && isEntranceApproachTile(x, y)) {
                                image = path1Image;
                            } else if (path2Image && shouldUsePathVariant(x, y)) {
                                image = path2Image;
                            }

                        }

                        const centerX = (x * TILE_SIZE) + half;
                        const centerY = (y * TILE_SIZE) + half;

                        ctx.save();
                        ctx.translate(centerX, centerY);
                        ctx.rotate(rotation);
                        ctx.drawImage(
                            image,
                            -half, -half,
                            TILE_SIZE, TILE_SIZE
                        );
                        ctx.restore();

                    }
                }

            }

            // PLAZA tiles (the town square rectangle only, not the path
            // spurs) render as 3 concentric zones — see pickPlazaImage —
            // all genuinely seamless and fully opaque like path.png, so
            // same one-draw-per-tile treatment. Rotated a random
            // quarter-turn too (own salt, 6, so it doesn't rotate in
            // lockstep with path.png) so the plaza doesn't read as an
            // obvious repeating grid either.
            if (this.hasAnySquareTexture) {

                const squareImages = {
                    square1: this.hasSquare1Texture ? this.scene.textures.get("square1").getSourceImage() : null,
                    square2: this.hasSquare2Texture ? this.scene.textures.get("square2").getSourceImage() : null,
                    square3: this.hasSquare3Texture ? this.scene.textures.get("square3").getSourceImage() : null
                };
                const half = TILE_SIZE / 2;

                for (let y = 0; y < HEIGHT; y++) {
                    for (let x = 0; x < WIDTH; x++) {

                        if (map[y][x] !== TILE.PLAZA) continue;

                        const image = pickPlazaImage(x, y, squareImages);
                        const centerX = (x * TILE_SIZE) + half;
                        const centerY = (y * TILE_SIZE) + half;

                        ctx.save();
                        ctx.translate(centerX, centerY);
                        ctx.rotate(pickQuarterRotation(x, y, 6));
                        ctx.drawImage(
                            image,
                            -half, -half,
                            TILE_SIZE, TILE_SIZE
                        );
                        ctx.restore();

                    }
                }

            }

            this.scene.textures.addCanvas(GROUND_TEXTURE_KEY, canvas);

        }

        this.groundImage = this.scene.add.image(0, 0, GROUND_TEXTURE_KEY);
        this.groundImage.setOrigin(0, 0);

        // WATER stays flat-colored, drawn on top of the ground texture so
        // it still reads correctly. STONE/PLAZA are skipped here too
        // whenever their art baked in above — falls back to a flat fill
        // only if every relevant texture failed to load, so the tile type
        // never renders as nothing.
        this.graphics = this.scene.add.graphics();

        for (let y = 0; y < HEIGHT; y++) {
            for (let x = 0; x < WIDTH; x++) {
                const tile = map[y][x];

                switch (tile) {
                    case TILE.GRASS:
                        continue;

                    case TILE.STONE:
                        if (this.hasPathTexture) continue;
                        this.graphics.fillStyle(0x9B9B9B);
                        break;

                    case TILE.PLAZA:
                        if (this.hasAnySquareTexture || this.hasPathTexture) continue;
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

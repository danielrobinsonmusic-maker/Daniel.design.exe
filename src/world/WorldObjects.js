import { TREES } from "./MapData";
import { BUILDINGS, NORTH_BUFFER_ROWS } from "./Buildings";

const TILE_SIZE = 32;
const TREE_COLOR = 0x2f6b2f;

// Real tree art (square canvases, varying species) displayed at a fixed
// size regardless of native resolution differences between the 4 files.
const TREE_TEXTURES = ["tree1", "tree2", "tree3", "tree4"];
const TREE_DISPLAY_SIZE = 256;

// Each species' cropped "content" frame (see BootScene.js) has its own
// aspect ratio — forcing all of them to a uniform 256x256 square would
// stretch the narrower ones (tree3/tree4 read as pine-shaped, much
// taller than wide). Keeping a fixed canopy height and deriving width
// per species avoids that distortion, and reads as natural variety
// between species instead.
const TREE_ASPECT = {
    tree1: 46 / 58,
    tree2: 51 / 61,
    tree3: 34 / 56,
    tree4: 34 / 58
};

// Deterministic pseudo-random value in [0, 1) for a tile coordinate (+
// an optional salt for a second independent value at the same
// coordinate) — keeps each tree's species (and now sway timing) stable
// across re-renders (WorldScene.create() re-runs every time the player
// re-enters the World) instead of reshuffling on every visit. Same
// formula as TileRenderer.js's hashTile.
function hashTile(x, y, salt = 0) {
    const v = Math.sin((x * 12.9898) + (y * 78.233) + salt) * 43758.5453;
    return v - Math.floor(v);
}

// Deterministically picks one of 4 even size steps (100/90/80/70% of the
// species' normal display size) per tile — own salt (13), distinct from
// species selection and every sway salt, so which size a tree gets
// doesn't correlate with either of those.
const TREE_SIZE_STEPS = [1, 0.9, 0.8, 0.7];

function pickTreeSizeScale(tileX, tileY) {
    return TREE_SIZE_STEPS[Math.floor(hashTile(tileX, tileY, 13) * TREE_SIZE_STEPS.length) % TREE_SIZE_STEPS.length];
}

// Gentle back-and-forth rotation so trees read as swaying rather than
// perfectly still. Pivots from the sprite's own origin — already
// bottom-center (the trunk), set right before this is called — not the
// canopy's visual center, so it reads as swaying rather than spinning.
// Angle, cycle length, and start phase are all deterministically
// randomized per tile (own salts — 10/11/12 — distinct from the
// default/no-salt species-selection hash) so re-entering World
// reproduces the same motion instead of reshuffling it, and so trees
// don't all sway in unison.
const SWAY_MIN_ANGLE = 2;
const SWAY_MAX_ANGLE = 3;
const SWAY_MIN_HALF_CYCLE = 1500; // ms; yoyo doubles this -> 3s full cycle
const SWAY_MAX_HALF_CYCLE = 2000; // ms; yoyo doubles this -> 4s full cycle

function addSway(scene, target, tileX, tileY) {

    const angle = SWAY_MIN_ANGLE + (hashTile(tileX, tileY, 10) * (SWAY_MAX_ANGLE - SWAY_MIN_ANGLE));
    const halfCycle = SWAY_MIN_HALF_CYCLE + (hashTile(tileX, tileY, 11) * (SWAY_MAX_HALF_CYCLE - SWAY_MIN_HALF_CYCLE));
    const phaseDelay = hashTile(tileX, tileY, 12) * halfCycle * 2;

    scene.tweens.add({
        targets: target,
        angle: { from: -angle, to: angle },
        duration: halfCycle,
        delay: phaseDelay,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
    });

}

// Extra tiles of height added above a building's footprint so there's
// room for a peaked roof + front facade in the eventual real art.
const ROOF_EXTRA_TILES = 3;

// Falls back to a flat rectangle if a building has no art yet, or its
// texture failed to load for some reason.
const BUILDING_COLORS = {
    "Library": 0xb68c5a,
    "Gallery": 0xb66e5a,
    "Theatre": 0x8c6ab6,
    "Café": 0xb6a05a
};
const DEFAULT_BUILDING_COLOR = 0xb6a05a;

const BUILDING_TEXTURES = {
    "Library": "library-building",
    "Gallery": "gallery-building",
    "Workshop": "workshop-building",
    "Café": "cafe-building",
    "Theatre": "theatre-building"
};

// In-game rendered width for each building's real art, matching exactly
// what the ORIGINAL assets rendered at (they were authored at 16px/tile
// and doubled: 144 native -> 288, Library's 200 native -> 400 — see the
// old files, kept on disk as gallery1.png/theatre1.png/etc). The
// replacement art is a completely different, non-square resolution
// (portrait/landscape illustrations, not a fixed pixels-per-tile grid),
// so matching native size 1:1 isn't an option — each building is scaled
// by width alone to reproduce that same original footprint width, and
// height follows the new art's own aspect ratio (read straight off its
// texture frame) so nothing gets stretched or squashed to force a square.
const BUILDING_ORIGINAL_WIDTH = {
    "Library": 400
};
const DEFAULT_BUILDING_ORIGINAL_WIDTH = 288;

// torii.png's real content is the "content" sub-frame BootScene registers
// (measured via PIL alpha bbox) — using that named frame instead of a
// GameObject-level setCrop() so origin/setDisplaySize math is based on
// the actual visible art, not the full padded canvas. Straddles the
// forest-border gap at the top of the map to mark the entrance to the
// Woods/Overlook path.
//
// Anchored at the bottom of the gap row (the first row below the solid
// NORTH_BUFFER_ROWS forest band — see Buildings.js/MapData.js), so it
// sits exactly where the path crosses the tree line, with the buffer
// band giving it (and the camera) real room above instead of clipping
// against the map's true north edge.
const TORII_CROP_WIDTH = 1317;
const TORII_CROP_HEIGHT = 900;
const TORII_SIZE_MULTIPLIER = 3;
const TORII_BASE_X = (37 * TILE_SIZE) + (TILE_SIZE / 2);
const TORII_BASE_Y = (NORTH_BUFFER_ROWS + 1) * TILE_SIZE;
const TORII_DISPLAY_HEIGHT = 64 * TORII_SIZE_MULTIPLIER;
const TORII_DISPLAY_WIDTH = Math.round(TORII_DISPLAY_HEIGHT * TORII_CROP_WIDTH / TORII_CROP_HEIGHT);

// Workshop-only accents: a lean-to covered work area and a tool crate,
// so it reads as more utilitarian/weathered than the other buildings
// even as a flat placeholder.
const WORKSHOP_LEANTO_COLOR = 0x6b5a45;
const WORKSHOP_POST_COLOR = 0x4a3d2f;
const WORKSHOP_CRATE_COLOR = 0x7a5a3a;

// Plaza/street furniture — deliberately hand-placed (not scattered like
// the grass/tree variants), using the same "content" sub-frame crop as
// buildings/trees/gate above. Each entry's display size keeps that
// species' own aspect ratio (measured from its cropped content), scaled
// to a footprint that reads sensibly against a 32px tile.
const DECOR_ASPECT = {
    bench: 718 / 291,
    flowerbox: 728 / 214,
    signpost: 538 / 729,
    lamppost: 407 / 866
};

const DECOR_DISPLAY_WIDTH = {
    bench: 64,
    flowerbox: 56
};
const DECOR_DISPLAY_HEIGHT = {
    signpost: 64,
    lamppost: 96
};

// Coordinates below are the original (pre-NORTH_BUFFER_ROWS) map
// numbers, same convention as MapData.js's TOWN_TREES/waypoints — kept
// readable against the layout as originally authored, shifted once here.
//
// Benches (4): ring the fountain plaza just outside its square2/3 tile
// radius (FOUNTAIN_TILE (37,24), 5x5 accent patch — see TileRenderer.js),
// one on each side (west/east/south/north). The north one mirrors the
// south bench's same 3-tile offset across the fountain — originally left
// clear because that column is also the entrance corridor's spine, but a
// single-tile obstacle there is no different from any other decor sitting
// in the corridor's 3-wide path (which is already true of the south bench,
// on the same column past the fountain), so it doesn't block the route.
//
// Lampposts (4 original + 4 at the plaza corners, see below): spaced along
// different path stretches — entrance corridor, south exit, and each of
// the Café/Workshop spurs — offset a few tiles off the centerline so they
// stand beside the path, not on it. lamppost.png's lamp arm juts out to
// screen-right of the pole by default (measured against the source art) —
// correct as-is for a post standing on the path's WEST side (arm swings
// east, over the path), but backwards for a post on the EAST side (arm
// would swing further east, away from the path, into open grass) unless
// mirrored. Checked per-post against the actual nearest point on its own
// corridor's centerline (not just eyeballed): entrance corridor (27,11)
// and the Workshop spur (46,33) posts are both east of their path, so
// they get the 4th tuple element (mirror: true) below; the south exit
// (31,35) and Café spur (44,13) posts are already west of theirs and
// stay default.
//
// Signposts (2): near the two real forks in the network — the main south
// spine's 3-way Gallery/Workshop split at (37,31), and the Library spur's
// junction with the entrance corridor at (37,17). Both forks pave out
// much wider than a normal corridor right at the convergence point
// (multiple spurs' thickened segments overlapping — confirmed by reading
// the actual tile grid, not assumed), so these can't sit right on top of
// the fork itself — placed at the closest actual grass tile to each fork
// instead (found by scanning outward ring by ring, skipping any tile
// already used by a tree/building/other decor item): ~2.2 tiles out,
// versus ~3.6 tiles for the original placement.
//
// Flower boxes (3 original + 4 at the plaza corners, see below): just
// south (in front) of the Library/Café/Gallery entrances, offset a few
// tiles from the door column — south of the building's own footprint (in
// the open approach) rather than beside it (which would sit inside the
// building's footprint width and could look like it's clipping the wall).
//
// Plaza corners (4): a flower box + lamppost pair just outside each corner
// of the town square rectangle (TOWN_SQUARE_BOUNDS), found the same way as
// the signposts above — nearest actual grass tile to the corner, skipping
// anything already occupied. The two south corners butt up against the
// wide Gallery/Workshop junction paving, so their nearest open grass is a
// couple tiles further out than the north corners' — still the closest
// available ground, just not perfectly symmetric with NW/NE. Corner
// lampposts follow the same east-side-gets-mirrored rule as the spur
// lampposts above, judged against the plaza's own west/east edge instead
// of a corridor centerline: NE and SE sit east of the plaza and are
// mirrored; NW and SW sit west of it and stay default.
const DECOR_RAW = [
    ["bench", 33, 24],
    ["bench", 41, 24],
    ["bench", 37, 27],
    ["bench", 37, 21],

    ["lamppost", 27, 11, true],
    ["lamppost", 31, 35],
    ["lamppost", 44, 13],
    ["lamppost", 46, 33, true],

    ["signpost", 38, 33],
    ["signpost", 36, 15],

    ["flowerbox", 34, 15],
    ["flowerbox", 61, 11],
    ["flowerbox", 11, 28],

    // Plaza corners: NW, NE, SW, SE — lamppost + flowerbox pair each.
    ["lamppost", 29, 18],
    ["flowerbox", 28, 19],

    ["lamppost", 45, 18, true],
    ["flowerbox", 46, 19],

    ["lamppost", 28, 28],
    ["flowerbox", 27, 28],

    ["lamppost", 46, 28, true],
    ["flowerbox", 47, 28]
];

export const DECOR = DECOR_RAW.map(([type, x, y, mirror]) => ({ type, x, y: y + NORTH_BUFFER_ROWS, mirror: !!mirror }));

// Placeholder trees and buildings, pulled out of the flat baked tile layer
// so they can stick up above the ground and be depth-sorted against the
// player. Colored rectangles only — real art comes later.
export default class WorldObjects {
    constructor(scene) {
        this.scene = scene;
    }

    create() {

        const objects = [];

        TREES.forEach(([x, y]) => {
            objects.push(this.createTree(x, y));
        });

        BUILDINGS.forEach((building) => {
            objects.push(...this.createBuilding(building));
        });

        const gate = this.createToriiGate();
        if (gate) objects.push(gate);

        DECOR.forEach((item) => {
            const sprite = this.createDecor(item);
            if (sprite) objects.push(sprite);
        });

        return objects;

    }

    // Plaza/street furniture — bottom-anchored at its own tile, same
    // convention as trees/buildings/gate above, so it participates in
    // depth-sorting correctly. Uses the "content" sub-frame BootScene
    // registers (cropped to opaque bounds) for the same reason buildings
    // need it — these are soft-vignette illustrations with a large
    // transparent margin, and anchoring the padded canvas edge instead of
    // the real base would float the object above the ground it should
    // stand on. Returns null (silently) if its texture never loaded,
    // matching how createToriiGate degrades.
    createDecor(item) {

        if (!this.scene.textures.exists(item.type)) {
            return null;
        }

        const baseX = (item.x * TILE_SIZE) + (TILE_SIZE / 2);
        const baseY = (item.y * TILE_SIZE) + TILE_SIZE;

        const texture = this.scene.textures.get(item.type);
        const frame = texture.has("content") ? "content" : undefined;
        const aspect = DECOR_ASPECT[item.type] ?? 1;

        const sprite = this.scene.add.image(baseX, baseY, item.type, frame);
        sprite.setOrigin(0.5, 1);

        const targetWidth = DECOR_DISPLAY_WIDTH[item.type];
        const targetHeight = DECOR_DISPLAY_HEIGHT[item.type];

        if (targetWidth) {
            sprite.setDisplaySize(targetWidth, targetWidth / aspect);
        } else {
            sprite.setDisplaySize(targetHeight * aspect, targetHeight);
        }

        // Lampposts on the path's east side need their arm mirrored back
        // toward the path — see the DECOR_RAW comment above.
        if (item.mirror) {
            sprite.setFlipX(true);
        }

        return sprite;

    }

    // Marks the entrance to the hidden path: straddles the forest-border
    // gap the same way a tree does — bottom-anchored so it stands on the
    // path rather than floating, purely decorative (no collision, same
    // as the fountain) since it's a gate you walk through, not a wall.
    createToriiGate() {

        if (!this.scene.textures.exists("torii-gate")) {
            return null;
        }

        const toriiTexture = this.scene.textures.get("torii-gate");
        const frame = toriiTexture.has("content") ? "content" : undefined;

        const gate = this.scene.add.image(TORII_BASE_X, TORII_BASE_Y, "torii-gate", frame);
        gate.setOrigin(0.5, 1);
        gate.setDisplaySize(TORII_DISPLAY_WIDTH, TORII_DISPLAY_HEIGHT);

        return gate;

    }

    // A tree's footprint is a single tile (collision, unchanged); the
    // visual sits on top of that ground-contact point, bottom-anchored.
    createTree(tileX, tileY) {

        const baseX = (tileX * TILE_SIZE) + (TILE_SIZE / 2);
        const baseY = (tileY * TILE_SIZE) + TILE_SIZE;

        const textureKey = TREE_TEXTURES[
            Math.floor(hashTile(tileX, tileY) * TREE_TEXTURES.length) % TREE_TEXTURES.length
        ];

        const sizeScale = pickTreeSizeScale(tileX, tileY);

        if (this.scene.textures.exists(textureKey)) {

            const texture = this.scene.textures.get(textureKey);
            const frame = texture.has("content") ? "content" : undefined;
            const aspect = TREE_ASPECT[textureKey] ?? 1;

            const sprite = this.scene.add.image(baseX, baseY, textureKey, frame);
            sprite.setOrigin(0.5, 1);
            sprite.setDisplaySize(TREE_DISPLAY_SIZE * aspect * sizeScale, TREE_DISPLAY_SIZE * sizeScale);

            addSway(this.scene, sprite, tileX, tileY);

            return sprite;

        }

        const tree = this.scene.add.rectangle(
            baseX,
            baseY,
            TILE_SIZE * sizeScale,
            TILE_SIZE * 2 * sizeScale,
            TREE_COLOR
        );

        tree.setOrigin(0.5, 1);

        addSway(this.scene, tree, tileX, tileY);

        return tree;

    }

    // Footprint = collision/ground-contact area, exactly as it already
    // exists in Buildings.js — never resized. Visual canvas is taller
    // (footprint depth + ROOF_EXTRA_TILES) to leave room for a roof and
    // front facade, but anchors at the bottom-center of the FOOTPRINT —
    // not the full canvas — so the extra height extends upward from
    // that point rather than being centered on it.
    // Returns an array since some buildings (Workshop) get extra pieces.
    createBuilding(building) {

        const footprintWidth = building.width * TILE_SIZE;
        const footprintHeight = building.height * TILE_SIZE;

        const baseX = (building.x * TILE_SIZE) + (footprintWidth / 2);
        const baseY = (building.y * TILE_SIZE) + footprintHeight;

        const textureKey = BUILDING_TEXTURES[building.name];

        if (textureKey && this.scene.textures.exists(textureKey)) {

            // Real art, anchored bottom-center at the footprint (unchanged
            // collision), not the image center. Uses the "content"
            // sub-frame BootScene registers (cropped to each building's
            // actual opaque bounds) rather than the full padded canvas —
            // without it, the transparent margin at the bottom of the
            // source image (up to 29% of the canvas on some of these)
            // gets anchored as if it were part of the building, and the
            // real facade floats that many pixels above the footprint/
            // path instead of meeting it. Scaled to the original art's
            // in-game width (see BUILDING_ORIGINAL_WIDTH) with height
            // following the cropped content's own aspect ratio — not a
            // fixed setScale(2), since the current art's native
            // resolution isn't on the same 16px/tile grid the old assets
            // were.
            const buildingTexture = this.scene.textures.get(textureKey);
            const frame = buildingTexture.has("content") ? "content" : undefined;

            const sprite = this.scene.add.image(baseX, baseY, textureKey, frame);
            sprite.setOrigin(0.5, 1);

            const targetWidth = BUILDING_ORIGINAL_WIDTH[building.name] ?? DEFAULT_BUILDING_ORIGINAL_WIDTH;
            const nativeAspect = sprite.frame.width / sprite.frame.height;
            sprite.setDisplaySize(targetWidth, targetWidth / nativeAspect);

            if (building.name === "Workshop") {
                return [sprite, ...this.createWorkshopDetails(baseX, baseY, footprintWidth, footprintHeight)];
            }

            return [sprite];

        }

        const visualHeight = footprintHeight + (ROOF_EXTRA_TILES * TILE_SIZE);
        const color = BUILDING_COLORS[building.name] ?? DEFAULT_BUILDING_COLOR;

        const rect = this.scene.add.rectangle(baseX, baseY, footprintWidth, visualHeight, color);

        rect.setOrigin(0.5, 1);

        return [rect];

    }

    // A lean-to covered work area against the building's east wall, plus a
    // tool crate sitting out front — "utilitarian" cues for the Workshop.
    createWorkshopDetails(baseX, baseY, width, height) {

        const leanToWidth = TILE_SIZE * 2;
        const leanToHeight = TILE_SIZE * 1.5;
        const leanToX = baseX + (width / 2) + (leanToWidth / 2);

        const leanToRoof = this.scene.add.rectangle(
            leanToX,
            baseY,
            leanToWidth,
            leanToHeight,
            WORKSHOP_LEANTO_COLOR
        );
        leanToRoof.setOrigin(0.5, 1);

        const postWidth = 5;
        const postHeight = leanToHeight;
        const postOffsetX = (leanToWidth / 2) - (postWidth / 2) - 2;

        const postLeft = this.scene.add.rectangle(
            leanToX - postOffsetX,
            baseY,
            postWidth,
            postHeight,
            WORKSHOP_POST_COLOR
        );
        postLeft.setOrigin(0.5, 1);

        const postRight = this.scene.add.rectangle(
            leanToX + postOffsetX,
            baseY,
            postWidth,
            postHeight,
            WORKSHOP_POST_COLOR
        );
        postRight.setOrigin(0.5, 1);

        const crate = this.scene.add.rectangle(
            leanToX,
            baseY,
            TILE_SIZE * 0.6,
            TILE_SIZE * 0.6,
            WORKSHOP_CRATE_COLOR
        );
        crate.setOrigin(0.5, 1);

        return [leanToRoof, postLeft, postRight, crate];

    }
}

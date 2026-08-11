import { TREES, BUSHES } from "./MapData";
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

// Scattered ground-clutter bushes (BUSHES, from MapData.js's open-grass
// scatter — distinct from the hand-placed hedge-line/corner bush1/bush2
// entries in DECOR below, which keep their own fixed size). Species pick
// uses the default salt (0), same as tree species above, and doesn't
// collide with it in practice since the two scatters never share a tile
// (computeScatteredBushes explicitly avoids every TREES tile).
const BUSH_TEXTURES = ["bush1", "bush2"];
const BUSH_SCATTER_BASE_WIDTH = 40; // matches DECOR_DISPLAY_WIDTH.bush1/bush2 below, i.e. 100% scale

// Own salt (14), continuous rather than stepped like TREE_SIZE_STEPS —
// the requested range (100-130%) is narrow enough that a few discrete
// steps would read as repetitive at this smaller size.
function pickBushSizeScale(tileX, tileY) {
    return 1 + (hashTile(tileX, tileY, 14) * 0.3);
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

// Murray's own idle animation — a quick side-to-side rock (angle) plus a
// small vertical hop, paused briefly between bounces so he reads as
// hopping in place rather than continuously bobbing like a buoy. Faster/
// wider than the trees' stately addSway above, since he's meant to read
// as goofy, not stately. Fixed constants rather than hashTile-randomized
// per-tile like addSway/pickTreeSizeScale — those exist to keep many
// same-textured instances (trees, fireflies) from moving in lockstep,
// which doesn't apply here since Murray is the only instance.
// Rotation pivots from the sprite's own origin (already bottom-center —
// his feet), so he wobbles in place instead of swinging from the middle;
// the hop tweens y directly (not a separate offset), which is fine for
// depth-sorting since updateDepthSorting() re-reads object.y fresh every
// frame anyway — his resolved depth just rises and falls smoothly with
// the hop instead of going stale.
const MURRAY_WOBBLE_ANGLE = 8;
const MURRAY_WOBBLE_HALF_CYCLE = 260;
const MURRAY_HOP_HEIGHT = 6;
const MURRAY_HOP_DURATION = 220;
const MURRAY_HOP_REPEAT_DELAY = 550;

function addMurrayAnimation(scene, sprite) {

    scene.tweens.add({
        targets: sprite,
        angle: { from: -MURRAY_WOBBLE_ANGLE, to: MURRAY_WOBBLE_ANGLE },
        duration: MURRAY_WOBBLE_HALF_CYCLE,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
    });

    const groundY = sprite.y;

    scene.tweens.add({
        targets: sprite,
        y: groundY - MURRAY_HOP_HEIGHT,
        duration: MURRAY_HOP_DURATION,
        yoyo: true,
        repeat: -1,
        repeatDelay: MURRAY_HOP_REPEAT_DELAY,
        ease: "Sine.easeOut"
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

// A single hand-placed cat sitting just past the gate's east post — same
// ground-contact baseline as the gate itself (TORII_BASE_Y) rather than a
// tile-grid position, since the gate isn't tile-locked either. Purely
// decorative (no collision), same as the gate and fountain. Rendered
// mirrored (flipX) so it faces back toward the gate instead of away from
// it, sat close to the post rather than out in the open grass.
const CAT_CROP_WIDTH = 270;
const CAT_CROP_HEIGHT = 387;
const CAT_DISPLAY_HEIGHT = 36; // 40 * 0.9 — 10% smaller than the original placement
const CAT_DISPLAY_WIDTH = Math.round(CAT_DISPLAY_HEIGHT * CAT_CROP_WIDTH / CAT_CROP_HEIGHT);
const CAT_BASE_X = TORII_BASE_X + (TORII_DISPLAY_WIDTH / 2) + 8;
const CAT_BASE_Y = TORII_BASE_Y;

// Eye centers/sizes measured directly against cat.png's own "content" crop
// (numpy: centroid of near-black pixels within each eye's own bounding
// box in the head region, out of the 270x387 crop), as fractions of the
// cropped frame — so the blink overlay below tracks correctly regardless
// of CAT_DISPLAY_WIDTH/HEIGHT. wFrac/hFrac are the measured pupil size
// with a ~30% safety margin (an under-measured first pass here left the
// dark pupil rim visible around a too-small cover rect even at full
// opacity — verified by screenshotting a forced-closed frame). X
// fractions are already mirrored (1 - the as-measured value) to match the
// sprite's flipX above; un-mirrored, the overlay sits over open cheek fur
// near the ear instead of the eyes (a prior pass here had a mirroring
// error that did exactly that).
const CAT_EYES = [
    { xFrac: 0.441, yFrac: 0.239, wFrac: 0.173, hFrac: 0.121 },
    { xFrac: 0.221, yFrac: 0.239, wFrac: 0.173, hFrac: 0.121 }
];
const CAT_EYE_COLOR = 0xdd9716; // sampled fur tone right around the eyes, so a "closed" eye reads as eyelid, not a black patch
const CAT_BLINK_DURATION = 120; // ms for the close half of the blink (yoyo doubles it for close+open)
const CAT_BLINK_HOLD = 90; // ms the eyes stay fully shut between closing and reopening
const CAT_BLINK_INTERVAL = 4000; // ms between the start of one blink and the next — fixed, not randomized, same "deterministic, not Math.random" convention as addSway's tween timing below

// Plaza/street furniture — deliberately hand-placed (not scattered like
// the grass/tree variants), using the same "content" sub-frame crop as
// buildings/trees/gate above. Each entry's display size keeps that
// species' own aspect ratio (measured from its cropped content), scaled
// to a footprint that reads sensibly against a 32px tile.
const DECOR_ASPECT = {
    bench: 718 / 291,
    flowerbox: 728 / 214,
    signpost: 538 / 729,
    lamppost: 407 / 866,
    bush1: 49 / 45,
    bush2: 62 / 40,
    cathouse: 827 / 1147,
    murray: 956 / 1333
};

const DECOR_DISPLAY_WIDTH = {
    bench: 64,
    flowerbox: 56,
    bush1: 40,
    bush2: 40,
    // Small decorative structure, not a real building — sized well under
    // the Workshop's own 288 (BUILDING_ORIGINAL_WIDTH) so it reads as an
    // accessory beside it, not a second building.
    cathouse: 80,
    // A small prop tucked in a gap between bushes — similar footprint to
    // a bush (40) rather than a building. 50% of the original 44.
    murray: 22
};
const DECOR_DISPLAY_HEIGHT = {
    signpost: 64,
    lamppost: 96
};

// Coordinates below are the original (pre-NORTH_BUFFER_ROWS) map
// numbers, same convention as MapData.js's TOWN_TREES/waypoints — kept
// readable against the layout as originally authored, shifted once here.
// The town square rectangle itself (TOWN_SQUARE_BOUNDS, exported by
// MapData.js) is col 29-45 / row 19-29 in this same pre-shift numbering.
//
// Benches (3): sit just inside the square's own north/west/east edges
// (1 tile in from the boundary — see the plaza-corner note below for why
// 1 tile) rather than clustered around the fountain, so they read as
// the plaza's own furniture instead of a huddle in the middle. There
// used to be a 4th, south of the fountain; removed so the remaining 3
// don't crowd the fountain from every side.
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
// Plaza corners (4): a lamppost + flower box pair 1 tile in from each
// corner of the town square rectangle (TOWN_SQUARE_BOUNDS) — inside the
// square, standing on square1/square2 pavement, rather than the previous
// placement just outside each corner on grass. 1 tile in (not right on
// the boundary tile) because a lamppost's display width is close to a
// full tile — centered on the boundary tile itself, its edge would still
// overhang onto the grass tile beyond it. Corner lampposts follow the
// same east-side-gets-mirrored rule as the spur lampposts above, judged
// against the plaza's own west/east edge instead of a corridor
// centerline: NE and SE sit east of the plaza and are mirrored; NW and
// SW sit west of it and stay default.
//
// Bushes (10 per side): line the square's west and east edges, 1 tile
// out from the boundary column (28 and 46) so they stand on the grass
// just outside the plaza rather than on the pavement itself, spanning
// every row of the square except its southernmost (29) — that row is
// part of the wide Gallery/Workshop junction paving, not open grass.
// bush1/bush2 alternate by row for the same "don't read as one texture
// repeated" reason GRASS_VARIANTS exists in TileRenderer.js.
const DECOR_RAW = [
    ["bench", 30, 24],
    ["bench", 44, 24],
    ["bench", 37, 20],

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
    ["lamppost", 30, 20],
    ["flowerbox", 31, 20],

    ["lamppost", 44, 20, true],
    ["flowerbox", 43, 20],

    ["lamppost", 30, 28],
    ["flowerbox", 31, 28],

    ["lamppost", 44, 28, true],
    ["flowerbox", 43, 28],

    // West/east hedge lines (rows 19-28; row 29 is the south junction
    // paving, not grass — see comment above).
    ...[19, 20, 21, 22, 23, 24, 25, 26, 27, 28].flatMap((row) => ([
        [row % 2 === 0 ? "bush1" : "bush2", 28, row],
        [row % 2 === 0 ? "bush1" : "bush2", 46, row]
    ])),

    // Ed's House — just east of the Workshop's own SE corner (Workshop is
    // x:56-64 / y:21-27 pre-shift, see Buildings.js), at tile 66: the same
    // spot the old flat-color lean-to/tool-crate placeholder used to sit
    // (that prop's own leanToX math worked out to this exact tile — see
    // git history/createBuilding — before it was replaced by this real
    // art). Row 27 matches the Workshop's own front (south) wall row
    // exactly, so its base lines up with the building's own front edge —
    // "just to the right of the workshop, near the front right corner."
    ["cathouse", 66, 27],

    // Murray — the northwest corner of town, near the tree line, right in
    // the gap between two of computeScatteredBushes' algorithmic bush
    // pairs (confirmed live: pairs land at tile x=5/6 and x=9/10 on row 1
    // pre-shift every run, since that scatter is hash-seeded/deterministic
    // — not hand-authored bush placements like the DECOR entries above,
    // but stable across every WorldScene re-create all the same). x=7.5 is
    // the exact midpoint between the nearest pair of bushes (6 and 9,
    // fractional tile allowed since createDecor just does arithmetic on
    // it, no grid-snapping), not the gap's own midpoint (7.5 also, as it
    // happens, but centered on the FLANKING BUSHES is what actually reads
    // as "between them" rather than "between the two empty tiles"). Row 1
    // pre-shift sits just south of the solid NORTH_BUFFER_ROWS tree line.
    ["murray", 7.5, 1]
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

        BUSHES.forEach(([x, y]) => {
            const bush = this.createBush(x, y);
            if (bush) objects.push(bush);
        });

        BUILDINGS.forEach((building) => {
            objects.push(...this.createBuilding(building));
        });

        const gate = this.createToriiGate();
        if (gate) objects.push(gate);

        // Not pushed into objects (unlike the gate/trees/buildings above) —
        // it's static, so it doesn't need the per-frame object.y depth
        // reset updateDepthSorting() applies to everything in that array.
        // createGateCat() instead sets a fixed depth once directly, same
        // convention as its own eyelids (see addCatBlink) — CAT_BASE_Y
        // alone ties exactly with a buffer-band tree that happens to sit
        // at the same row just east of the gate's cleared gap, and on
        // that tie the tree was winning the draw order, hiding the cat
        // behind its foliage entirely.
        this.createGateCat();

        DECOR.forEach((item) => {
            const sprite = this.createDecor(item);
            if (!sprite) return;
            objects.push(sprite);
            if (item.type === "murray") addMurrayAnimation(this.scene, sprite);
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

    // Scattered ground-clutter bush (BUSHES, from MapData.js's open-grass
    // scatter) — same bottom-anchored single-tile convention as createTree,
    // sized 100-130% of the hand-placed hedge bushes' baseline width via
    // pickBushSizeScale. Returns null (silently) if the texture never
    // loaded, matching createDecor/createToriiGate.
    createBush(tileX, tileY) {

        const textureKey = BUSH_TEXTURES[
            Math.floor(hashTile(tileX, tileY) * BUSH_TEXTURES.length) % BUSH_TEXTURES.length
        ];

        if (!this.scene.textures.exists(textureKey)) {
            return null;
        }

        const baseX = (tileX * TILE_SIZE) + (TILE_SIZE / 2);
        const baseY = (tileY * TILE_SIZE) + TILE_SIZE;

        const texture = this.scene.textures.get(textureKey);
        const frame = texture.has("content") ? "content" : undefined;
        const aspect = DECOR_ASPECT[textureKey] ?? 1;

        const sprite = this.scene.add.image(baseX, baseY, textureKey, frame);
        sprite.setOrigin(0.5, 1);

        const width = BUSH_SCATTER_BASE_WIDTH * pickBushSizeScale(tileX, tileY);
        sprite.setDisplaySize(width, width / aspect);

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

    // Sits beside the torii gate — see the CAT_* constants above for why
    // it's positioned off the gate's own baseline rather than a tile.
    createGateCat() {

        if (!this.scene.textures.exists("cat")) {
            return null;
        }

        const catTexture = this.scene.textures.get("cat");
        const frame = catTexture.has("content") ? "content" : undefined;

        const cat = this.scene.add.image(CAT_BASE_X, CAT_BASE_Y, "cat", frame);
        cat.setOrigin(0.5, 1);
        cat.setDisplaySize(CAT_DISPLAY_WIDTH, CAT_DISPLAY_HEIGHT);
        cat.setFlipX(true);
        cat.setDepth(CAT_BASE_Y + 0.5);

        this.addCatBlink();

        return cat;

    }

    // Two small eyelid-colored rectangles over the cat's eyes (see CAT_EYES
    // above for how their position/size were measured), normally
    // invisible, flashed to full opacity and back on a fixed repeating
    // timer — a cheap blink with no extra art needed, since a "closed"
    // eyelid is just fur-colored.
    //
    // Positioned from the same origin/display-size math as the cat sprite
    // itself (CAT_BASE_X/Y ± CAT_DISPLAY_WIDTH/HEIGHT) rather than being a
    // child of it, because Image doesn't support children — but that means
    // they're independent GameObjects with their own y, which sits up at
    // the cat's head (well above CAT_BASE_Y, the feet/anchor point).
    // WorldScene's per-frame depth=y sorting would place anything with a
    // smaller y BEHIND the cat's own feet-anchored depth, hiding the
    // eyelids — so these get setDepth() once, directly, to just above the
    // cat's resolved depth, and are never added to the objects array that
    // loop iterates (both the cat and its eyelids are static, so a
    // one-time depth assignment holds for the scene's whole lifetime).
    addCatBlink() {

        const left = CAT_BASE_X - (CAT_DISPLAY_WIDTH / 2);
        const top = CAT_BASE_Y - CAT_DISPLAY_HEIGHT;

        const eyelids = CAT_EYES.map(({ xFrac, yFrac, wFrac, hFrac }) => {

            const eyelid = this.scene.add.rectangle(
                left + (xFrac * CAT_DISPLAY_WIDTH),
                top + (yFrac * CAT_DISPLAY_HEIGHT),
                wFrac * CAT_DISPLAY_WIDTH,
                hFrac * CAT_DISPLAY_HEIGHT,
                CAT_EYE_COLOR
            );

            eyelid.setAlpha(0);
            eyelid.setDepth(CAT_BASE_Y + 1);

            return eyelid;

        });

        this.scene.tweens.add({
            targets: eyelids,
            alpha: 1,
            duration: CAT_BLINK_DURATION,
            hold: CAT_BLINK_HOLD,
            yoyo: true,
            repeat: -1,
            repeatDelay: CAT_BLINK_INTERVAL - ((CAT_BLINK_DURATION * 2) + CAT_BLINK_HOLD),
            ease: "Sine.easeInOut"
        });

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

            return [sprite];

        }

        const visualHeight = footprintHeight + (ROOF_EXTRA_TILES * TILE_SIZE);
        const color = BUILDING_COLORS[building.name] ?? DEFAULT_BUILDING_COLOR;

        const rect = this.scene.add.rectangle(baseX, baseY, footprintWidth, visualHeight, color);

        rect.setOrigin(0.5, 1);

        return [rect];

    }

}

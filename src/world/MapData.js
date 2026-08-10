import { BUILDINGS, NORTH_BUFFER_ROWS } from "./Buildings";

// Trees and buildings are no longer baked into the ground grid — they're
// rendered as individual GameObjects (see WorldObjects.js) so they can be
// depth-sorted against the player. This enum now only covers flat ground.
export const TILE = {
    GRASS: 0,
    STONE: 1,
    WATER: 2,
    PLAZA: 3
};

// Exported so Minimap.js can map world pixel coordinates onto its own
// content window without duplicating the grid size.
export const MAP_WIDTH = 75;
// The original layout was 50 rows; NORTH_BUFFER_ROWS of solid forest are
// added north of it (see the constant's own comment in Buildings.js), and
// every coordinate below that came from that original layout keeps its
// number but adds NORTH_BUFFER_ROWS, so the whole town keeps its exact
// original shape just shifted down to leave room up top.
export const MAP_HEIGHT = 50 + NORTH_BUFFER_ROWS;

// Shared by the primary scatter and every density bump pass below — stay
// clear of the forest border ring itself.
const EDGE_MARGIN = 3;

// Ornamental trees scattered around the town square. Repositioned to clear
// the canopy-vs-path/building check below (trees render much bigger than
// they used to, so the original close-to-the-buildings spots no longer
// have room) — 4 of the original 16 had no clear spot within a generous
// search radius immediately around the north buildings, so they were
// dropped rather than forced somewhere disconnected from their intent.
const TOWN_TREES = [
    [24,26+NORTH_BUFFER_ROWS],[50,26+NORTH_BUFFER_ROWS],[16,39+NORTH_BUFFER_ROWS],[19,39+NORTH_BUFFER_ROWS],[22,40+NORTH_BUFFER_ROWS],[48,40+NORTH_BUFFER_ROWS],
    [49,40+NORTH_BUFFER_ROWS],[55,39+NORTH_BUFFER_ROWS],[6,13+NORTH_BUFFER_ROWS],[6,37+NORTH_BUFFER_ROWS],[68,7+NORTH_BUFFER_ROWS],[65,37+NORTH_BUFFER_ROWS]
];

// A one-tile-thick ring of trees around the whole map, standing in for a
// surrounding forest — PLUS a solid NORTH_BUFFER_ROWS-thick band at the
// very top (every column, no opening at all). That band is what actually
// solves the camera-clipping problem: world/camera bounds can never
// scroll above world y=0, so without real map space up there, a player
// standing at the gap has nowhere for the camera to reveal above them.
// The gap itself (the original single-row opening, centered on the main
// path) now lives at row NORTH_BUFFER_ROWS — the first row below the
// solid band — so the player's walkable "edge of the world" is still a
// gap in a tree line, just with a real forest visible beyond it instead
// of the hard edge of the map.
function createForestBorder(width, height, gapStart, gapEnd) {

    const border = [];

    // Solid band: rows 0..NORTH_BUFFER_ROWS-1, every column.
    for (let y = 0; y < NORTH_BUFFER_ROWS; y++) {
        for (let x = 0; x < width; x++) {
            border.push([x, y]);
        }
    }

    // The gap row itself — same shape as the original top border row.
    const gapRow = NORTH_BUFFER_ROWS;
    for (let x = 0; x < width; x++) {
        if (x < gapStart || x > gapEnd) {
            border.push([x, gapRow]);
        }
    }

    // South border row (solid, no gap — unchanged from before).
    for (let x = 0; x < width; x++) {
        border.push([x, height - 1]);
    }

    // Side borders, from just below the gap row down to just above the
    // south border row (the solid band above already covers the sides
    // for rows 0..gapRow).
    for (let y = gapRow + 1; y < height - 1; y++) {

        border.push([0, y]);
        border.push([width - 1, y]);

    }

    return border;

}

// Path thickness is applied as a perpendicular offset relative to each
// individual Bresenham step's own direction (see paintThick/drawLine
// below) rather than a symmetric NxN square stamped at every point. A
// symmetric stamp works fine along a straight run, but on the diagonal-
// ish waypoint segments (steps alternate single-axis moves — see
// drawLine's comment) two diagonally-adjacent squares union into
// something noticeably wider than intended — a "3 wide" stamp could
// read as 4-5 tiles wide right at the diagonal parts. Perpendicular-only
// offsets keep width exact everywhere, and — unlike a symmetric
// ±N stamp, which can only ever produce an odd width (2N+1) — they can
// also produce an even width, which is how the 2-wide doorway approach
// below is possible at all.
const CORRIDOR_OFFSETS = [-1, 0, 1]; // main routes: 3 tiles wide
const ENTRY_OFFSETS = [0, 1]; // final doorway approach: 2 tiles wide

// Paints one line-step's perpendicular thickness. `axis` is whichever
// coordinate THIS step changed ("x" for a horizontal move, "y" for
// vertical) — thickening always applies to the OTHER axis, so a
// diagonal-ish line never has both axes thickened at the same point.
function paintThick(stoneSet, x, y, axis, offsets) {

    offsets.forEach((offset) => {

        if (axis === "x") {
            stoneSet.add(`${x},${y + offset}`);
        } else {
            stoneSet.add(`${x + offset},${y}`);
        }

    });

}

// Bresenham line between two points, painting after every single-axis
// step (never both axes in the same step) so diagonal-ish segments stay
// 4-directionally connected instead of only touching at a tile corner —
// important since a door's single walkable gap tile is only reachable
// from tiles it shares an edge with, not just a corner.
//
// pinchEndpoint: when true, (x2, y2) itself is thickened with a bare
// [0] instead of `offsets`. Every door-approach spur's last waypoint IS
// the doorTile — the single walkable gap in an otherwise solid wall
// row/column — so ANY perpendicular offset there lands on a wall tile
// immediately next to the gap, not another opening. Every other point
// on the segment still gets the full width; only the exact threshold
// tile is pinched back to 1-wide to match the gap it has to fit through.
function drawLine(stoneSet, x1, y1, x2, y2, offsets, pinchEndpoint) {

    let x = x1;
    let y = y1;

    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;

    let err = dx - dy;

    const offsetsFor = (px, py) => (pinchEndpoint && px === x2 && py === y2) ? [0] : offsets;

    // The starting point has no step of its own yet — thicken it using
    // whichever axis the first step below is about to move in (the same
    // e2 > -dy test), so it's consistent with the rest of the segment
    // instead of picking an axis arbitrarily.
    const startAxis = (2 * err) > -dy ? "x" : "y";
    paintThick(stoneSet, x, y, startAxis, offsetsFor(x, y));

    while (x !== x2 || y !== y2) {

        const e2 = 2 * err;

        if (e2 > -dy) {
            err -= dy;
            x += sx;
            paintThick(stoneSet, x, y, "x", offsetsFor(x, y));
        }

        if (e2 < dx) {
            err += dx;
            y += sy;
            paintThick(stoneSet, x, y, "y", offsetsFor(x, y));
        }

    }

}

// Shifts a list of [x, y] waypoints down by NORTH_BUFFER_ROWS, so the
// original layout's coordinates below can stay exactly as they were
// authored/tuned and just get offset in one place.
function shiftY(points) {

    return points.map(([x, y]) => [x, y + NORTH_BUFFER_ROWS]);

}

// A narrow, winding path connecting a series of [x, y] waypoints.
// Defaults to the 2-wide doorway-approach offsets, pinching the very
// last waypoint (see drawLine) since every call site that omits both
// extra args is one of the 5 door-approach spurs, and their final
// waypoint is always that building's doorTile. Corridor call sites pass
// both CORRIDOR_OFFSETS and pinchFinalPoint: false explicitly — they
// never end at a doorTile, so there's no wall to avoid bleeding into.
function drawPath(stoneSet, points, offsets = ENTRY_OFFSETS, pinchFinalPoint = true) {

    for (let i = 0; i < points.length - 1; i++) {

        const [x1, y1] = points[i];
        const [x2, y2] = points[i + 1];
        const isFinalSegment = i === points.length - 2;

        drawLine(stoneSet, x1, y1, x2, y2, offsets, pinchFinalPoint && isFinalSegment);

    }

}

// Town square rectangle bounds — exported so TileRenderer.js can tell
// the outer perimeter ring apart from the rest of the plaza (it renders
// with its own tile art; see the PLAZA zone logic there) without
// duplicating these numbers.
const TOWN_SQUARE_ROW_START = 19 + NORTH_BUFFER_ROWS;
const TOWN_SQUARE_ROW_COUNT = 11;
const TOWN_SQUARE_COL_START = 29;
const TOWN_SQUARE_COL_COUNT = 17;

export const TOWN_SQUARE_BOUNDS = {
    minCol: TOWN_SQUARE_COL_START,
    maxCol: TOWN_SQUARE_COL_START + TOWN_SQUARE_COL_COUNT - 1,
    minRow: TOWN_SQUARE_ROW_START,
    maxRow: TOWN_SQUARE_ROW_START + TOWN_SQUARE_ROW_COUNT - 1
};

// Every paved tile in town: the square plaza plus every path/spur. `stone`
// is the full union (used to paint the ground layer and keep the tree
// scatter below off every paved tile, plaza included); `plaza` is just
// the town square rectangle, kept separate so createTownSquare() below
// can tell plaza pavement apart from ordinary path/spur pavement — they
// render with different tile art (see TileRenderer.js).
function computeStoneTiles() {

    const stone = new Set();
    const plaza = new Set();

    // Town Square
    for (let row = TOWN_SQUARE_ROW_START; row < TOWN_SQUARE_ROW_START + TOWN_SQUARE_ROW_COUNT; row++) {
        for (let col = TOWN_SQUARE_COL_START; col < TOWN_SQUARE_COL_START + TOWN_SQUARE_COL_COUNT; col++) {
            const key = `${col},${row}`;
            stone.add(key);
            plaza.add(key);
        }
    }

    // Every building's door is a single walkable gap in an otherwise
    // solid wall, and it only opens south — so each path has to actually
    // curve around to approach from below, not just draw a straight line
    // to the door. Main routes are a tile wider than the entryways: each
    // spur narrows to a 2-wide "doorway pinch" for its final approach so
    // the wider path doesn't bleed onto the wall tiles flanking a door.
    // (Waypoints verified separately — no overlap with any footprint,
    // full connectivity from the entrance to every door — before this.)

    // Entrance -> around the Theatre/Library gap -> open corridor -> square.
    // [37,0] used to be the gap itself; it's shifted to the new gap row by
    // shiftY same as everything else here.
    drawPath(stone, shiftY([
        [37, 0], [31, 3], [26, 6], [24, 10], [24, 13], [28, 16], [37, 17], [35, 18], [37, 19]
    ]), CORRIDOR_OFFSETS, false);

    // Square -> winding south exit
    drawPath(stone, shiftY([
        [37, 19], [37, 29], [37, 31], [34, 35], [39, 40], [37, 45], [37, 49]
    ]), CORRIDOR_OFFSETS, false);

    // Library door: short spur off the spine's [37,17] junction, entirely
    // a doorway approach so it stays pinched the whole way
    drawPath(stone, shiftY([[37, 17], [37, 14]]));

    // Theatre door: wide off the spine's [24,13] junction, pinched for entry
    drawPath(stone, shiftY([[24, 13], [20, 13]]), CORRIDOR_OFFSETS, false);
    drawPath(stone, shiftY([[20, 13], [16, 11], [16, 10]]));

    // Café door: wide off the spine's [35,18] point, pinched for entry
    drawPath(stone, shiftY([[35, 18], [44, 16], [50, 14]]), CORRIDOR_OFFSETS, false);
    drawPath(stone, shiftY([[50, 14], [56, 11], [58, 10]]));

    // Gallery door: wide off the south spine's [37,31] junction, pinched for entry
    drawPath(stone, shiftY([[37, 31], [28, 30], [20, 28]]), CORRIDOR_OFFSETS, false);
    drawPath(stone, shiftY([[20, 28], [14, 29], [14, 27]]));

    // Workshop door: wide off the south spine's [37,31] junction, pinched for entry
    drawPath(stone, shiftY([[37, 31], [46, 30], [54, 28]]), CORRIDOR_OFFSETS, false);
    drawPath(stone, shiftY([[54, 28], [60, 29], [60, 27]]));

    // drawLine's startAxis (see its own comment) picks a thickening axis
    // for a segment's first point by predicting that segment's own first
    // step — correct in isolation, but wherever a waypoint is shared by
    // two segments whose directions actually differ (an interior bend
    // within one drawPath call, or one drawPath call ending exactly where
    // another begins, e.g. a wide corridor handing off to its pinched
    // door spur), each segment thickens that shared point along its own
    // axis independently, and the two can disagree. The result is one
    // extra tile flaring 1 off the path's straight edge, touching the
    // path on only one side — cosmetic only (nothing routes through it),
    // but it reads as a stray nub. Pruned by hand rather than reworking
    // the thickening algorithm itself: south-exit spine's [34,35] bend,
    // and the wide-corridor-to-pinch handoff points for Café, Gallery,
    // and Workshop ([50,14], [20,28], [54,28] respectively).
    [
        [33, 41], [50, 19], [20, 33], [54, 33]
    ].forEach(([x, y]) => stone.delete(`${x},${y}`));

    return { stone, plaza };

}

// Deterministic PRNG (mulberry32) so the tree scatter looks random but is
// stable across reloads — same seed always produces the same forest.
function createSeededRandom(seed) {

    return function random() {

        seed |= 0;
        seed = (seed + 0x6D2B79F5) | 0;

        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;

    };

}

// Trees render at 256x256 (8x8 tiles), bottom-center anchored — so a
// tree's single-tile collision spot can sit clear of a path/building
// while its canopy still visually overhangs it. A tile is only safe to
// anchor a tree on if its ENTIRE canopy footprint avoids paths and
// buildings, not just the anchor tile itself.
const TREE_CANOPY_HALF_WIDTH = 4;
const TREE_CANOPY_HEIGHT = 8;

// Real building art renders at 2x its native size; Library's is 200x200
// native (400px / 32 = 12.5 tiles), the rest are 144x144 native (288px /
// 32 = 9 tiles). Used to keep tree canopies off building roofs, not just
// their footprints.
const BUILDING_VISUAL_HEIGHT_TILES = {
    "Library": 13
};
const DEFAULT_BUILDING_VISUAL_HEIGHT_TILES = 9;

function isCanopyClear(unsafe, tx, ty) {

    for (let y = ty - TREE_CANOPY_HEIGHT; y <= ty; y++) {
        for (let x = tx - TREE_CANOPY_HALF_WIDTH; x <= tx + TREE_CANOPY_HALF_WIDTH; x++) {
            if (unsafe.has(`${x},${y}`)) return false;
        }
    }

    return true;

}

// Adds roughly `pct` more entries on top of whatever's already in `list`,
// via a finer grid + its own seed so it can find gaps the coarser primary
// scatter's own clearance check skipped over. `isClear(unsafe, x, y)` is
// swappable per caller — trees need a whole-canopy check (isCanopyClear),
// bushes only need a single-tile one, same as their own primary scatters
// use. Mutates `list`/`unsafe` in place and stops once it's added enough
// for this bump, so it stays additive rather than open-ended — safe to
// call more than once on the same list (see computeScatteredTrees), since
// each call's pct is relative to the running total at that point.
function applyDensityBump(list, unsafe, seed, pct, isClear) {

    const target = Math.round(list.length * pct);

    const bumpRandom = createSeededRandom(seed);
    const BUMP_SPACING = 1;
    let added = 0;

    for (let gy = EDGE_MARGIN; gy < MAP_HEIGHT - EDGE_MARGIN && added < target; gy += BUMP_SPACING) {

        for (let gx = EDGE_MARGIN; gx < MAP_WIDTH - EDGE_MARGIN && added < target; gx += BUMP_SPACING) {

            if (bumpRandom() > 0.5) continue;
            if (!isClear(unsafe, gx, gy)) continue;

            list.push([gx, gy]);
            unsafe.add(`${gx},${gy}`);
            added++;

        }

    }

}

// Single-tile clearance check for the bush density bump — matches
// computeScatteredBushes' own primary scatter (a bush's display size never
// reaches a full tile even at its largest scattered scale, so unlike a
// tree's wide canopy there's no need to check neighboring tiles too).
function isBushSpotClear(unsafe, tx, ty) {
    return !unsafe.has(`${tx},${ty}`);
}

// Scatters trees across open grass, keeping clear of: the paths/square,
// every building's full visual extent (footprint + roof, not just the
// footprint), and the entrance funnel below the forest gap.
function computeScatteredTrees(stoneTiles) {

    const unsafe = new Set(stoneTiles);

    // Small buffer on top of each building's exact visual rect — the
    // canopy-vs-unsafe-rectangle check below already keeps a tree's whole
    // canopy clear, so this only needs to cover the last bit of breathing
    // room, not a wide margin.
    const BUILDING_BUFFER = 1;

    BUILDINGS.forEach((building) => {

        const visualHeight = BUILDING_VISUAL_HEIGHT_TILES[building.name] ?? DEFAULT_BUILDING_VISUAL_HEIGHT_TILES;
        const footprintBottom = building.y + building.height;
        const visualTop = footprintBottom - visualHeight;

        for (let y = visualTop - BUILDING_BUFFER; y < footprintBottom + BUILDING_BUFFER; y++) {
            for (let x = building.x - BUILDING_BUFFER; x < building.x + building.width + BUILDING_BUFFER; x++) {
                unsafe.add(`${x},${y}`);
            }
        }

    });

    // Keep the entrance funnel (forest gap down to the north buildings)
    // clear so the way in never looks blocked. Rows 0..NORTH_BUFFER_ROWS-1
    // are already solid forest border (never candidates for a scattered
    // tree anyway — EDGE_MARGIN keeps the scatter grid 3 tiles clear of
    // any edge), so this only really matters from the gap row down.
    for (let y = 0; y <= 9 + NORTH_BUFFER_ROWS; y++) {
        for (let x = 30; x <= 44; x++) {
            unsafe.add(`${x},${y}`);
        }
    }

    // Existing ornamental trees, so the scatter never doubles one up.
    TOWN_TREES.forEach(([x, y]) => unsafe.add(`${x},${y}`));

    const trees = [];
    const random = createSeededRandom(1337);

    const SPACING = 3;
    const PLACE_CHANCE = 1.0;

    for (let gy = EDGE_MARGIN; gy < MAP_HEIGHT - EDGE_MARGIN; gy += SPACING) {

        for (let gx = EDGE_MARGIN; gx < MAP_WIDTH - EDGE_MARGIN; gx += SPACING) {

            if (random() > PLACE_CHANCE) continue;

            const x = Math.min(gx + Math.floor(random() * SPACING), MAP_WIDTH - EDGE_MARGIN - 1);
            const y = Math.min(gy + Math.floor(random() * SPACING), MAP_HEIGHT - EDGE_MARGIN - 1);

            if (!isCanopyClear(unsafe, x, y)) continue;

            trees.push([x, y]);
            unsafe.add(`${x},${y}`);

        }

    }

    // Denser supplemental passes on open grass/flower ground, layered on
    // top of (not reshuffling) the primary scatter above and each other —
    // each call's pct is relative to the running total at that point, so
    // these compound rather than each being a fixed % of the original
    // baseline. Distinct seeds so no pass just retraces an earlier one's
    // candidates. The third (15%) pass is the "15% more trees" bump —
    // stacked on top of the two pre-existing ones rather than replacing
    // them.
    applyDensityBump(trees, unsafe, 9001, 0.15, isCanopyClear);
    applyDensityBump(trees, unsafe, 4021, 0.10, isCanopyClear);
    applyDensityBump(trees, unsafe, 7734, 0.15, isCanopyClear);

    return trees;

}

const { stone: STONE_TILES, plaza: PLAZA_TILES } = computeStoneTiles();

// Center of the town square rectangle (also its geometric center — the
// rectangle is 17 cols x 11 rows, both odd, so this lands exactly on a
// tile rather than between two). This is where the fountain sprite sits
// (see WorldScene.js) and where TileRenderer.js centers the square2.png
// patch — single source of truth so those two never drift apart.
export const FOUNTAIN_TILE = { x: 37, y: 24 + NORTH_BUFFER_ROWS };

// Tile coordinates of every tree. WorldObjects.js renders these as
// standalone placeholders; WorldScene.js builds their collision from the
// same list so hitboxes stay exactly where the trees appear.
export const TREES = [
    ...TOWN_TREES,
    ...createForestBorder(MAP_WIDTH, MAP_HEIGHT, 35, 39),
    ...computeScatteredTrees(STONE_TILES)
];

// Same idea as computeScatteredTrees above (deterministic grid + jitter,
// rejecting anything that lands on paved ground, a building, or another
// tree/bush), but with only a single-tile clearance check instead of a
// wide canopy rectangle — bush1/bush2 render close to one tile even at
// their largest scattered size (WorldObjects.js scales them 100-130% of
// a ~40px baseline, still under 2 tiles), so unlike a tree's 256px
// canopy there's no risk of a bush visually reaching into a path or
// building it isn't anchored on. Runs after TREES (above) so it can
// avoid every tree, not just the hand-placed ones.
function computeScatteredBushes(stoneTiles) {

    const unsafe = new Set(stoneTiles);
    const BUILDING_BUFFER = 1;

    BUILDINGS.forEach((building) => {

        const visualHeight = BUILDING_VISUAL_HEIGHT_TILES[building.name] ?? DEFAULT_BUILDING_VISUAL_HEIGHT_TILES;
        const footprintBottom = building.y + building.height;
        const visualTop = footprintBottom - visualHeight;

        for (let y = visualTop - BUILDING_BUFFER; y < footprintBottom + BUILDING_BUFFER; y++) {
            for (let x = building.x - BUILDING_BUFFER; x < building.x + building.width + BUILDING_BUFFER; x++) {
                unsafe.add(`${x},${y}`);
            }
        }

    });

    // Keep the entrance funnel clear, same reasoning as computeScatteredTrees.
    for (let y = 0; y <= 9 + NORTH_BUFFER_ROWS; y++) {
        for (let x = 30; x <= 44; x++) {
            unsafe.add(`${x},${y}`);
        }
    }

    TREES.forEach(([x, y]) => unsafe.add(`${x},${y}`));

    const bushes = [];
    const random = createSeededRandom(2468);

    const SPACING = 4;
    const EDGE_MARGIN = 3;
    const PLACE_CHANCE = 0.4;

    for (let gy = EDGE_MARGIN; gy < MAP_HEIGHT - EDGE_MARGIN; gy += SPACING) {

        for (let gx = EDGE_MARGIN; gx < MAP_WIDTH - EDGE_MARGIN; gx += SPACING) {

            if (random() > PLACE_CHANCE) continue;

            const x = Math.min(gx + Math.floor(random() * SPACING), MAP_WIDTH - EDGE_MARGIN - 1);
            const y = Math.min(gy + Math.floor(random() * SPACING), MAP_HEIGHT - EDGE_MARGIN - 1);

            if (unsafe.has(`${x},${y}`)) continue;

            bushes.push([x, y]);
            unsafe.add(`${x},${y}`);

        }

    }

    // "10% more bushes" — same supplemental-pass technique as the tree
    // density bumps in computeScatteredTrees above, just with a
    // single-tile clearance check (isBushSpotClear) instead of a canopy
    // one, matching this function's own primary scatter.
    applyDensityBump(bushes, unsafe, 5566, 0.10, isBushSpotClear);

    return bushes;

}

// Tile coordinates of every scattered (non-hand-placed) bush — WorldObjects.js
// renders these the same way it renders TREES, and WorldScene.js gives each
// one a single-tile obstacle from this same list.
export const BUSHES = computeScatteredBushes(STONE_TILES);

export function createTownSquare() {

    const WIDTH = MAP_WIDTH;
    const HEIGHT = MAP_HEIGHT;

    const map = [];

    for (let y = 0; y < HEIGHT; y++) {

        map[y] = [];

        for (let x = 0; x < WIDTH; x++) {

            map[y][x] = TILE.GRASS;

        }

    }

    STONE_TILES.forEach((key) => {

        const [x, y] = key.split(",").map(Number);

        if (map[y] && map[y][x] !== undefined) {
            map[y][x] = PLAZA_TILES.has(key) ? TILE.PLAZA : TILE.STONE;
        }

    });

    // The fountain used to be a plus-shaped patch of WATER tiles baked in
    // here, centered on (37, 24). It's now an animated Sprite created in
    // WorldScene.js instead — see the fountain-flow animation.

    // Trees and buildings are rendered separately (see TREES export above
    // and src/world/Buildings.js). Their door thresholds don't need a
    // separate carve-out here — each path above already terminates
    // exactly on its building's doorTile.

    return map;

}
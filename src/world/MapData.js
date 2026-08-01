import { BUILDINGS, NORTH_BUFFER_ROWS } from "./Buildings";

// Trees and buildings are no longer baked into the ground grid — they're
// rendered as individual GameObjects (see WorldObjects.js) so they can be
// depth-sorted against the player. This enum now only covers flat ground.
export const TILE = {
    GRASS: 0,
    STONE: 1,
    WATER: 2
};

const MAP_WIDTH = 75;
// The original layout was 50 rows; NORTH_BUFFER_ROWS of solid forest are
// added north of it (see the constant's own comment in Buildings.js), and
// every coordinate below that came from that original layout keeps its
// number but adds NORTH_BUFFER_ROWS, so the whole town keeps its exact
// original shape just shifted down to leave room up top.
const MAP_HEIGHT = 50 + NORTH_BUFFER_ROWS;

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

// Paints a single tile (plus `width` tiles of padding on each side) at
// (x, y) into a Set of "x,y" keys. Used by drawPath below. Building this
// as a Set (rather than mutating the map array directly) means the same
// tile data can be reused to keep scattered trees off the paths/square —
// see computeScatteredTrees below.
function paintTile(stoneSet, x, y, width) {

    for (let dy = -width; dy <= width; dy++) {

        for (let dx = -width; dx <= width; dx++) {

            stoneSet.add(`${x + dx},${y + dy}`);

        }

    }

}

// Bresenham line between two points, painting after every single-axis
// step (never both axes in the same step) so diagonal-ish segments stay
// 4-directionally connected instead of only touching at a tile corner —
// important since a door's single walkable gap tile is only reachable
// from tiles it shares an edge with, not just a corner.
function drawLine(stoneSet, x1, y1, x2, y2, width) {

    let x = x1;
    let y = y1;

    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;

    let err = dx - dy;

    paintTile(stoneSet, x, y, width);

    while (x !== x2 || y !== y2) {

        const e2 = 2 * err;

        if (e2 > -dy) {
            err -= dy;
            x += sx;
            paintTile(stoneSet, x, y, width);
        }

        if (e2 < dx) {
            err += dx;
            y += sy;
            paintTile(stoneSet, x, y, width);
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
function drawPath(stoneSet, points, width = 0) {

    for (let i = 0; i < points.length - 1; i++) {

        const [x1, y1] = points[i];
        const [x2, y2] = points[i + 1];

        drawLine(stoneSet, x1, y1, x2, y2, width);

    }

}

// Every paved tile in town: the square plaza plus every path/spur. Computed
// once as a Set so it can both paint the ground layer and keep the tree
// scatter (below) off the paths.
function computeStoneTiles() {

    const stone = new Set();

    // Town Square
    for (let row = 19 + NORTH_BUFFER_ROWS; row < 19 + NORTH_BUFFER_ROWS + 11; row++) {
        for (let col = 29; col < 29 + 17; col++) {
            stone.add(`${col},${row}`);
        }
    }

    // Every building's door is a single walkable gap in an otherwise
    // solid wall, and it only opens south — so each path has to actually
    // curve around to approach from below, not just draw a straight line
    // to the door. Main routes are a tile wider than the entryways: each
    // spur narrows to a single-tile "doorway pinch" for its final approach
    // so the wider path doesn't bleed onto the wall tiles flanking a door.
    // (Waypoints verified separately — no overlap with any footprint,
    // full connectivity from the entrance to every door — before this.)

    const PATH_WIDTH = 1;

    // Entrance -> around the Theatre/Library gap -> open corridor -> square.
    // [37,0] used to be the gap itself; it's shifted to the new gap row by
    // shiftY same as everything else here.
    drawPath(stone, shiftY([
        [37, 0], [31, 3], [26, 6], [24, 10], [24, 13], [28, 16], [37, 17], [35, 18], [37, 19]
    ]), PATH_WIDTH);

    // Square -> winding south exit
    drawPath(stone, shiftY([
        [37, 19], [37, 29], [37, 31], [34, 35], [39, 40], [37, 45], [37, 49]
    ]), PATH_WIDTH);

    // Library door: short spur off the spine's [37,17] junction, entirely
    // a doorway approach so it stays pinched the whole way
    drawPath(stone, shiftY([[37, 17], [37, 14]]));

    // Theatre door: wide off the spine's [24,13] junction, pinched for entry
    drawPath(stone, shiftY([[24, 13], [20, 13]]), PATH_WIDTH);
    drawPath(stone, shiftY([[20, 13], [16, 11], [16, 10]]));

    // Café door: wide off the spine's [35,18] point, pinched for entry
    drawPath(stone, shiftY([[35, 18], [44, 16], [50, 14]]), PATH_WIDTH);
    drawPath(stone, shiftY([[50, 14], [56, 11], [58, 10]]));

    // Gallery door: wide off the south spine's [37,31] junction, pinched for entry
    drawPath(stone, shiftY([[37, 31], [28, 30], [20, 28]]), PATH_WIDTH);
    drawPath(stone, shiftY([[20, 28], [14, 29], [14, 27]]));

    // Workshop door: wide off the south spine's [37,31] junction, pinched for entry
    drawPath(stone, shiftY([[37, 31], [46, 30], [54, 28]]), PATH_WIDTH);
    drawPath(stone, shiftY([[54, 28], [60, 29], [60, 27]]));

    return stone;

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
    const EDGE_MARGIN = 3; // stay clear of the forest border ring itself
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

    return trees;

}

const STONE_TILES = computeStoneTiles();

// Tile coordinates of every tree. WorldObjects.js renders these as
// standalone placeholders; WorldScene.js builds their collision from the
// same list so hitboxes stay exactly where the trees appear.
export const TREES = [
    ...TOWN_TREES,
    ...createForestBorder(MAP_WIDTH, MAP_HEIGHT, 35, 39),
    ...computeScatteredTrees(STONE_TILES)
];

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
            map[y][x] = TILE.STONE;
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
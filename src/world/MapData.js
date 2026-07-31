// Trees and buildings are no longer baked into the ground grid — they're
// rendered as individual GameObjects (see WorldObjects.js) so they can be
// depth-sorted against the player. This enum now only covers flat ground.
export const TILE = {
    GRASS: 0,
    STONE: 1,
    WATER: 2
};

const MAP_WIDTH = 75;
const MAP_HEIGHT = 50;

// Ornamental trees scattered around the town square.
const TOWN_TREES = [
    [26,11],[28,10],[31,10],[43,10],[46,11],[48,12],
    [26,30],[28,31],[31,32],[43,32],[46,31],[48,30],
    [16,23],[16,26],[58,23],[58,26]
];

// A one-tile-thick ring of trees around the whole map, standing in for a
// surrounding forest. Leaves a gap in the top edge (centered on the main
// path) as the only way in/out of town.
function createForestBorder(width, height, gapStart, gapEnd) {

    const border = [];

    for (let x = 0; x < width; x++) {

        if (x < gapStart || x > gapEnd) {
            border.push([x, 0]);
        }

        border.push([x, height - 1]);

    }

    for (let y = 1; y < height - 1; y++) {

        border.push([0, y]);
        border.push([width - 1, y]);

    }

    return border;

}

// Tile coordinates of every tree. WorldObjects.js renders these as
// standalone placeholders; WorldScene.js builds their collision from the
// same list so hitboxes stay exactly where the trees appear.
export const TREES = [
    ...TOWN_TREES,
    ...createForestBorder(MAP_WIDTH, MAP_HEIGHT, 35, 39)
];

function fillRect(map, x, y, width, height, tile) {

    for (let row = y; row < y + height; row++) {

        for (let col = x; col < x + width; col++) {

            map[row][col] = tile;

        }

    }

}

function drawRoad(map, x1, y1, x2, y2) {

    if (x1 === x2) {

        const start = Math.min(y1, y2);
        const end = Math.max(y1, y2);

        for (let y = start; y <= end; y++) {

            for (let x = x1 - 2; x <= x1 + 2; x++) {

                map[y][x] = TILE.STONE;

            }

        }

    }

    else if (y1 === y2) {

        const start = Math.min(x1, x2);
        const end = Math.max(x1, x2);

        for (let x = start; x <= end; x++) {

            for (let y = y1 - 2; y <= y1 + 2; y++) {

                map[y][x] = TILE.STONE;

            }

        }

    }

}
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

    // -------------------------------------------------
    // Main Path
    // -------------------------------------------------

   drawRoad(map, 37, 29, 37, HEIGHT - 1);

    // -------------------------------------------------
    // Town Square
    // -------------------------------------------------

    fillRect(map, 29, 19, 17, 11, TILE.STONE);
// Main road to Library
drawRoad(map, 37, 10, 37, 19);

// Gallery
drawRoad(map, 18, 24, 29, 24);

// Workshop
drawRoad(map, 45, 24, 56, 24);

// Theatre
drawRoad(map, 16, 10, 16, 24);

// Café
drawRoad(map, 58, 10, 58, 24);
    // -------------------------------------------------
    // Fountain
    // -------------------------------------------------

    map[23][37] = TILE.WATER;
    map[24][36] = TILE.WATER;
    map[24][37] = TILE.WATER;
    map[24][38] = TILE.WATER;
    map[25][37] = TILE.WATER;

    // Trees and buildings are rendered separately (see TREES export above
    // and src/world/Buildings.js) — only their door thresholds get carved
    // into the ground layer here so the paved paths still read correctly.

    // -------------------------------------------------
    // Library door threshold
    // -------------------------------------------------

    map[10][37] = TILE.STONE;

    // -------------------------------------------------
    // Gallery door threshold
    // -------------------------------------------------

    map[27][14] = TILE.STONE;

    // -------------------------------------------------
    // Workshop door threshold
    // -------------------------------------------------

    map[27][60] = TILE.STONE;

    // -------------------------------------------------
    // Theatre door threshold
    // -------------------------------------------------

    map[10][16] = TILE.STONE;

    // -------------------------------------------------
    // Café door threshold
    // -------------------------------------------------

    map[10][58] = TILE.STONE;

    return map;

}
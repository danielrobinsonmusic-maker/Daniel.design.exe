export const TILE = {
    GRASS: 0,
    STONE: 1,
    WATER: 2,
    TREE: 3,
    LIBRARY: 4,
    DESIGN_STUDIO: 5,
    WEST_BUILDING: 6,
    NORTHWEST_BUILDING: 7,
    NORTHEAST_BUILDING: 8
};
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

    const WIDTH = 75;
    const HEIGHT = 50;

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

   drawRoad(map, 37, 15, 37, HEIGHT - 1);

    // -------------------------------------------------
    // Town Square
    // -------------------------------------------------

    fillRect(map, 29, 8, 17, 11, TILE.STONE);
// Main road to Library
drawRoad(map, 37, 6, 37, 8);

// West Building
drawRoad(map, 24, 13, 29, 13);

// Design Studio
drawRoad(map, 45, 13, 50, 13);

// Northwest Building
drawRoad(map, 20, 6, 20, 13);

// Northeast Building
drawRoad(map, 54, 6, 54, 13);
    // -------------------------------------------------
    // Fountain
    // -------------------------------------------------

    map[12][37] = TILE.WATER;
    map[13][36] = TILE.WATER;
    map[13][37] = TILE.WATER;
    map[13][38] = TILE.WATER;
    map[14][37] = TILE.WATER;

    // -------------------------------------------------
    // Trees
    // -------------------------------------------------

    [
        [26,7],[28,6],[31,6],[43,6],[46,7],[48,8],
        [26,19],[28,20],[31,21],[43,21],[46,20],[48,19],
        [22,12],[22,15],[52,12],[52,15]
    ].forEach(([x,y]) => {

        map[y][x] = TILE.TREE;

    });

    // -------------------------------------------------
    // Library
    // -------------------------------------------------

   fillRect(map, 31, 2, 13, 5, TILE.LIBRARY);
map[6][37] = TILE.STONE;

    // -------------------------------------------------
    // West Building
    // -------------------------------------------------

   fillRect(map, 16, 10, 9, 7, TILE.WEST_BUILDING);
map[16][20] = TILE.STONE;

    // -------------------------------------------------
    // Design Studio
    // -------------------------------------------------

   fillRect(map, 50, 10, 9, 7, TILE.DESIGN_STUDIO);
map[16][54] = TILE.STONE;

    // -------------------------------------------------
    // Northwest Building
    // -------------------------------------------------
fillRect(map, 16, 2, 9, 5, TILE.NORTHWEST_BUILDING);
map[6][20] = TILE.STONE;

    // -------------------------------------------------
    // Northeast Building
    // -------------------------------------------------

   fillRect(map, 50, 2, 9, 5, TILE.NORTHEAST_BUILDING);
map[6][54] = TILE.STONE;
    return map;

}
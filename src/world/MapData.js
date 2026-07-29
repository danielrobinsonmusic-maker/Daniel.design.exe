export const TILE = {
    GRASS: 0,
    STONE: 1,
    WATER: 2,
    TREE: 3,
    LIBRARY: 4
};

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

    // Main Path
    for (let y = 15; y < HEIGHT; y++) {

        for (let x = 35; x <= 39; x++) {

            map[y][x] = TILE.STONE;

        }

    }

    // Plaza
    for (let y = 8; y <= 18; y++) {

        for (let x = 29; x <= 45; x++) {

            map[y][x] = TILE.STONE;

        }

    }

    // Fountain
    map[12][37] = TILE.WATER;
    map[13][36] = TILE.WATER;
    map[13][37] = TILE.WATER;
    map[13][38] = TILE.WATER;
    map[14][37] = TILE.WATER;

    // Trees
    [
        [26,7],[28,6],[31,6],[43,6],[46,7],[48,8],
        [26,19],[28,20],[31,21],[43,21],[46,20],[48,19],
        [22,12],[22,15],[52,12],[52,15]
    ].forEach(([x,y]) => {

        map[y][x] = TILE.TREE;

    });

    // Library
    for (let y = 2; y <= 6; y++) {

        for (let x = 31; x <= 43; x++) {

            map[y][x] = TILE.LIBRARY;

        }

    }

    return map;

}
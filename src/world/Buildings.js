// Extra rows of solid forest added north of the original 50-row layout's
// row 0. Without this, the map's north edge (world y=0) is a hard
// camera-scroll limit with zero space beyond it — a player standing at
// the forest gap gets their sprite clipped by the top of the screen
// (setCollideWorldBounds lets them reach y=16, but the sprite is 64px
// tall and bottom-anchored, so up to 48px of it renders above y=0, which
// the camera can never scroll up to reveal). Lives here (rather than in
// MapData.js, which imports from this file) so every file that needs it
// — MapData, WorldScene, OverlookScene, WorldObjects — can import a
// single source of truth without a circular import. All the original
// layout's y-coordinates (buildings, paths, trees, interaction zones,
// spawn points) are shifted down by this same amount so the whole town
// keeps its exact original shape, just with room to breathe up top.
export const NORTH_BUFFER_ROWS = 6;

// doorX/doorY: the tile a visitor stands on to trigger the "Press E" prompt.
// doorTile: the actual gap left open in the building's footprint so the
// collision box has somewhere walkable to pass through (used when building
// obstacles from this data — see WorldScene.js).
export const BUILDINGS = [

    {
        id: "library",
        name: "Library",
        x: 31,
        y: 10 + NORTH_BUFFER_ROWS,
        width: 13,
        height: 5,
        doorX: 37,
        doorY: 15 + NORTH_BUFFER_ROWS,
        doorTile: { x: 37, y: 14 + NORTH_BUFFER_ROWS }
    },

    {
        id: "west",
        name: "Gallery",
        x: 10,
        y: 21 + NORTH_BUFFER_ROWS,
        width: 9,
        height: 7,
        doorX: 14,
        doorY: 28 + NORTH_BUFFER_ROWS,
        doorTile: { x: 14, y: 27 + NORTH_BUFFER_ROWS }
    },

    {
        id: "studio",
        name: "Workshop",
        x: 56,
        y: 21 + NORTH_BUFFER_ROWS,
        width: 9,
        height: 7,
        doorX: 60,
        doorY: 28 + NORTH_BUFFER_ROWS,
        doorTile: { x: 60, y: 27 + NORTH_BUFFER_ROWS }
    },

    {
        id: "theatre",
        name: "Theatre",
        x: 12,
        y: 6 + NORTH_BUFFER_ROWS,
        width: 9,
        height: 5,
        doorX: 16,
        doorY: 11 + NORTH_BUFFER_ROWS,
        doorTile: { x: 16, y: 10 + NORTH_BUFFER_ROWS }
    },

    {
        id: "northeast",
        name: "Café",
        x: 54,
        y: 6 + NORTH_BUFFER_ROWS,
        width: 9,
        height: 5,
        doorX: 58,
        doorY: 11 + NORTH_BUFFER_ROWS,
        doorTile: { x: 58, y: 10 + NORTH_BUFFER_ROWS }
    }

];

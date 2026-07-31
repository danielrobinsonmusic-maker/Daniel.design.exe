// doorX/doorY: the tile a visitor stands on to trigger the "Press E" prompt.
// doorTile: the actual gap left open in the building's footprint so the
// collision box has somewhere walkable to pass through (used when building
// obstacles from this data — see WorldScene.js).
export const BUILDINGS = [

    {
        id: "library",
        name: "Library",
        x: 31,
        y: 6,
        width: 13,
        height: 5,
        doorX: 37,
        doorY: 11,
        doorTile: { x: 37, y: 10 }
    },

    {
        id: "west",
        name: "Gallery",
        x: 10,
        y: 21,
        width: 9,
        height: 7,
        doorX: 14,
        doorY: 28,
        doorTile: { x: 14, y: 27 }
    },

    {
        id: "studio",
        name: "Workshop",
        x: 56,
        y: 21,
        width: 9,
        height: 7,
        doorX: 60,
        doorY: 28,
        doorTile: { x: 60, y: 27 }
    },

    {
        id: "theatre",
        name: "Theatre",
        x: 12,
        y: 6,
        width: 9,
        height: 5,
        doorX: 16,
        doorY: 11,
        doorTile: { x: 16, y: 10 }
    },

    {
        id: "northeast",
        name: "Café",
        x: 54,
        y: 6,
        width: 9,
        height: 5,
        doorX: 58,
        doorY: 11,
        doorTile: { x: 58, y: 10 }
    }

];

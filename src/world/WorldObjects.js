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

// Deterministic pseudo-random value in [0, 1) for a tile coordinate —
// keeps each tree's species stable across re-renders (WorldScene.create()
// re-runs every time the player re-enters the World) instead of
// reshuffling species on every visit.
function hashTile(x, y) {
    const v = Math.sin((x * 12.9898) + (y * 78.233)) * 43758.5453;
    return v - Math.floor(v);
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

        return objects;

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

        if (this.scene.textures.exists(textureKey)) {

            const texture = this.scene.textures.get(textureKey);
            const frame = texture.has("content") ? "content" : undefined;
            const aspect = TREE_ASPECT[textureKey] ?? 1;

            const sprite = this.scene.add.image(baseX, baseY, textureKey, frame);
            sprite.setOrigin(0.5, 1);
            sprite.setDisplaySize(TREE_DISPLAY_SIZE * aspect, TREE_DISPLAY_SIZE);

            return sprite;

        }

        const tree = this.scene.add.rectangle(
            baseX,
            baseY,
            TILE_SIZE,
            TILE_SIZE * 2,
            TREE_COLOR
        );

        tree.setOrigin(0.5, 1);

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

            // Real art: authored at 16px/tile, doubled to match the
            // game's 32px/tile display scale. Anchored bottom-center at
            // the footprint (unchanged collision), not the image center.
            const sprite = this.scene.add.image(baseX, baseY, textureKey);
            sprite.setOrigin(0.5, 1);
            sprite.setScale(2);

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

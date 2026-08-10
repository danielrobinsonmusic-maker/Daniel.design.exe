import SaveManager from "../managers/SaveManager";
import { BUILDINGS, NORTH_BUFFER_ROWS } from "./Buildings";
import { FOUNTAIN_TILE, MAP_WIDTH, MAP_HEIGHT, TILE, createTownSquare } from "./MapData";

// Built by MinimapScene.js — a dedicated Scene (launched/stopped by
// WorldScene, see WorldScene.js) rather than GameObjects added directly
// inside WorldScene itself. That's not just tidiness: WorldScene's own
// camera runs at setZoom(1.25) to frame the town, and Phaser applies
// camera zoom to every object the camera renders — INCLUDING
// scrollFactor(0) ones, which only cancel the camera's scroll/pan, not
// its zoom scale. A minimap built as scrollFactor(0) objects inside
// WorldScene renders zoomed and mispositioned right along with the
// world (confirmed empirically: at zoom 1.25 a frame placed at screen
// (676,24) actually lands around (725,-38), well outside the canvas).
// A separate Scene has its own independent camera at the default zoom
// of 1, so this class doesn't need to know or care what WorldScene's
// camera is doing — same reasoning HUDScene already established for the
// "Press [E]" prompt.
const TILE_SIZE = 32;
const WORLD_PX_WIDTH = MAP_WIDTH * TILE_SIZE;
const WORLD_PX_HEIGHT = MAP_HEIGHT * TILE_SIZE;

const FRAME_TEXTURE_KEY = "minimap-frame";
const FRAME_DISPLAY_WIDTH = 260;
// Fallback aspect ratio (the originally-specced 260x205), only used if the
// frame texture failed to load — see "Asset files change out from under
// the code" in CLAUDE.md.
const FALLBACK_ASPECT = 260 / 205;

const MARGIN_X = 24;
const MARGIN_Y = 24;

// Fractions of the frame's own displayed rect, measured directly against
// the art (PIL pixel sampling for the wood-to-parchment color transition —
// same technique as AdventureBar's UPPER_ZONE/OPTION_ZONE) rather than
// assumed from the nominal 260x205/20-24px-border spec, since the actual
// asset turned out to be a different shape (a wood map frame with N/S/E/W
// nameplate tabs, not a plain uniform border). Not symmetric top/bottom:
// the "N" tab pokes up above the main frame rectangle, enlarging the
// measured top margin, while nothing pokes below the bottom edge the same
// way.
const CONTENT_ZONE = { x: [0.1062, 0.8938], y: [0.1548, 0.8899] };

// Frame + background/terrain are intentionally faded (this is a HUD
// overlay sitting on top of the actual gameplay view, not a full-screen
// map) — location dots, the player marker, and labels stay at full
// opacity below so the map stays legible even lightened.
const FRAME_ALPHA = 0.68;

// The map content painted into that window: a dark forest-green fill
// under everything (the surrounding woods, per the "no offset needed,
// the green border naturally represents the forest buffer" design), with
// the real per-tile path/plaza data (see createTownSquare/TILE from
// MapData.js — the same generator WorldScene itself renders from, not an
// approximation) drawn on top. Using the real tile grid instead of a
// hand-guessed bounding rect is what keeps the green forest band an even
// margin on every side and stops the player dot from ever appearing to
// stand in the woods while actually on a path.
const FOREST_COLOR = 0x1f3a22;
const FOREST_ALPHA = 0.38;
const PATH_COLOR = 0xcbb488;
const PLAZA_COLOR = 0xe4cd9c;
const GROUND_ALPHA = 0.6;
const BUILDING_COLOR = 0x6b5645;
const BUILDING_ALPHA = 0.6;

// Small decorative triangles standing in for the forest canopy — a
// stylized scatter (deterministic hash-driven, same "no Math.random()"
// convention TileRenderer/WorldObjects use for their own scatter/variety,
// reimplemented locally rather than shared since it's a tiny one-off)
// rather than a tile-accurate plot of every real tree in TREES, which
// would be far too dense to read at this scale. Skips any grid point
// that lands on a path/plaza/building tile so triangles only ever appear
// over actual forest.
const TREE_COLOR = 0x3f7a43;
const TREE_ALPHA = 0.42;
const TREE_SCATTER_STEP_TILES = 4;
const TREE_SKIP_CHANCE = 0.35;
const TREE_JITTER_TILES = 1.3;
const TREE_TRIANGLE_WIDTH = 3.5;
const TREE_TRIANGLE_HEIGHT = 4;

const LOCATION_DOT_RADIUS = 2.5;
const LOCATION_DOT_COLOR = 0xf2c94c;
const LOCATION_DOT_STROKE = 0x3a2a12;
const LABEL_FONT_SIZE = "7px";
const LABEL_COLOR = "#f4ecd8";
const LABEL_GAP = 4;
// Every label is centered directly above its own dot, at whatever height
// that dot sits at — with the town's 7 fixed locations at their actual
// coordinates, that alone is enough to keep every label clear of every
// other (verified against the real layout: Town Square/Library share
// nearly the same x but sit at very different heights, so their
// above-dot labels land in different vertical bands rather than
// colliding side-by-side the way a horizontal-offset label would). Only
// exception: a dot too close to the content area's own top edge (just
// the Overlook, tucked up near the north tree line) has no room for a
// label above it, so it flips below instead.
const LABEL_MIN_ABOVE_CLEARANCE = 16;

const PLAYER_DOT_RADIUS = 3;
const PLAYER_DOT_COLOR = 0xffffff;
const PLAYER_DOT_STROKE = 0x000000;

// Tile (37, 1 + NORTH_BUFFER_ROWS): the "Woods" interaction zone in
// WorldScene.js — the actual in-world spot the hidden path to the
// Overlook branches off from, so it doubles as the Overlook's own
// position on the minimap.
const OVERLOOK_TILE = { x: 37, y: 1 + NORTH_BUFFER_ROWS };
// Exported so OverlookScene.js can set the same flag key this reads —
// single source of truth rather than duplicating the string in both
// files.
export const OVERLOOK_VISITED_FLAG = "overlook.visited";
const OVERLOOK_HIDDEN_LABEL = "???";
const OVERLOOK_REVEALED_LABEL = "Hidden Overlook";

function buildLocations() {

    const overlookVisited = SaveManager.hasFlag(OVERLOOK_VISITED_FLAG);

    return [
        { id: "town-square", label: "Town Square", tile: FOUNTAIN_TILE },
        ...BUILDINGS.map((building) => ({
            id: building.id,
            label: building.name,
            tile: {
                x: building.x + (building.width / 2),
                y: building.y + (building.height / 2)
            }
        })),
        {
            id: "overlook",
            label: overlookVisited ? OVERLOOK_REVEALED_LABEL : OVERLOOK_HIDDEN_LABEL,
            tile: OVERLOOK_TILE
        }
    ];

}

export default class Minimap {

    constructor(scene) {
        this.scene = scene;
    }

    create() {

        const scene = this.scene;
        const { height } = scene.scale;

        const hasFrame = scene.textures.exists(FRAME_TEXTURE_KEY);
        const frameTexture = hasFrame ? scene.textures.get(FRAME_TEXTURE_KEY) : null;
        const frameName = hasFrame && frameTexture.has("content") ? "content" : undefined;
        const frameSrc = hasFrame ? frameTexture.get(frameName) : null;
        const aspect = frameSrc ? frameSrc.width / frameSrc.height : FALLBACK_ASPECT;

        this.displayWidth = FRAME_DISPLAY_WIDTH;
        this.displayHeight = this.displayWidth / aspect;

        this.container = scene.add.container(
            MARGIN_X,
            height - MARGIN_Y - this.displayHeight
        );

        this.contentLeft = this.displayWidth * CONTENT_ZONE.x[0];
        this.contentRight = this.displayWidth * CONTENT_ZONE.x[1];
        this.contentTop = this.displayHeight * CONTENT_ZONE.y[0];
        this.contentBottom = this.displayHeight * CONTENT_ZONE.y[1];
        this.contentWidth = this.contentRight - this.contentLeft;
        this.contentHeight = this.contentBottom - this.contentTop;

        if (hasFrame) {
            const frameImage = scene.add.image(0, 0, FRAME_TEXTURE_KEY, frameName);
            frameImage.setOrigin(0, 0);
            frameImage.setDisplaySize(this.displayWidth, this.displayHeight);
            frameImage.setAlpha(FRAME_ALPHA);
            this.container.add(frameImage);
        }

        this.buildBackground();
        this.buildLocationMarkers();
        this.buildPlayerMarker();

        return this;

    }

    // Maps a world pixel coordinate 1:1 onto the content window — the full
    // 75x56 tile grid (2400x1792px) scales directly onto contentWidth/
    // contentHeight, no offset, per the design spec.
    worldPxToContent(worldX, worldY) {
        return {
            x: this.contentLeft + ((worldX / WORLD_PX_WIDTH) * this.contentWidth),
            y: this.contentTop + ((worldY / WORLD_PX_HEIGHT) * this.contentHeight)
        };
    }

    worldTileToContent(tileX, tileY) {
        return this.worldPxToContent(tileX * TILE_SIZE, tileY * TILE_SIZE);
    }

    buildBackground() {

        const scene = this.scene;

        const forest = scene.add.rectangle(
            this.contentLeft, this.contentTop,
            this.contentWidth, this.contentHeight,
            FOREST_COLOR, FOREST_ALPHA
        ).setOrigin(0, 0);
        this.container.add(forest);

        const grid = createTownSquare();

        const graphics = scene.add.graphics();
        this.container.add(graphics);

        const tileWidth = this.contentWidth / MAP_WIDTH;
        const tileHeight = this.contentHeight / MAP_HEIGHT;

        // Real per-tile path/plaza data, not an approximated rect — see
        // the constants block above for why. +0.5px overdraw on each tile
        // hides the hairline seams sub-pixel rounding would otherwise
        // leave between adjacent tiles at this tiny scale.
        for (let ty = 0; ty < grid.length; ty++) {
            const row = grid[ty];
            for (let tx = 0; tx < row.length; tx++) {

                const isPlaza = row[tx] === TILE.PLAZA;
                if (!isPlaza && row[tx] !== TILE.STONE) continue;

                graphics.fillStyle(isPlaza ? PLAZA_COLOR : PATH_COLOR, GROUND_ALPHA);
                graphics.fillRect(
                    this.contentLeft + (tx * tileWidth),
                    this.contentTop + (ty * tileHeight),
                    tileWidth + 0.5,
                    tileHeight + 0.5
                );

            }
        }

        BUILDINGS.forEach((building) => {
            const topLeft = this.worldTileToContent(building.x, building.y);
            const bottomRight = this.worldTileToContent(building.x + building.width, building.y + building.height);
            graphics.fillStyle(BUILDING_COLOR, BUILDING_ALPHA);
            graphics.fillRect(
                topLeft.x, topLeft.y,
                bottomRight.x - topLeft.x, bottomRight.y - topLeft.y
            );
        });

        this.drawTrees(graphics, grid);

    }

    // Deterministic hash, same Math.sin-based technique as TileRenderer.js/
    // WorldObjects.js's own hashTile (not shared/imported — this is the
    // only place in this file that needs it, so a local copy is simpler
    // than introducing a cross-file dependency for one function).
    hash(x, y, salt) {
        const v = Math.sin((x * 127.1) + (y * 311.7) + (salt * 74.7)) * 43758.5453;
        return v - Math.floor(v);
    }

    drawTrees(graphics, grid) {

        graphics.fillStyle(TREE_COLOR, TREE_ALPHA);

        const isBuildingTile = (tx, ty) => BUILDINGS.some((b) =>
            tx >= b.x && tx < b.x + b.width && ty >= b.y && ty < b.y + b.height
        );

        for (let ty = 0; ty < MAP_HEIGHT; ty += TREE_SCATTER_STEP_TILES) {
            for (let tx = 0; tx < MAP_WIDTH; tx += TREE_SCATTER_STEP_TILES) {

                if (this.hash(tx, ty, 91) < TREE_SKIP_CHANCE) continue;

                const jitterX = (this.hash(tx, ty, 17) - 0.5) * 2 * TREE_JITTER_TILES;
                const jitterY = (this.hash(tx, ty, 53) - 0.5) * 2 * TREE_JITTER_TILES;

                const sampleX = Math.max(0, Math.min(MAP_WIDTH - 1, Math.round(tx + jitterX)));
                const sampleY = Math.max(0, Math.min(MAP_HEIGHT - 1, Math.round(ty + jitterY)));

                if (grid[sampleY][sampleX] !== TILE.GRASS) continue;
                if (isBuildingTile(sampleX, sampleY)) continue;

                const pos = this.worldTileToContent(tx + jitterX, ty + jitterY);
                const halfW = TREE_TRIANGLE_WIDTH / 2;
                const halfH = TREE_TRIANGLE_HEIGHT / 2;

                graphics.fillTriangle(
                    pos.x, pos.y - halfH,
                    pos.x - halfW, pos.y + halfH,
                    pos.x + halfW, pos.y + halfH
                );

            }
        }

    }

    buildLocationMarkers() {

        const scene = this.scene;

        buildLocations().forEach((location) => {

            const pos = this.worldTileToContent(location.tile.x, location.tile.y);

            const dot = scene.add.circle(pos.x, pos.y, LOCATION_DOT_RADIUS, LOCATION_DOT_COLOR);
            dot.setStrokeStyle(1, LOCATION_DOT_STROKE, 0.8);
            this.container.add(dot);

            const belowDot = (pos.y - this.contentTop) < LABEL_MIN_ABOVE_CLEARANCE;

            const label = scene.add.text(
                pos.x,
                pos.y + (belowDot ? LABEL_GAP : -LABEL_GAP),
                location.label,
                {
                    fontFamily: "monospace",
                    fontSize: LABEL_FONT_SIZE,
                    color: LABEL_COLOR
                }
            ).setOrigin(0.5, belowDot ? 0 : 1);
            this.container.add(label);

        });

    }

    buildPlayerMarker() {

        this.playerDot = this.scene.add.circle(0, 0, PLAYER_DOT_RADIUS, PLAYER_DOT_COLOR);
        this.playerDot.setStrokeStyle(1, PLAYER_DOT_STROKE, 0.6);
        this.container.add(this.playerDot);

    }

    // Called every frame from WorldScene.update() with the player's own
    // world pixel position.
    update(playerWorldX, playerWorldY) {

        if (!this.playerDot) return;

        const pos = this.worldPxToContent(playerWorldX, playerWorldY);
        this.playerDot.setPosition(pos.x, pos.y);

    }

}

import Phaser from "phaser";
import Player from "../entities/Player";
import TileRenderer from "../world/TileRenderer";
import WorldObjects, { DECOR } from "../world/WorldObjects";
import { TREES, BUSHES, createTownSquare, FOUNTAIN_TILE, TOWN_SQUARE_BOUNDS } from "../world/MapData";
import { BUILDINGS, NORTH_BUFFER_ROWS } from "../world/Buildings";
import AmbientWildlife from "../world/AmbientWildlife";
import { isCatAchievementComplete } from "../managers/CatAchievement";
import SaveManager from "../managers/SaveManager";
import { withPlayerName } from "../utils/dialogueText";
import AudioManager from "../managers/AudioManager";

// Maps an interaction zone's display name to the scene it leads into.
// Names with no entry here fall through to the console.log placeholder —
// they don't have an interior yet.
const BUILDING_SCENES = {
    "Library": "Library",
    "Gallery": "Gallery",
    "Workshop": "Workshop",
    "Café": "Cafe",
    "Theatre": "Theatre"
};

// Edison sits just east of the torii gate (see WorldObjects.js's
// createGateCat — same CAT_BASE_X/Y math, converted to tile coordinates:
// CAT_BASE_X 1348.5 / TILE_SIZE 32 = tile 42, same row as the gate/Woods
// zone). He's always rendered (see WorldObjects.js), but only interactive
// once the hidden five-building cat achievement is complete — see
// updateInteractions below, which only adds this zone when that's true.
const EDISON_ZONE = { x: 42, y: 1 + NORTH_BUFFER_ROWS, name: "Edison" };
const EDISON_LINE_DURATION = 4000;
const EDISON_LINE = "Hi{{name}}. Let's meet in the Japanese garden beyond the gate.";

// Fountain ambience — only while the player's own tile is within the town
// square rectangle (TOWN_SQUARE_BOUNDS covers the whole plaza the
// fountain sits at the center of, not just the fountain's own tile), so
// it fades in/out as the player crosses the plaza's edge rather than
// needing a separate, narrower zone of its own.
const FOUNTAIN_SFX_KEY = "sfx-fountain";
const FOUNTAIN_SFX_VOLUME = 0.5;

export default class WorldScene extends Phaser.Scene {
    constructor() {
        super("World");
    }

    create(data) {
        const TILE_SIZE = 32;
        this.scene.launch("HUD");

        // No-ops if Town's tracks are already playing (this scene's own
        // create() re-runs every time the player walks back out of a
        // building — see AudioManager.js) so re-entering World never
        // restarts the music. stopBuildingMusic() is what actually
        // resumes Town's own music layer after a building visit — playArea
        // alone won't, since "town" never stopped being the current area
        // the whole time the player was inside a building.
        AudioManager.playArea(this, "town");
        AudioManager.stopBuildingMusic();

        // generate map data
        this.mapData = createTownSquare();

        // world bounds based on map size
        this.physics.world.setBounds(
            0,
            0,
            this.mapData[0].length * TILE_SIZE,
            this.mapData.length * TILE_SIZE
        );

        this.obstacles = this.physics.add.staticGroup();

        // render tiles (graphics only)
        this.tileRenderer = new TileRenderer(this);
        this.tileRenderer.render(this.mapData);

        // trees and buildings are no longer part of the tile grid — spawn
        // them as their own GameObjects so they can be depth-sorted later
        this.worldObjects = new WorldObjects(this).create();

        // animated fountain, replacing the old baked-in WATER tile patch —
        // centered on FOUNTAIN_TILE (MapData.js), the same point
        // TileRenderer.js centers the square2.png plaza patch on. The 4
        // frame images were padded (100x110, transparent fill) so each one's
        // base sits at the same row (89) regardless of how tall that
        // frame's water spray is — origin uses that fraction so the base
        // itself doesn't jitter.
        this.fountain = this.add.sprite(
            (FOUNTAIN_TILE.x * TILE_SIZE) + 16,
            (FOUNTAIN_TILE.y * TILE_SIZE) + 16,
            "fountain1"
        );
        this.fountain.setOrigin(0.5, 89 / 110);
        this.fountain.setScale(2);

        // That origin sits near the BOTTOM of the sprite's own canvas
        // (81% of the way down), which means most of the sprite's total
        // height renders above the anchor point — placing the anchor at
        // the patch's center visually reads as the whole fountain sitting
        // in the upper portion of the square2 patch, not centered in it.
        // Shift down so the sprite's overall bounding box (not just its
        // anchor) centers on the patch instead.
        const patchCenterY = (FOUNTAIN_TILE.y * TILE_SIZE) + 16;
        this.fountain.y = patchCenterY + (this.fountain.displayHeight * (this.fountain.originY - 0.5));

        this.fountain.play("fountain-flow");

        // trees: one solid tile per tree (same footprint as before)
        TREES.forEach(([x, y]) => {
            this.createObstacle(x * TILE_SIZE, y * TILE_SIZE);
        });

        // scattered bushes: same single-tile-at-the-base collision as trees
        BUSHES.forEach(([x, y]) => {
            this.createObstacle(x * TILE_SIZE, y * TILE_SIZE);
        });

        // decor (benches/lampposts/signposts/flower boxes): same
        // single-tile-at-the-base collision as trees — these are physical
        // objects sitting on the ground, not passable.
        DECOR.forEach(({ x, y }) => {
            this.createObstacle(x * TILE_SIZE, y * TILE_SIZE);
        });

        // buildings: solid across the whole footprint except the door tile
        BUILDINGS.forEach((building) => {
            for (let by = building.y; by < building.y + building.height; by++) {
                for (let bx = building.x; bx < building.x + building.width; bx++) {

                    const isDoor = building.doorTile
                        && bx === building.doorTile.x
                        && by === building.doorTile.y;

                    if (!isDoor) {
                        this.createObstacle(bx * TILE_SIZE, by * TILE_SIZE);
                    }

                }
            }
        });

        // Spawn player centered on the main path near the south end of the
        // map, by default — far enough north of the solid south forest
        // border row to clear its trees' own canopies, not just the
        // camera's south bound. Border trees render up to 256px (8 tiles)
        // tall from a bottom-center anchor on that row, and — being south
        // of (i.e. higher depth than) anything spawned too close to them —
        // draw OVER the player wherever their canopy overlaps his sprite,
        // even though his own row is clear ground. Row 40 keeps the
        // player's own y comfortably above every nearby canopy's top edge
        // (measured empirically via screenshot — row 45, 3 tiles up from
        // the original spawn, still left the player fully hidden behind
        // the tallest border tree in this column). Scenes that send the
        // player back here from somewhere specific (e.g. the Overlook, via
        // ESC) can override where they land with { spawnX, spawnY }.
        const spawnX = (data && data.spawnX !== undefined) ? data.spawnX : 1200;
        const spawnY = (data && data.spawnY !== undefined) ? data.spawnY : (40 + NORTH_BUFFER_ROWS) * TILE_SIZE + 16;

        this.player = new Player(this, spawnX, spawnY);

        this.physics.add.collider(this.player, this.obstacles);

        this.cameras.main.setBounds(
            0,
            0,
            this.mapData[0].length * TILE_SIZE,
            this.mapData.length * TILE_SIZE
        );
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setZoom(1.25);

        // interaction setup
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.interactionTarget = null;
        this.interactionZones = [
            { x: 37, y: 15 + NORTH_BUFFER_ROWS, name: "Library" },
            { x: 14, y: 28 + NORTH_BUFFER_ROWS, name: "Gallery" },
            { x: 60, y: 28 + NORTH_BUFFER_ROWS, name: "Workshop" },
            { x: 16, y: 11 + NORTH_BUFFER_ROWS, name: "Theatre" },
            { x: 58, y: 11 + NORTH_BUFFER_ROWS, name: "Café" },
            { x: 37, y: 1 + NORTH_BUFFER_ROWS, name: "Woods" }
        ];

        // Edison's zone only gets added once the achievement is already
        // complete — checked fresh every time this scene is (re)created,
        // e.g. right after the fifth cat interaction's building fades back
        // out to World. Before that, the sprite renders (WorldObjects.js)
        // but simply has no zone to trigger on, so no prompt ever appears
        // near it — no per-frame gating needed elsewhere.
        if (isCatAchievementComplete()) {
            this.interactionZones.push(EDISON_ZONE);
        }

        // "Woods" is the only zone that isn't a building: it walks the
        // player through a 3-stage prompt instead of a single "Press E to
        // Open" — see updateWoodsInteraction below.
        this.woodsState = "initial"; // "initial" -> "thinking" -> "ready"

        // Edison: false until E is pressed once in range, then shows the
        // line instead of the "Press E to talk" prompt for a beat — same
        // "flavor line that reverts after a delay" convention every
        // building's own petCat() uses, just driven by proximity here
        // instead of a click.
        this.edisonLineActive = false;

        // Background-only birds/butterflies — no collision, no player
        // interaction. Torn down on shutdown since create() re-runs every
        // time the player re-enters World, which would otherwise stack a
        // second, independent set of spawn timers on top of the last one.
        this.wildlife = new AmbientWildlife(this);
        this.events.once("shutdown", () => this.wildlife.destroy());

        // Stops the fountain loop immediately on any scene exit (entering
        // a building, leaving for the Overlook) rather than leaving it to
        // the next update() — this scene's own update() stops running the
        // instant shutdown fires, so it's the only place that can catch
        // "player was in the zone right as they left."
        this.events.once("shutdown", () => AudioManager.setLoopActive(this, FOUNTAIN_SFX_KEY, FOUNTAIN_SFX_VOLUME, false));
    }

    createObstacle(x, y) {
        const block = this.add.rectangle(x + 16, y + 16, 32, 32, 0xff0000, 0);
        this.physics.add.existing(block, true);
        this.obstacles.add(block);
    }

   update() {

    this.player.update();

    this.updateInteractions();

    this.updateFountainAudio();

    this.updateDepthSorting();

}
// Lower on screen (larger Y) should render in front. Depth is keyed off
// each object's ground-contact point, not its center, so a tall canopy
// or roofline can still be hidden behind a player standing below it.
// Player and world objects all use a bottom-center origin, so their own
// .y already IS that ground-contact point — no extra offset needed.
updateDepthSorting() {

    this.player.setDepth(this.player.y);

    this.worldObjects.forEach((object) => {
        object.setDepth(object.y);
    });

}
// setLoopActive() itself is idempotent (no-ops if the requested state
// already matches), so this can just recompute "am I in the square" fresh
// every frame with no local playing/not-playing state of its own to track.
updateFountainAudio() {

    const TILE_SIZE = 32;

    const playerTileX = Math.floor(this.player.x / TILE_SIZE);
    const playerTileY = Math.floor(this.player.y / TILE_SIZE);

    const inSquare =
        playerTileX >= TOWN_SQUARE_BOUNDS.minCol && playerTileX <= TOWN_SQUARE_BOUNDS.maxCol &&
        playerTileY >= TOWN_SQUARE_BOUNDS.minRow && playerTileY <= TOWN_SQUARE_BOUNDS.maxRow;

    AudioManager.setLoopActive(this, FOUNTAIN_SFX_KEY, FOUNTAIN_SFX_VOLUME, inSquare);

}
updateInteractions() {

    const TILE_SIZE = 32;

    const playerTileX = Math.floor(this.player.x / TILE_SIZE);
    const playerTileY = Math.floor(this.player.y / TILE_SIZE);

    let target = null;

    for (const zone of this.interactionZones) {

        const distance =
            Math.abs(playerTileX - zone.x) +
            Math.abs(playerTileY - zone.y);

        if (distance <= 1) {
            target = zone;
            break;
        }

    }

    this.interactionTarget = target;

    const hud = this.scene.get("HUD");

    if (!target) {
        hud.hideInteraction();
        return;
    }

    if (target.name === "Woods") {
        this.updateWoodsInteraction(hud);
        return;
    }

    if (target.name === "Edison") {
        this.updateEdisonInteraction(hud);
        return;
    }

    hud.showInteraction(target.name);

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {

        const sceneKey = BUILDING_SCENES[target.name];

        if (sceneKey) {

            hud.hideInteraction();

            // The interaction zone's own tile IS the door tile the player
            // was just standing on — forwarded through so ESC from inside
            // (see AdventureScene.init's returnSpawnX/Y handling) spawns
            // back in front of this same building instead of the map's
            // default south-edge spawn.
            this.scene.start(sceneKey, {
                returnSpawnX: (target.x * TILE_SIZE) + 16,
                returnSpawnY: (target.y * TILE_SIZE) + 16
            });

        } else {
            console.log("Entering", target.name, "(coming soon)");
        }

    }

}

// Distinct from the building flow: the woods don't open a door on the
// first E — they reveal a second prompt instead. "thinking" is a brief
// beat ("...") before the road-not-taken prompt appears, so it reads as
// a pause rather than an instant swap. Once "ready", pressing E again is
// what actually leaves for the Overlook scene.
updateWoodsInteraction(hud) {

    const justPressed = Phaser.Input.Keyboard.JustDown(this.interactKey);

    if (this.woodsState === "initial") {

        hud.showInteraction("The Woods", "Press [E] to investigate the woods...");

        if (justPressed) {

            this.woodsState = "thinking";
            hud.showInteraction("The Woods", "...");

            this.time.delayedCall(2200, () => {
                if (this.woodsState === "thinking") {
                    this.woodsState = "ready";
                }
            });

        }

    } else if (this.woodsState === "thinking") {

        hud.showInteraction("The Woods", "...");

    } else if (this.woodsState === "ready") {

        hud.showInteraction("The Woods", "Press [E] to take the road less traveled by...");

        if (justPressed) {

            if (this.scene.get("Overlook")) {
                hud.hideInteraction();
                this.scene.start("Overlook");
            } else {
                console.log("Entering The Woods overlook (coming soon)");
            }

        }

    }

}

// Simple two-state version of the pattern above: an idle "Press [E]"
// prompt, and — once pressed — the line itself for EDISON_LINE_DURATION
// before reverting, regardless of whether the player is still standing
// there (same "shows, then reverts after a beat" convention as every
// building's own petCat(), just proximity-driven instead of a click).
updateEdisonInteraction(hud) {

    if (this.edisonLineActive) {

        hud.showInteraction("Edison", withPlayerName(EDISON_LINE, SaveManager.getName()));
        return;

    }

    hud.showInteraction("Edison", "Press [E] to talk to Edison.");

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {

        this.edisonLineActive = true;

        this.time.delayedCall(EDISON_LINE_DURATION, () => {
            this.edisonLineActive = false;
        });

    }

}
}
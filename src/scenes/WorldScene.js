import Phaser from "phaser";
import Player from "../entities/Player";
import TileRenderer from "../world/TileRenderer";
import WorldObjects from "../world/WorldObjects";
import { TREES, createTownSquare } from "../world/MapData";
import { BUILDINGS, NORTH_BUFFER_ROWS } from "../world/Buildings";

// Maps an interaction zone's display name to the scene it leads into.
// Names with no entry here (e.g. "Theatre") fall through to
// the console.log placeholder — they don't have an interior yet.
const BUILDING_SCENES = {
    "Library": "Library",
    "Gallery": "Gallery",
    "Workshop": "Workshop",
    "Café": "Cafe"
};

export default class WorldScene extends Phaser.Scene {
    constructor() {
        super("World");
    }

    create(data) {
        const TILE_SIZE = 32;
        this.scene.launch("HUD");

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
        // same center point: tile (37, 24), shifted down by
        // NORTH_BUFFER_ROWS along with the rest of the original layout
        // (see Buildings.js). The 4 frame images were padded (100x110,
        // transparent fill) so each one's base sits at the same row (89)
        // regardless of how tall that frame's water spray is — origin
        // uses that fraction so the base itself doesn't jitter.
        this.fountain = this.add.sprite(37 * TILE_SIZE + 16, (24 + NORTH_BUFFER_ROWS) * TILE_SIZE + 16, "fountain1");
        this.fountain.setOrigin(0.5, 89 / 110);
        this.fountain.setScale(2);
        this.fountain.play("fountain-flow");

        // trees: one solid tile per tree (same footprint as before)
        TREES.forEach(([x, y]) => {
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

        // Spawn player at the very bottom of the map, centered on the main
        // path, by default. The last row is solid forest border with no
        // gap like the top edge has, so one row north of it is as far
        // south as it's actually possible to stand. Scenes that send the
        // player back here from somewhere specific (e.g. the Overlook,
        // via ESC) can override where they land with { spawnX, spawnY }.
        const spawnX = (data && data.spawnX !== undefined) ? data.spawnX : 1200;
        const spawnY = (data && data.spawnY !== undefined) ? data.spawnY : (48 + NORTH_BUFFER_ROWS) * TILE_SIZE + 16;

        this.player = new Player(this, spawnX, spawnY);

        this.physics.add.collider(this.player, this.obstacles);

        this.cameras.main.setBounds(
            0,
            0,
            this.mapData[0].length * TILE_SIZE,
            this.mapData.length * TILE_SIZE
        );
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setZoom(1);

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

        // "Woods" is the only zone that isn't a building: it walks the
        // player through a 3-stage prompt instead of a single "Press E to
        // Open" — see updateWoodsInteraction below.
        this.woodsState = "initial"; // "initial" -> "thinking" -> "ready"
    }

    createObstacle(x, y) {
        const block = this.add.rectangle(x + 16, y + 16, 32, 32, 0xff0000, 0);
        this.physics.add.existing(block, true);
        this.obstacles.add(block);
    }

   update() {

    this.player.update();

    this.updateInteractions();

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

    hud.showInteraction(target.name);

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {

        const sceneKey = BUILDING_SCENES[target.name];

        if (sceneKey) {
            hud.hideInteraction();
            this.scene.start(sceneKey);
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
}
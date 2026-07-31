import Phaser from "phaser";
import Player from "../entities/Player";
import TileRenderer from "../world/TileRenderer";
import WorldObjects from "../world/WorldObjects";
import { TREES, createTownSquare } from "../world/MapData";
import { BUILDINGS } from "../world/Buildings";

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

    create() {
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

        // spawn player at the very bottom of the map, centered on the main
        // path. Row 49 (the last row) is solid forest border with no gap
        // like the top edge has, so row 48 is as far south as it's
        // actually possible to stand.
        this.player = new Player(this, 1200, 1552);

        this.physics.add.collider(this.player, this.obstacles);

        this.cameras.main.setBounds(
            0,
            0,
            this.mapData[0].length * TILE_SIZE,
            this.mapData.length * TILE_SIZE
        );
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setZoom(.75);

        // interaction setup
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.interactionTarget = null;
        this.interactionZones = [
            { x: 37, y: 11, name: "Library" },
            { x: 14, y: 28, name: "Gallery" },
            { x: 60, y: 28, name: "Workshop" },
            { x: 16, y: 11, name: "Theatre" },
            { x: 58, y: 11, name: "Café" }
        ];
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

    if (target) {

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

    } else {

        hud.hideInteraction();

    }

}
}
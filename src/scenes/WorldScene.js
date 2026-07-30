import Phaser from "phaser";
import Player from "../entities/Player";
import TileRenderer from "../world/TileRenderer";
import { TILE, createTownSquare } from "../world/MapData";

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

        // create obstacles from map data (renderer does NOT create collisions)
        for (let y = 0; y < this.mapData.length; y++) {
            for (let x = 0; x < this.mapData[0].length; x++) {
                const t = this.mapData[y][x];
                if (
                    t === TILE.TREE ||
                    t === TILE.LIBRARY ||
                    t === TILE.WORKSHOP ||
                    t === TILE.GALLERY ||
                    t === TILE.NORTHWEST_BUILDING ||
                    t === TILE.CAFE
                ) {
                    this.createObstacle(x * TILE_SIZE, y * TILE_SIZE);
                }
            }
        }

        // spawn player (unchanged)
        this.player = new Player(this, 1200, 800);

        this.physics.add.collider(this.player, this.obstacles);

        this.cameras.main.setBounds(
            0,
            0,
            this.mapData[0].length * TILE_SIZE,
            this.mapData.length * TILE_SIZE
        );
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setZoom(2);

        // interaction setup
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.interactionTarget = null;
        this.interactionZones = [
            { x: 37, y: 7, name: "Library" },
            { x: 20, y: 16, name: "Gallery" },
            { x: 54, y: 16, name: "Workshop" },
            { x: 20, y: 6, name: "Northwest Building" },
            { x: 54, y: 6, name: "Café" }
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

            if (target.name === "Library") {
                this.scene.start("Library");
            } else {
                console.log("Entering", target.name, "(coming soon)");
            }

        }

    } else {

        hud.hideInteraction();

    }

}
}
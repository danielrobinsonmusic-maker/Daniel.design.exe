import Phaser from "phaser";
import Player from "../entities/Player";
import { TILE, createTownSquare } from "../world/MapData";

export default class WorldScene extends Phaser.Scene {

    constructor() {
        super("World");
    }

    create() {

        this.map = createTownSquare();

        const TILE_SIZE = 32;

        this.physics.world.setBounds(
            0,
            0,
            this.map[0].length * TILE_SIZE,
            this.map.length * TILE_SIZE
        );

        this.obstacles = this.physics.add.staticGroup();

        this.drawGround(this.map);

        this.player = new Player(this, 1200, 800);

        this.physics.add.collider(
            this.player,
            this.obstacles
        );

        this.cameras.main.setBounds(
            0,
            0,
            this.map[0].length * TILE_SIZE,
            this.map.length * TILE_SIZE
        );

        this.cameras.main.startFollow(
            this.player,
            true,
            0.08,
            0.08
        );

        this.cameras.main.setZoom(2);

        this.interactKey = this.input.keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.E
);

this.interactionTarget = null;
this.interactionZones = [
    { x: 37, y: 7, name: "Library" },
    { x: 20, y: 16, name: "West Building" },
    { x: 54, y: 16, name: "Design Studio" },
    { x: 20, y: 6, name: "Northwest Building" },
    { x: 54, y: 6, name: "Northeast Building" }
];
this.interactionText = this.add.text(
    0,
    0,
    "",
    {
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: {
            left: 6,
            right: 6,
            top: 4,
            bottom: 4
        }
    }
);

this.interactionText.setScrollFactor(0);
this.interactionText.setVisible(false);

    }

    drawGround(map) {

        const TILE_SIZE = 32;

        const HEIGHT = map.length;
        const WIDTH = map[0].length;

        const graphics = this.add.graphics();

        for (let y = 0; y < HEIGHT; y++) {

            for (let x = 0; x < WIDTH; x++) {

                switch (map[y][x]) {

                    case TILE.GRASS:
                        graphics.fillStyle(0x88A95F);
                        break;

                    case TILE.STONE:
                        graphics.fillStyle(0x9B9B9B);
                        break;

                    case TILE.WATER:
                        graphics.fillStyle(0x4A90E2);
                        break;

                    case TILE.TREE:
                        graphics.fillStyle(0x2F6B2F);
                        break;

                    case TILE.LIBRARY:
                        graphics.fillStyle(0xB68C5A);
                        break;

                    
                        case TILE.DESIGN_STUDIO:
    graphics.fillStyle(0x5A8CB6);
    break;

case TILE.WEST_BUILDING:
    graphics.fillStyle(0xB66E5A);
    break;

case TILE.NORTHWEST_BUILDING:
    graphics.fillStyle(0x8C6AB6);
    break;

case TILE.NORTHEAST_BUILDING:
    graphics.fillStyle(0xB6A05A);
    break;
    default:
                        graphics.fillStyle(0xff00ff);
                        break;
                }

                graphics.fillRect(
                    x * TILE_SIZE,
                    y * TILE_SIZE,
                    TILE_SIZE,
                    TILE_SIZE
                );

                if (
    map[y][x] === TILE.TREE ||
    map[y][x] === TILE.LIBRARY ||
    map[y][x] === TILE.DESIGN_STUDIO ||
    map[y][x] === TILE.WEST_BUILDING ||
    map[y][x] === TILE.NORTHWEST_BUILDING ||
    map[y][x] === TILE.NORTHEAST_BUILDING
){
                    this.createObstacle(
                        x * TILE_SIZE,
                        y * TILE_SIZE
                    );
                }

            }

        }

    }

    createObstacle(x, y) {

        const block = this.add.rectangle(
            x + 16,
            y + 16,
            32,
            32,
            0xff0000,
            0
        );

        this.physics.add.existing(block, true);

        this.obstacles.add(block);

    }

    update() {

        this.player.update();
        this.checkInteractions();

    }
checkInteractions() {

    this.interactionTarget = null;

    const playerTileX = Math.floor(this.player.x / 32);
    const playerTileY = Math.floor(this.player.y / 32);

    for (const zone of this.interactionZones) {

        const dx = Math.abs(playerTileX - zone.x);
        const dy = Math.abs(playerTileY - zone.y);

        if (dx <= 1 && dy <= 1) {

            this.interactionTarget = zone;
            break;

        }

    }

    if (this.interactionTarget) {

        this.interactionText.setText(
            `Press E\n${this.interactionTarget.name}`
        );

        this.interactionText.setPosition(20, 20);

        this.interactionText.setVisible(true);

        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {

            this.handleInteraction(this.interactionTarget);

        }

    } else {

        this.interactionText.setVisible(false);

    }

}
handleInteraction(zone) {

    console.log(`Entering ${zone.name}`);
console.log(playerTileX, playerTileY);
}
}
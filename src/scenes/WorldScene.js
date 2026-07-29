import Phaser from "phaser";
import Player from "../entities/Player";
import { TILE, createTownSquare } from "../world/MapData";
export default class WorldScene extends Phaser.Scene {
    constructor() {
        super("World");
    }

    create() {

        const map = createTownSquare();

const TILE_SIZE = 32;

this.physics.world.setBounds(
    0,
    0,
    map[0].length * TILE_SIZE,
    map.length * TILE_SIZE
);

        this.obstacles = this.physics.add.staticGroup();

        this.drawGround();

        this.player = new Player(this, 1200, 800);

        this.physics.add.collider(
            this.player,
            this.obstacles
        );

        this.cameras.main.setBounds(
    0,
    0,
    map[0].length * TILE_SIZE,
    map.length * TILE_SIZE
);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setZoom(2);

    }

    drawGround() {

        const TILE_SIZE = 32;

        const map = createTownSquare();

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
                    map[y][x] === TILE.LIBRARY
                ) {
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

    }
}
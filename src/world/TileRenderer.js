import { TILE } from "./MapData";

export default class TileRenderer {
    constructor(scene) {
        this.scene = scene;
        this.graphics = null;
    }

    render(map) {
        if (!map || !map.length) return;

        // clear any previous graphics
        if (this.graphics) this.clear();

        const TILE_SIZE = 32;
        const HEIGHT = map.length;
        const WIDTH = map[0].length;

        this.graphics = this.scene.add.graphics();

        for (let y = 0; y < HEIGHT; y++) {
            for (let x = 0; x < WIDTH; x++) {
                const tile = map[y][x];

                switch (tile) {
                    case TILE.GRASS:
                        this.graphics.fillStyle(0x88A95F);
                        break;

                    case TILE.STONE:
                        this.graphics.fillStyle(0x9B9B9B);
                        break;

                    case TILE.WATER:
                        this.graphics.fillStyle(0x4A90E2);
                        break;

                    case TILE.TREE:
                        this.graphics.fillStyle(0x2F6B2F);
                        break;

                    case TILE.LIBRARY:
                        this.graphics.fillStyle(0xB68C5A);
                        break;

                    case TILE.WORKSHOP:
                        this.graphics.fillStyle(0xB6A05A);
                        break;

                    case TILE.GALLERY:
                        this.graphics.fillStyle(0xB66E5A);
                        break;

                    case TILE.NORTHWEST_BUILDING:
                        this.graphics.fillStyle(0x8C6AB6);
                        break;

                    case TILE.CAFE:
                        this.graphics.fillStyle(0xB6A05A);
                        break;

                    default:
                        this.graphics.fillStyle(0xff00ff);
                        break;
                }

                this.graphics.fillRect(
                    x * TILE_SIZE,
                    y * TILE_SIZE,
                    TILE_SIZE,
                    TILE_SIZE
                );
            }
        }
    }

    clear() {
        if (this.graphics) {
            this.graphics.clear();
            this.graphics.destroy();
            this.graphics = null;
        }
    }
}

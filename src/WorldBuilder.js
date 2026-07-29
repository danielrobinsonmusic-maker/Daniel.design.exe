import Phaser from "phaser";

export default class WorldBuilder {
    constructor(scene) {
        this.scene = scene;
        this.tileSize = 32;
    }

  build() {
    console.log("WorldBuilder running");

    this.drawGround();
    this.drawPath();
    this.drawFountain();
    this.drawTrees();
}

    drawGround() {
        const g = this.scene.add.graphics();

        for (let y = 0; y < 50; y++) {
            for (let x = 0; x < 75; x++) {

                // Slight color variation
                const colors = [
                    0x8DAE63,
                    0x88A95F,
                    0x91B268
                ];

                const color =
                    Phaser.Utils.Array.GetRandom(colors);

                g.fillStyle(color);

                g.fillRect(
                    x * this.tileSize,
                    y * this.tileSize,
                    this.tileSize,
                    this.tileSize
                );
            }
        }
    }

    drawPath() {
        const g = this.scene.add.graphics();

        g.fillStyle(0xC5B08A);

        for (let x = 20; x < 55; x++) {

            g.fillRect(
                x * 32,
                24 * 32,
                32,
                32
            );
        }
    }

    drawFountain() {

        this.scene.add.circle(
            1200,
            760,
            55,
            0x5DA9E9
        );

        this.scene.add.circle(
            1200,
            760,
            75,
            0xBBBBBB
        );
    }

    drawTrees() {

        const positions = [
            [700,600],
            [800,650],
            [950,550],
            [1450,550],
            [1600,700],
            [1700,900],
            [800,1000]
        ];

        positions.forEach(([x,y]) => {

            this.scene.add.circle(
                x,
                y,
                28,
                0x567A38
            );

        });

    }
}
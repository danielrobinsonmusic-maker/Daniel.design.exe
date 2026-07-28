import Phaser from "phaser";
import Player from "../entities/Player";

export default class WorldScene extends Phaser.Scene {
    constructor() {
        super("World");
    }

    create() {

        // Temporary world size
        this.physics.world.setBounds(0, 0, 2400, 1600);

        // Grass-colored background
        this.cameras.main.setBackgroundColor("#6FAF62");

        // Draw a subtle grid so movement feels meaningful
        const graphics = this.add.graphics();

        graphics.lineStyle(1, 0x6aa45f, 0.25);

        for (let x = 0; x <= 2400; x += 32) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, 1600);
        }

        for (let y = 0; y <= 1600; y += 32) {
            graphics.moveTo(0, y);
            graphics.lineTo(2400, y);
        }

        graphics.strokePath();

        this.player = new Player(this, 1200, 800);

        this.cameras.main.setBounds(0, 0, 2400, 1600);

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        this.cameras.main.setZoom(2);

        this.add.text(
            1120,
            720,
            "World Green\n(Blockout)",
            {
                fontFamily: "monospace",
                fontSize: "14px",
                color: "#ffffff",
                align: "center"
            }
        );
    }

    update() {
        this.player.update();
    }
}
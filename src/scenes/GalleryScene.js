import Phaser from "phaser";

export default class GalleryScene extends Phaser.Scene {

    constructor() {
        super("Gallery");
    }

    create() {

        const TILE = 32;

        // Floor
        for (let y = 0; y < 17; y++) {

            for (let x = 0; x < 30; x++) {

                this.add.rectangle(
                    x * TILE + 16,
                    y * TILE + 16,
                    TILE,
                    TILE,
                    0xd9c9a2
                ).setStrokeStyle(1, 0xb59b70);

            }

        }

        // Title
        this.add.text(
            16,
            12,
            "Gallery",
            {
                fontFamily: "monospace",
                fontSize: "18px",
                color: "#222222"
            }
        );

        // Placeholder notice
        this.add.text(
            480,
            270,
            "Coming soon",
            {
                fontFamily: "monospace",
                fontSize: "24px",
                color: "#555555"
            }
        ).setOrigin(0.5);

        // Exit instructions
        this.add.text(
            16,
            500,
            "ESC = Return Outside (temporary)",
            {
                fontFamily: "monospace",
                fontSize: "14px",
                color: "#333333"
            }
        );

        this.input.keyboard.once("keydown-ESC", () => {

            this.scene.start("World");

        });

    }

}

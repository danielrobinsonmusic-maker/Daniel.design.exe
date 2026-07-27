import Phaser from "phaser";

export default class TownScene extends Phaser.Scene {
    constructor() {
        super("Town");
    }

    create() {
        const { width, height } = this.scale;

        this.add
            .text(width / 2, height / 2 - 20, "Welcome to Town", {
                fontFamily: "monospace",
                fontSize: "32px",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        this.add
            .text(width / 2, height / 2 + 40, "Press SPACE to restart", {
                fontFamily: "monospace",
                fontSize: "18px",
                color: "#aaaaaa",
            })
            .setOrigin(0.5);

        this.input.keyboard.once("keydown-SPACE", () => {
            this.scene.start("Title");
        });
    }
}

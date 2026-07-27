import Phaser from "phaser";

export default class NameScene extends Phaser.Scene {
    constructor() {
        super("Name");
    }

    create() {
        const { width, height } = this.scale;

        this.add
            .text(width / 2, height / 2 - 20, "Enter your name:", {
                fontFamily: "monospace",
                fontSize: "24px",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        this.add
            .text(width / 2, height / 2 + 40, "Press ENTER to continue", {
                fontFamily: "monospace",
                fontSize: "18px",
                color: "#aaaaaa",
            })
            .setOrigin(0.5);

        this.input.keyboard.once("keydown-ENTER", () => {
            this.scene.start("Town");
        });
    }
}

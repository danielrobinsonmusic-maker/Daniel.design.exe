import Phaser from "phaser";

export default class TitleScene extends Phaser.Scene {
    constructor() {
        super("Title");
    }

    create() {
        const { width, height } = this.scale;

        this.add
            .text(width / 2, 110, "Daniel.design.exe", {
                fontFamily: "monospace",
                fontSize: "40px",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        this.add
            .text(
                width / 2,
                220,
                "Building portfolio...",
                {
                    fontFamily: "monospace",
                    fontSize: "20px",
                    color: "#9aa3b2",
                }
            )
            .setOrigin(0.5);

        this.add
            .text(
                width / 2,
                height - 70,
                "Milestone 1A",
                {
                    fontFamily: "monospace",
                    fontSize: "16px",
                    color: "#5e6a7d",
                }
            )
            .setOrigin(0.5);
    }
}
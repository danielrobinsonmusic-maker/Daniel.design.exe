import Phaser from "phaser";
import SaveManager from "../managers/SaveManager";

export default class TitleScene extends Phaser.Scene {
    constructor() {
        super("Title");
        this.selected = 0;
    }

    create() {
        const { width } = this.scale;

        this.options = [
            { text: "New Visitor", enabled: true },
            { text: "Continue", enabled: SaveManager.hasSave() },
            { text: "Portfolio Mode", enabled: true },
        ];

        this.add.text(width / 2, 100, "Daniel.design.exe", {
            fontFamily: "monospace",
            fontSize: "42px",
            color: "#ffffff",
        }).setOrigin(0.5);

        this.menuTexts = [];

        this.options.forEach((option, i) => {
            const text = this.add.text(
                width / 2,
                220 + i * 45,
                "",
                {
                    fontFamily: "monospace",
                    fontSize: "24px",
                    color: option.enabled ? "#ffffff" : "#666666",
                }
            ).setOrigin(0.5);

            this.menuTexts.push(text);
        });

        this.updateMenu();

        this.input.keyboard.on("keydown-UP", () => this.move(-1));
        this.input.keyboard.on("keydown-W", () => this.move(-1));
        this.input.keyboard.on("keydown-DOWN", () => this.move(1));
        this.input.keyboard.on("keydown-S", () => this.move(1));
        this.input.keyboard.on("keydown-ENTER", () => this.select());
        this.input.keyboard.on("keydown-SPACE", () => this.select());
    }

    move(direction) {
        do {
            this.selected =
                (this.selected + direction + this.options.length) %
                this.options.length;
        } while (!this.options[this.selected].enabled);

        this.updateMenu();
    }

    updateMenu() {
        this.menuTexts.forEach((text, i) => {
            const prefix = i === this.selected ? "▶ " : "   ";
            text.setText(prefix + this.options[i].text);
        });
    }

    select() {
        switch (this.options[this.selected].text) {
            case "New Visitor":
                this.scene.start("Name");
                break;

            case "Portfolio Mode":
                console.log("Portfolio Mode");
                break;

            case "Continue":
                console.log("Continue");
                break;
        }
    }
}
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

        this.hintText = this.add.text(width / 2, 300, "", {
            fontFamily: "monospace",
            fontSize: "16px",
            color: "#aaaaaa",
        }).setOrigin(0.5);

        this.updateMenu();

        this.add.text(
            width / 2,
            460,
            "This interactive portfolio is inspired by SNES RPGs and point-and-click adventure games of the 1990s. It requires a MOUSE and KEYBOARD to play.",
            {
                fontFamily: "monospace",
                fontSize: "14px",
                color: "#888888",
                align: "center",
                wordWrap: { width: width * 0.8 }
            }
        ).setOrigin(0.5);

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

        // move()'s own while-loop never lands `selected` on a disabled
        // option (Continue is skipped over entirely when there's no
        // save), so reaching the "Continue" case here already implies
        // it's available — no separate enabled check needed.
        const hint = this.options[this.selected].text === "Continue"
            ? "Press Enter to continue."
            : "Press Enter to begin.";

        this.hintText.setText(hint);
    }

    select() {
        switch (this.options[this.selected].text) {
            case "New Visitor":
                this.scene.start("Name");
                break;

            case "Continue":
                console.log("Continue");
                break;
        }
    }
}
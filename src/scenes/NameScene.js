import Phaser from "phaser";
import SaveManager from "../managers/SaveManager";

export default class NameScene extends Phaser.Scene {

    constructor() {
        super("Name");
        this.playerName = "";
    }

    create() {

        const { width, height } = this.scale;

        this.add.text(
            width / 2,
            110,
            "Welcome!",
            {
                fontFamily: "monospace",
                fontSize: "38px",
                color: "#ffffff"
            }
        ).setOrigin(0.5);

        this.add.text(
            width / 2,
            180,
            "What should everyone call you?",
            {
                fontFamily: "monospace",
                fontSize: "22px",
                color: "#bbbbbb"
            }
        ).setOrigin(0.5);

        this.nameText = this.add.text(
            width / 2,
            280,
            "> _",
            {
                fontFamily: "monospace",
                fontSize: "30px",
                color: "#66ff99"
            }
        ).setOrigin(0.5);

        this.add.text(
            width / 2,
            420,
            "ENTER = Continue    BACKSPACE = Delete",
            {
                fontFamily: "monospace",
                fontSize: "16px",
                color: "#777777"
            }
        ).setOrigin(0.5);

        this.input.keyboard.on("keydown", this.handleKey, this);
    }

    handleKey(event) {

        if (event.key === "Backspace") {

            this.playerName =
                this.playerName.slice(0, -1);

        }

        else if (event.key === "Enter") {

            if (this.playerName.trim().length > 0) {

                SaveManager.save({
                    name: this.playerName
                });

                // We'll build this next.
                this.scene.start("BootSequence");

            }

        }

        else if (
            event.key.length === 1 &&
            this.playerName.length < 18
        ) {

            this.playerName += event.key;

        }

        this.nameText.setText(
            `> ${this.playerName}_`
        );

    }

}
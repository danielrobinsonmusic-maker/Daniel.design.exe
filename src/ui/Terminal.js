import Phaser from "phaser";

export default class Terminal {

    constructor(scene) {

        this.scene = scene;

        this.lines = [];

        this.text = scene.add.text(
            40,
            40,
            "",
            {
                fontFamily: "monospace",
                fontSize: "24px",
                color: "#66ff99",
                lineSpacing: 8
            }
        );

    }

    print(message) {

        this.lines.push(message);

        this.text.setText(
            this.lines.join("\n")
        );

    }

    clear() {

        this.lines = [];

        this.text.setText("");

    }

}
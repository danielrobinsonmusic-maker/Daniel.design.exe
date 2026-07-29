import Phaser from "phaser";
import TypewriterText from "./TypewriterText";

export default class DialogBox {

    constructor(scene) {

        this.scene = scene;

        const { width, height } = scene.scale;

        this.container = scene.add.container(0,0);

        this.background = scene.add.rectangle(
            width / 2,
            height - 110,
            width - 80,
            140,
            0x000000,
            0.80
        );

        this.background.setStrokeStyle(2,0xffffff);

        this.text = scene.add.text(
            70,
            height - 160,
            "",
            {
                fontFamily: "monospace",
                fontSize: "22px",
                color: "#ffffff",
                wordWrap: {
                    width: width - 140
                }
            }
        );

        this.writer = new TypewriterText(
    scene,
    this.text
);

        this.container.add([
            this.background,
            this.text
        ]);

        this.container.setVisible(false);
    }

   show(message) {

    this.container.setVisible(true);

    this.writer.play(message);

}

    hide(){

        this.container.setVisible(false);

    }

}
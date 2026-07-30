import Phaser from "phaser";

export default class HUDScene extends Phaser.Scene {

    constructor() {
        super("HUD");
    }

    create() {

        const { width, height } = this.scale;

        // Main container
        this.panel = this.add.container(width / 2, height + 90);

        // Shadow
        const shadow = this.add.rectangle(
            3,
            3,
            320,
            92,
            0x000000,
            0.25
        );

        // Window body
        const body = this.add.rectangle(
            0,
            0,
            320,
            92,
            0xd8d5c8
        );

        body.setStrokeStyle(2, 0x4b4b4b);

        // Title bar
        const titleBar = this.add.rectangle(
            0,
            -34,
            320,
            24,
            0x3f5f9f
        );

        // Window title
        const windowTitle = this.add.text(
            -150,
            -34,
            "Daniel.design.exe",
            {
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#ffffff"
            }
        ).setOrigin(0, 0.5);

        // Fake window controls
        const controls = this.add.text(
            146,
            -34,
            "_ □ X",
            {
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#ffffff"
            }
        ).setOrigin(1, 0.5);

        // Location title
        this.titleText = this.add.text(
            0,
            -6,
            "",
            {
                fontFamily: "monospace",
                fontSize: "18px",
                color: "#222222"
            }
        ).setOrigin(0.5);

        // Prompt
        this.promptText = this.add.text(
            0,
            24,
            "",
            {
                fontFamily: "monospace",
                fontSize: "14px",
                color: "#444444"
            }
        ).setOrigin(0.5);

        this.panel.add([
            shadow,
            body,
            titleBar,
            windowTitle,
            controls,
            this.titleText,
            this.promptText
        ]);

        this.panel.setAlpha(0);
        this.panel.setVisible(false);

    }

    showInteraction(location) {

        this.titleText.setText(location);
        this.promptText.setText("Press [E] to Open");

        if (this.panel.visible) {
            return;
        }

        this.panel.setVisible(true);

        this.tweens.add({
            targets: this.panel,
            y: this.scale.height - 70,
            alpha: 1,
            duration: 180,
            ease: "Quad.out"
        });

    }

    hideInteraction() {

        if (!this.panel.visible) {
            return;
        }

        this.tweens.add({
            targets: this.panel,
            y: this.scale.height + 90,
            alpha: 0,
            duration: 150,
            ease: "Quad.in",
            onComplete: () => {
                this.panel.setVisible(false);
            }
        });

    }

}
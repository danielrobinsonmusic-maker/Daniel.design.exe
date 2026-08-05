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
            112,
            0x000000,
            0.25
        );

        // Window body
        const body = this.add.rectangle(
            0,
            0,
            320,
            112,
            0xd8d5c8
        );

        body.setStrokeStyle(2, 0x4b4b4b);

        // Title bar
        const titleBar = this.add.rectangle(
            0,
            -44,
            320,
            24,
            0x3f5f9f
        );

        // Window title
        const windowTitle = this.add.text(
            -150,
            -44,
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
            -44,
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
            -14,
            "",
            {
                fontFamily: "monospace",
                fontSize: "18px",
                color: "#222222"
            }
        ).setOrigin(0.5);

        // Prompt. Word-wrapped since some prompts (the woods' flavor text)
        // run longer than a single line fits at this panel width.
        this.promptText = this.add.text(
            0,
            22,
            "",
            {
                fontFamily: "monospace",
                fontSize: "14px",
                color: "#444444",
                align: "center",
                wordWrap: { width: 280 }
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

    showInteraction(location, prompt = "Press [E] to go inside") {

        this.titleText.setText(location);
        this.promptText.setText(prompt);

        if (this.panel.visible) {
            return;
        }

        this.panel.setVisible(true);

        this.tweens.add({
            targets: this.panel,
            y: this.scale.height - 80,
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
import Phaser from "phaser";

export default class AppScene extends Phaser.Scene {

    constructor() {
        super("App");
    }

    create() {

        const { width, height } = this.scale;

        this.overlay = this.add.rectangle(
            0,
            0,
            width,
            height,
            0x000000,
            0.45
        )
        .setOrigin(0)
        .setAlpha(0)
        .setVisible(false);

        this.window = this.add.container(width / 2, height / 2);

        // Shadow
        const shadow = this.add.rectangle(
            6,
            6,
            520,
            340,
            0x000000,
            0.20
        );

        // Window body
        const body = this.add.rectangle(
            0,
            0,
            520,
            340,
            0xd8d5c8
        );

        body.setStrokeStyle(2, 0x4b4b4b);

        // Title bar
        const titleBar = this.add.rectangle(
            0,
            -158,
            520,
            28,
            0x3f5f9f
        );

        this.windowTitle = this.add.text(
            -246,
            -158,
            "Resume.txt",
            {
                fontFamily: "monospace",
                fontSize: "14px",
                color: "#ffffff"
            }
        ).setOrigin(0, 0.5);

        this.closeButton = this.add.text(
            240,
            -158,
            "✕",
            {
                fontFamily: "monospace",
                fontSize: "14px",
                color: "#ffffff"
            }
        )
        .setOrigin(1, 0.5)
        .setInteractive({ useHandCursor: true });

        this.content = this.add.text(
            -220,
            -120,
            "",
            {
                fontFamily: "monospace",
                fontSize: "16px",
                color: "#222222",
                lineSpacing: 8,
                wordWrap: {
                    width: 440
                }
            }
        );

        this.window.add([
            shadow,
            body,
            titleBar,
            this.windowTitle,
            this.closeButton,
            this.content
        ]);

        this.window.setVisible(false);
        this.window.setScale(0.85);
        this.window.setAlpha(0);

        this.closeButton.on("pointerdown", () => {
            this.close();
        });

        this.input.keyboard.on("keydown-ESC", () => {
            this.close();
        });

    }

    open(app) {

        this.overlay.setVisible(true);
        this.window.setVisible(true);

        switch (app) {

            case "resume":

                this.windowTitle.setText("📄 Resume.txt");

                this.content.setText(
`Daniel XXXXX

Senior Product Designer

────────────────────────

• Experience

• Portfolio

• Skills

• Contact

────────────────────────

This will become your interactive resume.`
                );

                break;

            default:

                this.windowTitle.setText("Application");

                this.content.setText("Coming Soon.");

        }

        this.overlay.setAlpha(0);

        this.window.setAlpha(0);
        this.window.setScale(0.85);

        this.tweens.add({
            targets: this.overlay,
            alpha: 1,
            duration: 180
        });

        this.tweens.add({
            targets: this.window,
            alpha: 1,
            scale: 1,
            duration: 180,
            ease: "Back.Out"
        });

    }

    close() {

        this.tweens.add({
            targets: this.overlay,
            alpha: 0,
            duration: 150
        });

        this.tweens.add({
            targets: this.window,
            alpha: 0,
            scale: 0.9,
            duration: 150,
            ease: "Quad.In",
            onComplete: () => {

                this.overlay.setVisible(false);
                this.window.setVisible(false);

                this.scene.get("World").closeApp();

            }
        });

    }

}
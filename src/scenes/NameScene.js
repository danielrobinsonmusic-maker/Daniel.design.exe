import Phaser from "phaser";
import SaveManager from "../managers/SaveManager";
import AudioManager from "../managers/AudioManager";

export default class NameScene extends Phaser.Scene {

    constructor() {
        super("Name");
        this.playerName = "";
    }

    create() {

        const { width } = this.scale;

        // Same track TitleScene started — playOnboardingMusic no-ops if
        // it's already playing, so this continues it uninterrupted rather
        // than restarting from 0.
        AudioManager.playOnboardingMusic(this);

        // Shifted up from the original 110/180/280/420 layout to leave
        // clean room below for the arrow-key diagram (see
        // createNavigationHint) without anything crowding the canvas'
        // bottom edge (540px tall).
        this.add.text(
            width / 2,
            70,
            "Welcome!",
            {
                fontFamily: "monospace",
                fontSize: "38px",
                color: "#ffffff"
            }
        ).setOrigin(0.5);

        this.add.text(
            width / 2,
            130,
            "What should everyone call you?",
            {
                fontFamily: "monospace",
                fontSize: "22px",
                color: "#bbbbbb"
            }
        ).setOrigin(0.5);

        this.nameText = this.add.text(
            width / 2,
            210,
            "> _",
            {
                fontFamily: "monospace",
                fontSize: "30px",
                color: "#66ff99"
            }
        ).setOrigin(0.5);

        this.add.text(
            width / 2,
            280,
            "ENTER = Continue    BACKSPACE = Delete",
            {
                fontFamily: "monospace",
                fontSize: "16px",
                color: "#777777"
            }
        ).setOrigin(0.5);

        this.createNavigationHint(width / 2, 350);

        this.input.keyboard.on("keydown", this.handleKey, this);
    }

    // A small arrow-key "keycap" diagram (the classic inverted-T layout —
    // Up above, Left/Down/Right in a row beneath it) plus a caption,
    // previewing the World scene's actual movement controls before the
    // player ever gets there. Pure Graphics/Text — no new art asset
    // needed for something this small.
    createNavigationHint(centerX, captionY) {

        this.add.text(
            centerX,
            captionY,
            "Use the arrow keys to navigate the town",
            {
                fontFamily: "monospace",
                fontSize: "16px",
                color: "#bbbbbb"
            }
        ).setOrigin(0.5);

        const KEY_SIZE = 34;
        const KEY_GAP = 6;
        const KEY_RADIUS = 6;
        const KEY_FILL = 0x2a2a2a;
        const KEY_STROKE = 0x666666;
        const ARROW_COLOR = "#66ff99";

        const upY = captionY + 44;
        const rowY = upY + KEY_SIZE + KEY_GAP;

        const keys = [
            { x: centerX, y: upY, glyph: "▲" },
            { x: centerX - (KEY_SIZE + KEY_GAP), y: rowY, glyph: "◀" },
            { x: centerX, y: rowY, glyph: "▼" },
            { x: centerX + (KEY_SIZE + KEY_GAP), y: rowY, glyph: "▶" }
        ];

        const graphics = this.add.graphics();
        graphics.fillStyle(KEY_FILL, 1);
        graphics.lineStyle(2, KEY_STROKE, 1);

        keys.forEach(({ x, y }) => {

            const left = x - (KEY_SIZE / 2);
            const top = y - (KEY_SIZE / 2);

            graphics.fillRoundedRect(left, top, KEY_SIZE, KEY_SIZE, KEY_RADIUS);
            graphics.strokeRoundedRect(left, top, KEY_SIZE, KEY_SIZE, KEY_RADIUS);

        });

        keys.forEach(({ x, y, glyph }) => {

            this.add.text(x, y, glyph, {
                fontFamily: "monospace",
                fontSize: "16px",
                color: ARROW_COLOR
            }).setOrigin(0.5);

        });

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

AudioManager.stopOnboardingMusic();
this.scene.start("World");

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
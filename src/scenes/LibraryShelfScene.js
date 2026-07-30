import Phaser from "phaser";
import Panel from "../ui/Panel";
import library from "../data/library";

export default class LibraryShelfScene extends Phaser.Scene {

    constructor() {
        super("LibraryShelf");
    }

    create() {

        const { width, height } = this.scale;

        this.selection = 0;

        // Dark overlay
        this.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x000000,
            0.6
        );

        // Panel sized to fit however many items the library holds, so the
        // list never overruns the frame or collides with the help text.
        const rowHeight = 34;
        const panelHeight = 150 + library.length * rowHeight + 60;
        const firstItemY = -(panelHeight / 2) + 90;

        this.panel = new Panel(
            this,
            width / 2,
            height / 2,
            500,
            panelHeight
        );

        this.panel.setTitle("Library Shelf");

        this.bookTexts = [];

        library.forEach((item, index) => {

            const text = this.add.text(
                0,
                firstItemY + (index * rowHeight),
                "",
                {
                    fontFamily: "monospace",
                    fontSize: "18px",
                    color: "#333"
                }
            ).setOrigin(0.5);

            this.panel.body.add(text);
            this.bookTexts.push(text);

        });

        this.help = this.add.text(
            0,
            (panelHeight / 2) - 35,
            "↑ ↓ Move    ENTER Open    ESC Back",
            {
                fontFamily: "monospace",
                fontSize: "16px",
                color: "#666"
            }
        ).setOrigin(0.5);

        this.panel.body.add(this.help);

        this.refreshMenu();

        this.cursors = this.input.keyboard.createCursorKeys();

        this.enterKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ENTER
        );

        this.escapeKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ESC
        );

    }

    refreshMenu() {

        this.bookTexts.forEach((text, index) => {

            const prefix = index === this.selection ? "► " : "  ";

            text.setText(prefix + library[index].title);

        });

    }

    update() {

        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {

            this.selection =
                (this.selection + library.length - 1) % library.length;

            this.refreshMenu();

        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {

            this.selection =
                (this.selection + 1) % library.length;

            this.refreshMenu();

        }

        if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {

            this.scene.pause();

            this.scene.launch("DocumentViewer", {
                document: library[this.selection]
            });

            this.scene.bringToTop("DocumentViewer");

        }

        if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {

            this.scene.stop();

            this.scene.resume("Library");

        }

    }

}
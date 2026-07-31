import Phaser from "phaser";
import Panel from "../ui/Panel";
import library from "../data/library";
import ContentType from "../data/contentTypes";

// A book's cover color hints at what kind of content it holds.
const BOOK_COLORS = {
    [ContentType.PDF]: 0x8b3a3a,
    [ContentType.TEXT]: 0x3a5f8b,
    [ContentType.GALLERY]: 0x3a8b55,
    [ContentType.IMAGE]: 0x3a8b55,
    [ContentType.VIDEO]: 0x8b3a6a,
    [ContentType.LINK]: 0x6a3a8b,
    [ContentType.CONTACT]: 0x8b6a3a
};
const DEFAULT_BOOK_COLOR = 0x555555;

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
        const panelWidth = 500;
        const rowHeight = 40;
        const panelHeight = 150 + library.length * rowHeight + 60;
        const firstItemY = -(panelHeight / 2) + 90;

        this.panel = new Panel(
            this,
            width / 2,
            height / 2,
            panelWidth,
            panelHeight
        );

        this.panel.setTitle("Library Shelf");

        const bookX = -(panelWidth / 2) + 64;
        const titleX = bookX + 30;
        const arrowX = bookX - 22;

        this.rows = library.map((item, index) => {

            const rowY = firstItemY + (index * rowHeight);

            const highlight = this.add.rectangle(
                0,
                rowY,
                panelWidth - 60,
                rowHeight - 6,
                0xffffff,
                0
            );

            const book = this.createBook(bookX, rowY, item.type);

            const arrow = this.add.text(
                arrowX,
                rowY,
                "►",
                {
                    fontFamily: "monospace",
                    fontSize: "18px",
                    color: "#333"
                }
            ).setOrigin(0.5).setAlpha(0);

            const title = this.add.text(
                titleX,
                rowY,
                item.title,
                {
                    fontFamily: "monospace",
                    fontSize: "18px",
                    color: "#333"
                }
            ).setOrigin(0, 0.5);

            this.panel.body.add([highlight, book, arrow, title]);

            return { highlight, book, arrow, title, baseX: bookX };

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

    // Small pixel-art book: a cover, a darker spine edge, and a sliver of
    // pages, tinted by content type so the shelf reads as a real bookshelf.
    createBook(x, y, type) {

        const width = 26;
        const height = 32;
        const color = BOOK_COLORS[type] ?? DEFAULT_BOOK_COLOR;
        const spineColor = Phaser.Display.Color.ValueToColor(color).darken(30).color;

        const container = this.add.container(x, y);

        const cover = this.add.rectangle(0, 0, width, height, color)
            .setStrokeStyle(1, spineColor);

        const spine = this.add.rectangle(-(width / 2) + 3, 0, 4, height - 4, spineColor);

        const pages = this.add.rectangle((width / 2) - 3, 0, 3, height - 6, 0xf5ecd8);

        container.add([cover, spine, pages]);

        return container;

    }

    refreshMenu() {

        this.rows.forEach((row, index) => {

            const isSelected = index === this.selection;

            row.highlight.setFillStyle(0xffffff, isSelected ? 0.15 : 0);
            row.arrow.setAlpha(isSelected ? 1 : 0);
            row.title.setColor(isSelected ? "#000000" : "#333333");
            row.book.setScale(isSelected ? 1.1 : 1);
            row.book.x = row.baseX + (isSelected ? 4 : 0);

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

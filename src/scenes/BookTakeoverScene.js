import AdventureScene, { createPlaceholderTexture } from "../adventure/AdventureScene";
import ContentType from "../data/contentTypes";

// Takeover level — the deepest of the three (Room -> Close-up -> Takeover).
// Reused for every book on the shelf; which document it shows comes in via
// init(data). No real "open book" art yet, so the frame below is a
// generated placeholder (parchment pages + a spine shadow down the
// middle), same reasoning as BookshelfCloseupScene.
const NATIVE_WIDTH = 1600;
const NATIVE_HEIGHT = 900;
const BACKDROP_KEY = "book-takeover-bg";
const PAGE_INSET = 60;

export default class BookTakeoverScene extends AdventureScene {

    constructor() {
        super("BookTakeover");
    }

    init(data = {}) {

        super.init(data);

        this.document = data.document;

    }

    buildScene() {

        this.backSceneKey = "BookshelfCloseup";

        createPlaceholderTexture(this, BACKDROP_KEY, NATIVE_WIDTH, NATIVE_HEIGHT, (g, w, h) => {

            g.fillStyle(0x3d2817, 1);
            g.fillRect(0, 0, w, h);

            g.fillStyle(0xf5ecd8, 1);
            g.fillRect(PAGE_INSET, PAGE_INSET, w - (PAGE_INSET * 2), h - (PAGE_INSET * 2));

            g.fillStyle(0x000000, 0.15);
            g.fillRect((w / 2) - 10, PAGE_INSET, 20, h - (PAGE_INSET * 2));

        });

        this.setBackdrop(BACKDROP_KEY, NATIVE_WIDTH, NATIVE_HEIGHT);

        const { left, top, dispW, dispH } = this.backdropMetrics;

        this.contentCenterX = left + (dispW / 2);
        this.contentTop = top + (dispH * 0.16);
        this.contentWidth = dispW * 0.7;

        this.add.text(this.contentCenterX, this.contentTop, this.document.title, {
            fontFamily: "monospace",
            fontSize: "26px",
            color: "#2a1c10",
            align: "center",
            wordWrap: { width: this.contentWidth }
        }).setOrigin(0.5, 0).setDepth(1);

        this.renderBody();

        this.bar.setText(`Reading: ${this.document.title}`);

    }

    renderBody() {

        switch (this.document.type) {

            case ContentType.PDF:
                this.renderPdfButton();
                break;

            case ContentType.TEXT:
            case ContentType.CONTACT:
                this.renderText(this.document.content);
                break;

            case ContentType.GALLERY:
                this.renderText(`${this.document.title} coming soon.\n\nFolder: ${this.document.folder}`);
                break;

            default:
                this.renderText("Content coming soon.");

        }

    }

    renderText(content) {

        this.add.text(this.contentCenterX, this.contentTop + 70, content || "", {
            fontFamily: "monospace",
            fontSize: "15px",
            color: "#3a2c1c",
            align: "left",
            wordWrap: { width: this.contentWidth }
        }).setOrigin(0.5, 0).setDepth(1);

    }

    // A clickable "Open" hitbox for the PDF button, same hover-verb/cursor
    // language as every other interactable region in this system, rather
    // than a one-off styled button.
    renderPdfButton() {

        this.add.text(this.contentCenterX, this.contentTop + 70, "This document opens in a new browser tab.", {
            fontFamily: "monospace",
            fontSize: "15px",
            color: "#3a2c1c",
            align: "center",
            wordWrap: { width: this.contentWidth }
        }).setOrigin(0.5, 0).setDepth(1);

        // Anchored against the AdventureBar's own top edge (this.bar.top)
        // rather than a guessed fraction of the backdrop — the panel's
        // height follows the real art's aspect ratio now (see
        // AdventureBar.js), so a fixed fraction here would drift out of
        // sync with it (as this button did — it used to assume the panel
        // started at 0.667 of the canvas, before the panel was made
        // taller to stop stretching its art).
        const { left, top, dispW, dispH } = this.backdropMetrics;
        const buttonWidth = 220;
        const buttonHeight = 48;
        const marginAboveBar = 16;

        const bx = this.contentCenterX;
        const by = this.bar.top - marginAboveBar - (buttonHeight / 2);

        const button = this.add.rectangle(bx, by, buttonWidth, buttonHeight, 0x3f5f9f);
        button.setStrokeStyle(2, 0x2a3f6b);
        button.setDepth(1);

        this.add.text(bx, by, "Open PDF", {
            fontFamily: "monospace",
            fontSize: "17px",
            color: "#ffffff"
        }).setOrigin(0.5).setDepth(2);

        this.addHitbox({
            xRange: [((bx - (buttonWidth / 2)) - left) / dispW, ((bx + (buttonWidth / 2)) - left) / dispW],
            yRange: [((by - (buttonHeight / 2)) - top) / dispH, ((by + (buttonHeight / 2)) - top) / dispH],
            verb: "Open",
            onClick: () => this.openPdf()
        });

    }

    openPdf() {

        const url = `assets/documents/${this.document.id}/${this.document.file}`;

        window.open(url, "_blank", "noopener,noreferrer");

    }

}

import Phaser from "phaser";
import ContentType from "../data/contentTypes";

export default class DocumentViewerScene extends Phaser.Scene {

    constructor() {
        super("DocumentViewer");
    }

    init(data) {

        this.document = data.document;

    }

    create() {

        const { width, height } = this.scale;

        // This scene instance is reused across every library item the
        // visitor opens, so drop any listeners from a previous visit
        // before wiring up new ones.
        this.input.keyboard.removeAllListeners();

        // Dark overlay
        this.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x000000,
            0.65
        );

        // Window
        this.add.rectangle(
            width / 2,
            height / 2,
            700,
            500,
            0xf5f2e8
        ).setStrokeStyle(3, 0x444444);

        this.add.text(
            width / 2,
            90,
            this.document.title,
            {
                fontFamily: "monospace",
                fontSize: "28px",
                color: "#222"
            }
        ).setOrigin(0.5);

        this.renderBody();

        this.add.text(
            width / 2,
            height - 70,
            "ESC to Close",
            {
                fontFamily: "monospace",
                fontSize: "16px",
                color: "#666"
            }
        ).setOrigin(0.5);

        this.input.keyboard.once("keydown-ESC", () => {

            this.scene.stop();
            this.scene.resume("LibraryShelf");

        });

    }

    renderBody() {

        switch (this.document.type) {

            case ContentType.PDF:
                this.renderPdf();
                break;

            case ContentType.TEXT:
            case ContentType.CONTACT:
                this.renderText(this.document.content);
                break;

            case ContentType.GALLERY:
                this.renderText(
                    `Gallery coming soon.\n\nFolder: ${this.document.folder}`
                );
                break;

            case ContentType.LINK:
                this.renderOpenButton(this.document.url);
                break;

            default:
                this.renderText("Content coming soon.");

        }

    }

    renderText(content) {

        const { width } = this.scale;

        this.add.text(
            width / 2,
            170,
            content || "",
            {
                fontFamily: "monospace",
                fontSize: "16px",
                color: "#333",
                align: "left",
                wordWrap: { width: 600 }
            }
        ).setOrigin(0.5, 0);

    }

    renderPdf() {

        this.renderOpenButton(
            `assets/documents/${this.document.id}/${this.document.file}`
        );

    }

    renderOpenButton(url) {

        const { width } = this.scale;

        this.add.text(
            width / 2,
            180,
            "This document opens in a new browser tab.",
            {
                fontFamily: "monospace",
                fontSize: "16px",
                color: "#333",
                align: "center"
            }
        ).setOrigin(0.5);

        const button = this.add.text(
            width / 2,
            230,
            "[ Press ENTER to open ]",
            {
                fontFamily: "monospace",
                fontSize: "18px",
                color: "#3f5f9f"
            }
        ).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const open = () => this.openInNewTab(url);

        button.on("pointerdown", open);

        this.input.keyboard.on("keydown-ENTER", open);

    }

    openInNewTab(url) {

        window.open(url, "_blank", "noopener,noreferrer");

    }

}
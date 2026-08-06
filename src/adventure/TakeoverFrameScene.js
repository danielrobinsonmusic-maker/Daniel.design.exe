import AdventureScene, { createPlaceholderTexture } from "./AdventureScene";
import ContentType from "../data/contentTypes";
import { TAKEOVER_FRAMES } from "./takeoverFrames";

// The one full-screen "content display" level every building's Room/
// Close-up scenes fade into — replaces what used to be a separate
// one-off Takeover scene per building (BookTakeoverScene, MovieTakeoverScene,
// WorkshopViewerTakeoverScene, GallerySlideshowTakeoverScene). Which frame
// (decorative border/context art) and which content (what renders inside
// it) show up come in via init(data):
//
//   this.fadeTo("TakeoverFrame", {
//       frameKey: "library-book",      // key into takeoverFrames.js
//       content: document,             // shape depends on content.type — see renderContent
//       backSceneKey: "BookshelfCloseup" // where ESC/goBack returns to — caller-specific,
//   });                                 // this scene has no fixed "home" of its own
//
// backSceneKey has to come in through data rather than being hardcoded
// here (unlike every other scene in this system) because this one scene
// now gets opened from four different places that each need to return
// somewhere different — Library books go back to the bookshelf close-up,
// but Theatre/Workshop/Gallery's all go straight back to their Room.
export default class TakeoverFrameScene extends AdventureScene {

    constructor() {
        super("TakeoverFrame");
    }

    init(data = {}) {

        super.init(data);

        this.frameKey = data.frameKey;
        this.content = data.content;

    }

    buildScene() {

        const frame = TAKEOVER_FRAMES[this.frameKey];

        this.backSceneKey = this.sceneData.backSceneKey;

        if (frame.generate) {
            createPlaceholderTexture(this, frame.textureKey, frame.nativeWidth, frame.nativeHeight, frame.generate);
        }

        this.setBackdrop(frame.textureKey, frame.nativeWidth, frame.nativeHeight);

        const { left, top, dispW, dispH } = this.backdropMetrics;
        const [x0, x1] = frame.contentArea.xRange;
        const [y0, y1] = frame.contentArea.yRange;

        // Everything content-rendering below positions itself against
        // this, never against the raw backdrop rect — that's the whole
        // point of contentArea being per-frame.
        this.contentBounds = {
            left: left + (x0 * dispW),
            right: left + (x1 * dispW),
            top: top + (y0 * dispH),
            bottom: top + (y1 * dispH),
            centerX: left + (((x0 + x1) / 2) * dispW),
            width: (x1 - x0) * dispW
        };

        if (this.content.title) {

            this.add.text(this.contentBounds.centerX, this.contentBounds.top, this.content.title, {
                fontFamily: "monospace",
                fontSize: "26px",
                color: "#2a1c10",
                align: "center",
                wordWrap: { width: this.contentBounds.width }
            }).setOrigin(0.5, 0).setDepth(1);

        }

        this.renderContent(frame);

        const label = this.content.title ? `: ${this.content.title}` : "";
        this.bar.setText(`${frame.barVerb}${label}`);

    }

    renderContent(frame) {

        switch (this.content.type) {

            case ContentType.PDF:
                this.renderPdfButton();
                break;

            case ContentType.TEXT:
            case ContentType.CONTACT:
            case ContentType.PLACEHOLDER:
                this.renderText(this.content.content);
                break;

            case ContentType.GALLERY:
                this.renderText(`${this.content.title} coming soon.\n\nFolder: ${this.content.folder}`);
                break;

            case ContentType.IMAGE:
                this.renderImage();
                break;

            default:
                this.renderText("Content coming soon.");

        }

    }

    // Body text sits just below the title (or at the content area's own
    // top if there wasn't one) — same relative offset every prior
    // one-off Takeover scene used.
    renderText(content) {

        const bodyTop = this.contentBounds.top + (this.content.title ? 70 : 0);

        this.add.text(this.contentBounds.centerX, bodyTop, content || "", {
            fontFamily: "monospace",
            fontSize: "15px",
            color: "#3a2c1c",
            align: "center",
            wordWrap: { width: this.contentBounds.width * 0.86 }
        }).setOrigin(0.5, 0).setDepth(1);

    }

    // Contain-fit within the content area (never stretched/cropped) —
    // same "measure, don't guess" fit convention setBackdrop itself uses.
    renderImage() {

        if (!this.textures.exists(this.content.textureKey)) {
            this.renderText("Image not found.");
            return;
        }

        const texture = this.textures.get(this.content.textureKey);
        const frame = texture.has("content") ? "content" : undefined;

        const image = this.add.image(this.contentBounds.centerX, (this.contentBounds.top + this.contentBounds.bottom) / 2, this.content.textureKey, frame);
        image.setDepth(1);

        const maxWidth = this.contentBounds.width;
        const maxHeight = this.contentBounds.bottom - this.contentBounds.top;
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height);

        image.setDisplaySize(image.width * scale, image.height * scale);

    }

    // A clickable "Open" hitbox for the PDF button, same hover-verb/cursor
    // language as every other interactable region in this system, rather
    // than a one-off styled button. Anchored against the AdventureBar's
    // own top edge (this.bar.top) rather than a guessed fraction of the
    // backdrop, since the panel's height follows the real art's aspect
    // ratio (see AdventureBar.js).
    renderPdfButton() {

        const bodyTop = this.contentBounds.top + (this.content.title ? 70 : 0);

        this.add.text(this.contentBounds.centerX, bodyTop, "This document opens in a new browser tab.", {
            fontFamily: "monospace",
            fontSize: "15px",
            color: "#3a2c1c",
            align: "center",
            wordWrap: { width: this.contentBounds.width * 0.86 }
        }).setOrigin(0.5, 0).setDepth(1);

        const buttonWidth = 220;
        const buttonHeight = 48;
        const marginAboveBar = 16;

        const bx = this.contentBounds.centerX;
        const by = this.bar.top - marginAboveBar - (buttonHeight / 2);

        const button = this.add.rectangle(bx, by, buttonWidth, buttonHeight, 0x3f5f9f);
        button.setStrokeStyle(2, 0x2a3f6b);
        button.setDepth(1);

        this.add.text(bx, by, "Open PDF", {
            fontFamily: "monospace",
            fontSize: "17px",
            color: "#ffffff"
        }).setOrigin(0.5).setDepth(2);

        const { left, top, dispW, dispH } = this.backdropMetrics;

        this.addHitbox({
            xRange: [((bx - (buttonWidth / 2)) - left) / dispW, ((bx + (buttonWidth / 2)) - left) / dispW],
            yRange: [((by - (buttonHeight / 2)) - top) / dispH, ((by + (buttonHeight / 2)) - top) / dispH],
            verb: "Open",
            onClick: () => this.openPdf()
        });

    }

    openPdf() {

        const url = `assets/documents/${this.content.id}/${this.content.file}`;

        window.open(url, "_blank", "noopener,noreferrer");

    }

}

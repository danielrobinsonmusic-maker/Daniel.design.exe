import Phaser from "phaser";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import AdventureScene, { createPlaceholderTexture } from "./AdventureScene";
import ContentType from "../data/contentTypes";
import { TAKEOVER_FRAMES } from "./takeoverFrames";
import AudioManager from "../managers/AudioManager";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Some GALLERY images (see renderGallery) are arbitrary uploaded files —
// photos, pixel-art sprites, whatever ends up in a documents folder — and
// several have a lot of transparent padding around the actual content,
// same "content sub-frame crop" problem CLAUDE.md documents for the game's
// curated illustrated assets (buildings, decor). Those get their crop rect
// hand-measured once via PIL and hardcoded in BootScene.js; that's not
// possible here since there's no way to know ahead of time what files get
// dropped into a documents folder, so this measures the real alpha bbox at
// runtime instead (once per image, then cached as a "content" sub-frame —
// every consumer of "content" sub-frames already checks
// texture.has("content") first, so nothing downstream needs to know
// whether a given image needed cropping or not). Skips registering a crop
// for images that are already tight (opaque photos, or PNGs with no real
// padding) — no benefit, and avoids an unnecessary extra frame.
const GALLERY_ALPHA_THRESHOLD = 10;
const GALLERY_CROP_STRIDE = 2; // sample every other pixel per axis — a 1-2px imprecision on the bbox edge doesn't matter for display sizing, and this roughly quarters scan time on large photos.

function ensureGalleryContentFrame(scene, key) {

    const texture = scene.textures.get(key);
    if (texture.has("content")) return;

    const source = texture.getSourceImage();
    const { width, height } = source;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, 0, 0);

    const { data } = ctx.getImageData(0, 0, width, height);

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    for (let y = 0; y < height; y += GALLERY_CROP_STRIDE) {
        for (let x = 0; x < width; x += GALLERY_CROP_STRIDE) {

            const alpha = data[(((y * width) + x) * 4) + 3];

            if (alpha > GALLERY_ALPHA_THRESHOLD) {
                found = true;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }

        }
    }

    if (!found) return;

    const cropW = Math.min((maxX - minX) + GALLERY_CROP_STRIDE, width - minX);
    const cropH = Math.min((maxY - minY) + GALLERY_CROP_STRIDE, height - minY);

    if (cropW >= width * 0.98 && cropH >= height * 0.98) return;

    texture.add("content", 0, minX, minY, cropW, cropH);

}

// No dialogue-panel.png bar on these screens (see usesBar() below) — just
// this small, secondary-styled reminder centered at the very bottom,
// matching AdventureBar's own ESC-hint styling so it reads as part of the
// same visual language even without the panel around it.
const ESC_HINT_TEXT = "Press ESC to go back.";
const ESC_HINT_FONT_SIZE = 14;
const ESC_HINT_COLOR = "#9a958a";
const ESC_HINT_BOTTOM_MARGIN = 18;

// Reserves room at the bottom of the screen for the ESC hint above, so
// the PDF button (the one piece of interactive content with a fixed
// position of its own) never sits on top of it.
const BUTTON_BOTTOM_MARGIN = 56;

// Gap between a YouTube embed's bottom edge and its caption text below —
// see renderYouTubeEmbed.
const YOUTUBE_CAPTION_GAP = 14;

// Library books that are PDFs render their actual pages onto the open-book
// art (see renderBookPdf) instead of the generic "Open PDF" button every
// other PDF content still uses (see renderPdfButton) — gated on frameKey
// specifically (isBookPdf, set in buildScene) rather than content.type
// alone, since a future PDF could in principle open through some other
// frame and should keep the plain button in that case.
const BOOK_PAGE_RENDER_SCALE = 3;
const BOOK_PAGE_GUTTER = 14;

// Shared prev/next arrow look — used both by the PDF book's page-spread
// navigation (createNavArrow calls from renderBookPdf) and the GALLERY
// viewer's single-image navigation (renderGallery), which is why these
// are named NAV_ARROW_* rather than BOOK_ARROW_*.
const NAV_ARROW_SIZE = 40;
const NAV_ARROW_HIT_SIZE = 64;
const NAV_ARROW_OFFSET = 46;
const NAV_ARROW_TEXTURE_KEY = "takeover-nav-arrow";

// A GALLERY content entry (see ContentType.GALLERY, e.g. the Workshop's
// blueprints viewer — src/data/workshopContent.js) shows one image at a
// time from content.files, shrunk to fit (never upscaled) within the
// frame's blank paper area, captioned underneath — the image+caption pair
// is centered as a single block, both horizontally and vertically, within
// a rect inset GALLERY_PADDING in from the content area's own edges (the
// content area is the paper's full measured bounds, not a safe margin —
// without this inset, a large image or a long filename's caption both run
// right up against the frame's decorative border). GALLERY_CAPTION_GAP is
// the space between the image's bottom edge and the caption above it;
// caption height is measured from the actual Text object (not guessed),
// so long filenames that wrap to two lines still get correctly reserved
// room instead of overflowing into the border.
const GALLERY_PADDING = 28;
const GALLERY_CAPTION_GAP = 14;

// A book page rendered at its natural book-spread size (see
// renderPdfPageIntoBox) is only a couple hundred pixels wide in this game's
// fixed 960x540 internal canvas — nowhere near enough resolution for dense
// document text to read clearly, no matter how high BOOK_PAGE_RENDER_SCALE
// goes, since Phaser still has to downscale into that small a box. Clicking
// a page instead opens it full-size in a DOM <img> overlay (see
// openPageZoom) — a Phaser DOM Element, same escape hatch the YouTube
// embed uses (see renderYouTubeEmbed), which renders at the browser's own
// native resolution rather than being limited to the game's internal
// canvas size, so the text comes out exactly as crisp as the source PDF.
const BOOK_ZOOM_MAX_WIDTH_FRACTION = 0.92;
const BOOK_ZOOM_MAX_HEIGHT_FRACTION = 0.86;
const BOOK_ZOOM_BACKDROP_ALPHA = 0.85;
const BOOK_ZOOM_HINT_TEXT = "Click anywhere or press ESC to close";
const BOOK_ZOOM_HINT_BOTTOM_MARGIN = 22;

// One pdfjs loading task per document id, cached at module scope so
// re-opening the same book later in the session never re-fetches/re-parses
// the PDF — same "cache by id" convention this scene's own video playlist
// already uses (see playVideoPlaylist), just keyed against pdfjs objects
// instead of Phaser's own cache.
const pdfDocCache = {};

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

    // No idle prompt, no dialogue, no hover-verb menu on a content viewer
    // — the dialogue-panel.png bar would just be dead chrome here. See the
    // ESC hint text added directly in buildScene() instead.
    usesBar() {
        return false;
    }

    // While a page's zoom overlay is open (see openPageZoom), ESC closes
    // just that overlay instead of the usual "go back a level" — otherwise
    // it'd be too easy to accidentally back all the way out of the book
    // while trying to close a zoomed page.
    onEscape() {

        if (this.zoomOverlay) {
            this.closePageZoom();
            return true;
        }

        return false;

    }

    init(data = {}) {

        super.init(data);

        this.frameKey = data.frameKey;
        this.content = data.content;
        this.zoomOverlay = null;

    }

    buildScene() {

        const frame = TAKEOVER_FRAMES[this.frameKey];

        this.backSceneKey = this.sceneData.backSceneKey;

        // Every viewer (book, movie poster, Workshop viewer, Gallery
        // window) silences whatever's playing — background music/ambient,
        // any sfx — for as long as it's open, resuming automatically on
        // the way back out. Matters most for the music-projects viewer's
        // YouTube embed specifically, which has its own separate audio
        // that would otherwise play under the Town/Overlook tracks.
        AudioManager.pauseAll(this);
        this.events.once("shutdown", () => AudioManager.resumeAll());

        if (frame.generate) {
            createPlaceholderTexture(this, frame.textureKey, frame.nativeWidth, frame.nativeHeight, frame.generate);
        }

        this.isBookPdf = this.content.type === ContentType.PDF && this.frameKey === "library-book";

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

        // Skipped for a paginated book PDF — the rendered page images
        // already fill the content area edge to edge (see renderBookPdf),
        // so a floating title here would just overlap the top of the left
        // page rather than sit above it like it does for every other
        // content type.
        if (this.content.title && !this.isBookPdf) {

            this.add.text(this.contentBounds.centerX, this.contentBounds.top, this.content.title, {
                fontFamily: "monospace",
                fontSize: "26px",
                color: "#2a1c10",
                align: "center",
                wordWrap: { width: this.contentBounds.width }
            }).setOrigin(0.5, 0).setDepth(1);

        }

        this.renderContent(frame);
        this.addEscHint();

    }

    addEscHint() {

        const { width, height } = this.scale;

        this.add.text(width / 2, height - ESC_HINT_BOTTOM_MARGIN, ESC_HINT_TEXT, {
            fontFamily: "monospace",
            fontSize: `${ESC_HINT_FONT_SIZE}px`,
            color: ESC_HINT_COLOR
        }).setOrigin(0.5, 1).setDepth(5000);

    }

    renderContent(frame) {

        switch (this.content.type) {

            case ContentType.PDF:
                if (this.isBookPdf) {
                    this.renderBookPdf();
                } else {
                    this.renderPdfButton();
                }
                break;

            case ContentType.TEXT:
            case ContentType.CONTACT:
            case ContentType.PLACEHOLDER:
                this.renderText(this.content.content);
                break;

            case ContentType.GALLERY:
                this.renderGallery();
                break;

            case ContentType.IMAGE:
                this.renderImage();
                break;

            case ContentType.YOUTUBE_EMBED:
                this.renderYouTubeEmbed();
                break;

            case ContentType.VIDEO_PLAYLIST:
                this.renderVideoPlaylist();
                break;

            default:
                this.renderText("Content coming soon.");

        }

    }

    // Body text sits just below the title (or at the content area's own
    // top if there wasn't one) — same relative offset every prior
    // one-off Takeover scene used. `top` overrides that default entirely
    // (see renderYouTubeEmbed, which positions its caption relative to
    // the embed's own height rather than a fixed title-clearance offset).
    // Returns the Text object — renderVideoPlaylist uses this to remove
    // its own "Loading video..." message once playback actually starts.
    renderText(content, top) {

        const bodyTop = top !== undefined ? top : this.contentBounds.top + (this.content.title ? 70 : 0);

        return this.add.text(this.contentBounds.centerX, bodyTop, content || "", {
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

    // A real YouTube <iframe> (video or playlist) embedded via a Phaser
    // DOM Element (see game.js's dom.createContainer config) — spans the
    // content area's full measured width, height derived to keep a 16:9
    // aspect ratio rather than stretching to fill the area's own height,
    // anchored to the content area's top edge (not vertically centered —
    // setOrigin(0.5, 0), matching every other content renderer's own
    // top-anchored layout). The caption sits below it, positioned off the
    // embed's actual rendered height rather than a fixed offset, since
    // that height depends on the content area's width.
    renderYouTubeEmbed() {

        if (!this.content.embedUrl) {
            this.renderText("Video coming soon.");
            return;
        }

        const width = Math.round(this.contentBounds.width);
        const height = Math.round(width * 9 / 16);

        const iframe = document.createElement("iframe");
        iframe.width = width;
        iframe.height = height;
        iframe.src = this.content.embedUrl;
        iframe.title = this.content.title || "Music";
        iframe.frameBorder = "0";
        iframe.allowFullscreen = true;
        iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");

        this.add.dom(this.contentBounds.centerX, this.contentBounds.top, iframe)
            .setOrigin(0.5, 0)
            .setDepth(1);

        if (this.content.caption) {
            this.renderText(this.content.caption, this.contentBounds.top + height + YOUTUBE_CAPTION_GAP);
        }

    }

    // A local playlist (this.content.videos, an ordered array of file
    // paths) played back to back via one Phaser Video GameObject, looping
    // the whole set once the last clip finishes rather than stopping.
    // Loaded on demand here rather than up front in BootScene (these run
    // several MB each — see movies.js) — cached by content.id so
    // re-opening the same movie later in the same session skips straight
    // to playback instead of re-downloading. Contain-fit within the
    // content area (same "measure, don't guess" convention as
    // renderImage), sized/positioned below the title using the same
    // fixed offset renderText/renderPdfButton use for theirs.
    renderVideoPlaylist() {

        const sources = this.content.videos;

        if (!sources || !sources.length) {
            this.renderText("Video coming soon.");
            return;
        }

        const keys = sources.map((_, i) => `video-${this.content.id}-${i}`);
        const loadingText = this.renderText("Loading video...");

        const start = () => {
            loadingText.destroy();
            this.playVideoPlaylist(keys);
        };

        const alreadyCached = keys.every((key) => this.cache.video.exists(key));

        if (alreadyCached) {
            start();
            return;
        }

        keys.forEach((key, i) => {
            if (!this.cache.video.exists(key)) {
                this.load.video(key, sources[i]);
            }
        });

        this.load.once("complete", start);
        this.load.start();

    }

    playVideoPlaylist(keys) {

        const top = this.contentBounds.top + (this.content.title ? 70 : 0);
        const maxWidth = this.contentBounds.width;
        const maxHeight = this.contentBounds.bottom - top;
        const centerX = this.contentBounds.centerX;
        const centerY = top + (maxHeight / 2);

        const fitToContentArea = (vid) => {
            const scale = Math.min(maxWidth / vid.width, maxHeight / vid.height);
            vid.setDisplaySize(vid.width * scale, vid.height * scale);
        };

        const video = this.add.video(centerX, centerY, keys[0]);
        video.setDepth(1);
        video.on("created", (vid) => fitToContentArea(vid));

        let index = 0;

        // Wraps back to keys[0] once the last clip finishes — "loop, back
        // to back" over the whole set, not just looping a single clip.
        video.on("complete", () => {
            index = (index + 1) % keys.length;
            video.changeSource(keys[index], true, false);
        });

        video.play(false);

    }

    // Kicks off loading the PDF (from cache if this book's already been
    // opened this session — see loadPdfDocument), then renders the first
    // spread once it resolves. `cancelled` guards every step after an
    // await against the scene having been ESC'd out of mid-load — Phaser
    // doesn't abort in-flight promises on scene shutdown, so without this
    // a slow load finishing after the player has already backed out would
    // add page images to a scene nobody's looking at.
    async renderBookPdf() {

        this.pageObjects = [];
        this.spreadIndex = 0;
        this.renderToken = 0;
        this.cancelled = false;

        this.events.once("shutdown", () => { this.cancelled = true; });

        const loadingText = this.renderText("Loading book...");

        let pdfDoc;

        try {
            pdfDoc = await this.loadPdfDocument(this.content);
        } catch {
            if (!this.cancelled) loadingText.setText("Couldn't load this document.");
            return;
        }

        if (this.cancelled) return;

        loadingText.destroy();

        this.pdfDoc = pdfDoc;
        this.numPages = pdfDoc.numPages;

        this.prevArrow = this.createNavArrow("prev", () => this.turnPage(-1));
        this.nextArrow = this.createNavArrow("next", () => this.turnPage(1));

        this.renderBookSpread();

    }

    // One pdfjs loading task per document id, cached at module scope (see
    // pdfDocCache) — same relative URL scheme as openPdf() below.
    loadPdfDocument(content) {

        if (!pdfDocCache[content.id]) {
            const url = `assets/documents/${content.id}/${content.file}`;
            pdfDocCache[content.id] = pdfjsLib.getDocument({ url }).promise;
        }

        return pdfDocCache[content.id];

    }

    // Rebuilds the two page images for the current spread — called once
    // after the PDF first loads and again on every arrow click. Only the
    // page images themselves get torn down and rebuilt each time
    // (this.pageObjects); the arrow hitboxes/graphics are created once in
    // renderBookPdf and just toggled here via updateBookArrows, so
    // repeated page turns don't leak GameObjects.
    renderBookSpread() {

        this.pageObjects.forEach((obj) => obj.destroy());
        this.pageObjects = [];

        const token = ++this.renderToken;

        const { left, right, top, bottom, centerX } = this.contentBounds;

        const leftBox = { left, right: centerX - BOOK_PAGE_GUTTER, top, bottom };
        const rightBox = { left: centerX + BOOK_PAGE_GUTTER, right, top, bottom };

        const leftPageNum = (this.spreadIndex * 2) + 1;
        const rightPageNum = leftPageNum + 1;

        if (leftPageNum <= this.numPages) this.renderPdfPageIntoBox(leftPageNum, leftBox, token);
        if (rightPageNum <= this.numPages) this.renderPdfPageIntoBox(rightPageNum, rightBox, token);

        this.updateBookArrows();

    }

    // Renders one PDF page to an offscreen canvas via pdfjs and displays it
    // contain-fit within box (same fit math as renderImage) — cached by
    // page number so flipping back to an already-viewed spread is instant
    // instead of re-rendering. `token` guards against a stale render
    // finishing after the user has already turned to a different spread
    // (e.g. clicking Next twice in quick succession).
    async renderPdfPageIntoBox(pageNum, box, token) {

        const key = `pdf-page-${this.content.id}-${pageNum}`;

        if (!this.textures.exists(key)) {

            const page = await this.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: BOOK_PAGE_RENDER_SCALE });

            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

            if (this.cancelled) return;

            this.textures.addCanvas(key, canvas);

            // The game runs pixelArt:true (nearest-neighbor filtering
            // everywhere, for crisp sprite art), which makes a downscaled
            // photo/document texture look blockier than it needs to —
            // override it back to smooth filtering for this one texture.
            // Doesn't fix the real readability problem on its own (this
            // page is still only a couple hundred pixels wide in-book —
            // see openPageZoom for the actual fix), but it's a free
            // improvement to the in-book thumbnail regardless.
            this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);

        }

        if (this.cancelled || token !== this.renderToken) return;

        const image = this.add.image((box.left + box.right) / 2, (box.top + box.bottom) / 2, key);
        image.setDepth(1);

        const scale = Math.min((box.right - box.left) / image.width, (box.bottom - box.top) / image.height);
        image.setDisplaySize(image.width * scale, image.height * scale);

        this.pageObjects.push(image);

        // Clicking the page opens it full-size — see BOOK_ZOOM_* comment
        // above and openPageZoom. clickSfx left as the generic default
        // (not sfx-page-turn, which is reserved for actually turning to a
        // different spread via the arrows below).
        const { left, top, dispW, dispH } = this.backdropMetrics;

        const hitZone = this.addHitbox({
            xRange: [(box.left - left) / dispW, (box.right - left) / dispW],
            yRange: [(box.top - top) / dispH, (box.bottom - top) / dispH],
            verb: "Zoom",
            onClick: () => this.openPageZoom(key)
        });

        // Swaps the cursor to the zoom icon on hover — BEFORE the page is
        // actually clicked, not after (see openPageZoom's own
        // setZooming(true) for the "while zoomed in" case) — so it reads
        // as "this can be zoomed into", the same role a magnifying-glass
        // cursor plays over a zoomable image on the web generally. The
        // pointerout guard matters once the overlay is open: clicking
        // spawns a full-screen backdrop on top of this same zone, and the
        // next pointer move fires this zone's pointerout as the backdrop
        // takes over hit-testing — without the `!this.zoomOverlay` check
        // that would incorrectly revert the cursor away from the zoom icon
        // while still legitimately zoomed in.
        hitZone.on("pointerover", () => this.cursor.setZooming(true));
        hitZone.on("pointerout", () => {
            if (!this.zoomOverlay) this.cursor.setZooming(false);
        });

        this.pageObjects.push(hitZone);

    }

    // Full-size reading view for one page — a Phaser DOM Element (see
    // game.js's dom.createContainer config, the same mechanism the
    // Workshop's YouTube embed uses) rather than another Phaser Image, so
    // the page renders at the browser's own native resolution instead of
    // being boxed into this game's fixed 960x540 internal canvas. Reuses
    // the exact canvas already rendered for the in-book thumbnail (via
    // Texture.getSourceImage()) rather than re-rendering the PDF page at a
    // different resolution — that canvas is already high-res (see
    // BOOK_PAGE_RENDER_SCALE), just displayed too small in-book to read.
    openPageZoom(textureKey) {

        if (this.zoomOverlay) return;

        const canvas = this.textures.get(textureKey).getSourceImage();
        const { width, height } = this.scale;

        const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, BOOK_ZOOM_BACKDROP_ALPHA);
        backdrop.setDepth(9000);
        backdrop.setInteractive();
        backdrop.on("pointerdown", () => this.closePageZoom());

        const maxW = width * BOOK_ZOOM_MAX_WIDTH_FRACTION;
        const maxH = height * BOOK_ZOOM_MAX_HEIGHT_FRACTION;
        const scale = Math.min(maxW / canvas.width, maxH / canvas.height);

        const img = document.createElement("img");
        img.src = canvas.toDataURL();
        img.style.width = `${Math.round(canvas.width * scale)}px`;
        img.style.height = `${Math.round(canvas.height * scale)}px`;
        img.style.boxShadow = "0 12px 48px rgba(0,0,0,0.65)";
        // No CSS cursor override here (a plain DOM <img> would otherwise
        // show the real OS pointer over it, fighting with our own hidden-
        // OS-cursor + custom Cursor GameObject approach) — Cursor's zoom
        // icon (see setZooming below) already reads as "click to close/
        // zoom-out" without needing the browser's own icon.
        //
        const domImage = this.add.dom(width / 2, height / 2, img).setOrigin(0.5).setDepth(9001);

        // A DOM element sitting over the canvas otherwise swallows
        // mousemove/click before it ever reaches Phaser's input system,
        // which is what Cursor's pointermove listener depends on to keep
        // tracking the pointer — without this, our custom cursor freezes
        // in place the instant the mouse crosses onto the image. This has
        // to be set as the DOMElement's own `pointerEvents` property, not
        // img.style.pointerEvents directly — Phaser's DOM Element plugin
        // reapplies its own `pointerEvents` value (default "auto") to the
        // node's inline style on every render, which would silently
        // stomp a plain style write. Closing still works everywhere —
        // events pass through to the full-screen backdrop rectangle
        // below, a real Phaser GameObject, whose own pointerdown handles
        // it.
        domImage.pointerEvents = "none";

        const hint = this.add.text(width / 2, height - BOOK_ZOOM_HINT_BOTTOM_MARGIN, BOOK_ZOOM_HINT_TEXT, {
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#e8e2d5"
        }).setOrigin(0.5).setDepth(9002);

        this.zoomOverlay = { backdrop, domImage, hint };

        this.cursor.setZooming(true);

    }

    closePageZoom() {

        if (!this.zoomOverlay) return;

        this.zoomOverlay.backdrop.destroy();
        this.zoomOverlay.domImage.destroy();
        this.zoomOverlay.hint.destroy();

        this.cursor.setZooming(false);

        this.zoomOverlay = null;

    }

    // Creates a persistent prev/next hitbox+graphic just outside the
    // content area — shared by the PDF book's page-spread navigation (see
    // renderBookPdf) and the GALLERY viewer's single-image navigation (see
    // renderGallery). Created once per viewer and toggled via
    // setNavArrowActive rather than destroyed/recreated on every turn, so
    // repeated navigation doesn't leak GameObjects. `onTurn` is the
    // direction-specific callback (turnPage/turnGallery); clickSfx routes
    // through the same generic addHitbox override WorkshopScene's computer
    // hitbox uses (see AdventureScene.addHitbox), landing on the
    // sfx-page-turn sound the SFX spec called for but had no UI hook for
    // until now.
    createNavArrow(direction, onTurn) {

        const isNext = direction === "next";
        const { top, bottom, left: contentLeft, right: contentRight } = this.contentBounds;
        const y = (top + bottom) / 2;
        const x = isNext ? contentRight + NAV_ARROW_OFFSET : contentLeft - NAV_ARROW_OFFSET;

        createPlaceholderTexture(this, NAV_ARROW_TEXTURE_KEY, NAV_ARROW_SIZE, NAV_ARROW_SIZE, (g, w, h) => {
            g.fillStyle(0x2a1c10, 0.85);
            g.fillTriangle(w * 0.2, h * 0.12, w * 0.2, h * 0.88, w * 0.85, h * 0.5);
        });

        const image = this.add.image(x, y, NAV_ARROW_TEXTURE_KEY);
        image.setDisplaySize(NAV_ARROW_SIZE, NAV_ARROW_SIZE);
        image.setDepth(2);
        if (!isNext) image.setFlipX(true);

        const { left, top: frameTop, dispW, dispH } = this.backdropMetrics;
        const half = NAV_ARROW_HIT_SIZE / 2;

        const zone = this.addHitbox({
            xRange: [((x - half) - left) / dispW, ((x + half) - left) / dispW],
            yRange: [((y - half) - frameTop) / dispH, ((y + half) - frameTop) / dispH],
            verb: isNext ? "Next" : "Previous",
            clickSfx: "sfx-page-turn",
            onClick: onTurn
        });

        return { image, zone };

    }

    setNavArrowActive(arrow, active) {

        arrow.image.setVisible(active);

        if (active) {
            arrow.zone.setInteractive();
        } else {
            arrow.zone.disableInteractive();
        }

    }

    turnPage(delta) {
        this.spreadIndex += delta;
        this.renderBookSpread();
    }

    // Only shown/clickable when there's actually a spread in that
    // direction — a 1-2 page document never shows either arrow (it's
    // already fully visible in the one spread), matching the "arrow only
    // needed at 3+ pages" spec.
    updateBookArrows() {

        const hasPrev = this.spreadIndex > 0;
        const nextLeftPageNum = ((this.spreadIndex + 1) * 2) + 1;
        const hasNext = nextLeftPageNum <= this.numPages;

        this.setNavArrowActive(this.prevArrow, hasPrev);
        this.setNavArrowActive(this.nextArrow, hasNext);

    }

    // A folder of images (content.files — see workshopContent.js's
    // blueprints entry) shown one at a time, contain-fit to use as much of
    // the content area as possible, with its filename (minus extension)
    // captioned underneath — same prev/next arrow language as the PDF
    // book viewer, just a single running index instead of two-page
    // spreads. There's no way to list a folder's contents from a
    // static-hosted browser app, so content.files is a hand-authored,
    // pre-sorted list rather than something discovered at runtime (same
    // convention as every other content list in this project).
    renderGallery() {

        if (!this.content.files || !this.content.files.length) {
            this.renderText(`${this.content.title} coming soon.`);
            return;
        }

        this.galleryObjects = [];
        this.galleryLoadToken = 0;
        this.galleryLoadingText = null;
        this.galleryIndex = 0;
        this.galleryFiles = this.content.files;

        this.prevArrow = this.createNavArrow("prev", () => this.turnGallery(-1));
        this.nextArrow = this.createNavArrow("next", () => this.turnGallery(1));

        this.renderGalleryItem();

    }

    turnGallery(delta) {
        this.galleryIndex += delta;
        this.renderGalleryItem();
    }

    // Loads (or reuses an already-cached texture for) the current index's
    // image, same "check it loaded, degrade gracefully while a load is in
    // flight" shape as renderVideoPlaylist's loading text. `galleryLoadToken`
    // guards against a slow load resolving after the user has already
    // navigated further — same technique as the PDF book's `renderToken`.
    renderGalleryItem() {

        this.galleryObjects.forEach((obj) => obj.destroy());
        this.galleryObjects = [];

        if (this.galleryLoadingText) {
            this.galleryLoadingText.destroy();
            this.galleryLoadingText = null;
        }

        const token = ++this.galleryLoadToken;
        const filename = this.galleryFiles[this.galleryIndex];
        const key = `gallery-${this.content.id}-${filename}`;

        const show = () => {
            if (this.cancelled || token !== this.galleryLoadToken) return;
            this.displayGalleryItem(key, filename);
        };

        if (this.textures.exists(key)) {
            show();
            return;
        }

        this.galleryLoadingText = this.renderText("Loading...");

        this.load.image(key, `assets/${this.content.folder}/${encodeURIComponent(filename)}`);
        this.load.once("complete", () => {

            if (token === this.galleryLoadToken && this.galleryLoadingText) {
                this.galleryLoadingText.destroy();
                this.galleryLoadingText = null;
            }

            show();

        });
        this.load.start();

    }

    // Shrinks the image to fit (never upscales past native size — these
    // are arbitrary uploaded files, many small pixel-art sprites at their
    // own native resolution, and blowing one up to fill the available
    // space made it look far more pixelated than the source art actually
    // is) within a rect inset GALLERY_PADDING from the frame's blank-paper
    // content area, then centers the image+caption pair as a single block
    // — both axes — within that inset rect, so neither the image nor a
    // long filename's wrapped caption ever touches the frame's decorative
    // border.
    displayGalleryItem(key, filename) {

        ensureGalleryContentFrame(this, key);

        const texture = this.textures.get(key);

        // Same nearest-neighbor-vs-photo problem as the PDF book pages
        // (see renderPdfPageIntoBox) — the game runs pixelArt:true
        // (crisp for sprite art, blocky for downscaled photos/scans).
        texture.setFilter(Phaser.Textures.FilterMode.LINEAR);

        const frame = texture.has("content") ? "content" : undefined;

        const { left, right, top, bottom, centerX } = this.contentBounds;
        // Room for the content-level title text (see buildScene), for any
        // GALLERY entry that has one — blueprints currently doesn't (see
        // workshopContent.js), but this stays generic for any future
        // GALLERY content that does.
        const bodyTop = top + (this.content.title ? 70 : 0);
        const safeTop = bodyTop + GALLERY_PADDING;
        const safeBottom = bottom - GALLERY_PADDING;
        const maxWidth = (right - left) - (GALLERY_PADDING * 2);

        const title = filename.replace(/\.[^./\\]+$/, "");

        // Created first (off-screen position, repositioned below) purely
        // to measure its real rendered height — a fixed guess would
        // overflow into the border for any filename long enough to wrap
        // to two lines.
        const caption = this.add.text(centerX, 0, title, {
            fontFamily: "monospace",
            fontSize: "16px",
            color: "#3a2c1c",
            align: "center",
            wordWrap: { width: maxWidth }
        }).setOrigin(0.5, 0).setDepth(1);

        const maxImageHeight = (safeBottom - safeTop) - GALLERY_CAPTION_GAP - caption.height;

        const image = this.add.image(0, 0, key, frame);
        image.setDepth(1);

        const scale = Math.min(maxWidth / image.width, maxImageHeight / image.height, 1);
        const dispW = image.width * scale;
        const dispH = image.height * scale;
        image.setDisplaySize(dispW, dispH);

        const blockHeight = dispH + GALLERY_CAPTION_GAP + caption.height;
        const blockTop = safeTop + (((safeBottom - safeTop) - blockHeight) / 2);

        image.setPosition(centerX, blockTop + (dispH / 2));
        caption.setPosition(centerX, blockTop + dispH + GALLERY_CAPTION_GAP);

        this.galleryObjects.push(image, caption);

        this.updateGalleryArrows();

    }

    // Only shown/clickable when there's another image in that direction —
    // a single-image folder never shows either arrow, same "don't show
    // navigation with nowhere to go" principle as updateBookArrows.
    updateGalleryArrows() {

        const hasPrev = this.galleryIndex > 0;
        const hasNext = this.galleryIndex < this.galleryFiles.length - 1;

        this.setNavArrowActive(this.prevArrow, hasPrev);
        this.setNavArrowActive(this.nextArrow, hasNext);

    }

    // A clickable "Open" hitbox for the PDF button, same hover-verb/cursor
    // language as every other interactable region in this system, rather
    // than a one-off styled button. Anchored against the screen's own
    // bottom edge (there's no bar on this scene — see usesBar() — so
    // BUTTON_BOTTOM_MARGIN reserves the room the ESC hint text below it
    // needs instead of measuring against a panel that isn't there).
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

        const bx = this.contentBounds.centerX;
        const by = this.scale.height - BUTTON_BOTTOM_MARGIN - (buttonHeight / 2);

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

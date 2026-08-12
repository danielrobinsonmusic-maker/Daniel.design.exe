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

// Shared prev/next arrow look — used both by the PDF book's page-spread
// navigation (createNavArrow calls from renderBookPdf) and the GALLERY
// viewer's single-image navigation (renderGallery), which is why these
// are named NAV_ARROW_* rather than BOOK_ARROW_*.
const NAV_ARROW_SIZE = 40;
const NAV_ARROW_HIT_SIZE = 64;
const NAV_ARROW_OFFSET = 46;
const NAV_ARROW_TEXTURE_KEY = "takeover-nav-arrow";

// Prev/next arrows inside the full-resolution zoom overlay itself (see
// openGalleryPdfZoom) — screen-space positioned (the zoom overlay sits
// centered on-screen, not against contentBounds like the book/gallery
// arrows above), and light-colored rather than NAV_ARROW_TEXTURE_KEY's
// dark parchment-book brown, which would be nearly invisible against the
// near-black zoom backdrop.
const ZOOM_ARROW_MARGIN = 36;
const ZOOM_NAV_ARROW_TEXTURE_KEY = "takeover-zoom-nav-arrow";

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

// A VIDEO_GALLERY content entry (see ContentType.VIDEO_GALLERY, the
// Workshop's computer viewer — src/data/workshopContent.js) shows one
// looping video at a time from content.files, browsed via the same
// prev/next arrows as the image GALLERY and PDF book (createNavArrow),
// contain-fit to use as much of the frame's screen area as possible
// (upscaled if needed, unlike the image gallery — a small monitor-screen
// content area and already-compressed source clips make upscaling the
// common case here, not the exception). The filename appears over the
// video and fades out after a beat rather than sitting there
// permanently, so it doesn't stay in the way of the video itself.
const VIDEO_GALLERY_LABEL_HOLD_MS = 2200;
const VIDEO_GALLERY_LABEL_FADE_MS = 700;

// Every non-PDF book content type (plain text/placeholder body copy, the
// GALLERY "coming soon" fallback, and CARD_CAROUSEL's quote cards — see
// ContentType and library.js) shares this one "flow" layout whenever it's
// opened through the library-book frame (this.usesBookFlow, set in
// buildScene) — an optional bold header (+ thin divider), then body text,
// starting at the top of the LEFT page and continuing onto the top of the
// RIGHT page if it doesn't fit on the left alone, like reading an actual
// open book rather than one block centered across the whole spread. See
// getBookPageZones for the left/right page rects this measures against,
// and renderBookFlow/renderBookFlowScrollFallback for the two render
// paths. BOOK_GUTTER is the small central gap around the book's spine —
// used both here and by the PDF page renderer (renderBookSpread), so
// every book content type splits the spread at the exact same point.
//
// Falling back to scrolling (see renderBookFlowScrollFallback) is meant
// to be rare now that content has a full two-page spread instead of one
// page-width column to fit in — it only triggers when body text doesn't
// fit even after filling both pages, at which point it's shown as one
// wide scrollable block spanning the gutter, with its own up/down arrows
// mirroring AdventureBar's dialogue-panel scroll (createScrollArrow/
// scrollBy/applyScroll there) — reimplemented rather than shared code,
// since it's a different class/coordinate system. BOOK_FLOW_SCROLL_ARROW_
// GUTTER is reserved on the right of the wrap width in that fallback
// whether or not the arrows are actually visible, same reasoning as
// AdventureBar's own ARROW_GUTTER_FRACTION: keeps text from reflowing
// when the arrows appear/disappear.
const BOOK_GUTTER = 14;
const BOOK_FLOW_PADDING = 28;
const BOOK_FLOW_HEADER_GAP = 10;
const BOOK_FLOW_DIVIDER_GAP = 12;
const BOOK_FLOW_SOURCE_GAP = 16;
const BOOK_FLOW_SCROLL_ARROW_GUTTER = 36;
const BOOK_FLOW_SCROLL_STEP_FRACTION = 0.55;
const BOOK_HEADER_COLOR = "#5a3a1a";
const BOOK_BODY_COLOR = "#2a1c10";
const BOOK_SOURCE_COLOR = "#5a4a3a";
const BOOK_DIVIDER_COLOR = 0xcbb896;

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

    // A page's zoom overlay (see openPageZoom) is the innermost level, so
    // it closes first. For a PDF_GALLERY document specifically, its zoom
    // IS the reading view (paging happens via its own arrows — see
    // openGalleryPdfZoom), not a detour from an otherwise-browsable book
    // spread the way Resume's zoom is — so closing it goes straight back
    // to the gallery of previews in this same ESC press (closeZoomOrReturn
    // below), rather than stopping at the single static page-1 book view
    // first. Only once neither the zoom nor the full-document view is
    // open does ESC fall through to the usual "go back a level".
    onEscape() {

        if (this.zoomOverlay) {
            this.closeZoomOrReturn();
            return true;
        }

        if (this.pdfGalleryFullViewActive) {
            this.closeFullPdf();
            return true;
        }

        return false;

    }

    init(data = {}) {

        super.init(data);

        this.frameKey = data.frameKey;
        this.content = data.content;
        this.zoomOverlay = null;
        this.bookFlowObjects = [];
        this.pdfGalleryFullViewActive = false;

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

        // Every other book content type flows its own header/body (see
        // renderBookFlow) starting at the top of the left page instead of
        // using the generic spread-spanning title below — set here rather
        // than inline in that title check so renderContent's own
        // TEXT/PLACEHOLDER/GALLERY/CARD_CAROUSEL branches can check it too.
        this.usesBookFlow = this.frameKey === "library-book" && !this.isBookPdf;

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

        // Skipped for a paginated book PDF (the rendered page images
        // already fill the content area edge to edge — see renderBookPdf)
        // and for anything using the new book-flow layout (its header is
        // part of the left-page flow instead — see renderBookFlow).
        if (this.content.title && !this.isBookPdf && !this.usesBookFlow) {

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
                if (this.usesBookFlow) {
                    this.renderBookFlow({ header: this.content.title, body: this.content.content });
                } else {
                    this.renderText(this.content.content);
                }
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

            case ContentType.VIDEO_GALLERY:
                this.renderVideoGallery();
                break;

            case ContentType.CARD_CAROUSEL:
                this.renderCardCarousel();
                break;

            case ContentType.PDF_GALLERY:
                this.renderPdfGallery();
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

        // Reads the native <video> element's own videoWidth/videoHeight
        // (not vid.width/vid.height, which only reflect the FIRST clip —
        // see below) so this re-fits correctly for every clip in the
        // playlist, not just the first. Contain-fits either way: a
        // vertical/portrait clip (e.g. a phone-shot video, much taller
        // than wide) naturally ends up narrower than maxWidth and centers
        // itself in the leftover horizontal space, no separate
        // portrait-vs-landscape branch needed.
        const fitToContentArea = () => {
            const vw = video.video.videoWidth;
            const vh = video.video.videoHeight;
            if (!vw || !vh) return;
            const scale = Math.min(maxWidth / vw, maxHeight / vh);
            video.setDisplaySize(vw * scale, vh * scale);
        };

        const video = this.add.video(centerX, centerY, keys[0]);
        video.setDepth(1);

        // Needs BOTH listeners, not just one — confirmed empirically
        // (a portrait-video playlist where the two clips aren't quite the
        // same resolution exposed this):
        //  - Phaser's own "created" (VIDEO_CREATED) fires exactly once,
        //    for the very first clip only (it reuses the same underlying
        //    <video> element across changeSource() calls, so the internal
        //    newVideo check never re-triggers) — but it's the one that
        //    fires AFTER Phaser's own setSizeToFrame() call resets the
        //    game object back to the video's native pixel size, so it's
        //    needed to re-apply our own fit for clip 1.
        //  - The native "loadedmetadata" DOM event fires again on every
        //    later changeSource(), which "created" does not — needed to
        //    fit clip 2 onward. It fires BEFORE Phaser's own reset on
        //    clip 1 though, so it alone isn't enough for clip 1 (its fit
        //    gets clobbered moments later by that reset).
        // Together they cover every clip correctly regardless of how many
        // share a resolution.
        video.on("created", fitToContentArea);
        video.video.addEventListener("loadedmetadata", fitToContentArea);

        let index = 0;

        // Wraps back to keys[0] once the last clip finishes — "loop, back
        // to back" over the whole set, not just looping a single clip.
        // changeSource() is a silent no-op when asked to reload whatever
        // key is already loaded (checked internally: `if (this.cacheKey
        // !== key)`) — for a single-video "playlist" (e.g. this content
        // type's only other current use, netflix-moments) that means
        // wrapping from keys[0] back to keys[0] would otherwise do
        // nothing, leaving the video paused dead on its last frame
        // forever instead of looping. Restart in place instead whenever
        // the "next" clip is the one already loaded.
        video.on("complete", () => {
            index = (index + 1) % keys.length;
            const nextKey = keys[index];
            if (video.getVideoKey() === nextKey) {
                video.setCurrentTime(0);
                video.play(false);
            } else {
                video.changeSource(nextKey, true, false);
            }
        });

        video.play(false);

    }

    // One video at a time from content.files, navigated via the shared
    // prev/next arrows (see createNavArrow) rather than autoplayed back to
    // back like renderVideoPlaylist above. Arrows are created once here;
    // renderVideoGalleryItem (called for the first video and again on
    // every arrow click) handles loading/swapping the actual video.
    renderVideoGallery() {

        if (!this.content.files || !this.content.files.length) {
            this.renderText("Video coming soon.");
            return;
        }

        this.videoGalleryObjects = [];
        this.videoGalleryLoadToken = 0;
        this.videoGalleryLoadingText = null;
        this.videoGalleryIndex = 0;
        this.videoGalleryFiles = this.content.files;

        this.prevArrow = this.createNavArrow("prev", () => this.turnVideoGallery(-1));
        this.nextArrow = this.createNavArrow("next", () => this.turnVideoGallery(1));

        this.renderVideoGalleryItem();

    }

    turnVideoGallery(delta) {
        this.videoGalleryIndex += delta;
        this.renderVideoGalleryItem();
    }

    // Loads (or reuses an already-cached video for) the current index and
    // plays it looping, contain-fit to the frame's content area — same
    // load-token guard against a slow load resolving after the user has
    // already navigated further as the PDF book/image gallery use.
    renderVideoGalleryItem() {

        this.videoGalleryObjects.forEach((obj) => obj.destroy());
        this.videoGalleryObjects = [];

        if (this.videoGalleryLoadingText) {
            this.videoGalleryLoadingText.destroy();
            this.videoGalleryLoadingText = null;
        }

        const token = ++this.videoGalleryLoadToken;
        const filename = this.videoGalleryFiles[this.videoGalleryIndex];
        const key = `video-gallery-${this.content.id}-${filename}`;

        const show = () => {
            if (this.cancelled || token !== this.videoGalleryLoadToken) return;
            this.displayVideoGalleryItem(key, filename);
        };

        if (this.cache.video.exists(key)) {
            show();
            return;
        }

        this.videoGalleryLoadingText = this.renderText("Loading video...");

        const url = `assets/${this.content.folder}/${encodeURIComponent(filename)}`;

        // Phaser's video loader picks a playable format by checking the
        // URL's extension against a fixed whitelist (mp4/m4v/ogg/webm/
        // vp9/hls) — ".mov" isn't in it, so a bare URL string here throws
        // (getVideoURL returns null, and the loader crashes reading
        // .type off it) even though these are our own H.264/AAC-encoded
        // files (see the earlier ffmpeg compression pass) that the browser
        // plays just fine. The {url, type} array form lets the actual
        // codec type be declared explicitly instead of sniffed from the
        // extension.
        this.load.video(key, /\.mov$/i.test(filename) ? [{ url, type: "mp4" }] : url);
        this.load.once("complete", () => {

            if (token === this.videoGalleryLoadToken && this.videoGalleryLoadingText) {
                this.videoGalleryLoadingText.destroy();
                this.videoGalleryLoadingText = null;
            }

            show();

        });
        this.load.start();

    }

    // Contain-fit to use as much of the content area as possible (upscaled
    // if needed — unlike the image gallery's deliberate no-upscale cap,
    // see GALLERY_PADDING's comment, these clips are meant to fill the
    // monitor screen regardless of their own native size). The filename
    // appears centered over the video and fades out after a beat (see
    // VIDEO_GALLERY_LABEL_*) rather than sitting there permanently.
    displayVideoGalleryItem(key, filename) {

        const { left, right, top, bottom, centerX } = this.contentBounds;
        const maxWidth = right - left;
        const maxHeight = bottom - top;
        const centerY = top + (maxHeight / 2);

        const video = this.add.video(centerX, centerY, key);
        video.setDepth(1);
        video.on("created", (vid) => {
            const scale = Math.min(maxWidth / vid.width, maxHeight / vid.height);
            vid.setDisplaySize(vid.width * scale, vid.height * scale);
        });
        video.setLoop(true);
        video.play(false);

        this.videoGalleryObjects.push(video);

        const title = filename.replace(/\.[^./\\]+$/, "").replace(/_/g, " ").trim();

        const label = this.add.text(centerX, centerY, title, {
            fontFamily: "monospace",
            fontSize: "20px",
            fontStyle: "bold",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 4,
            align: "center",
            wordWrap: { width: maxWidth * 0.86 }
        }).setOrigin(0.5).setDepth(2);

        this.tweens.add({
            targets: label,
            alpha: 0,
            delay: VIDEO_GALLERY_LABEL_HOLD_MS,
            duration: VIDEO_GALLERY_LABEL_FADE_MS,
            ease: "Sine.easeIn"
        });

        this.videoGalleryObjects.push(label);

        this.updateVideoGalleryArrows();

    }

    updateVideoGalleryArrows() {

        const hasPrev = this.videoGalleryIndex > 0;
        const hasNext = this.videoGalleryIndex < this.videoGalleryFiles.length - 1;

        this.setNavArrowActive(this.prevArrow, hasPrev);
        this.setNavArrowActive(this.nextArrow, hasNext);

    }

    // One item at a time from content.items, browsed via the shared
    // prev/next arrows (createNavArrow) — created once here. Each item is
    // either a quote card ({ type: "card", feature, quote, source }),
    // rendered through the same renderBookFlow every other book content
    // type uses (see the BOOK_FLOW_* class comment), or a single image
    // ({ type: "image", file }), rendered through renderCarouselImage —
    // see renderCardItem's dispatch. Mixing the two is what "News and
    // Featured Work" (library.js) actually does; a books-only entry would
    // just never include an "image" item.
    renderCardCarousel() {

        if (!this.content.items || !this.content.items.length) {
            this.renderText("Coming soon.");
            return;
        }

        this.cardIndex = 0;
        this.cardsData = this.content.items;
        this.carouselLoadToken = 0;

        this.prevArrow = this.createNavArrow("prev", () => this.turnCard(-1));
        this.nextArrow = this.createNavArrow("next", () => this.turnCard(1));

        this.renderCardItem();

    }

    turnCard(delta) {
        this.cardIndex += delta;
        this.renderCardItem();
    }

    renderCardItem() {

        const item = this.cardsData[this.cardIndex];

        if (item.type === "image") {
            this.renderCarouselImage(item);
        } else {
            this.renderBookFlow({ header: item.feature, body: item.quote, source: item.source });
        }

        this.updateCardArrows();

    }

    updateCardArrows() {

        const hasPrev = this.cardIndex > 0;
        const hasNext = this.cardIndex < this.cardsData.length - 1;

        this.setNavArrowActive(this.prevArrow, hasPrev);
        this.setNavArrowActive(this.nextArrow, hasNext);

    }

    // A single image occupying just one page (the left page's own zone —
    // see getBookPageZones — matching how a short text card naturally
    // lands there too, rather than spanning the spread), centered both
    // ways within it. Loaded on demand, same "check it's cached, show a
    // loading message otherwise" shape as renderGalleryItem;
    // `carouselLoadToken` guards a slow load against the user having
    // already navigated to a different item (of either type) by the time
    // it resolves — same technique as every other lazy-loaded viewer here.
    renderCarouselImage(item) {

        this.bookFlowObjects.forEach((obj) => obj.destroy());
        this.bookFlowObjects = [];

        const token = ++this.carouselLoadToken;
        const key = `carousel-image-${this.content.id}-${item.file}`;

        const show = () => {
            if (this.cancelled || token !== this.carouselLoadToken) return;
            this.displayCarouselImage(key);
        };

        if (this.textures.exists(key)) {
            show();
            return;
        }

        const loadingText = this.renderText("Loading...");
        this.bookFlowObjects.push(loadingText);

        this.load.image(key, `assets/${this.content.folder}/${encodeURIComponent(item.file)}`);
        this.load.once("complete", () => {

            if (token === this.carouselLoadToken) {
                loadingText.destroy();
                this.bookFlowObjects = this.bookFlowObjects.filter((obj) => obj !== loadingText);
            }

            show();

        });
        this.load.start();

    }

    displayCarouselImage(key) {

        ensureGalleryContentFrame(this, key);

        const texture = this.textures.get(key);
        texture.setFilter(Phaser.Textures.FilterMode.LINEAR);

        const frame = texture.has("content") ? "content" : undefined;

        const { left: page } = this.getBookPageZones();
        const pad = BOOK_FLOW_PADDING;

        const safeLeft = page.left + pad;
        const safeRight = page.right - pad;
        const safeTop = page.top + pad;
        const safeBottom = page.bottom - pad;

        const maxWidth = safeRight - safeLeft;
        const maxHeight = safeBottom - safeTop;
        const centerX = (safeLeft + safeRight) / 2;
        const centerY = (safeTop + safeBottom) / 2;

        const image = this.add.image(centerX, centerY, key, frame);
        image.setDepth(1);

        const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
        const dispW = image.width * scale;
        const dispH = image.height * scale;
        image.setDisplaySize(dispW, dispH);

        this.bookFlowObjects.push(image);

        // Clicking opens it full-size — same click-to-zoom mechanism
        // (magnifying-glass cursor on hover, DOM-overlay zoom on click) a
        // resume page's own hitbox uses (renderPdfPageIntoBox/
        // openPageZoom), reused as-is here.
        const { left: bLeft, top: bTop, dispW: bDispW, dispH: bDispH } = this.backdropMetrics;
        const imgLeft = centerX - (dispW / 2);
        const imgTop = centerY - (dispH / 2);

        const hitZone = this.addHitbox({
            xRange: [(imgLeft - bLeft) / bDispW, ((imgLeft + dispW) - bLeft) / bDispW],
            yRange: [(imgTop - bTop) / bDispH, ((imgTop + dispH) - bTop) / bDispH],
            verb: "Zoom",
            onClick: () => this.openPageZoom(key)
        });

        // Same pointerout guard as renderPdfPageIntoBox's own hitbox —
        // the zoom overlay's backdrop covers this same zone once open, so
        // the next pointer move fires a stray pointerout that would
        // otherwise incorrectly revert the cursor away from the zoom icon
        // while still legitimately zoomed in.
        hitZone.on("pointerover", () => this.cursor.setZooming(true));
        hitZone.on("pointerout", () => {
            if (!this.zoomOverlay) this.cursor.setZooming(false);
        });

        this.bookFlowObjects.push(hitZone);

    }

    // Shared layout for every non-PDF book content type (see the
    // BOOK_FLOW_* class comment) — an optional bold header (+ divider),
    // then body text, starting at the top of the left page and flowing
    // onto the top of the right page if it doesn't fit on the left alone.
    // `source`, if given (quote cards only), is right-aligned at the
    // bottom of whichever page the body ends up landing on, like a byline
    // — distinct from renderBookFlowScrollFallback's own copy of it,
    // which instead sits inline after the body since there's only one
    // wide column there.
    //
    // Measures by actually building the body Text object at the left
    // page's wrap width first and reading its real wrapped-line count
    // (Text.getWrappedText) rather than estimating from character count —
    // exact regardless of font/kerning. If even a full left+right spread
    // can't fit it all (rare, given a full spread's worth of room now
    // instead of one column — see renderBookFlowScrollFallback), that
    // method takes over entirely instead.
    renderBookFlow({ header, body, source }) {

        this.bookFlowObjects.forEach((obj) => obj.destroy());
        this.bookFlowObjects = [];

        const zones = this.getBookPageZones();
        const pad = BOOK_FLOW_PADDING;

        const leftInner = {
            left: zones.left.left + pad,
            right: zones.left.right - pad,
            top: zones.left.top + pad,
            bottom: zones.left.bottom - pad
        };
        const rightInner = {
            left: zones.right.left + pad,
            right: zones.right.right - pad,
            top: zones.right.top + pad,
            bottom: zones.right.bottom - pad
        };

        const wrapWidth = leftInner.right - leftInner.left;
        const leftCenterX = (leftInner.left + leftInner.right) / 2;
        const rightCenterX = (rightInner.left + rightInner.right) / 2;

        let cursorY = leftInner.top;

        if (header) {

            const headerText = this.add.text(leftCenterX, cursorY, header, {
                fontFamily: "monospace",
                fontSize: "20px",
                fontStyle: "bold",
                color: BOOK_HEADER_COLOR,
                align: "center",
                wordWrap: { width: wrapWidth }
            }).setOrigin(0.5, 0);
            cursorY += headerText.height + BOOK_FLOW_HEADER_GAP;

            const divider = this.add.rectangle(leftCenterX, cursorY, wrapWidth * 0.5, 2, BOOK_DIVIDER_COLOR);
            cursorY += BOOK_FLOW_DIVIDER_GAP;

            this.bookFlowObjects.push(headerText, divider);

        }

        const leftBodyAvailable = leftInner.bottom - cursorY;
        const rightBodyAvailable = rightInner.bottom - rightInner.top;

        const bodyStyle = {
            fontFamily: "monospace",
            fontSize: "16px",
            fontStyle: source ? "italic" : "normal",
            color: BOOK_BODY_COLOR,
            align: "center",
            wordWrap: { width: wrapWidth },
            lineSpacing: 4
        };

        // Probes real rendered heights via repeated setText()+.height
        // reads rather than estimating from an average line height
        // (lines.length / totalHeight) — different browsers/OSes can
        // substitute a different actual font for the generic "monospace"
        // family, which shifts exact wrapped line counts just enough to
        // matter right at a page boundary. Starts at the full line count
        // (the common case — everything fits on the left alone — exits
        // after a single check) and backs off one line at a time until
        // it fits.
        const probe = this.add.text(leftCenterX, cursorY, body, bodyStyle).setOrigin(0.5, 0);
        const lines = probe.getWrappedText(body);

        let leftLineCount = lines.length;
        probe.setText(lines.slice(0, leftLineCount).join("\n"));

        while (leftLineCount > 1 && probe.height > leftBodyAvailable) {
            leftLineCount--;
            probe.setText(lines.slice(0, leftLineCount).join("\n"));
        }

        this.bookFlowObjects.push(probe);

        let landingRight = leftInner.right;
        let landingBottom;

        if (leftLineCount >= lines.length && probe.height <= leftBodyAvailable) {

            // Fits on the left page alone — right page stays untouched.
            // (probe already displays the full body text at this point.)
            landingBottom = cursorY + probe.height;

        } else {

            const leftLines = lines.slice(0, leftLineCount);
            const rightLines = lines.slice(leftLineCount);

            probe.setText(leftLines.join("\n"));

            const rightBodyText = this.add.text(rightCenterX, rightInner.top, rightLines.join("\n"), bodyStyle).setOrigin(0.5, 0);

            if (rightBodyText.height > rightBodyAvailable) {

                // Doesn't fit even across both pages — tear down whatever
                // of this attempt got built so far (header/divider/left
                // probe/right attempt) and hand off entirely to the
                // scrollable single-column fallback, which builds
                // everything fresh.
                rightBodyText.destroy();
                this.bookFlowObjects.forEach((obj) => obj.destroy());
                this.bookFlowObjects = [];
                this.renderBookFlowScrollFallback({ header, body, source });
                return;

            }

            this.bookFlowObjects.push(rightBodyText);

            landingRight = rightInner.right;
            landingBottom = rightInner.top + rightBodyText.height;

        }

        if (source) {

            const sourceText = this.add.text(landingRight, landingBottom + BOOK_FLOW_SOURCE_GAP, `— ${source}`, {
                fontFamily: "monospace",
                fontSize: "14px",
                color: BOOK_SOURCE_COLOR
            }).setOrigin(1, 0);
            this.bookFlowObjects.push(sourceText);

        }

    }

    // Rare fallback for renderBookFlow — body text that doesn't fit even
    // across a full left+right spread renders as one wide scrollable
    // column spanning the gutter instead, with its own up/down arrows
    // mirroring AdventureBar's dialogue-panel scroll (createScrollArrow/
    // scrollBy/applyScroll there — reimplemented rather than shared code,
    // since it's a different class/coordinate system). `source` sits
    // inline right-aligned after the body here, rather than anchored to a
    // specific page's bottom edge like renderBookFlow's own copy does,
    // since there's only the one wide column.
    renderBookFlowScrollFallback({ header, body, source }) {

        const { left, right, top, bottom, centerX } = this.contentBounds;
        const pad = BOOK_FLOW_PADDING;

        const viewportLeft = left + pad;
        const viewportRight = right - pad;
        const viewportTop = top + pad;
        const viewportBottom = bottom - pad;
        const viewportWidth = viewportRight - viewportLeft;
        const viewportHeight = viewportBottom - viewportTop;

        const textX = centerX - (BOOK_FLOW_SCROLL_ARROW_GUTTER / 2);
        const wrapWidth = viewportWidth - BOOK_FLOW_SCROLL_ARROW_GUTTER;

        const maskGraphics = this.make.graphics({}, false);
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillRect(viewportLeft, viewportTop, viewportWidth, viewportHeight);

        const layer = this.add.container(0, 0);
        layer.setMask(maskGraphics.createGeometryMask());
        this.bookFlowTextLayer = layer;

        let cursorY = viewportTop;

        if (header) {

            const headerText = this.add.text(textX, cursorY, header, {
                fontFamily: "monospace",
                fontSize: "20px",
                fontStyle: "bold",
                color: BOOK_HEADER_COLOR,
                align: "center",
                wordWrap: { width: wrapWidth }
            }).setOrigin(0.5, 0);
            layer.add(headerText);
            cursorY += headerText.height + BOOK_FLOW_HEADER_GAP;

            const divider = this.add.rectangle(textX, cursorY, wrapWidth * 0.5, 2, BOOK_DIVIDER_COLOR);
            layer.add(divider);
            cursorY += BOOK_FLOW_DIVIDER_GAP;

        }

        const bodyText = this.add.text(textX, cursorY, body, {
            fontFamily: "monospace",
            fontSize: "16px",
            fontStyle: source ? "italic" : "normal",
            color: BOOK_BODY_COLOR,
            align: "center",
            wordWrap: { width: wrapWidth },
            lineSpacing: 4
        }).setOrigin(0.5, 0);
        layer.add(bodyText);
        cursorY += bodyText.height;

        if (source) {

            cursorY += BOOK_FLOW_SOURCE_GAP;

            const sourceText = this.add.text(textX + (wrapWidth / 2), cursorY, `— ${source}`, {
                fontFamily: "monospace",
                fontSize: "14px",
                color: BOOK_SOURCE_COLOR
            }).setOrigin(1, 0);
            layer.add(sourceText);
            cursorY += sourceText.height;

        }

        this.bookFlowScrollMax = Math.max(0, (cursorY - viewportTop) - viewportHeight);
        this.bookFlowScrollOffset = 0;
        this.bookFlowViewportHeight = viewportHeight;

        const arrowX = viewportRight - (BOOK_FLOW_SCROLL_ARROW_GUTTER / 2);
        this.bookFlowScrollUpArrow = this.createBookScrollArrow(arrowX, viewportTop + 10, -1);
        this.bookFlowScrollDownArrow = this.createBookScrollArrow(arrowX, viewportBottom - 10, 1);

        this.applyBookFlowScroll();

        this.bookFlowObjects.push(layer, maskGraphics, this.bookFlowScrollUpArrow, this.bookFlowScrollDownArrow);

    }

    // Simple triangle scroll button mirroring AdventureBar's own
    // createScrollArrow/scrollBy/applyScroll (dark ink color rather than
    // AdventureBar's white/black, since this sits on the book's light
    // parchment background instead of the dialogue panel's own art) —
    // hidden by default; applyBookFlowScroll reveals whichever end still
    // has room to scroll toward. No click sfx, matching AdventureBar's
    // own scroll arrows (which don't have one either).
    createBookScrollArrow(x, y, direction) {

        const size = 14;

        const points = direction === -1
            ? [size / 2, 0, 0, size, size, size]
            : [size / 2, size, 0, 0, size, 0];

        const arrow = this.add.triangle(x, y, ...points, 0x2a1c10);
        arrow.setDepth(3);
        arrow.setInteractive({ useHandCursor: false });
        arrow.setVisible(false);

        arrow.on("pointerover", () => arrow.setFillStyle(0xb08d57));
        arrow.on("pointerout", () => arrow.setFillStyle(0x2a1c10));
        arrow.on("pointerdown", () => this.scrollBookFlowBy(direction));

        return arrow;

    }

    scrollBookFlowBy(direction) {

        if (this.bookFlowScrollMax <= 0) return;

        const step = this.bookFlowViewportHeight * BOOK_FLOW_SCROLL_STEP_FRACTION;

        this.bookFlowScrollOffset = Math.min(Math.max(this.bookFlowScrollOffset + (direction * step), 0), this.bookFlowScrollMax);
        this.applyBookFlowScroll();

    }

    applyBookFlowScroll() {

        this.bookFlowTextLayer.y = -this.bookFlowScrollOffset;
        this.bookFlowScrollUpArrow.setVisible(this.bookFlowScrollOffset > 0);
        this.bookFlowScrollDownArrow.setVisible(this.bookFlowScrollOffset < this.bookFlowScrollMax);

    }

    // One first-page preview at a time from content.files, browsed via the
    // shared prev/next arrows (createNavArrow) — created once here.
    // Clicking a preview hands off entirely to openFullPdf, which reuses
    // renderBookPdf (the same page-by-page reading view resume/writing
    // used to use directly) for that one specific file.
    renderPdfGallery() {

        if (!this.content.files || !this.content.files.length) {
            if (this.usesBookFlow) {
                this.renderBookFlow({ header: this.content.title, body: "Coming soon." });
            } else {
                this.renderText(`${this.content.title} coming soon.`);
            }
            return;
        }

        this.pdfGalleryObjects = [];
        this.pdfGalleryLoadToken = 0;
        this.pdfGalleryLoadingText = null;
        this.pdfGalleryIndex = 0;
        this.pdfGalleryFiles = this.content.files;
        this.pdfGalleryFolder = this.content.folder;
        // Optional closing message, browsed to as one more "page" past the
        // last real file (see renderPdfGalleryItem/displayPdfGalleryOutro/
        // updatePdfGalleryArrows) rather than a separate screen — e.g.
        // Portfolio's own library.js entry.
        this.pdfGalleryOutro = this.content.outro || null;

        this.prevArrow = this.createNavArrow("prev", () => this.turnPdfGallery(-1));
        this.nextArrow = this.createNavArrow("next", () => this.turnPdfGallery(1));

        this.renderPdfGalleryItem();

    }

    turnPdfGallery(delta) {
        this.pdfGalleryIndex += delta;
        this.renderPdfGalleryItem();
    }

    // Loads (or reuses an already-cached texture for) just page 1 of the
    // current index's PDF, rendered via pdfjs same as a real book page
    // (renderPdfPageIntoBox) — same "check it loaded, degrade gracefully
    // while a load is in flight" shape as every other gallery here.
    // `pdfGalleryLoadToken` guards against a slow load resolving after the
    // user has already navigated further. Deliberately routes through
    // loadPdfDocument (the same pdfjs document cache renderBookPdf uses)
    // rather than fetching independently — opening this same file's full
    // view later (see openFullPdf) then reuses the already-loaded
    // document instead of re-fetching it.
    renderPdfGalleryItem() {

        this.pdfGalleryObjects.forEach((obj) => obj.destroy());
        this.pdfGalleryObjects = [];

        if (this.pdfGalleryLoadingText) {
            this.pdfGalleryLoadingText.destroy();
            this.pdfGalleryLoadingText = null;
        }

        // The outro (if any) is one past the last real file — nothing to
        // load, just a static message page.
        if (this.pdfGalleryIndex >= this.pdfGalleryFiles.length) {
            this.displayPdfGalleryOutro();
            return;
        }

        const token = ++this.pdfGalleryLoadToken;
        const filename = this.pdfGalleryFiles[this.pdfGalleryIndex];
        const fileId = `${this.content.id}-${filename}`;
        const thumbKey = `pdf-gallery-thumb-${fileId}`;

        const show = () => {
            if (this.cancelled || token !== this.pdfGalleryLoadToken) return;
            this.displayPdfGalleryItem(thumbKey, filename);
        };

        if (this.textures.exists(thumbKey)) {
            show();
            return;
        }

        this.pdfGalleryLoadingText = this.renderText("Loading...");

        this.loadPdfDocument({ id: fileId, file: filename, folder: this.pdfGalleryFolder })
            .then((pdfDoc) => pdfDoc.getPage(1))
            .then((page) => {

                const viewport = page.getViewport({ scale: BOOK_PAGE_RENDER_SCALE });
                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                return page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise.then(() => canvas);

            })
            .then((canvas) => {

                if (this.cancelled || token !== this.pdfGalleryLoadToken) return;

                this.textures.addCanvas(thumbKey, canvas);
                this.textures.get(thumbKey).setFilter(Phaser.Textures.FilterMode.LINEAR);

                if (this.pdfGalleryLoadingText) {
                    this.pdfGalleryLoadingText.destroy();
                    this.pdfGalleryLoadingText = null;
                }

                show();

            })
            .catch(() => {
                if (token === this.pdfGalleryLoadToken && this.pdfGalleryLoadingText) {
                    this.pdfGalleryLoadingText.setText("Couldn't load this document.");
                }
            });

    }

    // Centered the same way the image gallery centers its own item+caption
    // block (see displayGalleryItem) — but unlike that one, doesn't cap
    // scale at 1. These are pdfjs vector-renders at BOOK_PAGE_RENDER_SCALE,
    // not arbitrary uploaded images, so there's no native-resolution
    // pixelation risk in filling the available space the way a resume
    // page does.
    displayPdfGalleryItem(key, filename) {

        // Centered on the left page specifically (see getBookPageZones),
        // not the full two-page spread — PDF_GALLERY only ever opens
        // through the library-book frame, so it should read like every
        // other single-item book page (a News-and-Featured-Work image via
        // renderCarouselImage, a short quote card via renderBookFlow), not
        // like the Workshop/Gallery's own full-spread galleries. No
        // bodyTop title offset either — usesBookFlow suppresses the
        // generic floating title for this content type (see buildScene),
        // so reserving space for one here would just shrink the preview
        // for no reason.
        const { left: page } = this.getBookPageZones();
        const pad = BOOK_FLOW_PADDING;

        const safeLeft = page.left + pad;
        const safeRight = page.right - pad;
        const safeTop = page.top + pad;
        const safeBottom = page.bottom - pad;

        const maxWidth = safeRight - safeLeft;
        const centerX = (safeLeft + safeRight) / 2;

        const title = filename.replace(/\.[^./\\]+$/, "").replace(/_/g, " ").trim();

        const caption = this.add.text(centerX, 0, title, {
            fontFamily: "monospace",
            fontSize: "16px",
            color: "#3a2c1c",
            align: "center",
            wordWrap: { width: maxWidth }
        }).setOrigin(0.5, 0).setDepth(1);

        const maxImageHeight = (safeBottom - safeTop) - GALLERY_CAPTION_GAP - caption.height;

        const image = this.add.image(0, 0, key);
        image.setDepth(1);

        const scale = Math.min(maxWidth / image.width, maxImageHeight / image.height);
        const dispW = image.width * scale;
        const dispH = image.height * scale;
        image.setDisplaySize(dispW, dispH);

        const blockHeight = dispH + GALLERY_CAPTION_GAP + caption.height;
        const blockTop = safeTop + (((safeBottom - safeTop) - blockHeight) / 2);
        const imageCenterY = blockTop + (dispH / 2);

        image.setPosition(centerX, imageCenterY);
        caption.setPosition(centerX, blockTop + dispH + GALLERY_CAPTION_GAP);

        this.pdfGalleryObjects.push(image, caption);

        // Clicking the preview opens the full document — same click-to-
        // zoom language (magnifying-glass cursor on hover) as a resume
        // page's own hitbox (renderPdfPageIntoBox), since this leads to
        // that exact same kind of reading view, just for a different,
        // user-picked file.
        const { left: bLeft, top: bTop, dispW: bDispW, dispH: bDispH } = this.backdropMetrics;
        const imgLeft = centerX - (dispW / 2);
        const imgTop = imageCenterY - (dispH / 2);

        const hitZone = this.addHitbox({
            xRange: [(imgLeft - bLeft) / bDispW, ((imgLeft + dispW) - bLeft) / bDispW],
            yRange: [(imgTop - bTop) / bDispH, ((imgTop + dispH) - bTop) / bDispH],
            verb: "Open",
            onClick: () => this.openFullPdf(filename)
        });

        hitZone.on("pointerover", () => this.cursor.setZooming(true));
        hitZone.on("pointerout", () => this.cursor.setZooming(false));

        this.pdfGalleryObjects.push(hitZone);

        this.updatePdfGalleryArrows();

    }

    // The closing "page" shown once the player has browsed past the last
    // real file (see renderPdfGalleryItem/pdfGalleryOutro) — plain
    // centered text on the left page, same convention as every other
    // single-item book page, with no image/hitbox since there's nothing
    // to open.
    displayPdfGalleryOutro() {

        const { left: page } = this.getBookPageZones();
        const pad = BOOK_FLOW_PADDING;

        const centerX = (page.left + pad + page.right - pad) / 2;
        const centerY = (page.top + pad + page.bottom - pad) / 2;

        const text = this.add.text(centerX, centerY, this.pdfGalleryOutro, {
            fontFamily: "monospace",
            fontSize: "15px",
            color: "#3a2c1c",
            align: "center",
            wordWrap: { width: (page.right - pad) - (page.left + pad) }
        }).setOrigin(0.5).setDepth(1);

        this.pdfGalleryObjects.push(text);

        this.updatePdfGalleryArrows();

    }

    updatePdfGalleryArrows() {

        // +1 past the last real file whenever there's an outro page to
        // browse to — see renderPdfGalleryItem.
        const totalPages = this.pdfGalleryFiles.length + (this.pdfGalleryOutro ? 1 : 0);

        const hasPrev = this.pdfGalleryIndex > 0;
        const hasNext = this.pdfGalleryIndex < totalPages - 1;

        this.setNavArrowActive(this.prevArrow, hasPrev);
        this.setNavArrowActive(this.nextArrow, hasNext);

    }

    // Hands off from the gallery-of-previews to a single document —
    // temporarily swaps this.content to a synthetic single-document
    // object pointing at the clicked file, since every PDF-reading
    // method here (loadPdfDocument, renderPdfPageIntoBox) already reads
    // its document id/file/folder from this.content rather than taking
    // them as parameters. this.pdfGalleryTopContent holds onto the real
    // gallery content so closeFullPdf can restore it.
    //
    // renderBookPdf still runs first (it's what actually loads the PDF
    // and sets this.numPages/this.pdfDoc), but for a PDF_GALLERY document
    // it only ever renders page 1 into the book view, with no page-turn
    // arrows of its own (see renderBookSpread) — the immediate
    // openGalleryPdfZoom call right after is where the REST of the
    // document lives, with its own prev/next arrows to scan through every
    // page without ever closing the zoom. Picking a preview goes straight
    // to that fully-rendered, fully-navigable view in one click.
    async openFullPdf(filename) {

        this.pdfGalleryObjects.forEach((obj) => obj.destroy());
        this.pdfGalleryObjects = [];

        if (this.pdfGalleryLoadingText) {
            this.pdfGalleryLoadingText.destroy();
            this.pdfGalleryLoadingText = null;
        }

        this.destroyNavArrows();

        this.pdfGalleryTopContent = this.content;
        this.content = {
            id: `${this.content.id}-${filename}`,
            file: filename,
            folder: this.pdfGalleryFolder
        };
        this.pdfGalleryFullViewActive = true;

        await this.renderBookPdf();

        if (this.cancelled) return;

        await this.openGalleryPdfZoom(1);

    }

    // Reverses openFullPdf — back to browsing previews at whatever index
    // the user was on before opening this file.
    closeFullPdf() {

        this.pageObjects.forEach((obj) => obj.destroy());
        this.pageObjects = [];

        this.destroyNavArrows();

        this.content = this.pdfGalleryTopContent;
        this.pdfGalleryFullViewActive = false;

        this.prevArrow = this.createNavArrow("prev", () => this.turnPdfGallery(-1));
        this.nextArrow = this.createNavArrow("next", () => this.turnPdfGallery(1));

        this.renderPdfGalleryItem();

    }

    // Shared prev/next teardown — used when switching between the two
    // very different arrow behaviors PDF_GALLERY toggles between
    // (browsing previews vs. turning pages), unlike every other viewer
    // here, which creates its nav arrows exactly once and never needs to
    // replace them.
    destroyNavArrows() {

        if (this.prevArrow) {
            this.prevArrow.image.destroy();
            this.prevArrow.zone.destroy();
            this.prevArrow = null;
        }

        if (this.nextArrow) {
            this.nextArrow.image.destroy();
            this.nextArrow.zone.destroy();
            this.nextArrow = null;
        }

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

        // A PDF_GALLERY document (Writing Samples) only ever shows page 1
        // here — the rest of the document is paged through in the zoom
        // overlay instead (see openGalleryPdfZoom), so this small in-book
        // view has no page-turn arrows of its own to create. Resume
        // (opened directly, not via PDF_GALLERY) keeps the full spread +
        // page-turn arrows unchanged.
        if (!this.pdfGalleryFullViewActive) {
            this.prevArrow = this.createNavArrow("prev", () => this.turnPage(-1));
            this.nextArrow = this.createNavArrow("next", () => this.turnPage(1));
        }

        await this.renderBookSpread();

    }

    // Splits the library-book frame's content area into a left-page and
    // right-page rect around a small central gutter (the book's spine) —
    // shared geometry every book content type (PDF page images,
    // renderBookFlow's flowing text/cards) renders into, so every book's
    // left/right page boundaries line up exactly regardless of what's
    // actually inside it.
    getBookPageZones() {

        const { left, right, top, bottom, centerX } = this.contentBounds;

        return {
            left: { left, right: centerX - BOOK_GUTTER, top, bottom },
            right: { left: centerX + BOOK_GUTTER, right, top, bottom }
        };

    }

    // One pdfjs loading task per document id, cached at module scope (see
    // pdfDocCache). `content.folder` is explicit for anything opened via
    // PDF_GALLERY (multiple files sharing one folder — see
    // renderPdfGallery/openFullPdf), matching GALLERY/VIDEO_GALLERY's own
    // `folder` convention; single-PDF content (resume/writing's old shape)
    // has no `folder` field and falls back to the original
    // one-folder-per-document-id scheme (same relative URL openPdf() below
    // still uses for the "Open PDF" button fallback).
    loadPdfDocument(content) {

        if (!pdfDocCache[content.id]) {
            const folder = content.folder || `documents/${content.id}`;
            const url = `assets/${folder}/${content.file}`;
            pdfDocCache[content.id] = pdfjsLib.getDocument({ url }).promise;
        }

        return pdfDocCache[content.id];

    }

    // Rebuilds the two page images for the current spread — called once
    // after the PDF first loads and again on every arrow click. Only the
    // page images themselves get torn down and rebuilt each time
    // (this.pageObjects); the arrow hitboxes/graphics are created once in
    // renderBookPdf and just toggled here via updateBookArrows, so
    // repeated page turns don't leak GameObjects. Async (awaiting both
    // page renders) so openFullPdf can await a spread being fully on
    // screen before immediately zooming into it — turnPage itself doesn't
    // need to await this, arrows/state already update synchronously
    // before the images finish rendering, same as before this was async.
    async renderBookSpread() {

        this.pageObjects.forEach((obj) => obj.destroy());
        this.pageObjects = [];

        const token = ++this.renderToken;

        const { left: leftBox, right: rightBox } = this.getBookPageZones();

        const leftPageNum = (this.spreadIndex * 2) + 1;
        const rightPageNum = leftPageNum + 1;

        const pageRenders = [];

        if (leftPageNum <= this.numPages) pageRenders.push(this.renderPdfPageIntoBox(leftPageNum, leftBox, token));

        // See renderBookPdf — a PDF_GALLERY document never shows a second
        // page here, and (having no page-turn arrows) never needs
        // updateBookArrows() either.
        if (!this.pdfGalleryFullViewActive) {

            if (rightPageNum <= this.numPages) pageRenders.push(this.renderPdfPageIntoBox(rightPageNum, rightBox, token));

            this.updateBookArrows();

        }

        await Promise.all(pageRenders);

    }

    // Renders PDF page `pageNum` to an offscreen canvas via pdfjs and
    // caches it as a texture keyed by page number, if not already cached
    // — shared by renderPdfPageIntoBox (which also places the result into
    // a book-page box below) and openGalleryPdfZoom's own page-turn
    // arrows (which only need the texture itself, not a book-page
    // placement, since they render straight into the zoom overlay).
    async ensurePdfPageTexture(pageNum) {

        const key = `pdf-page-${this.content.id}-${pageNum}`;

        if (this.textures.exists(key)) return key;

        const page = await this.pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: BOOK_PAGE_RENDER_SCALE });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

        if (this.cancelled) return key;

        this.textures.addCanvas(key, canvas);

        // The game runs pixelArt:true (nearest-neighbor filtering
        // everywhere, for crisp sprite art), which makes a downscaled
        // photo/document texture look blockier than it needs to —
        // override it back to smooth filtering for this one texture.
        // Doesn't fix the real readability problem on its own (this page
        // is still only a couple hundred pixels wide in-book — see
        // openPageZoom for the actual fix), but it's a free improvement
        // to the in-book thumbnail regardless.
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);

        return key;

    }

    // Renders one PDF page contain-fit within box (same fit math as
    // renderImage). `token` guards against a stale render finishing after
    // the user has already turned to a different spread (e.g. clicking
    // Next twice in quick succession).
    async renderPdfPageIntoBox(pageNum, box, token) {

        const key = await this.ensurePdfPageTexture(pageNum);

        if (this.cancelled || token !== this.renderToken) return;

        const image = this.add.image((box.left + box.right) / 2, (box.top + box.bottom) / 2, key);
        image.setDepth(1);

        const scale = Math.min((box.right - box.left) / image.width, (box.bottom - box.top) / image.height);
        image.setDisplaySize(image.width * scale, image.height * scale);

        this.pageObjects.push(image);

        // Clicking the page opens it full-size — see BOOK_ZOOM_* comment
        // above and openPageZoom/openGalleryPdfZoom. A PDF_GALLERY
        // document's own multi-page zoom (with its own page-turn arrows)
        // instead of the plain single-image zoom Resume uses, since this
        // is the same page 1 that's about to auto-zoom anyway (see
        // openFullPdf) and re-clicking it later should behave the same
        // way. clickSfx left as the generic default (not sfx-page-turn,
        // which is reserved for actually turning to a different spread
        // via the arrows below).
        const { left, top, dispW, dispH } = this.backdropMetrics;

        const hitZone = this.addHitbox({
            xRange: [(box.left - left) / dispW, (box.right - left) / dispW],
            yRange: [(box.top - top) / dispH, (box.bottom - top) / dispH],
            verb: "Zoom",
            onClick: () => {
                if (this.pdfGalleryFullViewActive) {
                    this.openGalleryPdfZoom(pageNum);
                } else {
                    this.openPageZoom(key);
                }
            }
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

    // Re-encodes whatever's backing textureKey into a data: URL, for use
    // as a full-resolution DOM <img>'s own src (see buildZoomOverlay/
    // updateZoomImage). Always goes through a canvas rather than reusing
    // source.src directly for a regular loaded image (carousel photos) —
    // Phaser's image loader backs this.load.image() textures with a
    // blob: URL that it can revoke once no longer needed internally,
    // which still displays fine as the texture's own already-decoded
    // source but 404s (confirmed empirically: net::ERR_FILE_NOT_FOUND) if
    // a brand-new <img> element tries to fetch that same URL again here.
    // Drawing the already-decoded source into a fresh canvas sidesteps
    // that entirely, since it reads pixel data directly rather than
    // re-fetching a URL. A PDF page's source is already a canvas
    // (rendered at BOOK_PAGE_RENDER_SCALE) with no such problem, but
    // going through the same path for both keeps this one simple rather
    // than branching on source type.
    getZoomImageSource(textureKey) {

        const source = this.textures.get(textureKey).getSourceImage();
        const srcWidth = source.naturalWidth || source.width;
        const srcHeight = source.naturalHeight || source.height;

        const canvas = typeof source.toDataURL === "function" ? source : (() => {
            const c = document.createElement("canvas");
            c.width = srcWidth;
            c.height = srcHeight;
            c.getContext("2d").drawImage(source, 0, 0);
            return c;
        })();

        return { url: canvas.toDataURL(), srcWidth, srcHeight };

    }

    // Contain-fits a source image within the zoom overlay's own max-size
    // budget — shared by buildZoomOverlay (initial size) and
    // updateZoomImage (re-fit when openGalleryPdfZoom swaps to a
    // different page, which may not share the same native dimensions).
    fitZoomImageSize(srcWidth, srcHeight) {

        const { width, height } = this.scale;
        const maxW = width * BOOK_ZOOM_MAX_WIDTH_FRACTION;
        const maxH = height * BOOK_ZOOM_MAX_HEIGHT_FRACTION;
        const scale = Math.min(maxW / srcWidth, maxH / srcHeight);

        return { dispW: Math.round(srcWidth * scale), dispH: Math.round(srcHeight * scale) };

    }

    // Full-size reading view for one page (or, since this is shared by
    // renderCarouselImage too, one News-and-Featured-Work photo) — a
    // Phaser DOM Element (see game.js's dom.createContainer config, the
    // same mechanism the Workshop's YouTube embed uses) rather than
    // another Phaser Image, so it renders at the browser's own native
    // resolution instead of being boxed into this game's fixed 960x540
    // internal canvas. Reuses whatever's already backing the texture (via
    // Texture.getSourceImage()) rather than reloading/re-rendering at a
    // different resolution — a PDF page's source is a canvas rendered at
    // BOOK_PAGE_RENDER_SCALE, a carousel photo's is the already-loaded
    // HTMLImageElement itself; either way it's already high-res, just
    // displayed too small in-book to read/see clearly.
    //
    // Shared by openPageZoom (Resume/carousel photos — no page nav) and
    // openGalleryPdfZoom (Writing Samples — adds its own prev/next
    // arrows on top afterward). `hintText` lets the gallery variant
    // describe its different close behavior (see closeZoomOrReturn)
    // and show a page counter.
    buildZoomOverlay(textureKey, hintText = BOOK_ZOOM_HINT_TEXT) {

        const { url, srcWidth, srcHeight } = this.getZoomImageSource(textureKey);

        const { width, height } = this.scale;

        const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, BOOK_ZOOM_BACKDROP_ALPHA);
        backdrop.setDepth(9000);
        backdrop.setInteractive();
        backdrop.on("pointerdown", () => this.closeZoomOrReturn());

        const { dispW, dispH } = this.fitZoomImageSize(srcWidth, srcHeight);

        const img = document.createElement("img");
        img.src = url;
        img.style.width = `${dispW}px`;
        img.style.height = `${dispH}px`;
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

        const hint = this.add.text(width / 2, height - BOOK_ZOOM_HINT_BOTTOM_MARGIN, hintText, {
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#e8e2d5"
        }).setOrigin(0.5).setDepth(9002);

        this.zoomOverlay = { backdrop, domImage, hint };

        this.cursor.setZooming(true);

    }

    // Swaps the overlay's image (and re-fits its size, in case the new
    // page isn't the same native dimensions) without tearing down and
    // rebuilding the backdrop/cursor state — see turnGalleryZoomPage.
    updateZoomImage(textureKey) {

        const { url, srcWidth, srcHeight } = this.getZoomImageSource(textureKey);
        const { dispW, dispH } = this.fitZoomImageSize(srcWidth, srcHeight);

        const img = this.zoomOverlay.domImage.node;
        img.src = url;
        img.style.width = `${dispW}px`;
        img.style.height = `${dispH}px`;

    }

    openPageZoom(textureKey) {

        if (this.zoomOverlay) return;

        this.buildZoomOverlay(textureKey);

    }

    // Writing Samples' own zoom entry point (see openFullPdf and
    // renderPdfPageIntoBox's hitbox) — same full-resolution DOM overlay
    // as openPageZoom, plus its own prev/next arrows (createZoomNavArrow)
    // so the whole document can be paged through without ever closing
    // the zoom. This is what "differs from Resume" — Resume's viewer
    // pages through a document by closing the zoom, turning the book's
    // own page, and re-zooming; here paging happens directly in the
    // zoom, and the book underneath never shows more than page 1 (see
    // renderBookSpread).
    async openGalleryPdfZoom(pageNum) {

        if (this.zoomOverlay) return;

        const clampedPage = Math.max(1, Math.min(pageNum, this.numPages));
        const key = await this.ensurePdfPageTexture(clampedPage);

        if (this.cancelled) return;

        this.galleryZoomPage = clampedPage;

        this.buildZoomOverlay(key, this.galleryZoomHintText());

        this.zoomPrevArrow = this.createZoomNavArrow("prev", () => this.turnGalleryZoomPage(-1));
        this.zoomNextArrow = this.createZoomNavArrow("next", () => this.turnGalleryZoomPage(1));

        this.updateGalleryZoomArrows();

    }

    galleryZoomHintText() {
        return `Page ${this.galleryZoomPage} of ${this.numPages}  —  Click anywhere or press ESC to go back`;
    }

    async turnGalleryZoomPage(delta) {

        const nextPage = this.galleryZoomPage + delta;

        if (nextPage < 1 || nextPage > this.numPages) return;

        const key = await this.ensurePdfPageTexture(nextPage);

        if (this.cancelled || !this.zoomOverlay) return;

        this.galleryZoomPage = nextPage;

        this.updateZoomImage(key);
        this.zoomOverlay.hint.setText(this.galleryZoomHintText());

        this.updateGalleryZoomArrows();

    }

    updateGalleryZoomArrows() {
        this.setNavArrowActive(this.zoomPrevArrow, this.galleryZoomPage > 1);
        this.setNavArrowActive(this.zoomNextArrow, this.galleryZoomPage < this.numPages);
    }

    destroyGalleryZoomArrows() {

        if (this.zoomPrevArrow) {
            this.zoomPrevArrow.image.destroy();
            this.zoomPrevArrow.zone.destroy();
            this.zoomPrevArrow = null;
        }

        if (this.zoomNextArrow) {
            this.zoomNextArrow.image.destroy();
            this.zoomNextArrow.zone.destroy();
            this.zoomNextArrow = null;
        }

    }

    // Same triangle-arrow visual language as createNavArrow, but
    // positioned relative to the screen itself (the zoom overlay is
    // centered on-screen, not against contentBounds like the book/
    // gallery arrows) and layered above the zoom backdrop/image.
    createZoomNavArrow(direction, onTurn) {

        const isNext = direction === "next";
        const { width, height } = this.scale;
        const y = height / 2;
        const x = isNext ? width - ZOOM_ARROW_MARGIN : ZOOM_ARROW_MARGIN;

        createPlaceholderTexture(this, ZOOM_NAV_ARROW_TEXTURE_KEY, NAV_ARROW_SIZE, NAV_ARROW_SIZE, (g, w, h) => {
            g.fillStyle(0xe8e2d5, 0.9);
            g.fillTriangle(w * 0.2, h * 0.12, w * 0.2, h * 0.88, w * 0.85, h * 0.5);
        });

        const image = this.add.image(x, y, ZOOM_NAV_ARROW_TEXTURE_KEY);
        image.setDisplaySize(NAV_ARROW_SIZE, NAV_ARROW_SIZE);
        image.setDepth(9002);
        if (!isNext) image.setFlipX(true);

        const half = NAV_ARROW_HIT_SIZE / 2;

        const zone = this.add.zone(x, y, half * 2, half * 2);
        zone.setDepth(9002);
        zone.setInteractive({ useHandCursor: false });
        zone.on("pointerdown", () => {
            AudioManager.playClickSfx(this, "sfx-page-turn");
            onTurn();
        });

        return { image, zone };

    }

    closePageZoom() {

        if (!this.zoomOverlay) return;

        this.zoomOverlay.backdrop.destroy();
        this.zoomOverlay.domImage.destroy();
        this.zoomOverlay.hint.destroy();

        this.destroyGalleryZoomArrows();

        this.cursor.setZooming(false);

        this.zoomOverlay = null;

    }

    // Closes whatever zoom is open — for a PDF_GALLERY document specifically,
    // that means going all the way back to the gallery of previews in this
    // same action (see onEscape's own comment for why: its zoom is the
    // reading view, not a detour from an otherwise-browsable book spread
    // the way Resume's is). Shared by the zoom backdrop's own click-to-close
    // and onEscape, so both behave identically.
    closeZoomOrReturn() {

        this.closePageZoom();

        if (this.pdfGalleryFullViewActive) {
            this.closeFullPdf();
        }

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
            if (this.usesBookFlow) {
                this.renderBookFlow({ header: this.content.title, body: "Coming soon." });
            } else {
                this.renderText(`${this.content.title} coming soon.`);
            }
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

        const title = filename.replace(/\.[^./\\]+$/, "").replace(/_/g, " ").trim();

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

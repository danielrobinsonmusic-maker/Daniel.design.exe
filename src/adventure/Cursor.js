// Custom in-game hover cursor for point-and-click adventure scenes — a
// chunky pixel-art arrow that changes color/scale over an interactable
// region, per the design spec ("cursor changes color/state when over an
// interactable region"). Rendered ourselves (rather than relying on the
// OS pointer icon, which can't meaningfully change color) so it reads
// consistently across browsers; the real OS cursor is hidden for the
// scene's lifetime via setDefaultCursor("none") and restored on destroy().
const CURSOR_TEXTURE_KEY = "adventure-cursor-arrow";
const CANVAS_SIZE = 28;
const DEFAULT_TINT = 0xffffff;
const HOVER_TINT = 0xffd54a;
const DEFAULT_SCALE = 1;
const HOVER_SCALE = 1.25;
const DEPTH = 10000; // above the AdventureBar and every hitbox

// Swapped in for the arrow while zoomed into a PDF page or other viewer
// content (see setZooming, called from TakeoverFrameScene's
// openPageZoom/closePageZoom). Unlike the arrow, this can't be a Phaser
// GameObject drawn onto the canvas — the zoom overlay it needs to appear
// over is a Phaser DOM Element (a real browser <img>, used so the zoomed
// page renders at native resolution instead of this game's fixed 960x540
// canvas — see TakeoverFrameScene's own comment on BOOK_ZOOM_*), and DOM
// Elements are a separate browser layer stacked in front of the entire
// canvas — anything drawn "on top" inside the canvas is still visually
// behind them. A real CSS cursor (Phaser's setDefaultCursor, which just
// sets canvas.style.cursor) is the only thing that renders correctly over
// both the canvas AND a DOM overlay, so that's what this uses instead —
// rasterized down to CURSOR_SIZE once and cached as a data URL. No
// hover-tint support in this mode (a static CSS cursor can't be recolored
// live), but nothing is hoverable during the full-screen zoom overlay
// besides "click anywhere to close" anyway, so that's never missed in
// practice; the arrow's own hover tint is untouched for every other
// interaction in the game.
const ZOOM_CURSOR_TEXTURE_KEY = "zoom";
const ZOOM_CURSOR_CROP = { x: 454, y: 137, w: 651, h: 676 }; // measured via PIL alpha bbox, same as BootScene's "content" sub-frame for this asset
const ZOOM_CURSOR_CSS_SIZE = 32; // close to the arrow's own ~28px footprint

let zoomCursorCss = undefined; // undefined = not built yet, "" = built and unavailable (asset never loaded)

function getZoomCursorCss(scene) {

    if (zoomCursorCss !== undefined) return zoomCursorCss;

    if (!scene.textures.exists(ZOOM_CURSOR_TEXTURE_KEY)) {
        zoomCursorCss = "";
        return zoomCursorCss;
    }

    const source = scene.textures.get(ZOOM_CURSOR_TEXTURE_KEY).getSourceImage();
    const { x, y, w, h } = ZOOM_CURSOR_CROP;

    const canvas = document.createElement("canvas");
    canvas.width = ZOOM_CURSOR_CSS_SIZE;
    canvas.height = Math.round(ZOOM_CURSOR_CSS_SIZE * (h / w));

    canvas.getContext("2d").drawImage(source, x, y, w, h, 0, 0, canvas.width, canvas.height);

    const hotspotX = Math.round(canvas.width / 2);
    const hotspotY = Math.round(canvas.height / 2);

    zoomCursorCss = `url(${canvas.toDataURL()}) ${hotspotX} ${hotspotY}, auto`;

    return zoomCursorCss;

}

// Classic pointer-arrow silhouette, tip at (2,2) — drawn once per game
// session (same cache-check convention as TileRenderer's baked ground
// texture) and reused as a plain tinted Image, so recoloring on hover is
// a cheap setTint() rather than rebuilding geometry every frame.
function ensureCursorTexture(scene) {

    if (scene.textures.exists(CURSOR_TEXTURE_KEY)) return;

    const graphics = scene.add.graphics();

    graphics.fillStyle(0xffffff, 1);
    graphics.lineStyle(2, 0x222222, 1);
    graphics.beginPath();
    graphics.moveTo(2, 2);
    graphics.lineTo(2, 22);
    graphics.lineTo(7, 18);
    graphics.lineTo(11, 26);
    graphics.lineTo(14, 24);
    graphics.lineTo(9, 15);
    graphics.lineTo(19, 15);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();

    graphics.generateTexture(CURSOR_TEXTURE_KEY, CANVAS_SIZE, CANVAS_SIZE);
    graphics.destroy();

}

export default class Cursor {

    constructor(scene) {

        this.scene = scene;
        this.hovering = false;
        this.zooming = false;

        ensureCursorTexture(scene);

        // Origin (0,0) so the texture's tip (drawn at local 2,2, a couple
        // px of margin for the stroke) sits right at the pointer position
        // — the same convention a real OS cursor's hotspot uses.
        this.arrow = scene.add.image(0, 0, CURSOR_TEXTURE_KEY);
        this.arrow.setOrigin(0, 0);
        this.arrow.setTint(DEFAULT_TINT);
        this.arrow.setScale(DEFAULT_SCALE);
        this.arrow.setDepth(DEPTH);
        this.arrow.setScrollFactor(0);

        scene.input.setDefaultCursor("none");

        this.onPointerMove = (pointer) => {
            this.arrow.setPosition(pointer.x, pointer.y);
        };

        scene.input.on("pointermove", this.onPointerMove);

        // Scale.FIT canvases don't fire an initial pointermove until the
        // mouse actually moves — start the arrow at the last known
        // pointer position instead of (0,0) so it doesn't flash in the
        // corner.
        this.arrow.setPosition(scene.input.activePointer.x, scene.input.activePointer.y);

    }

    setHover(isHovering) {

        if (this.hovering === isHovering) return;
        this.hovering = isHovering;

        this.arrow.setTint(isHovering ? HOVER_TINT : DEFAULT_TINT);
        this.arrow.setScale(isHovering ? HOVER_SCALE : DEFAULT_SCALE);

    }

    // See the ZOOM_CURSOR_* comment above for why this swaps to a real CSS
    // cursor (via Phaser's setDefaultCursor) instead of another sprite —
    // degrades gracefully (silently keeps the arrow) if zoom.png never
    // loaded.
    setZooming(isZooming) {

        if (this.zooming === isZooming) return;

        const cursorCss = getZoomCursorCss(this.scene);
        if (!cursorCss) return;

        this.zooming = isZooming;

        this.arrow.setVisible(!isZooming);
        this.scene.input.setDefaultCursor(isZooming ? cursorCss : "none");

    }

    destroy() {

        this.scene.input.off("pointermove", this.onPointerMove);
        this.scene.input.setDefaultCursor("default");
        this.arrow.destroy();

    }

}

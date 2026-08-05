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

    destroy() {

        this.scene.input.off("pointermove", this.onPointerMove);
        this.scene.input.setDefaultCursor("default");
        this.arrow.destroy();

    }

}

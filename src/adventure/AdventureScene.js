import Phaser from "phaser";
import AdventureBar from "./AdventureBar";
import Cursor from "./Cursor";

// Shared foundation for every point-and-click screen in a building's
// Room -> Close-up -> Takeover chain. A concrete scene (LibraryScene,
// BookshelfCloseupScene, the shared TakeoverFrameScene, etc.) subclasses
// this and, in its own buildScene(), calls setBackdrop() once and
// addHitbox() per interactable region, then sets this.backSceneKey (and
// optionally this.backSceneData) to whatever ESC should return to.
// Everything else — the fade transitions, the bottom-bar UI, the hover
// cursor, hitbox->screen-space math — lives here so it isn't reimplemented
// per building. The Takeover level specifically is shared across every
// building via TakeoverFrameScene (see adventure/takeoverFrames.js)
// rather than each building subclassing its own, since a Takeover is
// always the same shape: a frame image plus content rendered into a
// frame-specific content area.
const FADE_DURATION = 400;

// Generates (and caches, same "only build it once" convention as
// TileRenderer's baked ground texture) a placeholder backdrop from a
// caller-supplied draw callback, so every placeholder screen goes through
// the exact same setBackdrop()/addHitbox() fraction-based math real art
// will later use — swapping in a real image later is just changing which
// texture key gets loaded, not touching any hitbox or scene logic.
export function createPlaceholderTexture(scene, key, width, height, draw) {

    if (scene.textures.exists(key)) return;

    const graphics = scene.add.graphics();
    draw(graphics, width, height);
    graphics.generateTexture(key, width, height);
    graphics.destroy();

}

// Soft radial glow shown behind any hovered hitbox (see addHitbox below) —
// generic across every Room/Close-up scene rather than hardcoded per
// building. A true radial gradient isn't expressible via Graphics'
// solid-color fillStyle, so this goes straight to Canvas2D (same
// technique TileRenderer.js uses for its baked ground texture) and caches
// the result the same way createPlaceholderTexture does above.
const GLOW_TEXTURE_KEY = "adventure-hover-glow";
const GLOW_CANVAS_SIZE = 128;

function ensureGlowTexture(scene) {

    if (scene.textures.exists(GLOW_TEXTURE_KEY)) return;

    const canvas = document.createElement("canvas");
    canvas.width = GLOW_CANVAS_SIZE;
    canvas.height = GLOW_CANVAS_SIZE;

    const ctx = canvas.getContext("2d");
    const r = GLOW_CANVAS_SIZE / 2;

    const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
    gradient.addColorStop(0, "rgba(255,255,255,0.9)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.35)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GLOW_CANVAS_SIZE, GLOW_CANVAS_SIZE);

    scene.textures.addCanvas(GLOW_TEXTURE_KEY, canvas);

}

export default class AdventureScene extends Phaser.Scene {

    constructor(key) {
        super(key);
    }

    init(data = {}) {

        this.sceneData = data;
        this.backSceneKey = null;

        // WorldScene forwards the door tile's own pixel position as
        // returnSpawnX/Y whenever it starts a building scene (see its
        // updateInteractions) — carrying it straight through as the World
        // spawn point means ESC drops the player back in front of
        // whichever building they just left instead of the map's default
        // south-edge spawn. Undefined for any scene not reached that way
        // (Close-ups, TakeoverFrame), which WorldScene.create() already
        // handles gracefully by falling back to its own default spawn.
        this.backSceneData = (data.returnSpawnX !== undefined && data.returnSpawnY !== undefined)
            ? { spawnX: data.returnSpawnX, spawnY: data.returnSpawnY }
            : undefined;

    }

    create() {

        this.cameras.main.fadeIn(FADE_DURATION, 0, 0, 0);

        // TakeoverFrameScene is the one subclass that overrides usesBar()
        // to skip this — its content-viewer screens have no dialogue/idle
        // prompt to show, just a small ESC hint of their own (see that
        // class), so the full dialogue-panel.png UI would be pure clutter.
        if (this.usesBar()) {
            this.bar = new AdventureBar(this);
        }

        this.cursor = new Cursor(this);
        this.hitboxes = [];

        this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.input.keyboard.on("keydown-ESC", this.handleEscape, this);

        this.events.once("shutdown", () => {
            this.cursor.destroy();
            this.input.keyboard.off("keydown-ESC", this.handleEscape, this);
        });

        // Subclass hook — expected to call setBackdrop()/addHitbox() and
        // set this.backSceneKey, then this.bar.setText(...) for the idle
        // state.
        this.buildScene();

    }

    // Override in subclasses.
    buildScene() {}

    // Override to return false for a scene that shouldn't get the shared
    // dialogue-panel.png bottom bar at all (see TakeoverFrameScene).
    usesBar() {
        return true;
    }

    // Optional override: return true to consume ESC (e.g. close an open
    // dialogue menu) instead of the default "go back a level" behavior.
    onEscape() {
        return false;
    }

    handleEscape() {

        if (this.onEscape()) return;

        this.goBack();

    }

    goBack() {

        if (!this.backSceneKey) return;

        this.fadeTo(this.backSceneKey, this.backSceneData);

    }

    fadeTo(sceneKey, data) {

        this.cameras.main.fadeOut(FADE_DURATION, 0, 0, 0);

        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start(sceneKey, data);
        });

    }

    // "Contain" fit, same math as OverlookScene's background — centers the
    // backdrop and letterboxes rather than cropping, so it's fully visible
    // regardless of the source art's native aspect ratio. Hitbox fractions
    // (see addHitbox) are measured against this backdrop's own displayed
    // rect, not the raw canvas, so they stay correct however much
    // letterboxing there ends up being.
    setBackdrop(key, nativeWidth, nativeHeight) {

        const { width, height } = this.scale;

        const scale = Math.min(width / nativeWidth, height / nativeHeight);
        const dispW = nativeWidth * scale;
        const dispH = nativeHeight * scale;
        const left = (width - dispW) / 2;
        const top = (height - dispH) / 2;

        if (this.backdrop) this.backdrop.destroy();

        this.backdrop = this.add.image(width / 2, height / 2, key);
        this.backdrop.setDisplaySize(dispW, dispH);
        this.backdrop.setDepth(0);

        this.backdropMetrics = { left, top, dispW, dispH };

    }

    // xRange/yRange are [min, max] fractions (0-1) of the backdrop's own
    // width/height — plain rectangular hitboxes tied to image coordinates,
    // deliberately not pixel masks, per the design spec ("prioritize
    // reliability and ease of iteration").
    addHitbox({ xRange, yRange, verb, onClick }) {

        const { left, top, dispW, dispH } = this.backdropMetrics;
        const [x0, x1] = xRange;
        const [y0, y1] = yRange;

        const w = (x1 - x0) * dispW;
        const h = (y1 - y0) * dispH;
        const cx = left + (x0 * dispW) + (w / 2);
        const cy = top + (y0 * dispH) + (h / 2);

        const zone = this.add.zone(cx, cy, w, h);
        zone.setOrigin(0.5);
        zone.setInteractive();
        zone.setDepth(1);

        const glow = this.createHoverGlow(cx, cy, w, h);

        zone.on("pointerover", () => {
            this.cursor.setHover(true);
            if (this.bar) this.bar.showVerb(verb);
            glow.show();
        });

        zone.on("pointerout", () => {
            this.cursor.setHover(false);
            if (this.bar) this.bar.hideVerb();
            glow.hide();
        });

        zone.on("pointerdown", () => {
            onClick();
        });

        this.hitboxes.push(zone);

        return zone;

    }

    // Soft, low-opacity radial glow roughly the hitbox's own size/aspect
    // (an ellipse, not a shape-hugging outline — see GLOW_TEXTURE_KEY's
    // comment) with a gentle pulsing scale while hovered. Returns
    // show()/hide() rather than the raw image so addHitbox's pointerover/
    // pointerout handlers don't need to know about tween bookkeeping.
    createHoverGlow(cx, cy, w, h) {

        ensureGlowTexture(this);

        const image = this.add.image(cx, cy, GLOW_TEXTURE_KEY);
        image.setDisplaySize(w * 1.4, h * 1.4);
        image.setBlendMode(Phaser.BlendModes.ADD);
        image.setTint(0xffdca0);
        image.setDepth(0.5); // above the backdrop, below hitboxes' (invisible) zones and the bar
        image.setAlpha(0);
        image.setVisible(false);

        let pulseTween = null;

        const show = () => {

            this.tweens.killTweensOf(image);
            image.setVisible(true);
            image.setScale(1);

            this.tweens.add({
                targets: image,
                alpha: 0.4,
                duration: 200,
                ease: "Sine.easeOut",
                onComplete: () => {

                    pulseTween = this.tweens.add({
                        targets: image,
                        scale: 1.12,
                        duration: 900,
                        yoyo: true,
                        repeat: -1,
                        ease: "Sine.easeInOut"
                    });

                }
            });

        };

        const hide = () => {

            if (pulseTween) {
                pulseTween.stop();
                pulseTween = null;
            }

            this.tweens.killTweensOf(image);

            this.tweens.add({
                targets: image,
                alpha: 0,
                duration: 150,
                ease: "Sine.easeIn",
                onComplete: () => image.setVisible(false)
            });

        };

        return { show, hide };

    }

}

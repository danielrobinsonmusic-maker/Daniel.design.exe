import Phaser from "phaser";
import { NORTH_BUFFER_ROWS } from "../world/Buildings";

// Background art is 1536x1024 — "contain" fit against the 960x540 canvas
// is height-constrained (540/1024 < 960/1536), so it always fills the
// full height and pillarboxes left/right rather than top/bottom. The
// coordinates below were measured directly against the rendered art at
// that scale, not guessed.
const BG_NATIVE_WIDTH = 1536;
const BG_NATIVE_HEIGHT = 1024;

const PONDER_PROMPT_DELAY = 20000;
const PONDER_COOLDOWN = 40000;

// Tile (37, 5): back on the main entrance path, just south of the Woods
// interaction zone (37, 1) — far enough that returning here doesn't
// immediately re-trigger it, but still clearly "the pathway outside the
// hidden path" rather than the default south-of-map spawn. Shifted down
// by NORTH_BUFFER_ROWS along with the rest of WorldScene's layout.
const RETURN_SPAWN = { x: (37 * 32) + 16, y: ((5 + NORTH_BUFFER_ROWS) * 32) + 16 };

// Every animated element's position, in already-scaled canvas coordinates.
const LEFT_LANTERN_GLOW = { x: 191, y: 332 };
const POND_RIPPLE = { x: 212, y: 464 };
const FIREFLY_POSITIONS = [
    { x: 123, y: 438 },
    { x: 275, y: 443 },
    { x: 154, y: 501 },
    { x: 297, y: 485 },
    { x: 207, y: 438 },
    { x: 240, y: 495 }
];
const FIREFLY_COLORS = [0xffffff, 0xffe066];

// Diagonal streak across the open sky between the two treelines — clear
// of both tree silhouettes at this scale.
const SHOOTING_STAR_START = { x: 233, y: 26 };
const SHOOTING_STAR_END = { x: 444, y: 90 };
const SHOOTING_STAR_MIN_DELAY = 15000;
const SHOOTING_STAR_MAX_DELAY = 30000;

export default class OverlookScene extends Phaser.Scene {

    constructor() {
        super("Overlook");
    }

    create() {

        const { width, height } = this.scale;

        const bg = this.add.image(width / 2, height / 2, "overlook-bg");
        const scale = Math.min(width / BG_NATIVE_WIDTH, height / BG_NATIVE_HEIGHT);
        bg.setScale(scale);

        this.createPondRipple(POND_RIPPLE.x, POND_RIPPLE.y);
        this.createLanternGlow(LEFT_LANTERN_GLOW.x, LEFT_LANTERN_GLOW.y);
        FIREFLY_POSITIONS.forEach((pos, i) => {
            this.createFirefly(pos.x, pos.y, FIREFLY_COLORS[i % FIREFLY_COLORS.length]);
        });
        this.scheduleNextShootingStar();

        this.ponderPromptReady = false;
        this.time.delayedCall(PONDER_PROMPT_DELAY, () => {
            this.ponderPromptReady = true;
        });

        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // HUD is launched once from WorldScene and stays running for the
        // whole session (same pattern LibraryScene uses) — bring it above
        // this scene's own display list so the prompt panel renders on top.
        this.scene.bringToTop("HUD");

    }

    update() {

        const hud = this.scene.get("HUD");

        if (this.ponderPromptReady) {

            hud.showInteraction(
                "Scenic Overlook",
                "Press [E] to ponder... Press [ESC] to head back to town."
            );

            if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {

                this.ponderPromptReady = false;
                hud.hideInteraction();

                this.time.delayedCall(PONDER_COOLDOWN, () => {
                    this.ponderPromptReady = true;
                });

            }

        }

        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            hud.hideInteraction();
            this.scene.start("World", { spawnX: RETURN_SPAWN.x, spawnY: RETURN_SPAWN.y });
        }

    }

    // A short, additive-blended streak that flies across the upper sky,
    // fading in then out, on a long randomized interval so it reads as a
    // rare moment rather than a recurring effect.
    scheduleNextShootingStar() {

        const delay = Phaser.Math.Between(SHOOTING_STAR_MIN_DELAY, SHOOTING_STAR_MAX_DELAY);

        this.time.delayedCall(delay, () => {
            this.fireShootingStar();
            this.scheduleNextShootingStar();
        });

    }

    fireShootingStar() {

        const angle = Phaser.Math.Angle.Between(
            SHOOTING_STAR_START.x, SHOOTING_STAR_START.y,
            SHOOTING_STAR_END.x, SHOOTING_STAR_END.y
        );

        const star = this.add.rectangle(
            SHOOTING_STAR_START.x,
            SHOOTING_STAR_START.y,
            22,
            2,
            0xffffff,
            1
        );
        star.setAngle(Phaser.Math.RadToDeg(angle));
        star.setBlendMode(Phaser.BlendModes.ADD);
        star.setAlpha(0);

        const duration = 700;

        this.tweens.add({
            targets: star,
            x: SHOOTING_STAR_END.x,
            y: SHOOTING_STAR_END.y,
            duration,
            ease: "Sine.easeIn"
        });

        this.tweens.add({
            targets: star,
            alpha: 1,
            duration: duration * 0.25,
            ease: "Sine.easeOut",
            onComplete: () => {
                this.tweens.add({
                    targets: star,
                    alpha: 0,
                    duration: duration * 0.6,
                    ease: "Sine.easeIn",
                    onComplete: () => star.destroy()
                });
            }
        });

    }

    // Gentle continuous ring at the pond's surface: scales up slightly
    // while fading out, then snaps back to start its next cycle.
    createPondRipple(x, y) {

        const ripple = this.add.circle(x, y, 6, 0xcfe9ff, 0);
        ripple.setStrokeStyle(2, 0xcfe9ff, 0.55);
        ripple.setScale(0.4);
        ripple.setAlpha(1);

        this.tweens.add({
            targets: ripple,
            scale: 1.8,
            alpha: 0,
            duration: 1900,
            repeat: -1,
            repeatDelay: 700,
            onRepeat: () => {
                ripple.setScale(0.4);
                ripple.setAlpha(1);
            }
        });

    }

    // Soft warm pulse over the lit lantern's window — a slow breathing
    // loop, additive-blended so it reads as light rather than a flat dot.
    createLanternGlow(x, y) {

        const glow = this.add.circle(x, y, 16, 0xffcf7a, 0.35);
        glow.setBlendMode(Phaser.BlendModes.ADD);

        this.tweens.add({
            targets: glow,
            scale: { from: 0.85, to: 1.2 },
            alpha: { from: 0.25, to: 0.45 },
            duration: 1800,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

    }

    // A single firefly: drifts a few pixels back and forth and twinkles
    // independently of the drift, each on its own randomized timing so
    // the group never looks synchronized.
    createFirefly(x, y, color) {

        const firefly = this.add.circle(x, y, Phaser.Math.Between(1, 2), color, 0.9);
        firefly.setBlendMode(Phaser.BlendModes.ADD);

        const driftX = Phaser.Math.Between(-10, 10);
        const driftY = Phaser.Math.Between(-8, 8);

        this.tweens.add({
            targets: firefly,
            x: x + driftX,
            y: y + driftY,
            duration: Phaser.Math.Between(2500, 4000),
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        this.tweens.add({
            targets: firefly,
            alpha: { from: 0.9, to: 0.15 },
            duration: Phaser.Math.Between(900, 1600),
            delay: Phaser.Math.Between(0, 1000),
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

    }

}

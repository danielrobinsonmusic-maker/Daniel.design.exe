import Phaser from "phaser";
import { NORTH_BUFFER_ROWS } from "../world/Buildings";
import { isCatAchievementComplete } from "../managers/CatAchievement";
import { isNPCAchievementUnlocked } from "../managers/NPCAchievement";
import { createPlaceholderTexture } from "../adventure/AdventureScene";
import AudioManager from "../managers/AudioManager";
import SaveManager from "../managers/SaveManager";
import { OVERLOOK_VISITED_FLAG } from "../world/Minimap";

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

// Falling petals: same rare, randomized-interval pacing as the shooting
// star above (own schedule, not tied to it) — occasional enough to notice
// individually rather than a steady flurry. Delays trimmed 10% (from
// 12000-25000) to spawn 10% more often; PETAL_EXTRA_CHANCE below adds a
// second petal on 10% of triggers to raise the average petal count by the
// same 10%, independent of the frequency change.
const PETAL_MIN_DELAY = 10800;
const PETAL_MAX_DELAY = 22500;
const PETAL_EXTRA_CHANCE = 0.10;
const PETAL_DISPLAY_SIZE = 12; // px, long edge
const PETAL_FALL_MIN_DURATION = 6000;
const PETAL_FALL_MAX_DURATION = 9500;
const PETAL_DRIFT_MIN_RANGE = 12; // px either side of center per drift cycle
const PETAL_DRIFT_MAX_RANGE = 26;
const PETAL_DRIFT_MIN_DURATION = 1200;
const PETAL_DRIFT_MAX_DURATION = 2200;
const PETAL_ROTATE_MIN_DURATION = 3000;
const PETAL_ROTATE_MAX_DURATION = 6000;
const PETAL_FADE_FRACTION = 0.3; // final portion of the fall spent fading out

// Fireworks: a permanent addition once the broader "talked to everyone in
// town" achievement unlocks (see managers/NPCAchievement.js) — same
// "checked fresh at scene creation, stays on forever after" pattern the
// cat achievement's own backdrop swap above already established, just an
// added effect layered on top instead of a swapped asset. Two stages per
// firework: a small rocket rises from roughly the vertical middle of the
// screen — where the town itself sits in the backdrop art, so they read
// as launching from town below rather than from the Overlook's own
// foreground — fading in over the first part of its climb so it looks
// like it's arriving from a distance rather than just switching on, then
// bursts (at a randomized height, kept as-is — see FIREWORK_LAUNCH_APEX_*)
// into a radial shower of particles via Phaser's own particle emitter —
// gravity-affected and faded out over their lifetime, one random color
// per burst so consecutive fireworks read as varied rather than
// identical. No new art asset needed — a single generated square (see
// createPlaceholderTexture, the same technique every other generated
// texture in this project uses) is enough for pixel-style particles.
const FIREWORK_PARTICLE_KEY = "overlook-firework-particle";
const FIREWORK_PARTICLE_SIZE = 3;
const FIREWORK_COLORS = [0xff5050, 0xffd23f, 0x4fd8ff, 0xff6ec7, 0x7dff6e, 0xffffff];
const FIREWORK_LAUNCH_MIN_DELAY = 3500;
const FIREWORK_LAUNCH_MAX_DELAY = 7000;
const FIREWORK_LAUNCH_MIN_DURATION = 700;
const FIREWORK_LAUNCH_MAX_DURATION = 1000;
// Fraction of canvas height the rocket starts from — a small random band
// within the middle third of the screen (0.333-0.667) rather than one
// fixed row, so consecutive launches don't all start from the exact same
// point. Kept toward the upper part of that middle third specifically so
// the start point sits above the backdrop's tree line rather than looking
// like it's launching out of the trees.
const FIREWORK_LAUNCH_START_Y_MIN_FRACTION = 0.36;
const FIREWORK_LAUNCH_START_Y_MAX_FRACTION = 0.44;
// Fraction of the launch's own duration spent fading in from invisible —
// the back end of the climb stays fully visible.
const FIREWORK_FADE_IN_FRACTION = 0.4;
const FIREWORK_LAUNCH_APEX_MIN_FRACTION = 0.15;
const FIREWORK_LAUNCH_APEX_MAX_FRACTION = 0.45;
const FIREWORK_BURST_COUNT_MIN = 28;
const FIREWORK_BURST_COUNT_MAX = 40;
const FIREWORK_BURST_SPEED_MIN = 60;
const FIREWORK_BURST_SPEED_MAX = 160;
const FIREWORK_BURST_LIFESPAN_MIN = 700;
const FIREWORK_BURST_LIFESPAN_MAX = 1200;
const FIREWORK_GRAVITY_Y = 220;

export default class OverlookScene extends Phaser.Scene {

    constructor() {
        super("Overlook");
    }

    create() {

        const { width, height } = this.scale;

        AudioManager.playArea(this, "overlook");

        // Permanently reveals this location on the Town Square minimap
        // (see world/Minimap.js) — hasFlag/setFlag no-op harmlessly on
        // every visit after the first.
        SaveManager.setFlag(OVERLOOK_VISITED_FLAG);

        // The hidden five-building cat achievement (see
        // managers/CatAchievement.js) swaps in the "with Edison" version
        // of this backdrop once complete — everything else about this
        // scene (ambient effects, prompts, fade transitions) stays the
        // same regardless of which one is active.
        const bgKey = isCatAchievementComplete() ? "overlook-bg-achieved" : "overlook-bg";
        const bg = this.add.image(width / 2, height / 2, bgKey);
        const scale = Math.min(width / BG_NATIVE_WIDTH, height / BG_NATIVE_HEIGHT);
        bg.setScale(scale);

        // The broader "talked to everyone in town" achievement (see
        // managers/NPCAchievement.js) — checked independently of the cat
        // achievement above (no hard-coded ordering between the two, even
        // though this one requires all 5 cats too) — permanently adds a
        // fireworks display once unlocked.
        if (isNPCAchievementUnlocked()) {
            this.startFireworks();
        }

        this.createPondRipple(POND_RIPPLE.x, POND_RIPPLE.y);
        this.createLanternGlow(LEFT_LANTERN_GLOW.x, LEFT_LANTERN_GLOW.y);
        FIREFLY_POSITIONS.forEach((pos, i) => {
            this.createFirefly(pos.x, pos.y, FIREFLY_COLORS[i % FIREFLY_COLORS.length]);
        });
        this.scheduleNextShootingStar();
        this.scheduleNextPetal();

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

    // Independent of the shooting star's own loop above — same rare-random-
    // interval technique, separate schedule, so the two never sync up.
    scheduleNextPetal() {

        const delay = Phaser.Math.Between(PETAL_MIN_DELAY, PETAL_MAX_DELAY);

        this.time.delayedCall(delay, () => {
            this.spawnPetal();
            if (Math.random() < PETAL_EXTRA_CHANCE) this.spawnPetal();
            this.scheduleNextPetal();
        });

    }

    // A single petal: falls from near the top of the screen to below its
    // bottom edge, with a slow side-to-side drift (its own repeating yoyo
    // tween, independent of the fall's duration/progress) and a slow
    // continuous rotation layered on top — same visual language planned
    // for the town square's petals, just triggered on a simple loop here
    // instead of tied to flower tiles. Purely decorative: no collision, no
    // interaction with the player or anything else in the scene.
    spawnPetal() {

        if (!this.textures.exists("petal")) return;

        const { width, height } = this.scale;

        const startX = Phaser.Math.Between(20, width - 20);
        const startY = Phaser.Math.Between(-20, 20);

        const texture = this.textures.get("petal");
        const frame = texture.has("content") ? "content" : undefined;

        const petal = this.add.image(startX, startY, "petal", frame);

        const aspect = petal.width / petal.height;
        petal.setDisplaySize(PETAL_DISPLAY_SIZE, PETAL_DISPLAY_SIZE / aspect);

        const fallDuration = Phaser.Math.Between(PETAL_FALL_MIN_DURATION, PETAL_FALL_MAX_DURATION);
        const endY = height + 20;

        // Falls straight down in world terms — the side-to-side motion is
        // a separate tween on the same object (below) so the two combine
        // into a gentle drifting descent rather than a diagonal line.
        this.tweens.add({
            targets: petal,
            y: endY,
            duration: fallDuration,
            ease: "Sine.easeIn",
            onComplete: () => {
                this.tweens.killTweensOf(petal);
                petal.destroy();
            }
        });

        // Oscillates several times over the course of the fall — its own
        // duration is much shorter than the fall's, and unrelated to it.
        const driftRange = Phaser.Math.Between(PETAL_DRIFT_MIN_RANGE, PETAL_DRIFT_MAX_RANGE);
        const driftSign = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;

        this.tweens.add({
            targets: petal,
            x: startX + (driftRange * driftSign),
            duration: Phaser.Math.Between(PETAL_DRIFT_MIN_DURATION, PETAL_DRIFT_MAX_DURATION),
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        // A full 0->360 sweep that snaps back to restart each repeat reads
        // as continuous rotation (360 degrees is visually identical to 0),
        // rather than a visible reset.
        const rotateSign = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;

        this.tweens.add({
            targets: petal,
            angle: 360 * rotateSign,
            duration: Phaser.Math.Between(PETAL_ROTATE_MIN_DURATION, PETAL_ROTATE_MAX_DURATION),
            repeat: -1,
            ease: "Linear"
        });

        // Fades out over the final stretch of the fall so it's gone (or
        // nearly gone) by the time it reaches endY, instead of vanishing
        // abruptly right as the fall tween's onComplete destroys it.
        this.tweens.add({
            targets: petal,
            alpha: 0,
            duration: fallDuration * PETAL_FADE_FRACTION,
            delay: fallDuration * (1 - PETAL_FADE_FRACTION),
            ease: "Sine.easeIn"
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

    // See the FIREWORK_* constants above. Independent of the shooting
    // star/petal loops — own schedule, no shared state — same "recurring
    // delayedCall that reschedules itself" pattern those already use, so
    // it just keeps going for as long as this scene instance is alive
    // (Phaser tears down every timer/tween a scene owns on shutdown, same
    // as those two, so no explicit cleanup is needed here either).
    startFireworks() {

        createPlaceholderTexture(this, FIREWORK_PARTICLE_KEY, FIREWORK_PARTICLE_SIZE, FIREWORK_PARTICLE_SIZE, (g, w, h) => {
            g.fillStyle(0xffffff, 1);
            g.fillRect(0, 0, w, h);
        });

        this.scheduleNextFirework();

    }

    scheduleNextFirework() {

        const delay = Phaser.Math.Between(FIREWORK_LAUNCH_MIN_DELAY, FIREWORK_LAUNCH_MAX_DELAY);

        this.time.delayedCall(delay, () => {
            this.launchFirework();
            this.scheduleNextFirework();
        });

    }

    // Stage 1: a small rocket rises from roughly the middle of the screen
    // (where the town sits in the backdrop art — see the FIREWORK_* block
    // above) to a random point in the upper half, via additive blending
    // (same look as the lantern glow/fireflies above) so it reads as a
    // glowing spark rather than a flat square. Starts invisible and fades
    // in over the first part of the climb (a separate tween on the same
    // target, same "one tween per property" style fireShootingStar uses
    // above) rather than being instantly visible, so it looks like it's
    // arriving from a distance instead of switching on mid-air. Bursts on
    // arrival.
    launchFirework() {

        const { width, height } = this.scale;

        const startX = Phaser.Math.Between(width * 0.15, width * 0.85);
        const startY = Phaser.Math.Between(
            height * FIREWORK_LAUNCH_START_Y_MIN_FRACTION,
            height * FIREWORK_LAUNCH_START_Y_MAX_FRACTION
        );
        const apexX = startX + Phaser.Math.Between(-40, 40);
        const apexY = Phaser.Math.Between(
            height * FIREWORK_LAUNCH_APEX_MIN_FRACTION,
            height * FIREWORK_LAUNCH_APEX_MAX_FRACTION
        );

        const rocket = this.add.rectangle(startX, startY, FIREWORK_PARTICLE_SIZE, FIREWORK_PARTICLE_SIZE, 0xfff2c8, 1);
        rocket.setBlendMode(Phaser.BlendModes.ADD);
        rocket.setAlpha(0);

        const duration = Phaser.Math.Between(FIREWORK_LAUNCH_MIN_DURATION, FIREWORK_LAUNCH_MAX_DURATION);

        this.tweens.add({
            targets: rocket,
            x: apexX,
            y: apexY,
            duration,
            ease: "Quad.out",
            onComplete: () => {
                rocket.destroy();
                this.burstFirework(apexX, apexY);
            }
        });

        this.tweens.add({
            targets: rocket,
            alpha: 1,
            duration: duration * FIREWORK_FADE_IN_FRACTION,
            ease: "Sine.easeOut"
        });

    }

    // Stage 2: a one-off radial particle burst — speed/angle/gravity give
    // each particle its own arcing fall, alpha/scale fade them out over
    // their lifetime rather than popping out abruptly. One random color
    // per burst (not per particle) so each firework reads as a single
    // coherent shell, same as a real one.
    burstFirework(x, y) {

        const color = Phaser.Utils.Array.GetRandom(FIREWORK_COLORS);

        const emitter = this.add.particles(x, y, FIREWORK_PARTICLE_KEY, {
            speed: { min: FIREWORK_BURST_SPEED_MIN, max: FIREWORK_BURST_SPEED_MAX },
            angle: { min: 0, max: 360 },
            lifespan: { min: FIREWORK_BURST_LIFESPAN_MIN, max: FIREWORK_BURST_LIFESPAN_MAX },
            gravityY: FIREWORK_GRAVITY_Y,
            alpha: { start: 1, end: 0 },
            scale: { start: 1, end: 0.4 },
            tint: color,
            blendMode: Phaser.BlendModes.ADD,
            emitting: false
        });

        emitter.explode(Phaser.Math.Between(FIREWORK_BURST_COUNT_MIN, FIREWORK_BURST_COUNT_MAX));

        // The emitter has no ongoing purpose after its one burst — clean
        // it up once every particle it spawned has finished (comfortably
        // longer than the longest possible lifespan).
        this.time.delayedCall(FIREWORK_BURST_LIFESPAN_MAX + 200, () => emitter.destroy());

    }

}

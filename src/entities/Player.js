import Phaser from "phaser";
import AudioManager from "../managers/AudioManager";

const SPEED = 180;

// How often a footstep sfx fires while moving, in ms — tuned to feel like a
// walk cadence rather than firing every frame (AudioManager.playFootstepSfx
// itself handles which of the 10 footstep files to pick).
const FOOTSTEP_INTERVAL = 350;

// Visual canvas: 1 tile wide x 2 tiles tall (matches TILE_SIZE=32, i.e.
// 16x32 at native 16px-per-tile resolution, displayed at 2x). Collision
// footprint stays feet-sized and independent of the taller visual — see
// the body setSize/setOffset below.
const WIDTH = 32;
const HEIGHT = 64;
const BODY_SIZE = 16;

export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {

        // Real character art (see BootScene.js) has a distinct idle/walk
        // texture per direction, each with a different native pixel size
        // (idle poses are cropped to their own "content" sub-frame; the 4
        // walk spritesheets aren't all quite the same native cell size
        // either). hasArt picks between that and the flat-color rectangle
        // this class used before it existed — same "degrade gracefully if
        // the texture never loaded" convention as WorldObjects.js.
        const hasArt = scene.textures.exists("player-idle-down");

        if (!hasArt && !scene.textures.exists("player")) {
            const g = scene.add.graphics();

            g.fillStyle(0x355c7d);
            g.fillRect(0, 0, WIDTH, HEIGHT);

            g.generateTexture("player", WIDTH, HEIGHT);
            g.destroy();
        }

        const initialTexture = hasArt ? "player-idle-down" : "player";
        const initialFrame = hasArt ? "content" : undefined;

        super(scene, x, y, initialTexture, initialFrame);

        this.hasArt = hasArt;
        this.facing = "down";

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Bottom-center anchor: the sprite extends upward from the
        // character's feet, matching the ground-contact convention used
        // by trees and buildings (see WorldObjects.js).
        this.setOrigin(0.5, 1);

        this.setCollideWorldBounds(true);

        if (hasArt) {

            // Every direction's idle "content" crop and walk spritesheet
            // cell has its own native pixel size, so a single setDisplaySize
            // call at construction wouldn't hold — Sprite.setDisplaySize
            // derives scaleX/scaleY from the CURRENT frame once and doesn't
            // recompute them when a later frame has different native
            // dimensions. Reapplying it on every animation frame change
            // keeps the on-screen size constant no matter which texture
            // it's actually showing.
            //
            // Arcade Body width/height/offset are specified in the same
            // "native frame" pixel space as the sprite's own frame — Arcade
            // Physics multiplies them by the GameObject's current
            // scaleX/scaleY to get the actual world-space collision box
            // (confirmed empirically: setting BODY_SIZE directly here
            // produced a body under 1px wide once scaleX dropped to ~0.05
            // for the idle art's much-larger native canvas). Dividing by
            // the scale setDisplaySize just computed cancels that back out
            // to an exact BODY_SIZE x BODY_SIZE world-space box every time,
            // regardless of which texture is currently showing.
            // ANIMATION_UPDATE only fires when playback advances from one
            // frame to the next — it never fires for a single-frame idle
            // animation, so switching walk -> idle would otherwise keep
            // whatever scale the last walk frame left behind (confirmed
            // empirically: idle poses rendered oversized, scaled as if
            // they were still the much-smaller walk-frame texture).
            // ANIMATION_START covers that case — it fires once whenever
            // any animation begins playing, including 1-frame ones.
            this.applyDisplaySizeAndBody();
            this.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => {
                this.applyDisplaySizeAndBody();
            });
            this.on(Phaser.Animations.Events.ANIMATION_START, () => {
                this.applyDisplaySizeAndBody();
            });

            this.anims.play("player-idle-down");

        } else {

            // No real art: native texture is already exactly WIDTH x
            // HEIGHT (see the flat-rectangle generateTexture call above),
            // so scale is always 1 and body units equal world-space units
            // directly — same fixed setSize/setOffset this class always used.
            this.body.setSize(BODY_SIZE, BODY_SIZE);
            this.body.setOffset((WIDTH - BODY_SIZE) / 2, HEIGHT - BODY_SIZE);

        }

        this.lastFootstepAt = 0;

        this.cursors = scene.input.keyboard.createCursorKeys();

        this.keys = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });
    }

    update() {

        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown || this.keys.left.isDown) {
            vx = -1;
        } else if (this.cursors.right.isDown || this.keys.right.isDown) {
            vx = 1;
        }

        if (this.cursors.up.isDown || this.keys.up.isDown) {
            vy = -1;
        } else if (this.cursors.down.isDown || this.keys.down.isDown) {
            vy = 1;
        }

        const moving = vx !== 0 || vy !== 0;

        if (moving) {
            const len = Math.hypot(vx, vy);
            vx /= len;
            vy /= len;
        }

        this.setVelocity(vx * SPEED, vy * SPEED);

        if (this.hasArt) {
            this.updateAnimation(vx, vy, moving);
        }

        if (moving) {

            const now = this.scene.time.now;

            if (now - this.lastFootstepAt >= FOOTSTEP_INTERVAL) {
                this.lastFootstepAt = now;
                AudioManager.playFootstepSfx(this.scene);
            }

        }

    }

    // Horizontal movement takes facing priority over vertical on a
    // diagonal press (e.g. up+right faces right) — an arbitrary but
    // deterministic tiebreak, since the 4-direction art has no diagonal
    // pose to prefer instead. Stationary keeps whatever direction was
    // last faced, matching how most top-down character controllers behave
    // (an idle character keeps facing the way it was walking).
    updateAnimation(vx, vy, moving) {

        if (moving) {
            this.facing = vx !== 0 ? (vx < 0 ? "left" : "right") : (vy < 0 ? "up" : "down");
        }

        const key = `player-${moving ? "walk" : "idle"}-${this.facing}`;

        if (this.scene.anims.exists(key)) {
            this.anims.play(key, true);
        }

    }

    // See the constructor comment above for why this needs to run on
    // every frame change, not just once.
    applyDisplaySizeAndBody() {

        this.setDisplaySize(WIDTH, HEIGHT);

        const bodyWidth = BODY_SIZE / this.scaleX;
        const bodyHeight = BODY_SIZE / this.scaleY;

        this.body.setSize(bodyWidth, bodyHeight);
        this.body.setOffset((this.width - bodyWidth) / 2, this.height - bodyHeight);

    }
}

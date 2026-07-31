import Phaser from "phaser";

const SPEED = 180;

// Visual canvas: 1 tile wide x 2 tiles tall (matches TILE_SIZE=32, i.e.
// 16x32 at native 16px-per-tile resolution, displayed at 2x). Collision
// footprint stays feet-sized and independent of the taller visual — see
// the body setSize/setOffset below.
const WIDTH = 32;
const HEIGHT = 64;
const BODY_SIZE = 16;

export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        // Create a tiny texture the first time we need it
        if (!scene.textures.exists("player")) {
            const g = scene.add.graphics();

            g.fillStyle(0x355c7d);
            g.fillRect(0, 0, WIDTH, HEIGHT);

            g.generateTexture("player", WIDTH, HEIGHT);
            g.destroy();
        }

        super(scene, x, y, "player");

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Bottom-center anchor: the sprite extends upward from the
        // character's feet, matching the ground-contact convention used
        // by trees and buildings (see WorldObjects.js).
        this.setOrigin(0.5, 1);

        this.setCollideWorldBounds(true);

        // Footprint/collision box stays feet-sized, positioned at the
        // bottom of the taller visual canvas rather than its center.
        this.body.setSize(BODY_SIZE, BODY_SIZE);
        this.body.setOffset((WIDTH - BODY_SIZE) / 2, HEIGHT - BODY_SIZE);

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

        if (vx !== 0 || vy !== 0) {
            const len = Math.hypot(vx, vy);
            vx /= len;
            vy /= len;
        }

        this.setVelocity(vx * SPEED, vy * SPEED);
    }
}
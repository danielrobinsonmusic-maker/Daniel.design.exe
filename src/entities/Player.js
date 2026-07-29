import Phaser from "phaser";

const SPEED = 180;

export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        // Create a tiny texture the first time we need it
        if (!scene.textures.exists("player")) {
            const g = scene.add.graphics();

            g.fillStyle(0x355c7d);
            g.fillRect(0, 0, 16, 16);

            g.generateTexture("player", 16, 16);
            g.destroy();
        }

        super(scene, x, y, "player");

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);

        this.body.setSize(16, 16);

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
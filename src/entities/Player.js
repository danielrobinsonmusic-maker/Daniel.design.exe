import Phaser from "phaser";

const SPEED = 180;

export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;

        // simple rectangle as a placeholder player graphic
        this.sprite = scene.add.rectangle(x, y, 16, 16, 0x355c7d);

        // allow camera to follow this object by providing x/y accessors
        Object.defineProperty(this, 'x', {
            get: () => this.sprite.x,
            set: (v) => { this.sprite.x = v; }
        });

        Object.defineProperty(this, 'y', {
            get: () => this.sprite.y,
            set: (v) => { this.sprite.y = v; }
        });

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

        if (this.cursors.left.isDown || this.keys.left.isDown) vx = -1;
        else if (this.cursors.right.isDown || this.keys.right.isDown) vx = 1;

        if (this.cursors.up.isDown || this.keys.up.isDown) vy = -1;
        else if (this.cursors.down.isDown || this.keys.down.isDown) vy = 1;

        const len = Math.hypot(vx, vy);
        if (len > 0) {
            vx = (vx / len) * SPEED * (this.scene.game.loop.delta / 1000);
            vy = (vy / len) * SPEED * (this.scene.game.loop.delta / 1000);
        } else {
            vx = 0; vy = 0;
        }

        this.sprite.x += vx;
        this.sprite.y += vy;
    }
}
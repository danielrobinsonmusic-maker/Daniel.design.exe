import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {
    constructor() {
        super("Boot");
    }

    preload() {
        // Assets will be loaded here later.
    }

    create() {
        this.scene.start("Title");
    }
}
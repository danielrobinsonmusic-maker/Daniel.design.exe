import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {

    constructor() {
        super("Boot");
    }

    preload() {

        this.load.image(
            "tiles",
            "assets/kenney_rpg-urban-pack/Tilemap/tilemap_packed.png"
        );

    }

    create() {

        this.scene.start("Title");

    }

}
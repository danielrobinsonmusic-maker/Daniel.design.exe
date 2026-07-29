import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {

    constructor() {
        super("Boot");
    }

    preload() {

        // -------------------------------------------------
        // Kenney Urban Pack
        // -------------------------------------------------

        this.load.image(
            "tiles",
            "tiles/tilemap.png"
        );

    }

    create() {

        // Verify the tilesheet loaded successfully.
        console.log("Tiles loaded:", this.textures.exists("tiles"));

        this.scene.start("Title");

    }

}
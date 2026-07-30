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

        // -------------------------------------------------
        // UI chrome (used by Panel.js for menus/dialogs)
        // -------------------------------------------------

        this.load.image("ui-panel", "assets/ui/panel.png");

        // titlebar.png is still an empty placeholder — Panel.js falls back
        // to a flat title bar when this texture isn't loaded. Add the load
        // call back once real art lands in assets/ui/titlebar.png.

    }

    create() {

        // Verify the tilesheet loaded successfully.
        console.log("Tiles loaded:", this.textures.exists("tiles"));

        this.scene.start("Title");

    }

}
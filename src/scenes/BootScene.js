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

        // -------------------------------------------------
        // Buildings
        // -------------------------------------------------

        this.load.image("library-building", "assets/buildings/library.png");
        this.load.image("gallery-building", "assets/buildings/gallery.png");
        this.load.image("workshop-building", "assets/buildings/workshop.png");
        this.load.image("cafe-building", "assets/buildings/cafe.png");
        this.load.image("theatre-building", "assets/buildings/theatre.png");

    }

    create() {

        // Verify the tilesheet loaded successfully.
        console.log("Tiles loaded:", this.textures.exists("tiles"));

        // panel.png is a 1536x1024 export with a lot of dead gradient
        // padding around the actual ornate frame (which only lives in the
        // [410,187]-[1124,845] sub-rect). Crop a frame down to just that
        // content so Panel.js's setDisplaySize() scales the real artwork
        // to fill its target size instead of stretching the padding too.
        if (this.textures.exists("ui-panel")) {
            const panelTexture = this.textures.get("ui-panel");
            if (!panelTexture.has("content")) {
                panelTexture.add("content", 0, 410, 187, 714, 658);
            }
        }

        this.scene.start("Title");

    }

}
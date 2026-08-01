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

        // -------------------------------------------------
        // Decor
        // -------------------------------------------------

        this.load.image("fountain1", "assets/decor/fountain/fountain1.png");
        this.load.image("fountain2", "assets/decor/fountain/fountain2.png");
        this.load.image("fountain3", "assets/decor/fountain/fountain3.png");
        this.load.image("fountain4", "assets/decor/fountain/fountain4.png");

        this.load.image("torii-gate", "assets/decor/torii.png");

        // -------------------------------------------------
        // Ground tiles
        // -------------------------------------------------

        this.load.image("grass-base", "assets/tiles/grass-base.png");
        this.load.image("grass-base1", "assets/tiles/grass-base1.png");
        this.load.image("grass1", "assets/tiles/grass1.png");
        this.load.image("flowers1", "assets/tiles/flowers1.png");
        this.load.image("flowers2", "assets/tiles/flowers2.png");
        this.load.image("flowers4", "assets/tiles/flowers4.png");
        this.load.image("path", "assets/tiles/path.png");
        this.load.image("path1", "assets/tiles/path1.png");
        this.load.image("path2", "assets/tiles/path2.png");
        this.load.image("path-corner", "assets/tiles/path-corner.png");
        this.load.image("square1", "assets/tiles/square1.png");
        this.load.image("square2", "assets/tiles/square2.png");
        this.load.image("square3", "assets/tiles/square3.png");

        // -------------------------------------------------
        // Nature (trees)
        // -------------------------------------------------

        this.load.image("tree1", "assets/nature/tree1.png");
        this.load.image("tree2", "assets/nature/tree2.png");
        this.load.image("tree3", "assets/nature/tree3.png");
        this.load.image("tree4", "assets/nature/tree4.png");

        // -------------------------------------------------
        // Scenes (standalone backgrounds, not tile-based)
        // -------------------------------------------------

        this.load.image("overlook-bg", "assets/scenes/overlook.png");

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

        // torii.png is a 1536x1024 export with a soft glow/vignette padded
        // around the actual gate — real content only lives in the
        // (110,63)-(1427,963) sub-rect (measured via PIL alpha bbox). Same
        // technique as ui-panel above: a GameObject-level setCrop() anchors
        // origin/displaySize against the FULL frame dimensions regardless
        // of the crop, which put the gate's origin ~60% off — a named
        // sub-frame makes the cropped content its own frame instead, so
        // origin/setDisplaySize math is based on the actual visible art.
        if (this.textures.exists("torii-gate")) {
            const toriiTexture = this.textures.get("torii-gate");
            if (!toriiTexture.has("content")) {
                toriiTexture.add("content", 0, 110, 63, 1317, 900);
            }
        }

        // tree1-4.png are each a 100x100 canvas with 21-25px of transparent
        // padding below the actual trunk/foliage (measured via PIL alpha
        // bbox) — the bottom-anchor origin was anchoring to the padded
        // canvas edge, not the visible trunk base, so every tree rendered
        // ~54-64 display px "too high." Most noticeable at the south
        // border, where the gap between each tree's real bottom and its
        // anchor let the path/grass show through right where the border
        // should read as solid. Same named-sub-frame technique as
        // ui-panel/torii-gate above.
        const TREE_CROPS = {
            tree1: [27, 18, 46, 58],
            tree2: [24, 17, 51, 61],
            tree3: [33, 19, 34, 56],
            tree4: [32, 21, 34, 58]
        };
        Object.entries(TREE_CROPS).forEach(([key, [x, y, w, h]]) => {
            if (this.textures.exists(key)) {
                const tex = this.textures.get(key);
                if (!tex.has("content")) {
                    tex.add("content", 0, x, y, w, h);
                }
            }
        });

        // Registered once here (not in WorldScene) since anims live on the
        // global AnimationManager — re-running WorldScene.create() every
        // time the player re-enters the World would otherwise try to
        // recreate a key that already exists.
        if (!this.anims.exists("fountain-flow")) {
            this.anims.create({
                key: "fountain-flow",
                frames: [
                    { key: "fountain1" },
                    { key: "fountain2" },
                    { key: "fountain3" },
                    { key: "fountain4" }
                ],
                frameRate: 4,
                repeat: -1
            });
        }

        this.scene.start("Title");

    }

}
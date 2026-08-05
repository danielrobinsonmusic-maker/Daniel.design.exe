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
        this.load.image("dialogue-panel", "assets/ui/dialogue-panel.png");

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

        this.load.image("bench", "assets/decor/bench.png");
        this.load.image("flowerbox", "assets/decor/flowerbox.png");
        this.load.image("signpost", "assets/decor/signpost.png");
        this.load.image("lamppost", "assets/decor/lamppost.png");

        // -------------------------------------------------
        // Ambient wildlife (birds, butterflies)
        // -------------------------------------------------

        this.load.image("bird1", "assets/ambient/bird1.png");
        this.load.image("bird2", "assets/ambient/bird2.png");
        this.load.image("butterfly1", "assets/ambient/butterfly1.png");
        this.load.image("butterfly2", "assets/ambient/butterfly2.png");
        this.load.image("petal", "assets/ambient/petal.png");

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
        this.load.image("library-room", "assets/scenes/library-room.png");
        this.load.image("library-bookshelf-closeup", "assets/scenes/library-bookshelf-closeup.png");
        this.load.image("library-librarian-closeup", "assets/scenes/library-librarian-closeup.png");
        this.load.image("cafe-room", "assets/scenes/cafe-room.png");
        this.load.image("workshop-room", "assets/scenes/workshop-room.png");
        this.load.image("gallery-room", "assets/scenes/gallery-room.png");
        this.load.image("theatre-room", "assets/scenes/theatre-room.png");

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

        // dialogue-panel.png (AdventureBar.js's point-and-click prompt
        // panel) is another 1536x1024 export with the same dead-padding
        // problem — real content (the ornate frame) only lives in the
        // (55,170)-(1480,663) sub-rect (measured via PIL alpha bbox). Same
        // technique as ui-panel above.
        if (this.textures.exists("dialogue-panel")) {
            const dialoguePanelTexture = this.textures.get("dialogue-panel");
            if (!dialoguePanelTexture.has("content")) {
                dialoguePanelTexture.add("content", 0, 55, 170, 1425, 493);
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

        // Building art is a set of portrait/landscape illustrations, each
        // with a soft-edged transparent margin around the actual building
        // (measured via PIL alpha bbox) — most noticeably at the BOTTOM of
        // the canvas (Theatre: 450px/29%, Library: 343px/22% of their
        // native height; the other three are a much smaller 4-9%). Anchor
        // origin is bottom-center, so that margin was being anchored as if
        // it were part of the building — the real facade sat that many
        // pixels above the footprint/path, reading as "floating" above
        // where it should meet the ground. Same named-sub-frame technique
        // as ui-panel/torii-gate/trees above.
        const BUILDING_CROPS = {
            "gallery-building": [0, 42, 1024, 1431],
            "theatre-building": [47, 125, 917, 961],
            "cafe-building": [112, 77, 1355, 860],
            "library-building": [28, 257, 969, 936],
            "workshop-building": [281, 37, 973, 893]
        };
        Object.entries(BUILDING_CROPS).forEach(([key, [x, y, w, h]]) => {
            if (this.textures.exists(key)) {
                const tex = this.textures.get(key);
                if (!tex.has("content")) {
                    tex.add("content", 0, x, y, w, h);
                }
            }
        });

        // Small plaza/street furniture — same soft-vignette illustration
        // style as the buildings, same transparent-margin problem (measured
        // via PIL alpha bbox), same fix.
        const DECOR_CROPS = {
            bench: [457, 328, 718, 291],
            flowerbox: [464, 372, 728, 214],
            signpost: [506, 118, 538, 729],
            lamppost: [581, 58, 407, 866]
        };
        Object.entries(DECOR_CROPS).forEach(([key, [x, y, w, h]]) => {
            if (this.textures.exists(key)) {
                const tex = this.textures.get(key);
                if (!tex.has("content")) {
                    tex.add("content", 0, x, y, w, h);
                }
            }
        });

        // Ambient wildlife/effects (birds, butterflies, falling petals) —
        // same 1536x1024 soft-vignette export style as everything else
        // above, same fix (measured via PIL alpha bbox). Without this,
        // setDisplaySize() would scale the whole padded canvas down to its
        // target size, making the actual art a tiny speck in the middle.
        const AMBIENT_CROPS = {
            bird1: [537, 305, 441, 282],
            bird2: [537, 328, 439, 268],
            butterfly1: [681, 370, 237, 183],
            butterfly2: [655, 358, 243, 194],
            petal: [723, 424, 120, 98]
        };
        Object.entries(AMBIENT_CROPS).forEach(([key, [x, y, w, h]]) => {
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
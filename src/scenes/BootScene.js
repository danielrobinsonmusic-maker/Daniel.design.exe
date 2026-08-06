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
        this.load.image("cat-achievement", "assets/ui/cat-achievement.png");

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
        // Player
        // -------------------------------------------------

        // Idle poses: one static illustration per direction, same soft-
        // vignette export style as buildings/trees/decor (see the
        // "content" sub-frame crops below).
        this.load.image("player-idle-down", "assets/player/idle-down.png");
        this.load.image("player-idle-up", "assets/player/idle-up.png");
        this.load.image("player-idle-left", "assets/player/idle-left.png");
        this.load.image("player-idle-right", "assets/player/idle-right.png");

        // Walk cycles: each file is a uniform 6x6 grid (36 frames) of that
        // direction's stride, loaded as a spritesheet so Phaser auto-slices
        // it into frames 0-35 — frameWidth/frameHeight is just the file's
        // own pixel dimensions divided by 6 (confirmed to divide evenly).
        // Player.js's animations only use a spaced-out subset of the 36
        // (see BUILD_PLAYER_ANIMATIONS below) rather than all of them.
        this.load.spritesheet("player-walk-down", "assets/player/walk-down.png", { frameWidth: 2394 / 6, frameHeight: 4872 / 6 });
        this.load.spritesheet("player-walk-up", "assets/player/walk-up.png", { frameWidth: 2190 / 6, frameHeight: 4872 / 6 });
        this.load.spritesheet("player-walk-left", "assets/player/walk-left.png", { frameWidth: 2382 / 6, frameHeight: 4866 / 6 });
        this.load.spritesheet("player-walk-right", "assets/player/walk-right.png", { frameWidth: 2412 / 6, frameHeight: 4890 / 6 });

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

        // Not animated/roaming like the above — a single static hand-placed
        // decoration next to the torii gate (see WorldObjects.js's
        // createGateCat). Lives in the same folder since it's the same
        // "ambient life around town" category of asset.
        this.load.image("cat", "assets/ambient/cat.png");

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
        this.load.image("bush1", "assets/nature/bush1.png");
        this.load.image("bush2", "assets/nature/bush2.png");

        // -------------------------------------------------
        // Scenes (standalone backgrounds, not tile-based)
        // -------------------------------------------------

        // Two variants — which one OverlookScene actually displays depends
        // on the hidden five-building cat achievement (see
        // managers/CatAchievement.js): overlook1.png (no cat) is the
        // default, overlook.png (with the cat) only shows once all five
        // flags are set.
        this.load.image("overlook-bg", "assets/scenes/overlook1.png");
        this.load.image("overlook-bg-achieved", "assets/scenes/overlook.png");
        this.load.image("library-room", "assets/scenes/library-room.png");
        this.load.image("library-bookshelf-closeup", "assets/scenes/library-bookshelf-closeup.png");
        this.load.image("library-librarian-closeup", "assets/scenes/library-librarian-closeup.png");
        this.load.image("library-book", "assets/scenes/library-book.png");
        this.load.image("cafe-room", "assets/scenes/cafe-room.png");
        this.load.image("cafe-barista-closeup", "assets/scenes/cafe-room-closeup.png");
        this.load.image("workshop-room", "assets/scenes/workshop-room.png");
        this.load.image("gallery-room", "assets/scenes/gallery-room.png");
        this.load.image("theatre-room", "assets/scenes/theatre-room.png");
        this.load.image("theatre-attendant-closeup", "assets/scenes/theatre-room-closeup.png");
        this.load.image("theatre-room-screen", "assets/scenes/theatre-room-screen.png");

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

        // cat-achievement.png (CatAchievementPopup.js's hidden-achievement
        // toast) is another 1536x1024 export with the same dead-padding
        // problem — the real banner only lives in the (168,349)-(1400,623)
        // sub-rect (measured via PIL alpha bbox; alpha>10 and alpha>200
        // bboxes came back near-identical, so the art has no soft glow
        // bleeding past the banner's own edge worth preserving). Same
        // technique as dialogue-panel above.
        if (this.textures.exists("cat-achievement")) {
            const catAchievementTexture = this.textures.get("cat-achievement");
            if (!catAchievementTexture.has("content")) {
                catAchievementTexture.add("content", 0, 168, 349, 1232, 274);
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

        // bush1/bush2.png are each a 128x128 canvas with the actual bush
        // clump occupying only the middle third or so (measured via PIL
        // alpha bbox) — same "content" sub-frame technique as the trees
        // above, so bottom-anchoring lands on the bush's real base instead
        // of the padded canvas edge.
        const BUSH_CROPS = {
            bush1: [40, 46, 49, 45],
            bush2: [33, 51, 62, 40]
        };
        Object.entries(BUSH_CROPS).forEach(([key, [x, y, w, h]]) => {
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

        // Player idle poses — same soft-vignette illustration style as
        // buildings/decor (measured via PIL alpha bbox), same fix. The walk
        // spritesheets don't need this: each of their 36 grid cells already
        // has the character's feet within a few px of the cell's bottom
        // edge (confirmed by measuring several sampled frames), unlike
        // these single-image idle poses which have real padding on every
        // side.
        const PLAYER_IDLE_CROPS = {
            "player-idle-down": [219, 66, 575, 1304],
            "player-idle-up": [246, 75, 529, 1282],
            "player-idle-left": [313, 48, 486, 1375],
            "player-idle-right": [273, 63, 454, 1289]
        };
        Object.entries(PLAYER_IDLE_CROPS).forEach(([key, [x, y, w, h]]) => {
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
            petal: [723, 424, 120, 98],
            cat: [550, 384, 270, 387]
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

        // Player idle + walk animations, one pair per direction. Each
        // walk-*.png is a uniform 6x6 (36-frame) contact sheet of a single
        // continuous stride sequence, read left-to-right/top-to-bottom —
        // frame-to-frame pixel-diffing every direction's sheet (not just
        // eyeballing a few frames) showed no single short repeating cycle
        // common to all four sheets (down/up drift gradually across the
        // full 36; left/right stride on a ~13-14 frame period), so rather
        // than special-case a different sample per direction, this takes
        // one evenly-spaced 6-frame subset — every 6th frame — across all
        // 36, verified (by the same diffing) to have no jarring jump
        // anywhere in its loop, including the wrap from the last sampled
        // frame back to the first.
        const WALK_FRAME_SAMPLE = [0, 6, 12, 18, 24, 30];
        const DIRECTIONS = ["down", "up", "left", "right"];

        DIRECTIONS.forEach((direction) => {

            const idleKey = `player-idle-${direction}`;
            const walkKey = `player-walk-${direction}`;

            if (this.textures.exists(idleKey) && !this.anims.exists(idleKey)) {
                this.anims.create({
                    key: idleKey,
                    frames: [{ key: idleKey, frame: "content" }],
                    frameRate: 1,
                    repeat: -1
                });
            }

            if (this.textures.exists(walkKey) && !this.anims.exists(walkKey)) {
                this.anims.create({
                    key: walkKey,
                    frames: WALK_FRAME_SAMPLE.map((frame) => ({ key: walkKey, frame })),
                    frameRate: 8,
                    repeat: -1
                });
            }

        });

        this.scene.start("Title");

    }

}
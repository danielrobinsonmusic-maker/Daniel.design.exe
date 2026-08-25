import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {

    constructor() {
        super("Boot");
    }

    // Plain Graphics/Text, no new art asset — GameObjects can be created
    // during preload() itself (the scene's systems are already up, only
    // its own load queue is pending), so this is visible from the very
    // first frame of boot rather than waiting for create(). Nothing needs
    // to destroy this explicitly: Phaser tears the whole scene down when
    // create() calls scene.start("Title") at the end of this file.
    createLoadingBar() {

        const { width, height } = this.scale;
        const barWidth = width * 0.5;
        const barHeight = 18;
        const barX = (width - barWidth) / 2;
        const barY = height / 2 - barHeight / 2;

        this.add.text(width / 2, barY - 30, "Daniel.design.exe", {
            fontFamily: "monospace",
            fontSize: "28px",
            color: "#ffffff"
        }).setOrigin(0.5);

        const track = this.add.graphics();
        track.lineStyle(2, 0x666666, 1);
        track.strokeRect(barX, barY, barWidth, barHeight);

        const fill = this.add.graphics();

        const percentText = this.add.text(width / 2, barY + barHeight + 20, "0%", {
            fontFamily: "monospace",
            fontSize: "16px",
            color: "#aaaaaa"
        }).setOrigin(0.5);

        this.load.on(Phaser.Loader.Events.PROGRESS, (value) => {

            fill.clear();
            fill.fillStyle(0x66ff99, 1);
            fill.fillRect(barX + 2, barY + 2, (barWidth - 4) * value, barHeight - 4);

            percentText.setText(`${Math.round(value * 100)}%`);

        });

    }

    preload() {

        this.createLoadingBar();

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
        this.load.image("guybrush", "assets/ui/guybrush.png");
        this.load.image("zoom", "assets/ui/zoom.png");
        this.load.image("minimap-frame", "assets/ui/minimap-frame.png");

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
        this.load.image("cathouse", "assets/buildings/cathouse.png");

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
        this.load.image("murray", "assets/decor/murray.png");

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

        // Every Room/Closeup backdrop and every TakeoverFrame "frame" image
        // used to load here unconditionally, regardless of whether the
        // player ever entered that building — ~32.5MB across 17 files, none
        // of it needed to reach or render the town square. Each one is now
        // loaded by the specific scene that actually uses it, in that
        // scene's own preload() (Phaser blocks that scene's create() until
        // its own preload() queue finishes, same mechanism this file uses,
        // just scoped smaller): OverlookScene loads overlook-bg/
        // overlook-bg-achieved, LibraryScene loads library-room/
        // library-bookshelf-closeup/library-librarian-closeup/library-book,
        // CafeScene loads cafe-room/cafe-barista-closeup, WorkshopScene
        // loads workshop-room/workshop-blueprint/computer-screen/
        // music-player, GalleryScene loads gallery-room/gallery-frame,
        // TheatreScene loads theatre-room/theatre-attendant-closeup/
        // theatre-room-screen. Every TakeoverFrame frameKey texture is
        // reachable from exactly one building, so bundling it into that
        // building's own preload() means TakeoverFrameScene.js itself needs
        // no loading logic of its own for frame art — by the time a player
        // reaches any Takeover, they've always already passed through the
        // owning building's Room scene first.

        // -------------------------------------------------
        // Audio (see managers/AudioManager.js)
        // -------------------------------------------------

        this.load.audio("music-town", "assets/audio/music/Town.mp3");
        // Permanently replaces music-town as Town's own music layer once
        // the player has heard every one of Murray's flavor lines at least
        // once (see WorldScene's MURRAY_ALL_LINES_HEARD_FLAG and
        // AudioManager.playTownMIMusic) — not a building/area track of its
        // own, hence living right next to music-town rather than down with
        // the per-building tracks below.
        this.load.audio("music-town-mi", "assets/audio/music/MI.mp3");
        // Plays through both onboarding scenes (Title's New Visitor/
        // Continue screen and the name-entry screen right after it) — see
        // AudioManager.playOnboardingMusic, called from both TitleScene
        // and NameScene with the same "already playing, don't restart"
        // guard playArea's own area tracks use, so the same instance just
        // keeps going uninterrupted across that scene transition.
        this.load.audio("music-onboarding", "assets/audio/music/heartshapedbox.mp3");
        this.load.audio("music-overlook", "assets/audio/music/Overlook.mp3");
        this.load.audio("ambient-town", "assets/audio/ambient/town-ambient.mp3");
        this.load.audio("ambient-overlook", "assets/audio/ambient/overlook-ambient.mp3");
        this.load.audio("ambient-overlook2", "assets/audio/ambient/overlook-ambient2.mp3");
        this.load.audio("sfx-fountain", "assets/audio/sfx/fountain.mp3");

        // Per-building music (music-library/cafe/workshop/theatre/gallery —
        // 16.72MB total, music-workshop alone is 9.93MB) used to load here
        // too — moved to each Room scene's own preload() alongside its
        // backdrop, same reasoning as the Scenes section above. Each Room
        // scene swaps its own track in over Town's music layer on entry
        // (see AudioManager.playBuildingMusic) exactly as before; it just
        // isn't fetched over the network until that building is actually
        // entered.

        // UI/interaction sfx — see managers/AudioManager.js's SFX map for
        // how each of these actually gets triggered (hover/click/scene
        // transition/viewer open-close/page turn/achievement/footsteps),
        // all through that one shared utility rather than hardcoded per
        // building.
        this.load.audio("sfx-hover", "assets/audio/sfx/impactWood_heavy_001.ogg");
        this.load.audio("sfx-click", "assets/audio/sfx/click5.ogg");
        this.load.audio("sfx-transition", "assets/audio/sfx/confirmation_001.ogg");
        this.load.audio("sfx-enter-cafe", "assets/audio/sfx/enter-building.mp3");
        // These three play on BOTH entering and leaving their building (see
        // AudioManager's BUILDING_ENTRY_SFX/BUILDING_EXIT_SFX), unlike
        // sfx-enter-cafe above which is entry-only.
        this.load.audio("sfx-door-library", "assets/audio/sfx/doorOpen_2.ogg");
        this.load.audio("sfx-door-gallery", "assets/audio/sfx/doorClose_2.ogg");
        this.load.audio("sfx-door-workshop", "assets/audio/sfx/doorClose_1.ogg");
        this.load.audio("sfx-viewer-open", "assets/audio/sfx/bookOpen.ogg");
        this.load.audio("sfx-viewer-close", "assets/audio/sfx/bookClose.ogg");
        this.load.audio("sfx-page-turn", "assets/audio/sfx/bookFlip2.ogg");
        this.load.audio("sfx-achievement", "assets/audio/sfx/achievement1.mp3");
        // Overrides the generic sfx-click specifically for the Workshop's
        // computer hitbox (see WorkshopScene.js's clickSfx override on that
        // one addHitbox call).
        this.load.audio("sfx-computer-select", "assets/audio/sfx/confirmation_002.ogg");
        // Every cat interaction across every building (each Room scene's
        // petCat hitbox, plus Edison in WorldScene — also a cat, see
        // AudioManager.playCatSfx) uses this instead of the generic click.
        this.load.audio("sfx-cat", "assets/audio/sfx/cat.mp3");
        // Fountain "make a wish" interaction (see WorldScene's
        // updateFountainWishInteraction / AudioManager.playWishSfx) — two
        // separate files chained one after the other, not a single
        // pre-mixed clip.
        this.load.audio("sfx-coin", "assets/audio/sfx/coin.mp3");
        this.load.audio("sfx-coin-splash", "assets/audio/sfx/coinsplash.mp3");

        for (let i = 0; i < 10; i++) {
            this.load.audio(`sfx-footstep-${i}`, `assets/audio/sfx/footstep${String(i).padStart(2, "0")}.ogg`);
        }

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

        // guybrush.png (NPCAchievementPopup.js's "talked to everyone in
        // town" toast — see managers/NPCAchievement.js) is another
        // 1254x1254 export with the same dead-padding problem — real
        // content only lives in the (13,435)-(1242,759) sub-rect (measured
        // via PIL alpha bbox). Same technique as cat-achievement above.
        if (this.textures.exists("guybrush")) {
            const guybrushTexture = this.textures.get("guybrush");
            if (!guybrushTexture.has("content")) {
                guybrushTexture.add("content", 0, 13, 435, 1229, 324);
            }
        }

        // zoom.png (Cursor.js's magnifying-glass cursor, shown in place of
        // the usual arrow while zoomed into a PDF page or other viewer
        // content — see TakeoverFrameScene's openPageZoom/closePageZoom)
        // is another 1536x1024 export with the same dead-padding problem —
        // real content only lives in the (454,137)-(1105,813) sub-rect
        // (measured via PIL alpha bbox). Same technique as ui-panel above.
        if (this.textures.exists("zoom")) {
            const zoomTexture = this.textures.get("zoom");
            if (!zoomTexture.has("content")) {
                zoomTexture.add("content", 0, 454, 137, 651, 676);
            }
        }

        // minimap-frame.png is a 1254x1254 export with transparent padding
        // around a wood picture-frame (real content only lives in the
        // (10,169)-(1244,1041) sub-rect, measured via PIL alpha bbox) —
        // same technique as ui-panel above. Minimap.js draws its own map
        // content (forest/clearing fill, location dots, the player marker)
        // directly on top of the frame's own baked-in parchment interior,
        // using fractions of this cropped content rect (not the padded
        // canvas) to find where that interior sits.
        if (this.textures.exists("minimap-frame")) {
            const minimapFrameTexture = this.textures.get("minimap-frame");
            if (!minimapFrameTexture.has("content")) {
                minimapFrameTexture.add("content", 0, 10, 169, 1234, 872);
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
        // cathouse.png (Ed's House — a small decorative structure beside
        // the Workshop, see WorldObjects.js's DECOR entry) is a 1254x1254
        // export with the same transparent-margin problem, real content
        // in the (217,25)-(1044,1172) sub-rect. Grouped in with the other
        // buildings here since it's the same illustration style/loaded
        // from the same assets/buildings/ folder, even though it renders
        // through the generic DECOR pipeline rather than BUILDINGS.
        const BUILDING_CROPS = {
            "gallery-building": [0, 42, 1024, 1431],
            "theatre-building": [47, 125, 917, 961],
            "cafe-building": [112, 77, 1355, 860],
            "library-building": [28, 257, 969, 936],
            "workshop-building": [281, 37, 973, 893],
            "cathouse": [217, 25, 827, 1147]
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
            lamppost: [581, 58, 407, 866],
            // murray.png (the demonic skull prop, see WorldObjects.js's
            // DECOR entry / WorldScene.js's updateMurrayInteraction) is a
            // 1024x1536 export with the same transparent-margin problem —
            // real content in the (36,106)-(992,1439) sub-rect.
            murray: [36, 106, 956, 1333]
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
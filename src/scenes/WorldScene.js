import Phaser from "phaser";
import Player from "../entities/Player";
import TileRenderer from "../world/TileRenderer";
import WorldObjects, { DECOR } from "../world/WorldObjects";
import { TREES, BUSHES, createTownSquare, FOUNTAIN_TILE, TOWN_SQUARE_BOUNDS } from "../world/MapData";
import { BUILDINGS, NORTH_BUFFER_ROWS } from "../world/Buildings";
import AmbientWildlife from "../world/AmbientWildlife";
import { isCatAchievementComplete } from "../managers/CatAchievement";
import { checkNPCAchievement } from "../managers/NPCAchievement";
import { showNPCAchievementPopup } from "../ui/NPCAchievementPopup";
import SaveManager from "../managers/SaveManager";
import { withPlayerName } from "../utils/dialogueText";
import AudioManager from "../managers/AudioManager";

// Maps an interaction zone's display name to the scene it leads into.
// Names with no entry here fall through to the console.log placeholder —
// they don't have an interior yet.
const BUILDING_SCENES = {
    "Library": "Library",
    "Gallery": "Gallery",
    "Workshop": "Workshop",
    "Café": "Cafe",
    "Theatre": "Theatre"
};

// Lowercase building keys, same set AudioManager.playBuildingMusic and
// CatAchievement already use — needed here (rather than reusing
// BUILDING_SCENES' values directly) since those are scene keys ("Cafe",
// capitalized) not the lowercase keys AudioManager.playBuildingEntrySfx
// expects.
const BUILDING_KEYS = {
    "Library": "library",
    "Gallery": "gallery",
    "Workshop": "workshop",
    "Café": "cafe",
    "Theatre": "theatre"
};

// Edison sits just east of the torii gate (see WorldObjects.js's
// createGateCat — same CAT_BASE_X/Y math, converted to tile coordinates:
// CAT_BASE_X 1348.5 / TILE_SIZE 32 = tile 42, same row as the gate/Woods
// zone). He's always rendered (see WorldObjects.js), but only interactive
// once the hidden five-building cat achievement is complete — see
// updateInteractions below, which only adds this zone when that's true.
const EDISON_ZONE = { x: 42, y: 1 + NORTH_BUFFER_ROWS, name: "Edison" };
const EDISON_LINE_DURATION = 4000;
const EDISON_LINE = "Hi{{name}}. Let's meet in the Japanese garden beyond the gate.";

// Ed's House sits at tile (66, 27 + NORTH_BUFFER_ROWS) — see
// WorldObjects.js's DECOR_RAW entry for the placement reasoning (same
// math, converted to post-shift coordinates here). The interaction zone
// is one tile south of it (in the open ground in front, not on the
// obstacle tile itself) so the player can actually stand close enough to
// trigger it.
const CATHOUSE_ZONE = { x: 66, y: 28 + NORTH_BUFFER_ROWS, name: "Cathouse" };
const CATHOUSE_THINKING_DURATION = 900;
const CATHOUSE_LINE_DURATION = 2800;
const CATHOUSE_LINE = "I wonder where that cat went...";

// Murray sits at tile (7.5, 1 + NORTH_BUFFER_ROWS) — centered between the
// two nearest bushes, see WorldObjects.js's DECOR_RAW entry for the
// placement reasoning (same math, converted to post-shift coordinates
// here). The interaction zone is one tile south of him, on the nearest
// whole tile (8, not 7.5 — zones are checked against the player's integer
// tile position anyway), in the open walkable side of the gap he sits in.
const MURRAY_ZONE = { x: 8, y: 2 + NORTH_BUFFER_ROWS, name: "Murray" };
const MURRAY_MET_FLAG = "murray.met";
const MURRAY_THINKING_DURATION = 900;
const MURRAY_LINE_DURATION = 3400;
// Chosen fresh (real randomness, not the deterministic hash convention
// used for tile scatter/visuals elsewhere) each time E is pressed — this
// is flavor dialogue variety triggered by an explicit player action, not
// something that needs to render identically across scene re-creates the
// way trees/paths do.
const MURRAY_LINES = [
    "He said he's looking for someone named Guybrush...",
    "He says LeChuck owes him a few pieces o' eight...",
    "He told me to ask him about Loom...",
    "He said Stan sold his boat...",
    "He said he likes this game better than Monkey Island 6...",
    "He said he's between two ferns...",
    "He said he left his body with Herman Toothrot...",
    "He said Disney own's his likeness now...",
    "He said I fight like a \"dairy-producing bovine\"..."
];
// Value is an array of MURRAY_LINES indices heard at least once (not a
// plain boolean per line — one flag key instead of nine), maintained by
// updateMurrayInteraction below. Once every index is present,
// MURRAY_ALL_LINES_HEARD_FLAG fires (exactly once — see the completion
// check) and permanently swaps Town's music to MI.mp3, see
// AudioManager.playTownMIMusic.
const MURRAY_LINES_HEARD_FLAG = "murray.lines-heard";
const MURRAY_ALL_LINES_HEARD_FLAG = "murray.all-lines-heard";

// Fountain ambience — only while the player's own tile is within the town
// square rectangle (TOWN_SQUARE_BOUNDS covers the whole plaza the
// fountain sits at the center of, not just the fountain's own tile), so
// it fades in/out as the player crosses the plaza's edge rather than
// needing a separate, narrower zone of its own.
const FOUNTAIN_SFX_KEY = "sfx-fountain";
const FOUNTAIN_SFX_VOLUME = 0.5;

// "Make a wish" interaction — a single point one tile south of the
// fountain's obstacle block (which spans FOUNTAIN_TILE.y-1 to
// FOUNTAIN_TILE.y+2, see the createObstacle loop below), same
// "interaction zone is the open walkable tile just past the obstacle"
// convention as CATHOUSE_ZONE/MURRAY_ZONE above. Only placed south of the
// fountain (not all four sides) since that's specifically what was asked
// for, and the zone system's distance<=1 check naturally limits it to
// that side without needing any extra direction-facing logic.
const FOUNTAIN_WISH_ZONE = { x: FOUNTAIN_TILE.x, y: FOUNTAIN_TILE.y + 3, name: "FountainWish" };
const FOUNTAIN_WISH_THINKING_DURATION = 900;
const FOUNTAIN_WISH_LINE_DURATION = 2800;
const FOUNTAIN_WISH_LINE = "I feel free...";

export default class WorldScene extends Phaser.Scene {
    constructor() {
        super("World");
    }

    create(data) {
        const TILE_SIZE = 32;
        this.scene.launch("HUD");

        // No-ops if Town's tracks are already playing (this scene's own
        // create() re-runs every time the player walks back out of a
        // building — see AudioManager.js) so re-entering World never
        // restarts the music. stopBuildingMusic() is what actually
        // resumes Town's own music layer after a building visit — playArea
        // alone won't, since "town" never stopped being the current area
        // the whole time the player was inside a building.
        AudioManager.playArea(this, "town");
        AudioManager.stopBuildingMusic();

        // Resumes on MI.mp3 (instead of Town.mp3) if this was already
        // unlocked in an earlier session — playTownMIMusic no-ops on every
        // call after the first, so this is safe to call unconditionally
        // on every create() re-run rather than only right after the flag
        // was just set (see updateMurrayInteraction for that call site).
        if (SaveManager.hasFlag(MURRAY_ALL_LINES_HEARD_FLAG)) {
            AudioManager.playTownMIMusic(this);
        }

        // generate map data
        this.mapData = createTownSquare();

        // world bounds based on map size
        this.physics.world.setBounds(
            0,
            0,
            this.mapData[0].length * TILE_SIZE,
            this.mapData.length * TILE_SIZE
        );

        this.obstacles = this.physics.add.staticGroup();

        // render tiles (graphics only)
        this.tileRenderer = new TileRenderer(this);
        this.tileRenderer.render(this.mapData);

        // trees and buildings are no longer part of the tile grid — spawn
        // them as their own GameObjects so they can be depth-sorted later
        this.worldObjects = new WorldObjects(this).create();

        // animated fountain, replacing the old baked-in WATER tile patch —
        // centered on FOUNTAIN_TILE (MapData.js), the same point
        // TileRenderer.js centers the square2.png plaza patch on. The 4
        // frame images were padded (100x110, transparent fill) so each one's
        // base sits at the same row (89) regardless of how tall that
        // frame's water spray is — origin uses that fraction so the base
        // itself doesn't jitter.
        this.fountain = this.add.sprite(
            (FOUNTAIN_TILE.x * TILE_SIZE) + 16,
            (FOUNTAIN_TILE.y * TILE_SIZE) + 16,
            "fountain1"
        );
        this.fountain.setOrigin(0.5, 89 / 110);
        this.fountain.setScale(2);

        // That origin sits near the BOTTOM of the sprite's own canvas
        // (81% of the way down), which means most of the sprite's total
        // height renders above the anchor point — placing the anchor at
        // the patch's center visually reads as the whole fountain sitting
        // in the upper portion of the square2 patch, not centered in it.
        // Shift down so the sprite's overall bounding box (not just its
        // anchor) centers on the patch instead.
        const patchCenterY = (FOUNTAIN_TILE.y * TILE_SIZE) + 16;
        this.fountain.y = patchCenterY + (this.fountain.displayHeight * (this.fountain.originY - 0.5));

        this.fountain.play("fountain-flow");

        // trees: one solid tile per tree (same footprint as before)
        TREES.forEach(([x, y]) => {
            this.createObstacle(x * TILE_SIZE, y * TILE_SIZE);
        });

        // scattered bushes: same single-tile-at-the-base collision as trees
        BUSHES.forEach(([x, y]) => {
            this.createObstacle(x * TILE_SIZE, y * TILE_SIZE);
        });

        // decor (benches/lampposts/signposts/flower boxes): same
        // single-tile-at-the-base collision as trees — these are physical
        // objects sitting on the ground, not passable.
        DECOR.forEach(({ x, y }) => {
            this.createObstacle(x * TILE_SIZE, y * TILE_SIZE);
        });

        // fountain: unlike trees/bushes/decor, its visual footprint is a
        // wide round basin (roughly 4-5 tiles across at this sprite's
        // scale — see the fountain sprite setup above), not a narrow trunk
        // rising from one tile, so a single-tile obstacle would leave most
        // of the visible fountain walkable. Blocks a 4x4 block centered on
        // FOUNTAIN_TILE instead (a 3x3 block still let the player clip the
        // basin's edge — confirmed against the physics debug overlay) —
        // an approximation (the obstacle grid is square tiles, the
        // fountain is round) rather than a pixel-exact match, same spirit
        // as every other tile-grid collision here. Can't center a 4-tile
        // block exactly on one tile index, so it's biased one tile
        // further south/east rather than north/west.
        for (let fy = FOUNTAIN_TILE.y - 1; fy <= FOUNTAIN_TILE.y + 2; fy++) {
            for (let fx = FOUNTAIN_TILE.x - 1; fx <= FOUNTAIN_TILE.x + 2; fx++) {
                this.createObstacle(fx * TILE_SIZE, fy * TILE_SIZE);
            }
        }

        // buildings: solid across the whole footprint except the door tile
        BUILDINGS.forEach((building) => {
            for (let by = building.y; by < building.y + building.height; by++) {
                for (let bx = building.x; bx < building.x + building.width; bx++) {

                    const isDoor = building.doorTile
                        && bx === building.doorTile.x
                        && by === building.doorTile.y;

                    if (!isDoor) {
                        this.createObstacle(bx * TILE_SIZE, by * TILE_SIZE);
                    }

                }
            }
        });

        // Spawn player centered on the main path near the south end of the
        // map, by default — far enough north of the solid south forest
        // border row to clear its trees' own canopies, not just the
        // camera's south bound. Border trees render up to 256px (8 tiles)
        // tall from a bottom-center anchor on that row, and — being south
        // of (i.e. higher depth than) anything spawned too close to them —
        // draw OVER the player wherever their canopy overlaps his sprite,
        // even though his own row is clear ground. Row 40 keeps the
        // player's own y comfortably above every nearby canopy's top edge
        // (measured empirically via screenshot — row 45, 3 tiles up from
        // the original spawn, still left the player fully hidden behind
        // the tallest border tree in this column). Scenes that send the
        // player back here from somewhere specific (e.g. the Overlook, via
        // ESC) can override where they land with { spawnX, spawnY }.
        const spawnX = (data && data.spawnX !== undefined) ? data.spawnX : 1200;
        const spawnY = (data && data.spawnY !== undefined) ? data.spawnY : (40 + NORTH_BUFFER_ROWS) * TILE_SIZE + 16;

        this.player = new Player(this, spawnX, spawnY);

        this.physics.add.collider(this.player, this.obstacles);

        this.cameras.main.setBounds(
            0,
            0,
            this.mapData[0].length * TILE_SIZE,
            this.mapData.length * TILE_SIZE
        );
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setZoom(1.25);

        // Town Square-only minimap — its own Scene (see MinimapScene.js/
        // world/Minimap.js) rather than objects added here, so it isn't
        // affected by this scene's own camera zoom set just above. Only
        // launched while World is running (stopped on shutdown below),
        // which is what actually makes it "Town Square only" — it's never
        // running for interiors, close-ups, takeovers, or the Overlook.
        this.scene.launch("Minimap");
        this.scene.bringToTop("Minimap");
        this.events.once("shutdown", () => this.scene.stop("Minimap"));

        // interaction setup
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.interactionTarget = null;
        this.interactionZones = [
            { x: 37, y: 15 + NORTH_BUFFER_ROWS, name: "Library" },
            { x: 14, y: 28 + NORTH_BUFFER_ROWS, name: "Gallery" },
            { x: 60, y: 28 + NORTH_BUFFER_ROWS, name: "Workshop" },
            { x: 16, y: 11 + NORTH_BUFFER_ROWS, name: "Theatre" },
            { x: 58, y: 11 + NORTH_BUFFER_ROWS, name: "Café" },
            { x: 37, y: 1 + NORTH_BUFFER_ROWS, name: "Woods" },
            CATHOUSE_ZONE,
            MURRAY_ZONE,
            FOUNTAIN_WISH_ZONE
        ];

        // Edison's zone only gets added once the achievement is already
        // complete — checked fresh every time this scene is (re)created,
        // e.g. right after the fifth cat interaction's building fades back
        // out to World. Before that, the sprite renders (WorldObjects.js)
        // but simply has no zone to trigger on, so no prompt ever appears
        // near it — no per-frame gating needed elsewhere.
        if (isCatAchievementComplete()) {
            this.interactionZones.push(EDISON_ZONE);
        }

        // "Woods" is the only zone that isn't a building: it walks the
        // player through a 3-stage prompt instead of a single "Press E to
        // Open" — see updateWoodsInteraction below.
        this.woodsState = "initial"; // "initial" -> "thinking" -> "ready"

        // Cathouse: same "..." thinking beat as the Woods, but the third
        // stage is a one-off flavor line that reverts back to "idle" on
        // its own (like Edison's line below) rather than becoming a new
        // actionable prompt — see updateCathouseInteraction.
        this.cathouseState = "idle"; // "idle" -> "thinking" -> "line" -> "idle"

        // Murray: same 3-state shape as the Cathouse above, but the idle
        // prompt itself changes once MURRAY_MET_FLAG is set (an unnamed
        // "demonic skull" the first time, "Murray" by name ever after —
        // see updateMurrayInteraction), and the payoff line is picked
        // fresh from MURRAY_LINES on every interaction instead of being
        // fixed.
        this.murrayState = "idle"; // "idle" -> "thinking" -> "line" -> "idle"
        this.fountainWishState = "idle"; // "idle" -> "thinking" -> "line" -> "idle"

        // Edison: false until E is pressed once in range, then shows the
        // line instead of the "Press E to talk" prompt for a beat — same
        // "flavor line that reverts after a delay" convention every
        // building's own petCat() uses, just driven by proximity here
        // instead of a click.
        this.edisonLineActive = false;

        // Background-only birds/butterflies — no collision, no player
        // interaction. Torn down on shutdown since create() re-runs every
        // time the player re-enters World, which would otherwise stack a
        // second, independent set of spawn timers on top of the last one.
        this.wildlife = new AmbientWildlife(this);
        this.events.once("shutdown", () => this.wildlife.destroy());

        // Stops the fountain loop immediately on any scene exit (entering
        // a building, leaving for the Overlook) rather than leaving it to
        // the next update() — this scene's own update() stops running the
        // instant shutdown fires, so it's the only place that can catch
        // "player was in the zone right as they left."
        this.events.once("shutdown", () => AudioManager.setLoopActive(this, FOUNTAIN_SFX_KEY, FOUNTAIN_SFX_VOLUME, false));
    }

    createObstacle(x, y) {
        const block = this.add.rectangle(x + 16, y + 16, 32, 32, 0xff0000, 0);
        this.physics.add.existing(block, true);
        this.obstacles.add(block);
    }

   update() {

    this.player.update();

    this.updateInteractions();

    this.updateFountainAudio();

    this.updateDepthSorting();

    this.scene.get("Minimap").updatePlayerPosition(this.player.x, this.player.y);

}
// Lower on screen (larger Y) should render in front. Depth is keyed off
// each object's ground-contact point, not its center, so a tall canopy
// or roofline can still be hidden behind a player standing below it.
// Player and world objects all use a bottom-center origin, so their own
// .y already IS that ground-contact point — no extra offset needed.
updateDepthSorting() {

    this.player.setDepth(this.player.y);

    this.worldObjects.forEach((object) => {
        object.setDepth(object.y);
    });

}
// setLoopActive() itself is idempotent (no-ops if the requested state
// already matches), so this can just recompute "am I in the square" fresh
// every frame with no local playing/not-playing state of its own to track.
updateFountainAudio() {

    const TILE_SIZE = 32;

    const playerTileX = Math.floor(this.player.x / TILE_SIZE);
    const playerTileY = Math.floor(this.player.y / TILE_SIZE);

    const inSquare =
        playerTileX >= TOWN_SQUARE_BOUNDS.minCol && playerTileX <= TOWN_SQUARE_BOUNDS.maxCol &&
        playerTileY >= TOWN_SQUARE_BOUNDS.minRow && playerTileY <= TOWN_SQUARE_BOUNDS.maxRow;

    AudioManager.setLoopActive(this, FOUNTAIN_SFX_KEY, FOUNTAIN_SFX_VOLUME, inSquare);

}
updateInteractions() {

    const TILE_SIZE = 32;

    const playerTileX = Math.floor(this.player.x / TILE_SIZE);
    const playerTileY = Math.floor(this.player.y / TILE_SIZE);

    let target = null;

    for (const zone of this.interactionZones) {

        const distance =
            Math.abs(playerTileX - zone.x) +
            Math.abs(playerTileY - zone.y);

        if (distance <= 1) {
            target = zone;
            break;
        }

    }

    this.interactionTarget = target;

    const hud = this.scene.get("HUD");

    if (!target) {
        hud.hideInteraction();
        return;
    }

    if (target.name === "Woods") {
        this.updateWoodsInteraction(hud);
        return;
    }

    if (target.name === "Edison") {
        this.updateEdisonInteraction(hud);
        return;
    }

    if (target.name === "Cathouse") {
        this.updateCathouseInteraction(hud);
        return;
    }

    if (target.name === "Murray") {
        this.updateMurrayInteraction(hud);
        return;
    }

    if (target.name === "FountainWish") {
        this.updateFountainWishInteraction(hud);
        return;
    }

    hud.showInteraction(target.name);

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {

        const sceneKey = BUILDING_SCENES[target.name];

        if (sceneKey) {

            hud.hideInteraction();

            AudioManager.playBuildingEntrySfx(this, BUILDING_KEYS[target.name]);

            // The interaction zone's own tile IS the door tile the player
            // was just standing on — forwarded through so ESC from inside
            // (see AdventureScene.init's returnSpawnX/Y handling) spawns
            // back in front of this same building instead of the map's
            // default south-edge spawn.
            this.scene.start(sceneKey, {
                returnSpawnX: (target.x * TILE_SIZE) + 16,
                returnSpawnY: (target.y * TILE_SIZE) + 16
            });

        } else {
            console.log("Entering", target.name, "(coming soon)");
        }

    }

}

// Distinct from the building flow: the woods don't open a door on the
// first E — they reveal a second prompt instead. "thinking" is a brief
// beat ("...") before the road-not-taken prompt appears, so it reads as
// a pause rather than an instant swap. Once "ready", pressing E again is
// what actually leaves for the Overlook scene.
updateWoodsInteraction(hud) {

    const justPressed = Phaser.Input.Keyboard.JustDown(this.interactKey);

    if (this.woodsState === "initial") {

        hud.showInteraction("The Woods", "Press [E] to investigate the woods...");

        if (justPressed) {

            this.woodsState = "thinking";
            hud.showInteraction("The Woods", "...");

            this.time.delayedCall(2200, () => {
                if (this.woodsState === "thinking") {
                    this.woodsState = "ready";
                }
            });

        }

    } else if (this.woodsState === "thinking") {

        hud.showInteraction("The Woods", "...");

    } else if (this.woodsState === "ready") {

        hud.showInteraction("The Woods", "Press [E] to take the road less traveled by...");

        if (justPressed) {

            if (this.scene.get("Overlook")) {
                hud.hideInteraction();
                this.scene.start("Overlook");
            } else {
                console.log("Entering The Woods overlook (coming soon)");
            }

        }

    }

}

// Simple two-state version of the pattern above: an idle "Press [E]"
// prompt, and — once pressed — the line itself for EDISON_LINE_DURATION
// before reverting, regardless of whether the player is still standing
// there (same "shows, then reverts after a beat" convention as every
// building's own petCat(), just proximity-driven instead of a click).
updateEdisonInteraction(hud) {

    if (this.edisonLineActive) {

        hud.showInteraction("Edison", withPlayerName(EDISON_LINE, SaveManager.getName()));
        return;

    }

    hud.showInteraction("Edison", "Press [E] to talk to Edison.");

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {

        AudioManager.playCatSfx(this);

        this.edisonLineActive = true;

        this.time.delayedCall(EDISON_LINE_DURATION, () => {
            this.edisonLineActive = false;
        });

    }

}

// Same "..." thinking beat -> one-off flavor line -> revert-to-idle shape
// as updateCathouseInteraction below, with the coin/splash sfx (see
// AudioManager.playWishSfx) fired at the same moment the "..." beat
// starts. Approaching again after the line clears replays the whole
// "..." -> line sequence (and sfx) rather than staying stuck or needing
// a second press.
updateFountainWishInteraction(hud) {

    const justPressed = Phaser.Input.Keyboard.JustDown(this.interactKey);

    if (this.fountainWishState === "idle") {

        hud.showInteraction("Fountain", "Press [E] to make a wish.");

        if (justPressed) {

            AudioManager.playWishSfx(this);

            this.fountainWishState = "thinking";
            hud.showInteraction("Fountain", "...");

            this.time.delayedCall(FOUNTAIN_WISH_THINKING_DURATION, () => {
                if (this.fountainWishState !== "thinking") return;

                this.fountainWishState = "line";

                this.time.delayedCall(FOUNTAIN_WISH_LINE_DURATION, () => {
                    if (this.fountainWishState === "line") {
                        this.fountainWishState = "idle";
                    }
                });

            });

        }

    } else if (this.fountainWishState === "thinking") {

        hud.showInteraction("Fountain", "...");

    } else if (this.fountainWishState === "line") {

        hud.showInteraction("Fountain", FOUNTAIN_WISH_LINE);

    }

}

// Same "..." thinking beat as the Woods (see updateWoodsInteraction)
// before the payoff line appears, but the payoff here is a one-off flavor
// line rather than a new actionable prompt — it reverts back to "idle" on
// its own after CATHOUSE_LINE_DURATION (same "shows, then reverts after a
// beat" convention as updateEdisonInteraction/every building's petCat()),
// so approaching again replays the same "..." -> line sequence rather
// than staying stuck on the line or requiring a second press to do
// anything.
updateCathouseInteraction(hud) {

    const justPressed = Phaser.Input.Keyboard.JustDown(this.interactKey);

    if (this.cathouseState === "idle") {

        hud.showInteraction("Cathouse", "Press [E] to look at the cathouse.");

        if (justPressed) {

            this.cathouseState = "thinking";
            hud.showInteraction("Cathouse", "...");

            this.time.delayedCall(CATHOUSE_THINKING_DURATION, () => {
                if (this.cathouseState !== "thinking") return;

                this.cathouseState = "line";

                this.time.delayedCall(CATHOUSE_LINE_DURATION, () => {
                    if (this.cathouseState === "line") {
                        this.cathouseState = "idle";
                    }
                });

            });

        }

    } else if (this.cathouseState === "thinking") {

        hud.showInteraction("Cathouse", "...");

    } else if (this.cathouseState === "line") {

        hud.showInteraction("Cathouse", CATHOUSE_LINE);

    }

}

// Same 3-state shape as updateCathouseInteraction above, plus one extra
// wrinkle: the idle prompt's own text depends on MURRAY_MET_FLAG, checked
// fresh on every call rather than cached — flipping mid-session the
// instant the player first presses E (see below), not just on the next
// scene re-create.
updateMurrayInteraction(hud) {

    const justPressed = Phaser.Input.Keyboard.JustDown(this.interactKey);
    const met = SaveManager.hasFlag(MURRAY_MET_FLAG);

    if (this.murrayState === "idle") {

        hud.showInteraction(
            met ? "Murray" : "???",
            met ? "Press [E] to talk to Murray." : "Press [E] to talk to demonic skull."
        );

        if (justPressed) {

            // Set immediately (not after the line finishes) so this same
            // first interaction's own "..." and payoff line already read
            // "Murray" rather than waiting for a second approach.
            SaveManager.setFlag(MURRAY_MET_FLAG);

            // Also counts toward the broader "talked to everyone in
            // town" achievement (see managers/NPCAchievement.js) —
            // Murray is one of its 10 flags.
            if (checkNPCAchievement()) {
                showNPCAchievementPopup(this);
            }

            this.murrayState = "thinking";
            hud.showInteraction("Murray", "...");

            this.time.delayedCall(MURRAY_THINKING_DURATION, () => {
                if (this.murrayState !== "thinking") return;

                this.murrayState = "line";

                const lineIndex = Phaser.Math.Between(0, MURRAY_LINES.length - 1);
                this.murrayLine = MURRAY_LINES[lineIndex];

                const heardIndices = SaveManager.getFlags()[MURRAY_LINES_HEARD_FLAG] || [];

                if (!heardIndices.includes(lineIndex)) {

                    const updatedIndices = [...heardIndices, lineIndex];
                    SaveManager.setFlag(MURRAY_LINES_HEARD_FLAG, updatedIndices);

                    if (updatedIndices.length === MURRAY_LINES.length && !SaveManager.hasFlag(MURRAY_ALL_LINES_HEARD_FLAG)) {
                        SaveManager.setFlag(MURRAY_ALL_LINES_HEARD_FLAG);
                        AudioManager.playTownMIMusic(this);
                    }

                }

                this.time.delayedCall(MURRAY_LINE_DURATION, () => {
                    if (this.murrayState === "line") {
                        this.murrayState = "idle";
                    }
                });

            });

        }

    } else if (this.murrayState === "thinking") {

        hud.showInteraction("Murray", "...");

    } else if (this.murrayState === "line") {

        hud.showInteraction("Murray", this.murrayLine);

    }

}
}
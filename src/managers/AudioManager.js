// Looping background layers per "area" (town, overlook), switching
// cleanly whenever the player moves between areas. Phaser's SoundManager
// is game-global, not per-scene — playArea() only needs calling from
// WorldScene/OverlookScene, and tracks keep playing uninterrupted
// underneath whatever building scene is currently on top, exactly like
// background audio should.
//
// playArea() no-ops when the requested area is already the one playing —
// required because WorldScene.create() re-runs every time the player
// walks back out of a building (see CLAUDE.md), which would otherwise
// restart Town.mp3 from 0 on every single building visit.
//
// Each area is a `layers` array (not fixed music/ambient fields) so an
// area can carry any number of simultaneous loops — Overlook has three
// (music + two ambient beds), Town has two. Each layer's `role` ("music"
// or "ambient") is how playBuildingMusic below finds "the current area's
// music layer" to swap out, without assuming a fixed array position. Per-
// layer volume, not one shared constant: Town's music sits well under its
// ambient layer (0.125 vs 1.40625 — the music got two successive 50% cuts
// off the original shared 0.5, the ambient one a 50% raise then a further
// 25% raise, 0.5 -> 1.125 -> 1.40625) so the ambience reads as the dominant
// layer; Overlook's music got one 50% cut (0.5 -> 0.25), its two ambient
// beds both stay at the original 0.5. Volumes exceeding 1 are intentional,
// not a bug — Web Audio gain nodes support boosting past unity, requested
// explicitly rather than clamped to 1.
const AREA_TRACKS = {
    town: {
        layers: [
            { key: "music-town", volume: 0.125, role: "music" },
            { key: "ambient-town", volume: 1.40625, role: "ambient" }
        ]
    },
    overlook: {
        layers: [
            { key: "music-overlook", volume: 0.25, role: "music" },
            { key: "ambient-overlook", volume: 0.5, role: "ambient" },
            { key: "ambient-overlook2", volume: 0.5, role: "ambient" }
        ]
    }
};

// Each building Room scene calls playBuildingMusic(scene, key) once on
// entry — swaps out just the current area's "music" role layer (Town's
// ambient keeps playing underneath regardless, same as it already does
// for every building — only the music itself is building-specific).
// Every building's own Close-up/nested scenes (LibrarianCloseup,
// BookshelfCloseup, etc.) leave audio alone entirely, same principle as
// Town's tracks persisting under a building Room in the first place, so
// the music doesn't restart every time a dialogue closeup opens and
// closes.
const BUILDING_MUSIC = {
    library: { key: "music-library", volume: 0.5 },
    cafe: { key: "music-cafe", volume: 0.5 },
    workshop: { key: "music-workshop", volume: 0.5 },
    theatre: { key: "music-theatre", volume: 0.25 },
    gallery: { key: "music-gallery", volume: 0.5 }
};

// areaKey -> { role, sound }[], built lazily on first use per area rather
// than all up front.
let sounds = {};
let currentArea = null;

// The one currently-playing building music Sound (if any) and which
// building it belongs to — separate from `sounds` above since it isn't
// tied to an area's own layer set, just swapped in over it.
let buildingSound = null;
let currentBuilding = null;

// Sound instances pauseAll() paused, so resumeAll() only resumes exactly
// those — not anything that happens to start playing in between (e.g. an
// area switch that occurs while a viewer is still on screen).
let paused = [];

// key -> Sound, for setLoopActive()'s standalone condition-driven loops
// (see its own comment) — a separate cache from the area `sounds` above
// since these aren't tied to any one area.
let loopSounds = {};

// UI/interaction sound effects — one shared trigger per interaction
// *type*, called from the few common code paths every building already
// funnels through (AdventureScene.addHitbox/fadeTo, AdventureBar's option
// clicks, WorldScene's building-entry, CatAchievementPopup, Player's
// movement), rather than any per-building wiring. Modest volume relative
// to the music/ambience layers above (SFX_VOLUME well under their
// 0.125-1.125 range) since these are polish, not the main event. Fire-
// and-forget one-shots via scene.sound.play() rather than the persistent
// add()+play() pattern the looping tracks use — no need to keep a
// reusable Sound instance around for something that plays once and stops
// itself. Independent of pauseAll()/resumeAll(): those only pause
// whatever's ALREADY playing at the instant a viewer opens; a sfx
// triggered afterward (e.g. clicking something inside the now-open
// viewer) is a brand new play() call, entirely unaffected by that earlier
// pause/resume pair.
const SFX_VOLUME = 0.35;

const SFX = {
    HOVER: "sfx-hover",
    CLICK: "sfx-click",
    TRANSITION: "sfx-transition",
    VIEWER_OPEN: "sfx-viewer-open",
    VIEWER_CLOSE: "sfx-viewer-close",
    PAGE_TURN: "sfx-page-turn",
    ACHIEVEMENT: "sfx-achievement",
    CAT: "sfx-cat"
};

// Entering these buildings specifically swaps out the generic transition
// sfx for something more thematic (see AudioManager.playBuildingEntrySfx) —
// every other building, and every other transition in the game, keeps
// SFX.TRANSITION. Keyed by the same lowercase building key playBuildingMusic
// already uses. Café is entry-only (leaving it keeps the generic sfx);
// Library/Gallery/Workshop use the same file on the way out too — see
// BUILDING_EXIT_SFX below.
const BUILDING_ENTRY_SFX = {
    cafe: "sfx-enter-cafe",
    library: "sfx-door-library",
    gallery: "sfx-door-gallery",
    workshop: "sfx-door-workshop"
};

// The reverse of BUILDING_ENTRY_SFX for the three buildings whose door sfx
// plays both ways — keyed by Room SCENE key (not the lowercase building
// key above) because this is looked up from playTransitionSfx, which only
// has scene.scene.key to go on. Only applies when fadeTo's target is
// "World" (i.e. actually leaving the building, not moving to a nested
// Close-up scene within it — those also fadeTo from a Room scene but
// target their own Close-up key, not "World").
const BUILDING_EXIT_SFX = {
    Library: "sfx-door-library",
    Gallery: "sfx-door-gallery",
    Workshop: "sfx-door-workshop"
};

const FOOTSTEP_COUNT = 10;
// 30% quieter than the standard SFX_VOLUME (0.35 -> 0.245) — footsteps fire
// far more often than any other sfx here, so they needed to sit further
// back rather than at the same level as one-off hover/click sounds.
const FOOTSTEP_VOLUME = SFX_VOLUME * 0.7;
let lastFootstepIndex = -1;

export default class AudioManager {

    static playArea(scene, areaKey) {

        if (areaKey === currentArea) return;

        const area = AREA_TRACKS[areaKey];
        if (!area) return;

        if (currentArea && sounds[currentArea]) {
            sounds[currentArea].forEach(({ sound }) => sound?.stop());
        }

        if (!sounds[areaKey]) {
            sounds[areaKey] = area.layers.map((track) => ({
                role: track.role,
                sound: this.createLoop(scene, track)
            }));
        }

        sounds[areaKey].forEach(({ sound }) => sound?.play());

        currentArea = areaKey;

    }

    // Swaps the current area's music layer out for a building's own
    // track — Town's (or, in principle, any area's) ambient layer(s) keep
    // playing underneath, only "the existing town music" stops per the
    // spec. No-ops if this building's track is already the one playing,
    // same "don't restart on a re-entry" reasoning as playArea's own
    // currentArea guard — matters here because a building's Room scene
    // re-creates every time the player returns to it from one of its own
    // Close-up scenes.
    static playBuildingMusic(scene, buildingKey) {

        if (buildingKey === currentBuilding) return;

        const track = BUILDING_MUSIC[buildingKey];
        if (!track) return;

        this.setAreaMusicPlaying(false);

        buildingSound?.stop();
        buildingSound = this.createLoop(scene, track);
        buildingSound?.play();

        currentBuilding = buildingKey;

    }

    // Called from WorldScene on every entry (alongside playArea) so
    // leaving a building — by any route, not just a direct ESC from its
    // Room — always stops that building's track and resumes the area's
    // own music. No-ops if no building music was playing.
    static stopBuildingMusic() {

        if (!currentBuilding) return;

        buildingSound?.stop();
        buildingSound = null;
        currentBuilding = null;

        this.setAreaMusicPlaying(true);

    }

    static setAreaMusicPlaying(playing) {

        const layer = sounds[currentArea]?.find((l) => l.role === "music");
        if (!layer?.sound) return;

        if (playing) {
            layer.sound.play();
        } else {
            layer.sound.stop();
        }

    }

    // Pauses every currently-playing sound game-wide — every area layer,
    // building music, AND any one-off sfx, not just the ones this manager
    // itself created — so opening a content viewer (see
    // TakeoverFrameScene) never plays over background audio or, for the
    // Workshop's YouTube embed specifically, its own separate audio. Uses
    // pause/resume rather than stop so tracks pick back up from where
    // they left off instead of restarting from 0.
    static pauseAll(scene) {

        paused = scene.sound.sounds.filter((s) => s.isPlaying);
        paused.forEach((s) => s.pause());

    }

    static resumeAll() {

        paused.forEach((s) => {
            if (s.isPaused) s.resume();
        });

        paused = [];

    }

    // Toggles a single looping sfx on/off based on a caller-computed
    // condition — e.g. WorldScene calling this every frame with whether
    // the player is currently standing in the town square, for
    // fountain.mp3. No-ops when the requested state already matches
    // (idempotent per-frame calls are the expected usage), so this is
    // cheap to call unconditionally from an update() loop.
    static setLoopActive(scene, key, volume, active) {

        if (!loopSounds[key]) {

            if (!scene.cache.audio.exists(key)) return;

            loopSounds[key] = scene.sound.add(key, { loop: true, volume });

        }

        const sound = loopSounds[key];

        if (active && !sound.isPlaying) {
            sound.play();
        } else if (!active && sound.isPlaying) {
            sound.stop();
        }

    }

    // Same defensive "check it actually loaded, degrade gracefully"
    // convention TileRenderer.js/WorldObjects.js use for missing image
    // assets — a renamed/missing audio file skips silently instead of
    // throwing.
    static createLoop(scene, { key, volume }) {

        if (!scene.cache.audio.exists(key)) return null;

        return scene.sound.add(key, { loop: true, volume });

    }

    // Shared one-shot player every SFX method below funnels through —
    // same "check it loaded, degrade gracefully" guard as createLoop.
    static playSfx(scene, key, volume = SFX_VOLUME) {

        if (!scene.cache.audio.exists(key)) return;

        scene.sound.play(key, { volume });

    }

    // Called from AdventureScene.addHitbox's pointerover — every hitbox
    // in every Room/Close-up scene goes through that one method, so no
    // per-building wiring is needed here.
    static playHoverSfx(scene) {
        this.playSfx(scene, SFX.HOVER);
    }

    // Called from AdventureScene.addHitbox's pointerdown AND
    // AdventureBar's dialogue-option pointerdown — covers every hitbox
    // (including book/poster/blueprint selection, which are just hitboxes
    // with a specific onClick) plus every NPC dialogue option, from those
    // two shared call sites. `key` lets a specific hitbox override the
    // generic click sfx (see addHitbox's own `clickSfx` option — e.g.
    // WorkshopScene's computer hitbox uses sfx-computer-select) without any
    // caller needing its own bespoke sound-trigger code.
    static playClickSfx(scene, key = SFX.CLICK) {
        this.playSfx(scene, key);
    }

    // The one shared trigger for every scene transition in the Adventure
    // system (Room <-> Close-up <-> Takeover, and back out to World) —
    // called from AdventureScene.fadeTo, its only caller. Automatically
    // swaps in the more specific viewer-open/viewer-close sfx when the
    // transition is into or out of TakeoverFrameScene specifically, and the
    // building door sfx when leaving Library/Gallery/Workshop's Room scene
    // back to World (BUILDING_EXIT_SFX), so individual callers never need
    // to name a sound themselves — they just call fadeTo() like they
    // always have.
    static playTransitionSfx(scene, targetSceneKey) {

        if (targetSceneKey === "TakeoverFrame") {
            this.playSfx(scene, SFX.VIEWER_OPEN);
        } else if (scene.scene.key === "TakeoverFrame") {
            this.playSfx(scene, SFX.VIEWER_CLOSE);
        } else if (targetSceneKey === "World" && BUILDING_EXIT_SFX[scene.scene.key]) {
            this.playSfx(scene, BUILDING_EXIT_SFX[scene.scene.key]);
        } else {
            this.playSfx(scene, SFX.TRANSITION);
        }

    }

    // Called from WorldScene when it starts a building's Room scene —
    // separate from playTransitionSfx above since building entry doesn't
    // go through AdventureScene.fadeTo at all (WorldScene isn't an
    // AdventureScene). Falls back to the generic transition sfx for any
    // building not specifically listed in BUILDING_ENTRY_SFX.
    static playBuildingEntrySfx(scene, buildingKey) {
        this.playSfx(scene, BUILDING_ENTRY_SFX[buildingKey] || SFX.TRANSITION);
    }

    static playPageTurnSfx(scene) {
        this.playSfx(scene, SFX.PAGE_TURN);
    }

    static playAchievementSfx(scene) {
        this.playSfx(scene, SFX.ACHIEVEMENT);
    }

    // Every cat interaction across the game uses this instead of the
    // generic click — the five buildings' petCat hitboxes pass
    // clickSfx: "sfx-cat" straight into addHitbox (see
    // AdventureScene.addHitbox's own clickSfx override) rather than calling
    // this directly, since that path already has a sound-override hook;
    // this wrapper exists for Edison in WorldScene, whose cat interaction
    // is a proximity + E-press rather than a hitbox click, so it has no
    // such hook to plug into.
    static playCatSfx(scene) {
        this.playSfx(scene, SFX.CAT);
    }

    // A random footstep file each call, never the same one twice in a row
    // — advancing to the next index (rather than re-rolling) on a
    // collision keeps this a single, bounded operation instead of a
    // while-loop, while still reading as random over a run of steps.
    static playFootstepSfx(scene) {

        let index = Math.floor(Math.random() * FOOTSTEP_COUNT);

        if (index === lastFootstepIndex) {
            index = (index + 1) % FOOTSTEP_COUNT;
        }

        lastFootstepIndex = index;

        this.playSfx(scene, `sfx-footstep-${index}`, FOOTSTEP_VOLUME);

    }

}

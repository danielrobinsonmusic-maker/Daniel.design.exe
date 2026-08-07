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
// ambient layer (0.125 vs 1.125 — the music got two successive 50% cuts
// and the ambient one 50% raise off the original shared 0.5) so the
// ambience reads as the dominant layer; Overlook's music got one 50% cut
// (0.5 -> 0.25), its two ambient beds both stay at the original 0.5.
// Volumes exceeding 1 are intentional, not a bug — Web Audio gain nodes
// support boosting past unity, requested explicitly rather than clamped
// to 1.
const AREA_TRACKS = {
    town: {
        layers: [
            { key: "music-town", volume: 0.125, role: "music" },
            { key: "ambient-town", volume: 1.125, role: "ambient" }
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
    theatre: { key: "music-theatre", volume: 0.5 },
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

}

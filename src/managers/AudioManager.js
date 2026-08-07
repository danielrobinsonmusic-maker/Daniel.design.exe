// Looping music + ambient layer per "area" (town, overlook), switching
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
// Per-track volume (not one shared constant) — Town's music sits well
// under its ambient layer (0.125 vs 0.75 — two successive 50% cuts off
// the original shared 0.5) so the ambience reads as the dominant layer;
// Overlook's pair stays at the original flat 0.5/0.5.
const AREA_TRACKS = {
    town: {
        music: { key: "music-town", volume: 0.125 },
        ambient: { key: "ambient-town", volume: 0.75 }
    },
    overlook: {
        music: { key: "music-overlook", volume: 0.5 },
        ambient: { key: "ambient-overlook", volume: 0.5 }
    }
};

// areaKey -> { music: Sound|null, ambient: Sound|null }, built lazily on
// first use per area rather than all up front.
let sounds = {};
let currentArea = null;

export default class AudioManager {

    static playArea(scene, areaKey) {

        if (areaKey === currentArea) return;

        const tracks = AREA_TRACKS[areaKey];
        if (!tracks) return;

        if (currentArea && sounds[currentArea]) {
            sounds[currentArea].music?.stop();
            sounds[currentArea].ambient?.stop();
        }

        if (!sounds[areaKey]) {
            sounds[areaKey] = {
                music: this.createLoop(scene, tracks.music),
                ambient: this.createLoop(scene, tracks.ambient)
            };
        }

        sounds[areaKey].music?.play();
        sounds[areaKey].ambient?.play();

        currentArea = areaKey;

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

import Phaser from "phaser";
import { DECOR } from "./WorldObjects";
import { findFlowerTiles } from "./TileRenderer";

const TILE_SIZE = 32;

const BIRD_TEXTURES = ["bird1", "bird2"];
const BUTTERFLY_TEXTURES = ["butterfly1", "butterfly2"];

// Birds: one every 20-40s, edge-to-edge of whatever's currently on camera.
const BIRD_MIN_DELAY = 20000;
const BIRD_MAX_DELAY = 40000;
const BIRD_MIN_DURATION = 3000;
const BIRD_MAX_DURATION = 5000;
const BIRD_DISPLAY_SIZE = 30; // px, long edge
const BIRD_EDGE_MARGIN = 24; // px inset from the camera's visible edge
const BIRD_ARC_CHANCE = 0.6; // remaining spawns fly a straight line
const BIRD_ARC_MAX_OFFSET = 90; // px, perpendicular bow of the arc at its middle
const BIRD_FLAP_MIN_DURATION = 90;
const BIRD_FLAP_MAX_DURATION = 160;
const BIRD_SQUASH_SCALE = 0.85;

// Always renders above buildings/trees/player, which depth-sort by their
// own y (max ~1800 on this map) — see WorldScene.updateDepthSorting.
const BIRD_DEPTH = 100000;

// Butterflies: 1-2 every 10-15s, wandering near real flower tiles/boxes.
const BUTTERFLY_MIN_DELAY = 10000;
const BUTTERFLY_MAX_DELAY = 15000;
const BUTTERFLY_DISPLAY_SIZE = 16; // px, long edge
const BUTTERFLY_SPAWN_RADIUS = 20; // px scatter around the chosen flower point
const BUTTERFLY_STEP_RADIUS = 26; // px per wander hop
const BUTTERFLY_STEP_MIN_DURATION = 350;
const BUTTERFLY_STEP_MAX_DURATION = 750;
const BUTTERFLY_MIN_STEPS = 4;
const BUTTERFLY_MAX_STEPS = 9;
const BUTTERFLY_DRIFT_RADIUS = 40; // px, final drift-off while fading
const BUTTERFLY_FADE_DURATION = 1200;
const BUTTERFLY_FLAP_MIN_DURATION = 50; // faster than a bird's — real butterfly wingbeats read
const BUTTERFLY_FLAP_MAX_DURATION = 90; // as far more frantic than a bird's at this scale
const BUTTERFLY_SQUASH_SCALE = 0.8;

// Depth sits above the ground/decor but below birds, so birds always read
// as flying "over" the plaza rather than sharing a layer with butterflies.
const BUTTERFLY_DEPTH = 5000;

const OPPOSITE_EDGE = { top: "bottom", bottom: "top", left: "right", right: "left" };

function randRange(min, max) {
    return min + (Math.random() * (max - min));
}

function randInt(min, max) {
    return Math.floor(randRange(min, max + 1));
}

function pickOne(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function pointOnEdge(view, edge, margin) {

    switch (edge) {
        case "top":
            return { x: randRange(view.x + margin, view.x + view.width - margin), y: view.y + margin };
        case "bottom":
            return { x: randRange(view.x + margin, view.x + view.width - margin), y: view.y + view.height - margin };
        case "left":
            return { x: view.x + margin, y: randRange(view.y + margin, view.y + view.height - margin) };
        default:
            return { x: view.x + view.width - margin, y: randRange(view.y + margin, view.y + view.height - margin) };
    }

}

// Sets display size from the "content" sub-frame BootScene registers for
// each ambient texture (padded canvas, same crop pattern as buildings/
// trees/decor — see BootScene.js) so setDisplaySize scales the actual
// visible art, not the transparent margin around it.
function sizeToFit(sprite, targetLongEdge) {

    const aspect = sprite.width / sprite.height;

    if (aspect >= 1) {
        sprite.setDisplaySize(targetLongEdge, targetLongEdge / aspect);
    } else {
        sprite.setDisplaySize(targetLongEdge * aspect, targetLongEdge);
    }

}

// Purely decorative background flavor — no collision, no interaction with
// the player or anything else in the scene. Spawns and tears itself down
// entirely through Phaser's own timer/tween systems, cleaned up via
// destroy() (see WorldScene.js's "shutdown" hook) since WorldScene.create()
// re-runs every time the player re-enters World and would otherwise pile
// up a second, third, ... independent set of spawn timers.
export default class AmbientWildlife {

    constructor(scene) {

        this.scene = scene;
        this.active = true;
        this.timers = [];
        this.entities = new Set();

        // Real flower tiles (TileRenderer's baked ground decoration) plus
        // hand-placed flower boxes (WorldObjects' DECOR list) — combined
        // once here since both are static/deterministic for the life of
        // this scene instance.
        this.flowerPoints = this.collectFlowerPoints();

        this.scheduleBird();
        this.scheduleButterflies();

    }

    collectFlowerPoints() {

        const points = [];

        findFlowerTiles(this.scene, this.scene.mapData).forEach(([x, y]) => {
            points.push({
                x: (x * TILE_SIZE) + (TILE_SIZE / 2),
                y: (y * TILE_SIZE) + (TILE_SIZE / 2)
            });
        });

        DECOR.filter((item) => item.type === "flowerbox").forEach((item) => {
            points.push({
                x: (item.x * TILE_SIZE) + (TILE_SIZE / 2),
                y: (item.y * TILE_SIZE) + TILE_SIZE
            });
        });

        return points;

    }

    createEntity(sprite) {
        const entry = { sprite, tweens: [] };
        this.entities.add(entry);
        return entry;
    }

    addTween(entry, config) {
        const tween = this.scene.tweens.add(config);
        entry.tweens.push(tween);
        return tween;
    }

    destroyEntity(entry) {
        entry.tweens.forEach((tween) => tween.stop());
        this.scene.tweens.killTweensOf(entry.sprite);
        entry.sprite.destroy();
        this.entities.delete(entry);
    }

    scheduleBird() {

        const timer = this.scene.time.delayedCall(randRange(BIRD_MIN_DELAY, BIRD_MAX_DELAY), () => {
            if (!this.active) return;
            this.spawnBird();
            this.scheduleBird();
        });

        this.timers.push(timer);

    }

    scheduleButterflies() {

        const timer = this.scene.time.delayedCall(randRange(BUTTERFLY_MIN_DELAY, BUTTERFLY_MAX_DELAY), () => {
            if (!this.active) return;
            const count = Math.random() < 0.5 ? 1 : 2;
            for (let i = 0; i < count; i++) this.spawnButterfly();
            this.scheduleButterflies();
        });

        this.timers.push(timer);

    }

    // Straight or gently arcing flight between two random points on
    // opposite edges of whatever's currently visible: a quadratic bezier
    // whose control point sits on the direct start->end line (collapsing
    // to a straight path) with a random chance of a perpendicular bow
    // added to it instead. Speed/height/edge/direction are all randomized
    // per spawn via the random start/end/duration picks below.
    spawnBird() {

        const available = BIRD_TEXTURES.filter((key) => this.scene.textures.exists(key));
        if (!available.length) return;

        const view = this.scene.cameras.main.worldView;
        const edges = ["top", "bottom", "left", "right"];
        const startEdge = pickOne(edges);
        const endEdge = OPPOSITE_EDGE[startEdge];

        const start = pointOnEdge(view, startEdge, BIRD_EDGE_MARGIN);
        const end = pointOnEdge(view, endEdge, BIRD_EDGE_MARGIN);

        const textureKey = pickOne(available);
        const texture = this.scene.textures.get(textureKey);
        const frame = texture.has("content") ? "content" : undefined;

        const sprite = this.scene.add.image(start.x, start.y, textureKey, frame);
        sprite.setDepth(BIRD_DEPTH);
        sizeToFit(sprite, BIRD_DISPLAY_SIZE);
        sprite.setFlipX(end.x < start.x);

        const entry = this.createEntity(sprite);

        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        let controlX = midX;
        let controlY = midY;

        if (Math.random() < BIRD_ARC_CHANCE) {

            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const length = Math.hypot(dx, dy) || 1;
            const offset = randRange(-BIRD_ARC_MAX_OFFSET, BIRD_ARC_MAX_OFFSET);

            // Perpendicular to the start->end line, so the bow reads as a
            // gentle arc rather than a random wobble off the direct path.
            controlX += (-dy / length) * offset;
            controlY += (dx / length) * offset;

        }

        const curve = new Phaser.Curves.QuadraticBezier(
            new Phaser.Math.Vector2(start.x, start.y),
            new Phaser.Math.Vector2(controlX, controlY),
            new Phaser.Math.Vector2(end.x, end.y)
        );

        const progress = { t: 0 };

        this.addTween(entry, {
            targets: progress,
            t: 1,
            duration: randRange(BIRD_MIN_DURATION, BIRD_MAX_DURATION),
            ease: "Sine.easeInOut",
            onUpdate: () => {
                const point = curve.getPoint(progress.t);
                sprite.x = point.x;
                sprite.y = point.y;
            },
            onComplete: () => this.destroyEntity(entry)
        });

        // Wing-flap illusion: fast yoyo scaleY squash layered on top of the
        // position tween above (different property, so they don't fight).
        this.addTween(entry, {
            targets: sprite,
            scaleY: sprite.scaleY * BIRD_SQUASH_SCALE,
            duration: randRange(BIRD_FLAP_MIN_DURATION, BIRD_FLAP_MAX_DURATION),
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

    }

    spawnButterfly() {

        const available = BUTTERFLY_TEXTURES.filter((key) => this.scene.textures.exists(key));
        if (!available.length || !this.flowerPoints.length) return;

        const origin = pickOne(this.flowerPoints);
        const startX = origin.x + randRange(-BUTTERFLY_SPAWN_RADIUS, BUTTERFLY_SPAWN_RADIUS);
        const startY = origin.y + randRange(-BUTTERFLY_SPAWN_RADIUS, BUTTERFLY_SPAWN_RADIUS);

        const textureKey = pickOne(available);
        const texture = this.scene.textures.get(textureKey);
        const frame = texture.has("content") ? "content" : undefined;

        const sprite = this.scene.add.image(startX, startY, textureKey, frame);
        sprite.setDepth(BUTTERFLY_DEPTH);
        sizeToFit(sprite, BUTTERFLY_DISPLAY_SIZE);

        const entry = this.createEntity(sprite);

        // Wing-flap illusion, same squash technique as the bird's but
        // faster/more visible to match a butterfly's quicker wingbeat.
        this.addTween(entry, {
            targets: sprite,
            scaleY: sprite.scaleY * BUTTERFLY_SQUASH_SCALE,
            duration: randRange(BUTTERFLY_FLAP_MIN_DURATION, BUTTERFLY_FLAP_MAX_DURATION),
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        this.wanderButterfly(entry, randInt(BUTTERFLY_MIN_STEPS, BUTTERFLY_MAX_STEPS));

    }

    // Erratic wander: a chain of short hops to nearby randomized points
    // (not a straight path), each one's own tween scheduling the next on
    // completion, for several seconds before the final fade-out/drift.
    wanderButterfly(entry, stepsLeft) {

        if (!this.active) {
            this.destroyEntity(entry);
            return;
        }

        if (stepsLeft <= 0) {

            this.addTween(entry, {
                targets: entry.sprite,
                x: entry.sprite.x + randRange(-BUTTERFLY_DRIFT_RADIUS, BUTTERFLY_DRIFT_RADIUS),
                y: entry.sprite.y + randRange(-BUTTERFLY_DRIFT_RADIUS, BUTTERFLY_DRIFT_RADIUS),
                alpha: 0,
                duration: BUTTERFLY_FADE_DURATION,
                ease: "Sine.easeIn",
                onComplete: () => this.destroyEntity(entry)
            });

            return;

        }

        this.addTween(entry, {
            targets: entry.sprite,
            x: entry.sprite.x + randRange(-BUTTERFLY_STEP_RADIUS, BUTTERFLY_STEP_RADIUS),
            y: entry.sprite.y + randRange(-BUTTERFLY_STEP_RADIUS, BUTTERFLY_STEP_RADIUS),
            duration: randRange(BUTTERFLY_STEP_MIN_DURATION, BUTTERFLY_STEP_MAX_DURATION),
            ease: "Sine.easeInOut",
            onComplete: () => this.wanderButterfly(entry, stepsLeft - 1)
        });

    }

    // WorldScene.create() re-runs every time the player re-enters World —
    // without this, each visit would layer on a second, independent set of
    // spawn timers rather than replacing the last one.
    destroy() {

        this.active = false;

        this.timers.forEach((timer) => timer.remove(false));
        this.timers = [];

        this.entities.forEach((entry) => this.destroyEntity(entry));

    }

}

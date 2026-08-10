import Phaser from "phaser";
import Minimap from "../world/Minimap";

// A thin Scene wrapper around world/Minimap.js's actual drawing logic —
// see that file's own header comment for why this needs to be a separate
// Scene (with its own unzoomed camera) rather than objects added directly
// inside WorldScene. Launched/stopped by WorldScene (see WorldScene.js),
// so its lifetime already matches "Town Square only" with no extra
// show/hide state of its own to manage.
export default class MinimapScene extends Phaser.Scene {

    constructor() {
        super("Minimap");
    }

    create() {
        this.minimap = new Minimap(this).create();
    }

    // Called every frame from WorldScene.update() (same "reach into
    // another already-running scene" pattern WorldScene already uses for
    // this.scene.get("HUD")) with the player's current world position.
    updatePlayerPosition(worldX, worldY) {
        if (this.minimap) this.minimap.update(worldX, worldY);
    }

}

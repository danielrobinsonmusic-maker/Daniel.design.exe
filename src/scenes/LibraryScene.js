import Phaser from "phaser";
import Player from "../entities/Player";
export default class LibraryScene extends Phaser.Scene {

    constructor() {
        super("Library");
    }

    create() {

        const TILE = 32;

        // Floor
        for (let y = 0; y < 17; y++) {

            for (let x = 0; x < 25; x++) {

                this.add.rectangle(
                    x * TILE + 16,
                    y * TILE + 16,
                    TILE,
                    TILE,
                    0xd9c9a2
                ).setStrokeStyle(1, 0xb59b70);

            }

        }

        // Title
        this.add.text(
            16,
            12,
            "Library",
            {
                fontFamily: "monospace",
                fontSize: "18px",
                color: "#222222"
            }
        );

        // Placeholder bookshelf
        this.add.rectangle(
            80,
            160,
            96,
            32,
            0x6b4423
        );

        this.add.text(
            40,
            145,
            "Bookshelf",
            {
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#ffffff"
            }
        );

        // Placeholder desk
        this.add.rectangle(
            360,
            220,
            96,
            48,
            0x8b5a2b
        );

        this.add.text(
            335,
            205,
            "Desk",
            {
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#ffffff"
            }
        );
        this.interactKey = this.input.keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.E
);

this.bookshelf = {
    x: 2,
    y: 5,
    title: "Bookshelf"
};
this.player = new Player(this, 320, 420);

this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
this.cameras.main.setZoom(2);

this.physics.world.setBounds(
    0,
    0,
    800,
    600
);
        // Exit instructions
        this.add.text(
            16,
            500,
            "ESC = Return Outside (temporary)",
            {
                fontFamily: "monospace",
                fontSize: "14px",
                color: "#333333"
            }
        );

        this.input.keyboard.once("keydown-ESC", () => {

            this.scene.start("World");

        });
this.scene.bringToTop("HUD");
    }
update() {

    this.player.update();
    this.updateInteractions();

}
updateInteractions() {

    const TILE_SIZE = 32;

    const playerTileX = Math.floor(this.player.x / TILE_SIZE);
    const playerTileY = Math.floor(this.player.y / TILE_SIZE);

    const distance =
        Math.abs(playerTileX - this.bookshelf.x) +
        Math.abs(playerTileY - this.bookshelf.y);

    const hud = this.scene.get("HUD");

    if (distance <= 1) {

        hud.showInteraction(this.bookshelf.title);

       if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {

    hud.hideInteraction();

    this.scene.pause();

    this.scene.launch("LibraryShelf");

    this.scene.bringToTop("LibraryShelf");

}

    } else {

        hud.hideInteraction();

    }

}
}
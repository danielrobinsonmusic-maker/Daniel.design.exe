import Phaser from "phaser";

import BootScene from "./scenes/BootScene";
import TitleScene from "./scenes/TitleScene";
import NameScene from "./scenes/NameScene";
import WorldScene from "./scenes/WorldScene";
import HUDScene from "./scenes/HUDScene";
import AppScene from "./scenes/AppScene";
import LibraryScene from "./scenes/LibraryScene";
import LibrarianCloseupScene from "./scenes/LibrarianCloseupScene";
import BookshelfCloseupScene from "./scenes/BookshelfCloseupScene";
import BookTakeoverScene from "./scenes/BookTakeoverScene";
import GalleryScene from "./scenes/GalleryScene";
import WorkshopScene from "./scenes/WorkshopScene";
import CafeScene from "./scenes/CafeScene";
import BaristaCloseupScene from "./scenes/BaristaCloseupScene";
import TheatreScene from "./scenes/TheatreScene";
import OverlookScene from "./scenes/OverlookScene";
const config = {
    type: Phaser.AUTO,

    parent: "game",

    width: 960,
    height: 540,

    backgroundColor: "#181c24",

    pixelArt: true,

    physics: {
        default: "arcade",
        arcade: {
            debug: false,
            gravity: { y: 0 }
        }
    },

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

    scene: [
        BootScene,
        TitleScene,
        NameScene,
        WorldScene,
        HUDScene,
        AppScene,
        LibraryScene,
        LibrarianCloseupScene,
        BookshelfCloseupScene,
        BookTakeoverScene,
        GalleryScene,
        WorkshopScene,
        CafeScene,
        BaristaCloseupScene,
        TheatreScene,
        OverlookScene
    ]
};

const game = new Phaser.Game(config);
window.__game = game;

export default game;
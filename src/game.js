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
import GalleryScene from "./scenes/GalleryScene";
import WorkshopScene from "./scenes/WorkshopScene";
import CafeScene from "./scenes/CafeScene";
import BaristaCloseupScene from "./scenes/BaristaCloseupScene";
import TheatreScene from "./scenes/TheatreScene";
import TheatreAttendantCloseupScene from "./scenes/TheatreAttendantCloseupScene";
import TakeoverFrameScene from "./adventure/TakeoverFrameScene";
import OverlookScene from "./scenes/OverlookScene";
const config = {
    type: Phaser.AUTO,

    parent: "game",

    width: 960,
    height: 540,

    backgroundColor: "#181c24",

    pixelArt: true,

    // Required for Phaser's DOM Element GameObjects (this.add.dom(...)) —
    // used by TakeoverFrameScene to embed a real YouTube <iframe> for the
    // Workshop's music-projects viewer. Creates an absolutely-positioned
    // div over the canvas that Phaser keeps in sync with game coordinates
    // (including the FIT scale mode's own scaling below).
    dom: {
        createContainer: true
    },

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
        GalleryScene,
        WorkshopScene,
        CafeScene,
        BaristaCloseupScene,
        TheatreScene,
        TheatreAttendantCloseupScene,
        TakeoverFrameScene,
        OverlookScene
    ]
};

const game = new Phaser.Game(config);

export default game;

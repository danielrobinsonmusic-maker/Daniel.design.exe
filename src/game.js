import Phaser from "phaser";

import BootScene from "./scenes/BootScene";
import TitleScene from "./scenes/TitleScene";
import NameScene from "./scenes/NameScene";
import WorldScene from "./scenes/WorldScene";
import HUDScene from "./scenes/HUDScene";
import AppScene from "./scenes/AppScene";
import LibraryScene from "./scenes/LibraryScene";
import ResumeScene from "./scenes/DocumentViewerScene";
import LibraryShelfScene from "./scenes/LibraryShelfScene";
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
        ResumeScene,
        LibraryShelfScene
    ]
};

export default new Phaser.Game(config);
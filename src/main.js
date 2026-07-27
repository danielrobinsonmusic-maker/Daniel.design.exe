import Phaser from "phaser";

import BootScene from "./scenes/BootScene";
import TitleScene from "./scenes/TitleScene";
import NameScene from "./scenes/NameScene";
import TownScene from "./scenes/TownScene";

const config = {
    type: Phaser.AUTO,

    width: 960,
    height: 540,

    pixelArt: true,

    backgroundColor: "#101820",

    parent: "game",

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

    scene: [
        BootScene,
        TitleScene,
        NameScene,
        TownScene
    ]
};

new Phaser.Game(config);
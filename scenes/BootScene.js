export default class BootScene extends Phaser.Scene {

    constructor(){

        super("Boot");

    }

    preload(){

        // assets later

    }

    create(){

        this.scene.start("Title");

    }

}
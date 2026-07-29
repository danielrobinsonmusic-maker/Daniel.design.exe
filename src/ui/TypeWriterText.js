export default class TypewriterText {

    constructor(scene,textObject){

        this.scene = scene;
        this.textObject = textObject;

    }

    play(message,speed=35){

        this.textObject.setText("");

        let index = 0;

        this.scene.time.addEvent({

            delay:speed,

            repeat:message.length-1,

            callback:()=>{

                this.textObject.text += message[index];

                index++;

            }

        });

    }

}
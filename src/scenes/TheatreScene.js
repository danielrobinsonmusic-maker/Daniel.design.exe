import AdventureScene from "../adventure/AdventureScene";

// Room level for the Theatre — backdrop + idle prompt only for now, no
// hitboxes yet (same starting point the Library's Room scene had before
// its Talk/Pet/Browse interactions were added). Registered under a new
// "Theatre" scene key — see WorldScene's BUILDING_SCENES map, which
// previously had no entry for Theatre and fell through to a console.log
// placeholder.
const IDLE_TEXT = "Use your mouse to explore the Theatre.";
const NATIVE_WIDTH = 1672;
const NATIVE_HEIGHT = 941;

export default class TheatreScene extends AdventureScene {

    constructor() {
        super("Theatre");
    }

    buildScene() {

        this.backSceneKey = "World";

        this.setBackdrop("theatre-room", NATIVE_WIDTH, NATIVE_HEIGHT);

        this.bar.setText(IDLE_TEXT);

    }

}

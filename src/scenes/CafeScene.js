import AdventureScene from "../adventure/AdventureScene";

// Room level for the Café — backdrop + idle prompt only for now, no
// hitboxes yet (same starting point the Library's Room scene had before
// its Talk/Pet/Browse interactions were added). Registered under the
// same "Cafe" scene key the old flat-color placeholder used, so
// WorldScene's BUILDING_SCENES map needs no changes.
const IDLE_TEXT = "Use your mouse to explore the Café.";
const NATIVE_WIDTH = 1672;
const NATIVE_HEIGHT = 941;

export default class CafeScene extends AdventureScene {

    constructor() {
        super("Cafe");
    }

    buildScene() {

        this.backSceneKey = "World";

        this.setBackdrop("cafe-room", NATIVE_WIDTH, NATIVE_HEIGHT);

        this.bar.setText(IDLE_TEXT);

    }

}

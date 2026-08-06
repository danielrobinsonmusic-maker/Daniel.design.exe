import AdventureScene from "../adventure/AdventureScene";
import NPCDialogue from "../adventure/NPCDialogue";
import { BARISTA_GREETING, BARISTA_QUESTIONS, BARISTA_EXHAUSTED } from "../data/barista";

// Close-up level for the Café's "Talk" interaction — same structure as
// LibrarianCloseupScene (this building's reference implementation):
// clicking the barista in the Room fades here, all dialogue (greeting,
// order menu, responses, fallback line) is driven by the shared
// NPCDialogue controller (see adventure/NPCDialogue.js) and displays in
// the same AdventureBar every other scene uses, just over this backdrop
// instead. No hitboxes — this scene is dialogue-only.
const NATIVE_WIDTH = 1672;
const NATIVE_HEIGHT = 941;
const BACKDROP_KEY = "cafe-barista-closeup";
const BARISTA_NAME = "Barista";

export default class BaristaCloseupScene extends AdventureScene {

    constructor() {
        super("BaristaCloseup");
    }

    buildScene() {

        this.backSceneKey = "Cafe";

        this.setBackdrop(BACKDROP_KEY, NATIVE_WIDTH, NATIVE_HEIGHT);

        this.dialogue = new NPCDialogue({
            scene: this,
            bar: this.bar,
            namespace: "cafe.barista",
            speakerName: BARISTA_NAME,
            greeting: BARISTA_GREETING,
            questions: BARISTA_QUESTIONS,
            exhausted: BARISTA_EXHAUSTED
        });

        // Entering this scene at all IS "Talk" now (there's no separate
        // idle state to hover into first, unlike the Room's hitboxes) —
        // so it opens straight into the greeting/menu, same content and
        // persistence rules as before.
        this.dialogue.show();

    }

}

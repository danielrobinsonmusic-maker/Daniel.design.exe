import AdventureScene from "../adventure/AdventureScene";
import NPCDialogue from "../adventure/NPCDialogue";
import { ATTENDANT_GREETING, ATTENDANT_QUESTIONS, ATTENDANT_EXHAUSTED } from "../data/attendant";

// Close-up level for the Theatre's "Talk" interaction — same structure as
// LibrarianCloseupScene/BaristaCloseupScene (this building's reference
// implementations): clicking the attendant in the Room fades here, all
// dialogue is driven by the shared NPCDialogue controller (see
// adventure/NPCDialogue.js) and displays in the same AdventureBar every
// other scene uses, just over this backdrop instead. No hitboxes — this
// scene is dialogue-only.
//
// One behavioral difference from the Library/Café: there are 4 questions
// total, not 3, but the panel only ever shows 3 option slots at once
// (NPCDialogue's default maxVisibleOptions) — the 4th question backfills
// whichever slot opens up once one of the first 3 is answered, purely as
// a side effect of always slicing the first 3 of whatever's still
// remaining in ATTENDANT_QUESTIONS' fixed order (see that file's own
// comment).
const NATIVE_WIDTH = 1672;
const NATIVE_HEIGHT = 941;
const BACKDROP_KEY = "theatre-attendant-closeup";
const ATTENDANT_NAME = "Attendant";

export default class TheatreAttendantCloseupScene extends AdventureScene {

    constructor() {
        super("TheatreAttendantCloseup");
    }

    buildScene() {

        this.backSceneKey = "Theatre";

        this.setBackdrop(BACKDROP_KEY, NATIVE_WIDTH, NATIVE_HEIGHT);

        this.dialogue = new NPCDialogue({
            scene: this,
            bar: this.bar,
            namespace: "theatre.attendant",
            speakerName: ATTENDANT_NAME,
            greeting: ATTENDANT_GREETING,
            questions: ATTENDANT_QUESTIONS,
            exhausted: ATTENDANT_EXHAUSTED
        });

        // Entering this scene at all IS "Talk" now (there's no separate
        // idle state to hover into first, unlike the Room's hitboxes) —
        // so it opens straight into the greeting/menu, same content and
        // persistence rules as before.
        this.dialogue.show();

    }

}

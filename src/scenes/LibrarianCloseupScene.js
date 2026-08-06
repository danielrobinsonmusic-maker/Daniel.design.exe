import AdventureScene from "../adventure/AdventureScene";
import NPCDialogue from "../adventure/NPCDialogue";
import { LIBRARIAN_GREETING, LIBRARIAN_QUESTIONS, LIBRARIAN_EXHAUSTED } from "../data/librarian";

// Close-up level for the Library's "Talk" interaction — replaces the
// earlier inline-dialogue-over-Room approach (dialogue used to display
// directly over LibraryScene without a dedicated close-up). Clicking the
// librarian in the Room now fades here first; all dialogue (greeting,
// question menu, answers, fallback line) is driven by the shared
// NPCDialogue controller (see adventure/NPCDialogue.js — this building is
// its reference usage) and displays in the same AdventureBar every other
// scene uses, just over this backdrop instead. No hitboxes — this scene
// is dialogue-only.
const NATIVE_WIDTH = 1672;
const NATIVE_HEIGHT = 941;
const BACKDROP_KEY = "library-librarian-closeup";
const LIBRARIAN_NAME = "Librarian";

export default class LibrarianCloseupScene extends AdventureScene {

    constructor() {
        super("LibrarianCloseup");
    }

    buildScene() {

        this.backSceneKey = "Library";

        this.setBackdrop(BACKDROP_KEY, NATIVE_WIDTH, NATIVE_HEIGHT);

        this.dialogue = new NPCDialogue({
            scene: this,
            bar: this.bar,
            namespace: "library.librarian",
            speakerName: LIBRARIAN_NAME,
            greeting: LIBRARIAN_GREETING,
            questions: LIBRARIAN_QUESTIONS,
            exhausted: LIBRARIAN_EXHAUSTED
        });

        // Entering this scene at all IS "Talk" now (there's no separate
        // idle state to hover into first, unlike the Room's hitboxes) —
        // so it opens straight into the greeting/menu, same content and
        // persistence rules as before.
        this.dialogue.show();

    }

}

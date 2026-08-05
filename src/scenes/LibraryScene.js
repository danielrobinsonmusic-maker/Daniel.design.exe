import AdventureScene from "../adventure/AdventureScene";

// Reference implementation of the Room level for the point-and-click
// adventure system (see AdventureScene.js) — the pattern this establishes
// (backdrop + rectangular hitboxes + bottom bar + fade transitions) is
// meant to be reused for Gallery/Café/Workshop/Theatre's own Room scenes.
// Registered under the same "Library" scene key the old walk-around
// version used, so WorldScene's BUILDING_SCENES map needs no changes.
//
// The librarian's dialogue used to display inline, right here, over this
// Room's own backdrop (see git history). It now lives in its own
// LibrarianCloseupScene — Talk fades there first, same as Browse already
// faded to BookshelfCloseup — so Room itself no longer owns any dialogue
// state.
const IDLE_TEXT = "Use your mouse to explore the Library.";
const NATIVE_WIDTH = 1672;
const NATIVE_HEIGHT = 941;
const CAT_NAME = "Ed the Cat";

export default class LibraryScene extends AdventureScene {

    constructor() {
        super("Library");
    }

    buildScene() {

        this.backSceneKey = "World";

        this.setBackdrop("library-room", NATIVE_WIDTH, NATIVE_HEIGHT);

        this.addHitbox({
            xRange: [0.09, 0.27],
            yRange: [0.25, 0.70],
            verb: "Talk",
            onClick: () => this.fadeTo("LibrarianCloseup")
        });

        this.addHitbox({
            xRange: [0.28, 0.43],
            yRange: [0.40, 0.62],
            verb: "Pet",
            onClick: () => this.petCat()
        });

        this.addHitbox({
            xRange: [0.62, 0.92],
            yRange: [0.08, 0.78],
            verb: "Browse",
            onClick: () => this.fadeTo("BookshelfCloseup")
        });

        this.bar.setText(IDLE_TEXT);

    }

    // Endpoint interaction — no further scene depth, just a flavor line
    // that reverts to the idle prompt after a beat. (No audio asset for a
    // purr exists in this project yet — see AudioManager.js's dead-file
    // note in CLAUDE.md — so this is text-only for now.)
    petCat() {

        this.bar.setText("Purrrr...", [], CAT_NAME);

        this.time.delayedCall(2500, () => {
            this.bar.setText(IDLE_TEXT);
        });

    }

}

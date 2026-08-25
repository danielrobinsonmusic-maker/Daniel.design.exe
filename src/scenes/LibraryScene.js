import AdventureScene from "../adventure/AdventureScene";
import { recordCatInteraction, getCatPetVerb } from "../managers/CatAchievement";
import { showCatAchievementPopup } from "../ui/CatAchievementPopup";
import { checkNPCAchievement } from "../managers/NPCAchievement";
import { showNPCAchievementPopup } from "../ui/NPCAchievementPopup";
import AudioManager from "../managers/AudioManager";

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

    // Library's own backdrop/closeup/frame art and music — used to load
    // unconditionally in BootScene regardless of whether the player ever
    // entered the Library, now deferred to here (see BootScene.js's own
    // comment on the Scenes section). library-book is included here (not
    // loaded on demand by TakeoverFrameScene itself) since it's the frame
    // for every one of Library's own book viewers (Resume/Writing/
    // Portfolio/News) — reachable only after passing through this Room
    // scene first, so it's always already cached by the time it's needed.
    preload() {

        this.showLoadingText();

        this.load.image("library-room", "assets/scenes/library-room.png");
        this.load.image("library-bookshelf-closeup", "assets/scenes/library-bookshelf-closeup.png");
        this.load.image("library-librarian-closeup", "assets/scenes/library-librarian-closeup.png");
        this.load.image("library-book", "assets/scenes/library-book.png");
        this.load.audio("music-library", "assets/audio/music/library.mp3");

    }

    buildScene() {

        this.backSceneKey = "World";

        AudioManager.playBuildingMusic(this, "library");

        this.setBackdrop("library-room", NATIVE_WIDTH, NATIVE_HEIGHT);

        this.addHitbox({
            xRange: [0.09, 0.27],
            yRange: [0.25, 0.70],
            verb: "Talk to Librarian",
            onClick: () => this.fadeTo("LibrarianCloseup")
        });

        this.addHitbox({
            xRange: [0.28, 0.43],
            yRange: [0.40, 0.62],
            verb: getCatPetVerb(),
            clickSfx: "sfx-cat",
            onClick: () => this.petCat()
        });

        this.addHitbox({
            xRange: [0.62, 0.92],
            yRange: [0.08, 0.78],
            verb: "Browse Bookshelf",
            onClick: () => this.fadeTo("BookshelfCloseup")
        });

        this.bar.setText(IDLE_TEXT);

    }

    // Endpoint interaction — no further scene depth, just a flavor line
    // that reverts to the idle prompt after a beat. (No audio asset for a
    // purr exists in this project yet, so this is text-only for now —
    // see managers/AudioManager.js for the town/overlook background loops
    // that DO exist.)
    petCat() {

        this.bar.setText("Purrrr...", [], CAT_NAME);

        if (recordCatInteraction("library")) {
            showCatAchievementPopup(this);
        }

        if (checkNPCAchievement()) {
            showNPCAchievementPopup(this);
        }

        this.time.delayedCall(2500, () => {
            this.bar.setText(IDLE_TEXT);
        });

    }

}

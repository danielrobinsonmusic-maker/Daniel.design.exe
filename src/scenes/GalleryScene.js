import AdventureScene from "../adventure/AdventureScene";
import NPCDialogue from "../adventure/NPCDialogue";
import ContentType from "../data/contentTypes";
import { GALLERY_GREETING, GALLERY_QUESTIONS, GALLERY_EXHAUSTED } from "../data/galleryAttendant";
import { recordCatInteraction } from "../managers/CatAchievement";
import { showCatAchievementPopup } from "../ui/CatAchievementPopup";
import AudioManager from "../managers/AudioManager";

// Only one item (no per-visit variation like the books/movies/workshop
// content have), so it's a plain constant here rather than its own data
// file — passed straight through to TakeoverFrameScene as `content`.
const SLIDESHOW_CONTENT = {
    title: "Gallery Slideshow",
    type: ContentType.PLACEHOLDER,
    content: "Gallery slideshow coming soon."
};

// Room level for the Gallery — backdrop + Talk/Admire/Pet hitboxes,
// following the Library Room's reference pattern (backdrop + rectangular
// hitboxes + bottom bar + fade transitions — see LibraryScene.js), with
// one difference: the attendant's dialogue (greeting/question menu/
// answers/fallback) renders inline on this Room scene instead of fading
// to a dedicated close-up like the Library's LibrarianCloseupScene or
// Café's BaristaCloseupScene — there's no separate "close-up" backdrop
// for the attendant, just this same room. The Talk hitbox calls straight
// into the shared NPCDialogue controller (see adventure/NPCDialogue.js),
// same as every other building's Talk NPC, just without a scene
// transition wrapped around it. Registered under the same "Gallery" scene
// key the old flat-color placeholder used, so WorldScene's BUILDING_SCENES
// map needs no changes.
const IDLE_TEXT = "Use your mouse to explore the Gallery.";
const NATIVE_WIDTH = 1672;
const NATIVE_HEIGHT = 941;
const ATTENDANT_NAME = "Attendant";
const CAT_NAME = "Ed the Cat";

export default class GalleryScene extends AdventureScene {

    constructor() {
        super("Gallery");
    }

    buildScene() {

        this.backSceneKey = "World";

        AudioManager.playBuildingMusic(this, "gallery");

        this.setBackdrop("gallery-room", NATIVE_WIDTH, NATIVE_HEIGHT);

        this.dialogue = new NPCDialogue({
            scene: this,
            bar: this.bar,
            namespace: "gallery.attendant",
            speakerName: ATTENDANT_NAME,
            greeting: GALLERY_GREETING,
            questions: GALLERY_QUESTIONS,
            exhausted: GALLERY_EXHAUSTED
        });

        this.addHitbox({
            xRange: [0.18, 0.32],
            yRange: [0.20, 0.90],
            verb: "Talk",
            onClick: () => this.dialogue.show()
        });

        this.addHitbox({
            xRange: [0.38, 0.63],
            yRange: [0.05, 0.48],
            verb: "Admire",
            onClick: () => this.fadeTo("TakeoverFrame", {
                frameKey: "gallery-slideshow",
                content: SLIDESHOW_CONTENT,
                backSceneKey: "Gallery"
            })
        });

        this.addHitbox({
            xRange: [0.73, 0.80],
            yRange: [0.62, 0.82],
            verb: "Pet",
            clickSfx: "sfx-cat",
            onClick: () => this.petCat()
        });

        this.bar.setText(IDLE_TEXT);

    }

    // Endpoint interaction — no further scene depth, just a flavor line
    // that reverts to the idle prompt after a beat. Same cat, remembering
    // a friendlier visitor than the Theatre got — same pattern as the
    // other buildings' petCat().
    petCat() {

        this.bar.setText("Purrr...\n\nHe seems to remember you.", [], CAT_NAME);

        if (recordCatInteraction("gallery")) {
            showCatAchievementPopup(this);
        }

        this.time.delayedCall(2500, () => {
            this.bar.setText(IDLE_TEXT);
        });

    }

}

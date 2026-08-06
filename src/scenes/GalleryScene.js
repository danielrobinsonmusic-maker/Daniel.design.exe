import AdventureScene from "../adventure/AdventureScene";
import SaveManager from "../managers/SaveManager";
import ContentType from "../data/contentTypes";
import { GALLERY_GREETING, GALLERY_QUESTIONS, GALLERY_EXHAUSTED } from "../data/galleryAttendant";

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
// for the attendant, just this same room. Talk re-runs showDialogue()
// from scratch on every click, so it always reflects whatever's currently
// left (or the fallback) rather than needing any manual reset — the same
// "recompute from SaveManager flags" approach those close-up scenes use,
// just without a scene transition wrapped around it. Registered under the
// same "Gallery" scene key the old flat-color placeholder used, so
// WorldScene's BUILDING_SCENES map needs no changes.
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

        this.setBackdrop("gallery-room", NATIVE_WIDTH, NATIVE_HEIGHT);

        this.addHitbox({
            xRange: [0.18, 0.32],
            yRange: [0.20, 0.90],
            verb: "Talk",
            onClick: () => this.showDialogue()
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
            onClick: () => this.petCat()
        });

        this.bar.setText(IDLE_TEXT);

    }

    // Flag key namespaced by building/NPC/question so this generic
    // SaveManager flag store can hold every future building's dialogue
    // progress without collisions.
    flagKey(questionId) {
        return `gallery.attendant.q.${questionId}`;
    }

    remainingQuestions() {
        return GALLERY_QUESTIONS.filter((q) => !SaveManager.hasFlag(this.flagKey(q.id)));
    }

    showDialogue() {

        const remaining = this.remainingQuestions();

        // Once every question has ever been answered (any visit, any
        // session — see SaveManager.hasFlag), Talk shows ONLY the
        // exhausted line, per the design spec — no greeting.
        if (!remaining.length) {
            this.bar.setText(GALLERY_EXHAUSTED, [], ATTENDANT_NAME);
            return;
        }

        this.showQuestionMenu(GALLERY_GREETING, remaining);

    }

    showQuestionMenu(introText, remaining) {

        const options = remaining.map((q) => ({
            label: q.question,
            onSelect: () => this.answerQuestion(q)
        }));

        this.bar.setText(introText, options, ATTENDANT_NAME);

    }

    // Persists immediately (this visit or any future one — see
    // SaveManager.setFlag) so the question is gone from the menu for good,
    // then shows its answer with whatever's left below it — or, if that
    // was the last one, the answer followed by the exhausted line, with
    // no options.
    answerQuestion(question) {

        SaveManager.setFlag(this.flagKey(question.id));

        const remaining = this.remainingQuestions();

        if (!remaining.length) {
            this.bar.setText(`${question.answer}\n\n${GALLERY_EXHAUSTED}`, [], ATTENDANT_NAME);
            return;
        }

        this.showQuestionMenu(question.answer, remaining);

    }

    // Endpoint interaction — no further scene depth, just a flavor line
    // that reverts to the idle prompt after a beat. Same cat, remembering
    // a friendlier visitor than the Theatre got — same pattern as the
    // other buildings' petCat().
    petCat() {

        this.bar.setText("Purrr...\n\nHe seems to remember you.", [], CAT_NAME);

        this.time.delayedCall(2500, () => {
            this.bar.setText(IDLE_TEXT);
        });

    }

}

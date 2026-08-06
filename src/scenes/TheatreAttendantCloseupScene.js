import AdventureScene from "../adventure/AdventureScene";
import SaveManager from "../managers/SaveManager";
import { ATTENDANT_GREETING, ATTENDANT_QUESTIONS, ATTENDANT_EXHAUSTED } from "../data/attendant";

// Close-up level for the Theatre's "Talk" interaction — same structure as
// LibrarianCloseupScene/BaristaCloseupScene (this building's reference
// implementations): clicking the attendant in the Room fades here, all
// dialogue displays in the same AdventureBar every other scene uses, just
// over this backdrop instead. No hitboxes — this scene is dialogue-only.
//
// One behavioral difference from the Library/Café: there are 4 questions
// total, not 3, but the panel only ever shows 3 option slots at once (see
// showQuestionMenu's remaining.slice(0, 3) below) — the 4th question
// backfills whichever slot opens up once one of the first 3 is answered,
// purely as a side effect of always slicing the first 3 of whatever's
// still remaining in ATTENDANT_QUESTIONS' fixed order (see that file's
// own comment).
const NATIVE_WIDTH = 1672;
const NATIVE_HEIGHT = 941;
const BACKDROP_KEY = "theatre-attendant-closeup";
const ATTENDANT_NAME = "Attendant";
const VISIBLE_SLOTS = 3;

export default class TheatreAttendantCloseupScene extends AdventureScene {

    constructor() {
        super("TheatreAttendantCloseup");
    }

    buildScene() {

        this.backSceneKey = "Theatre";

        this.setBackdrop(BACKDROP_KEY, NATIVE_WIDTH, NATIVE_HEIGHT);

        // Entering this scene at all IS "Talk" now (there's no separate
        // idle state to hover into first, unlike the Room's hitboxes) —
        // so it opens straight into the greeting/menu, same content and
        // persistence rules as before.
        this.showDialogue();

    }

    // Flag key namespaced by building/NPC/question so this generic
    // SaveManager flag store can hold every future building's dialogue
    // progress without collisions.
    flagKey(questionId) {
        return `theatre.attendant.q.${questionId}`;
    }

    remainingQuestions() {
        return ATTENDANT_QUESTIONS.filter((q) => !SaveManager.hasFlag(this.flagKey(q.id)));
    }

    showDialogue() {

        const remaining = this.remainingQuestions();

        // Once every question has ever been asked (any visit, any
        // session — see SaveManager.hasFlag), Talk shows ONLY the
        // exhausted line, per the design spec — no greeting.
        if (!remaining.length) {
            this.bar.setText(ATTENDANT_EXHAUSTED, [], ATTENDANT_NAME);
            return;
        }

        this.showQuestionMenu(ATTENDANT_GREETING, remaining);

    }

    // remaining can hold up to 4 entries (unlike the Library/Café, which
    // only ever have as many total questions as fit in one menu) — only
    // the first VISIBLE_SLOTS of it become options, so the panel never
    // shows more than 3 regardless of how many are actually left.
    showQuestionMenu(introText, remaining) {

        const options = remaining.slice(0, VISIBLE_SLOTS).map((q) => ({
            label: q.question,
            onSelect: () => this.answerQuestion(q)
        }));

        this.bar.setText(introText, options, ATTENDANT_NAME);

    }

    // Persists immediately (this visit or any future one — see
    // SaveManager.setFlag) so the question is gone from rotation for good,
    // then shows its answer with whatever's left below it (still capped
    // at 3 slots) — or, if that was the last one, the answer followed by
    // the exhausted line, with no options.
    answerQuestion(question) {

        SaveManager.setFlag(this.flagKey(question.id));

        const remaining = this.remainingQuestions();

        if (!remaining.length) {
            this.bar.setText(`${question.answer}\n\n${ATTENDANT_EXHAUSTED}`, [], ATTENDANT_NAME);
            return;
        }

        this.showQuestionMenu(question.answer, remaining);

    }

}

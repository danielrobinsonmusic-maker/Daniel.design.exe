import AdventureScene from "../adventure/AdventureScene";
import SaveManager from "../managers/SaveManager";
import { LIBRARIAN_GREETING, LIBRARIAN_QUESTIONS, LIBRARIAN_EXHAUSTED } from "../data/librarian";

// Close-up level for the Library's "Talk" interaction — replaces the
// earlier inline-dialogue-over-Room approach (dialogue used to display
// directly over LibraryScene without a dedicated close-up). Clicking the
// librarian in the Room now fades here first; all dialogue (greeting,
// question menu, answers, fallback line) displays in the same
// AdventureBar every other scene uses, just over this backdrop instead.
// No hitboxes — this scene is dialogue-only.
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
        return `library.librarian.q.${questionId}`;
    }

    remainingQuestions() {
        return LIBRARIAN_QUESTIONS.filter((q) => !SaveManager.hasFlag(this.flagKey(q.id)));
    }

    showDialogue() {

        const remaining = this.remainingQuestions();

        // Once every question has ever been answered (any visit, any
        // session — see SaveManager.hasFlag), Talk shows ONLY the
        // exhausted line, per the design spec — no greeting.
        if (!remaining.length) {
            this.bar.setText(LIBRARIAN_EXHAUSTED, [], LIBRARIAN_NAME);
            return;
        }

        this.showQuestionMenu(LIBRARIAN_GREETING, remaining);

    }

    showQuestionMenu(introText, remaining) {

        const options = remaining.map((q) => ({
            label: q.question,
            onSelect: () => this.answerQuestion(q)
        }));

        this.bar.setText(introText, options, LIBRARIAN_NAME);

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
            this.bar.setText(`${question.answer}\n\n${LIBRARIAN_EXHAUSTED}`, [], LIBRARIAN_NAME);
            return;
        }

        this.showQuestionMenu(question.answer, remaining);

    }

}

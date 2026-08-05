import AdventureScene from "../adventure/AdventureScene";
import SaveManager from "../managers/SaveManager";
import { BARISTA_GREETING, BARISTA_QUESTIONS, BARISTA_EXHAUSTED } from "../data/barista";

// Close-up level for the Café's "Talk" interaction — same structure as
// LibrarianCloseupScene (this building's reference implementation):
// clicking the barista in the Room fades here, all dialogue (greeting,
// order menu, responses, fallback line) displays in the same AdventureBar
// every other scene uses, just over this backdrop instead. No hitboxes —
// this scene is dialogue-only.
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

        // Entering this scene at all IS "Talk" now (there's no separate
        // idle state to hover into first, unlike the Room's hitboxes) —
        // so it opens straight into the greeting/menu, same content and
        // persistence rules as before.
        this.showDialogue();

    }

    // Flag key namespaced by building/NPC/order so this generic
    // SaveManager flag store can hold every future building's dialogue
    // progress without collisions.
    flagKey(questionId) {
        return `cafe.barista.q.${questionId}`;
    }

    remainingQuestions() {
        return BARISTA_QUESTIONS.filter((q) => !SaveManager.hasFlag(this.flagKey(q.id)));
    }

    showDialogue() {

        const remaining = this.remainingQuestions();

        // Once every order has ever been selected (any visit, any
        // session — see SaveManager.hasFlag), Talk shows ONLY the
        // exhausted line, per the design spec — no greeting.
        if (!remaining.length) {
            this.bar.setText(BARISTA_EXHAUSTED, [], BARISTA_NAME);
            return;
        }

        this.showQuestionMenu(BARISTA_GREETING, remaining);

    }

    showQuestionMenu(introText, remaining) {

        const options = remaining.map((q) => ({
            label: q.question,
            onSelect: () => this.answerQuestion(q)
        }));

        this.bar.setText(introText, options, BARISTA_NAME);

    }

    // Persists immediately (this visit or any future one — see
    // SaveManager.setFlag) so the order is gone from the menu for good,
    // then shows its response with whatever's left below it — or, if that
    // was the last one, the response followed by the exhausted line, with
    // no options.
    answerQuestion(question) {

        SaveManager.setFlag(this.flagKey(question.id));

        const remaining = this.remainingQuestions();

        if (!remaining.length) {
            this.bar.setText(`${question.answer}\n\n${BARISTA_EXHAUSTED}`, [], BARISTA_NAME);
            return;
        }

        this.showQuestionMenu(question.answer, remaining);

    }

}

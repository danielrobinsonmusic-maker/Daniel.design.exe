import SaveManager from "../managers/SaveManager";
import { withPlayerName } from "../utils/dialogueText";

// The last answer stays on screen this long before being swapped out for
// the fallback line, once that was the final question — see point 2 of
// the dialogue panel spec: the two used to render stacked together on the
// same screen; now the fallback replaces the answer after a beat instead.
const FALLBACK_DELAY = 3500;

// Shared controller behind every human-NPC "Talk" interaction (Librarian,
// Barista, Theatre attendant, Gallery attendant) — greeting/question-menu/
// answer/fallback flow, SaveManager-backed per-question persistence, and
// player-name insertion into the greeting/fallback lines, all in one
// place. Each building's scene just constructs one of these with its own
// content + AdventureBar instead of reimplementing this flow — see
// LibrarianCloseupScene for the reference usage. Cat reaction lines don't
// go through here since they're one-off flavor text, not multi-turn
// dialogue with persisted state.
export default class NPCDialogue {

    constructor({ scene, bar, namespace, speakerName, greeting, questions, exhausted, maxVisibleOptions = 3 }) {

        this.scene = scene;
        this.bar = bar;
        this.namespace = namespace;
        this.speakerName = speakerName;
        this.greeting = greeting;
        this.questions = questions;
        this.exhausted = exhausted;
        this.maxVisibleOptions = maxVisibleOptions;

    }

    // Namespaced by building/NPC so this generic SaveManager flag store
    // can hold every building's dialogue progress without collisions —
    // e.g. "library.librarian.q.meta-years".
    flagKey(questionId) {
        return `${this.namespace}.q.${questionId}`;
    }

    remainingQuestions() {
        return this.questions.filter((q) => !SaveManager.hasFlag(this.flagKey(q.id)));
    }

    formatLine(template) {
        return withPlayerName(template, SaveManager.getName());
    }

    // Entry point — call when the player opens this NPC's dialogue (a
    // Close-up scene starting, or a Room's Talk hitbox). Once every
    // question has ever been answered (any visit, any session — see
    // SaveManager.hasFlag), shows ONLY the fallback line immediately —
    // never the greeting, never a stale answer from a past visit.
    show() {

        const remaining = this.remainingQuestions();

        if (!remaining.length) {
            this.bar.setText(this.formatLine(this.exhausted), [], this.speakerName);
            return;
        }

        this.showQuestionMenu(this.formatLine(this.greeting), remaining);

    }

    // remaining can hold more entries than maxVisibleOptions (the Theatre
    // attendant has 4 questions but only 3 panel slots) — only the first
    // maxVisibleOptions become options; the rest backfill as earlier ones
    // get answered, purely as a side effect of always slicing whatever's
    // still remaining in the fixed question order.
    showQuestionMenu(introText, remaining) {

        const options = remaining.slice(0, this.maxVisibleOptions).map((q) => ({
            label: q.question,
            onSelect: () => this.answerQuestion(q)
        }));

        this.bar.setText(introText, options, this.speakerName);

    }

    // Persists immediately (this visit or any future one) so the question
    // is gone from rotation for good, then shows its answer with whatever
    // remains below it — or, if that was the last one, the answer alone,
    // swapped out for the fallback line after FALLBACK_DELAY rather than
    // showing both at once.
    answerQuestion(question) {

        SaveManager.setFlag(this.flagKey(question.id));

        const remaining = this.remainingQuestions();

        if (!remaining.length) {

            this.bar.setText(question.answer, [], this.speakerName);

            this.scene.time.delayedCall(FALLBACK_DELAY, () => {
                this.bar.setText(this.formatLine(this.exhausted), [], this.speakerName);
            });

            return;

        }

        this.showQuestionMenu(question.answer, remaining);

    }

}

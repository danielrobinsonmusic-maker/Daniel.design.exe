// Barista NPC dialogue for the Café Room scene. Each order is flagged
// (via SaveManager) once selected, so it's permanently removed from the
// menu across visits and sessions — see BaristaCloseupScene's flag key
// convention: `cafe.barista.q.<id>`. Structurally identical to
// data/librarian.js (question/answer pairs consumed one at a time) even
// though these are order options rather than questions.
export const BARISTA_GREETING = "What can I get you started today?";

export const BARISTA_EXHAUSTED = "That's Daniel's cat, Edison. You might see him around town.";

export const BARISTA_QUESTIONS = [
    {
        id: "black-coffee",
        question: "Black coffee",
        answer: "Sounds good. You know, our town's founder, Daniel, only drinks black coffee when he needs the extra boost for an executive presentation or running a workshop."
    },
    {
        id: "iced-tea",
        question: "Iced tea",
        answer: "This is Daniel's go-to for caffeine. You'll see a lot of them on his desk while he gets in the zone designing."
    },
    {
        id: "almond-croissant",
        question: "An almond croissant",
        answer: "Ah, who can resist! Daniel loves baking pastries at home in his spare time!"
    }
];

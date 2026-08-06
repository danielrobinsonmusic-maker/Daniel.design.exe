// Librarian NPC dialogue for the Library Room scene. Each question is
// flagged (via SaveManager) once answered, so it's permanently removed
// from the menu across visits and sessions — see LibraryRoomScene's
// flag key convention: `library.librarian.q.<id>`.
export const LIBRARIAN_GREETING =
    "Welcome to the Daniel.design public library{{name}}! Our curator, Daniel, is an avid book collector, reader, writer and designer. You can learn more about him on that bookshelf over there, but let me know if you have any questions.";

export const LIBRARIAN_EXHAUSTED =
    "Worth checking out the bookshelf to learn more{{name}}!";

export const LIBRARIAN_QUESTIONS = [
    {
        id: "meta-years",
        question: "How many years did Daniel work at Meta?",
        answer: "He worked there for almost 7 years! I think he was on a handful of different teams, but mainly focused on Augmented and Virtual Reality platforms, including the Metaverse... though I'm not sure what that is, to be honest."
    },
    {
        id: "lives-now",
        question: "Where does Daniel live now?",
        answer: "He lives and works from his garage in Venice Beach. I think he turned it into some kind of studio. You can actually go check it out in town, east of the town square."
    },
    {
        id: "focus",
        question: "What is Daniel's focus, these days?",
        answer: "You know, he's always been adamant that even the most complex ideas can be simplified. People are important to him, so he really designs for EVERYONE, no matter the project. Otherwise, he's really focused on emerging technology, media and connecting people."
    }
];

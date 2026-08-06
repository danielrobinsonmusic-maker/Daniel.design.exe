// Gallery attendant dialogue for the Gallery Room scene. Each question is
// flagged (via SaveManager) once answered, so it's permanently removed
// from the menu across visits and sessions — see GalleryScene's flag key
// convention: `gallery.attendant.q.<id>`. Same question/answer shape as
// data/librarian.js, data/barista.js, and data/attendant.js — this
// building's dialogue just renders inline on the Room scene instead of a
// dedicated close-up (see GalleryScene's showDialogue/answerQuestion).
export const GALLERY_GREETING = "Welcome to the Robinson Gallery{{name}}. Look around for some of Daniel's visual design work, photography, and artwork.";

export const GALLERY_EXHAUSTED = "You should definitely visit the Library{{name,}} if you're interested in seeing more of his professional work on display.";

export const GALLERY_QUESTIONS = [
    {
        id: "years-in-design",
        question: "How long has Daniel been working in design?",
        answer: "Daniel started exploring content design and product design at Hulu, where his career in Tech and Media started over 15 years ago."
    },
    {
        id: "favorite-artists",
        question: "Does Daniel have any favorite designers or artists?",
        answer: "Daniel loves the work of Marc Chagall, Robert Rauschenberg, Charles & Ray Eames, and Ralph Steadman, amongst others."
    },
    {
        id: "gallery-inspiration",
        question: "What inspired this gallery space?",
        answer: "He was largely inspired by The Art Institute of Chicago, where Daniel was born and raised."
    }
];

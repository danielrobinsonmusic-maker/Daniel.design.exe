// Ticket booth attendant dialogue for the Theatre lobby scene. Each
// question is flagged (via SaveManager) once asked, so it's permanently
// removed across visits and sessions — see TheatreAttendantCloseupScene's
// flag key convention: `theatre.attendant.q.<id>`.
//
// Order matters here beyond just display: the attendant always shows
// exactly 3 option slots (see showQuestionMenu's remaining.slice(0, 3) in
// TheatreAttendantCloseupScene), so the first 3 entries below are what
// appear initially, and the 4th ("storytime-portal") only enters rotation
// once one of the first 3 has been answered and .slice(0, 3) reaches far
// enough into the remaining list to include it — no separate "reserve"
// state needed, just this fixed order filtered by what's left.
export const ATTENDANT_GREETING = "Welcome to Daniel's theatre. Let me know if you need a recommendation on what to watch.";

export const ATTENDANT_EXHAUSTED = "Check out the Gallery just south of here if you want to see some more of Daniel's creative work.";

export const ATTENDANT_QUESTIONS = [
    {
        id: "realtime-voting",
        question: "How is Real-Time Voting?",
        answer: "It's very interactive and engaging. Daniel worked on the project for over a year and got to write for Anthony Anderson and Kevin Hart."
    },
    {
        id: "netflix-moments",
        question: "How is Netflix Moments?",
        answer: "It's amazing! Daniel helped bring Netflix into new territory with its first social feature."
    },
    {
        id: "nfl-squidgame",
        question: "How is NFL x Squidgame?",
        answer: "Really fun! With Daniel's guidelines, they were able to create a unique and exciting collaboration."
    },
    {
        id: "storytime-portal",
        question: "How is Story-Time on Portal?",
        answer: "So sweet. Daniel has always cared about connecting people."
    }
];

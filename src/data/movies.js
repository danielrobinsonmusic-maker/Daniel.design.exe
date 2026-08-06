import ContentType from "./contentTypes";

// Poster -> Watch Movie content for the Theatre lobby scene, rendered by
// the shared TakeoverFrameScene (frameKey "movie-screen" — see
// adventure/takeoverFrames.js). Real video content TBD, so every entry is
// PLACEHOLDER type for now — same reasoning as
// data/workshopContent.js/data/library.js's own GALLERY-type entries had
// before real documents existed. Order matches the posters left to right
// in TheatreScene.js.
export const MOVIES = [
    {
        id: "realtime-voting",
        title: "Real-Time Voting",
        type: ContentType.PLACEHOLDER,
        content: "Full video coming soon."
    },
    {
        id: "storytime-portal",
        title: "Story-Time on Portal",
        type: ContentType.PLACEHOLDER,
        content: "Full video coming soon."
    },
    {
        id: "netflix-moments",
        title: "Netflix Moments",
        type: ContentType.PLACEHOLDER,
        content: "Full video coming soon."
    },
    {
        id: "nfl-squidgame",
        title: "NFL x Squidgame",
        type: ContentType.PLACEHOLDER,
        content: "Full video coming soon."
    }
];

import ContentType from "./contentTypes";

// Poster -> Watch Movie content for the Theatre lobby scene, rendered by
// the shared TakeoverFrameScene (frameKey "movie-screen" — see
// adventure/takeoverFrames.js). Real video content is still TBD for three
// of the four (PLACEHOLDER type, same reasoning as
// data/workshopContent.js/data/library.js's own GALLERY-type entries had
// before real documents existed); nfl-squidgame has real clips — see
// TakeoverFrameScene.renderVideoPlaylist. Order matches the posters left
// to right in TheatreScene.js.
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
        // No title here (unlike the other three) — the screen's own
        // content area isn't huge, and the video is meant to fill it
        // completely (see TakeoverFrameScene.renderVideoPlaylist); a
        // title would eat into the same fixed vertical offset every other
        // content type reserves for one, shrinking the video and pushing
        // it visibly low/off-center within the screen for no benefit —
        // same tradeoff as the Workshop music-projects viewer's embed.
        type: ContentType.VIDEO_PLAYLIST,
        // Loaded on demand (not up front in BootScene — see
        // TakeoverFrameScene.renderVideoPlaylist) since these are
        // several MB each; no reason to make every player download them
        // before they've even clicked this specific poster.
        videos: [
            "assets/video/NFL-Squidgame/ActorsAwardsWR.mp4",
            "assets/video/NFL-Squidgame/NFLWR.mp4",
            "assets/video/NFL-Squidgame/UnfinishedBeefWR.mp4"
        ]
    }
];

import ContentType from "./contentTypes";

// Poster -> Watch Movie content for the Theatre lobby scene, rendered by
// the shared TakeoverFrameScene (frameKey "movie-screen" — see
// adventure/takeoverFrames.js). All four now have real clips — see
// TakeoverFrameScene.renderVideoPlaylist. Order matches the posters left
// to right in TheatreScene.js.
export const MOVIES = [
    {
        id: "realtime-voting",
        // No title — same tradeoff as netflix-moments/nfl-squidgame below.
        type: ContentType.VIDEO_PLAYLIST,
        videos: [
            "assets/video/real-time-voting/starsearch.mp4"
        ]
    },
    {
        id: "storytime-portal",
        // No title — same tradeoff as the other three video posters.
        type: ContentType.VIDEO_PLAYLIST,
        videos: [
            "assets/video/storytime/storytime1.mp4",
            "assets/video/storytime/storytime2.mp4"
        ]
    },
    {
        id: "netflix-moments",
        // No title (same tradeoff nfl-squidgame below already made) — a
        // title would eat into the fixed vertical offset every other
        // content type reserves for one, shrinking this single clip and
        // pushing it visibly low/off-center within the screen. The hover
        // verb over this poster (see TheatreScene.js) just falls back to
        // the generic "Watch Movie" without a title to interpolate.
        type: ContentType.VIDEO_PLAYLIST,
        // Loaded on demand, same as nfl-squidgame below — no reason to
        // make every player download this before they've even clicked
        // this specific poster.
        videos: [
            "assets/video/moments/moments-on-netflix.mp4"
        ]
    },
    {
        id: "nfl-squidgame",
        // No title — same tradeoff as the other three (see
        // TakeoverFrameScene.renderVideoPlaylist): a title would eat into
        // the same fixed vertical offset every other content type
        // reserves for one, shrinking the video and pushing it visibly
        // low/off-center within the screen for no benefit — same tradeoff
        // as the Workshop music-projects viewer's embed.
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

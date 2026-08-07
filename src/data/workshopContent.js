import ContentType from "./contentTypes";

// Viewer content for the Workshop Room scene's 3 "look/listen" hitboxes
// (blueprints, computer, guitar/amp), rendered by the shared
// TakeoverFrameScene (frameKey "workshop-blueprints"/"workshop-computer"/
// "workshop-music" — see adventure/takeoverFrames.js) — which entry backs
// a given visit comes in via init(data), same "one scene, data picked at
// fadeTo time" approach as data/library.js/data/movies.js. Blueprints and
// computer are still placeholders (title is the viewer shell's name, not
// a specific piece of content, since there's no individual item to name
// yet); guitar/amp now has real content — a YouTube playlist embed.
export const WORKSHOP_CONTENT = [
    {
        id: "blueprints",
        title: "Gallery Viewer",
        type: ContentType.PLACEHOLDER,
        content: "Game assets and inspirational photos of people and places — coming soon."
    },
    {
        id: "computer",
        title: "Video Viewer",
        type: ContentType.PLACEHOLDER,
        content: "Prototype videos, built and coded — coming soon."
    },
    {
        id: "guitar",
        // No title here (unlike the other two entries) — this content
        // area is small, and the embedded player is meant to anchor
        // right at its top (see TakeoverFrameScene.renderYouTubeEmbed);
        // a title label above it would either overlap or force the
        // player smaller to make room, and wasn't asked for.
        type: ContentType.YOUTUBE_EMBED,
        embedUrl: "https://www.youtube.com/embed/videoseries?list=OLAK5uy_lB9Xvdf9mQARXU45-c6hpZ0_U1_rNSTlI",
        caption: "Daniel has written, produced, and recorded several full length albums, as well as scored filmns, projects, and video games. This is one of his latest albums: The Birds."
ß    }
];

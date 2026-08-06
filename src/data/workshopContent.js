import ContentType from "./contentTypes";

// Placeholder viewer content for the Workshop Room scene's 3 "look/listen"
// hitboxes (blueprints, computer, guitar/amp), rendered by the shared
// TakeoverFrameScene (frameKey "workshop-viewer" — see
// adventure/takeoverFrames.js) — which entry backs a given visit comes in
// via init(data), same "one scene, data picked at fadeTo time" approach as
// data/library.js/data/movies.js. Real content (game assets/photos,
// prototype videos, music projects) TBD — title is the viewer shell's
// name, not a specific piece of content, since there's no individual item
// to name yet.
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
        title: "Music Browser",
        type: ContentType.PLACEHOLDER,
        content: "Music projects created — coming soon."
    }
];

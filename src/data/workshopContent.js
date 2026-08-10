import ContentType from "./contentTypes";

// Viewer content for the Workshop Room scene's 3 "look/listen" hitboxes
// (blueprints, computer, guitar/amp), rendered by the shared
// TakeoverFrameScene (frameKey "workshop-blueprints"/"workshop-computer"/
// "workshop-music" — see adventure/takeoverFrames.js) — which entry backs
// a given visit comes in via init(data), same "one scene, data picked at
// fadeTo time" approach as data/library.js/data/movies.js. Computer is
// still a placeholder (title is the viewer shell's name, not a specific
// piece of content, since there's no individual item to name yet);
// guitar/amp has real content (a YouTube playlist embed), and blueprints
// now has real content too — a GALLERY (see TakeoverFrameScene.renderGallery).
export const WORKSHOP_CONTENT = [
    {
        id: "blueprints",
        // No title — the images fill the whole content area (see
        // TakeoverFrameScene.renderGallery/displayGalleryItem), so a
        // heading here would just eat into that space.
        type: ContentType.GALLERY,
        // Relative to public/assets/ — TakeoverFrameScene.renderGallery
        // builds each image's load URL as `assets/${folder}/${file}`.
        folder: "documents/blueprints",
        // A static site has no way to list a folder's contents at
        // runtime, so — same as every other content list in this project
        // (library.js, movies.js) — this is a hand-authored, pre-sorted
        // (alphabetical, case-insensitive) filename list rather than
        // something discovered on the fly. Re-run this sort if files are
        // added/removed:
        //   python3 -c "import os; files=[f for f in os.listdir('public/assets/documents/blueprints') if not f.startswith('.')]; files.sort(key=str.lower); print('\n'.join(files))"
        files: [
            "Adventurers.JPG",
            "Black Phoebe.png",
            "Bush 2.png",
            "Character Sprite Sheet.png",
            "Ed.png",
            "Fountain Animation 1.png",
            "Fountain Animation 2.png",
            "Fountain Animation 3.png",
            "Fountain Animation 4.png",
            "House Finch.png",
            "Interface Sheet.png",
            "Japanese Garden Tokyo.jpeg",
            "Monarch.png",
            "Northern Michigan.jpg",
            "Petal.png",
            "Retro Town Tileset and Map Guide.png",
            "Secondary Spritesheet.png",
            "Signage.jpeg",
            "Swallowtail.png",
            "The Real Ed the Cat.JPG",
            "The Real Workshop.JPG",
            "Tokyo.jpeg",
            "torii.png",
            "Town green tileset showcase.png",
            "Tree 1.png",
            "Tree 2.png",
            "Tree 3.png",
            "Tree 4.png",
            "Walking Animation.png",
            "Yellow Swallowtail.jpeg"
        ]
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
    }
];

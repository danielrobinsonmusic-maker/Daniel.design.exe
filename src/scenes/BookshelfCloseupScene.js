import AdventureScene from "../adventure/AdventureScene";
import library from "../data/library";

// Close-up level for the Library's bookshelf hitbox. Real art now (see
// library-bookshelf-closeup.png) with the four book titles already
// painted onto the spines, so this scene only needs invisible hitboxes
// over them — no drawn covers/labels like the earlier placeholder version.
const IDLE_TEXT = "Click a book to open it.";
const NATIVE_WIDTH = 1672;
const NATIVE_HEIGHT = 941;
const BACKDROP_KEY = "library-bookshelf-closeup";

// Hitbox fractions measured directly against the art. Portfolio has no
// single matching document in src/data/library.js, so it points at
// "case-studies" (the closest existing match, same mapping as before) —
// flag for confirmation/adjustment. "News and Featured Work" is a new
// library.js entry (GALLERY type, "coming soon" placeholder like
// case-studies) since no real source content exists yet either — same
// flag.
const SPINES = [
    { libraryId: "resume", label: "Resume", xRange: [0.22, 0.34], yRange: [0.32, 0.58] },
    { libraryId: "case-studies", label: "Portfolio", xRange: [0.36, 0.48], yRange: [0.32, 0.58] },
    { libraryId: "writing", label: "Writing Samples", xRange: [0.50, 0.62], yRange: [0.32, 0.58] },
    { libraryId: "news", label: "News and Featured Work", xRange: [0.64, 0.76], yRange: [0.32, 0.58] }
];

export default class BookshelfCloseupScene extends AdventureScene {

    constructor() {
        super("BookshelfCloseup");
    }

    buildScene() {

        this.backSceneKey = "Library";

        this.setBackdrop(BACKDROP_KEY, NATIVE_WIDTH, NATIVE_HEIGHT);

        SPINES.forEach((spine) => {

            this.addHitbox({
                xRange: spine.xRange,
                yRange: spine.yRange,
                verb: "Open",
                onClick: () => this.openBook(spine)
            });

        });

        // No speaker on this idle/browse prompt, so the "Press ESC to go
        // back." reminder needs the explicit opt-in — see AdventureBar's
        // setText escHint option.
        this.bar.setText(IDLE_TEXT, [], null, { escHint: true });

    }

    openBook(spine) {

        const document = library.find((item) => item.id === spine.libraryId);

        if (!document) return;

        this.fadeTo("TakeoverFrame", {
            frameKey: "library-book",
            content: document,
            backSceneKey: "BookshelfCloseup"
        });

    }

}

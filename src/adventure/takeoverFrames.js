// Registry backing TakeoverFrameScene — every building's full-screen
// content display (Library books, Theatre movie posters, Workshop
// viewers, the Gallery window) shares that one scene, but each interaction
// picks a frame from here by key. A frame is the decorative border/context
// art plus where content actually renders inside it — different frame art
// has a different-shaped content window, so contentArea is per-frame, not
// hardcoded in the scene.
//
// contentArea's xRange/yRange are fractions of the frame's own displayed
// rect (same convention as AdventureScene.addHitbox's xRange/yRange and
// AdventureBar's UPPER_ZONE), so they stay correct however big the
// backdrop ends up rendering at.
//
// barVerb feeds TakeoverFrameScene's bottom-bar text ("<barVerb>:
// <content.title>") — kept per-frame rather than per-content-item since
// it describes the TYPE of interaction (reading a book vs. watching a
// movie), which tracks the frame, not the individual thing being shown.
//
// Frames with a `generate` function have no real art yet — TakeoverFrameScene
// builds their texture from it on demand (via createPlaceholderTexture,
// which no-ops if that key's canvas already exists — same "only build it
// once" convention as TileRenderer's baked ground texture) the first time
// that particular frame is actually opened, rather than every frame's
// canvas being built up front regardless of whether it's ever visited.
const NATIVE_WIDTH = 1672;
const NATIVE_HEIGHT = 941;

// Shared by every placeholder (no real frame art yet) entry below — same
// dark-surround + lighter inset "content window" look every one-off
// Takeover scene in this project used before this system existed. Kept as
// one function so all placeholder frames render identically without
// duplicating the drawing code per frame, but each still gets its own
// texture key (see PLACEHOLDER_INSET-derived contentArea) so any one of
// them can be swapped for real art later without touching the others.
const PLACEHOLDER_INSET_X = 220;
const PLACEHOLDER_INSET_Y = 120;

function drawPlaceholderFrame(g, w, h) {

    g.fillStyle(0x1c1c1c, 1);
    g.fillRect(0, 0, w, h);

    g.fillStyle(0xe8e4da, 1);
    g.fillRect(PLACEHOLDER_INSET_X, PLACEHOLDER_INSET_Y, w - (PLACEHOLDER_INSET_X * 2), h - (PLACEHOLDER_INSET_Y * 2));

}

const PLACEHOLDER_CONTENT_AREA = {
    xRange: [PLACEHOLDER_INSET_X / NATIVE_WIDTH, 1 - (PLACEHOLDER_INSET_X / NATIVE_WIDTH)],
    yRange: [PLACEHOLDER_INSET_Y / NATIVE_HEIGHT, 1 - (PLACEHOLDER_INSET_Y / NATIVE_HEIGHT)]
};

export const TAKEOVER_FRAMES = {

    // Library books (all four) — real art: an open book with two blank
    // pages. contentArea is the full two-page spread (measured via PIL:
    // the near-white pixel block spans x 16.1%-84.3%, y 6.4%-91.0% of the
    // 1672x941 canvas), inset a little further in from that measured edge
    // for text margin. Content isn't paginated left/right page vs. page —
    // it just wraps across the full spread as one column, out of scope
    // for this pass.
    "library-book": {
        textureKey: "library-book",
        nativeWidth: NATIVE_WIDTH,
        nativeHeight: NATIVE_HEIGHT,
        contentArea: { xRange: [0.20, 0.80], yRange: [0.11, 0.86] },
        barVerb: "Reading"
    },

    // Theatre movie posters (all four) — real art already existed
    // (theatre-room-screen.png, the theatre's own projector screen) from
    // before this system existed, so this uses it directly rather than a
    // generated placeholder even though the underlying video content is
    // still TBD. contentArea is the screen's light interior, inset from
    // its dark bezel (checked visually against a crop of the art, not
    // auto-detected — the room's dim, gradient lighting made a brightness
    // threshold pick up curtain highlights along with the screen).
    "movie-screen": {
        textureKey: "theatre-room-screen",
        nativeWidth: NATIVE_WIDTH,
        nativeHeight: NATIVE_HEIGHT,
        contentArea: { xRange: [0.17, 0.83], yRange: [0.145, 0.70] },
        barVerb: "Watching"
    },

    // Workshop's blueprints/computer/guitar hitboxes — one shared frame
    // for all three (per the design spec, "could be one shared frame or
    // per-type" — going with shared since none of the three have real art
    // yet either, and there's nothing to differentiate them visually
    // until they do).
    "workshop-viewer": {
        textureKey: "takeover-frame-workshop-viewer",
        nativeWidth: NATIVE_WIDTH,
        nativeHeight: NATIVE_HEIGHT,
        contentArea: PLACEHOLDER_CONTENT_AREA,
        generate: drawPlaceholderFrame,
        barVerb: "Viewing"
    },

    // Gallery's stained-glass window — verb matches the Room hitbox's own
    // "Admire" verb rather than the generic "Viewing" the other
    // placeholders use, since there's exactly one of these (no per-item
    // title varying what's being admired).
    "gallery-slideshow": {
        textureKey: "takeover-frame-gallery-slideshow",
        nativeWidth: NATIVE_WIDTH,
        nativeHeight: NATIVE_HEIGHT,
        contentArea: PLACEHOLDER_CONTENT_AREA,
        generate: drawPlaceholderFrame,
        barVerb: "Admiring"
    }

};

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
// Frames with a `generate` function have no real art yet — TakeoverFrameScene
// builds their texture from it on demand (via createPlaceholderTexture,
// which no-ops if that key's canvas already exists — same "only build it
// once" convention as TileRenderer's baked ground texture) the first time
// that particular frame is actually opened, rather than every frame's
// canvas being built up front regardless of whether it's ever visited.
const NATIVE_WIDTH = 1672;
const NATIVE_HEIGHT = 941;

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
        contentArea: { xRange: [0.20, 0.80], yRange: [0.11, 0.86] }
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
        contentArea: { xRange: [0.17, 0.83], yRange: [0.145, 0.70] }
    },

    // Workshop's three "look/listen" hitboxes each now have their own real
    // frame art (a blank drafting-table sheet, a monitor, and a CD jewel
    // case) rather than sharing one generic placeholder — contentArea per
    // frame is the blank/screen area measured via a color-based flood fill
    // from a seed point inside it (PIL + scipy.ndimage.label: plain
    // brightness thresholds picked up unrelated bright pixels elsewhere in
    // each illustration — CD-case highlights, wood-grain glare — so this
    // isolates just the one connected blank region), inset slightly for
    // margin.
    "workshop-blueprints": {
        textureKey: "workshop-blueprint",
        nativeWidth: NATIVE_WIDTH,
        nativeHeight: NATIVE_HEIGHT,
        contentArea: { xRange: [0.12, 0.90], yRange: [0.09, 0.90] }
    },

    "workshop-computer": {
        textureKey: "computer-screen",
        nativeWidth: NATIVE_WIDTH,
        nativeHeight: NATIVE_HEIGHT,
        contentArea: { xRange: [0.07, 0.93], yRange: [0.10, 0.74] }
    },

    // The guitar/amp hitbox's frame — a CD jewel case's blank cover slot,
    // off-center within the wider Discman illustration, hence the
    // considerably narrower contentArea than the other frames.
    "workshop-music": {
        textureKey: "music-player",
        nativeWidth: NATIVE_WIDTH,
        nativeHeight: NATIVE_HEIGHT,
        contentArea: { xRange: [0.56, 0.82], yRange: [0.23, 0.75] }
    },

    // Gallery's window/frame — same measurement approach as the Workshop
    // frames above.
    "gallery-slideshow": {
        textureKey: "gallery-frame",
        nativeWidth: NATIVE_WIDTH,
        nativeHeight: NATIVE_HEIGHT,
        contentArea: { xRange: [0.075, 0.925], yRange: [0.13, 0.87] }
    }

};

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Daniel.design.exe — an interactive portfolio presented as a small pixel-art town, built with Phaser 3 + Vite. Visitors walk around a town square and enter buildings (Library, Gallery, Café, Workshop, plus a hidden "Scenic Overlook") to reach portfolio content. See `PROJECT_BIBLE.md` for the product vision/principles and `TODO.md` for milestone tracking — both are aspirational planning docs from project start and are stale against the current code in several places (e.g. they say "16x16 tiles"; the actual game grid is 32px). Trust the code over those docs for anything factual about current behavior.

## Commands

```bash
npm install       # install deps
npm run dev        # start Vite dev server (prints local URL, typically :5173)
npm run build       # production build via vite build
npm run preview      # preview a production build
```

There is no lint script and no test suite/runner configured. Validate changes with `node --check <file>` for syntax and `npx vite build --logLevel warn` for a full build. There is no automated way to verify rendering/gameplay changes — see "Verifying visual and gameplay changes" below.

## Architecture

### Entry point and scene flow

`index.html` → `src/main.js` → `src/game.js` (builds the `Phaser.Game` config and scene list) → `BootScene` (loads all assets, registers cropped texture sub-frames and animations, then starts `Title`) → `TitleScene` → `NameScene` → `WorldScene` (the town) → building scenes launched via `scene.start(key)`.

`WorldScene.js` maps building names to scene keys via `BUILDING_SCENES`; a building not in that map falls through to a `console.log(...)` placeholder instead of erroring — that's intentional, not a bug, for buildings without an interior yet (e.g. Theatre).

`HUDScene` is launched once from `WorldScene` and stays running for the rest of the session — other scenes (Library, Overlook, etc.) reuse it via `this.scene.get("HUD")` for the "Press [E] to ..." interaction prompt rather than building their own UI. Call `this.scene.bringToTop("HUD")` in any scene that needs the prompt to render above its own content.

### World generation and coordinate conventions

- `TILE_SIZE = 32` everywhere. Ground-anchored objects (trees, buildings, decor) use `setOrigin(0.5, 1)` (bottom-center) so their visual extends upward from their true ground-contact/collision point.
- `src/world/Buildings.js` defines `NORTH_BUFFER_ROWS` (currently 6) — a band of solid forest added north of the original 50-row map so the camera (which can never scroll above world y=0) always has room to frame the player near the north edge. Every coordinate that predates this change is written in its original pre-shift form and shifted by `+ NORTH_BUFFER_ROWS` at the point of use — grep for `NORTH_BUFFER_ROWS` when placing anything new near the town's original layout.
- `src/world/MapData.js` builds the tile grid (`TILE.GRASS/STONE/WATER/PLAZA`) and exports `TREES`, `FOUNTAIN_TILE`, `TOWN_SQUARE_BOUNDS`. Paths are drawn via Bresenham lines between hand-authored waypoints, thickened by a **direction-aware perpendicular offset** (`CORRIDOR_OFFSETS = [-1,0,1]` for 3-wide main routes, `ENTRY_OFFSETS = [0,1]` for 2-wide doorway approaches) rather than a symmetric NxN stamp — a symmetric stamp over-thickens at diagonal waypoint segments. The very last tile of a doorway-approach path (the building's `doorTile`) is pinned to a single tile regardless of the segment's width, because a door is a single-tile gap in an otherwise solid wall and any perpendicular offset there lands on a wall tile.
- `src/world/WorldObjects.js` renders trees, buildings, the torii gate, and hand-placed decor (benches/lampposts/signposts/flower boxes) as individual GameObjects — NOT baked into the tile grid — so they can be depth-sorted against the player. `WorldScene.updateDepthSorting()` sets `depth = y` (ground-contact point) every frame; this is why the bottom-center origin convention matters everywhere.
- Collision is separate from visuals: `WorldScene.js` builds one static-body obstacle rect per tree/decor tile and per non-door building footprint tile via `createObstacle()`. If you add a new decor type, you must add its tile coordinates to both the `WorldObjects.js` placement list AND the `WorldScene.js` obstacle loop (see `DECOR` export).
- `src/world/TileRenderer.js` bakes the entire ground layer (grass base + sparse decoration + path/plaza art, including per-tile random rotation and the corner-tile detection for path bends) into ONE cached canvas via Canvas2D `drawImage()`, added once via `scene.textures.addCanvas()`. This is deliberate: using Phaser's `RenderTexture.draw()` per-tile previously took 15+ seconds for a map this size because it flushes the WebGL pipeline on every call. The cache check is `if (!this.scene.textures.exists(GROUND_TEXTURE_KEY))` — the map is fully deterministic, so this only runs once per game session even though `WorldScene.create()` (and thus a new `TileRenderer` instance) re-runs every time the player re-enters the World scene. **Any per-instance flag that depends on texture existence (e.g. "did asset X load") must be read fresh at the top of `render()`, not cached only inside the cache-build block** — a `TileRenderer` instance created on a later visit never runs that block, so a flag set only inside it stays `undefined` forever after the first visit.
- All scatter/variety in `TileRenderer.js` and `WorldObjects.js` (which grass decoration/path variant/rotation/tree species/tree size/sway timing a tile gets) is driven by a **deterministic hash** (`hashTile(x, y, salt)`, a `Math.sin`-based pseudo-random function, duplicated identically in both files) rather than `Math.random()`. This is required, not stylistic: the map must render identically every time `WorldScene.create()` re-runs (i.e. every time the player re-enters World), or scenery would visibly reshuffle on every building visit. Each independent random decision uses its own `salt` argument so they don't correlate with each other — check existing salt usage before adding a new one.

### Asset loading and the "content" sub-frame crop pattern

Nearly every non-programmer-art asset in this project (buildings, torii gate, trees, decor, ground tiles) is a large illustrated export (often ~1024–1536px) with a soft transparent vignette margin around the actual content, not a tight sprite. `BootScene.js` registers a named **`"content"` sub-frame** for each of these via `texture.add("content", 0, x, y, w, h)`, with the crop rect measured directly (PIL alpha bbox), then every consumer does `texture.has("content") ? "content" : undefined` and passes that frame name into `add.image(...)`.

This pattern exists because a GameObject-level `setCrop()` anchors `origin`/`setDisplaySize()` math against the FULL padded frame regardless of the crop — it does not re-baseline to the cropped region. A named sub-frame becomes its own frame with its own width/height, so `sprite.frame.width/height`, origin, and display-size math are all based on the actually-visible content. This was the root cause of multiple "sits too high" / "floats above the ground" bugs (trees, the torii gate, and especially buildings — Theatre had 29% and Library 22% transparent padding at the bottom of their canvas, anchored as if it were part of the building). **When wiring in a new illustrated asset, measure its opaque bounds first** (PIL: `alpha.point(lambda p: 255 if p > 10 else 0).getbbox()`) rather than assuming the canvas is tight — don't guess.

Some assets are instead genuinely seamless, fully-opaque tiles (no alpha channel at all — `grass-base.png`, `path.png`, `square1/2/3.png`, etc.) meant to be drawn once per grid cell at normal tile size with no crop. `TileRenderer.js`'s `isFullBleed()` distinguishes this case from a real cropped clump (like `grass1.png`) automatically, since both kinds have shown up under the same "decoration variant" list.

### Building art sizing

Building textures were replaced mid-project with a completely different, non-square native resolution (portrait/landscape illustrations vs. the original square 144×144/200×200 pixel-art). `WorldObjects.js` does NOT use a fixed `setScale()` — it targets each building's **original in-game rendered width** (`BUILDING_ORIGINAL_WIDTH`, 400 for Library, 288 for the rest — matching what the old assets rendered at) and derives height from the new texture's own native aspect ratio, so nothing gets stretched to force a square. If building art changes again, re-derive the crop rect (see above) before changing any sizing constant.

### Content data

`src/data/library.js` and `src/data/contentTypes.js` back the Library's bookshelf/document-viewer scenes (`LibraryShelfScene.js`, `DocumentViewerScene.js`) — this is the actual portfolio content system (resume, writing samples, etc.), separate from the town-rendering code above.

### Dead/unused files

`src/WorldBuilder.js`, `src/world/Bench.js`, `src/world/ToriiGate.js`, `src/world/DuskBackdrop.js`, `src/managers/AudioManager.js`, `src/managers/InputManager.js`, `src/data/bootMessages.js`, `src/ui/Menu.js`, `src/ui/Terminal.js`, `src/ui/DialogBox.js`, and `src/ui/TypeWriterText.js` are not imported anywhere in the actual scene graph — they're early scaffolding (matching `TODO.md`'s original aspirational folder layout) superseded by the `WorldObjects.js`-based approach that actually ships. Notably, the real bench/torii-gate rendering lives inline in `WorldObjects.js` (`createDecor()` / `createToriiGate()`), not in the similarly-named standalone files. Confirm with a grep for the import before assuming one of these files is load-bearing.

### Asset files change out from under the code

Files in `public/assets/**` get replaced/renamed directly by the user outside of Claude's edits fairly often (mid-session, via their IDE) — sometimes losing the expected filename in the process (e.g. a re-saved file reverting to a default download name, leaving the code's `this.load.image("key", "assets/.../name.png")` pointing at nothing). The established defensive pattern throughout `TileRenderer.js` and `WorldObjects.js` is: read `this.scene.textures.exists(key)` fresh, and degrade gracefully (fall back to another variant, or skip the element) rather than let a missing file break rendering. Preserve this pattern for any new asset; don't assume a file that was there in a previous session is still there or still named the same thing.

## Verifying visual and gameplay changes

There's no automated test suite. The established verification workflow for any rendering/gameplay change in this repo:

1. `node --check <file>` on every edited file, then `npx vite build --logLevel warn`.
2. Temporarily add `window.__game = game;` after `new Phaser.Game(config)` in `src/game.js`.
3. Run the dev server, drive it with Playwright (`chromium.launch()`), and use `page.evaluate()` against `window.__game.scene.getScene("World")` to inspect live state (tile grid, obstacle positions, sprite `displayWidth`/`frame`/`angle`, etc.) — this catches things a screenshot alone won't (e.g. confirming a decor item's tile type isn't `STONE`, or that a texture flag survives re-entering the scene).
4. Screenshot relevant areas and actually look at them before calling something done.
5. Test the specific regression pattern that's bitten this project before: re-enter the World scene (walk into a building and back out, or use the debug hook to call `world.tileRenderer.render(world.mapData)` again) to confirm cached-texture/instance-flag state survives `WorldScene.create()` re-running.
6. Remove the `window.__game` debug line before finishing — never leave it in committed code.

`camera.startFollow(this.player, ...)` is active by default in `WorldScene` and will silently override a manual `camera.centerOn()`/`scrollX` call made from a Playwright script on the next frame. To point the camera somewhere specific for a screenshot, move `world.player` there (and let follow track it naturally) rather than fighting the camera directly, or call `camera.stopFollow()` first.

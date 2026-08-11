import AudioManager from "../managers/AudioManager";

// The single bottom-third UI element every adventure scene shares — it
// serves three roles depending on context (idle prompt text, hover verb
// label, dialogue/menu display), per the design spec, rather than three
// separate UI pieces.
//
// Built around dialogue-panel.png: a floating inset panel (not a full-
// width bar) that fits within — not fills — the bottom third of the
// screen, centered in that third both horizontally and vertically so the
// scene stays visible above, below, and to either side of it. Sized by
// height first (PANEL_HEIGHT_FRACTION_OF_SLOT of the bottom-third slot's
// own height), with width then derived from the real art's native aspect
// ratio (read off the "content" frame at construction time) — never the
// other way around, so the panel can't get stretched off its actual
// proportions no matter how big or small it ends up. MAX_WIDTH_FRACTION
// is just a safety cap for unusually wide/short canvases where a
// height-first fit could otherwise overflow the screen sideways. The art
// has two built-in zones (measured directly against the PNG via PIL
// pixel sampling — parchment-vs-border color transitions — not guessed):
// a wide upper panel for prompt/verb/dialogue text, and three smaller
// lower panels for question options. Text is layered on top as separate
// Text objects, never baked into the image, so it stays crisp and the
// same art can host any content.
const PANEL_TEXTURE_KEY = "dialogue-panel";
const SLOT_HEIGHT_FRACTION = 1 / 3; // the bottom third of the canvas
const PANEL_HEIGHT_FRACTION_OF_SLOT = 0.85; // leaves ~7.5% top + bottom as margin within the slot
const MAX_WIDTH_FRACTION = 0.92; // safety cap relative to canvas width
const FALLBACK_ASPECT = 260 / 1600; // height/width, only used if the art asset fails to load

// Fractions of the panel's own displayed rect.
const UPPER_ZONE = { x: [0.0905, 0.9165], y: [0.146, 0.534] };
const OPTION_ZONE_Y = [0.609, 0.888];
const OPTION_COLUMNS_X = [
    [0.084, 0.338],
    [0.390, 0.627],
    [0.663, 0.919]
];

// Fractions of the panel's own HEIGHT (the dimension that actually drives
// its size now — see above) — text/padding scale with however big the
// panel ends up being, instead of being hardcoded for one resolution.
const ZONE_PADDING_FRACTION = 0.05;
const SPEAKER_BODY_GAP_FRACTION = 0.018;
const SPEAKER_FONT_FRACTION = 0.072;
const BODY_FONT_FRACTION = 0.06;
const OPTION_FONT_FRACTION = 0.058;
// Floor for the shrink-to-fit sizing below (fitOptionText) — long question
// text can shrink down to this before we'd rather clip than go smaller.
const OPTION_MIN_FONT_FRACTION = 0.04;
const VERB_FONT_FRACTION = 0.145;

// "Press ESC to go back." reminder — appended below the main text,
// visually secondary (smaller, lighter) so it never competes with the
// actual line. Shown automatically whenever a speaker is set (every NPC
// dialogue response, cat reactions included) and opt-in otherwise (see
// setText's escHint option) for speaker-less idle/browse prompts like
// BookshelfCloseupScene's.
const ESC_HINT_TEXT = "Press ESC to go back.";
const ESC_HINT_FONT_FRACTION = 0.046;
const ESC_HINT_GAP_FRACTION = 0.022;
const ESC_HINT_COLOR = "#8a8578";

// Reserved on the right of the upper zone so scroll arrows never overlap
// wrapped text, whether or not they're currently visible — keeps the text
// wrap width stable instead of reflowing when arrows appear/disappear.
const ARROW_GUTTER_FRACTION = 0.06;
const ARROW_COLOR = 0xffffff;
const ARROW_HOVER_COLOR = 0x000000;
const SCROLL_STEP_FRACTION = 0.55; // fraction of the zone height scrolled per arrow click

const MAX_OPTIONS = 3;
const DEPTH = 5000; // above hitboxes/backdrop, below the Cursor

export default class AdventureBar {

    constructor(scene) {

        this.scene = scene;

        const { width, height } = scene.scale;

        const hasPanelTexture = scene.textures.exists(PANEL_TEXTURE_KEY);
        const panelFrame = hasPanelTexture && scene.textures.get(PANEL_TEXTURE_KEY).has("content")
            ? "content"
            : undefined;

        let background = null;
        let aspect = FALLBACK_ASPECT; // height / width

        if (hasPanelTexture) {
            background = scene.add.image(0, 0, PANEL_TEXTURE_KEY, panelFrame);
            aspect = background.frame.height / background.frame.width;
        }

        // Height-first: fit within PANEL_HEIGHT_FRACTION_OF_SLOT of the
        // bottom-third slot's own height, then derive width from the
        // art's real aspect ratio — see the class comment for why this
        // is height-first rather than width-first.
        const slotHeight = height * SLOT_HEIGHT_FRACTION;
        const slotTop = height - slotHeight;

        this.height = slotHeight * PANEL_HEIGHT_FRACTION_OF_SLOT;
        this.width = this.height / aspect;

        const maxWidth = width * MAX_WIDTH_FRACTION;

        if (this.width > maxWidth) {
            this.width = maxWidth;
            this.height = this.width * aspect;
        }

        const zonePadding = this.height * ZONE_PADDING_FRACTION;
        this.zonePadding = zonePadding;
        const speakerBodyGap = this.height * SPEAKER_BODY_GAP_FRACTION;
        const speakerFontSize = Math.round(this.height * SPEAKER_FONT_FRACTION);
        const bodyFontSize = Math.round(this.height * BODY_FONT_FRACTION);
        const optionFontSize = Math.round(this.height * OPTION_FONT_FRACTION);
        this.optionFontSize = optionFontSize;
        this.optionMinFontSize = Math.round(this.height * OPTION_MIN_FONT_FRACTION);
        const verbFontSize = Math.round(this.height * VERB_FONT_FRACTION);
        const escHintFontSize = Math.round(this.height * ESC_HINT_FONT_FRACTION);
        this.escHintGap = this.height * ESC_HINT_GAP_FRACTION;

        // Centered in the slot both ways — not just horizontally — so
        // there's visible scene above, below, left, and right of the
        // panel, per the design spec.
        const x = width / 2;
        const y = slotTop + (slotHeight / 2);

        // Screen-space Y of the panel's own top edge — a scene positioning
        // its own content (e.g. a button that needs to clear the panel)
        // should measure against this instead of guessing a fraction of
        // the canvas, since neither the panel's size nor position is a
        // fixed number.
        this.top = y - (this.height / 2);

        this.container = scene.add.container(x, y).setDepth(DEPTH);

        if (background) {

            background.setDisplaySize(this.width, this.height);
            this.container.add(background);

        } else {

            // Flat fallback if the art asset ever fails to load — degrade
            // gracefully rather than render nothing, same convention as
            // TileRenderer.js/WorldObjects.js use for missing textures.
            const fallback = scene.add.rectangle(0, 0, this.width, this.height, 0xd8d5c8, 0.95);
            fallback.setStrokeStyle(2, 0x4b4b4b);
            this.container.add(fallback);

        }

        const left = -(this.width / 2);
        const top = -(this.height / 2);

        this.upperZone = {
            x0: left + (UPPER_ZONE.x[0] * this.width),
            x1: left + (UPPER_ZONE.x[1] * this.width),
            y0: top + (UPPER_ZONE.y[0] * this.height),
            y1: top + (UPPER_ZONE.y[1] * this.height)
        };

        this.optionZones = OPTION_COLUMNS_X.map(([fx0, fx1]) => ({
            x0: left + (fx0 * this.width),
            x1: left + (fx1 * this.width),
            y0: top + (OPTION_ZONE_Y[0] * this.height),
            y1: top + (OPTION_ZONE_Y[1] * this.height)
        }));

        const arrowGutter = this.width * ARROW_GUTTER_FRACTION;
        const upperTextX = this.upperZone.x0 + zonePadding;
        const upperWrapWidth = (this.upperZone.x1 - this.upperZone.x0) - (zonePadding * 2) - arrowGutter;

        // Content taller than the upper zone scrolls (see scrollBy/
        // applyScroll below) instead of spilling outside the panel art —
        // everything that should clip together (speaker name, body text,
        // ESC hint) lives in this one sub-container so a single mask and
        // a single y-offset handles all three at once.
        const maskGraphics = scene.make.graphics({}, false);
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillRect(
            x + this.upperZone.x0,
            y + this.upperZone.y0,
            (this.upperZone.x1 - this.upperZone.x0),
            (this.upperZone.y1 - this.upperZone.y0)
        );
        this.maskGraphics = maskGraphics;
        this.textLayer = scene.add.container(0, 0);
        this.textLayer.setMask(maskGraphics.createGeometryMask());
        this.container.add(this.textLayer);

        // Name tag identifying who's talking (e.g. "Librarian", "Ed the
        // Cat") — separate from, and visually louder than, their actual
        // line, so it's clear at a glance who you're hearing from. Hidden
        // whenever there's no speaker (idle prompt text).
        this.speakerText = scene.add.text(upperTextX, this.upperZone.y0, "", {
            fontFamily: "monospace",
            fontSize: `${speakerFontSize}px`,
            color: "#8a5a20",
            fontStyle: "bold"
        }).setVisible(false);

        this.bodyText = scene.add.text(upperTextX, this.upperZone.y0, "", {
            fontFamily: "monospace",
            fontSize: `${bodyFontSize}px`,
            color: "#222222",
            align: "left",
            wordWrap: { width: upperWrapWidth }
        });

        // "Press ESC to go back." — visually secondary (smaller, lighter)
        // reminder appended below whatever's currently showing. See
        // setText's escHint option for when this appears.
        this.escHintText = scene.add.text(upperTextX, this.upperZone.y0, ESC_HINT_TEXT, {
            fontFamily: "monospace",
            fontSize: `${escHintFontSize}px`,
            color: ESC_HINT_COLOR,
            align: "left",
            wordWrap: { width: upperWrapWidth }
        }).setVisible(false);

        this.speakerBodyGap = speakerBodyGap;

        this.textLayer.add([this.speakerText, this.bodyText, this.escHintText]);

        this.verbText = scene.add.text(
            (this.upperZone.x0 + this.upperZone.x1) / 2,
            (this.upperZone.y0 + this.upperZone.y1) / 2,
            "",
            {
                fontFamily: "monospace",
                fontSize: `${verbFontSize}px`,
                color: "#000000",
                fontStyle: "bold",
                align: "center",
                // Verb strings now carry a target ("Talk to Librarian",
                // "Open News and Featured Work") instead of a single word,
                // so — unlike before — this can run wider than the panel
                // at this font size. Same wrap width the speaker/body text
                // already use.
                wordWrap: { width: upperWrapWidth }
            }
        ).setOrigin(0.5).setVisible(false);

        this.container.add(this.verbText);

        this.scrollOffset = 0;
        this.scrollMax = 0;

        const arrowX = this.upperZone.x1 - (arrowGutter / 2);
        const arrowSize = Math.min(arrowGutter, zonePadding * 5) * 0.6;

        this.scrollUpArrow = this.createScrollArrow(arrowX, this.upperZone.y0 + zonePadding, arrowSize, -1);
        this.scrollDownArrow = this.createScrollArrow(arrowX, this.upperZone.y1 - zonePadding, arrowSize, 1);

        // Three fixed, persistent slots (matching the art's three lower
        // panels 1:1) rather than a dynamically-built list — an option
        // with no content for a given slot just never gets text/an
        // interactive area, per the design ("unused option slots simply
        // render with no text — no separate panel states needed").
        this.optionCallbacks = [null, null, null];

        this.optionTexts = this.optionZones.map((zone, index) => {

            const centerX = (zone.x0 + zone.x1) / 2;
            const wrapWidth = (zone.x1 - zone.x0) - (zonePadding * 2);

            const label = scene.add.text(centerX, zone.y0 + zonePadding, "", {
                fontFamily: "monospace",
                fontSize: `${optionFontSize}px`,
                color: "#3f5f9f",
                align: "center",
                wordWrap: { width: wrapWidth }
            }).setOrigin(0.5, 0);

            label.on("pointerover", () => label.setColor("#7a9ad9"));
            label.on("pointerout", () => label.setColor("#3f5f9f"));
            label.on("pointerdown", () => {
                if (this.optionCallbacks[index]) {
                    AudioManager.playClickSfx(this.scene);
                    this.optionCallbacks[index]();
                }
            });

            this.container.add(label);

            return label;

        });

        this.baseText = "";
        this.baseOptions = [];
        this.baseSpeaker = null;
        this.locked = false;

    }

    // Persistent state: idle prompt text, or the current line of dialogue.
    // Shown whenever nothing is being hovered. `options` (max 3) fill the
    // three fixed slots left-to-right — omit/empty for plain idle text.
    // `speaker` names who's talking (e.g. "Librarian") — omit for idle
    // prompt text, which isn't anyone's dialogue. The ESC hint defaults to
    // "on whenever there's a speaker" (every NPC/cat line) — pass
    // `escHint: true` explicitly for a speaker-less idle/browse prompt
    // that should still carry it (e.g. a Close-up scene's idle text).
    setText(text, options = [], speaker = null, { escHint = !!speaker } = {}) {

        this.baseText = text;
        this.baseOptions = options.slice(0, MAX_OPTIONS);
        this.baseSpeaker = speaker;
        this.escHint = escHint;
        this.render();

    }

    render() {

        // New content is authoritative — force the display back to body
        // text even if a verb overlay happened to be showing from a hover
        // that was still active at the moment this got called (e.g.
        // clicking a hitbox without moving the mouse off it first — the
        // norm for petCat(), since petting requires hovering the cat).
        // showVerb() hides the whole textLayer (not just speaker/body
        // individually, now that it also holds the ESC hint) to show the
        // verb overlay in its place, so restoring it here is required, not
        // just hiding verbText — without this, content set while a verb
        // overlay is up stays invisible until the pointer happens to leave
        // the zone and hideVerb() runs.
        this.verbText.setVisible(false);
        this.textLayer.setVisible(true);

        let cursorY = this.upperZone.y0;

        if (this.baseSpeaker) {

            this.speakerText.setText(this.baseSpeaker);
            this.speakerText.setPosition(this.speakerText.x, cursorY);
            this.speakerText.setVisible(true);

            cursorY += this.speakerText.height + this.speakerBodyGap;

        } else {

            this.speakerText.setVisible(false);

        }

        this.bodyText.setText(this.baseText);
        this.bodyText.setPosition(this.bodyText.x, cursorY);
        this.bodyText.setVisible(true);

        cursorY += this.bodyText.height;

        if (this.escHint) {

            cursorY += this.escHintGap;
            this.escHintText.setPosition(this.escHintText.x, cursorY);
            this.escHintText.setVisible(true);

            cursorY += this.escHintText.height;

        } else {

            this.escHintText.setVisible(false);

        }

        // Content taller than the zone scrolls (see scrollBy) — reset to
        // the top on every new setText call rather than preserving
        // whatever scroll position a previous, unrelated line was at.
        const zoneHeight = this.upperZone.y1 - this.upperZone.y0;
        const contentHeight = cursorY - this.upperZone.y0;

        this.scrollMax = Math.max(0, contentHeight - zoneHeight);
        this.scrollOffset = 0;
        this.applyScroll();

        this.optionTexts.forEach((label, index) => {

            const option = this.baseOptions[index];

            if (option) {

                const zone = this.optionZones[index];
                const maxHeight = (zone.y1 - zone.y0) - (this.zonePadding * 2);
                this.fitOptionText(label, option.label, maxHeight);
                label.setVisible(true);
                label.setInteractive({ useHandCursor: false });
                this.optionCallbacks[index] = option.onSelect;

            } else {

                label.setText("");
                label.setVisible(false);
                label.disableInteractive();
                this.optionCallbacks[index] = null;

            }

        });

    }

    // Question labels are player-authored sentences of very different
    // lengths (e.g. "Where does Daniel live now?" vs. "Does Daniel have
    // any favorite designers or artists?") sharing one fixed-size panel
    // slot, with no scroll arrows here (unlike the upper zone's body
    // text) — these are meant to be fully visible at a glance, not
    // scrolled through. Shrinks the font a step at a time, starting fresh
    // from the base size every call (not compounding shrinks from
    // whatever this same label last showed), until the wrapped text's own
    // measured height fits the zone, or OPTION_MIN_FONT_FRACTION is hit —
    // past that point we'd rather it read small than clip/overflow.
    fitOptionText(label, text, maxHeight) {

        let fontSize = this.optionFontSize;

        label.setFontSize(fontSize);
        label.setText(text);

        while (label.height > maxHeight && fontSize > this.optionMinFontSize) {
            fontSize -= 1;
            label.setFontSize(fontSize);
        }

    }

    // Simple triangle scroll button — direction is -1 (up) or 1 (down).
    // Hidden by default; applyScroll() reveals whichever end still has
    // room to scroll toward, so arrows only ever show up when there's
    // actually more content than the zone can display at once.
    createScrollArrow(x, y, size, direction) {

        // Points deliberately span [0, size] on both axes rather than
        // being pre-centered on (0,0) — Phaser's Shape origin/hit-area
        // math (and getBounds()) assumes the raw point coordinates start
        // at the shape's own top-left, then centers via displayOrigin.
        // Pre-centered points (e.g. [-half, half]) render a full half-size
        // up-left of where that math puts the hit area, which is exactly
        // the "tap target isn't centered on the arrow" bug this fixes —
        // confirmed by comparing rendered pixel bounds against
        // getBounds() before/after this change.
        const points = direction === -1
            ? [size / 2, 0, 0, size, size, size]
            : [size / 2, size, 0, 0, size, 0];

        const arrow = this.scene.add.triangle(x, y, ...points, ARROW_COLOR);
        arrow.setInteractive({ useHandCursor: false });
        arrow.setVisible(false);

        arrow.on("pointerover", () => arrow.setFillStyle(ARROW_HOVER_COLOR));
        arrow.on("pointerout", () => arrow.setFillStyle(ARROW_COLOR));
        arrow.on("pointerdown", () => this.scrollBy(direction));

        this.container.add(arrow);

        return arrow;

    }

    scrollBy(direction) {

        if (this.scrollMax <= 0) return;

        const step = (this.upperZone.y1 - this.upperZone.y0) * SCROLL_STEP_FRACTION;

        this.scrollOffset = Math.min(Math.max(this.scrollOffset + (direction * step), 0), this.scrollMax);
        this.applyScroll();

    }

    applyScroll() {

        this.textLayer.y = -this.scrollOffset;
        this.scrollUpArrow.setVisible(this.scrollOffset > 0);
        this.scrollDownArrow.setVisible(this.scrollOffset < this.scrollMax);

    }

    // Hover verb overlay — temporarily swaps the visible text for a short
    // verb label ("Talk", "Browse", ...) without touching the underlying
    // idle/dialogue state, so hideVerb() cleanly restores whatever was
    // showing before. Suppressed while locked (e.g. a modal dialogue menu
    // is open) so a stray hover doesn't visually clobber it.
    showVerb(verb) {

        if (this.locked) return;

        this.verbText.setText(verb);
        this.verbText.setVisible(true);
        this.textLayer.setVisible(false);
        this.scrollUpArrow.setVisible(false);
        this.scrollDownArrow.setVisible(false);

    }

    hideVerb() {

        if (this.locked) return;

        this.verbText.setVisible(false);
        this.textLayer.setVisible(true);
        this.applyScroll();

    }

    setLocked(locked) {

        this.locked = locked;

        if (!locked) {
            this.hideVerb();
        }

    }

    destroy() {

        this.maskGraphics.destroy();
        this.container.destroy();

    }

}

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
const VERB_FONT_FRACTION = 0.145;

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
        const speakerBodyGap = this.height * SPEAKER_BODY_GAP_FRACTION;
        const speakerFontSize = Math.round(this.height * SPEAKER_FONT_FRACTION);
        const bodyFontSize = Math.round(this.height * BODY_FONT_FRACTION);
        const optionFontSize = Math.round(this.height * OPTION_FONT_FRACTION);
        const verbFontSize = Math.round(this.height * VERB_FONT_FRACTION);

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

        const upperTextX = this.upperZone.x0 + zonePadding;
        const upperWrapWidth = (this.upperZone.x1 - this.upperZone.x0) - (zonePadding * 2);

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

        this.speakerBodyGap = speakerBodyGap;

        this.verbText = scene.add.text(
            (this.upperZone.x0 + this.upperZone.x1) / 2,
            (this.upperZone.y0 + this.upperZone.y1) / 2,
            "",
            {
                fontFamily: "monospace",
                fontSize: `${verbFontSize}px`,
                color: "#000000",
                fontStyle: "bold"
            }
        ).setOrigin(0.5).setVisible(false);

        this.container.add([this.speakerText, this.bodyText, this.verbText]);

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
                if (this.optionCallbacks[index]) this.optionCallbacks[index]();
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
    // prompt text, which isn't anyone's dialogue.
    setText(text, options = [], speaker = null) {

        this.baseText = text;
        this.baseOptions = options.slice(0, MAX_OPTIONS);
        this.baseSpeaker = speaker;
        this.render();

    }

    render() {

        // New content is authoritative — force the display back to body
        // text even if a verb overlay happened to be showing from a hover
        // that was still active at the moment this got called (e.g.
        // clicking a hitbox without moving the mouse off it first).
        this.verbText.setVisible(false);

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

        this.optionTexts.forEach((label, index) => {

            const option = this.baseOptions[index];

            if (option) {

                label.setText(option.label);
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

    // Hover verb overlay — temporarily swaps the visible text for a short
    // verb label ("Talk", "Browse", ...) without touching the underlying
    // idle/dialogue state, so hideVerb() cleanly restores whatever was
    // showing before. Suppressed while locked (e.g. a modal dialogue menu
    // is open) so a stray hover doesn't visually clobber it.
    showVerb(verb) {

        if (this.locked) return;

        this.verbText.setText(verb);
        this.verbText.setVisible(true);
        this.speakerText.setVisible(false);
        this.bodyText.setVisible(false);

    }

    hideVerb() {

        if (this.locked) return;

        this.verbText.setVisible(false);
        this.speakerText.setVisible(!!this.baseSpeaker);
        this.bodyText.setVisible(true);

    }

    setLocked(locked) {

        this.locked = locked;

        if (!locked) {
            this.hideVerb();
        }

    }

    destroy() {

        this.container.destroy();

    }

}

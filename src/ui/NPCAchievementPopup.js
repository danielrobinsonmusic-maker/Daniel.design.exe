import AudioManager from "../managers/AudioManager";

const POPUP_TEXTURE_KEY = "guybrush";
const DISPLAY_WIDTH_FRACTION = 0.62; // fraction of canvas width — height follows the art's own aspect ratio
const FADE_IN_DURATION = 400;
const HOLD_DURATION = 2600;
const FADE_OUT_DURATION = 700;
const DEPTH = 10000; // above the AdventureBar (5000) and the Cursor, so it always reads on top

// Fires once, centered on whichever scene is active at the moment the
// broader "talked to everyone in town" achievement completes (see
// managers/NPCAchievement.checkNPCAchievement) — fades in, holds, fades
// out, then cleans itself up. Identical shape to
// ui/CatAchievementPopup.js, just its own art/texture key rather than a
// shared/parameterized version of that one, since the two are triggered
// from unrelated code paths (this one from three: Murray, the four human
// NPCs, and the cats) and have no other reason to be coupled together.
// Degrades to a no-op if the art failed to load, same defensive pattern
// used throughout this project for asset loading (see TileRenderer.js/
// WorldObjects.js).
export function showNPCAchievementPopup(scene) {

    if (!scene.textures.exists(POPUP_TEXTURE_KEY)) return;

    AudioManager.playAchievementSfx(scene);

    const { width, height } = scene.scale;

    const texture = scene.textures.get(POPUP_TEXTURE_KEY);
    const frame = texture.has("content") ? "content" : undefined;

    const image = scene.add.image(width / 2, height / 2, POPUP_TEXTURE_KEY, frame);
    image.setDepth(DEPTH);
    image.setAlpha(0);

    const displayWidth = width * DISPLAY_WIDTH_FRACTION;
    image.setDisplaySize(displayWidth, displayWidth * (image.height / image.width));

    scene.tweens.add({
        targets: image,
        alpha: 1,
        duration: FADE_IN_DURATION,
        ease: "Sine.easeOut",
        onComplete: () => {

            scene.tweens.add({
                targets: image,
                alpha: 0,
                duration: FADE_OUT_DURATION,
                delay: HOLD_DURATION,
                ease: "Sine.easeIn",
                onComplete: () => image.destroy()
            });

        }
    });

}

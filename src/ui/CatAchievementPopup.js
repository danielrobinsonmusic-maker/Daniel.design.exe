const POPUP_TEXTURE_KEY = "cat-achievement";
const DISPLAY_WIDTH_FRACTION = 0.62; // fraction of canvas width — height follows the art's own aspect ratio
const FADE_IN_DURATION = 400;
const HOLD_DURATION = 2600;
const FADE_OUT_DURATION = 700;
const DEPTH = 10000; // above the AdventureBar (5000) and the Cursor, so it always reads on top

// Fires once, centered on whichever scene is active at the moment the cat
// achievement completes (see CatAchievement.recordCatInteraction) — fades
// in, holds, fades out, then cleans itself up. Degrades to a no-op if the
// art failed to load, same defensive pattern used throughout this project
// for asset loading (see TileRenderer.js/WorldObjects.js).
export function showCatAchievementPopup(scene) {

    if (!scene.textures.exists(POPUP_TEXTURE_KEY)) return;

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

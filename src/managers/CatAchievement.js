import SaveManager from "./SaveManager";

// Hidden achievement: pet Ed the Cat in all five buildings. Flags use the
// same SaveManager boolean-flag store as exhausted-dialogue tracking
// (see NPCDialogue.js's flagKey), just namespaced "cat.<building>"
// instead of "<building>.<npc>.q.<id>".
const CAT_BUILDINGS = ["library", "cafe", "theatre", "gallery", "workshop"];

function flagKey(building) {
    return `cat.${building}`;
}

export function isCatAchievementComplete() {
    return CAT_BUILDINGS.every((building) => SaveManager.hasFlag(flagKey(building)));
}

// True from the very first successful pet onward (in ANY building) — not
// the same as isCatAchievementComplete() above, which requires all five.
// Used to reveal the cat's name ("Edison") in the Pet hover verb once the
// player has actually met him once, rather than showing it from the start
// — see getCatPetVerb().
export function hasMetCat() {
    return CAT_BUILDINGS.some((building) => SaveManager.hasFlag(flagKey(building)));
}

// Shared "Pet" hover-verb text for every building's Pet hitbox — starts
// generic (the player doesn't know his name yet), then permanently
// switches to his real name once hasMetCat() is true. A single source of
// truth here keeps all five buildings' verb text in sync rather than each
// re-implementing the same hasMetCat() check.
export function getCatPetVerb() {
    return hasMetCat() ? "Pet Edison the Cat" : "Pet Cat";
}

// Call from a building's petCat() interaction. Persists that building's
// flag (permanent, same as every other SaveManager flag) and returns true
// only on the exact call that completes the set — i.e. the caller should
// trigger the achievement pop-up if and only if this returns true, so it
// fires exactly once regardless of how many times any cat gets petted
// before or after.
export function recordCatInteraction(building) {

    const alreadyComplete = isCatAchievementComplete();

    SaveManager.setFlag(flagKey(building));

    return !alreadyComplete && isCatAchievementComplete();

}

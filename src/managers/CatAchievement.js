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

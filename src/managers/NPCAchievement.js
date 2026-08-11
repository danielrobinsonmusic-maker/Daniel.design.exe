import SaveManager from "./SaveManager";
import { getCatFlagKeys } from "./CatAchievement";

// A second, broader hidden achievement — separate from (and logically
// downstream of, since it needs all 5 cats too, but with no hard-coded
// ordering dependency on that fact) CatAchievement.js's own 5-building
// cat achievement. Ten flags total: Murray the demonic skull (his own
// "met" flag, set in WorldScene.js's updateMurrayInteraction — reused
// directly rather than duplicated here), the four human NPCs' own "asked
// at least one question" flag (set by NPCDialogue.answerQuestion — not
// "answered every question", just one), and the five cats' existing
// per-building flags (see CatAchievement.js).
const MURRAY_FLAG = "murray.met";

// Matches NPCDialogue.js's own `namespace` values exactly (see each
// building's NPCDialogue construction — LibrarianCloseupScene,
// BaristaCloseupScene, TheatreAttendantCloseupScene, GalleryScene).
const HUMAN_NPC_NAMESPACES = ["library.librarian", "cafe.barista", "theatre.attendant", "gallery.attendant"];

// Exported so NPCDialogue.js can set exactly this same flag from within
// answerQuestion() without duplicating the naming convention.
export function humanNpcMetFlagKey(namespace) {
    return `${namespace}.metOnce`;
}

const NPC_ACHIEVEMENT_UNLOCKED_FLAG = "npc-achievement.unlocked";

export function isNPCAchievementComplete() {

    return SaveManager.hasFlag(MURRAY_FLAG)
        && HUMAN_NPC_NAMESPACES.every((namespace) => SaveManager.hasFlag(humanNpcMetFlagKey(namespace)))
        && getCatFlagKeys().every((key) => SaveManager.hasFlag(key));

}

// Call after setting any ONE of the 10 underlying flags this achievement
// depends on — Murray's own met flag (WorldScene.js), a human NPC's
// metOnce flag (NPCDialogue.js), or a cat's per-building flag (via each
// building's own petCat(), alongside its existing recordCatInteraction
// call). Unlike CatAchievement.recordCatInteraction — which can compare
// its own before/after state within one function because every cat flag
// funnels through that single function — this achievement's 10 flags get
// set from three unrelated code paths, so completion is tracked with an
// explicit persisted flag instead: checked fresh every call (no assumed
// ordering — the cats can just as easily be the last thing completed as
// the first), and returns true only on the exact call that unlocks it, so
// the caller knows to show the pop-up if and only if this returns true.
export function checkNPCAchievement() {

    if (SaveManager.hasFlag(NPC_ACHIEVEMENT_UNLOCKED_FLAG)) return false;

    if (!isNPCAchievementComplete()) return false;

    SaveManager.setFlag(NPC_ACHIEVEMENT_UNLOCKED_FLAG);

    return true;

}

// Permanent from the moment it's unlocked — checked fresh at scene
// creation (see OverlookScene.js's own fireworks), same "stays on
// forever after" pattern CatAchievement.isCatAchievementComplete already
// established for the Overlook's backdrop swap.
export function isNPCAchievementUnlocked() {
    return SaveManager.hasFlag(NPC_ACHIEVEMENT_UNLOCKED_FLAG);
}

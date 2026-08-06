import AdventureScene from "../adventure/AdventureScene";
import { WORKSHOP_CONTENT } from "../data/workshopContent";
import { recordCatInteraction } from "../managers/CatAchievement";
import { showCatAchievementPopup } from "../ui/CatAchievementPopup";

// Room level for the Workshop — backdrop + Look/Listen/Pet hitboxes,
// following the Library Room's reference pattern (backdrop + rectangular
// hitboxes + bottom bar + fade transitions — see LibraryScene.js). No NPC
// dialogue in this room — every interaction besides the cat opens the
// shared TakeoverFrameScene (see adventure/TakeoverFrameScene.js) with the
// "workshop-viewer" frame. Registered under the same "Workshop" scene key
// the old flat-color placeholder used, so WorldScene's BUILDING_SCENES map
// needs no changes.
const IDLE_TEXT = "Use your mouse to explore the Workshop.";
const NATIVE_WIDTH = 1672;
const NATIVE_HEIGHT = 940;
const CAT_NAME = "Ed the Cat";

export default class WorkshopScene extends AdventureScene {

    constructor() {
        super("Workshop");
    }

    buildScene() {

        this.backSceneKey = "World";

        this.setBackdrop("workshop-room", NATIVE_WIDTH, NATIVE_HEIGHT);

        this.addHitbox({
            xRange: [0.40, 0.58],
            yRange: [0.38, 0.58],
            verb: "Look",
            onClick: () => this.viewContent("blueprints")
        });

        this.addHitbox({
            xRange: [0.74, 0.84],
            yRange: [0.30, 0.52],
            verb: "Look",
            onClick: () => this.viewContent("computer")
        });

        this.addHitbox({
            xRange: [0.05, 0.28],
            yRange: [0.22, 0.72],
            verb: "Listen",
            onClick: () => this.viewContent("guitar")
        });

        this.addHitbox({
            xRange: [0.74, 0.84],
            yRange: [0.60, 0.80],
            verb: "Pet",
            onClick: () => this.petCat()
        });

        this.bar.setText(IDLE_TEXT);

    }

    viewContent(contentId) {

        const content = WORKSHOP_CONTENT.find((c) => c.id === contentId);

        if (!content) return;

        this.fadeTo("TakeoverFrame", {
            frameKey: "workshop-viewer",
            content,
            backSceneKey: "Workshop"
        });

    }

    // Endpoint interaction — no further scene depth, just a flavor line
    // that reverts to the idle prompt after a beat. Same cat as everywhere
    // else in town — same pattern as the other buildings' petCat().
    petCat() {

        this.bar.setText("Much much much...\n\nHe's busy eating...", [], CAT_NAME);

        if (recordCatInteraction("workshop")) {
            showCatAchievementPopup(this);
        }

        this.time.delayedCall(2500, () => {
            this.bar.setText(IDLE_TEXT);
        });

    }

}

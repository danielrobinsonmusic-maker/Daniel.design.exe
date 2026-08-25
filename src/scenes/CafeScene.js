import AdventureScene from "../adventure/AdventureScene";
import { recordCatInteraction, getCatPetVerb } from "../managers/CatAchievement";
import { showCatAchievementPopup } from "../ui/CatAchievementPopup";
import { checkNPCAchievement } from "../managers/NPCAchievement";
import { showNPCAchievementPopup } from "../ui/NPCAchievementPopup";
import AudioManager from "../managers/AudioManager";

// Room level for the Café — backdrop + Talk/Pet hitboxes, following the
// Library Room's reference pattern (backdrop + rectangular hitboxes +
// bottom bar + fade transitions — see LibraryScene.js). Registered under
// the same "Cafe" scene key the old flat-color placeholder used, so
// WorldScene's BUILDING_SCENES map needs no changes.
const IDLE_TEXT = "Use your mouse to explore the Café.";
const NATIVE_WIDTH = 1672;
const NATIVE_HEIGHT = 941;
const CAT_NAME = "Ed the Cat";

export default class CafeScene extends AdventureScene {

    constructor() {
        super("Cafe");
    }

    // See LibraryScene's own preload() comment — same deferred-loading
    // reasoning. Café has no TakeoverFrame viewer of its own (just Talk ->
    // BaristaCloseup and Pet), so nothing else to bundle in here.
    preload() {

        this.showLoadingText();

        this.load.image("cafe-room", "assets/scenes/cafe-room.png");
        this.load.image("cafe-barista-closeup", "assets/scenes/cafe-room-closeup.png");
        this.load.audio("music-cafe", "assets/audio/music/cafe.mp3");

    }

    buildScene() {

        this.backSceneKey = "World";

        AudioManager.playBuildingMusic(this, "cafe");

        this.setBackdrop("cafe-room", NATIVE_WIDTH, NATIVE_HEIGHT);

        this.addHitbox({
            xRange: [0.71, 0.82],
            yRange: [0.24, 0.58],
            verb: "Talk to Barista",
            onClick: () => this.fadeTo("BaristaCloseup")
        });

        this.addHitbox({
            xRange: [0.10, 0.18],
            yRange: [0.42, 0.68],
            verb: getCatPetVerb(),
            clickSfx: "sfx-cat",
            onClick: () => this.petCat()
        });

        this.bar.setText(IDLE_TEXT);

    }

    // Endpoint interaction — no further scene depth, just a flavor line
    // that reverts to the idle prompt after a beat. Same pattern as the
    // Library's petCat() — same cat, in fact, per the barista's fallback
    // line ("Daniel's cat, Edison") — just wandered over to the Café.
    petCat() {

        this.bar.setText("...\n\nEd the Cat seems distracted...", [], CAT_NAME);

        if (recordCatInteraction("cafe")) {
            showCatAchievementPopup(this);
        }

        if (checkNPCAchievement()) {
            showNPCAchievementPopup(this);
        }

        this.time.delayedCall(2500, () => {
            this.bar.setText(IDLE_TEXT);
        });

    }

}

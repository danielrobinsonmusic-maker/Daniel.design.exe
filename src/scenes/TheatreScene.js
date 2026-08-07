import AdventureScene from "../adventure/AdventureScene";
import { MOVIES } from "../data/movies";
import { recordCatInteraction } from "../managers/CatAchievement";
import { showCatAchievementPopup } from "../ui/CatAchievementPopup";
import AudioManager from "../managers/AudioManager";

// Room level for the Theatre — backdrop + Talk/Pet/Watch Movie hitboxes,
// following the Library Room's reference pattern (backdrop + rectangular
// hitboxes + bottom bar + fade transitions — see LibraryScene.js).
// Registered under the "Theatre" scene key — see WorldScene's
// BUILDING_SCENES map.
const IDLE_TEXT = "Use your mouse to explore the Theatre.";
const NATIVE_WIDTH = 1672;
const NATIVE_HEIGHT = 941;
const CAT_NAME = "Ed the Cat";

// Left to right across the lobby wall — order matches data/movies.js.
const POSTERS = [
    { movieId: "realtime-voting", xRange: [0.61, 0.70] },
    { movieId: "storytime-portal", xRange: [0.70, 0.79] },
    { movieId: "netflix-moments", xRange: [0.79, 0.88] },
    { movieId: "nfl-squidgame", xRange: [0.88, 0.97] }
];
const POSTER_Y_RANGE = [0.12, 0.52];

export default class TheatreScene extends AdventureScene {

    constructor() {
        super("Theatre");
    }

    buildScene() {

        this.backSceneKey = "World";

        AudioManager.playBuildingMusic(this, "theatre");

        this.setBackdrop("theatre-room", NATIVE_WIDTH, NATIVE_HEIGHT);

        this.addHitbox({
            xRange: [0.24, 0.38],
            yRange: [0.27, 0.58],
            verb: "Talk",
            onClick: () => this.fadeTo("TheatreAttendantCloseup")
        });

        this.addHitbox({
            xRange: [0.45, 0.53],
            yRange: [0.46, 0.57],
            verb: "Pet",
            onClick: () => this.petCat()
        });

        POSTERS.forEach((poster) => {

            this.addHitbox({
                xRange: poster.xRange,
                yRange: POSTER_Y_RANGE,
                verb: "Watch Movie",
                onClick: () => this.watchMovie(poster.movieId)
            });

        });

        this.bar.setText(IDLE_TEXT);

    }

    watchMovie(movieId) {

        const movie = MOVIES.find((m) => m.id === movieId);

        if (!movie) return;

        this.fadeTo("TakeoverFrame", {
            frameKey: "movie-screen",
            content: movie,
            backSceneKey: "Theatre"
        });

    }

    // Endpoint interaction — no further scene depth, just a flavor line
    // that reverts to the idle prompt after a beat. Same cat, having a
    // worse day than usual — same pattern as the Library/Café's petCat().
    petCat() {

        this.bar.setText("Swipe! Hisss...\n\nI think Ed is occupied...", [], CAT_NAME);

        if (recordCatInteraction("theatre")) {
            showCatAchievementPopup(this);
        }

        this.time.delayedCall(2500, () => {
            this.bar.setText(IDLE_TEXT);
        });

    }

}

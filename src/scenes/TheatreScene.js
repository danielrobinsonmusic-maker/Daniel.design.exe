import AdventureScene from "../adventure/AdventureScene";
import { MOVIES } from "../data/movies";
import { recordCatInteraction, getCatPetVerb } from "../managers/CatAchievement";
import { showCatAchievementPopup } from "../ui/CatAchievementPopup";
import { checkNPCAchievement } from "../managers/NPCAchievement";
import { showNPCAchievementPopup } from "../ui/NPCAchievementPopup";
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

// None of the four movies carry a `title` in data/movies.js anymore
// (deliberately — see that file's own comment, a title there would
// shrink the video player) but the hover verb can still show a real name
// without touching that data shape by falling back to one here instead.
const FALLBACK_MOVIE_TITLES = {
    "realtime-voting": "Real-Time Voting",
    "storytime-portal": "Story-Time on Portal",
    "netflix-moments": "Netflix Moments",
    // The poster art itself is painted with "NFL X SQUIDGAME".
    "nfl-squidgame": "NFL x Squidgame"
};

export default class TheatreScene extends AdventureScene {

    constructor() {
        super("Theatre");
    }

    // See LibraryScene's own preload() comment — same deferred-loading
    // reasoning. theatre-room-screen doubles as this Room's own projector-
    // screen decor AND the "movie-screen" TakeoverFrame frame (see
    // adventure/takeoverFrames.js) — one file, loaded once here either way.
    preload() {

        this.showLoadingText();

        this.load.image("theatre-room", "assets/scenes/theatre-room.png");
        this.load.image("theatre-attendant-closeup", "assets/scenes/theatre-room-closeup.png");
        this.load.image("theatre-room-screen", "assets/scenes/theatre-room-screen.png");
        this.load.audio("music-theatre", "assets/audio/music/theatre.mp3");

    }

    buildScene() {

        this.backSceneKey = "World";

        AudioManager.playBuildingMusic(this, "theatre");

        this.setBackdrop("theatre-room", NATIVE_WIDTH, NATIVE_HEIGHT);

        this.addHitbox({
            xRange: [0.24, 0.38],
            yRange: [0.27, 0.58],
            verb: "Talk to Ticket Taker",
            onClick: () => this.fadeTo("TheatreAttendantCloseup")
        });

        this.addHitbox({
            xRange: [0.45, 0.53],
            yRange: [0.46, 0.57],
            verb: getCatPetVerb(),
            clickSfx: "sfx-cat",
            onClick: () => this.petCat()
        });

        POSTERS.forEach((poster) => {

            const movie = MOVIES.find((m) => m.id === poster.movieId);
            const title = (movie && movie.title) || FALLBACK_MOVIE_TITLES[poster.movieId];
            const verb = title ? `Watch ${title}` : "Watch Movie";

            this.addHitbox({
                xRange: poster.xRange,
                yRange: POSTER_Y_RANGE,
                verb,
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

        if (checkNPCAchievement()) {
            showNPCAchievementPopup(this);
        }

        this.time.delayedCall(2500, () => {
            this.bar.setText(IDLE_TEXT);
        });

    }

}

// Weathered red torii gate — a standalone placeholder marker for the
// entrance to a separate area (not a building, no walls/roof beyond the
// gate itself). Sized to straddle a single-tile-wide path: 32px wide,
// 48px tall, bottom-center origin so it can be depth-sorted like trees
// and buildings once it's placed in a scene.
const POST_COLOR = 0xb33c2a;
const BEAM_COLOR = 0x3a2a1f;
const TIP_COLOR = 0xb33c2a;

export default class ToriiGate {

    static create(scene, x, y) {

        const container = scene.add.container(x, y);

        // Posts
        const postWidth = 5;
        const postHeight = 36;
        const postOffsetX = 11;

        const postLeft = scene.add.rectangle(-postOffsetX, 0, postWidth, postHeight, POST_COLOR)
            .setOrigin(0.5, 1);
        const postRight = scene.add.rectangle(postOffsetX, 0, postWidth, postHeight, POST_COLOR)
            .setOrigin(0.5, 1);

        // Tie beam (straight, sits below the lintel)
        const tieBeam = scene.add.rectangle(0, -30, 32, 5, BEAM_COLOR)
            .setOrigin(0.5, 1);

        // Lintel (the top rail — wider than the posts, approximating the curve)
        const lintel = scene.add.rectangle(0, -42, 40, 6, POST_COLOR)
            .setOrigin(0.5, 1);

        // Upturned tips at each end, hinting at the curved silhouette
        const tipLeft = scene.add.rectangle(-20, -46, 4, 4, TIP_COLOR)
            .setOrigin(0.5, 1);
        const tipRight = scene.add.rectangle(20, -46, 4, 4, TIP_COLOR)
            .setOrigin(0.5, 1);

        container.add([postLeft, postRight, tieBeam, lintel, tipLeft, tipRight]);

        return container;

    }

}

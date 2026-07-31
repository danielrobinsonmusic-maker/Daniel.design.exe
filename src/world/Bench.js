// Simple front-facing wooden bench placeholder for the Scenic Overlook.
// Bottom-center origin (container's x/y is the ground-contact point) so
// it can be depth-sorted the same way as trees and buildings.
const WOOD_COLOR = 0x8b5a2b;
const WOOD_DARK = 0x6b4423;

export default class Bench {

    static create(scene, x, y) {

        const container = scene.add.container(x, y);

        const seatWidth = 28;

        const legLeft = scene.add.rectangle(-(seatWidth / 2) + 3, 0, 3, 8, WOOD_DARK)
            .setOrigin(0.5, 1);
        const legRight = scene.add.rectangle((seatWidth / 2) - 3, 0, 3, 8, WOOD_DARK)
            .setOrigin(0.5, 1);

        const seat = scene.add.rectangle(0, -8, seatWidth, 6, WOOD_COLOR)
            .setOrigin(0.5, 1);

        const backrest = scene.add.rectangle(0, -14, seatWidth, 12, WOOD_COLOR)
            .setOrigin(0.5, 1);

        container.add([legLeft, legRight, seat, backrest]);

        return container;

    }

}

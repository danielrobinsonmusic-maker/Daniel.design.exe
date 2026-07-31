// Static dusk sky backdrop for the Scenic Overlook: a warm gold-to-purple
// gradient with two layers of soft hill silhouettes. A background piece,
// not a tile — meant to sit behind a character viewed in silhouette.
export default class DuskBackdrop {

    static create(scene, width, height) {

        const graphics = scene.add.graphics();

        // Sky: dusty purple up top fading into warm gold near the horizon
        graphics.fillGradientStyle(0x2b1f4a, 0x2b1f4a, 0xe8944a, 0xf6c17a, 1);
        graphics.fillRect(0, 0, width, height);

        // Far hills — most muted/distant
        graphics.fillStyle(0x6f5a78, 1);
        graphics.fillEllipse(width * 0.22, height * 0.8, width * 0.65, height * 0.35);
        graphics.fillEllipse(width * 0.68, height * 0.78, width * 0.75, height * 0.4);

        // Near hills — darker, warmer, closer to the viewer
        graphics.fillStyle(0x4a3550, 1);
        graphics.fillEllipse(width * 0.4, height * 0.92, width * 0.85, height * 0.32);
        graphics.fillEllipse(width * 0.88, height * 0.9, width * 0.6, height * 0.3);

        return graphics;

    }

}

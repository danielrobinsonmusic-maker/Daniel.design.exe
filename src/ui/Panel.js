import Phaser from "phaser";

export default class Panel {

    constructor(scene, x, y, width, height) {

        this.container = scene.add.container(x, y);

        // panel.png ships with dead padding around the actual frame art;
        // BootScene crops a "content" frame so this fills width/height
        // exactly instead of squishing mostly-empty canvas into place.
        const panelFrame = scene.textures.get("ui-panel").has("content")
            ? "content"
            : undefined;

        // Shadow
        const shadow = scene.add.image(4, 4, "ui-panel", panelFrame);
        shadow.setDisplaySize(width, height);
        shadow.setTint(0x222222);
        shadow.setAlpha(0.35);

        // Main panel
        const background = scene.add.image(0, 0, "ui-panel", panelFrame);
        background.setDisplaySize(width, height);

        // Title bar (falls back to a flat bar if the art asset isn't in place yet)
        const titleBarY = -(height / 2) + 16;

        if (scene.textures.exists("ui-titlebar")) {
            const titleBar = scene.add.image(0, titleBarY, "ui-titlebar");
            titleBar.setDisplaySize(width - 6, 24);
            this._titleBar = titleBar;
        } else {
            this._titleBar = scene.add.rectangle(0, titleBarY, width - 6, 24, 0x3f5f9f);
        }

        this.title = scene.add.text(
            -(width / 2) + 12,
            -(height / 2) + 16,
            "",
            {
                fontFamily: "monospace",
                fontSize: "16px",
                color: "#ffffff"
            }
        ).setOrigin(0, 0.5);

        this.body = scene.add.container(0, 0);

        this.container.add([
            shadow,
            background,
            this._titleBar,
            this.title,
            this.body
        ]);

    }

    setTitle(text) {

        this.title.setText(text);

    }

}
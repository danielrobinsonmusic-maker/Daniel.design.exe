export default class AudioManager {
	static init(scene) {
		this.scene = scene;
	}

	static preload(scene) {
		// Optional hook for scenes to preload audio assets.
		this.scene = scene || this.scene;
	}

	static play(key, config) {
		try {
			if (this.scene && this.scene.sound && typeof this.scene.sound.play === 'function') {
				this.scene.sound.play(key, config);
			}
		} catch (e) {}
	}

	static stop(key) {
		try {
			if (this.scene && this.scene.sound && typeof this.scene.sound.stopByKey === 'function') {
				this.scene.sound.stopByKey(key);
			}
		} catch (e) {}
	}

	static setVolume(_v) {
		// noop safe stub — implement if needed.
	}

	static mute(_flag) {
		// noop safe stub — implement if needed.
	}
}

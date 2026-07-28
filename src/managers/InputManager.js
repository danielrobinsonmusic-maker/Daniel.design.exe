export default class InputManager {
	static init(scene) {
		this.scene = scene;
		this.keys = {};
	}

	static registerKey(key, onDown) {
		try {
			if (this.scene && this.scene.input && this.scene.input.keyboard) {
				const k = this.scene.input.keyboard.addKey(key);
				if (onDown && typeof k.on === 'function') k.on('down', onDown);
				this.keys[key] = k;
			}
		} catch (e) {}
	}

	static isDown(key) {
		const k = this.keys[key];
		return k ? !!k.isDown : false;
	}

	static onPointer(callback) {
		try {
			if (this.scene && this.scene.input && typeof this.scene.input.on === 'function') {
				this.scene.input.on('pointerdown', callback);
			}
		} catch (e) {}
	}
}

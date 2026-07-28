export default class SaveManager {
    static SAVE_KEY = "daniel-design-exe-save";

    static hasSave() {
        return localStorage.getItem(this.SAVE_KEY) !== null;
    }

    static load() {
        const data = localStorage.getItem(this.SAVE_KEY);
        return data ? JSON.parse(data) : null;
    }

    static save(data) {
        localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }

    static clear() {
        localStorage.removeItem(this.SAVE_KEY);
    }
}
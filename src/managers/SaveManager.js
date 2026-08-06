export default class SaveManager {
    static SAVE_KEY = "daniel-design-exe-save";

    static hasSave() {
        return localStorage.getItem(this.SAVE_KEY) !== null;
    }

    // Captured once in NameScene and otherwise read-only — the one place
    // every NPC dialogue line pulls the player's name from (see
    // utils/dialogueText.js's withPlayerName).
    static getName() {
        return (this.load() || {}).name || "";
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

    // Shallow-merges into whatever's already saved (e.g. { name }) instead
    // of overwriting it — callers adding a new top-level field (flags,
    // per-building state, etc.) don't need to know what else is in there.
    static update(partial) {
        const merged = { ...(this.load() || {}), ...partial };
        this.save(merged);
        return merged;
    }

    // Generic persistent boolean-flag store, meant to be reused by every
    // building's dialogue/interaction state (not just the Library) —
    // namespace keys by building/NPC/question, e.g.
    // "library.librarian.q.meta-years".
    static getFlags() {
        return (this.load() || {}).flags || {};
    }

    static hasFlag(key) {
        return !!this.getFlags()[key];
    }

    static setFlag(key, value = true) {
        this.update({ flags: { ...this.getFlags(), [key]: value } });
    }
}
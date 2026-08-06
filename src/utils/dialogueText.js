// Shared player-name insertion for every human NPC's greeting/fallback
// line (see data/librarian.js, barista.js, attendant.js,
// galleryAttendant.js, and adventure/NPCDialogue.js which calls this).
// Each template embeds one of two placeholder tokens at whatever point in
// its own sentence reads most naturally — the token's POSITION is a
// per-line grammar decision made by whoever writes that NPC's dialogue,
// but the substitution mechanics live here once rather than being
// reimplemented per building.
//
// {{name}}  -> ", <name>" (leading comma only). Use directly before
//              punctuation the template already supplies, e.g.
//              "...library{{name}}!" -> "...library, Daniel!".
// {{name,}} -> ", <name>," (comma on both sides). Use mid-sentence, where
//              the template already has its own trailing space/clause
//              after the token, e.g. "...here{{name,}} if you want..."
//              -> "...here, Daniel, if you want...".
//
// Both tokens collapse to "" when there's no name on file, so the line
// reads exactly as it did before name support existed — no dangling
// punctuation either way.
export function withPlayerName(template, name) {

    const trimmed = (name || "").trim();
    const insert = trimmed ? `, ${trimmed}` : "";

    return template
        .replace(/\{\{name,\}\}/g, insert ? `${insert},` : "")
        .replace(/\{\{name\}\}/g, insert);

}

// Sticky notes: kept in THIS browser only (localStorage). A note reaches another device only when
// you tap Sync on it and pick where it goes; the copy that arrives is then that device's own.
//
// Note: { id, color, title, lines: [{ id, html, mark: null|"todo"|"done"|"x" }],
//         createdAt, updatedAt, collapsed, from?, syncedTo?: [{ name, at }] }
const KEY = "faax_stickies";
const PREFS = "faax_stickies_prefs";

export const COLORS = [
    { id: "yellow", bg: "#fdf6a3", edge: "#e9df7a", ink: "#3b3a1e" },
    { id: "pink", bg: "#fbc4d8", edge: "#ec9fbb", ink: "#4a2333" },
    { id: "green", bg: "#b7e4b0", edge: "#93cc8b", ink: "#1f3b1c" },
    { id: "blue", bg: "#bfe1fa", edge: "#97c8ee", ink: "#1c3346" },
    { id: "lilac", bg: "#dcc9f4", edge: "#bea4e6", ink: "#33264a" },
    { id: "lime", bg: "#ddf3a0", edge: "#c3df78", ink: "#2d3a14" },
    { id: "mint", bg: "#cdeedd", edge: "#a6d9bf", ink: "#1d3a2c" },
    { id: "rose", bg: "#f7a6c9", edge: "#e57ead", ink: "#4a1830" },
    { id: "violet", bg: "#bba2ea", edge: "#9a7ed8", ink: "#271a45" },
];
export const colorOf = (id) => COLORS.find((c) => c.id === id) || COLORS[0];

const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const newLine = (mark = "todo", html = "") => ({ id: uid("l_"), html, mark });

let notes = load();
const listeners = new Set();
function load() {
    try { const x = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(x) ? x : []; } catch (e) { return []; }
}
function persist() { try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch (e) {} }
function changed() { persist(); listeners.forEach((fn) => fn(notes)); }

export const getNotes = () => notes;
export function subscribeNotes(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function addNote() {
    const used = new Set(notes.slice(0, COLORS.length - 1).map((n) => n.color));
    const color = (COLORS.find((c) => !used.has(c.id)) || COLORS[notes.length % COLORS.length]).id;
    const n = { id: uid("sn_"), color, title: "", lines: [newLine()], createdAt: Date.now(), updatedAt: Date.now(), collapsed: false };
    notes = [n, ...notes];
    changed();
    return n;
}
export function updateNote(id, patch) {
    notes = notes.map((n) => (n.id === id ? { ...n, ...(typeof patch === "function" ? patch(n) : patch), updatedAt: Date.now() } : n));
    changed();
}
export function deleteNote(id) { notes = notes.filter((n) => n.id !== id); changed(); }
export function restoreNote(note, index = 0) { notes = [...notes.slice(0, index), note, ...notes.slice(index)]; changed(); }

// A note that arrived from another device: a new note here, or a newer copy of one it sent before
export function receiveNote(note, from) {
    if (!note || typeof note.id !== "string") return null;
    const clean = {
        id: note.id, color: colorOf(note.color).id, title: String(note.title || "").slice(0, 120),
        lines: (Array.isArray(note.lines) ? note.lines : []).slice(0, 300).map((l) => ({ id: String(l.id || uid("l_")), html: sanitize(l.html), mark: ["todo", "done", "x"].includes(l.mark) ? l.mark : null })),
        createdAt: Number(note.createdAt) || Date.now(), updatedAt: Date.now(), collapsed: false,
        from: String((from && from.name) || "Another device").slice(0, 40), receivedAt: Date.now(),
    };
    if (!clean.lines.length) clean.lines = [newLine()];
    const i = notes.findIndex((n) => n.id === clean.id);
    notes = i >= 0 ? notes.map((n, k) => (k === i ? { ...clean, syncedTo: n.syncedTo } : n)) : [clean, ...notes];
    changed();
    return clean;
}

// what travels when you sync: content only
export function outgoing(note) {
    return { id: note.id, color: note.color, title: note.title, lines: note.lines, createdAt: note.createdAt };
}

// ---- preferences (handwriting on by default, board maximised or not)
export function getPrefs() {
    try { return { handwriting: true, maximized: false, ...JSON.parse(localStorage.getItem(PREFS) || "{}") }; } catch (e) { return { handwriting: true, maximized: false }; }
}
export function setPrefs(p) { try { localStorage.setItem(PREFS, JSON.stringify({ ...getPrefs(), ...p })); } catch (e) {} }

// ---- inline formatting: only these tags survive (no attributes, no scripts)
const ALLOWED = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "DEL", "MARK", "BR"]);
export function sanitize(html) {
    const box = document.createElement("div");
    box.innerHTML = String(html || "").slice(0, 20000);
    const walk = (node) => {
        [...node.childNodes].forEach((c) => {
            if (c.nodeType === 3) return;
            if (c.nodeType !== 1) { c.remove(); return; }
            walk(c);
            if (!ALLOWED.has(c.tagName)) { c.replaceWith(...c.childNodes); return; }
            [...c.attributes].forEach((a) => c.removeAttribute(a.name));
        });
    };
    walk(box);
    return box.innerHTML;
}
export const plainText = (html) => { const d = document.createElement("div"); d.innerHTML = html || ""; return d.textContent || ""; };

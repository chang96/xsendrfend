// Generated apps, kept ON DEVICE (IndexedDB) and synced between the owner's own devices.
// Guests only hold apps an owner shared into the room (in memory, or saved if the owner allows keeping).
//
// App record: { id, name, glyph, bg, fg, summary, spec, who, prompt, shared: "off"|"live"|"keep",
//               versions: [{ v, html, note, at }], current, createdAt, updatedAt, deleted? }
// App data:   per app, key -> { value, at }  (owners: synced between their devices; guests: this device only)
// Merge rule: newest updatedAt / at wins.

const DB_NAME = "faax-apps";
const MAX_VERSIONS = 5;

let alias = null;
let role = null; // "owner" | "member"
let emit = {};   // { put(record, to?), hello(manifest, reply), data(entries) }
let apps = {};   // own apps (owner)
let guestApps = {}; // apps shared with me as a guest
let unseen = 0;
const listeners = new Set();
const shareListeners = new Set();

export const newAppId = () => "app_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ------------------------------------------------------------------ IndexedDB
let dbPromise = null;
function db() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) return reject(new Error("no indexedDB"));
            const r = indexedDB.open(DB_NAME, 1);
            r.onupgradeneeded = () => {
                r.result.createObjectStore("apps", { keyPath: "key" });
                r.result.createObjectStore("data", { keyPath: "key" });
            };
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
        });
    }
    return dbPromise;
}
async function tx(store, mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
        const t = d.transaction(store, mode);
        const out = fn(t.objectStore(store));
        t.oncomplete = () => resolve(out && "result" in out ? out.result : undefined);
        t.onerror = () => reject(t.error);
    });
}
const getAllFor = (store, prefix) => tx(store, "readonly", (s) => s.getAll(IDBKeyRange.bound(prefix, prefix + "￿")));

// ------------------------------------------------------------------ lifecycle
function notify() { listeners.forEach((fn) => fn()); }
export function subscribeApps(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function onShared(fn) { shareListeners.add(fn); return () => shareListeners.delete(fn); }

export async function initApps(a, r, emitters) {
    const same = alias === a && role === r; // reconnect: keep what we already have in memory
    alias = a; role = r; emit = emitters || {};
    if (!same) { apps = {}; guestApps = {}; unseen = 0; }
    try {
        const rows = await getAllFor("apps", a + "|");
        rows.forEach((row) => {
            if (row.guest) { if (!guestApps[row.record.id]) guestApps[row.record.id] = { ...row.record, kept: true }; }
            else if (!apps[row.record.id] || (apps[row.record.id].updatedAt || 0) < (row.record.updatedAt || 0)) apps[row.record.id] = row.record;
        });
    } catch (e) { /* storage unavailable: memory only */ }
    notify();
}

export const getRole = () => role;
export const getAlias = () => alias;
export function listApps() {
    return Object.values(apps).filter((x) => !x.deleted).sort((x, y) => (y.updatedAt || 0) - (x.updatedAt || 0));
}
export function listGuestApps() {
    return Object.values(guestApps).sort((x, y) => (y.at || 0) - (x.at || 0));
}
export function getApp(id) { return (apps[id] && !apps[id].deleted ? apps[id] : null) || guestApps[id] || null; }
// Owner-only data that came with the build (answer keys etc). Never part of a shared bundle.
export function currentSecrets(app) {
    if (!app || !app.versions) return null;
    const v = app.versions.find((x) => x.v === app.current) || app.versions[0];
    return (v && v.secrets) || null;
}
export function currentHtml(app) {
    if (!app) return "";
    if (app.html) return app.html; // guest copy
    const v = (app.versions || []).find((x) => x.v === app.current) || (app.versions || [])[0];
    return v ? v.html : "";
}
export function getUnseen() { return unseen; }
export function clearUnseen() { if (unseen) { unseen = 0; notify(); } }

async function persist(record, guest) {
    try { await tx("apps", "readwrite", (s) => s.put({ key: alias + "|" + record.id, guest: !!guest, record })); } catch (e) {}
}

// ------------------------------------------------------------------ owner: create / change
export async function saveApp(record, { broadcast = true } = {}) {
    const prev = apps[record.id];
    const next = { ...record, updatedAt: Math.max(Date.now(), prev && prev.updatedAt ? prev.updatedAt + 1 : 0) };
    if (next.versions && next.versions.length > MAX_VERSIONS) {
        const keep = next.versions.slice(-MAX_VERSIONS);
        if (!keep.some((v) => v.v === next.current)) keep[0] = next.versions.find((v) => v.v === next.current);
        next.versions = keep;
    }
    apps[next.id] = next;
    await persist(next, false);
    notify();
    if (broadcast && emit.put) emit.put(next);
    return next;
}

export function addVersion(app, built, extra = {}) {
    const n = Math.max(0, ...(app.versions || []).map((v) => v.v)) + 1;
    return {
        ...app, ...extra,
        name: built.name || app.name, glyph: built.glyph || app.glyph, bg: built.bg || app.bg, fg: built.fg || app.fg,
        summary: built.summary || app.summary, spec: built.spec || app.spec,
        versions: [...(app.versions || []), { v: n, html: built.html, secrets: built.secrets || null, note: built.note || "Updated", at: Date.now() }],
        current: n,
    };
}

export function deleteApp(id) {
    const a = apps[id];
    if (!a) return;
    return saveApp({ id, deleted: true, createdAt: a.createdAt, name: a.name, versions: [], current: 0 });
}

// ------------------------------------------------------------------ owner: sync between own devices
export function manifest() {
    const m = {};
    Object.values(apps).forEach((x) => { m[x.id] = x.updatedAt || 0; });
    return m;
}

export async function applyRemotePut(record) {
    if (!record || typeof record.id !== "string" || role !== "owner") return;
    const mine = apps[record.id];
    if (mine && (mine.updatedAt || 0) >= (record.updatedAt || 0)) return;
    apps[record.id] = record;
    await persist(record, false);
    notify();
}

// Another owner device said hello: send it what it lacks, plus all app data; answer once with our own manifest
// (data entries are small; the receiver keeps whichever copy is newest)
export async function onHello({ manifest: theirs, from, reply }) {
    if (role !== "owner") return;
    Object.values(apps).forEach((x) => {
        if (!theirs || (theirs[x.id] || 0) < (x.updatedAt || 0)) emit.put && emit.put(x, from);
    });
    try {
        const rows = await getAllFor("data", alias + "|");
        const byApp = {};
        rows.forEach((r) => { (byApp[r.appId] = byApp[r.appId] || []).push({ appId: r.appId, k: r.k, value: r.value, deleted: !!r.deleted, at: r.at }); });
        Object.keys(byApp).forEach((appId) => {
            const list = byApp[appId];
            for (let i = 0; i < list.length; i += 40) emit.data && emit.data(appId, list.slice(i, i + 40), from);
        });
    } catch (e) {}
    if (!reply && emit.hello) emit.hello(manifest(), true);
}

// ------------------------------------------------------------------ app data (faax.store inside an app)
const dataKey = (appId, k) => alias + "|" + appId + "|" + k;
const dataListeners = new Set();
export function onDataChange(fn) { dataListeners.add(fn); return () => dataListeners.delete(fn); }

export async function dataGet(appId, k) {
    try { const row = await tx("data", "readonly", (s) => s.get(dataKey(appId, k))); return row && !row.deleted ? row.value : undefined; } catch (e) { return undefined; }
}
export async function dataKeys(appId) {
    try { return (await getAllFor("data", alias + "|" + appId + "|")).filter((r) => !r.deleted).map((r) => r.k); } catch (e) { return []; }
}
export async function dataSet(appId, k, value, { remove = false } = {}) {
    const at = Date.now();
    const row = { key: dataKey(appId, k), appId, k, value: remove ? null : value, deleted: remove, at };
    await tx("data", "readwrite", (s) => s.put(row));
    if (role === "owner" && emit.data) emit.data(appId, [{ appId, k, value: row.value, deleted: remove, at }]);
}
export async function applyRemoteData(entries) {
    if (role !== "owner" || !Array.isArray(entries)) return;
    for (const e of entries) {
        if (!e || typeof e.appId !== "string" || typeof e.k !== "string") continue;
        const key = dataKey(e.appId, e.k);
        const cur = await tx("data", "readonly", (s) => s.get(key)).catch(() => null);
        if (cur && (cur.at || 0) >= (e.at || 0)) continue;
        await tx("data", "readwrite", (s) => s.put({ key, appId: e.appId, k: e.k, value: e.value, deleted: !!e.deleted, at: e.at || Date.now() })).catch(() => {});
        dataListeners.forEach((fn) => fn(e.appId, e.k));
    }
}

// ------------------------------------------------------------------ guest: apps shared into the room
export function bundleFor(app) {
    return { id: app.id, name: app.name, glyph: app.glyph, bg: app.bg, fg: app.fg, summary: app.summary, who: app.who,
        version: app.current, html: currentHtml(app), keep: app.shared === "keep" };
}

export async function receiveShared(app, from) {
    if (role !== "member" || !app || typeof app.id !== "string") return;
    const prev = guestApps[app.id];
    const isNew = !prev || prev.version !== app.version;
    guestApps[app.id] = { ...app, from: from && from.name, at: Date.now(), kept: !!app.keep };
    if (app.keep) await persist(guestApps[app.id], true);
    if (isNew) { unseen += 1; shareListeners.forEach((fn) => fn(guestApps[app.id], !prev)); }
    notify();
}

export async function forgetShared(appId) {
    if (!guestApps[appId]) return;
    delete guestApps[appId];
    try { await tx("apps", "readwrite", (st) => st.delete(alias + "|" + appId)); } catch (e) {}
    notify();
}

export async function removeShared(appId) {
    const a = guestApps[appId];
    if (!a || a.kept) return;
    delete guestApps[appId];
    notify();
}

// ------------------------------------------------------------------ "open this app" requests (toast -> Apps view)
let pendingOpen = null;
const openListeners = new Set();
export function requestOpen(appId) { pendingOpen = appId; openListeners.forEach((fn) => fn(appId)); }
export function takePendingOpen() { const x = pendingOpen; pendingOpen = null; return x; }
export function onOpenRequest(fn) { openListeners.add(fn); return () => openListeners.delete(fn); }

// Local proof-of-ownership for alias rooms (faax.me/<alias>).
// Each owner device keeps its own { deviceId, key } here. There is no sign-in:
// this key IS the proof, so clearing site data on every device loses ownership
// (unless the recovery code was saved).
const OWNED_KEY = "faax_owned_aliases";      // { [alias]: { deviceId, key, savedAt } }
const LAST_KEY = "faax_last_alias";
const GUEST_KEY = "faax_guest_passes";       // sessionStorage: { [alias]: guestPass }

function read(storage, key) {
    try {
        return JSON.parse(storage.getItem(key) || "{}") || {};
    } catch (e) {
        return {};
    }
}

function write(storage, key, value) {
    try {
        storage.setItem(key, JSON.stringify(value));
    } catch (e) {
        // storage full / blocked (private mode) - ownership just won't persist on this device
    }
}

export const ALIAS_RE = /^[a-z0-9](?:[a-z0-9-]{1,18})[a-z0-9]$/;

export function normalizeAlias(a) {
    return String(a || "").trim().toLowerCase().replace(/^@/, "");
}

export function getOwnership(alias) {
    return read(window.localStorage, OWNED_KEY)[normalizeAlias(alias)] || null;
}

export function getOwnedAliases() {
    return Object.keys(read(window.localStorage, OWNED_KEY));
}

export function saveOwnership(alias, { deviceId, key }) {
    alias = normalizeAlias(alias);
    const all = read(window.localStorage, OWNED_KEY);
    all[alias] = { deviceId, key, savedAt: Date.now() };
    write(window.localStorage, OWNED_KEY, all);
    setLastAlias(alias);
}

export function removeOwnership(alias) {
    alias = normalizeAlias(alias);
    const all = read(window.localStorage, OWNED_KEY);
    delete all[alias];
    write(window.localStorage, OWNED_KEY, all);
    if (getLastAlias() === alias) {
        try { window.localStorage.removeItem(LAST_KEY); } catch (e) {}
    }
}

export function getLastAlias() {
    try {
        const last = window.localStorage.getItem(LAST_KEY);
        if (last && getOwnership(last)) return last;
    } catch (e) {}
    return getOwnedAliases()[0] || null;
}

export function setLastAlias(alias) {
    try { window.localStorage.setItem(LAST_KEY, normalizeAlias(alias)); } catch (e) {}
}

// Guest passes only live for this tab session (lets a guest survive a refresh / reconnect)
export function getGuestPass(alias) {
    return read(window.sessionStorage, GUEST_KEY)[normalizeAlias(alias)] || null;
}

export function saveGuestPass(alias, pass) {
    const all = read(window.sessionStorage, GUEST_KEY);
    all[normalizeAlias(alias)] = pass;
    write(window.sessionStorage, GUEST_KEY, all);
}

// Friendly label like "Mac · Chrome" / "iPhone · Safari" shown in device lists and knock prompts
export function deviceLabel() {
    const ua = navigator.userAgent || "";
    let os = "Device";
    if (/iPhone/.test(ua)) os = "iPhone";
    else if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) os = "iPad";
    else if (/Android/.test(ua)) os = /Mobile/.test(ua) ? "Android phone" : "Android tablet";
    else if (/Macintosh|Mac OS X/.test(ua)) os = "Mac";
    else if (/Windows/.test(ua)) os = "Windows PC";
    else if (/CrOS/.test(ua)) os = "Chromebook";
    else if (/Linux/.test(ua)) os = "Linux PC";

    let browser = "";
    if (/Edg\//.test(ua)) browser = "Edge";
    else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
    else if (/Firefox\/|FxiOS/.test(ua)) browser = "Firefox";
    else if (/Chrome\/|CriOS/.test(ua)) browser = "Chrome";
    else if (/Safari\//.test(ua)) browser = "Safari";

    return browser ? `${os} · ${browser}` : os;
}

export function aliasUrl(alias) {
    return `${window.location.origin}/${normalizeAlias(alias)}`;
}

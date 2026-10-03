// Installable-app helpers: service worker registration, install prompt, and the share inbox
// (files shared to faax from Android's share sheet, kept in IndexedDB on this device only).

let deferredPrompt = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(getInstallState()));

export function initPwa() {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("SW registration failed", e));
        });
    }
    // Chrome/Edge/Android fire this when the app can be installed; keep it for our own button
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferredPrompt = e;
        emit();
    });
    window.addEventListener("appinstalled", () => {
        deferredPrompt = null;
        emit();
    });
}

export function isStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
}

export function isIOS() {
    const ua = navigator.userAgent || "";
    return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

// "prompt" -> we can show the native install dialog; "ios" -> show Add to Home Screen steps;
// "installed" -> already running as an app; "none" -> browser can't install (or not yet)
export function getInstallState() {
    if (isStandalone()) return "installed";
    if (deferredPrompt) return "prompt";
    if (isIOS()) return "ios";
    return "none";
}

export function onInstallStateChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export async function promptInstall() {
    if (!deferredPrompt) return "unavailable";
    const p = deferredPrompt;
    deferredPrompt = null;
    p.prompt();
    const choice = await p.userChoice.catch(() => ({ outcome: "dismissed" }));
    emit();
    return choice.outcome;
}

// ------------------------------------------------------------------ share inbox
function openInbox() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) return reject(new Error("no indexedDB"));
        const req = indexedDB.open("faax-share", 1);
        req.onupgradeneeded = () => req.result.createObjectStore("shares", { keyPath: "id" });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function withStore(mode, fn) {
    const db = await openInbox();
    try {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction("shares", mode);
            const result = fn(tx.objectStore("shares"));
            tx.oncomplete = () => resolve(result && "result" in result ? result.result : undefined);
            tx.onerror = () => reject(tx.error);
        });
    } finally {
        db.close();
    }
}

export function getShare(id) {
    return withStore("readonly", (s) => s.get(id)).catch(() => null);
}

export function deleteShare(id) {
    return withStore("readwrite", (s) => s.delete(id)).catch(() => {});
}

// Shares older than a day are cleaned up so files don't pile up in the browser
export function pruneShares(maxAgeMs = 24 * 3600 * 1000) {
    return withStore("readwrite", (s) => {
        const req = s.openCursor();
        req.onsuccess = () => {
            const c = req.result;
            if (!c) return;
            if (Date.now() - (c.value.at || 0) > maxAgeMs) c.delete();
            c.continue();
        };
    }).catch(() => {});
}

// Hand-off between the Send-to screen and the room it opens
const PENDING_KEY = "faax_pending_share";
export function setPendingShare(id) {
    try { sessionStorage.setItem(PENDING_KEY, id); } catch (e) {}
}
export function takePendingShareId() {
    try { return sessionStorage.getItem(PENDING_KEY); } catch (e) { return null; }
}
export function clearPendingShare() {
    try { sessionStorage.removeItem(PENDING_KEY); } catch (e) {}
}

// Turn a stored share back into File objects the existing send flow understands
export function shareToFiles(share) {
    return (share && share.files ? share.files : []).map((f) =>
        f.blob instanceof File ? f.blob : new File([f.blob], f.name, { type: f.type })
    );
}

export function shareText(share) {
    if (!share) return "";
    const parts = [share.title, share.text, share.url].map((x) => (x || "").trim()).filter(Boolean);
    // Many apps put the URL inside text too; avoid sending it twice
    return [...new Set(parts)].join("\n");
}

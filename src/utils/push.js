// Turning push notifications on/off for this owner device. The server keeps only this device's
// push address; notifications are end-to-end encrypted to this browser.
import { isIOS, isStandalone } from "./pwa";

const urlB64 = (s) => {
    const pad = "=".repeat((4 - (s.length % 4)) % 4);
    const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

async function registration() {
    if (!("serviceWorker" in navigator)) return null;
    const ready = navigator.serviceWorker.ready;
    const timeout = new Promise((r) => setTimeout(() => r(null), 8000));
    return Promise.race([ready, timeout]);
}

// "unsupported" | "ios-install" | "denied" | "off" | "on"
export async function getPushState() {
    if (!supported()) return isIOS() && !isStandalone() ? "ios-install" : "unsupported";
    if (Notification.permission === "denied") return "denied";
    if (Notification.permission !== "granted") return "off";
    const reg = await registration();
    const sub = reg && (await reg.pushManager.getSubscription());
    return sub ? "on" : "off";
}

export async function enablePush(request) {
    if (!supported()) return { ok: false, state: await getPushState() };
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, state: perm === "denied" ? "denied" : "off" };
    const reg = await registration();
    if (!reg) return { ok: false, error: "no_service_worker" };
    const key = await request("push:key", {});
    if (!key.ok) return { ok: false, error: "no_key" };
    let sub = await reg.pushManager.getSubscription();
    if (sub && sub.options && sub.options.applicationServerKey) {
        // server keys changed -> start over
        const cur = new Uint8Array(sub.options.applicationServerKey);
        const want = urlB64(key.key);
        if (cur.length !== want.length || cur.some((b, i) => b !== want[i])) { await sub.unsubscribe().catch(() => {}); sub = null; }
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(key.key) });
    const res = await request("push:subscribe", { subscription: sub.toJSON() });
    return res.ok ? { ok: true, state: "on" } : { ok: false, error: res.error };
}

export async function disablePush(request) {
    const reg = await registration();
    const sub = reg && (await reg.pushManager.getSubscription());
    if (sub) {
        await request("push:unsubscribe", { endpoint: sub.endpoint });
        await sub.unsubscribe().catch(() => {});
    }
    return { ok: true, state: "off" };
}

// After an owner device enters its room: make sure the server still has this device's address
export async function refreshPush(socket) {
    try {
        if (!supported() || Notification.permission !== "granted") return;
        const reg = await registration();
        const sub = reg && (await reg.pushManager.getSubscription());
        if (sub) socket.emit("push:subscribe", { subscription: sub.toJSON() });
    } catch (e) {}
}

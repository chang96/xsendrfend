// Long-running AI work (plan / build / improve / fix) lives here, outside React,
// so a build keeps going while you switch to chat and lands when it's done.
import { addVersion, bundleFor, getApp, newAppId, requestOpen, saveApp } from "../../utils/appsStore";

export const ERRORS = {
    not_configured: "App building isn't set up on the server yet (missing API key).",
    rate_limited: "That's a lot of building this hour. Try again a bit later.",
    ai_error: "Couldn't build that right now. Try again in a moment.",
    bad_output: "The builder returned something broken. Try again, maybe with a bit more detail.",
    timeout: "That took too long. Try again, or ask for something a little smaller.",
    not_owner: "Only the owner's devices can build apps here.",
    no_response: "Lost the connection while building. Try again.",
};
// The server adds a short reason for AI failures (bad key, unknown model, overloaded...) so it isn't a mystery
export const errorText = (code, detail) => {
    const base = ERRORS[code] || ERRORS.ai_error;
    return detail && (code === "ai_error" || !ERRORS[code]) ? `${base.replace(/ Try again.*$/, "")} ${detail}` : base;
};

// ---- toast bus (one host renders it, wherever you are in the room)
const toastListeners = new Set();
let toastKey = 0;
export function toast(t) { const x = { ms: 4500, ...t, key: ++toastKey }; toastListeners.forEach((fn) => fn(x)); }
export function onToast(fn) { toastListeners.add(fn); return () => toastListeners.delete(fn); }

// ---- jobs
let jobs = []; // { id, kind: "new" | "change", appId?, label, startedAt, who }
const jobListeners = new Set();
const changed = () => { jobs = [...jobs]; jobListeners.forEach((fn) => fn(jobs)); };
export const getJobs = () => jobs;
export function onJobs(fn) { jobListeners.add(fn); return () => jobListeners.delete(fn); }
export const jobFor = (appId) => jobs.find((j) => j.appId === appId) || null;

export function shareToRoom(socket, app) {
    if (!socket || !app || !app.shared || app.shared === "off") return;
    socket.emit("app:share", { app: bundleFor(app) });
}

// Off / Live / Keep, from anywhere (runner header, ✦ menu, the grid)
export async function setAppSharing(socket, app, mode) {
    if (!app || mode === (app.shared || "off")) return app;
    const saved = await saveApp({ ...app, shared: mode });
    if (mode === "off") socket && socket.emit("app:unshare", { appId: app.id });
    else shareToRoom(socket, saved);
    toast({ text: mode === "off" ? "Stopped sharing" : mode === "live" ? "Shared live with the room" : "Shared · they can keep a copy" });
    return saved;
}

export function planApp(request, { prompt, who, base }) {
    return request("apps:plan", { prompt, who, base: base ? { name: base.name, spec: base.spec, html: "" } : undefined }, 150000);
}

// New app from a description (+ answers from "Ask me first")
export async function buildNew(ws, { prompt, who, answers }) {
    const id = newAppId();
    const job = { id, kind: "new", label: prompt, who, startedAt: Date.now() };
    jobs.push(job); changed();
    const res = await ws.request("apps:build", { prompt, who, answers }, 600000);
    jobs = jobs.filter((j) => j !== job); changed();
    if (!res.ok) { toast({ text: errorText(res.error, res.detail), ms: 12000, tone: "error" }); return null; }
    const a = res.app;
    const now = Date.now();
    const saved = await saveApp({
        id, name: a.name, glyph: a.glyph, bg: a.bg, fg: a.fg, summary: a.summary, spec: a.spec,
        who: a.who || who, prompt, shared: "off", createdAt: now,
        versions: [{ v: 1, html: a.html, secrets: a.secrets || null, note: a.note || "First version", at: now }], current: 1,
    });
    toast({ text: `✦ ${saved.name} is ready`, actionLabel: "Open", action: () => requestOpen(saved.id), ms: 7000 });
    return saved;
}

// Improve or fix an existing app: a new version on top of the current one
export async function buildChange(ws, appId, { prompt, answers, fix }) {
    const app = getApp(appId);
    if (!app || jobFor(appId)) return null;
    const v = (app.versions || []).find((x) => x.v === app.current) || {};
    const job = { id: "job_" + Date.now(), kind: "change", appId, label: prompt, fix: !!fix, startedAt: Date.now() };
    jobs.push(job); changed();
    const res = await ws.request("apps:build", {
        prompt, who: app.who, answers,
        base: { name: app.name, spec: app.spec, html: v.html || "", secrets: v.secrets || null },
    }, 600000);
    jobs = jobs.filter((j) => j !== job); changed();
    if (!res.ok) { toast({ text: errorText(res.error, res.detail), ms: 12000, tone: "error" }); return null; }
    const latest = getApp(appId) || app; // it may have changed on another device meanwhile
    const saved = await saveApp(addVersion(latest, res.app));
    shareToRoom(ws.socket, saved);
    toast({ text: `✦ v${saved.current} · ${(res.app.note || (fix ? "Fixed" : "Updated")).slice(0, 48)}`, ms: 5000 });
    return saved;
}

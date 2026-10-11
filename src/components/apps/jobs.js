// Long-running AI work (plan / build / improve / fix) lives here, outside React,
// so a build keeps going while you switch to chat and lands when it's done.
import { addVersion, bundleFor, getAlias, getApp, newAppId, requestOpen, saveApp } from "../../utils/appsStore";

export const ERRORS = {
    not_configured: "App building isn't set up on the server yet (missing API key).",
    rate_limited: "That's a lot of building this hour. Try again a bit later.",
    ai_error: "Couldn't build that right now. Try again in a moment.",
    bad_output: "The builder returned something broken. Try again, maybe with a bit more detail.",
    timeout: "That took too long. Try again, or ask for something a little smaller.",
    not_owner: "Only the owner's devices can build apps here.",
    no_response: "Lost the connection while building. Try again.",
    busy: "Three builds are already running. Wait for one to finish.",
    lost: "The server restarted during the build. Try again.",
};
// The server adds a short reason for AI failures (bad key, unknown model, overloaded...) so it isn't a mystery
export const errorText = (code, detail) => {
    const base = ERRORS[code] || ERRORS.ai_error;
    if (detail && code === "bad_output") return detail;
    return detail && (code === "ai_error" || !ERRORS[code]) ? `${base.replace(/ Try again.*$/, "")} ${detail}` : base;
};

// ---- toast bus (one host renders it, wherever you are in the room)
const toastListeners = new Set();
let toastKey = 0;
export function toast(t) { const x = { ms: 4500, ...t, key: ++toastKey }; toastListeners.forEach((fn) => fn(x)); }
export function onToast(fn) { toastListeners.add(fn); return () => toastListeners.delete(fn); }

// ---- jobs
// A build runs on the server, detached from this socket. Progress and the result arrive as
// "apps:job" events on every owner device; the device that asked ("mine") saves the result.
// Mine jobs are remembered in localStorage so a reload or reconnect mid-build still lands the app.
let jobs = []; // { id, kind: "new"|"change", appId, label, prompt, who, fix, startedAt, progress, mine }
const jobListeners = new Set();
const changed = () => { jobs = [...jobs]; jobListeners.forEach((fn) => fn(jobs)); };
export const getJobs = () => jobs;
export function onJobs(fn) { jobListeners.add(fn); return () => jobListeners.delete(fn); }
export const jobFor = (appId) => jobs.find((j) => j.appId === appId) || null;

const storeKey = () => "faax_app_jobs_" + (getAlias() || "");
function persistMine() {
    try {
        const mine = jobs.filter((j) => j.mine).map(({ id, kind, appId, label, prompt, who, fix, startedAt }) => ({ id, kind, appId, label, prompt, who, fix, startedAt }));
        localStorage.setItem(storeKey(), JSON.stringify(mine));
    } catch (e) {}
}
function restoreMine() {
    try {
        const saved = JSON.parse(localStorage.getItem(storeKey()) || "[]");
        saved.forEach((j) => { if (!jobs.some((x) => x.id === j.id)) jobs.push({ ...j, mine: true, progress: { text: "Reconnecting to the build" } }); });
        changed();
    } catch (e) {}
}
const removeJob = (id) => { jobs = jobs.filter((j) => j.id !== id); persistMine(); changed(); };

async function finish(job, app) {
    if (job.kind === "new") {
        const now = Date.now();
        const saved = await saveApp({
            id: job.appId, name: app.name, glyph: app.glyph, bg: app.bg, fg: app.fg, summary: app.summary, spec: app.spec,
            who: app.who || job.who, prompt: job.prompt, shared: "off", createdAt: now,
            versions: [{ v: 1, html: app.html, secrets: app.secrets || null, note: app.note || "First version", at: now }], current: 1,
        });
        toast({ text: `✦ ${saved.name} is ready`, actionLabel: "Open", action: () => requestOpen(saved.id), ms: 7000 });
    } else {
        const latest = getApp(job.appId);
        if (!latest) return;
        const saved = await saveApp(addVersion(latest, app));
        shareToRoom(sock, saved);
        toast({ text: `✦ v${saved.current} · ${(app.note || (job.fix ? "Fixed" : "Updated")).slice(0, 48)}`, ms: 5000 });
    }
}

function onJobEvent(e) {
    if (!e || !e.jobId) return;
    const job = jobs.find((j) => j.id === e.jobId);
    if (e.state === "running") {
        if (job) Object.assign(job, { progress: e.progress || job.progress, startedAt: e.startedAt || job.startedAt });
        else jobs.push({ id: e.jobId, kind: e.kind, appId: e.appId, label: e.label, startedAt: e.startedAt || Date.now(), progress: e.progress, mine: false });
        changed();
        return;
    }
    if (!job) return;
    removeJob(job.id); // done or error: either way it's over (only once, even if the event repeats)
    if (!job.mine) return; // the device that asked saves it; the app reaches this device through sync
    if (e.state === "done" && e.app) finish(job, e.app);
    else toast({ text: errorText(e.error, e.detail), ms: 12000, tone: "error" });
}

let sock = null;
// Called when an owner device enters the room (and again after every reconnect)
export function attachJobs(socket) {
    if (sock !== socket) { sock = socket; socket.on("apps:job", onJobEvent); }
    restoreMine();
    socket.emit("apps:jobs", {}, (res) => {
        if (!res || !res.ok) return;
        const known = new Set(res.jobs.map((j) => j.jobId));
        jobs.filter((j) => j.mine && !known.has(j.id)).forEach((j) => { removeJob(j.id); toast({ text: ERRORS.lost, ms: 8000, tone: "error" }); });
        res.jobs.forEach((j) => onJobEvent(j));
    });
}

async function startJob(ws, job, payload) {
    jobs.push({ ...job, mine: true, startedAt: Date.now(), progress: { text: "Reading your idea" } });
    persistMine(); changed();
    const res = await ws.request("apps:build", { ...payload, jobId: job.id, appId: job.appId }, 20000);
    if (!res.ok) { removeJob(job.id); toast({ text: errorText(res.error, res.detail), ms: 9000, tone: "error" }); }
}

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
export function buildNew(ws, { prompt, who, answers }) {
    const id = "job_" + newAppId();
    return startJob(ws, { id, kind: "new", appId: newAppId(), label: prompt, prompt, who }, { prompt, who, answers });
}

// Improve or fix an existing app: a new version on top of the current one
export function buildChange(ws, appId, { prompt, answers, fix }) {
    const app = getApp(appId);
    if (!app || jobFor(appId)) return null;
    const v = (app.versions || []).find((x) => x.v === app.current) || {};
    return startJob(ws, { id: "job_" + newAppId(), kind: "change", appId, label: prompt, prompt, fix: !!fix }, {
        prompt, who: app.who, answers,
        base: { name: app.name, spec: app.spec, html: v.html || "", secrets: v.secrets || null },
    });
}

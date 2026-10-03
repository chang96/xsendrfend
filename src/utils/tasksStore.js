// Owner-only daily planner, kept in this browser's localStorage and synced between the
// owner's devices through the server (which stores nothing).
//
// Works like a paper planner:
//   goals   - the long-term sheet
//   tasks   - today's sheet; unfinished ones carry over automatically (carry = days since firstDay)
//   bundles - small groups of steps done together ("Shopping trip")
//   entries - raw brain-dump lines waiting for Organize
//   settings- what to keep after a day ends, for how long, and when a new day starts
//
// Item shapes (all have id, kind, updatedAt, optional deleted):
//   entry:    { text, createdAt }
//   task:     { text, goalId, bundleId, day, firstDay, order, done, doneAt, doneDay, note, createdAt }
//   bundle:   { title, order, createdAt }
//   goal:     { title, color, order, createdAt }
//   settings: { id: "settings", keep: "none"|"goal"|"all", retentionDays: number|null, dayStartHour }
// Merge rule: per item, newest updatedAt wins; deletes are tombstones, so edits made on two
// devices while apart are both kept.

const STORAGE_PREFIX = "faax_planner_";
const TOMBSTONE_TTL = 30 * 24 * 60 * 60 * 1000;
export const DEFAULT_SETTINGS = { keep: "goal", retentionDays: 30, dayStartHour: 4 };
export const GOAL_COLORS = ["#8e9bff", "#3ddc97", "#ffb44c", "#ff6b8b", "#4fc3f7", "#c792ea", "#f7d154", "#5ee7df"];

let currentAlias = null;
let state = { items: {} };
let broadcast = null;
const listeners = new Set();

export const newId = (prefix) => prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ------------------------------------------------------------------ days
const pad = (n) => String(n).padStart(2, "0");
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (key) => { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d, 12); };

export function logicalDay(ts, dayStartHour = DEFAULT_SETTINGS.dayStartHour) {
    return fmt(new Date(ts - dayStartHour * 3600 * 1000));
}
export function addDays(key, n) {
    const d = parse(key);
    d.setDate(d.getDate() + n);
    return fmt(d);
}
export function daysBetween(a, b) {
    const [ay, am, ad] = a.split("-").map(Number);
    const [by, bm, bd] = b.split("-").map(Number);
    return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}
export function dayLabel(key, today) {
    const diff = daysBetween(today, key);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    const d = parse(key);
    const opts = Math.abs(diff) < 7 ? { weekday: "long" } : { weekday: "short", day: "numeric", month: "short" };
    return d.toLocaleDateString(undefined, opts);
}
export function longDate(key) {
    return parse(key).toLocaleDateString(undefined, { day: "numeric", month: "long" });
}
export function weekdayName(key) {
    return parse(key).toLocaleDateString(undefined, { weekday: "long" });
}

// ------------------------------------------------------------------ store core
function prune(items) {
    const cutoff = Date.now() - TOMBSTONE_TTL;
    const out = {};
    for (const [id, it] of Object.entries(items || {})) {
        if (!it || typeof it !== "object" || it.id !== id || typeof it.kind !== "string") continue;
        if (it.deleted && (it.updatedAt || 0) < cutoff) continue;
        out[id] = it;
    }
    return out;
}

function newer(a, b) {
    if (!a) return b;
    if (!b) return a;
    if ((b.updatedAt || 0) !== (a.updatedAt || 0)) return (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a;
    return JSON.stringify(b) > JSON.stringify(a) ? b : a; // deterministic tie-break
}

export function mergeStates(local, remote) {
    const items = { ...local.items };
    let changed = false;
    for (const [id, r] of Object.entries(prune(remote && remote.items))) {
        const winner = newer(items[id], r);
        if (winner !== items[id]) {
            items[id] = winner;
            changed = true;
        }
    }
    return { state: { items }, changed };
}

function load(alias) {
    try {
        const raw = JSON.parse(window.localStorage.getItem(STORAGE_PREFIX + alias) || "null");
        return { items: prune(raw && raw.items) };
    } catch (e) {
        return { items: {} };
    }
}

function save() {
    if (!currentAlias) return;
    try { window.localStorage.setItem(STORAGE_PREFIX + currentAlias, JSON.stringify(state)); } catch (e) {}
}

function notify() {
    listeners.forEach((fn) => fn(state));
}

export function initTasks(alias, onLocalChange) {
    if (currentAlias !== alias) {
        currentAlias = alias;
        state = load(alias);
    }
    broadcast = onLocalChange;
    notify();
    return state;
}

export const getTasksState = () => state;

export function subscribeTasks(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

// Remote list arrived; returns true if the sender is missing something we have
export function applyRemote(remote) {
    if (!currentAlias) return false;
    const { state: merged, changed } = mergeStates(state, remote);
    if (changed) {
        state = merged;
        save();
        notify();
    }
    return mergeStates({ items: prune(remote && remote.items) }, state).changed;
}

// Local edit. mutate(items, stamp): stamp(item) records a new/changed item with a fresh timestamp.
export function updateTasks(mutate) {
    if (!currentAlias) return undefined;
    const items = { ...state.items };
    const now = Date.now();
    let touched = 0;
    const stamp = (item) => {
        const prev = state.items[item.id];
        item.updatedAt = Math.max(now, prev && prev.updatedAt ? prev.updatedAt + 1 : 0);
        items[item.id] = item;
        touched++;
        return item;
    };
    const result = mutate(items, stamp);
    if (touched === 0) return result;
    state = { items };
    save();
    notify();
    if (broadcast) broadcast(state);
    return result;
}

// ------------------------------------------------------------------ selectors
export function getSettings(s = state) {
    const it = s.items.settings;
    return { ...DEFAULT_SETTINGS, ...(it && !it.deleted ? it : {}) };
}

export function currentDay(s = state, now = Date.now()) {
    return logicalDay(now, getSettings(s).dayStartHour);
}

const live = (s) => Object.values(s.items).filter((it) => !it.deleted);
const byOrder = (a, b) => (a.order || 0) - (b.order || 0) || (a.createdAt || 0) - (b.createdAt || 0);

export function selectView(s = state, now = Date.now()) {
    const settings = getSettings(s);
    const today = logicalDay(now, settings.dayStartHour);
    const all = live(s);
    const tasks = all.filter((it) => it.kind === "task");
    const goals = all.filter((it) => it.kind === "goal").sort(byOrder);
    const bundles = all.filter((it) => it.kind === "bundle");
    const entries = all.filter((it) => it.kind === "entry").sort((a, b) => a.createdAt - b.createdAt);
    const goalById = Object.fromEntries(goals.map((g) => [g.id, g]));

    const decorate = (t) => ({
        ...t,
        goal: t.goalId ? goalById[t.goalId] || null : null,
        carry: !t.done && t.firstDay && t.firstDay < today ? daysBetween(t.firstDay, today) : 0,
    });
    const onToday = (t) => (t.done ? t.doneDay === today : (t.day || today) <= today);

    // Today: unbundled tasks + bundles, one shared order
    const todayTasks = tasks.filter(onToday).map(decorate);
    const rows = [];
    for (const t of todayTasks) if (!t.bundleId || !bundles.some((b) => b.id === t.bundleId)) rows.push({ type: "task", order: t.order, createdAt: t.createdAt, task: t });
    for (const b of bundles) {
        const inside = todayTasks.filter((t) => t.bundleId === b.id).sort(byOrder);
        if (inside.length) rows.push({ type: "bundle", order: b.order, createdAt: b.createdAt, bundle: b, tasks: inside, done: inside.filter((t) => t.done).length });
    }
    rows.sort(byOrder);

    // Upcoming: open tasks planned for a later day
    const bundleById = Object.fromEntries(bundles.map((b) => [b.id, b]));
    const upcomingTasks = tasks.filter((t) => !t.done && (t.day || today) > today).map((t) => ({ ...decorate(t), bundle: bundleById[t.bundleId] || null }));
    const upcomingDays = [...new Set(upcomingTasks.map((t) => t.day))].sort().map((day) => ({
        day, label: dayLabel(day, today), tasks: upcomingTasks.filter((t) => t.day === day).sort(byOrder),
    }));

    // Goals with progress from the finished tasks that are kept
    const doneTasks = tasks.filter((t) => t.done && t.doneDay);
    const goalStats = goals.map((g) => {
        const done = doneTasks.filter((t) => t.goalId === g.id).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
        const open = tasks.filter((t) => !t.done && t.goalId === g.id).map(decorate).sort((a, b) => (a.day || "").localeCompare(b.day || "") || byOrder(a, b));
        const activity = Array.from({ length: 14 }, (_, i) => {
            const day = addDays(today, i - 13);
            return { day, count: done.filter((t) => t.doneDay === day).length };
        });
        return { goal: g, done, open, lastDoneDay: done.length ? done[0].doneDay : null, activity };
    });

    // History: finished tasks grouped per day (only what settings keep)
    const historyDays = [...new Set(doneTasks.map((t) => t.doneDay))].sort().reverse().map((day) => ({
        day, label: dayLabel(day, today), tasks: doneTasks.filter((t) => t.doneDay === day).map(decorate).sort((a, b) => (a.doneAt || 0) - (b.doneAt || 0)),
    }));

    return {
        settings, today, entries, rows, goals: goalStats, upcomingDays, historyDays, bundles,
        todayTotal: todayTasks.length,
        todayDone: todayTasks.filter((t) => t.done).length,
        upcomingCount: upcomingTasks.length,
    };
}

// ------------------------------------------------------------------ actions
const endOrder = (list) => Math.max(0, ...list.map((x) => x.order || 0)) + 1;
const topLevel = (items) => Object.values(items).filter((it) => !it.deleted && ((it.kind === "task" && !it.bundleId) || it.kind === "bundle"));
const inBundle = (items, bundleId) => Object.values(items).filter((it) => !it.deleted && it.kind === "task" && it.bundleId === bundleId);

function orderBefore(list, beforeId) {
    const before = list.find((x) => x.id === beforeId);
    if (!before) return endOrder(list);
    const lower = list.filter((x) => (x.order || 0) < before.order).map((x) => x.order || 0);
    const prev = lower.length ? Math.max(...lower) : before.order - 1;
    return (prev + before.order) / 2;
}

export function addEntries(lines) {
    const clean = lines.map((l) => l.trim()).filter(Boolean);
    if (!clean.length) return;
    updateTasks((items, stamp) => {
        clean.forEach((text, i) => stamp({ id: newId("e"), kind: "entry", text: text.slice(0, 1000), createdAt: Date.now() + i }));
    });
}

export function toggleDone(id) {
    updateTasks((items, stamp) => {
        const t = items[id];
        if (!t || t.deleted) return;
        const today = currentDay({ items });
        stamp(t.done
            ? { ...t, done: false, doneAt: null, doneDay: null }
            : { ...t, done: true, doneAt: Date.now(), doneDay: today, note: null });
    });
}

export function patchItem(id, patch) {
    updateTasks((items, stamp) => {
        if (items[id] && !items[id].deleted) stamp({ ...items[id], ...patch });
    });
}

// Delete with undo: returns a function that restores exactly what was removed
export function deleteItems(ids) {
    const removed = updateTasks((items, stamp) => {
        const gone = [];
        for (const id of ids) {
            const it = items[id];
            if (!it || it.deleted) continue;
            gone.push({ ...it });
            stamp({ ...it, deleted: true });
            if (it.kind === "goal") {
                // tasks keep living, just without the goal link
                Object.values(items).forEach((t) => {
                    if (t.kind === "task" && !t.deleted && t.goalId === id) { gone.push({ ...t }); stamp({ ...t, goalId: null }); }
                });
            }
            if (it.kind === "task" && it.bundleId && inBundle(items, it.bundleId).length === 0 && items[it.bundleId] && !items[it.bundleId].deleted) {
                gone.push({ ...items[it.bundleId] });
                stamp({ ...items[it.bundleId], deleted: true });
            }
        }
        return gone;
    }) || [];
    return () => updateTasks((items, stamp) => removed.forEach((it) => stamp({ ...it, deleted: false })));
}

export function ungroupBundle(bundleId) {
    updateTasks((items, stamp) => {
        const b = items[bundleId];
        if (!b) return;
        const tasks = inBundle(items, bundleId).sort(byOrder);
        const step = 1 / (tasks.length + 1);
        tasks.forEach((t, i) => stamp({ ...t, bundleId: null, order: (b.order || 0) + step * i }));
        stamp({ ...b, deleted: true });
    });
}

export function moveToBundle(taskId, bundleId) {
    updateTasks((items, stamp) => {
        const t = items[taskId];
        if (!t || t.bundleId === bundleId) return;
        const order = bundleId ? endOrder(inBundle(items, bundleId)) : endOrder(topLevel(items));
        stamp({ ...t, bundleId: bundleId || null, order });
        if (t.bundleId && inBundle(items, t.bundleId).length === 0 && items[t.bundleId]) stamp({ ...items[t.bundleId], deleted: true });
    });
}

export function createBundleWith(taskId, title) {
    updateTasks((items, stamp) => {
        const t = items[taskId];
        if (!t) return;
        const b = stamp({ id: newId("b"), kind: "bundle", title: title.slice(0, 40), order: t.bundleId ? endOrder(topLevel(items)) : t.order, createdAt: Date.now() });
        stamp({ ...t, bundleId: b.id, order: 1 });
    });
}

// Persist a new visual order for one list (ids in their new order)
export function reorder(ids) {
    updateTasks((items, stamp) => {
        const orders = ids.map((id) => items[id] && items[id].order).filter((o) => typeof o === "number").sort((a, b) => a - b);
        ids.forEach((id, i) => {
            const it = items[id];
            if (!it) return;
            const order = orders.length === ids.length ? orders[i] : i + 1;
            if (it.order !== order) stamp({ ...it, order });
        });
    });
}

export function addGoal(title) {
    return updateTasks((items, stamp) => {
        const goals = Object.values(items).filter((it) => it.kind === "goal" && !it.deleted);
        const existing = goals.find((g) => g.title.toLowerCase() === title.trim().toLowerCase());
        if (existing) return existing.id;
        const allGoals = Object.values(items).filter((it) => it.kind === "goal").length;
        return stamp({ id: newId("g"), kind: "goal", title: title.trim().slice(0, 60), color: allGoals % GOAL_COLORS.length, order: endOrder(goals), createdAt: Date.now() }).id;
    });
}

export function addTask(text, extra = {}) {
    updateTasks((items, stamp) => {
        const today = currentDay({ items });
        const day = extra.day && extra.day > today ? extra.day : today;
        const list = extra.bundleId ? inBundle(items, extra.bundleId) : topLevel(items);
        stamp({ id: newId("t"), kind: "task", text: text.trim().slice(0, 200), goalId: extra.goalId || null, bundleId: extra.bundleId || null,
            day, firstDay: day, order: endOrder(list), done: false, doneAt: null, doneDay: null, note: null, createdAt: Date.now() });
    });
}

export function updateSettings(patch) {
    updateTasks((items, stamp) => {
        stamp({ ...DEFAULT_SETTINGS, ...(items.settings && !items.settings.deleted ? items.settings : {}), ...patch, id: "settings", kind: "settings", deleted: false });
    });
}

// Remove finished tasks the settings say not to keep. Open tasks and goals are never touched.
export function runCleanup(now = Date.now()) {
    return updateTasks((items, stamp) => {
        const settings = getSettings({ items });
        const today = logicalDay(now, settings.dayStartHour);
        let removed = 0;
        for (const t of Object.values(items)) {
            if (t.kind !== "task" || t.deleted || !t.done || !t.doneDay || t.doneDay >= today) continue;
            const age = daysBetween(t.doneDay, today);
            const keepKind = settings.keep === "all" || (settings.keep === "goal" && t.goalId);
            const tooOld = settings.retentionDays != null && age > settings.retentionDays;
            if (!keepKind || tooOld) { stamp({ ...t, deleted: true }); removed++; }
        }
        // bundles left without any task
        for (const b of Object.values(items)) {
            if (b.kind === "bundle" && !b.deleted && inBundle(items, b.id).length === 0) stamp({ ...b, deleted: true });
        }
        return removed;
    }) || 0;
}

export function clearFinished() {
    return updateTasks((items, stamp) => {
        let n = 0;
        for (const t of Object.values(items)) if (t.kind === "task" && !t.deleted && t.done) { stamp({ ...t, deleted: true }); n++; }
        for (const b of Object.values(items)) if (b.kind === "bundle" && !b.deleted && inBundle(items, b.id).length === 0) stamp({ ...b, deleted: true });
        return n;
    }) || 0;
}

// This device only: forget everything locally (other devices keep their copy)
export function eraseLocal() {
    state = { items: {} };
    save();
    notify();
}

// ------------------------------------------------------------------ organizer
export function organizerPayload(s = state) {
    const v = selectView(s);
    const all = live(s);
    return {
        today: v.today,
        goals: v.goals.map((g) => ({ id: g.goal.id, title: g.goal.title })),
        bundles: v.bundles.map((b) => ({ id: b.id, title: b.title })),
        tasks: all.filter((t) => t.kind === "task" && !t.done).sort(byOrder)
            .map((t) => ({ id: t.id, text: t.text, bundle_id: t.bundleId || null, goal_id: t.goalId || null, day: t.day })),
        entries: v.entries.map((e) => ({ id: e.id, text: e.text })),
    };
}

export function applyOrganizerOps(ops) {
    return updateTasks((items, stamp) => {
        const today = currentDay({ items });
        const summary = { added: 0, merged: 0, goals: 0, later: 0, addedIds: [] };
        const newBundles = {};
        const bundleFor = (op, anchorOrder) => {
            if (op.bundleId && items[op.bundleId] && !items[op.bundleId].deleted) return op.bundleId;
            if (!op.newBundle) return null;
            const key = op.newBundle.toLowerCase();
            if (newBundles[key]) return newBundles[key];
            const existing = Object.values(items).find((b) => b.kind === "bundle" && !b.deleted && b.title.toLowerCase() === key);
            if (existing) return (newBundles[key] = existing.id);
            const b = stamp({ id: newId("b"), kind: "bundle", title: op.newBundle, order: anchorOrder != null ? anchorOrder : endOrder(topLevel(items)), createdAt: Date.now() });
            return (newBundles[key] = b.id);
        };

        for (const op of ops || []) {
            if (op.type === "goal") {
                const exists = op.existingGoalId || Object.values(items).some((g) => g.kind === "goal" && !g.deleted && g.title.toLowerCase() === op.title.toLowerCase());
                if (!exists) {
                    const goals = Object.values(items).filter((it) => it.kind === "goal" && !it.deleted);
                    const count = Object.values(items).filter((it) => it.kind === "goal").length;
                    stamp({ id: newId("g"), kind: "goal", title: op.title, color: count % GOAL_COLORS.length, order: endOrder(goals), createdAt: Date.now() });
                    summary.goals++;
                }
            } else if (op.type === "merge" && items[op.taskId] && !items[op.taskId].deleted) {
                const t = { ...items[op.taskId], done: false, doneAt: null, doneDay: null };
                if (op.title) t.text = op.title;
                if (op.note) t.note = op.note;
                if (op.day) t.day = op.day;
                stamp(t);
                summary.merged++;
            } else if (op.type === "add") {
                const bundleId = bundleFor(op);
                const list = bundleId ? inBundle(items, bundleId) : topLevel(items);
                const order = op.before ? orderBefore(list, op.before) : endOrder(list);
                const day = op.day && op.day > today ? op.day : today;
                const goalId = op.goalId && items[op.goalId] && !items[op.goalId].deleted ? op.goalId : null;
                const t = stamp({ id: newId("t"), kind: "task", text: op.title, goalId, bundleId, day, firstDay: day, order,
                    done: false, doneAt: null, doneDay: null, note: op.note || null, createdAt: Date.now() });
                summary.added++;
                summary.addedIds.push(t.id);
                if (day > today) summary.later++;
            }
            for (const eid of op.entryIds || []) {
                if (items[eid] && !items[eid].deleted) stamp({ ...items[eid], deleted: true });
            }
        }
        return summary;
    });
}

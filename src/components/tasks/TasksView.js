import "./tasks.css";
import { useCallback, useContext, useMemo, useRef, useState } from "react";
import { WebSocketContext } from "../../utils/websocket";
import { applyOrganizerOps, longDate, organizerPayload, weekdayName } from "../../utils/tasksStore";
import { usePlanner } from "./hooks";
import { Ring, Toast } from "./ui";
import { PlannerContext } from "./context";
import TodayTab from "./TodayTab";
import GoalsTab from "./GoalsTab";
import { BundleSheet, GoalSheet, TaskSheet } from "./Sheets";
import { HistorySheet, SettingsSheet } from "./SettingsSheet";

const ERRORS = {
    not_configured: "The organizer isn't set up on the server yet (missing API key).",
    rate_limited: "That's a lot of organizing this hour. Try again a little later.",
    ai_error: "Couldn't organize right now. Your notes are safe, try again.",
    timeout: "Organizing took too long. Your notes are safe, try again.",
};

const TABS = [{ id: "today", label: "Today" }, { id: "goals", label: "Goals" }];

export default function TasksView() {
    const { request } = useContext(WebSocketContext);
    const view = usePlanner();
    const [tab, setTabState] = useState(() => { try { return localStorage.getItem("faax_planner_tab") || "today"; } catch (e) { return "today"; } });
    const [organizing, setOrganizing] = useState(false);
    const [toast, setToast] = useState(null);
    const [newIds, setNewIds] = useState(() => new Set());
    const [sheet, setSheet] = useState(null); // { type, id }
    const toastKey = useRef(0);

    const setTab = (t) => { setTabState(t); try { localStorage.setItem("faax_planner_tab", t); } catch (e) {} };
    const notify = useCallback((t) => setToast({ ...t, key: ++toastKey.current }), []);
    const ctx = useMemo(() => ({ notify, newIds }), [notify, newIds]);

    const organize = async () => {
        if (organizing || view.entries.length === 0) return;
        setOrganizing(true);
        const res = await request("tasks:organize", organizerPayload(), 45000);
        setOrganizing(false);
        if (!res.ok) {
            notify({ text: ERRORS[res.error] || ERRORS.ai_error, ms: 6000 });
            return;
        }
        const s = applyOrganizerOps(res.ops) || { added: 0, merged: 0, goals: 0, later: 0, addedIds: [] };
        const parts = [];
        if (s.added - s.later > 0) parts.push(`${s.added - s.later} for today`);
        if (s.later > 0) parts.push(`${s.later} for later`);
        if (s.merged > 0) parts.push(`${s.merged} merged`);
        if (s.goals > 0) parts.push(`${s.goals} new goal${s.goals > 1 ? "s" : ""}`);
        notify({ text: `✦ ${parts.join(" · ") || "Organized"}` });
        setNewIds(new Set(s.addedIds));
        setTimeout(() => setNewIds(new Set()), 2600);
    };

    // sheets always read fresh data from the view
    const findTask = (id) => {
        for (const r of view.rows) {
            if (r.type === "task" && r.task.id === id) return r.task;
            if (r.type === "bundle") { const t = r.tasks.find((x) => x.id === id); if (t) return t; }
        }
        for (const d of view.upcomingDays) { const t = d.tasks.find((x) => x.id === id); if (t) return t; }
        for (const g of view.goals) { const t = g.open.find((x) => x.id === id); if (t) return t; }
        return null;
    };
    const sheetTask = sheet && sheet.type === "task" ? findTask(sheet.id) : null;
    const bundleRow = sheet && sheet.type === "bundle" ? view.rows.find((r) => r.type === "bundle" && r.bundle.id === sheet.id) : null;
    const sheetGoal = sheet && sheet.type === "goal" ? view.goals.find((g) => g.goal.id === sheet.id) : null;
    const close = () => setSheet(null);
    const tabIndex = TABS.findIndex((t) => t.id === tab);

    return (
        <PlannerContext.Provider value={ctx}>
            <div className="planner relative flex-1 flex flex-col min-h-0">
                {/* Header: date + today's progress */}
                <div className="px-4 pt-4 pb-3 flex items-center justify-between flex-shrink-0">
                    <div className="min-w-0">
                        <p className="text-[19px] leading-tight font-semibold tracking-tight text-white">{weekdayName(view.today)}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                            {longDate(view.today)}
                            {view.todayTotal > 0 && <> · {view.todayTotal - view.todayDone === 0 ? "all done" : `${view.todayTotal - view.todayDone} left`}</>}
                        </p>
                    </div>
                    <div className="flex items-center space-x-2.5">
                        <Ring done={view.todayDone} total={view.todayTotal} />
                        <button
                            onClick={() => setSheet({ type: "settings" })}
                            title="Planner settings"
                            className="h-9 w-9 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all hover:rotate-45 duration-300"
                        >
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.3 4.3c.4-1.8 3-1.8 3.4 0a1.7 1.7 0 002.6 1.1c1.6-1 3.4.9 2.4 2.4a1.7 1.7 0 001.1 2.6c1.8.4 1.8 3 0 3.4a1.7 1.7 0 00-1.1 2.6c1 1.6-.9 3.4-2.4 2.4a1.7 1.7 0 00-2.6 1.1c-.4 1.8-3 1.8-3.4 0a1.7 1.7 0 00-2.6-1.1c-1.6 1-3.4-.9-2.4-2.4a1.7 1.7 0 00-1.1-2.6c-1.8-.4-1.8-3 0-3.4a1.7 1.7 0 001.1-2.6c-1-1.6.9-3.4 2.4-2.4 1 .6 2.3.1 2.6-1.1z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Tabs with sliding indicator */}
                <div className="px-4 pb-3 flex-shrink-0">
                    <div className="relative flex bg-[#18181b] p-1 rounded-xl border border-[#26262b]">
                        <div
                            className="fx-tab-indicator absolute top-1 bottom-1 left-1 rounded-lg bg-[#2a2a31] shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_4px_12px_-4px_rgba(0,0,0,0.6)]"
                            style={{ width: `calc((100% - 0.5rem) / ${TABS.length})`, transform: `translateX(${tabIndex * 100}%)` }}
                        />
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                className={`relative z-10 flex-1 py-1.5 text-[12px] font-semibold tracking-tight transition-colors duration-200 ${tab === t.id ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
                            >
                                {t.label}
                                {t.id === "goals" && view.goals.length > 0 && <span className="ml-1 text-[10px] text-gray-500 font-medium">{view.goals.length}</span>}
                            </button>
                        ))}
                    </div>
                </div>

                {tab === "today" ? (
                    <TodayTab
                        view={view}
                        organizing={organizing}
                        onOrganize={organize}
                        onOpenTask={(t) => setSheet({ type: "task", id: t.id })}
                        onOpenBundle={(b) => setSheet({ type: "bundle", id: b.id })}
                    />
                ) : (
                    <GoalsTab view={view} onOpenGoal={(g) => setSheet({ type: "goal", id: g.id })} />
                )}

                <Toast toast={toast} onDone={() => setToast(null)} />

                {sheetTask && <TaskSheet key={sheetTask.id} task={sheetTask} view={view} onClose={close} />}
                {bundleRow && <BundleSheet bundle={bundleRow.bundle} row={bundleRow} onClose={close} />}
                {sheetGoal && <GoalSheet goal={sheetGoal.goal} view={view} onClose={close} onOpenTask={(t) => setSheet({ type: "task", id: t.id })} />}
                {sheet && sheet.type === "settings" && <SettingsSheet view={view} onClose={close} onOpenHistory={() => setSheet({ type: "history" })} />}
                {sheet && sheet.type === "history" && <HistorySheet view={view} onClose={close} />}
            </div>
        </PlannerContext.Provider>
    );
}

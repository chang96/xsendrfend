import { useContext, useState } from "react";
import { clearFinished, eraseLocal, updateSettings } from "../../utils/tasksStore";
import { GoalChip, Sheet } from "./ui";
import { PlannerContext } from "./context";

const KEEP = [
    { id: "none", title: "Nothing", desc: "Finished tasks clear the next day, like throwing away yesterday's sheet." },
    { id: "goal", title: "Only goal-linked tasks", desc: "Errands vanish; anything that moved a goal forward is kept as progress." },
    { id: "all", title: "Everything", desc: "Keep every finished task so you can look back at past days." },
];
const RETENTION = [7, 30, 90, 365, null];
const HOURS = [0, 1, 2, 3, 4, 5, 6];
const hourLabel = (h) => (h === 0 ? "Midnight" : `${h}:00 am`);

function Radio({ active, title, desc, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left flex items-start rounded-2xl px-3.5 py-3 border transition-all duration-200 ${
                active ? "border-[#4d63ff]/70 bg-[#4d63ff]/[0.08] shadow-[0_0_0_3px_rgba(77,99,255,0.10)]" : "border-[#2c2c31] hover:border-[#3a3a42]"
            }`}
        >
            <span className={`mt-0.5 h-4 w-4 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${active ? "border-[#4d63ff]" : "border-[#55555c]"}`}>
                <span className={`h-2 w-2 rounded-full bg-[#4d63ff] transition-transform duration-200 ${active ? "scale-100" : "scale-0"}`} />
            </span>
            <span className="ml-3">
                <span className="block text-[12px] font-semibold text-white">{title}</span>
                <span className="block text-[11px] text-gray-500 leading-snug mt-0.5">{desc}</span>
            </span>
        </button>
    );
}

const Label = ({ children, hint }) => (
    <div className="mb-2 mt-6 first:mt-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">{children}</p>
        {hint && <p className="text-[11px] text-gray-600 mt-0.5">{hint}</p>}
    </div>
);

export function SettingsSheet({ view, onClose, onOpenHistory }) {
    const { notify } = useContext(PlannerContext);
    const { settings } = view;
    const [custom, setCustom] = useState(RETENTION.includes(settings.retentionDays) ? "" : String(settings.retentionDays));
    const [confirm, setConfirm] = useState(null); // "clear" | "erase"
    const historyCount = view.historyDays.reduce((n, d) => n + d.tasks.length, 0);

    const setCustomDays = (v) => {
        setCustom(v);
        const n = parseInt(v, 10);
        if (n >= 1 && n <= 3650) updateSettings({ retentionDays: n });
    };

    return (
        <Sheet title="Planner settings" subtitle="Synced to all your owner devices" onClose={onClose}>
            {(close) => (
                <>
                    <Label>Keep finished tasks</Label>
                    <div className="space-y-2">
                        {KEEP.map((k) => <Radio key={k.id} active={settings.keep === k.id} title={k.title} desc={k.desc} onClick={() => updateSettings({ keep: k.id })} />)}
                    </div>

                    <div className={`fx-collapse ${settings.keep === "none" ? "is-closed" : ""}`}>
                        <div>
                            <Label hint="Older finished tasks are deleted automatically.">Delete after</Label>
                            <div className="flex flex-wrap gap-1.5 items-center">
                                {RETENTION.map((d) => (
                                    <button
                                        key={String(d)}
                                        onClick={() => { setCustom(""); updateSettings({ retentionDays: d }); }}
                                        className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all active:scale-95 ${
                                            settings.retentionDays === d && !custom ? "bg-[#001AFF] border-transparent text-white" : "border-[#2f2f35] text-gray-400 hover:text-white"
                                        }`}
                                    >
                                        {d === null ? "Never" : d === 365 ? "1 year" : `${d} days`}
                                    </button>
                                ))}
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 ${custom ? "border-[#4d63ff]/70" : "border-[#2f2f35]"}`}>
                                    <input
                                        value={custom}
                                        inputMode="numeric"
                                        onChange={(e) => setCustomDays(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                        placeholder="Custom"
                                        className="w-12 bg-transparent text-[11px] text-white outline-none placeholder-gray-500"
                                    />
                                    {custom && <span className="text-[11px] text-gray-500">days</span>}
                                </span>
                            </div>
                        </div>
                    </div>

                    <Label hint="Tasks done before this time count for the previous day.">New day starts at</Label>
                    <div className="flex flex-wrap gap-1.5">
                        {HOURS.map((h) => (
                            <button
                                key={h}
                                onClick={() => updateSettings({ dayStartHour: h })}
                                className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all active:scale-95 ${
                                    settings.dayStartHour === h ? "bg-[#001AFF] border-transparent text-white" : "border-[#2f2f35] text-gray-400 hover:text-white"
                                }`}
                            >
                                {hourLabel(h)}
                            </button>
                        ))}
                    </div>

                    {settings.keep !== "none" && (
                        <>
                            <Label>History</Label>
                            <button
                                onClick={() => { close(); setTimeout(onOpenHistory, 200); }}
                                className="w-full flex items-center justify-between rounded-2xl border border-[#2c2c31] hover:border-[#3a3a42] px-3.5 py-3 transition-colors"
                            >
                                <span className="text-[12px] text-white font-medium">View past days</span>
                                <span className="text-[11px] text-gray-500 flex items-center">
                                    {historyCount} finished
                                    <svg className="w-3 h-3 ml-1.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                </span>
                            </button>
                        </>
                    )}

                    <Label>Danger zone</Label>
                    <div className="rounded-2xl border border-[#ff6b8b]/20 divide-y divide-[#ff6b8b]/10 overflow-hidden">
                        <DangerRow
                            title="Delete all finished tasks"
                            desc="Removes every ticked task, on all your devices."
                            confirming={confirm === "clear"}
                            onAsk={() => setConfirm("clear")}
                            onCancel={() => setConfirm(null)}
                            onConfirm={() => { const n = clearFinished(); setConfirm(null); notify({ text: `Deleted ${n} finished task${n === 1 ? "" : "s"}` }); }}
                        />
                        <DangerRow
                            title="Erase planner on this device"
                            desc="Only this browser forgets its copy. Your other devices keep theirs and will sync it back next time they're online together."
                            confirming={confirm === "erase"}
                            onAsk={() => setConfirm("erase")}
                            onCancel={() => setConfirm(null)}
                            onConfirm={() => { eraseLocal(); setConfirm(null); close(); notify({ text: "Planner erased on this device" }); }}
                        />
                    </div>
                </>
            )}
        </Sheet>
    );
}

function DangerRow({ title, desc, confirming, onAsk, onCancel, onConfirm }) {
    return (
        <div className="px-3.5 py-3">
            <div className="flex items-center justify-between">
                <div className="pr-3">
                    <p className="text-[12px] font-medium text-[#ff9aa8]">{title}</p>
                    <p className="text-[10px] text-gray-500 leading-snug mt-0.5">{desc}</p>
                </div>
                {!confirming && (
                    <button onClick={onAsk} className="text-[11px] font-semibold text-[#ff7b8e] px-3 py-1.5 rounded-lg bg-[#ff6b8b]/10 hover:bg-[#ff6b8b]/15 flex-shrink-0">
                        Delete
                    </button>
                )}
            </div>
            <div className={`fx-collapse ${confirming ? "" : "is-closed"}`}>
                <div>
                    <div className="flex space-x-2 pt-2.5">
                        <button onClick={onCancel} className="flex-1 py-2 rounded-lg text-[11px] text-gray-300 bg-white/5 hover:bg-white/10">Cancel</button>
                        <button onClick={onConfirm} className="flex-1 py-2 rounded-lg text-[11px] font-semibold text-white bg-[#e5484d] hover:bg-[#d13c41]">Yes, delete</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function HistorySheet({ view, onClose }) {
    return (
        <Sheet title="Past days" subtitle={view.settings.keep === "goal" ? "Showing goal-linked tasks you kept" : "Everything you finished"} onClose={onClose}>
            {view.historyDays.length === 0 ? (
                <p className="text-[11px] text-gray-500 py-6 text-center">Nothing here yet. Finished tasks show up after their day ends.</p>
            ) : (
                <div className="space-y-5">
                    {view.historyDays.map((d) => (
                        <div key={d.day}>
                            <div className="flex items-baseline justify-between mb-1.5">
                                <p className="text-[12px] font-semibold text-white">{d.label}</p>
                                <p className="text-[10px] text-gray-500">{d.tasks.length} done</p>
                            </div>
                            <div className="space-y-1 border-l border-[#2c2c31] pl-3 ml-1">
                                {d.tasks.map((t) => (
                                    <div key={t.id} className="flex items-center">
                                        <span className="text-[12px] text-gray-400 flex-1 min-w-0 truncate">{t.text}</span>
                                        {t.goal && <span className="ml-2 flex-shrink-0"><GoalChip goal={t.goal} small /></span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Sheet>
    );
}

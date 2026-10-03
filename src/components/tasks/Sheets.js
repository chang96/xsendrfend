import { useContext, useEffect, useState } from "react";
import {
    GOAL_COLORS, addDays, createBundleWith, dayLabel, deleteItems, longDate, moveToBundle, patchItem, toggleDone, ungroupBundle,
} from "../../utils/tasksStore";
import { Checkbox, Chip, Sheet, goalColor } from "./ui";
import { PlannerContext } from "./context";

const Label = ({ children }) => <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2 mt-5">{children}</p>;

function AutoText({ value, onCommit, className, placeholder, maxLength = 200 }) {
    const [draft, setDraft] = useState(value);
    useEffect(() => setDraft(value), [value]);
    const commit = () => { const v = draft.trim(); if (v && v !== value) onCommit(v); else setDraft(value); };
    return (
        <textarea
            value={draft}
            rows={1}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value.replace(/\n/g, " "))}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
            className={`w-full bg-transparent resize-none outline-none rounded-xl px-3 py-2.5 border border-[#2c2c31] focus:border-[#4d63ff]/70 focus:shadow-[0_0_0_3px_rgba(77,99,255,0.12)] transition-all ${className || ""}`}
        />
    );
}

// ------------------------------------------------------------------ task
export function TaskSheet({ task, view, onClose }) {
    const { notify } = useContext(PlannerContext);
    const [newBundle, setNewBundle] = useState(null);
    const today = view.today;
    const tomorrow = addDays(today, 1);
    const day = task.day && task.day > today ? task.day : today;
    const bundlesToday = view.rows.filter((r) => r.type === "bundle").map((r) => r.bundle);

    return (
        <Sheet
            title={task.done ? "Done ✓" : day === today ? (task.carry ? `Carried over ${task.carry} day${task.carry > 1 ? "s" : ""}` : "Today") : dayLabel(day, today)}
            subtitle={task.done ? "Finished today" : longDate(day)}
            onClose={onClose}
            footer={(close) => (
                <div className="flex space-x-2">
                    <button
                        onClick={() => { const undo = deleteItems([task.id]); notify({ text: "Task deleted", action: undo }); close(); }}
                        className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-[#ff7b8e] bg-[#ff6b8b]/10 hover:bg-[#ff6b8b]/15 transition-colors"
                    >
                        Delete
                    </button>
                    <button
                        onClick={() => { toggleDone(task.id); close(); }}
                        className="flex-[2] py-2.5 rounded-xl text-[12px] font-semibold text-white bg-[#001AFF] hover:bg-[#1a33ff] shadow-[0_6px_18px_-8px_rgba(0,26,255,0.9)] transition-colors"
                    >
                        {task.done ? "Mark not done" : "Mark done"}
                    </button>
                </div>
            )}
        >
            {(close) => (
                <>
                    <div className="flex items-start">
                        <div className="pt-2.5 pr-2"><Checkbox done={task.done} onToggle={() => toggleDone(task.id)} color={task.goal ? goalColor(task.goal) : undefined} /></div>
                        <AutoText value={task.text} onCommit={(text) => patchItem(task.id, { text })} className="text-[14px] text-white leading-snug" />
                    </div>
                    {task.note && (
                        <div className="mt-2 flex items-start rounded-xl bg-[#ffb44c]/10 border border-[#ffb44c]/20 px-3 py-2 text-[11px] text-[#ffcf8a]">
                            <span className="flex-1">? {task.note}</span>
                            <button onClick={() => patchItem(task.id, { note: null })} className="ml-2 text-[#ffcf8a]/70 hover:text-white">Dismiss</button>
                        </div>
                    )}

                    <Label>Goal</Label>
                    <div className="flex flex-wrap gap-1.5">
                        <Chip active={!task.goalId} onClick={() => patchItem(task.id, { goalId: null })}>None</Chip>
                        {view.goals.map(({ goal }) => (
                            <Chip key={goal.id} active={task.goalId === goal.id} color={goalColor(goal)} onClick={() => patchItem(task.id, { goalId: goal.id })}>
                                <span className="h-1.5 w-1.5 rounded-full mr-1.5" style={{ backgroundColor: goalColor(goal) }} />{goal.title}
                            </Chip>
                        ))}
                        {view.goals.length === 0 && <span className="text-[10px] text-gray-600 self-center ml-1">Add goals in the Goals tab</span>}
                    </div>

                    {!task.done && (
                        <>
                            <Label>When</Label>
                            <div className="flex flex-wrap gap-1.5 items-center">
                                <Chip active={day === today} onClick={() => patchItem(task.id, { day: today })}>Today</Chip>
                                <Chip active={day === tomorrow} onClick={() => patchItem(task.id, { day: tomorrow })}>Tomorrow</Chip>
                                {day > tomorrow && <Chip active>{dayLabel(day, today)}</Chip>}
                                <label className="inline-flex items-center text-[11px] text-gray-400 hover:text-white px-2.5 py-1.5 rounded-full border border-[#2f2f35] hover:border-[#45454d] cursor-pointer transition-colors">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" /></svg>
                                    Pick…
                                    <input type="date" min={today} value={day} onChange={(e) => e.target.value && patchItem(task.id, { day: e.target.value < today ? today : e.target.value })} className="sr-only" />
                                </label>
                            </div>

                            <Label>Bundle</Label>
                            <div className="flex flex-wrap gap-1.5 items-center">
                                <Chip active={!task.bundleId} onClick={() => moveToBundle(task.id, null)}>None</Chip>
                                {bundlesToday.map((b) => (
                                    <Chip key={b.id} active={task.bundleId === b.id} onClick={() => moveToBundle(task.id, b.id)}>{b.title}</Chip>
                                ))}
                                {newBundle === null ? (
                                    <Chip onClick={() => setNewBundle("")}>＋ New</Chip>
                                ) : (
                                    <input
                                        autoFocus
                                        value={newBundle}
                                        maxLength={40}
                                        onChange={(e) => setNewBundle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && newBundle.trim()) { createBundleWith(task.id, newBundle.trim()); setNewBundle(null); }
                                            if (e.key === "Escape") setNewBundle(null);
                                        }}
                                        onBlur={() => { if (newBundle.trim()) createBundleWith(task.id, newBundle.trim()); setNewBundle(null); }}
                                        placeholder="e.g. Shopping trip"
                                        className="bg-transparent text-[11px] text-white px-2.5 py-1.5 rounded-full border border-[#4d63ff]/70 outline-none w-36"
                                    />
                                )}
                            </div>
                        </>
                    )}
                </>
            )}
        </Sheet>
    );
}

// ------------------------------------------------------------------ bundle
export function BundleSheet({ bundle, row, onClose }) {
    const { notify } = useContext(PlannerContext);
    const steps = row ? row.tasks : [];
    return (
        <Sheet
            title="Bundle"
            subtitle={`${steps.length} step${steps.length === 1 ? "" : "s"} done together`}
            onClose={onClose}
            footer={(close) => (
                <div className="flex space-x-2">
                    <button
                        onClick={() => { const undo = deleteItems([...steps.map((t) => t.id), bundle.id]); notify({ text: `Deleted "${bundle.title}"`, action: undo }); close(); }}
                        className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-[#ff7b8e] bg-[#ff6b8b]/10 hover:bg-[#ff6b8b]/15 transition-colors"
                    >
                        Delete all
                    </button>
                    <button
                        onClick={() => { ungroupBundle(bundle.id); notify({ text: "Steps moved to Today" }); close(); }}
                        className="flex-[1.4] py-2.5 rounded-xl text-[12px] font-semibold text-white bg-[#25252b] hover:bg-[#2d2d34] transition-colors"
                    >
                        Ungroup
                    </button>
                </div>
            )}
        >
            <AutoText value={bundle.title} maxLength={40} onCommit={(title) => patchItem(bundle.id, { title })} className="text-[14px] font-semibold text-white" />
            <div className="mt-3 space-y-1">
                {steps.map((t) => (
                    <div key={t.id} className={`flex items-center px-1 py-1.5 ${t.done ? "is-done-row" : ""}`}>
                        <Checkbox done={t.done} onToggle={() => toggleDone(t.id)} size={17} />
                        <span className="fx-strike ml-2.5 text-[12px] text-gray-200">{t.text}</span>
                    </div>
                ))}
            </div>
        </Sheet>
    );
}

// ------------------------------------------------------------------ goal
export function GoalSheet({ goal, view, onClose, onOpenTask }) {
    const { notify } = useContext(PlannerContext);
    const g = view.goals.find((x) => x.goal.id === goal.id);
    if (!g) return null;
    const c = goalColor(g.goal);
    return (
        <Sheet
            title="Goal"
            subtitle={g.done.length ? `${g.done.length} task${g.done.length > 1 ? "s" : ""} done towards it` : "Tag daily tasks to track progress"}
            onClose={onClose}
            footer={(close) => (
                <button
                    onClick={() => { const undo = deleteItems([g.goal.id]); notify({ text: `Deleted goal "${g.goal.title}"`, action: undo }); close(); }}
                    className="w-full py-2.5 rounded-xl text-[12px] font-semibold text-[#ff7b8e] bg-[#ff6b8b]/10 hover:bg-[#ff6b8b]/15 transition-colors"
                >
                    Delete goal <span className="font-normal text-[#ff7b8e]/70">(its tasks stay)</span>
                </button>
            )}
        >
            {(close) => (
                <>
                    <AutoText value={g.goal.title} maxLength={60} onCommit={(title) => patchItem(g.goal.id, { title })} className="text-[15px] font-semibold text-white" />
                    <div className="flex items-center space-x-2 mt-3">
                        {GOAL_COLORS.map((col, i) => (
                            <button
                                key={col}
                                onClick={() => patchItem(g.goal.id, { color: i })}
                                title="Colour"
                                className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                                style={{ backgroundColor: col, boxShadow: c === col ? `0 0 0 2px #18181b, 0 0 0 4px ${col}` : "none" }}
                            />
                        ))}
                    </div>

                    <Label>Open · {g.open.length}</Label>
                    {g.open.length === 0 ? (
                        <p className="text-[11px] text-gray-600">Nothing planned. Tasks tagged with this goal show up here.</p>
                    ) : (
                        <div className="space-y-1">
                            {g.open.map((t) => (
                                <button key={t.id} onClick={() => { close(); setTimeout(() => onOpenTask(t), 200); }} className="w-full text-left flex items-center rounded-xl bg-[#1d1d21] hover:bg-[#232328] px-3 py-2 transition-colors">
                                    <span className="h-3.5 w-3.5 rounded-full border-[1.5px] mr-2.5 flex-shrink-0" style={{ borderColor: c }} />
                                    <span className="flex-1 min-w-0 text-[12px] text-gray-200 truncate">{t.text}</span>
                                    <span className="text-[10px] text-gray-500 ml-2">{t.day > view.today ? dayLabel(t.day, view.today) : t.carry ? `↻${t.carry}d` : "Today"}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <Label>Recently done</Label>
                    {g.done.length === 0 ? (
                        <p className="text-[11px] text-gray-600">No finished tasks kept yet.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {g.done.slice(0, 12).map((t) => (
                                <div key={t.id} className="flex items-center px-1">
                                    <span className="h-3.5 w-3.5 rounded-full mr-2.5 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c }}>
                                        <svg className="w-2 h-2" fill="none" stroke="white" strokeWidth="4" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </span>
                                    <span className="flex-1 min-w-0 text-[12px] text-gray-400 truncate">{t.text}</span>
                                    <span className="text-[10px] text-gray-600 ml-2">{dayLabel(t.doneDay, view.today)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </Sheet>
    );
}


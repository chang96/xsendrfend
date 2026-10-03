import { useContext, useRef, useState } from "react";
import { addEntries, deleteItems, reorder, toggleDone } from "../../utils/tasksStore";
import { useSortable, useSwipe } from "./hooks";
import { CarryBadge, Checkbox, GoalChip, SectionLabel, goalColor } from "./ui";
import { PlannerContext } from "./context";

const GripIcon = () => (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
        {[2, 7, 12].map((y) => [2.5, 7.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" />))}
    </svg>
);

const TrashIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.87 12.14A2 2 0 0116.13 21H7.87a2 2 0 01-1.99-1.86L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
    </svg>
);

// ------------------------------------------------------------------ rows
export function TaskRow({ task, compact, sortRef, sortStyle, handle, dragging, onOpen }) {
    const { notify, newIds } = useContext(PlannerContext);
    const remove = () => {
        const undo = deleteItems([task.id]);
        notify({ text: `Deleted "${task.text.length > 28 ? task.text.slice(0, 28) + "…" : task.text}"`, action: undo });
    };
    const swipe = useSwipe({ onTap: () => onOpen(task), onDelete: remove, disabled: !!dragging });
    const pull = Math.min(1, -swipe.dx / 90);

    return (
        <div ref={sortRef} style={sortStyle} className="relative">
            <div
                className={`absolute inset-0 flex items-center justify-end pr-4 ${compact ? "rounded-xl" : "rounded-2xl"} bg-gradient-to-l from-[#e5484d] to-[#b4232a]`}
                style={{ opacity: pull }}
            >
                <TrashIcon className={`w-4 h-4 text-white transition-transform duration-150 ${swipe.armed ? "scale-125" : "scale-90"}`} />
            </div>
            <div
                {...swipe.props}
                style={swipe.style}
                className={`swipe-row relative flex items-start select-none ${compact ? "rounded-xl px-2.5 py-[7px] bg-[#1a1a1c] hover:bg-[#1f1f23]" : "card rounded-2xl px-3 py-2.5"} ${
                    task.done ? "is-done-row" : ""} ${swipe.leaving ? "is-leaving" : ""} ${newIds.has(task.id) ? "fx-new" : ""} group transition-colors`}
            >
                <div className="pt-[1px]">
                    <Checkbox done={task.done} onToggle={() => toggleDone(task.id)} color={task.goal ? goalColor(task.goal) : undefined} size={compact ? 17 : 20} />
                </div>
                <div className="flex-1 min-w-0 ml-3 cursor-pointer">
                    <span className={`fx-strike ${compact ? "text-[12px]" : "text-[13px]"} leading-snug text-gray-100 break-words`}>{task.text}</span>
                    {(task.goal || task.carry > 0 || (task.note && !task.done)) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {task.goal && <GoalChip goal={task.goal} small />}
                            <CarryBadge days={task.carry} />
                            {task.note && !task.done && <span className="text-[10px] text-[#ffb44c]/90">? {task.note}</span>}
                        </div>
                    )}
                </div>
                {handle && (
                    <div
                        {...handle}
                        title="Drag to reorder"
                        className={`drag-handle ml-2 -mr-1 px-1 py-1 text-gray-600 hover:text-gray-300 opacity-30 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ${dragging ? "is-dragging opacity-100" : ""}`}
                    >
                        <GripIcon />
                    </div>
                )}
            </div>
        </div>
    );
}

function BundleCard({ row, sortRef, sortStyle, handle, dragging, onOpenTask, onOpenBundle }) {
    const [open, setOpen] = useState(true);
    const ids = row.tasks.map((t) => t.id);
    const inner = useSortable(ids, reorder);
    const total = row.tasks.length;
    const pct = total ? (row.done / total) * 100 : 0;
    const complete = total > 0 && row.done === total;

    return (
        <div ref={sortRef} style={sortStyle} className="relative">
            <div className={`card rounded-2xl overflow-hidden group ${complete ? "opacity-70" : ""} transition-opacity`}>
                <div className="flex items-center px-3 pt-2.5 pb-2">
                    <button onClick={() => setOpen((v) => !v)} className="h-5 w-5 -ml-0.5 mr-1.5 flex items-center justify-center rounded-md text-gray-500 hover:text-white hover:bg-white/5" title={open ? "Collapse" : "Expand"}>
                        <svg className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <button onClick={() => onOpenBundle(row.bundle)} className="flex-1 min-w-0 text-left">
                        <span className={`text-[12px] font-semibold tracking-tight ${complete ? "text-gray-400 line-through" : "text-white"}`}>{row.bundle.title}</span>
                    </button>
                    <span className="text-[10px] tabular-nums text-gray-500 mr-1">{row.done}/{total}</span>
                    {handle && (
                        <div {...handle} title="Drag to reorder" className={`drag-handle ml-1 px-1 py-1 text-gray-600 hover:text-gray-300 opacity-30 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ${dragging ? "is-dragging opacity-100" : ""}`}>
                            <GripIcon />
                        </div>
                    )}
                </div>
                <div className="mx-3 h-[3px] rounded-full bg-[#26262b] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: complete ? "#3ddc97" : "linear-gradient(90deg,#4d63ff,#8e7bff)" }} />
                </div>
                <div className={`fx-collapse ${open ? "" : "is-closed"}`}>
                    <div>
                        <div className="relative px-2 pt-2 pb-2 space-y-1">
                            <div className="absolute left-[1.15rem] top-3 bottom-4 w-px bg-gradient-to-b from-[#34343b] to-transparent pointer-events-none" />
                            {row.tasks.map((t) => (
                                <TaskRow key={t.id} task={t} compact onOpen={onOpenTask}
                                    sortRef={inner.ref(t.id)} sortStyle={inner.style(t.id)} handle={inner.handle(t.id)} dragging={inner.dragging} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------ sections
function Unsorted({ entries, organizing }) {
    return (
        <div className="fx-rise mb-5">
            <SectionLabel>Not organized yet · {entries.length}</SectionLabel>
            <div className="space-y-1.5">
                {entries.map((e) => (
                    <div key={e.id} className={`fx-rise group flex items-start rounded-xl border border-dashed border-[#3a3a42] px-3 py-2 ${organizing ? "fx-shimmer" : ""}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#8e9bff]/60 mt-[7px] mr-2.5 flex-shrink-0" />
                        <span className="flex-1 text-[12px] text-gray-300 leading-snug break-words">{e.text}</span>
                        {!organizing && (
                            <button onClick={() => deleteItems([e.id])} title="Remove" className="ml-2 text-gray-600 hover:text-[#ff7b8e] opacity-30 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function Upcoming({ days, count, onOpenTask }) {
    const [open, setOpen] = useState(false);
    if (!count) return null;
    return (
        <div className="mt-6">
            <SectionLabel onClick={() => setOpen((v) => !v)} open={open}>Upcoming · {count}</SectionLabel>
            <div className={`fx-collapse ${open ? "" : "is-closed"}`}>
                <div>
                    <div className="space-y-3 pb-1">
                        {days.map((d) => (
                            <div key={d.day}>
                                <p className="text-[10px] font-semibold text-gray-400 px-1 mb-1.5">{d.label}</p>
                                <div className="space-y-1">
                                    {d.tasks.map((t) => (
                                        <button key={t.id} onClick={() => onOpenTask(t)} className="w-full text-left flex items-center rounded-xl bg-[#18181b] hover:bg-[#1e1e22] border border-[#26262b] px-3 py-2 transition-colors">
                                            <span className="h-3.5 w-3.5 rounded-full border border-dashed border-[#55555c] mr-2.5 flex-shrink-0" />
                                            <span className="flex-1 min-w-0 text-[12px] text-gray-300 truncate">{t.text}</span>
                                            {t.bundle && <span className="text-[9px] text-gray-500 ml-2 flex-shrink-0">{t.bundle.title}</span>}
                                            {t.goal && <span className="ml-2 flex-shrink-0"><GoalChip goal={t.goal} small /></span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmptyToday({ hasEverything }) {
    return (
        <div className="fx-rise flex flex-col items-center text-center px-8 pt-10 pb-6">
            <div className="relative mb-4">
                <div className="absolute inset-0 blur-2xl bg-[#4d63ff]/20 rounded-full" />
                <svg className="relative w-14 h-14" viewBox="0 0 64 64" fill="none">
                    <rect x="14" y="8" width="36" height="48" rx="6" fill="#1d1d21" stroke="#34343b" strokeWidth="1.5" />
                    <path d="M22 22h20M22 30h14M22 38h17" stroke="#4d63ff" strokeOpacity="0.8" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="48" cy="46" r="9" fill="#001AFF" />
                    <path d="M44 46.5l2.6 2.6L52 43.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            <h3 className="text-white text-sm font-semibold tracking-tight">{hasEverything ? "A fresh sheet" : "Today is a blank page"}</h3>
            <p className="text-gray-500 text-[11px] mt-1.5 leading-relaxed max-w-[250px]">
                Type whatever's on your mind below, one thing per line: work, home, errands, anything. Then tap <span className="text-[#8e9bff]">Organize</span> and it becomes today's list.
            </p>
        </div>
    );
}

// ------------------------------------------------------------------ composer
function Composer({ entriesCount, organizing, onOrganize }) {
    const [text, setText] = useState("");
    const ref = useRef(null);
    const add = () => {
        const lines = text.split("\n");
        if (!lines.some((l) => l.trim())) return;
        addEntries(lines);
        setText("");
        if (ref.current) ref.current.focus();
    };
    return (
        <div className="relative flex-shrink-0 px-3 pb-3 pt-2 bg-gradient-to-t from-[#121212] via-[#121212] to-[#121212]/0">
            {entriesCount > 0 && (
                <div className="absolute left-0 right-0 -top-11 flex justify-center pointer-events-none">
                    <button
                        onClick={onOrganize}
                        disabled={organizing}
                        className="organize-pill fx-float-in pointer-events-auto flex items-center space-x-1.5 text-white text-[12px] font-semibold pl-3 pr-4 py-2 rounded-full active:scale-95 transition-transform disabled:opacity-90"
                    >
                        {organizing ? (
                            <svg className="w-3.5 h-3.5 fx-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" /><path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                        ) : (
                            <svg className="w-3.5 h-3.5 fx-twinkle" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" /></svg>
                        )}
                        <span>{organizing ? "Organizing…" : `Organize ${entriesCount}`}</span>
                    </button>
                </div>
            )}
            <div className="flex items-end bg-[#1b1b1e] border border-[#2c2c31] rounded-[22px] pl-4 pr-1.5 py-1.5 focus-within:border-[#4d63ff]/70 focus-within:shadow-[0_0_0_3px_rgba(77,99,255,0.12)] transition-all duration-200">
                <textarea
                    ref={ref}
                    value={text}
                    rows={1}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); add(); } }}
                    placeholder="What's on your mind?"
                    className="flex-1 bg-transparent border-none outline-none resize-none text-white text-[13px] placeholder-[#5a5a62] py-1.5 max-h-32 leading-snug"
                />
                <button
                    onClick={add}
                    disabled={!text.trim()}
                    title="Add"
                    className={`h-8 w-8 ml-1.5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        text.trim() ? "bg-[#001AFF] text-white scale-100 shadow-[0_4px_14px_-4px_rgba(0,26,255,0.8)]" : "bg-[#25252a] text-gray-600 scale-95"
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" /></svg>
                </button>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------ tab
export default function TodayTab({ view, organizing, onOrganize, onOpenTask, onOpenBundle }) {
    const ids = view.rows.map((r) => (r.type === "bundle" ? r.bundle.id : r.task.id));
    const sort = useSortable(ids, reorder);
    const empty = view.rows.length === 0 && view.entries.length === 0;
    const allDone = view.todayTotal > 0 && view.todayDone === view.todayTotal;

    return (
        <>
            <div className="soft-scroll flex-1 overflow-y-auto min-h-0 px-4 pt-1 pb-16">
                {view.entries.length > 0 && <Unsorted entries={view.entries} organizing={organizing} />}
                {empty ? (
                    <EmptyToday hasEverything={view.goals.length > 0} />
                ) : (
                    view.rows.length > 0 && (
                        <>
                            {view.entries.length > 0 && <SectionLabel>Today</SectionLabel>}
                            <div className="space-y-2">
                                {view.rows.map((r) => {
                                    const id = r.type === "bundle" ? r.bundle.id : r.task.id;
                                    const common = { key: id, sortRef: sort.ref(id), sortStyle: sort.style(id), handle: sort.handle(id), dragging: sort.dragging };
                                    return r.type === "bundle"
                                        ? <BundleCard {...common} row={r} onOpenTask={onOpenTask} onOpenBundle={onOpenBundle} />
                                        : <TaskRow {...common} task={r.task} onOpen={onOpenTask} />;
                                })}
                            </div>
                            {allDone && (
                                <div className="fx-rise text-center mt-5">
                                    <p className="text-[12px] font-semibold text-[#3ddc97]">All done for today ✨</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Finished tasks clear tomorrow. Enjoy the rest of your day.</p>
                                </div>
                            )}
                        </>
                    )
                )}
                <Upcoming days={view.upcomingDays} count={view.upcomingCount} onOpenTask={onOpenTask} />
            </div>
            <Composer entriesCount={view.entries.length} organizing={organizing} onOrganize={onOrganize} />
        </>
    );
}

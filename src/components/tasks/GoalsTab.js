import { useState } from "react";
import { addGoal, dayLabel } from "../../utils/tasksStore";
import { goalColor } from "./ui";

function Activity({ days, color }) {
    return (
        <div className="flex items-end space-x-[3px]" title="Last 14 days">
            {days.map((d) => (
                <span
                    key={d.day}
                    className="w-[7px] rounded-[2px] transition-all duration-300"
                    style={{
                        height: d.count ? Math.min(16, 6 + d.count * 4) : 4,
                        backgroundColor: d.count ? color : "#2a2a30",
                        opacity: d.count ? Math.min(1, 0.45 + d.count * 0.2) : 1,
                    }}
                />
            ))}
        </div>
    );
}

function GoalCard({ g, today, onOpen, index }) {
    const c = goalColor(g.goal);
    const last = g.lastDoneDay ? dayLabel(g.lastDoneDay, today).toLowerCase() : null;
    return (
        <button
            onClick={() => onOpen(g.goal)}
            className="fx-rise card w-full text-left rounded-2xl pl-4 pr-3.5 py-3 relative overflow-hidden transition-transform active:scale-[0.99]"
            style={{ animationDelay: `${index * 40}ms` }}
        >
            <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: c }} />
            <span className="absolute -left-10 -top-10 h-24 w-24 rounded-full blur-2xl opacity-[0.12] pointer-events-none" style={{ backgroundColor: c }} />
            <div className="flex items-start justify-between">
                <div className="min-w-0 pr-3">
                    <p className="text-[13px] font-semibold text-white tracking-tight truncate">{g.goal.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                        {g.done.length > 0 ? <><span className="text-gray-300 font-semibold">{g.done.length}</span> done · last {last}</> : "No progress yet"}
                        {g.open.length > 0 && <> · <span style={{ color: c }}>{g.open.length} open</span></>}
                    </p>
                </div>
                <Activity days={g.activity} color={c} />
            </div>
        </button>
    );
}

export default function GoalsTab({ view, onOpenGoal }) {
    const [title, setTitle] = useState("");
    const add = () => {
        if (!title.trim()) return;
        addGoal(title);
        setTitle("");
    };
    return (
        <>
            <div className="soft-scroll flex-1 overflow-y-auto min-h-0 px-4 pt-1 pb-6">
                {view.goals.length === 0 ? (
                    <div className="fx-rise flex flex-col items-center text-center px-8 pt-10">
                        <div className="relative mb-4">
                            <div className="absolute inset-0 blur-2xl bg-[#3ddc97]/15 rounded-full" />
                            <svg className="relative w-14 h-14" viewBox="0 0 64 64" fill="none">
                                <circle cx="32" cy="32" r="22" stroke="#34343b" strokeWidth="1.5" fill="#1d1d21" />
                                <circle cx="32" cy="32" r="14" stroke="#3ddc97" strokeOpacity="0.5" strokeWidth="2" />
                                <circle cx="32" cy="32" r="6" fill="#3ddc97" />
                                <path d="M32 32L50 14M44 14h6v6" stroke="#e5e5e5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h3 className="text-white text-sm font-semibold tracking-tight">Your long-term sheet</h3>
                        <p className="text-gray-500 text-[11px] mt-1.5 leading-relaxed max-w-[250px]">
                            Add the big things, like learning SQL or getting fit. When a daily task moves one forward, it's tagged and counted here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {view.goals.map((g, i) => <GoalCard key={g.goal.id} g={g} today={view.today} onOpen={onOpenGoal} index={i} />)}
                    </div>
                )}
            </div>
            <div className="flex-shrink-0 px-3 pb-3 pt-2">
                <div className="flex items-center bg-[#1b1b1e] border border-[#2c2c31] rounded-[22px] pl-4 pr-1.5 py-1.5 focus-within:border-[#3ddc97]/60 focus-within:shadow-[0_0_0_3px_rgba(61,220,151,0.10)] transition-all duration-200">
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") add(); }}
                        maxLength={60}
                        placeholder="New goal, e.g. Learn SQL"
                        className="flex-1 bg-transparent border-none outline-none text-white text-[13px] placeholder-[#5a5a62] py-1.5"
                    />
                    <button
                        onClick={add}
                        disabled={!title.trim()}
                        title="Add goal"
                        className={`h-8 px-3 ml-1.5 rounded-full text-[11px] font-semibold flex-shrink-0 transition-all duration-200 ${
                            title.trim() ? "bg-[#3ddc97] text-[#0b2a1c]" : "bg-[#25252a] text-gray-600"
                        }`}
                    >
                        Add
                    </button>
                </div>
            </div>
        </>
    );
}

import { useEffect, useRef, useState } from "react";
import { GOAL_COLORS } from "../../utils/tasksStore";

export const goalColor = (goal) => GOAL_COLORS[(goal && goal.color) || 0] || GOAL_COLORS[0];

export function haptic(ms = 8) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
}

// Animated bottom sheet (centered card on wider screens). Closing plays the exit animation first.
export function Sheet({ title, subtitle, onClose, children, footer }) {
    const [closing, setClosing] = useState(false);
    const close = () => {
        if (closing) return;
        setClosing(true);
        setTimeout(onClose, 190);
    };
    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") close(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className={`planner fixed inset-0 z-50 ${closing ? "planner-closing" : ""}`}>
            <div className="planner-backdrop absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={close} />
            <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center pointer-events-none">
                <div
                    role="dialog"
                    aria-label={title}
                    className="planner-sheet pointer-events-auto w-full sm:w-[22rem] max-h-[88vh] flex flex-col bg-[#18181b] border-t sm:border border-[#2c2c31] rounded-t-3xl sm:rounded-2xl shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.8)] text-left"
                >
                    <div className="sm:hidden flex justify-center pt-2.5"><div className="h-1 w-9 rounded-full bg-[#3a3a40]" /></div>
                    <div className="flex items-start justify-between px-5 pt-3 sm:pt-5 pb-3">
                        <div className="min-w-0">
                            <h3 className="text-white text-[15px] font-semibold tracking-tight truncate">{title}</h3>
                            {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
                        </div>
                        <button onClick={close} title="Close" className="ml-3 -mr-1 h-7 w-7 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="soft-scroll overflow-y-auto px-5 pb-5 flex-1">{typeof children === "function" ? children(close) : children}</div>
                    {footer && <div className="px-5 pb-5 pt-1">{typeof footer === "function" ? footer(close) : footer}</div>}
                </div>
            </div>
        </div>
    );
}

export function Checkbox({ done, onToggle, color, size = 20 }) {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); haptic(done ? 4 : 10); onToggle(); }}
            onPointerDown={(e) => e.stopPropagation()}
            title={done ? "Mark not done" : "Mark done"}
            aria-pressed={done}
            className={`fx-check flex-shrink-0 rounded-full border-[1.5px] flex items-center justify-center ${done ? "is-done" : "hover:border-gray-300"}`}
            style={{
                width: size, height: size,
                borderColor: done ? color || "#4d63ff" : "#55555c",
                backgroundColor: done ? color || "#3048ff" : "transparent",
            }}
        >
            <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
        </button>
    );
}

export function GoalChip({ goal, small }) {
    if (!goal) return null;
    const c = goalColor(goal);
    return (
        <span
            className={`inline-flex items-center max-w-[9rem] rounded-full font-medium ${small ? "text-[9px] px-1.5 py-[1px]" : "text-[10px] px-2 py-0.5"}`}
            style={{ color: c, backgroundColor: c + "1a", boxShadow: `inset 0 0 0 1px ${c}33` }}
        >
            <span className="h-1.5 w-1.5 rounded-full mr-1 flex-shrink-0" style={{ backgroundColor: c }} />
            <span className="truncate">{goal.title}</span>
        </span>
    );
}

export function CarryBadge({ days }) {
    if (!days) return null;
    const tone = days >= 4 ? "text-[#ff7b8e] bg-[#ff6b8b]/10" : days >= 2 ? "text-[#ffb44c] bg-[#ffb44c]/10" : "text-gray-400 bg-white/5";
    return (
        <span title={`Carried over ${days} day${days > 1 ? "s" : ""}`} className={`inline-flex items-center text-[9px] font-semibold px-1.5 py-[1px] rounded-full ${tone}`}>
            <svg className="w-2.5 h-2.5 mr-0.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M5.5 15a7 7 0 0012.2 2.3M18.5 9A7 7 0 006.3 6.7" /></svg>
            {days}d
        </span>
    );
}

export function Ring({ done, total, size = 38 }) {
    const r = (size - 5) / 2;
    const c = 2 * Math.PI * r;
    const pct = total ? done / total : 0;
    const complete = total > 0 && done === total;
    return (
        <div className="relative flex-shrink-0" style={{ width: size, height: size }} title={`${done} of ${total} done today`}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} stroke="#26262b" strokeWidth="3.5" fill="none" />
                <circle
                    className="fx-ring" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="3.5" strokeLinecap="round"
                    stroke={complete ? "#3ddc97" : "url(#planner-ring-grad)"}
                    strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
                />
                <defs>
                    <linearGradient id="planner-ring-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#4d63ff" /><stop offset="100%" stopColor="#8e7bff" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-200 tabular-nums">
                {complete ? <span className="text-[#3ddc97] text-sm">✓</span> : `${done}/${total}`}
            </div>
        </div>
    );
}

export function SectionLabel({ children, right, onClick, open }) {
    return (
        <div className="flex items-center justify-between px-1 mb-2">
            <button onClick={onClick} disabled={!onClick} className="flex items-center text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 hover:text-gray-300 disabled:hover:text-gray-500 transition-colors">
                {onClick && (
                    <svg className={`w-2.5 h-2.5 mr-1 transition-transform duration-200 ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                )}
                {children}
            </button>
            {right}
        </div>
    );
}

export function Chip({ active, onClick, children, color }) {
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center text-[11px] font-medium px-2.5 py-1.5 rounded-full border transition-all duration-150 active:scale-95 ${
                active ? "text-white border-transparent" : "text-gray-400 border-[#2f2f35] hover:text-white hover:border-[#45454d]"
            }`}
            style={active ? { backgroundColor: color ? color + "33" : "#001AFF", boxShadow: color ? `inset 0 0 0 1px ${color}88` : "none", color: color || "white" } : undefined}
        >
            {children}
        </button>
    );
}

// Toast with optional action (Undo) and a countdown bar
export function Toast({ toast, onDone }) {
    const timer = useRef(null);
    useEffect(() => {
        if (!toast) return undefined;
        timer.current = setTimeout(onDone, toast.ms || 4500);
        return () => clearTimeout(timer.current);
    }, [toast]); // eslint-disable-line react-hooks/exhaustive-deps
    if (!toast) return null;
    return (
        <div key={toast.key} className="fx-toast absolute left-1/2 bottom-[5.5rem] z-40 w-[calc(100%-2rem)] max-w-xs">
            <div className="relative overflow-hidden flex items-center justify-between bg-[#26262b] border border-[#3a3a42] rounded-2xl pl-3.5 pr-1.5 py-1.5 shadow-2xl">
                <span className="text-[11px] text-gray-100 py-1 pr-2">{toast.text}</span>
                {toast.action && (
                    <button
                        onClick={() => { toast.action(); onDone(); }}
                        className="text-[11px] font-semibold text-[#8e9bff] hover:text-white px-2.5 py-1 rounded-xl hover:bg-white/5 flex-shrink-0"
                    >
                        {toast.actionLabel || "Undo"}
                    </button>
                )}
                <div className="fx-countdown absolute left-0 bottom-0 h-[2px] w-full bg-[#4d63ff]/60" style={{ animationDuration: `${toast.ms || 4500}ms` }} />
            </div>
        </div>
    );
}

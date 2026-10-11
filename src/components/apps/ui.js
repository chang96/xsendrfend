import { useEffect, useRef, useState } from "react";
import { onToast } from "./jobs";

export const WHO = [
    { id: "me", label: "Just me", hint: "On my devices" },
    { id: "room", label: "Me + room", hint: "Live with whoever's here" },
    { id: "class", label: "A class", hint: "I run it, they take part" },
];
export const whoLabel = (w) => (WHO.find((x) => x.id === w) || WHO[1]).label;

export function AppIcon({ app, size = 54, radius, className = "" }) {
    const glyph = (app && app.glyph) || "✦";
    return (
        <span
            className={`flex-shrink-0 flex items-center justify-center font-extrabold select-none ${className}`}
            style={{
                width: size, height: size, borderRadius: radius || Math.round(size * 0.28),
                background: (app && app.bg) || "#1d1d24", color: (app && app.fg) || "#8e9bff",
                fontSize: Math.round(size * (glyph.length > 1 ? 0.34 : 0.42)), letterSpacing: glyph.length > 1 ? "-0.04em" : 0,
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06), 0 8px 18px -12px rgba(0,0,0,0.9)",
            }}
            aria-hidden="true"
        >
            {glyph}
        </span>
    );
}

export function Sparkle({ className = "w-4 h-4", color = "#8e9bff" }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill={color} aria-hidden="true">
            <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2z" />
        </svg>
    );
}

export function Segmented({ options, value, onChange, small }) {
    const i = Math.max(0, options.findIndex((o) => o.id === value));
    return (
        <div className="relative flex bg-[#111113] p-1 rounded-xl border border-[#26262b]">
            <div
                className="fx-tab-indicator absolute top-1 bottom-1 left-1 rounded-lg bg-[#2a2a31] shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_4px_12px_-4px_rgba(0,0,0,0.6)]"
                style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${i * 100}%)` }}
            />
            {options.map((o) => (
                <button
                    key={o.id}
                    type="button"
                    onClick={() => onChange(o.id)}
                    aria-pressed={o.id === value}
                    className={`relative z-10 flex-1 ${small ? "py-1.5" : "py-2"} text-[12px] font-semibold tracking-tight transition-colors duration-200 ${o.id === value ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

export function Toggle({ on, onChange, label, hint }) {
    return (
        <button type="button" onClick={() => onChange(!on)} aria-pressed={on} className="w-full flex items-center justify-between text-left py-1 group">
            <span className="min-w-0 pr-3">
                <span className="block text-[12px] font-semibold text-gray-200">{label}</span>
                {hint && <span className="block text-[10.5px] text-gray-500 mt-0.5">{hint}</span>}
            </span>
            <span className={`relative flex-shrink-0 w-10 h-6 rounded-full transition-colors duration-200 ${on ? "bg-[#3048ff]" : "bg-[#2e2e35]"}`}>
                <span className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-[left] duration-200" style={{ left: on ? 19 : 3 }} />
            </span>
        </button>
    );
}

export function Spinner({ className = "w-4 h-4" }) {
    return (
        <svg className={`fx-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}

// Real progress comes from the server (what the model is actually writing); this just adds the clock
export function useStage(job) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
    const secs = Math.max(0, Math.round((now - ((job && job.startedAt) || now)) / 1000));
    const text = (job && job.progress && job.progress.text) || "Reading your idea";
    const time = secs >= 60 ? `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, "0")}s` : `${secs}s`;
    return { secs, time, stage: text, phase: job && job.progress && job.progress.phase };
}

// One toast host for the whole room (fixed, above apps and sheets)
export function AppsToastHost() {
    const [t, setT] = useState(null);
    const timer = useRef(null);
    useEffect(() => onToast((x) => setT(x)), []);
    useEffect(() => {
        if (!t) return undefined;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setT(null), t.ms || 4500);
        return () => clearTimeout(timer.current);
    }, [t]);
    if (!t) return null;
    return (
        <div className="planner pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex justify-center px-4">
            <div key={t.key} className="fx-float-in pointer-events-auto relative overflow-hidden flex items-center max-w-sm bg-[#26262b] border border-[#3a3a42] rounded-2xl pl-3.5 pr-1.5 py-1.5 shadow-2xl">
                <span className={`text-[11.5px] py-1 pr-2 ${t.tone === "error" ? "text-[#ffb3be]" : "text-gray-100"}`}>{t.text}</span>
                {t.action && (
                    <button
                        onClick={() => { t.action(); setT(null); }}
                        className="text-[11.5px] font-semibold text-[#8e9bff] hover:text-white px-2.5 py-1 rounded-xl hover:bg-white/5 flex-shrink-0"
                    >
                        {t.actionLabel || "Open"}
                    </button>
                )}
                <div className="fx-countdown absolute left-0 bottom-0 h-[2px] w-full bg-[#4d63ff]/60" style={{ animationDuration: `${t.ms || 4500}ms` }} />
            </div>
        </div>
    );
}

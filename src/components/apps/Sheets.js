import { useContext, useState } from "react";
import { WebSocketContext } from "../../utils/websocket";
import { deleteApp, forgetShared, saveApp } from "../../utils/appsStore";
import { Sheet, haptic } from "../tasks/ui";
import { buildChange, errorText, jobFor, planApp, setAppSharing, shareToRoom, toast } from "./jobs";
import { AppIcon, Segmented, Sparkle, Spinner, Toggle, whoLabel } from "./ui";

const ago = (t) => {
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.round(s / 60)}m ago`;
    if (s < 86400) return `${Math.round(s / 3600)}h ago`;
    return `${Math.round(s / 86400)}d ago`;
};

// "Ask me first": the builder's questions, answered with a tap
export function PlanSheet({ plan, title, auto, onBuild, onClose }) {
    const qs = plan.questions || [];
    const big = plan.scope === "big";
    const heading = title || (auto ? (big ? "This one's a big app" : "Before I build it") : "A few quick choices");
    const sub = auto
        ? (big ? "Here's what you'll get. It can take a few minutes to build." : "Here's what you'll get, and what it can't do.")
        : qs.length ? `${qs.length} question${qs.length > 1 ? "s" : ""} · suggestions picked for you` : "Nothing to ask, this is the plan";
    const [picks, setPicks] = useState(() => qs.map((q) => (typeof q.recommended === "number" ? q.recommended : 0)));
    const build = (close) => {
        const answers = qs.map((q, i) => ({ question: q.question, answer: q.options[picks[i]] }));
        onBuild(answers);
        close();
    };
    return (
        <Sheet
            title={heading}
            subtitle={sub}
            onClose={onClose}
            footer={(close) => (
                <>
                <button onClick={() => build(close)} className="w-full h-11 rounded-2xl bg-[#001AFF] hover:bg-[#1a33ff] text-white text-[13px] font-semibold flex items-center justify-center space-x-2 shadow-[0_10px_24px_-12px_rgba(0,26,255,0.9)] active:scale-[0.98] transition-all">
                    <Sparkle className="w-3.5 h-3.5" color="#fff" /><span>Build it</span>
                </button>
                {auto && <button onClick={close} className="w-full mt-2 h-9 rounded-2xl text-[12px] font-semibold text-gray-400 hover:text-white transition-colors">Change my idea</button>}
                </>
            )}
        >
            <p className="text-[12.5px] leading-relaxed text-gray-300 bg-[#111113] border border-[#26262b] rounded-2xl px-3.5 py-3">{plan.summary}</p>
            {(plan.will_get || []).length > 0 && (
                <div className="mt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">What you'll get</p>
                    <ul className="space-y-1.5">
                        {plan.will_get.map((t, i) => (
                            <li key={i} className="flex items-start gap-2 text-[12px] text-gray-200 leading-snug">
                                <svg className="w-3.5 h-3.5 mt-[1px] flex-shrink-0 text-[#3ddc97]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                <span>{t}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {(plan.limits || []).length > 0 && (
                <div className="mt-4 rounded-2xl border border-[#ffb44c]/25 bg-[#ffb44c]/[0.06] px-3.5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ffb44c]/90 mb-1.5">Good to know</p>
                    <ul className="space-y-1">
                        {plan.limits.map((t, i) => <li key={i} className="text-[11.5px] text-[#f1d7ad] leading-snug">· {t}</li>)}
                    </ul>
                </div>
            )}
            <div className="mt-4 space-y-4">
                {qs.map((q, i) => (
                    <div key={i} className="fx-rise" style={{ animationDelay: `${i * 40}ms` }}>
                        <p className="text-[12.5px] font-semibold text-white mb-2">{q.question}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {q.options.map((o, j) => {
                                const on = picks[i] === j;
                                return (
                                    <button
                                        key={j}
                                        onClick={() => { haptic(6); setPicks((p) => p.map((x, k) => (k === i ? j : x))); }}
                                        aria-pressed={on}
                                        className={`text-[11.5px] px-3 py-1.5 rounded-full border transition-all duration-150 active:scale-95 ${on ? "bg-[#001AFF] border-transparent text-white" : "border-[#2f2f35] text-gray-400 hover:text-white hover:border-[#45454d]"}`}
                                    >
                                        {o}
                                        {j === q.recommended && !on && <span className="ml-1 text-[9px] text-[#8e9bff]">✦</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </Sheet>
    );
}

const SHARE = [
    { id: "off", label: "Off" },
    { id: "live", label: "Live" },
    { id: "keep", label: "Keep" },
];
const SHARE_HINT = {
    off: "Only your devices have it.",
    live: "People in the room can open it while they're here.",
    keep: "People in the room can open it and keep a copy on their device.",
};

// ✦ menu for the owner: improve, fix, versions, share, rename, delete
export function AppMenuSheet({ app, lastError, onClearError, onClose, onDeleted }) {
    const ws = useContext(WebSocketContext);
    const [ask, setAsk] = useState("");
    const [askFirst, setAskFirst] = useState(false);
    const [planning, setPlanning] = useState(false);
    const [plan, setPlan] = useState(null);
    const [name, setName] = useState(app.name);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const busy = !!jobFor(app.id);
    const versions = [...(app.versions || [])].sort((a, b) => b.v - a.v);
    const ideas = app.who === "me" ? ["Make it prettier", "Add a dark mode", "Remember more history"] : ["Add a scoreboard", "Add sound and confetti", "Let the owner reset rounds"];

    const apply = async (close, answers) => {
        const text = ask.trim();
        if (!text || busy) return;
        if (askFirst && !answers) {
            setPlanning(true);
            const res = await planApp(ws.request, { prompt: text, who: app.who, base: app });
            setPlanning(false);
            if (!res.ok) { toast({ text: errorText(res.error, res.detail), tone: "error", ms: 6000 }); return; }
            setPlan(res.plan);
            return;
        }
        buildChange(ws, app.id, { prompt: text, answers });
        setAsk("");
        close();
    };
    const fix = (close) => {
        if (!lastError || busy) return;
        buildChange(ws, app.id, { prompt: `Fix this error that happened while using the app:\n${lastError.message}\n${lastError.stack || ""}`.slice(0, 2500), fix: true });
        onClearError && onClearError();
        close();
    };
    const restore = async (v) => {
        haptic(8);
        const saved = await saveApp({ ...app, current: v });
        shareToRoom(ws.socket, saved);
        toast({ text: `Now using v${v}` });
    };
    const setShare = (mode) => setAppSharing(ws.socket, app, mode);
    const rename = () => {
        const n = name.trim().slice(0, 24);
        if (!n || n === app.name) return setName(app.name);
        saveApp({ ...app, name: n }).then((s) => shareToRoom(ws.socket, s));
    };
    const remove = async (close) => {
        if (!confirmDelete) { setConfirmDelete(true); return; }
        if (app.shared && app.shared !== "off") ws.socket && ws.socket.emit("app:unshare", { appId: app.id });
        await deleteApp(app.id);
        close();
        onDeleted && onDeleted();
    };

    if (plan) {
        return <PlanSheet plan={plan} title="Before I change it" onClose={() => setPlan(null)} onBuild={(answers) => { setPlan(null); apply(onClose, answers); }} />;
    }

    return (
        <Sheet title={app.name} subtitle={`Yours · v${app.current} · ${whoLabel(app.who)}`} onClose={onClose}>
            {(close) => (
                <div className="space-y-5">
                    {busy && (
                        <div className="flex items-center space-x-2.5 text-[12px] text-[#b9c1ff] bg-[#4d63ff]/10 border border-[#4d63ff]/25 rounded-2xl px-3.5 py-2.5">
                            <Spinner className="w-3.5 h-3.5" /><span>Working on: {jobFor(app.id).label.slice(0, 60)}</span>
                        </div>
                    )}

                    {lastError && !busy && (
                        <button onClick={() => fix(close)} className="w-full text-left flex items-start space-x-2.5 rounded-2xl px-3.5 py-3 border border-[#ff6b8b]/40 bg-[#ff6b8b]/[0.07] hover:bg-[#ff6b8b]/[0.12] transition-colors">
                            <span className="text-[#ff8fa3] text-sm leading-none mt-0.5">!</span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-[12px] font-semibold text-[#ffb3be]">Fix it</span>
                                <span className="block text-[11px] text-[#ff8fa3]/80 truncate">{lastError.message}</span>
                            </span>
                        </button>
                    )}

                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">Share with the room</p>
                        <Segmented options={SHARE} value={app.shared || "off"} onChange={setShare} small />
                        <p className="text-[11px] text-gray-500 mt-1.5 px-0.5">{SHARE_HINT[app.shared || "off"]} Owner-only parts stay on your devices.</p>
                    </div>

                    <div>
                        <label htmlFor="improve" className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">Improve it</label>
                        <div className="flex space-x-2">
                            <input
                                id="improve" value={ask} onChange={(e) => setAsk(e.target.value)} disabled={busy}
                                onKeyDown={(e) => { if (e.key === "Enter") apply(close); }}
                                placeholder="What should change?"
                                className="flex-1 min-w-0 h-11 rounded-2xl border border-[#2c2c31] bg-[#111113] text-white text-[13px] px-3.5 outline-none focus:border-[#4d63ff] transition-colors placeholder-gray-600 disabled:opacity-50"
                            />
                            <button onClick={() => apply(close)} disabled={!ask.trim() || busy || planning} className="h-11 px-4 rounded-2xl bg-[#001AFF] text-white text-[13px] font-semibold disabled:opacity-40 active:scale-95 transition-all flex items-center">
                                {planning ? <Spinner className="w-4 h-4" /> : "Apply"}
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {ideas.map((x) => (
                                <button key={x} onClick={() => setAsk(x)} className="text-[11px] px-2.5 py-1 rounded-full border border-[#2f2f35] text-gray-400 hover:text-white hover:border-[#45454d] transition-colors">{x}</button>
                            ))}
                        </div>
                        <div className="mt-2.5"><Toggle on={askFirst} onChange={setAskFirst} label="Ask me first" hint="Answer a few questions before it changes" /></div>
                    </div>

                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">Versions</p>
                        <div className="space-y-1.5">
                            {versions.map((v) => {
                                const now = v.v === app.current;
                                return (
                                    <div key={v.v} className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl border ${now ? "bg-[#1d1d24] border-[#33334a]" : "bg-[#151517] border-[#232327]"}`}>
                                        <span className={`text-[11.5px] font-bold w-6 ${now ? "text-[#8e9bff]" : "text-gray-600"}`}>v{v.v}</span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-[12px] text-gray-200 truncate">{v.note}</span>
                                            <span className="block text-[10px] text-gray-600">{ago(v.at)}</span>
                                        </span>
                                        {now ? <span className="text-[10px] font-semibold text-[#3ddc97]">Now</span>
                                            : <button onClick={() => restore(v.v)} disabled={busy} className="text-[11px] font-semibold text-[#8e9bff] hover:text-white disabled:opacity-40">Use this</button>}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[10.5px] text-gray-600 mt-1.5 px-0.5">The last 5 versions are kept on your devices.</p>
                    </div>

                    <div>
                        <label htmlFor="appname" className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">Name</label>
                        <div className="flex items-center space-x-2.5">
                            <AppIcon app={app} size={40} />
                            <input id="appname" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} onBlur={rename} onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                                className="flex-1 min-w-0 h-10 rounded-xl border border-[#2c2c31] bg-[#111113] text-white text-[13px] px-3 outline-none focus:border-[#4d63ff] transition-colors" />
                        </div>
                    </div>

                    <button onClick={() => remove(close)} onBlur={() => setConfirmDelete(false)}
                        className={`w-full h-10 rounded-2xl text-[12px] font-semibold border transition-colors ${confirmDelete ? "bg-[#ff3b5c] border-transparent text-white" : "border-[#3a2a2e] text-[#ff8fa3] hover:bg-[#ff6b8b]/10"}`}>
                        {confirmDelete ? "Tap again to delete from all your devices" : "Delete app"}
                    </button>
                </div>
            )}
        </Sheet>
    );
}

// The Share button: three clear choices
const SHARE_ROWS = [
    { id: "off", title: "Only me", body: "Just your devices have it." },
    { id: "live", title: "Share live", body: "Everyone in the room can open it while they're here." },
    { id: "keep", title: "Share to keep", body: "Everyone in the room can open it and keep a copy." },
];
export function ShareSheet({ app, onClose }) {
    const ws = useContext(WebSocketContext);
    const current = app.shared || "off";
    return (
        <Sheet title={`Share ${app.name}`} subtitle="Answers and owner-only parts never leave your devices" onClose={onClose}>
            {(close) => (
                <div className="space-y-2">
                    {SHARE_ROWS.map((r) => {
                        const on = r.id === current;
                        return (
                            <button
                                key={r.id}
                                onClick={async () => { haptic(8); await setAppSharing(ws.socket, app, r.id); close(); }}
                                aria-pressed={on}
                                className={`w-full text-left flex items-center gap-3 rounded-2xl px-3.5 py-3 border transition-colors ${on ? "bg-[#1d1d2a] border-[#4d63ff]/60" : "bg-[#151517] border-[#26262b] hover:border-[#3a3a42]"}`}
                            >
                                <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${on ? "border-[#4d63ff]" : "border-[#45454d]"}`}>
                                    {on && <span className="h-2.5 w-2.5 rounded-full bg-[#4d63ff]" />}
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-[13px] font-semibold text-white">{r.title}</span>
                                    <span className="block text-[11px] text-gray-500 mt-0.5">{r.body}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </Sheet>
    );
}

// What a guest sees in the ✦ menu
export function GuestAppSheet({ app, onClose, onRemoved }) {
    return (
        <Sheet title={app.name} subtitle={`Shared by ${app.from || "the owner"}${app.kept ? " · kept on this device" : " · live while you're here"}`} onClose={onClose}>
            {(close) => (
                <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                        <AppIcon app={app} size={48} />
                        <p className="text-[12.5px] text-gray-300 leading-relaxed">{app.summary || "An app made in this room."}</p>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">It runs sealed off inside faax: it can't reach the internet, your files or other sites. What you save in it stays on this device.</p>
                    {app.kept && (
                        <button onClick={() => { forgetShared(app.id); close(); onRemoved && onRemoved(); }} className="w-full h-10 rounded-2xl text-[12px] font-semibold border border-[#3a2a2e] text-[#ff8fa3] hover:bg-[#ff6b8b]/10 transition-colors">
                            Remove from this device
                        </button>
                    )}
                </div>
            )}
        </Sheet>
    );
}

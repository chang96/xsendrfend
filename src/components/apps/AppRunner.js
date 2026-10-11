import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { WebSocketContext } from "../../utils/websocket";
import { currentHtml, currentSecrets } from "../../utils/appsStore";
import AppFrame from "./AppFrame";
import { AppMenuSheet, GuestAppSheet, ShareSheet } from "./Sheets";
import { jobFor, toast } from "./jobs";
import { useJobs } from "./hooks";
import { AppIcon, Sparkle, Spinner, useStage } from "./ui";

function WorkingBanner({ job }) {
    const { time, stage } = useStage(job);
    return (
        <div className="fx-float-in absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-2 max-w-[90%] bg-[#18181b]/95 border border-[#33334a] text-[#c7cdff] text-[11.5px] rounded-full pl-2.5 pr-3.5 py-1.5 shadow-2xl backdrop-blur">
            <Sparkle className="w-3.5 h-3.5 fx-twinkle" />
            <span key={stage} className="truncate">{job.fix && job.progress && job.progress.phase === "start" ? "Finding the bug" : stage} · {time}</span>
        </div>
    );
}

// Someone knocking while the owner is inside an app: answer without leaving it
function RunnerKnock() {
    const { knocks, decideKnock } = useContext(WebSocketContext);
    const k = knocks && knocks[0];
    if (!k) return null;
    return (
        <div className="fx-float-in absolute top-2 inset-x-3 z-20 mx-auto max-w-sm flex items-center gap-2 bg-[#1b1b1f]/95 border border-[#33334a] rounded-2xl pl-3.5 pr-1.5 py-1.5 shadow-2xl backdrop-blur">
            <span className="flex-1 min-w-0">
                <span className="block text-[12px] font-semibold text-white truncate">{k.name || "Someone"}</span>
                <span className="block text-[10.5px] text-gray-400">wants to join{knocks.length > 1 ? ` · +${knocks.length - 1} more` : ""}</span>
            </span>
            <button onClick={() => decideKnock(k.requestId, false)} className="h-8 px-2.5 rounded-xl text-[11.5px] font-semibold text-gray-400 hover:text-white">Deny</button>
            <button onClick={() => decideKnock(k.requestId, true)} className="h-8 px-3 rounded-xl bg-[#001AFF] text-white text-[11.5px] font-semibold active:scale-95 transition-transform">Let in</button>
        </div>
    );
}

export default function AppRunner({ app, isOwner, onClose }) {
    useJobs(); // re-render when a job for this app starts or ends
    const job = jobFor(app.id);
    const [menu, setMenu] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [error, setError] = useState(null);
    const [hostHere, setHostHere] = useState(true);
    const [here, setHere] = useState(1);
    const errorCount = useRef(0);
    const html = currentHtml(app);

    // a new version clears old errors
    useEffect(() => { setError(null); errorCount.current = 0; }, [html]);

    const onError = useCallback((err) => {
        errorCount.current += 1;
        if (errorCount.current > 20) return;
        setError((prev) => prev || err);
    }, []);
    const onNotify = useCallback((text) => toast({ text, ms: 3500 }), []);
    const onHost = useCallback((present, presence) => {
        setHostHere(present);
        setHere(presence ? presence.members.filter((m) => m.inApp).length : 1);
    }, []);

    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape" && !menu) onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [menu, onClose]);

    const status = app.who === "me"
        ? (isOwner ? "Just you · on your devices" : "Single player")
        : !hostHere ? "Waiting for the owner to open it"
        : here > 1 ? `Live · ${here} here` : "Live · waiting for others";
    const live = app.who !== "me" && hostHere && here > 1;

    return (
        <div className="planner fixed inset-0 z-[48] flex flex-col bg-[#0c0c0e] fx-app-in">
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#121212] border-b border-[#222226] flex-shrink-0" style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}>
                <button onClick={onClose} aria-label="Back to apps" className="h-9 w-9 -ml-1 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" /></svg>
                </button>
                <AppIcon app={app} size={30} radius={9} />
                <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-white truncate leading-tight">{app.name}</p>
                    <p className={`text-[10.5px] truncate ${live ? "text-[#3ddc97]" : !hostHere ? "text-[#ffb44c]" : "text-gray-500"}`}>
                        {live && <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3ddc97] mr-1 align-middle animate-pulse" />}
                        {status}
                    </p>
                </div>
                {isOwner && (
                    <button
                        onClick={() => setSharing(true)}
                        className={`h-9 px-3 rounded-xl flex items-center gap-1.5 text-[12px] font-semibold transition-colors ${app.shared && app.shared !== "off" ? "bg-[#4d63ff]/15 text-[#a9b3ff] hover:bg-[#4d63ff]/25" : "bg-[#1c1c20] text-gray-200 hover:bg-[#25252b]"}`}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-1a4 4 0 00-5-3.9M9 20H2v-1a5 5 0 0110 0v1m-3-9a3 3 0 100-6 3 3 0 000 6zm8 1a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" /></svg>
                        {app.shared === "live" ? "Shared" : app.shared === "keep" ? "Shared" : "Share"}
                    </button>
                )}
                <button onClick={() => setMenu(true)} aria-label="App menu: improve, versions, rename, delete" className="relative h-9 w-9 rounded-xl bg-[#1c1c20] hover:bg-[#25252b] flex items-center justify-center transition-colors">
                    {job ? <Spinner className="w-4 h-4 text-[#8e9bff]" /> : <Sparkle className="w-4 h-4" />}
                    {error && isOwner && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#ff3b5c] ring-2 ring-[#121212]" />}
                </button>
            </div>

            <div className="relative flex-1 min-h-0">
                {isOwner ? <RunnerKnock /> : null}
                {job && <WorkingBanner job={job} />}
                <AppFrame key={app.id + ":" + (app.current || app.version || 0)} app={app} html={html} secrets={isOwner ? currentSecrets(app) : null} who={app.who} onError={onError} onNotify={onNotify} onHost={onHost} />

                {error && isOwner && !job && (
                    <div className="fx-float-in absolute inset-x-3 bottom-3 z-10 flex items-center gap-2 bg-[#1f1416]/95 border border-[#5a2a33] rounded-2xl pl-3.5 pr-1.5 py-1.5 shadow-2xl backdrop-blur" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
                        <span className="flex-1 min-w-0">
                            <span className="block text-[11.5px] font-semibold text-[#ffb3be]">Something broke</span>
                            <span className="block text-[10.5px] text-[#ff8fa3]/80 truncate">{error.message}</span>
                        </span>
                        <button onClick={() => setMenu(true)} className="h-8 px-3 rounded-xl bg-[#ff3b5c] text-white text-[11.5px] font-semibold active:scale-95 transition-transform">Fix it</button>
                        <button onClick={() => setError(null)} aria-label="Dismiss" className="h-8 w-8 rounded-xl text-[#ff8fa3] hover:bg-white/5 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                )}
            </div>

            {menu && isOwner && (
                <AppMenuSheet app={app} lastError={error} onClearError={() => setError(null)} onClose={() => setMenu(false)} onDeleted={onClose} />
            )}
            {sharing && isOwner && <ShareSheet app={app} onClose={() => setSharing(false)} />}
            {menu && !isOwner && <GuestAppSheet app={app} onClose={() => setMenu(false)} onRemoved={onClose} />}
        </div>
    );
}

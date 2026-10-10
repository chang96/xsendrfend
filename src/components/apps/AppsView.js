import "../tasks/tasks.css";
import "./apps.css";
import { useContext, useEffect, useRef, useState } from "react";
import { WebSocketContext } from "../../utils/websocket";
import { clearUnseen, getApp, onOpenRequest, takePendingOpen } from "../../utils/appsStore";
import { haptic } from "../tasks/ui";
import { buildNew, errorText, planApp, toast } from "./jobs";
import { useApps, useJobs } from "./hooks";
import { AppMenuSheet, PlanSheet } from "./Sheets";
import AppRunner from "./AppRunner";
import { AppIcon, Segmented, Sparkle, Spinner, Toggle, WHO, useStage } from "./ui";

const IDEAS = {
    me: ["A gym log with my best lift per exercise", "A chess clock with a bell at 10 seconds", "Split a bill with tip and round-up"],
    room: ["Tic-tac-toe for two, keep our score forever", "A word game where one person sets the word", "Vote on where we eat tonight"],
    class: ["A 10-question quiz on fractions, I see everyone's scores", "Spelling bee rounds I control", "Exit ticket: one question, I see answers"],
};

const subtitle = (app) => {
    const share = app.shared === "live" ? " · shared" : app.shared === "keep" ? " · shared to keep" : "";
    return (app.who === "me" ? "Solo · synced" : app.who === "class" ? "Class" : "Live with room") + share;
};

function BuildingTile({ job }) {
    const { secs, stage } = useStage(job.startedAt);
    return (
        <div className="apps-building fx-app-in col-span-3 rounded-[20px] p-[1px] bg-[#1f1f26]">
            <div className="apps-building-inner flex items-center gap-3 rounded-[19px] bg-[#16161a] px-3.5 py-3">
                <span className="apps-breathe h-12 w-12 rounded-[14px] bg-gradient-to-br from-[#2a35ff] to-[#8e7bff] flex items-center justify-center flex-shrink-0 shadow-[0_10px_24px_-10px_rgba(48,72,255,0.9)]">
                    <Sparkle className="w-5 h-5 fx-twinkle" color="#fff" />
                </span>
                <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-white truncate">{stage}…</span>
                    <span className="block text-[11px] text-gray-500 truncate">“{job.label}”</span>
                </span>
                <span className="text-[11px] tabular-nums text-gray-500">{secs}s</span>
            </div>
        </div>
    );
}

function Describe({ onAsked }) {
    const ws = useContext(WebSocketContext);
    const [idea, setIdea] = useState("");
    const [who, setWho] = useState(() => { try { return localStorage.getItem("faax_apps_who") || "room"; } catch (e) { return "room"; } });
    const [askFirst, setAskFirst] = useState(() => { try { const v = localStorage.getItem("faax_apps_ask"); return v === null ? null : v === "1"; } catch (e) { return null; } });
    const [planning, setPlanning] = useState(false);
    const ask = askFirst === null ? who === "class" : askFirst; // on by default for a class
    const pickWho = (w) => { setWho(w); try { localStorage.setItem("faax_apps_who", w); } catch (e) {} };
    const pickAsk = (v) => { setAskFirst(v); try { localStorage.setItem("faax_apps_ask", v ? "1" : "0"); } catch (e) {} };

    const create = async () => {
        const prompt = idea.trim();
        if (!prompt || planning) return;
        haptic(10);
        if (ask) {
            setPlanning(true);
            const res = await planApp(ws.request, { prompt, who });
            setPlanning(false);
            if (!res.ok) { toast({ text: errorText(res.error, res.detail), tone: "error", ms: 6000 }); return; }
            onAsked({ plan: res.plan, prompt, who, clear: () => setIdea("") });
            return;
        }
        setIdea("");
        buildNew(ws, { prompt, who });
    };

    return (
        <div className="apps-describe rounded-[22px] p-4 bg-[#18181b] border border-[#2c2c34] space-y-3">
            <label htmlFor="apps-idea" className="flex items-center gap-2 text-[13px] font-semibold text-white">
                <Sparkle className="w-4 h-4" /> Describe an app
            </label>
            <textarea
                id="apps-idea" rows={2} value={idea} onChange={(e) => setIdea(e.target.value.slice(0, 1500))}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) create(); }}
                placeholder="Say it like you'd tell a friend: who it's for, how it should feel, what it should remember."
                className="w-full min-h-[64px] max-h-48 resize-none rounded-2xl border border-[#2c2c31] bg-[#111113] text-white text-[13.5px] leading-relaxed px-3.5 py-2.5 outline-none focus:border-[#4d63ff] transition-colors placeholder-gray-600"
            />
            <div className="flex gap-1.5 flex-wrap">
                {IDEAS[who].map((x) => (
                    <button key={x} onClick={() => setIdea(x)} className="text-[11px] px-2.5 py-1 rounded-full border border-[#2f2f35] text-gray-400 hover:text-white hover:border-[#45454d] transition-colors text-left">{x}</button>
                ))}
            </div>
            <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1.5">Who uses it?</p>
                <Segmented options={WHO} value={who} onChange={pickWho} small />
                <p className="text-[10.5px] text-gray-500 mt-1.5 px-0.5">{WHO.find((w) => w.id === who).hint}{who !== "me" ? ". Answers and private results only ever go to your devices." : "."}</p>
            </div>
            <Toggle on={ask} onChange={pickAsk} label="Ask me first" hint="A few quick questions so it gets the rules right" />
            <button
                onClick={create} disabled={!idea.trim() || planning}
                className="w-full h-11 rounded-2xl bg-[#001AFF] hover:bg-[#1a33ff] disabled:opacity-40 text-white text-[13.5px] font-semibold flex items-center justify-center gap-2 shadow-[0_10px_24px_-12px_rgba(0,26,255,0.9)] active:scale-[0.98] transition-all"
            >
                {planning ? <><Spinner className="w-4 h-4" /><span>Thinking of questions…</span></> : <span>Create app</span>}
            </button>
        </div>
    );
}

export default function AppsView({ isOwner, onExit }) {
    const ws = useContext(WebSocketContext);
    const { apps, guestApps } = useApps();
    const jobs = useJobs();
    const [openId, setOpenId] = useState(() => takePendingOpen());
    const [asked, setAsked] = useState(null);
    const [menuId, setMenuId] = useState(null); // ⋯ on a tile: manage without opening
    const scrollRef = useRef(null);

    useEffect(() => onOpenRequest((id) => { takePendingOpen(); setOpenId(id); }), []);
    useEffect(() => { if (!isOwner) clearUnseen(); }, [isOwner, guestApps.length]);

    const list = isOwner ? apps : guestApps;
    const open = openId ? getApp(openId) : null;
    const newJobs = jobs.filter((j) => j.kind === "new");
    const gridRef = useRef(null);
    const jobCount = newJobs.length;
    useEffect(() => {
        if (jobCount > 0 && gridRef.current) gridRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [jobCount]);

    return (
        <div className="planner relative flex-1 flex flex-col min-h-0">
            <div ref={scrollRef} className="soft-scroll flex-1 overflow-y-auto px-4 pt-5 pb-8 space-y-6 min-h-0">
                <div className="fx-rise">
                    <h1 className="text-[24px] leading-tight font-semibold tracking-tight text-white">Apps</h1>
                    <p className="text-[12.5px] text-gray-500 mt-1">
                        {isOwner ? "Describe it, and it runs here, on your devices and with whoever's in the room." : "Apps the owner shared with this room. They run sealed off inside faax."}
                    </p>
                </div>

                {isOwner && <Describe onAsked={setAsked} />}

                <div>
                    {(list.length > 0 || newJobs.length > 0) && (
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2.5 px-0.5">{isOwner ? "Made by you" : "Shared with you"}</p>
                    )}
                    <div ref={gridRef} className="grid grid-cols-3 gap-2.5 scroll-mb-6">
                        {newJobs.map((j) => <BuildingTile key={j.id} job={j} />)}
                        {list.map((a, i) => (
                            <div key={a.id} className="relative min-w-0 fx-rise" style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}>
                                <button
                                    onClick={() => { haptic(6); setOpenId(a.id); }}
                                    aria-label={`Open ${a.name}`}
                                    className="apps-tile w-full flex flex-col items-center gap-2 px-1.5 pt-3.5 pb-3 rounded-[18px] bg-[#18181b] border border-[#26262b] min-w-0"
                                >
                                    <AppIcon app={a} size={52} />
                                    <span className="text-[12px] font-semibold text-white truncate max-w-full px-1">{a.name}</span>
                                    <span className={`text-[9.5px] truncate max-w-full px-1 -mt-1 ${isOwner && a.shared && a.shared !== "off" ? "text-[#8e9bff]" : "text-gray-500"}`}>
                                        {isOwner ? subtitle(a) : a.kept ? "Kept" : "Live"}
                                    </span>
                                </button>
                                {isOwner && (
                                    <button
                                        onClick={() => { haptic(6); setMenuId(a.id); }}
                                        aria-label={`Manage ${a.name}: share, improve, delete`}
                                        className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {!isOwner && list.length === 0 && (
                        <div className="fx-rise flex flex-col items-center text-center py-14 px-6">
                            <span className="h-14 w-14 rounded-2xl bg-[#18181b] border border-[#26262b] flex items-center justify-center mb-4"><Sparkle className="w-6 h-6" /></span>
                            <p className="text-[13px] font-semibold text-white">Nothing shared yet</p>
                            <p className="text-[11.5px] text-gray-500 mt-1 max-w-[16rem]">When the owner shares an app with this room, it shows up here and you'll get a heads-up.</p>
                            <button onClick={onExit} className="mt-4 text-[12px] font-semibold text-[#8e9bff] hover:text-white">Back to chat</button>
                        </div>
                    )}
                    {isOwner && list.length === 0 && newJobs.length === 0 && (
                        <p className="text-[11.5px] text-gray-600 text-center px-6 pt-2">Your apps show up here and on all your devices.</p>
                    )}
                </div>
            </div>

            {asked && (
                <PlanSheet
                    plan={asked.plan}
                    onClose={() => setAsked(null)}
                    onBuild={(answers) => { asked.clear(); buildNew(ws, { prompt: asked.prompt, who: asked.who, answers }); setAsked(null); }}
                />
            )}
            {menuId && getApp(menuId) && !open && (
                <AppMenuSheet app={getApp(menuId)} onClose={() => setMenuId(null)} onDeleted={() => setMenuId(null)} />
            )}
            {open && <AppRunner app={open} isOwner={isOwner} onClose={() => setOpenId(null)} />}
        </div>
    );
}

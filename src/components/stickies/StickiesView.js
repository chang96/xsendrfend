import "./stickies.css";
import "../tasks/tasks.css";
import { useContext, useEffect, useState } from "react";
import { WebSocketContext } from "../../utils/websocket";
import { addNote, deleteNote, getNotes, getPrefs, outgoing, restoreNote, setPrefs, subscribeNotes, updateNote } from "../../utils/stickiesStore";
import { Sheet } from "../tasks/ui";
import { toast } from "../apps/jobs";
import StickyNote from "./StickyNote";

function useNotes() {
    const [n, setN] = useState(getNotes);
    useEffect(() => subscribeNotes(setN), []);
    return n;
}

// Pick which device(s) get this note. Nothing leaves this browser until you tap Send.
function SyncSheet({ note, onClose }) {
    const { socket, request } = useContext(WebSocketContext);
    const [peers, setPeers] = useState(null);
    const [picked, setPicked] = useState(() => new Set());
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        request("sticky:peers", {}, 6000).then((r) => {
            const list = r && r.ok ? r.peers : [];
            setPeers(list);
            // your own devices are picked by default
            setPicked(new Set(list.filter((p) => p.mine).map((p) => p.id)));
        });
    }, [request]);
    const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const send = async (close) => {
        if (!picked.size || busy || !socket) return;
        setBusy(true);
        const res = await request("sticky:send", { note: outgoing(note), to: [...picked] }, 10000);
        setBusy(false);
        if (!res.ok) { toast({ text: res.error === "too_large" ? "This note is too long to sync. Split it into two." : "Couldn't sync right now. Try again.", tone: "error", ms: 6000 }); return; }
        const names = peers.filter((p) => picked.has(p.id)).map((p) => p.name);
        updateNote(note.id, (n) => ({ syncedTo: [...(n.syncedTo || []).slice(-4), { name: names.join(", "), at: Date.now() }] }));
        toast({ text: res.sent ? `Sent to ${names.join(", ")}` : "That device just left the room. Nothing was sent.", ms: 4500 });
        close();
    };
    return (
        <Sheet title="Sync this note" subtitle="It goes only to the devices you pick. Until then it stays in this browser." onClose={onClose}
            footer={(close) => peers && peers.length > 0 && (
                <button onClick={() => send(close)} disabled={!picked.size || busy}
                    className="w-full h-11 rounded-2xl bg-[#001AFF] hover:bg-[#1a33ff] disabled:opacity-40 text-white text-[13px] font-semibold transition-colors">
                    {busy ? "Sending…" : picked.size ? `Send to ${picked.size} device${picked.size > 1 ? "s" : ""}` : "Pick a device"}
                </button>
            )}>
            {peers === null ? <p className="text-[12px] text-gray-500">Looking for devices in this room…</p>
                : peers.length === 0 ? (
                    <p className="text-[12px] text-gray-400 leading-relaxed">No other device is in this room right now. Open this room on the device you want it on, then tap Sync again.</p>
                ) : (
                    <div className="space-y-1.5">
                        {peers.map((p) => (
                            <button key={p.id} onClick={() => toggle(p.id)} aria-pressed={picked.has(p.id)}
                                className={`w-full flex items-center gap-3 rounded-2xl px-3.5 py-2.5 border text-left transition-colors ${picked.has(p.id) ? "bg-[#1d1d2a] border-[#4d63ff]/60" : "bg-[#151517] border-[#26262b] hover:border-[#3a3a42]"}`}>
                                <span className={`h-5 w-5 rounded-md border-2 flex items-center justify-center ${picked.has(p.id) ? "border-[#4d63ff] bg-[#4d63ff]" : "border-[#45454d]"}`}>
                                    {picked.has(p.id) && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[13px] font-semibold text-white truncate">{p.name}</span>
                                    <span className="block text-[10.5px] text-gray-500">{p.mine ? "Your device" : "In this room"}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                )}
        </Sheet>
    );
}

export default function StickiesView() {
    const notes = useNotes();
    const [prefs, setP] = useState(getPrefs);
    const [bigId, setBigId] = useState(null);
    const [syncing, setSyncing] = useState(null);
    const pref = (p) => { setPrefs(p); setP((x) => ({ ...x, ...p })); };
    const big = bigId ? notes.find((n) => n.id === bigId) : null;

    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") { if (bigId) setBigId(null); else if (prefs.maximized) pref({ maximized: false }); } };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }); // eslint-disable-line react-hooks/exhaustive-deps

    const remove = (note) => {
        const index = notes.findIndex((n) => n.id === note.id);
        deleteNote(note.id);
        if (bigId === note.id) setBigId(null);
        toast({ text: "Note deleted", actionLabel: "Undo", action: () => restoreNote(note, index), ms: 6000 });
    };
    const create = () => { const n = addNote(); setTimeout(() => { const el = document.querySelector(`[data-note="${n.id}"] .stk-text`); if (el) el.focus(); }, 60); };

    const iconBtn = "h-9 w-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors";
    const body = (
        <div className={`stk planner relative flex-1 flex flex-col min-h-0 ${prefs.maximized ? "" : ""}`}>
            <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3 flex-shrink-0">
                <div className="min-w-0">
                    <p className="text-[19px] font-semibold tracking-tight text-white leading-tight">Sticky notes</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Kept in this browser · Sync sends one to a device you pick</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => pref({ handwriting: !prefs.handwriting })} aria-pressed={prefs.handwriting}
                        title={prefs.handwriting ? "Switch to regular text" : "Switch to handwriting"}
                        className={`h-9 px-2.5 rounded-xl text-[13px] transition-colors ${prefs.handwriting ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                        style={{ fontFamily: prefs.handwriting ? '"Caveat", cursive' : "inherit", fontSize: prefs.handwriting ? 18 : 13 }}>
                        {prefs.handwriting ? "Aa ✍" : "Aa"}
                    </button>
                    <button onClick={() => pref({ maximized: !prefs.maximized })} className={iconBtn} title={prefs.maximized ? "Back to the room" : "Use the whole window"} aria-label={prefs.maximized ? "Minimize sticky notes" : "Maximize sticky notes"}>
                        <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                            <path d={prefs.maximized ? "M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" : "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"} />
                        </svg>
                    </button>
                    <button onClick={create} className="h-9 px-3 rounded-xl bg-[#001AFF] hover:bg-[#1a33ff] text-white text-[12.5px] font-semibold flex items-center gap-1 transition-colors" aria-label="New sticky note">
                        <span className="text-base leading-none">+</span> New
                    </button>
                </div>
            </div>

            <div className="soft-scroll flex-1 overflow-y-auto px-4 pb-10 pt-2 min-h-0">
                {notes.length === 0 ? (
                    <div className="flex flex-col items-center text-center pt-16 px-6">
                        <div className="w-24 h-24 rounded-sm mb-5 flex items-center justify-center text-[#3b3a1e] text-[26px]" style={{ background: "#fdf6a3", boxShadow: "3px 3px 0 #e9df7a, 6px 6px 0 #cfc560", fontFamily: '"Caveat", cursive' }}>To Do</div>
                        <p className="text-white text-[14px] font-semibold">A place for your thoughts</p>
                        <p className="text-gray-500 text-[12px] mt-1 max-w-[17rem]">Notes stay in this browser. Tick, cross, strike or underline as you go.</p>
                        <button onClick={create} className="mt-4 h-10 px-4 rounded-xl bg-[#001AFF] text-white text-[13px] font-semibold">New sticky note</button>
                    </div>
                ) : (
                    <div className={`stk-board ${prefs.maximized ? "" : "is-narrow"}`}>
                        {notes.map((n) => (
                            <div key={n.id} data-note={n.id}>
                                <StickyNote note={n} handwriting={prefs.handwriting} onExpand={(x) => setBigId(x.id)} onSync={setSyncing} onDelete={remove} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* one note, big: fills the board */}
            {big && (
                <div className="absolute inset-0 z-20 bg-[#0f0f11]/92 backdrop-blur-sm p-3 sm:p-6 flex justify-center fx-app-in" onClick={(e) => { if (e.target === e.currentTarget) setBigId(null); }}>
                    <div className="w-full max-w-3xl h-full" data-note={big.id}>
                        <StickyNote note={big} big handwriting={prefs.handwriting} onShrink={() => setBigId(null)} onSync={setSyncing} onDelete={remove} />
                    </div>
                </div>
            )}

            {syncing && <SyncSheet note={notes.find((n) => n.id === syncing.id) || syncing} onClose={() => setSyncing(null)} />}
        </div>
    );

    // Maximized: the board takes the whole window (still inside the room; Esc or the button to come back)
    return prefs.maximized ? <div className="fixed inset-0 z-[46] bg-[#0f0f11] flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>{body}</div> : body;
}

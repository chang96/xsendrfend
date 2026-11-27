import "./stickies.css";
import "../tasks/tasks.css";
import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { WebSocketContext } from "../../utils/websocket";
import { addNote, allTags, deleteNote, getNotes, getPrefs, moveNotes, outgoing, posOf, restoreNote, setPrefs, subscribeNotes, topZ, updateNote } from "../../utils/stickiesStore";
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

const NOTE_W = 270, PLAIN_W = 300, GAP = 18, PAD = 4;
const widthOf = (n) => (n.kind === "plain" ? PLAIN_W : NOTE_W);
// phone-width boards keep their own arrangement, so the wide one isn't squashed
export const layoutKey = (w) => (w >= 600 ? "wide" : "narrow");
const overlaps = (a, b) => a.x < b.x + b.w + GAP && b.x < a.x + a.w + GAP && a.y < b.y + b.h + GAP && b.y < a.y + a.h + GAP;
// First free spot, row by row then column by column, for a w×h note among the placed rects
function findSpot(rects, w, h, boardW) {
    const cols = Math.max(1, Math.floor((boardW - PAD * 2 + GAP) / (NOTE_W + GAP)));
    for (let y = PAD; y < 20000; y += 16) {
        for (let c = 0; c < cols; c++) {
            const r = { x: PAD + c * (NOTE_W + GAP), y, w, h };
            if (r.x + w > Math.max(boardW, w + PAD)) continue;
            if (!rects.some((o) => overlaps(r, o))) return r;
        }
    }
    return { x: PAD, y: PAD, w, h };
}
// Masonry: each note into the shortest column
function tidyLayout(list, heights, boardW) {
    const cols = Math.max(1, Math.floor((boardW - PAD * 2 + GAP) / (PLAIN_W + GAP)));
    const colW = Math.max(PLAIN_W, Math.floor((boardW - PAD * 2 - GAP * (cols - 1)) / cols));
    const tops = new Array(cols).fill(PAD);
    return list.map((n) => {
        const c = tops.indexOf(Math.min(...tops));
        const pos = { id: n.id, x: PAD + c * (colW + GAP), y: tops[c] };
        tops[c] += (heights[n.id] || 220) + GAP;
        return pos;
    });
}

// The free board: drag a note by its top strip and drop it anywhere
function FreeBoard({ notes, handwriting, onExpand, onSync, onDelete, boardRef, scrollRef }) {
    const [drag, setDrag] = useState(null); // { id, x, y }
    const [height, setHeight] = useState(400);
    const [boardW, setBoardW] = useState(0);
    const key = layoutKey(boardW);
    useEffect(() => {
        const el = boardRef.current;
        if (!el || typeof ResizeObserver === "undefined") return undefined;
        const ro = new ResizeObserver(() => setBoardW(el.clientWidth));
        ro.observe(el);
        return () => ro.disconnect();
    }, [boardRef]);
    const start = useRef(null);

    // measure; place notes that have no spot yet; grow the board to fit
    // eslint-disable-next-line react-hooks/exhaustive-deps -- measures the DOM after every render; each setState is guarded
    useLayoutEffect(() => {
        const board = boardRef.current;
        if (!board) return;
        if (board.clientWidth !== boardW) { setBoardW(board.clientWidth); return; } // know the width before placing anything
        const els = [...board.querySelectorAll(":scope > [data-note]")];
        const h = {}; els.forEach((el) => { h[el.dataset.note] = el.offsetHeight; });
        const placed = notes.filter((n) => posOf(n, key)).map((n) => ({ ...posOf(n, key), w: widthOf(n), h: h[n.id] || 220 }));
        const missing = notes.filter((n) => !posOf(n, key));
        if (missing.length) {
            const moves = [];
            [...missing].reverse().forEach((n) => { const r = findSpot(placed, widthOf(n), h[n.id] || 220, board.clientWidth); placed.push(r); moves.push({ id: n.id, x: r.x, y: r.y }); });
            moveNotes(moves, key);
            return;
        }
        const bottom = Math.max(300, ...placed.map((r) => r.y + r.h)) + 40;
        if (Math.abs(bottom - height) > 4) setHeight(bottom);
    });

    const down = (n) => (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        if (e.target.closest("button, input, [contenteditable]")) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
        const p = posOf(n, key) || { x: 0, y: 0 };
        start.current = { id: n.id, px: e.clientX, py: e.clientY, x: Math.min(p.x, boardW ? Math.max(0, boardW - widthOf(n)) : p.x), y: p.y, moved: false };
        setDrag({ id: n.id, x: start.current.x, y: p.y });
    };
    const move = (e) => {
        const s = start.current;
        if (!s) return;
        const dx = e.clientX - s.px, dy = e.clientY - s.py;
        if (Math.abs(dx) + Math.abs(dy) > 3) s.moved = true;
        setDrag({ id: s.id, x: Math.max(0, s.x + dx), y: Math.max(0, s.y + dy) });
        // keep scrolling while dragging near the edges
        const sc = scrollRef.current;
        if (sc) { const r = sc.getBoundingClientRect(); if (e.clientY > r.bottom - 40) sc.scrollTop += 12; else if (e.clientY < r.top + 40) sc.scrollTop -= 12; }
    };
    const up = () => {
        const s = start.current;
        start.current = null;
        if (s && drag) {
            const w = boardRef.current ? boardRef.current.clientWidth : 1000;
            const n = notes.find((x) => x.id === s.id);
            // keep the whole note on the board
            moveNotes([{ id: s.id, x: Math.min(drag.x, Math.max(0, w - (n ? widthOf(n) : NOTE_W))), y: drag.y, z: topZ() }], key);
        }
        setDrag(null);
    };
    const front = (n) => () => { if ((n.z || 0) < topZ() - 1) moveNotes([{ id: n.id, z: topZ() }], key); };

    return (
        <div ref={boardRef} className="stk-free" style={{ height }} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            {notes.map((n) => {
                const p = posOf(n, key);
                const placed = !!p && boardW > 0;
                // a narrower window (or the room pane) never pushes a note off the side
                const maxX = boardW ? Math.max(0, boardW - widthOf(n)) : Infinity;
                const pos = drag && drag.id === n.id ? drag : { x: Math.min(p ? p.x : 0, maxX), y: p ? p.y : 0 };
                return (
                    <div key={n.id} data-note={n.id} className={`${n.kind === "plain" ? "is-plain" : ""} ${drag && drag.id === n.id ? "stk-dragging" : ""}`}
                        style={{ left: pos.x, top: pos.y, zIndex: n.z || 1, width: widthOf(n), visibility: placed ? "visible" : "hidden" }}
                        onPointerDownCapture={front(n)}>
                        <StickyNote note={n} handwriting={handwriting} onExpand={onExpand} onSync={onSync} onDelete={onDelete}
                            dragProps={{ onPointerDown: down(n) }} />
                    </div>
                );
            })}
        </div>
    );
}

// The opened note: a window over the board. Starts centred; drag the top strip to move it.
function FloatingNote({ note, areaRef, boardRef, handwriting, onShrink, onSync, onDelete }) {
    // it floats over the notes, below the header (so New, Tidy and Maximize stay in reach)
    const measure = () => { const el = areaRef.current, b = boardRef.current; return el ? { w: el.clientWidth, h: el.clientHeight, top: b ? b.offsetTop : 0 } : { w: 800, h: 700, top: 0 }; };
    const [area, setArea] = useState(measure);
    const [pos, setPos] = useState(null);
    const start = useRef(null);
    useEffect(() => {
        const el = areaRef.current;
        if (!el || typeof ResizeObserver === "undefined") return undefined;
        const ro = new ResizeObserver(() => setArea(measure()));
        ro.observe(el);
        return () => ro.disconnect();
    }, [areaRef]); // eslint-disable-line react-hooks/exhaustive-deps
    const m = area.w < 600 ? 8 : 16;
    const w = Math.min(720, area.w - m * 2);
    const room = area.h - area.top;
    const h = Math.max(260, Math.min(room - m, Math.round(room * 0.75)));
    // the whole note stays on screen
    const clamp = (p) => ({ x: Math.min(Math.max(0, p.x), Math.max(0, area.w - w)), y: Math.min(Math.max(area.top, p.y), Math.max(area.top, area.h - h)) });
    const at = clamp(pos || { x: (area.w - w) / 2, y: area.top + Math.max(0, (room - h) / 2) });
    const down = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        if (e.target.closest("button, input, [contenteditable]")) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { px: e.clientX, py: e.clientY, x: at.x, y: at.y };
    };
    const move = (e) => { const s = start.current; if (s) setPos(clamp({ x: s.x + e.clientX - s.px, y: s.y + e.clientY - s.py })); };
    const up = () => { start.current = null; };
    return (
        <div className="stk-float absolute z-30 fx-app-in" data-note={note.id} data-floating="1"
            style={{ left: at.x, top: at.y, width: w, height: h }} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            <StickyNote note={note} big handwriting={handwriting} onShrink={onShrink} onSync={onSync} onDelete={onDelete} dragProps={{ onPointerDown: down }} />
        </div>
    );
}

export default function StickiesView() {
    const notes = useNotes();
    const [prefs, setP] = useState(getPrefs);
    const [bigId, setBigId] = useState(null);
    const [syncing, setSyncing] = useState(null);
    const [newMenu, setNewMenu] = useState(false);
    const [tag, setTag] = useState(null); // filter
    const boardRef = useRef(null);
    const scrollRef = useRef(null);
    const areaRef = useRef(null);
    const tags = allTags();
    const shown = tag ? notes.filter((n) => (n.tags || []).includes(tag)) : notes;
    const pref = (p) => { setPrefs(p); setP((x) => ({ ...x, ...p })); };
    const big = bigId ? notes.find((n) => n.id === bigId) : null;

    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape" && !(e.target && e.target.closest && e.target.closest("input, textarea, [contenteditable]"))) { if (bigId) setBigId(null); else if (prefs.maximized) pref({ maximized: false }); } };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }); // eslint-disable-line react-hooks/exhaustive-deps

    const remove = (note) => {
        const index = notes.findIndex((n) => n.id === note.id);
        deleteNote(note.id);
        if (bigId === note.id) setBigId(null);
        toast({ text: "Note deleted", actionLabel: "Undo", action: () => restoreNote(note, index), ms: 6000 });
    };
    useEffect(() => { if (tag && !tags.includes(tag)) setTag(null); }, [tag, tags]);
    const create = (kind = "list") => {
        setNewMenu(false); setTag(null);
        // a free spot near the top of what you're looking at
        let pos = null;
        const board = boardRef.current, sc = scrollRef.current;
        if (board) {
            const rects = [...board.querySelectorAll(":scope > [data-note]")].map((el) => ({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }));
            const top = sc ? sc.scrollTop : 0;
            const r = findSpot(rects.filter((o) => o.y + o.h > top), kind === "plain" ? PLAIN_W : NOTE_W, 240, board.clientWidth);
            pos = { x: r.x, y: Math.max(r.y, top + PAD) };
        }
        const n = addNote(kind, pos, board ? layoutKey(board.clientWidth) : "wide");
        setTimeout(() => {
            const el = document.querySelector(`[data-note="${n.id}"] .stk-text`);
            if (el) { el.focus(); el.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
        }, 80);
    };
    const tidy = () => {
        const board = boardRef.current;
        if (!board) return;
        const h = {}; board.querySelectorAll(":scope > [data-note]").forEach((el) => { h[el.dataset.note] = el.offsetHeight; });
        moveNotes(tidyLayout(notes, h, board.clientWidth), layoutKey(board.clientWidth));
    };

    const iconBtn = "h-9 w-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors";
    const body = (
        <div ref={areaRef} className="stk planner relative flex-1 flex flex-col min-h-0">
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
                    {notes.length > 1 && !tag && (
                        <button onClick={tidy} className={iconBtn} title="Tidy up: line the notes up neatly" aria-label="Tidy up">
                            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" /></svg>
                        </button>
                    )}
                    <div className="relative">
                        <button onClick={() => setNewMenu((m) => !m)} aria-expanded={newMenu} className="h-9 px-3 rounded-xl bg-[#001AFF] hover:bg-[#1a33ff] text-white text-[12.5px] font-semibold flex items-center gap-1 transition-colors" aria-label="New sticky note">
                            <span className="text-base leading-none">+</span> New
                        </button>
                        {newMenu && (
                            <div className="absolute right-0 top-11 z-30 w-48 bg-[#1e1e22] border border-[#2c2c33] rounded-xl shadow-2xl p-1 fx-app-in">
                                <button onClick={() => create("list")} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5">
                                    <span className="block text-[12.5px] font-semibold text-white">Checklist</span>
                                    <span className="block text-[10.5px] text-gray-500">Lines with ○ ✓ ✗</span>
                                </button>
                                <button onClick={() => create("plain")} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5">
                                    <span className="block text-[12.5px] font-semibold text-white">Plain note</span>
                                    <span className="block text-[10.5px] text-gray-500">Just write, no lines</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {tags.length > 0 && (
                <div className="flex items-center gap-1.5 px-4 pb-2 overflow-x-auto flex-shrink-0" role="toolbar" aria-label="Filter by tag">
                    <button onClick={() => setTag(null)} aria-pressed={!tag} className={`h-7 px-3 rounded-full text-[11.5px] font-semibold flex-shrink-0 transition-colors ${!tag ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"}`}>All</button>
                    {tags.map((t) => (
                        <button key={t} onClick={() => setTag(tag === t ? null : t)} aria-pressed={tag === t}
                            className={`h-7 px-3 rounded-full text-[11.5px] font-semibold flex-shrink-0 transition-colors ${tag === t ? "bg-[#001AFF] text-white" : "bg-white/5 text-gray-300 hover:text-white"}`}>#{t}</button>
                    ))}
                </div>
            )}

            <div ref={scrollRef} className="soft-scroll isolate flex-1 overflow-auto px-4 pb-10 pt-2 min-h-0" onClick={() => setNewMenu(false)}>
                {notes.length === 0 ? (
                    <div className="flex flex-col items-center text-center pt-16 px-6">
                        <div className="w-24 h-24 rounded-sm mb-5 flex items-center justify-center text-[#3b3a1e] text-[26px]" style={{ background: "#fdf6a3", boxShadow: "3px 3px 0 #e9df7a, 6px 6px 0 #cfc560", fontFamily: '"Caveat", cursive' }}>To Do</div>
                        <p className="text-white text-[14px] font-semibold">A place for your thoughts</p>
                        <p className="text-gray-500 text-[12px] mt-1 max-w-[17rem]">Notes stay in this browser. Tick, cross, strike or underline as you go.</p>
                        <div className="mt-4 flex gap-2">
                            <button onClick={() => create("list")} className="h-10 px-4 rounded-xl bg-[#001AFF] text-white text-[13px] font-semibold">New checklist</button>
                            <button onClick={() => create("plain")} className="h-10 px-4 rounded-xl bg-white/10 text-white text-[13px] font-semibold">New plain note</button>
                        </div>
                    </div>
                ) : tag ? (
                    // filtered by a tag: neat columns (clear the filter to arrange freely)
                    <>
                        <p className="text-[11px] text-gray-500 mb-3">Showing #{tag} · {shown.length} note{shown.length === 1 ? "" : "s"}. <button className="text-[#8e9bff] hover:text-white" onClick={() => setTag(null)}>Show all</button> to move notes around.</p>
                        <div className={`stk-board ${prefs.maximized ? "" : "is-narrow"}`}>
                            {shown.map((n) => (
                                <div key={n.id} data-note-filtered={n.id}>
                                    <StickyNote note={n} handwriting={prefs.handwriting} onExpand={(x) => setBigId(x.id)} onSync={setSyncing} onDelete={remove} />
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <FreeBoard notes={notes} handwriting={prefs.handwriting} onExpand={(x) => setBigId(x.id)} onSync={setSyncing} onDelete={remove} boardRef={boardRef} scrollRef={scrollRef} />
                )}
            </div>

            {/* one note, big: floats above all the others; drag it by its top strip */}
            {big && <FloatingNote key={big.id} note={big} areaRef={areaRef} boardRef={scrollRef} handwriting={prefs.handwriting} onShrink={() => setBigId(null)} onSync={setSyncing} onDelete={remove} />}

            {syncing && <SyncSheet note={notes.find((n) => n.id === syncing.id) || syncing} onClose={() => setSyncing(null)} />}
        </div>
    );

    // Maximized: the board takes the whole window (still inside the room; Esc or the button to come back)
    return prefs.maximized ? <div className="fixed inset-0 z-[46] bg-[#0f0f11] flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>{body}</div> : body;
}

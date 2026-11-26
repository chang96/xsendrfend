import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { COLORS, addTag, allTags, colorOf, convertNote, newLine, plainText, removeTag, sanitize, updateNote } from "../../utils/stickiesStore";

const Ico = ({ d, className = "w-4 h-4", sw = 2.2, fill = "none" }) => (
    <svg className={className} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const I = {
    expand: "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7",
    shrink: "M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7",
    fold: "M5 12h14",
    unfold: "M12 5v14M5 12h14",
    sync: "M4 12a8 8 0 0113.7-5.7L20 8M20 4v4h-4M20 12a8 8 0 01-13.7 5.7L4 16M4 20v-4h4",
    more: "M5 12h.01M12 12h.01M19 12h.01",
};

// The mark in front of a line: ○ to do, ✓ done, ✗ not doing. Click cycles.
function Mark({ mark, ink, onClick }) {
    if (!mark) return <span className="w-6 flex-shrink-0" />;
    const next = { todo: "done", done: "x", x: "todo" }[mark];
    return (
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={`Mark as ${next === "done" ? "done" : next === "x" ? "not doing" : "to do"}`}
            className="w-6 h-6 mt-0.5 flex-shrink-0 flex items-center justify-center rounded-full" aria-label={`Line is ${mark === "todo" ? "to do" : mark === "done" ? "done" : "crossed out"}`}>
            {mark === "todo" && <span className="w-[15px] h-[15px] rounded-full border-[1.6px]" style={{ borderColor: ink }} />}
            {mark === "done" && <Ico d="M5 12.5l4.5 4.5L19 7.5" className="w-[18px] h-[18px] text-[#1f8a4c]" sw={3} />}
            {mark === "x" && <Ico d="M6 6l12 12M18 6L6 18" className="w-[17px] h-[17px] text-[#c8323f]" sw={3} />}
        </button>
    );
}

// One editable line. Uncontrolled while focused so the caret never jumps.
function Line({ line, refFn, onInput, onKeyDown, onFocus, placeholder }) {
    const el = useRef(null);
    useLayoutEffect(() => {
        if (el.current && document.activeElement !== el.current && el.current.innerHTML !== line.html) el.current.innerHTML = line.html;
    }, [line.html]);
    return (
        <div
            ref={(n) => { el.current = n; refFn(n); }}
            className="stk-text flex-1 min-w-0"
            contentEditable suppressContentEditableWarning
            data-placeholder={placeholder}
            onInput={() => onInput(el.current.innerHTML)}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onPaste={(e) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
        />
    );
}

// A plain note: one free-form body, write anything
function PlainBody({ note, refFn, onInput, onFocus }) {
    const el = useRef(null);
    useLayoutEffect(() => {
        if (el.current && document.activeElement !== el.current && el.current.innerHTML !== (note.body || "")) el.current.innerHTML = note.body || "";
    }, [note.body]);
    return (
        <div
            ref={(n) => { el.current = n; refFn(n); }}
            className="stk-text stk-body min-h-[120px] px-1"
            contentEditable suppressContentEditableWarning
            data-placeholder="Write anything…"
            onInput={() => onInput(el.current.innerHTML)}
            onFocus={onFocus}
            onPaste={(e) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
        />
    );
}

// #tags under a note
function Tags({ note, ink }) {
    const [adding, setAdding] = useState(false);
    const [val, setVal] = useState("");
    const tags = note.tags || [];
    const listId = `tags-${note.id}`;
    const commit = () => { if (val.trim()) addTag(note.id, val); setVal(""); };
    return (
        <div className="px-4 pb-2.5 flex flex-wrap items-center gap-1.5 font-sans">
            {tags.map((t) => (
                <span key={t} className="stk-tag inline-flex items-center h-6 pl-2 pr-1 rounded-full text-[11px] font-semibold" style={{ background: "rgba(255,255,255,0.55)", color: ink }}>
                    #{t}
                    <button onClick={() => removeTag(note.id, t)} aria-label={`Remove tag ${t}`} className="ml-0.5 w-4 h-4 rounded-full opacity-50 hover:opacity-100 flex items-center justify-center">×</button>
                </span>
            ))}
            {adding ? (
                <>
                    <input autoFocus value={val} list={listId} placeholder="tag" aria-label="New tag"
                        onChange={(e) => setVal(e.target.value.slice(0, 30))}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === "," || e.key === " ") { e.preventDefault(); commit(); } else if (e.key === "Escape") { setAdding(false); setVal(""); } }}
                        onBlur={() => { commit(); setAdding(false); }}
                        className="h-6 w-24 px-2 rounded-full text-[11px] bg-white/70 outline-none" style={{ color: ink }} />
                    <datalist id={listId}>{allTags().filter((t) => !tags.includes(t)).map((t) => <option key={t} value={t} />)}</datalist>
                </>
            ) : tags.length < 8 && (
                <button onClick={() => setAdding(true)} className="h-6 px-2 rounded-full text-[11px] font-semibold opacity-50 hover:opacity-90" aria-label="Add a tag">+ tag</button>
            )}
        </div>
    );
}

const caretAtStart = (el) => {
    const sel = window.getSelection();
    if (!sel.rangeCount || !sel.isCollapsed) return false;
    const r = document.createRange(); r.selectNodeContents(el); r.setEnd(sel.anchorNode, sel.anchorOffset);
    return r.toString().length === 0;
};
const placeCaret = (el, atEnd = true) => {
    if (!el) return;
    el.focus();
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(!atEnd);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
};

export default function StickyNote({ note, handwriting, big, onExpand, onShrink, onSync, onDelete, dragProps }) {
    const c = colorOf(note.color);
    const refs = useRef({});
    const pendingFocus = useRef(null);
    const saveTimer = useRef(null);
    const [active, setActive] = useState(null); // focused line id
    const [menu, setMenu] = useState(false);
    const [confirmDel, setConfirmDel] = useState(false);
    const lines = note.lines || [];
    const plain = note.kind === "plain";

    useEffect(() => {
        const p = pendingFocus.current;
        if (p && refs.current[p.id]) { placeCaret(refs.current[p.id], p.atEnd !== false); pendingFocus.current = null; }
    });
    useEffect(() => () => clearTimeout(saveTimer.current), []);

    const setLines = (fn) => updateNote(note.id, (n) => ({ lines: fn(n.lines || []) }));
    const saveLine = (id, html) => {
        clearTimeout(saveTimer.current);
        const clean = sanitize(html);
        saveTimer.current = setTimeout(() => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, html: clean } : l))), 250);
    };
    const flush = () => {
        // take what's on screen right now (pending typing) before a structural change
        clearTimeout(saveTimer.current);
        return lines.map((l) => (refs.current[l.id] ? { ...l, html: sanitize(refs.current[l.id].innerHTML) } : l));
    };

    const onKey = (line, idx) => (e) => {
        const el = refs.current[line.id];
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const sel = window.getSelection();
            let tail = "";
            if (sel.rangeCount) {
                const r = document.createRange(); r.selectNodeContents(el);
                r.setStart(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
                const box = document.createElement("div"); box.appendChild(r.extractContents()); tail = box.innerHTML;
            }
            const cur = flush();
            const nl = newLine(line.mark ? "todo" : null, sanitize(tail));
            pendingFocus.current = { id: nl.id, atEnd: false };
            updateNote(note.id, { lines: [...cur.slice(0, idx + 1), nl, ...cur.slice(idx + 1)] });
        } else if (e.key === "Backspace" && idx > 0 && caretAtStart(el)) {
            e.preventDefault();
            const cur = flush();
            const prev = cur[idx - 1];
            pendingFocus.current = { id: prev.id, atEnd: true };
            updateNote(note.id, { lines: [...cur.slice(0, idx - 1), { ...prev, html: prev.html + cur[idx].html }, ...cur.slice(idx + 1)] });
            if (refs.current[prev.id]) refs.current[prev.id].innerHTML = prev.html + cur[idx].html;
        } else if (e.key === "ArrowUp" && idx > 0 && caretAtStart(el)) {
            e.preventDefault(); placeCaret(refs.current[lines[idx - 1].id]);
        } else if (e.key === "ArrowDown" && idx < lines.length - 1) {
            const sel = window.getSelection();
            const r = document.createRange(); r.selectNodeContents(el);
            if (sel.rangeCount) r.setStart(sel.focusNode, sel.focusOffset);
            if (!r.toString().length) { e.preventDefault(); placeCaret(refs.current[lines[idx + 1].id], false); }
        } else if ((e.metaKey || e.ctrlKey) && ["b", "i", "u"].includes(e.key.toLowerCase())) {
            // browsers do these already; just make sure the change is saved
            setTimeout(() => saveLine(line.id, el.innerHTML), 0);
        }
    };

    const setMark = (mark) => {
        if (!active) return;
        const cur = flush();
        updateNote(note.id, { lines: cur.map((l) => (l.id === active ? { ...l, mark: typeof mark === "function" ? mark(l.mark) : mark } : l)) });
    };
    const cycle = (line) => {
        const cur = flush();
        const next = { todo: "done", done: "x", x: "todo" }[line.mark] || "todo";
        updateNote(note.id, { lines: cur.map((l) => (l.id === line.id ? { ...l, mark: next } : l)) });
    };
    const saveActive = () => {
        if (active === "body" && refs.current.body) saveBody(refs.current.body.innerHTML);
        else if (active && refs.current[active]) saveLine(active, refs.current[active].innerHTML);
    };
    const saveBody = (html) => {
        clearTimeout(saveTimer.current);
        const clean = sanitize(html);
        saveTimer.current = setTimeout(() => updateNote(note.id, { body: clean }), 250);
    };
    const fmt = (cmd) => { document.execCommand(cmd, false, null); saveActive(); };
    // Plain notes: ✓ / ✗ go at the start of the line the caret is on (tap again to remove, or swap)
    const insertMark = (ch) => {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        sel.collapseToStart();
        try { sel.modify("move", "backward", "paragraphboundary"); } catch (e) { try { sel.modify("move", "backward", "lineboundary"); } catch (err) {} }
        const r = sel.getRangeAt(0);
        const node = r.startContainer, off = r.startOffset;
        const head = node.nodeType === 3 ? node.textContent.slice(off, off + 2) : "";
        if (head === "✓ " || head === "✗ ") {
            const rr = document.createRange(); rr.setStart(node, off); rr.setEnd(node, off + 2);
            sel.removeAllRanges(); sel.addRange(rr);
            document.execCommand(head[0] === ch ? "delete" : "insertText", false, head[0] === ch ? null : ch + " ");
        } else {
            document.execCommand("insertText", false, ch + " ");
        }
        saveActive();
    };
    const highlight = () => {
        const sel = window.getSelection();
        if (!sel.rangeCount || sel.isCollapsed) return;
        const box = document.createElement("div"); box.appendChild(sel.getRangeAt(0).cloneContents());
        document.execCommand("insertHTML", false, `<mark>${box.innerHTML}</mark>`);
        saveActive();
    };
    const addLine = () => {
        const cur = flush();
        const nl = newLine(cur.length && !cur[cur.length - 1].mark ? null : "todo");
        pendingFocus.current = { id: nl.id };
        updateNote(note.id, { lines: [...cur, nl] });
    };

    const activeLine = active === "body" ? { id: "body", mark: null } : lines.find((l) => l.id === active);
    const date = new Date(note.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: new Date(note.createdAt).getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
    const preview = lines.map((l) => plainText(l.html)).filter(Boolean);
    const tool = "stk-tool h-8 min-w-[32px] px-1.5 rounded-lg flex items-center justify-center text-[14px]";
    const keep = (e) => e.preventDefault(); // keep the text selection when tapping a tool

    return (
        <article
            className={`stk-card ${handwriting ? "stk-hand" : "stk-plain"} ${big ? "stk-big h-full flex flex-col" : ""}`}
            style={{ background: c.bg, color: c.ink, "--edge": c.edge, "--ink": c.ink }}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { setActive(null); setMenu(false); } }}
            aria-label={note.title || "Sticky note"}
        >
            {/* header: date, tools */}
            <div className={`flex items-start justify-between pl-4 pr-1.5 pt-2.5 ${dragProps ? "stk-handle" : ""}`} {...(dragProps || {})} title={dragProps ? "Drag to move" : undefined}>
                <span className="stk-date text-[13px] opacity-60 italic whitespace-nowrap">Date: {date}</span>
                <div className="flex items-center -mr-0.5">
                    <button className={tool} title="Sync to a device" aria-label="Sync to a device" onClick={() => onSync(note)}><Ico d={I.sync} /></button>
                    {big
                        ? <button className={tool} title="Back to all notes" aria-label="Back to all notes" onClick={onShrink}><Ico d={I.shrink} /></button>
                        : <button className={tool} title="Open big" aria-label="Open big" onClick={() => onExpand(note)}><Ico d={I.expand} /></button>}
                    {!big && (
                        <button className={tool} title={note.collapsed ? "Show the whole note" : "Fold the note"} aria-label={note.collapsed ? "Unfold note" : "Fold note"}
                            onClick={() => updateNote(note.id, { collapsed: !note.collapsed })}><Ico d={note.collapsed ? I.unfold : I.fold} /></button>
                    )}
                    <button className={tool} title="Colour and delete" aria-label="More" aria-pressed={menu} onClick={() => { setMenu((m) => !m); setConfirmDel(false); }}><Ico d={I.more} sw={3.2} /></button>
                </div>
            </div>

            {menu && (
                <div className="stk-bar mx-3 mt-1 mb-1 p-2 rounded-xl flex items-center gap-1.5 flex-wrap" style={{ background: "rgba(255,255,255,0.45)" }}>
                    <button onClick={() => { convertNote(note.id); setMenu(false); }} className="h-7 px-2.5 rounded-lg text-[12px] font-semibold hover:bg-black/5 font-sans w-full text-left mb-0.5">
                        {plain ? "Turn into a checklist" : "Turn into a plain note"}
                    </button>
                    {COLORS.map((k) => (
                        <button key={k.id} title={k.id} aria-label={`Colour ${k.id}`} onClick={() => updateNote(note.id, { color: k.id })}
                            className="w-6 h-6 rounded-full border-2" style={{ background: k.bg, borderColor: k.id === note.color ? c.ink : k.edge }} />
                    ))}
                    <button onClick={() => (confirmDel ? onDelete(note) : setConfirmDel(true))}
                        className={`ml-auto h-7 px-2.5 rounded-lg text-[12px] font-semibold ${confirmDel ? "bg-[#c8323f] text-white" : "text-[#a3202c] hover:bg-black/5"}`}>
                        {confirmDel ? "Tap again to delete" : "Delete"}
                    </button>
                </div>
            )}

            <div className="px-4 pt-0.5">
                <input
                    className="stk-title"
                    value={note.title}
                    placeholder="To Do"
                    aria-label="Note title"
                    onChange={(e) => updateNote(note.id, { title: e.target.value.slice(0, 120) })}
                    onFocus={() => setActive(null)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (lines[0]) placeCaret(refs.current[lines[0].id]); } }}
                    style={{ color: c.ink }}
                />
            </div>

            {note.collapsed && !big ? (
                <button onClick={() => updateNote(note.id, { collapsed: false })} className="w-full text-left px-4 pb-3 pt-1">
                    <span className="stk-text block truncate opacity-70">{(plain ? plainText(note.body) : preview[0]) || "Empty note"}</span>
                    <span className="block text-[11px] opacity-50 mt-0.5 font-sans">{plain ? "Plain note" : `${lines.length} line${lines.length === 1 ? "" : "s"}`} · tap to unfold</span>
                </button>
            ) : plain ? (
                <div className={`px-3 pb-3 pt-1 ${big ? "flex-1 overflow-y-auto" : ""}`}>
                    <PlainBody note={note} refFn={(n) => { if (n) refs.current.body = n; else delete refs.current.body; }}
                        onInput={saveBody} onFocus={() => { setActive("body"); setMenu(false); }} />
                </div>
            ) : (
                <div className={`px-3 pb-3 pt-1 ${big ? "flex-1 overflow-y-auto" : ""}`}>
                    {lines.map((line, idx) => (
                        <div key={line.id} className={`stk-line flex items-start gap-1.5 py-1 ${line.mark === "done" ? "stk-done" : ""}`}>
                            <Mark mark={line.mark} ink={c.ink} onClick={() => cycle(line)} />
                            <Line
                                line={line}
                                placeholder={idx === 0 ? "Write a thought…" : ""}
                                refFn={(n) => { if (n) refs.current[line.id] = n; else delete refs.current[line.id]; }}
                                onInput={(html) => saveLine(line.id, html)}
                                onKeyDown={onKey(line, idx)}
                                onFocus={() => { setActive(line.id); setMenu(false); }}
                            />
                        </div>
                    ))}
                    <button onClick={addLine} className="mt-1.5 ml-1 text-[12px] font-semibold opacity-50 hover:opacity-90 font-sans">+ Add a line</button>
                </div>
            )}

            {/* formatting, while you're writing */}
            {active && activeLine && (
                <div className="stk-bar mx-2 mb-2 px-1 py-1 rounded-xl flex items-center gap-0.5 flex-wrap font-sans" style={{ background: "rgba(255,255,255,0.5)" }} role="toolbar" aria-label="Formatting">
                    {plain ? (
                        <>
                            <button className={tool} onMouseDown={keep} onClick={() => insertMark("✓")} title="Tick this line" aria-label="Tick"><Ico d="M5 12.5l4.5 4.5L19 7.5" sw={3} /></button>
                            <button className={tool} onMouseDown={keep} onClick={() => insertMark("✗")} title="Cross this line" aria-label="Cross"><Ico d="M6 6l12 12M18 6L6 18" sw={3} /></button>
                        </>
                    ) : (
                        <>
                            <button className={tool} onMouseDown={keep} onClick={() => setMark((m) => (m ? null : "todo"))} aria-pressed={!!activeLine.mark} title="Checkbox on this line" aria-label="Checkbox on this line">○</button>
                            <button className={tool} onMouseDown={keep} onClick={() => setMark("done")} aria-pressed={activeLine.mark === "done"} title="Tick" aria-label="Tick"><Ico d="M5 12.5l4.5 4.5L19 7.5" sw={3} /></button>
                            <button className={tool} onMouseDown={keep} onClick={() => setMark("x")} aria-pressed={activeLine.mark === "x"} title="Cross" aria-label="Cross"><Ico d="M6 6l12 12M18 6L6 18" sw={3} /></button>
                        </>
                    )}
                    <span className="w-px h-5 mx-1 opacity-30" style={{ background: c.ink }} />
                    <button className={`${tool} font-bold`} onMouseDown={keep} onClick={() => fmt("bold")} title="Bold" aria-label="Bold">B</button>
                    <button className={`${tool} italic`} onMouseDown={keep} onClick={() => fmt("italic")} title="Italic" aria-label="Italic">I</button>
                    <button className={`${tool} underline`} onMouseDown={keep} onClick={() => fmt("underline")} title="Underline" aria-label="Underline">U</button>
                    <button className={`${tool} line-through`} onMouseDown={keep} onClick={() => fmt("strikeThrough")} title="Strike through" aria-label="Strike through">S</button>
                    <button className={tool} onMouseDown={keep} onClick={highlight} title="Highlight" aria-label="Highlight"><span className="px-1 rounded" style={{ background: "#fff27a" }}>H</span></button>
                </div>
            )}

            {!note.collapsed && <Tags note={note} ink={c.ink} />}
            {note.from && !note.collapsed && <p className="px-4 pb-2 -mt-1 text-[10.5px] opacity-50 font-sans">From {note.from}</p>}
            {note.syncedTo && note.syncedTo.length > 0 && !note.collapsed && (
                <p className="px-4 pb-2 -mt-1 text-[10.5px] opacity-50 font-sans">Synced to {note.syncedTo[note.syncedTo.length - 1].name}</p>
            )}
        </article>
    );
}

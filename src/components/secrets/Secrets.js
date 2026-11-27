import "../tasks/tasks.css";
import { useContext, useEffect, useState } from "react";
import { WebSocketContext } from "../../utils/websocket";
import { SECRET_TTL, getSecrets, removeSecret, sealFor, subscribeSecrets } from "../../utils/secrets";
import { Sheet } from "../tasks/ui";
import { toast } from "../apps/jobs";

export const KeyIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="8" cy="15" r="4" /><path d="M10.8 12.2L20 3M16 7l3 3M14 9l2 2" />
    </svg>
);
const Eye = ({ off }) => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{off && <path d="M3 3l18 18" />}
    </svg>
);

// Send a password / code to your other devices only
export function SecretSheet({ onClose }) {
    const { socket, request } = useContext(WebSocketContext);
    const [peers, setPeers] = useState(null);
    const [picked, setPicked] = useState(() => new Set());
    const [label, setLabel] = useState("");
    const [secret, setSecret] = useState("");
    const [show, setShow] = useState(false);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        request("secret:peers", {}, 6000).then((r) => {
            const list = r && r.ok ? r.peers : [];
            setPeers(list);
            setPicked(new Set(list.map((p) => p.id)));
        });
    }, [request]);
    const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const send = async (close) => {
        if (!secret || !picked.size || busy || !socket) return;
        setBusy(true);
        try {
            const to = peers.filter((p) => picked.has(p.id));
            const sealed = await sealFor(to, { label: label.trim(), secret });
            const res = await request("secret:send", sealed, 10000);
            if (!res.ok || !res.sent) throw new Error(res.error || "none");
            setSecret("");
            toast({ text: `Secret sent to ${to.map((p) => p.name).join(", ")}`, ms: 4000 });
            close();
        } catch (e) {
            toast({ text: "Couldn't send the secret. Is the other device still open?", tone: "error", ms: 6000 });
        }
        setBusy(false);
    };
    return (
        <Sheet title="Send a secret" subtitle="Only your own devices get it. Encrypted on this device; never saved anywhere." onClose={onClose}
            footer={(close) => peers && peers.length > 0 && (
                <button onClick={() => send(close)} disabled={!secret || !picked.size || busy}
                    className="w-full h-11 rounded-2xl bg-[#001AFF] hover:bg-[#1a33ff] disabled:opacity-40 text-white text-[13px] font-semibold transition-colors">
                    {busy ? "Sending…" : !secret ? "Type the secret" : picked.size ? `Send to ${picked.size} device${picked.size > 1 ? "s" : ""}` : "Pick a device"}
                </button>
            )}>
            {(close) => peers === null ? <p className="text-[12px] text-gray-500">Looking for your devices…</p>
                : peers.length === 0 ? (
                    <p className="text-[12px] text-gray-400 leading-relaxed">None of your other devices has this room open right now. Open it there, then try again.</p>
                ) : (
                    <div className="space-y-3">
                        <input value={label} onChange={(e) => setLabel(e.target.value.slice(0, 80))} placeholder="What is it? (e.g. Wi-Fi password)" aria-label="Label"
                            className="w-full h-11 px-3.5 rounded-xl bg-[#111113] border border-[#2a2a30] text-white text-[13px] outline-none focus:border-[#4d63ff]" />
                        <div className="relative">
                            <input value={secret} onChange={(e) => setSecret(e.target.value.slice(0, 4000))} type={show ? "text" : "password"} placeholder="The secret" aria-label="Secret"
                                autoComplete="off" autoFocus onKeyDown={(e) => { if (e.key === "Enter") send(close); }}
                                className="w-full h-11 pl-3.5 pr-11 rounded-xl bg-[#111113] border border-[#2a2a30] text-white text-[13px] font-mono outline-none focus:border-[#4d63ff]" />
                            <button onClick={() => setShow((s) => !s)} aria-label={show ? "Hide secret" : "Show secret"} title={show ? "Hide" : "Show"}
                                className="absolute right-1.5 top-1.5 h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white"><Eye off={show} /></button>
                        </div>
                        <div className="space-y-1.5">
                            {peers.map((p) => (
                                <button key={p.id} onClick={() => toggle(p.id)} aria-pressed={picked.has(p.id)}
                                    className={`w-full flex items-center gap-3 rounded-2xl px-3.5 py-2.5 border text-left transition-colors ${picked.has(p.id) ? "bg-[#1d1d2a] border-[#4d63ff]/60" : "bg-[#151517] border-[#26262b] hover:border-[#3a3a42]"}`}>
                                    <span className={`h-5 w-5 rounded-md border-2 flex items-center justify-center ${picked.has(p.id) ? "border-[#4d63ff] bg-[#4d63ff]" : "border-[#45454d]"}`}>
                                        {picked.has(p.id) && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
                                    </span>
                                    <span className="text-[13px] font-semibold text-white truncate">{p.name}</span>
                                </button>
                            ))}
                        </div>
                        <p className="text-[10.5px] text-gray-500 leading-relaxed">It shows up hidden in Room notes on those devices and clears itself after {Math.round(SECRET_TTL / 60000)} minutes.</p>
                    </div>
                )}
        </Sheet>
    );
}

function SecretCard({ s, copy }) {
    const [show, setShow] = useState(false);
    const [now, setNow] = useState(Date.now());
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
    const mins = Math.max(1, Math.ceil((s.at + SECRET_TTL - now) / 60000));
    return (
        <div className="bg-[#1E1E1E] rounded-2xl p-4 border border-[#3a3420] shadow-lg text-left" data-secret={s.id}>
            <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0 text-[#f2c94c]">
                    <KeyIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider truncate">{s.label || "Secret"}</span>
                </span>
                <button onClick={() => removeSecret(s.id)} title="Remove from this device" aria-label="Remove secret" className="text-gray-500 hover:text-red-500">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
                <code className="flex-1 min-w-0 break-all text-white text-[13px] font-mono bg-[#121214] border border-[#2b2b2d] rounded-xl px-3 py-2" aria-label="Secret value">
                    {show ? s.secret : "•".repeat(Math.min(12, Math.max(6, s.secret.length)))}
                </code>
                <button onClick={() => setShow((x) => !x)} aria-label={show ? "Hide secret" : "Show secret"} title={show ? "Hide" : "Show"}
                    className="h-9 w-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white bg-[#171719] border border-[#2b2b2b]"><Eye off={show} /></button>
                <button onClick={(e) => copy(s.secret, e.currentTarget)} className="h-9 px-3 rounded-xl text-[11px] font-bold text-gray-300 bg-[#171719] border border-[#2b2b2b] hover:bg-[#252527]">Copy</button>
            </div>
            <p className="mt-2 text-[10px] text-gray-500">From {s.from} · only on your devices · clears in {mins} min</p>
        </div>
    );
}

// Secrets this device received (memory only)
export function SecretCards({ copy }) {
    const [list, setList] = useState(getSecrets);
    useEffect(() => subscribeSecrets(setList), []);
    if (!list.length) return null;
    return <>{list.map((s) => <SecretCard key={s.id} s={s} copy={copy} />)}</>;
}

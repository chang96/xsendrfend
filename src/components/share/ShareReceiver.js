import { useEffect, useMemo, useState } from "react";
import { getOwnedAliases, getLastAlias } from "../../utils/ownership";
import { deleteShare, getShare, pruneShares, setPendingShare, shareText } from "../../utils/pwa";
import markUrl from "../../assets/logo-mark.svg";

export function formatBytes(n) {
    if (!n && n !== 0) return "";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function FileGlyph({ type, name }) {
    const ext = (String(name).split(".").pop() || "").slice(0, 4).toUpperCase();
    const kind = /^video/.test(type) ? "#ff6b8b" : /^audio/.test(type) ? "#c792ea" : /pdf/.test(type) ? "#ff7b54" : /zip|compressed|rar|7z/.test(type) ? "#ffb44c" : "#8e9bff";
    return (
        <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 text-[9px] font-bold tracking-wide" style={{ backgroundColor: kind + "1f", color: kind, boxShadow: `inset 0 0 0 1px ${kind}33` }}>
            {ext || "FILE"}
        </div>
    );
}

function Thumb({ file }) {
    const url = useMemo(() => (/^image\//.test(file.type) && file.blob ? URL.createObjectURL(file.blob) : null), [file]);
    useEffect(() => () => url && URL.revokeObjectURL(url), [url]);
    return url
        ? <img src={url} alt="" className="h-11 w-11 rounded-xl object-cover flex-shrink-0 bg-[#222]" />
        : <FileGlyph type={file.type} name={file.name} />;
}

// faax.me/share?id=... : what Android's share sheet opens
export default function ShareReceiver({ id, error }) {
    const [share, setShare] = useState(undefined); // undefined = loading, null = missing
    const owned = getOwnedAliases();
    const [target, setTarget] = useState(() => (getLastAlias() ? { type: "alias", alias: getLastAlias() } : { type: "new" }));
    const [code, setCode] = useState("");

    useEffect(() => {
        pruneShares();
        if (!id) { setShare(null); return; }
        getShare(id).then((s) => setShare(s || null));
    }, [id]);

    const files = (share && share.files) || [];
    const text = shareText(share);
    const total = files.reduce((n, f) => n + (f.size || 0), 0);

    const send = () => {
        setPendingShare(id);
        if (target.type === "alias") window.location.replace("/" + target.alias);
        else if (target.type === "code") window.location.replace("/?join=" + encodeURIComponent(code.trim().toUpperCase()));
        else window.location.replace("/?new=1");
    };
    const cancel = async () => { if (id) await deleteShare(id); window.location.replace("/"); };
    const canSend = share && (files.length > 0 || text) && (target.type !== "code" || code.trim().length >= 4);

    return (
        <div className="flex flex-col items-center py-6 w-full max-w-sm mx-auto px-4">
            <div className="w-full bg-[#18181b] rounded-3xl border border-[#2a2a2e] shadow-2xl overflow-hidden text-left">
                <div className="flex items-center px-5 pt-5 pb-4">
                    <div className="h-10 w-10 rounded-2xl flex items-center justify-center mr-3 flex-shrink-0" style={{ background: "linear-gradient(135deg,#4357ff,#0a22ff 45%,#0012b8)" }}>
                        <img src={markUrl} alt="" className="h-6" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-white text-[15px] font-semibold tracking-tight">Send to your devices</h2>
                        <p className="text-[11px] text-gray-500">
                            {share === undefined ? "Opening…" : share ? `${files.length ? `${files.length} file${files.length > 1 ? "s" : ""} · ${formatBytes(total)}` : "Text"}` : " "}
                        </p>
                    </div>
                </div>

                {share === null || error ? (
                    <div className="px-5 pb-5">
                        <p className="text-[12px] text-gray-400 leading-relaxed">
                            {error ? "Something went wrong receiving that share. Try sharing it again." : "Nothing to send here. Shared files are kept for a day, then cleared."}
                        </p>
                        <button onClick={() => window.location.replace("/")} className="mt-4 w-full py-2.5 rounded-xl text-[12px] font-semibold text-white bg-[#25252b] hover:bg-[#2d2d34]">Open faax</button>
                    </div>
                ) : share === undefined ? (
                    <div className="px-5 pb-6 space-y-2">
                        {[0, 1].map((i) => <div key={i} className="h-14 rounded-2xl bg-[#1f1f23] animate-pulse" />)}
                    </div>
                ) : (
                    <>
                        <div className="px-3 max-h-[42vh] overflow-y-auto space-y-1.5">
                            {files.map((f, i) => (
                                <div key={i} className="flex items-center rounded-2xl bg-[#1d1d21] px-2.5 py-2">
                                    <Thumb file={f} />
                                    <div className="min-w-0 ml-3">
                                        <p className="text-[12px] text-gray-100 truncate">{f.name}</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">{formatBytes(f.size)}</p>
                                    </div>
                                </div>
                            ))}
                            {text && (
                                <div className="rounded-2xl bg-[#1d1d21] px-3.5 py-3 text-[12px] text-gray-200 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">{text}</div>
                            )}
                        </div>

                        <div className="px-5 pt-5">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">Send to</p>
                            <div className="flex flex-wrap gap-1.5">
                                {owned.map((a) => (
                                    <Pill key={a} active={target.type === "alias" && target.alias === a} onClick={() => setTarget({ type: "alias", alias: a })}>@{a}</Pill>
                                ))}
                                <Pill active={target.type === "code"} onClick={() => setTarget({ type: "code" })}>Room code</Pill>
                                <Pill active={target.type === "new"} onClick={() => setTarget({ type: "new" })}>New room</Pill>
                            </div>
                            {target.type === "code" && (
                                <input
                                    autoFocus
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                                    placeholder="ABCD"
                                    className="mt-2.5 w-full bg-[#121214] rounded-xl border border-[#2c2c31] focus:border-[#4d63ff]/70 px-3 py-2.5 text-white text-[13px] font-semibold tracking-[0.3em] uppercase outline-none"
                                />
                            )}
                            <p className="text-[10px] text-gray-500 mt-2.5 leading-relaxed">
                                {target.type === "alias"
                                    ? "Sends as soon as another of your devices has the room open. Nothing is stored on the server."
                                    : target.type === "new"
                                        ? "Opens a fresh 4-character room. Files go once someone joins with the code."
                                        : "Joins that room and sends once someone else is in it."}
                            </p>
                        </div>

                        <div className="flex space-x-2 px-5 pt-4 pb-5">
                            <button onClick={cancel} className="flex-1 py-3 rounded-xl text-[12px] font-semibold text-gray-300 bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                            <button
                                onClick={send}
                                disabled={!canSend}
                                className={`flex-[2] py-3 rounded-xl text-[12px] font-semibold transition-all ${
                                    canSend ? "text-white bg-[#001AFF] hover:bg-[#1a33ff] shadow-[0_8px_24px_-10px_rgba(0,26,255,0.9)] active:scale-[0.98]" : "text-gray-500 bg-[#25252a]"
                                }`}
                            >
                                Send{files.length > 1 ? ` ${files.length} files` : ""}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function Pill({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-all active:scale-95 ${
                active ? "bg-[#001AFF] border-transparent text-white" : "border-[#2f2f35] text-gray-400 hover:text-white"
            }`}
        >
            {children}
        </button>
    );
}

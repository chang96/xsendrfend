import { useContext, useEffect, useRef, useState } from "react";
import { WebSocketContext } from "../../utils/websocket";
import { aliasUrl } from "../../utils/ownership";
import { GhostButton, PrimaryButton, QRCode, RecoveryCodeBox, Sheet, Spinner, formatCode, useCopy } from "./ui";

// Room pill + share button for the chat header. Owners get a small menu behind the pill.
export default function RoomMenu({ roomName }) {
    const { aliasSession } = useContext(WebSocketContext);
    const [menuOpen, setMenuOpen] = useState(false);
    const [sheet, setSheet] = useState(null); // share | pair | devices | recovery
    const menuRef = useRef(null);

    const isAlias = typeof roomName === "string" && roomName.startsWith("@");
    const isOwner = isAlias && aliasSession && aliasSession.role === "owner";
    const alias = isAlias ? roomName.slice(1) : null;
    const shareUrl = isAlias ? aliasUrl(alias) : `${window.location.origin}/?join=${encodeURIComponent(roomName)}`;

    useEffect(() => {
        if (!menuOpen) return;
        const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
        document.addEventListener("mousedown", close);
        document.addEventListener("touchstart", close);
        return () => {
            document.removeEventListener("mousedown", close);
            document.removeEventListener("touchstart", close);
        };
    }, [menuOpen]);

    const open = (name) => { setMenuOpen(false); setSheet(name); };

    return (
        <>
            <div className="relative flex items-center space-x-1" ref={menuRef}>
                {isOwner ? (
                    <button
                        onClick={() => setMenuOpen((v) => !v)}
                        className="text-gray-300 hover:text-white text-[10px] font-bold px-2 py-0.5 rounded bg-[#242424] hover:bg-[#2c2c2c] flex items-center space-x-1 transition-colors"
                        title="Room menu"
                    >
                        <span>{roomName}</span>
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                ) : (
                    <span className="text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded bg-[#242424] select-all">{roomName}</span>
                )}

                <button
                    onClick={() => setSheet("share")}
                    className="p-1 rounded text-gray-500 hover:text-white transition-colors"
                    title="Share room (QR code)"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2" />
                    </svg>
                </button>

                {menuOpen && (
                    <div className="absolute left-0 top-7 z-40 w-44 bg-[#1E1E1F] border border-[#2b2b2b] rounded-xl shadow-2xl py-1 text-left backdrop-blur-md">
                        <MenuItem onClick={() => open("pair")}>Add a device</MenuItem>
                        <MenuItem onClick={() => open("devices")}>My devices</MenuItem>
                        <MenuItem onClick={() => open("recovery")}>New recovery code</MenuItem>
                        <div className="border-t border-[#2b2b2b] my-1" />
                        <MenuItem onClick={() => (window.location.href = "/?home=1")}>Exit to home</MenuItem>
                    </div>
                )}
            </div>

            {sheet === "share" && <ShareSheet url={shareUrl} label={isAlias ? `faax.me/${alias}` : `Room ${roomName}`} isAlias={isAlias} onClose={() => setSheet(null)} />}
            {sheet === "pair" && <PairSheet alias={alias} onClose={() => setSheet(null)} />}
            {sheet === "devices" && <DevicesSheet onClose={() => setSheet(null)} onAdd={() => setSheet("pair")} />}
            {sheet === "recovery" && <RecoverySheet alias={alias} onClose={() => setSheet(null)} />}
        </>
    );
}

function MenuItem({ children, onClick }) {
    return (
        <button onClick={onClick} className="w-full text-left px-3 py-2 text-[11px] text-gray-300 hover:text-white hover:bg-[#2a2a2a] transition-colors">
            {children}
        </button>
    );
}

function ShareSheet({ url, label, isAlias, onClose }) {
    const [copied, copy] = useCopy();
    const canShare = typeof navigator.share === "function";
    return (
        <Sheet title="Share this room" onClose={onClose}>
            <div className="flex flex-col items-center space-y-3">
                <QRCode value={url} />
                <p className="text-white text-xs font-semibold">{label}</p>
                <p className="text-[#777777] text-[11px] text-center leading-snug">
                    {isAlias ? "Scan to open. Guests wait until an owner device lets them in." : "Scan to join this room."}
                </p>
                <div className="flex w-full space-x-2">
                    <GhostButton onClick={() => copy(url)}>{copied ? "Copied ✓" : "Copy link"}</GhostButton>
                    {canShare && <GhostButton onClick={() => navigator.share({ url, title: label }).catch(() => {})}>Share…</GhostButton>}
                </div>
            </div>
        </Sheet>
    );
}

function PairSheet({ alias, onClose }) {
    const { socket, request } = useContext(WebSocketContext);
    const [pair, setPair] = useState(null); // { code, expiresAt }
    const [error, setError] = useState(null);
    const [now, setNow] = useState(Date.now());
    const [added, setAdded] = useState(false);
    const [copied, copy] = useCopy();

    const start = async () => {
        setError(null);
        setPair(null);
        const res = await request("alias:pair-start", {});
        if (res.ok) setPair(res);
        else setError(res.error === "rate_limited" ? "Too many codes, wait a few minutes." : "Couldn't create a code.");
    };

    useEffect(() => { start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    useEffect(() => {
        const onChanged = () => setAdded(true);
        socket.on("alias:devices-changed", onChanged);
        return () => socket.off("alias:devices-changed", onChanged);
    }, [socket]);

    const left = pair ? Math.max(0, Math.round((pair.expiresAt - now) / 1000)) : 0;
    const expired = pair && left === 0;
    const pairUrl = pair ? `${aliasUrl(alias)}?pair=${pair.code}` : "";

    return (
        <Sheet title="Add a device" onClose={onClose}>
            {added ? (
                <div className="flex flex-col items-center space-y-3 py-4">
                    <div className="h-10 w-10 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-lg">✓</div>
                    <p className="text-white text-xs font-semibold">Device added as an owner</p>
                    <PrimaryButton onClick={onClose}>Done</PrimaryButton>
                </div>
            ) : (
                <div className="flex flex-col items-center space-y-3">
                    <p className="text-[#777777] text-[11px] text-center leading-snug -mt-1">
                        Scan with your other phone or PC's camera. It becomes an owner of faax.me/{alias}.
                    </p>
                    {error && <p className="text-red-400 text-[11px]">{error}</p>}
                    {!pair && !error && <div className="h-[184px] flex items-center"><Spinner className="w-6 h-6" /></div>}
                    {pair && (
                        <>
                            <div className={expired ? "opacity-20 blur-[2px]" : ""}><QRCode value={pairUrl} /></div>
                            <div className="text-center">
                                <p className="text-[10px] text-gray-500">No camera? Open faax.me/{alias} → "I own this link" and type:</p>
                                <button onClick={() => copy(pair.code)} className="font-mono text-white text-sm tracking-widest mt-1 hover:text-[#8e9bff]" title="Copy code">
                                    {formatCode(pair.code)} {copied ? "✓" : ""}
                                </button>
                            </div>
                            <p className={`text-[10px] ${expired ? "text-red-400" : "text-gray-500"}`}>
                                {expired ? "Code expired" : `Expires in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} · works once`}
                            </p>
                            {expired && <PrimaryButton onClick={start}>New code</PrimaryButton>}
                        </>
                    )}
                </div>
            )}
        </Sheet>
    );
}

function timeAgo(ts) {
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

function DevicesSheet({ onClose, onAdd }) {
    const { socket, request } = useContext(WebSocketContext);
    const [devices, setDevices] = useState(null);
    const [confirming, setConfirming] = useState(null);
    const [error, setError] = useState(null);

    const load = async () => {
        const res = await request("alias:devices", {});
        if (res.ok) setDevices(res.devices);
        else setError("Couldn't load devices.");
    };

    useEffect(() => {
        load();
        socket.on("alias:devices-changed", load);
        return () => socket.off("alias:devices-changed", load);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const remove = async (deviceId) => {
        setConfirming(null);
        const res = await request("alias:device-remove", { deviceId });
        if (!res.ok) setError(res.error === "last_device" ? "You can't remove your only owner device." : "Couldn't remove that device.");
        load();
    };

    return (
        <Sheet title="My devices" onClose={onClose}>
            <p className="text-[#777777] text-[11px] leading-snug -mt-2 mb-3">
                Every device here is an owner: it can open the room, let guests in and manage devices.
            </p>
            {error && <p className="text-red-400 text-[11px] mb-2">{error}</p>}
            {!devices ? (
                <div className="flex justify-center py-6"><Spinner className="w-5 h-5" /></div>
            ) : (
                <div className="space-y-2 mb-4">
                    {devices.map((d) => (
                        <div key={d.deviceId} className="flex items-center justify-between bg-[#121212] border border-[#2b2b2b] rounded-xl px-3 py-2.5">
                            <div className="min-w-0">
                                <div className="flex items-center space-x-1.5">
                                    <span className={`h-1.5 w-1.5 rounded-full ${d.online ? "bg-green-500" : "bg-gray-600"}`} />
                                    <span className="text-white text-xs font-semibold truncate">{d.name}</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                    {d.current ? "This device" : d.online ? "Online now" : `Last seen ${timeAgo(d.lastSeenAt)}`}
                                </p>
                            </div>
                            {!d.current && (
                                confirming === d.deviceId ? (
                                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                                        <button onClick={() => setConfirming(null)} className="text-[10px] text-gray-400 hover:text-white px-2 py-1">Cancel</button>
                                        <button onClick={() => remove(d.deviceId)} className="text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg px-2 py-1">Remove</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setConfirming(d.deviceId)} className="text-[10px] text-gray-500 hover:text-red-400 flex-shrink-0 px-2 py-1">
                                        Remove
                                    </button>
                                )
                            )}
                        </div>
                    ))}
                </div>
            )}
            <PrimaryButton onClick={onAdd}>Add a device</PrimaryButton>
        </Sheet>
    );
}

function RecoverySheet({ alias, onClose }) {
    const { request } = useContext(WebSocketContext);
    const [code, setCode] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const rotate = async () => {
        setBusy(true);
        const res = await request("alias:recovery-rotate", {});
        setBusy(false);
        if (res.ok) setCode(res.recoveryCode);
        else setError("Couldn't create a new code.");
    };

    return (
        <Sheet title="Recovery code" onClose={onClose}>
            {code ? (
                <div className="space-y-3">
                    <p className="text-[#777777] text-[11px] leading-snug">Your new recovery code. The old one no longer works. Save this now, it won't be shown again.</p>
                    <RecoveryCodeBox alias={alias} code={code} />
                    <PrimaryButton onClick={onClose}>Done</PrimaryButton>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-[#777777] text-[11px] leading-snug">
                        Lost or never saved your recovery code? Make a new one. Your old code will stop working immediately.
                    </p>
                    {error && <p className="text-red-400 text-[11px]">{error}</p>}
                    <PrimaryButton disabled={busy} onClick={rotate}>{busy ? <Spinner /> : <span>Make a new code</span>}</PrimaryButton>
                </div>
            )}
        </Sheet>
    );
}

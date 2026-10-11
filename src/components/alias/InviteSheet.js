import { useContext, useEffect, useState } from "react";
import { WebSocketContext } from "../../utils/websocket";
import { QRCode, Spinner, useCopy } from "./ui";
import { getOwnership } from "../../utils/ownership";
import { canMakeCodes, makeInviteCode } from "../../utils/invites";

const VALIDITY = [{ days: 1, label: "1 day" }, { days: 7, label: "7 days" }, { days: 30, label: "30 days" }];

export const inviteLink = (path, code) => `${window.location.origin}${path}${path.includes("?") ? "&" : "?"}code=${code}`;

const until = (ts) => new Date(ts).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

// Owner side: a fresh access code every time this opens (or the validity changes), made and signed
// on this device. Anyone with the link (or the code) walks straight in until it expires; no "Let in"
// needed, and nothing about the code is stored on the server.
export function InviteBody({ alias, path, label }) {
    const { request } = useContext(WebSocketContext);
    const [days, setDays] = useState(7);
    const [invite, setInvite] = useState(null);
    const [error, setError] = useState(null);
    const [confirmRevoke, setConfirmRevoke] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [copied, copy] = useCopy();
    const canShare = typeof navigator.share === "function";

    const mint = async (d) => {
        setInvite(null); setError(null);
        const creds = getOwnership(alias);
        if (!creds || !canMakeCodes()) { setError("Codes can only be made on one of your own devices, over a secure connection."); return; }
        try { setInvite(await makeInviteCode(alias, creds, d)); } catch (e) { setError("Couldn't make a code on this device."); }
    };
    useEffect(() => { mint(days); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

    const revoke = async () => {
        if (!confirmRevoke) { setConfirmRevoke(true); return; }
        setConfirmRevoke(false);
        const res = await request("alias:invites-revoke", {});
        if (res.ok) {
            setInvite(null);
            setError("Every code made so far is cancelled. People already inside stay until they leave.");
            // codes are stamped by the minute: a fresh one is made as the next minute starts
            setTimeout(() => mint(days), Math.max(0, (res.newCodesFrom || Date.now()) - Date.now()) + 300);
        }
        else setError("Couldn't reach faax to cancel codes. Try again when you're online.");
    };

    const url = invite ? inviteLink(path || `/${alias}`, invite.code.replace(/-/g, "")) : "";

    return (
        <div className="flex flex-col items-center space-y-3">
            {/* The link is the main thing: paste it anywhere (WhatsApp, SMS, email), one tap gets people in */}
            <div className="w-full">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500 mb-1.5">Invite link</p>
                <div className="w-full flex items-center bg-[#121212] border border-[#2b2b2b] rounded-xl pl-3 pr-1 py-1 min-h-[42px]">
                    {invite ? (
                        <a href={url} onClick={(e) => { e.preventDefault(); copy(url, "link"); }} title="Copy invite link" className="flex-1 min-w-0 truncate text-[11.5px] text-[#a9b3ff] select-all">
                            {url.replace(/^https?:\/\//, "")}
                        </a>
                    ) : (
                        <span className="flex-1 flex items-center text-[11px] text-gray-600">{error ? "No link" : <><Spinner className="w-3.5 h-3.5 mr-2" />Making a code…</>}</span>
                    )}
                    <button onClick={() => invite && copy(url, "link")} disabled={!invite}
                        className="ml-2 h-8 px-3 rounded-lg bg-[#001AFF] hover:bg-[#1a33ff] disabled:opacity-40 text-white text-[11px] font-semibold flex-shrink-0">
                        {copied === "link" ? "Copied ✓" : "Copy"}
                    </button>
                </div>
            </div>
            {invite && (
                <>
                    {canShare && (
                        <button onClick={() => navigator.share({ url, title: label, text: `Join ${label} on faax: tap the link (code ${invite.code})` }).catch(() => {})}
                            className="w-full py-2.5 rounded-xl text-[12px] font-semibold text-white bg-[#1c1c22] border border-[#2f2f37] hover:border-[#45454d]">
                            Send the link…
                        </button>
                    )}
                    <p className="text-[#8a8a93] text-[11px] text-center leading-snug">
                        Anyone with this link gets into {label} straight away until <span className="text-gray-300">{until(invite.expiresAt)}</span>. No need for you to tap "Let in".
                    </p>
                    <div className="w-full flex items-center justify-between gap-2 rounded-xl bg-[#151517] border border-[#26262b] px-3 py-2">
                        <span className="text-[10px] text-gray-500 flex-shrink-0">or the code</span>
                        <button onClick={() => copy(invite.code, "code")} title="Copy code" className="font-mono text-white text-[12.5px] tracking-[0.06em] whitespace-nowrap hover:text-[#8e9bff]">
                            {copied === "code" ? "Copied ✓" : invite.code}
                        </button>
                    </div>
                    <button onClick={() => setShowQr((v) => !v)} className="text-[11px] text-gray-500 hover:text-white">{showQr ? "Hide QR code" : "Show QR code"}</button>
                    {showQr && <QRCode value={url} />}
                </>
            )}
            {error && <p className="text-[11px] text-amber-300 text-center">{error}</p>}
            <div className="w-full pt-1">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500 mb-1.5 text-center">Valid for</p>
                <div className="flex bg-[#121212] p-1 rounded-xl border border-[#2b2b2b]">
                    {VALIDITY.map((v) => (
                        <button key={v.days} onClick={() => setDays(v.days)} aria-pressed={days === v.days}
                            className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${days === v.days ? "bg-[#2a2a31] text-white" : "text-gray-500 hover:text-gray-300"}`}>
                            {v.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="w-full flex items-center justify-between pt-1">
                <button onClick={() => mint(days)} className="text-[11px] text-[#8e9bff] hover:text-white">New code</button>
                <button onClick={revoke} onBlur={() => setConfirmRevoke(false)} className={`text-[11px] ${confirmRevoke ? "text-[#ff8fa3] font-semibold" : "text-gray-500 hover:text-[#ff8fa3]"}`}>
                    {confirmRevoke ? "Tap again to cancel all codes" : "Cancel all codes"}
                </button>
            </div>
        </div>
    );
}

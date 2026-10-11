import { useContext, useEffect, useState } from "react";
import { WebSocketContext } from "../../utils/websocket";
import { GhostButton, QRCode, Spinner, useCopy } from "./ui";
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
            <div className="relative">
                <div className={invite ? "" : "opacity-20 blur-[2px]"}><QRCode value={url || window.location.origin} /></div>
                {!invite && !error && <div className="absolute inset-0 flex items-center justify-center"><Spinner className="w-5 h-5" /></div>}
            </div>
            {invite && (
                <>
                    <div className="text-center">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Access code</p>
                        <button onClick={() => copy(invite.code, "code")} title="Copy code" className="font-mono text-white text-[15px] tracking-[0.12em] mt-0.5 hover:text-[#8e9bff]">{invite.code}</button>
                    </div>
                    <p className="text-[#8a8a93] text-[11px] text-center leading-snug">
                        Anyone with this link or code gets into {label} straight away until <span className="text-gray-300">{until(invite.expiresAt)}</span>. No need for you to be online.
                    </p>
                    <div className="flex w-full space-x-2">
                        <GhostButton onClick={() => copy(url, "link")}>{copied === "link" ? "Copied ✓" : copied === "code" ? "Code copied ✓" : "Copy link"}</GhostButton>
                        {canShare && <GhostButton onClick={() => navigator.share({ url, title: label, text: `Join ${label} on faax (code ${invite.code})` }).catch(() => {})}>Share…</GhostButton>}
                    </div>
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

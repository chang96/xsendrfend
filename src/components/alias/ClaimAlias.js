import { useContext, useEffect, useRef, useState } from "react";
import { WebSocketContext } from "../../utils/websocket";
import { deviceLabel, normalizeAlias, saveOwnership } from "../../utils/ownership";
import { PrimaryButton, RecoveryCodeBox, Spinner } from "./ui";

const REASONS = {
    too_short: "At least 3 characters.",
    too_long: "20 characters max.",
    invalid_chars: "Use letters, numbers and single dashes (not at the start or end).",
    reserved: "That name is reserved.",
    taken: "Already claimed.",
    rate_limited: "Too many attempts, try again later.",
    timeout: "Can't reach the server, check your connection.",
};

// Step 1: pick a free name. Step 2: show the recovery code once. Then enter the room as owner.
export default function ClaimAlias({ initial = "", onCancel }) {
    const { request, enterAsOwner } = useContext(WebSocketContext);
    const [value, setValue] = useState(normalizeAlias(initial));
    const [status, setStatus] = useState(null); // null | "checking" | { available, reason }
    const [claiming, setClaiming] = useState(false);
    const [error, setError] = useState(null);
    const [claimed, setClaimed] = useState(null); // { alias, deviceId, key, recoveryCode }
    const seq = useRef(0);

    useEffect(() => {
        const alias = normalizeAlias(value);
        setError(null);
        if (!alias) { setStatus(null); return; }
        setStatus("checking");
        const mine = ++seq.current;
        const t = setTimeout(async () => {
            const res = await request("alias:check", { alias });
            if (mine !== seq.current) return;
            setStatus(res.ok ? res : { available: false, reason: res.error });
        }, 300);
        return () => clearTimeout(t);
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    const alias = normalizeAlias(value);
    const canClaim = status && status !== "checking" && status.available && !claiming;

    const claim = async () => {
        setClaiming(true);
        setError(null);
        const res = await request("alias:claim", { alias, deviceName: deviceLabel() });
        setClaiming(false);
        if (!res.ok) {
            setError(REASONS[res.error] || "Something went wrong, try again.");
            if (res.error === "taken") setStatus({ available: false, reason: "taken" });
            return;
        }
        saveOwnership(res.alias, { deviceId: res.deviceId, key: res.key });
        setClaimed(res);
    };

    const enter = async () => {
        window.history.replaceState(null, "", "/" + claimed.alias);
        const res = await enterAsOwner(claimed.alias, claimed);
        if (!res.ok) setError("Claimed, but couldn't open the room. Refresh to try again.");
    };

    if (claimed) {
        return (
            <div className="w-80 bg-[#1E1E1E] rounded-2xl p-6 border border-[#2b2b2b] shadow-xl flex flex-col space-y-4 text-left">
                <div>
                    <h3 className="text-white text-sm font-semibold tracking-wide">faax.me/{claimed.alias} is yours 🎉</h3>
                    <p className="text-[#777777] text-[11px] leading-snug mt-1">
                        This device is now an owner. Save this recovery code: it's the only way back in if you
                        ever lose all your devices. It won't be shown again.
                    </p>
                </div>
                <RecoveryCodeBox alias={claimed.alias} code={claimed.recoveryCode} />
                {error && <p className="text-red-400 text-[11px]">{error}</p>}
                <PrimaryButton onClick={enter}>Open my room</PrimaryButton>
                <p className="text-[10px] text-gray-600 text-center -mt-1">
                    Tip: add your phone or other PC from the room menu so they're owners too.
                </p>
            </div>
        );
    }

    let hint = null;
    if (status === "checking") hint = <span className="text-gray-500 flex items-center space-x-1.5"><Spinner className="w-3 h-3" /><span>Checking…</span></span>;
    else if (status && status.available) hint = <span className="text-green-400">✓ faax.me/{alias} is available</span>;
    else if (status && status.reason === "taken") hint = (
        <span className="text-red-400">
            Already claimed. <a className="underline text-gray-300 hover:text-white" href={"/" + alias}>Is it yours?</a>
        </span>
    );
    else if (status) hint = <span className="text-red-400">{REASONS[status.reason] || "Not available."}</span>;

    return (
        <div className="w-80 bg-[#1E1E1E] rounded-2xl p-6 border border-[#2b2b2b] hover:border-[#001AFF]/40 shadow-xl transition-all duration-300 flex flex-col space-y-4 text-left">
            <div>
                <h3 className="text-white text-sm font-semibold tracking-wide">Claim your own link</h3>
                <p className="text-[#777777] text-[11px] leading-snug mt-0.5">
                    A permanent room you can open from any of your devices. No sign-up.
                </p>
            </div>

            <div className="flex items-center bg-[#121212] rounded-xl border border-[#2b2b2b] focus-within:border-[#001AFF] px-3 py-1 transition-all duration-150">
                <span className="text-gray-500 text-xs font-semibold">faax.me/</span>
                <input
                    autoFocus
                    type="text"
                    value={value}
                    maxLength={20}
                    onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    onKeyDown={(e) => { if (e.key === "Enter" && canClaim) claim(); }}
                    placeholder="yourname"
                    className="flex-1 min-w-0 bg-transparent text-white text-xs py-1.5 focus:outline-none placeholder-gray-600 font-semibold"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck="false"
                />
            </div>
            <div className="text-[11px] min-h-[16px] -mt-2">{hint}</div>

            {error && <p className="text-red-400 text-[11px] -mt-2">{error}</p>}

            <PrimaryButton disabled={!canClaim} onClick={claim}>
                {claiming ? <><Spinner /><span>Claiming…</span></> : <span>Claim</span>}
            </PrimaryButton>
            {onCancel && (
                <button onClick={onCancel} className="text-[11px] text-gray-500 hover:text-white transition-colors -mt-1">
                    ← Back
                </button>
            )}
        </div>
    );
}

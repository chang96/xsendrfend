import { useContext, useEffect, useRef, useState } from "react";
import { WebSocketContext } from "../../utils/websocket";
import {
    ALIAS_RE, deviceLabel, getGuestPass, getOwnership, normalizeAlias, removeOwnership, saveOwnership,
} from "../../utils/ownership";
import ClaimAlias from "./ClaimAlias";
import { PrimaryButton, Spinner } from "./ui";

function Card({ children }) {
    return (
        <div className="w-80 bg-[#1E1E1E] rounded-2xl p-6 border border-[#2b2b2b] shadow-xl flex flex-col space-y-4 text-left">
            {children}
        </div>
    );
}

const HomeLink = () => (
    <a href="/?home=1" className="text-[11px] text-gray-500 hover:text-white transition-colors text-center">
        ← faax.me home
    </a>
);

// faax.me/<alias>: owners walk straight in, new owner devices pair, everyone else knocks.
export default function AliasGate({ alias: rawAlias, pairCode, removed }) {
    const alias = normalizeAlias(rawAlias);
    const { socket, request, enterAsOwner, rejoinAsGuest } = useContext(WebSocketContext);
    const [stage, setStage] = useState("loading"); // loading | invalid | claim | waiting | denied | prove | error
    const [ownersOnline, setOwnersOnline] = useState(0);
    const [notice, setNotice] = useState(removed ? "This device was removed as an owner." : null);
    const knockId = useRef(null);
    const started = useRef(false);

    const knock = async () => {
        setStage("loading");
        const res = await request("alias:knock", { alias, name: deviceLabel() });
        if (res.ok && res.admitted) return; // already inside
        if (!res.ok) {
            setStage(res.error === "not_found" ? "claim" : "error");
            return;
        }
        knockId.current = res.requestId;
        setOwnersOnline(res.ownersOnline);
        setStage("waiting");
    };

    const cancelKnock = () => {
        if (knockId.current) socket.emit("alias:cancel-knock", { requestId: knockId.current });
        knockId.current = null;
    };

    useEffect(() => {
        if (started.current) return; // StrictMode double-invoke guard
        started.current = true;

        if (!ALIAS_RE.test(alias)) { setStage("invalid"); return; }

        (async () => {
            // 1) Scanned a pairing QR from one of my owner devices
            if (pairCode) {
                const res = await request("alias:pair-redeem", { alias, code: pairCode, deviceName: deviceLabel() });
                window.history.replaceState(null, "", "/" + alias);
                if (res.ok) {
                    saveOwnership(alias, res);
                } else {
                    setNotice(res.error === "rate_limited"
                        ? "Too many attempts. Wait a few minutes and try again."
                        : "That pairing code expired or was already used. Make a new one on your other device.");
                }
            }

            // 2) I'm already an owner on this device
            const creds = getOwnership(alias);
            if (creds) {
                const res = await enterAsOwner(alias, creds);
                if (res.ok) return;
                if (res.error === "not_owner" || res.error === "not_found") {
                    removeOwnership(alias);
                    setNotice("This device is no longer an owner of this link.");
                } else {
                    setStage("error");
                    return;
                }
            }

            // 3) I was let in earlier in this tab
            const pass = getGuestPass(alias);
            if (pass) {
                const res = await rejoinAsGuest(alias, pass);
                if (res.ok) return;
            }

            // 4) Free name -> offer to claim it, otherwise knock
            const check = await request("alias:check", { alias });
            if (!check.ok) { setStage("error"); return; }
            if (!check.valid) { setStage("invalid"); return; }
            if (check.available) { setStage("claim"); return; }
            knock();
        })();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Denied by the owner
    useEffect(() => {
        const onDenied = (data) => {
            if (normalizeAlias(data.alias) !== alias) return;
            knockId.current = null;
            setStage("denied");
        };
        socket.on("alias:denied", onDenied);
        return () => socket.off("alias:denied", onDenied);
    }, [socket, alias]);

    // If the socket reconnects while waiting, the server forgot the knock: knock again
    useEffect(() => {
        const onReconnect = () => { if (stage === "waiting") knock(); };
        socket.on("connect", onReconnect);
        return () => socket.off("connect", onReconnect);
    }, [socket, stage]); // eslint-disable-line react-hooks/exhaustive-deps

    const Notice = notice ? (
        <div className="w-80 mb-3 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 text-left">
            {notice}
        </div>
    ) : null;

    if (stage === "claim") {
        return (
            <div className="flex flex-col items-center py-6">
                {Notice}
                <ClaimAlias initial={alias} onCancel={() => (window.location.href = "/?home=1")} />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-6 w-full max-w-sm mx-auto">
            {Notice}
            {stage === "loading" && (
                <Card>
                    <div className="flex items-center space-x-3">
                        <Spinner className="w-5 h-5" />
                        <span className="text-gray-300 text-xs">Opening faax.me/{alias}…</span>
                    </div>
                </Card>
            )}

            {stage === "invalid" && (
                <Card>
                    <h3 className="text-white text-sm font-semibold">That's not a valid link</h3>
                    <p className="text-[#777777] text-[11px]">Room links are 3–20 letters, numbers or dashes.</p>
                    <HomeLink />
                </Card>
            )}

            {stage === "waiting" && (
                <Card>
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-[#001AFF]/10 rounded-xl"><Spinner className="w-5 h-5" /></div>
                        <div>
                            <h3 className="text-white text-sm font-semibold tracking-wide">Waiting for {alias} to let you in…</h3>
                            <p className="text-[#777777] text-[11px] leading-snug mt-0.5">
                                {ownersOnline > 0
                                    ? "They've been asked on their device."
                                    : `${alias} isn't online right now. You'll get in as soon as they open their room.`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { cancelKnock(); setStage("prove"); }}
                        className="text-[11px] text-gray-500 hover:text-white transition-colors"
                    >
                        I own this link
                    </button>
                </Card>
            )}

            {stage === "denied" && (
                <Card>
                    <h3 className="text-white text-sm font-semibold">You weren't let in</h3>
                    <p className="text-[#777777] text-[11px]">The owner of faax.me/{alias} declined the request.</p>
                    <PrimaryButton onClick={knock}>Ask again</PrimaryButton>
                    <HomeLink />
                </Card>
            )}

            {stage === "prove" && (
                <ProveOwnership
                    alias={alias}
                    onBack={knock}
                    onProved={async (creds) => {
                        saveOwnership(alias, creds);
                        const res = await enterAsOwner(alias, creds);
                        if (!res.ok) setStage("error");
                    }}
                />
            )}

            {stage === "error" && (
                <Card>
                    <h3 className="text-white text-sm font-semibold">Couldn't open faax.me/{alias}</h3>
                    <p className="text-[#777777] text-[11px]">Check your connection and try again.</p>
                    <PrimaryButton onClick={() => window.location.reload()}>Retry</PrimaryButton>
                </Card>
            )}
        </div>
    );
}

// New device proving ownership: 10-char pairing code (from an owner device) or 20-char recovery code
function ProveOwnership({ alias, onBack, onProved }) {
    const { request } = useContext(WebSocketContext);
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const kind = clean.length === 10 ? "pair" : clean.length === 20 ? "recover" : null;

    const submit = async () => {
        if (!kind) return;
        setBusy(true);
        setError(null);
        const res = kind === "pair"
            ? await request("alias:pair-redeem", { alias, code: clean, deviceName: deviceLabel() })
            : await request("alias:recover", { alias, recoveryCode: clean, deviceName: deviceLabel() });
        setBusy(false);
        if (res.ok) return onProved(res);
        setError(res.error === "rate_limited"
            ? "Too many attempts. Wait a few minutes and try again."
            : kind === "pair" ? "That pairing code is wrong, expired or already used." : "That recovery code is wrong.");
    };

    return (
        <Card>
            <div>
                <h3 className="text-white text-sm font-semibold tracking-wide">Prove you own faax.me/{alias}</h3>
                <p className="text-[#777777] text-[11px] leading-snug mt-1">
                    On a device that's already an owner, open the room menu → <span className="text-gray-300">Add a device</span> and
                    scan the QR, or type its code here. Lost every device? Enter your recovery code.
                </p>
            </div>
            <input
                autoFocus
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                placeholder="Pairing or recovery code"
                className="bg-[#121212] rounded-xl border border-[#2b2b2b] focus:border-[#001AFF] px-3 py-2.5 text-white text-xs font-mono tracking-wider uppercase placeholder-gray-600 placeholder:normal-case placeholder:tracking-normal focus:outline-none"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck="false"
            />
            {error && <p className="text-red-400 text-[11px] -mt-2">{error}</p>}
            <PrimaryButton disabled={!kind || busy} onClick={submit}>
                {busy ? <><Spinner /><span>Checking…</span></> : <span>{kind === "recover" ? "Use recovery code" : "Pair this device"}</span>}
            </PrimaryButton>
            <button onClick={onBack} className="text-[11px] text-gray-500 hover:text-white transition-colors">
                ← Just ask to join instead
            </button>
        </Card>
    );
}

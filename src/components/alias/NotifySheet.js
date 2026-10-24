import { useContext, useEffect, useState } from "react";
import { WebSocketContext } from "../../utils/websocket";
import { disablePush, enablePush, getPushState } from "../../utils/push";
import { GhostButton, PrimaryButton, Sheet, Spinner } from "./ui";
import { InstallSheet } from "../share/InstallSheet";

const WHAT = [
    "A file or note is sent to you while faax is closed on this device",
    "Someone knocks to join your room",
    "An app you're building is ready",
];

// Per device: turn notifications on/off and send a test
export default function NotifySheet({ onClose }) {
    const { request } = useContext(WebSocketContext);
    const [state, setState] = useState(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const [install, setInstall] = useState(false);

    useEffect(() => { getPushState().then(setState); }, []);

    const turnOn = async () => {
        setBusy(true); setMsg(null);
        const res = await enablePush(request).catch(() => ({ ok: false }));
        setBusy(false);
        setState(res.state || (await getPushState()));
        if (!res.ok && !res.state) setMsg("Couldn't turn them on here. Try again in a moment.");
    };
    const test = async () => {
        setBusy(true); setMsg(null);
        const res = await request("push:test", {});
        setBusy(false);
        setMsg(res.ok && res.sent ? "Sent. It should pop up in a few seconds." : res.error === "rate_limited" ? "That's a few tests already. Try later." : "Couldn't send a test. Turn notifications off and on again.");
    };
    const turnOff = async () => { setBusy(true); await disablePush(request); setBusy(false); setState("off"); setMsg(null); };

    if (install) return <InstallSheet onClose={() => setInstall(false)} />;

    return (
        <Sheet title="Notifications" onClose={onClose}>
            <div className="space-y-3 text-left">
                <p className="text-[11.5px] text-gray-400 leading-relaxed">On this device, get a notification when:</p>
                <ul className="space-y-1.5">
                    {WHAT.map((w) => (
                        <li key={w} className="flex items-start text-[11.5px] text-gray-300 leading-snug">
                            <span className="mt-[5px] mr-2 h-1.5 w-1.5 rounded-full bg-[#4d63ff] flex-shrink-0" />{w}
                        </li>
                    ))}
                </ul>
                <p className="text-[10.5px] text-gray-500 leading-relaxed">
                    Files never travel inside a notification: tap it and the file comes straight from your other device, which needs to stay open until it arrives.
                </p>

                {state === null && <div className="flex justify-center py-2"><Spinner className="w-4 h-4" /></div>}
                {state === "on" && (
                    <>
                        <p className="text-[12px] text-[#3ddc97] font-semibold">On for this device ✓</p>
                        <div className="flex space-x-2">
                            <GhostButton onClick={test}>{busy ? "…" : "Send a test"}</GhostButton>
                            <GhostButton onClick={turnOff}>Turn off</GhostButton>
                        </div>
                    </>
                )}
                {state === "off" && <PrimaryButton onClick={turnOn} disabled={busy}>{busy ? "Turning on…" : "Turn on notifications"}</PrimaryButton>}
                {state === "denied" && <p className="text-[11.5px] text-amber-300 leading-relaxed">Notifications are blocked for faax. Allow them in this browser's site settings, then come back here.</p>}
                {state === "ios-install" && (
                    <>
                        <p className="text-[11.5px] text-amber-200/90 leading-relaxed">On iPhone and iPad, notifications only work once faax is on your Home Screen. Install it, open it from there, and turn them on in this menu.</p>
                        <GhostButton onClick={() => setInstall(true)}>How to install</GhostButton>
                    </>
                )}
                {state === "unsupported" && <p className="text-[11.5px] text-gray-400">This browser can't show faax notifications. Chrome, Edge, Firefox and Safari can.</p>}
                {msg && <p className="text-[11px] text-gray-300">{msg}</p>}
            </div>
        </Sheet>
    );
}

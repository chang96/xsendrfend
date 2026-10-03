import { useEffect, useState } from "react";
import { Sheet } from "../alias/ui";
import { getInstallState, onInstallStateChange, promptInstall } from "../../utils/pwa";
import iconUrl from "../../assets/logo-mark.svg";

export function useInstallState() {
    const [state, setState] = useState(getInstallState());
    useEffect(() => onInstallStateChange(setState), []);
    return state;
}

const ShareGlyph = () => (
    <svg className="inline w-4 h-4 -mt-0.5 text-[#4d9bff]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
);

// One entry point for "Install app": native prompt where possible, Add-to-Home-Screen steps on iPhone
export function InstallSheet({ onClose }) {
    const state = useInstallState();
    return (
        <Sheet title="Install faax" onClose={onClose}>
            <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-[1.1rem] flex items-center justify-center shadow-[0_10px_30px_-10px_rgba(0,26,255,0.9)]" style={{ background: "linear-gradient(135deg,#4357ff,#0a22ff 45%,#0012b8)" }}>
                    <img src={iconUrl} alt="" className="h-9" />
                </div>
                <p className="text-[12px] text-gray-400 mt-3 leading-relaxed">
                    Opens full-screen from your home screen, like any other app.
                    {state !== "ios" && " On Android it also shows up in the share menu, so you can send photos and files straight from your gallery."}
                </p>
            </div>
            {state === "ios" ? (
                <ol className="mt-4 space-y-2 text-left">
                    {[
                        <>Tap the Share button <ShareGlyph /> in Safari's toolbar</>,
                        <>Scroll down and tap <span className="text-white font-semibold">Add to Home Screen</span></>,
                        <>Tap <span className="text-white font-semibold">Add</span>. faax appears on your home screen</>,
                    ].map((step, i) => (
                        <li key={i} className="flex items-start rounded-xl bg-[#121212] border border-[#2b2b2b] px-3 py-2.5">
                            <span className="h-5 w-5 rounded-full bg-[#001AFF] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mr-2.5">{i + 1}</span>
                            <span className="text-[12px] text-gray-300 leading-snug">{step}</span>
                        </li>
                    ))}
                    <li className="text-[10px] text-gray-500 px-1 pt-1">iPhone doesn't let web apps appear in the share menu, so send files from inside faax.</li>
                </ol>
            ) : state === "prompt" ? (
                <button
                    onClick={async () => { await promptInstall(); onClose(); }}
                    className="mt-5 w-full py-3 rounded-xl text-[12px] font-semibold text-white bg-[#001AFF] hover:bg-blue-700 shadow-[0_8px_24px_-10px_rgba(0,26,255,0.9)]"
                >
                    Install
                </button>
            ) : state === "installed" ? (
                <p className="mt-5 text-center text-[12px] text-green-400">You're already using the app ✓</p>
            ) : (
                <p className="mt-5 text-[11px] text-gray-500 text-center leading-relaxed">
                    Open your browser's menu and choose <span className="text-gray-300">Install app</span> or <span className="text-gray-300">Add to Home screen</span>.
                </p>
            )}
        </Sheet>
    );
}

// Small text button that only appears when installing makes sense
export function InstallLink({ className = "" }) {
    const state = useInstallState();
    const [open, setOpen] = useState(false);
    if (state === "installed" || state === "none") return null;
    return (
        <>
            <button onClick={() => setOpen(true)} className={`inline-flex items-center text-[11px] text-gray-500 hover:text-white transition-colors ${className}`}>
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" /></svg>
                Install the app
            </button>
            {open && <InstallSheet onClose={() => setOpen(false)} />}
        </>
    );
}

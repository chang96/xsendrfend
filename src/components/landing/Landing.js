import "./landing.css";
import RoomAnimation from "./RoomAnimation";
import { InstallLink } from "../share/InstallSheet";
import markUrl from "../../assets/logo-mark.svg";

const Icon = {
    send: <path d="M12 19V5m0 0l-6 6m6-6l6 6" />,
    notes: <path d="M8 10h8M8 14h5M6 4h12a2 2 0 012 2v9l-5 5H6a2 2 0 01-2-2V6a2 2 0 012-2z" />,
    plan: <path d="M9 11l2 2 4-4M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />,
    play: <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />,
};

const FEATURES = [
    { key: "send", color: "#4d63ff", title: "Send anything", body: "Files, photos and links go straight to your other device. Never stored on our servers." },
    { key: "notes", color: "#3ddc97", title: "Notes & chat", body: "Notes and messages that sync between everyone in the room as you type." },
    { key: "plan", color: "#ffb44c", title: "Plan your day", body: "Dump what's on your mind; it's organised into today's list and your goals.", tag: "Your link" },
    { key: "play", color: "#c792ea", title: "Play & learn together", body: "Describe a game or puzzle, then play it with whoever's in the room.", tag: "Soon" },
];

export function TopBar() {
    return (
        <header className="flex items-center justify-between px-4 sm:px-0 pt-4 sm:pt-0 pb-2 sm:pb-6">
            <a href="/?home=1" className="flex items-center group" aria-label="faax home">
                <span
                    className="h-8 w-8 rounded-[10px] flex items-center justify-center mr-2.5 shadow-[0_6px_18px_-8px_rgba(0,26,255,0.9)] transition-transform group-hover:scale-105"
                    style={{ background: "linear-gradient(135deg,#4357ff,#0a22ff 45%,#0012b8)" }}
                >
                    <img src={markUrl} alt="" className="h-[18px]" />
                </span>
                <span className="text-white text-[17px] font-semibold tracking-tight">faax</span>
            </a>
            <InstallLink />
        </header>
    );
}

export function Hero({ compact }) {
    return (
        <div className={`landing-rise w-full ${compact ? "px-5 pt-3 pb-1 text-left" : "max-w-[520px] text-left"}`}>
            {!compact && (
                <div className="inline-flex items-center rounded-full border border-[#26262c] bg-[#141416] pl-2 pr-3 py-1 mb-5">
                    <span className="relative flex h-2 w-2 mr-2">
                        <span className="landing-ping absolute inline-flex h-full w-full rounded-full bg-[#3ddc97]" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3ddc97]" />
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">Private rooms · no sign-up</span>
                </div>
            )}
            <h1 className={`landing-h1 text-white font-semibold ${compact ? "text-[27px] leading-[1.1]" : "text-[44px] leading-[1.05]"}`}>
                Your devices and your people,{" "}
                <span className="landing-gradient-text">in one room.</span>
            </h1>
            <p className={`text-gray-400 ${compact ? "text-[13px] mt-2.5 leading-relaxed" : "text-[15px] mt-4 leading-relaxed max-w-[440px]"}`}>
                Send files in a tap, keep notes and plans in sync across your phone and laptop, and soon play and learn together.
                {!compact && " Nothing to sign up for."}
            </p>

            {!compact && (
                <>
                    <div className="landing-stage rounded-3xl mt-6 overflow-hidden flex justify-center">
                        <div className="landing-stage-inner w-full max-w-[420px] px-4 pt-1"><RoomAnimation /></div>
                    </div>
                    <Features className="mt-3" compact />
                    <Trust className="landing-trust mt-5" />
                </>
            )}
        </div>
    );
}

export function Features({ className = "", compact }) {
    return (
        <div className={`grid grid-cols-2 gap-2.5 ${className}`}>
            {FEATURES.map((f, i) => (
                <div key={f.key} className={`landing-card landing-rise rounded-2xl text-left ${compact ? "p-3 flex items-start" : "p-3.5"}`} style={{ animationDelay: `${120 + i * 70}ms` }}>
                    <div className={compact ? "mr-3 flex-shrink-0" : "flex items-center justify-between"}>
                        <span className="h-8 w-8 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: f.color + "1c", boxShadow: `inset 0 0 0 1px ${f.color}33` }}>
                            <svg className="w-4 h-4" fill="none" stroke={f.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">{Icon[f.key]}</svg>
                        </span>
                        {!compact && f.tag && <Tag f={f} />}
                    </div>
                    <div className="min-w-0">
                        <p className={`text-white text-[13px] font-semibold tracking-tight ${compact ? "flex items-center flex-wrap gap-x-1.5" : "mt-3"}`}>
                            {f.title}
                            {compact && f.tag && <Tag f={f} />}
                        </p>
                        <p className="text-gray-500 text-[11.5px] leading-snug mt-1">{f.body}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

function Tag({ f }) {
    return (
        <span className="text-[9px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5" style={{ color: f.color, backgroundColor: f.color + "14" }}>
            {f.tag}
        </span>
    );
}

export function Trust({ className = "" }) {
    const items = ["No sign-up", "Files never stored", "Phone & desktop", "Installs like an app"];
    return (
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
            {items.map((t) => (
                <span key={t} className="inline-flex items-center text-[11px] text-gray-500">
                    <svg className="w-3 h-3 mr-1.5 text-[#3ddc97]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {t}
                </span>
            ))}
        </div>
    );
}

// Phone: features + trust under the room cards
export function MobileMore() {
    return (
        <div className="px-5 pb-10 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-600 mb-3">What's inside</p>
            <Features />
            <Trust className="mt-5" />
        </div>
    );
}

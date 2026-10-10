import "./landing.css";
import RoomAnimation from "./RoomAnimation";
import { InstallLink } from "../share/InstallSheet";
import markUrl from "../../assets/logo-mark.svg";

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

// Left side on desktop: just the room, telling its own story, and one quiet line
export function Hero() {
    return (
        <div className="landing-rise w-full max-w-[520px]">
            <h1 className="sr-only">faax: your devices and your people, in one room. Send files, share notes and chat, plan your day and run small apps you describe.</h1>
            <div className="landing-stage w-full max-w-[500px] mx-auto"><RoomAnimation /></div>
            <p className="landing-quiet text-center text-[11px] text-gray-600 mt-5">No sign-up · files never stored</p>
        </div>
    );
}

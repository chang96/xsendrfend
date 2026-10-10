import { useMemo } from "react";

// The faax room, told slowly in one 15s loop (SMIL only, no JS timers):
//   "Your devices"    laptop + phone; a file goes over, a note comes back
//   "Your people"     two friends fade in; a message arrives, a link goes out
//   "All in one room" the room glows; an app pops up in the middle
// Only one thing moves at a time. With reduced motion it's a calm still picture.
const DUR = "15s";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export default function RoomAnimation() {
    const motion = useMemo(() => {
        try { return !window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return true; }
    }, []);

    // fade in at a, hold, fade out at b (fractions of the loop)
    const window_ = (a, b, f = 0.025) => ({
        attributeName: "opacity", dur: DUR, repeatCount: "indefinite",
        values: "0;0;1;1;0;0", keyTimes: `0;${a};${a + f};${b - f};${b};1`,
    });
    const Fade = ({ a, b }) => (motion ? <animate {...window_(a, b)} /> : null);
    // an item that travels along a path between a and b
    const Travel = ({ path, a, b, children }) => (
        <g opacity="0">
            {children}
            {motion && <animateMotion path={path} dur={DUR} repeatCount="indefinite" calcMode="linear" keyPoints="0;0;1;1" keyTimes={`0;${a};${b};1`} />}
            {motion && <animate {...window_(a, b, 0.02)} />}
        </g>
    );

    const toPhone = "M116 92 C142 92 152 96 180 96 C208 96 220 92 252 92";
    const toLaptop = "M252 104 C220 104 208 100 180 100 C152 100 142 104 116 104";
    const fromFriend = "M236 50 C226 70 204 84 190 92";
    const toFriend = "M170 90 C158 72 140 58 128 50";

    // people are there from "Your people" until the loop ends
    const peopleOpacity = motion ? 0 : 1;
    const People = motion ? <animate {...window_(0.34, 0.985, 0.03)} /> : null;

    return (
        <svg viewBox="0 0 360 228" className="w-full h-auto" aria-hidden="true">
            <defs>
                <linearGradient id="lnd-hub" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#4357ff" /><stop offset="0.5" stopColor="#0a22ff" /><stop offset="1" stopColor="#0012b8" />
                </linearGradient>
                <linearGradient id="lnd-ar" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0" stopColor="#ff5b00" /><stop offset="1" stopColor="#ffa057" />
                </linearGradient>
                <linearGradient id="lnd-app" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#b18cff" /><stop offset="1" stopColor="#6a4dff" />
                </linearGradient>
                <filter id="lnd-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="9" /></filter>
            </defs>

            {/* links between devices and the room */}
            <g fill="none" stroke="#2f2f37" strokeWidth="1.5" strokeDasharray="3 6" strokeLinecap="round">
                <path d="M116 98 C142 98 152 98 180 98 C208 98 220 98 252 98">
                    {motion && <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1.4s" repeatCount="indefinite" />}
                </path>
                <g opacity={peopleOpacity}>
                    {People}
                    <path d="M188 72 C192 56 214 44 230 42" />
                    <path d="M172 72 C168 56 146 44 130 40" />
                </g>
            </g>

            {/* laptop */}
            <g>
                <rect x="42" y="66" width="74" height="48" rx="6" fill="#18181c" stroke="#3a3a42" strokeWidth="1.5">
                    {motion && <animate attributeName="stroke" dur={DUR} repeatCount="indefinite" values="#3a3a42;#5b6bff;#5b6bff;#3a3a42;#3a3a42" keyTimes="0;0.04;0.28;0.33;1" />}
                </rect>
                <rect x="49" y="73" width="60" height="34" rx="2.5" fill="#101013" />
                <rect x="54" y="79" width="26" height="3" rx="1.5" fill="#2e2e36" />
                <rect x="54" y="86" width="40" height="3" rx="1.5" fill="#26262d" />
                <rect x="54" y="93" width="32" height="3" rx="1.5" fill="#26262d" />
                <path d="M34 118 H124 L118 124 H40 Z" fill="#1f1f24" stroke="#3a3a42" strokeWidth="1.5" strokeLinejoin="round" />
            </g>

            {/* phone */}
            <g>
                <rect x="252" y="58" width="44" height="80" rx="9" fill="#18181c" stroke="#3a3a42" strokeWidth="1.5">
                    {motion && <animate attributeName="stroke" dur={DUR} repeatCount="indefinite" values="#3a3a42;#5b6bff;#5b6bff;#3a3a42;#3a3a42" keyTimes="0;0.04;0.28;0.33;1" />}
                </rect>
                <rect x="258" y="66" width="32" height="62" rx="4" fill="#101013" />
                <rect x="268" y="61" width="12" height="2.5" rx="1.25" fill="#3a3a42" />
                <rect x="263" y="74" width="22" height="3" rx="1.5" fill="#2e2e36" />
                <rect x="263" y="81" width="16" height="3" rx="1.5" fill="#26262d" />
            </g>

            {/* your people */}
            <g opacity={peopleOpacity}>
                {People}
                <g>
                    <circle cx="240" cy="38" r="13" fill="#18181c" stroke="#3a3a42" strokeWidth="1.5" />
                    <circle cx="240" cy="34" r="4" fill="#c792ea" />
                    <path d="M232.5 45 a7.5 6 0 0 1 15 0" fill="#c792ea" />
                </g>
                <g>
                    <circle cx="120" cy="36" r="13" fill="#18181c" stroke="#3a3a42" strokeWidth="1.5" />
                    <circle cx="120" cy="32" r="4" fill="#ffb44c" />
                    <path d="M112.5 43 a7.5 6 0 0 1 15 0" fill="#ffb44c" />
                </g>
            </g>

            {motion && (
                <>
                    {/* items travel BEHIND the room: they go in one side and come out the other */}
                    {/* 1. a file: laptop -> phone */}
                    <Travel path={toPhone} a={0.04} b={0.15}>
                        <g transform="translate(-10 -13)">
                            <path d="M0 3 a3 3 0 0 1 3 -3 H13 L20 7 V23 a3 3 0 0 1 -3 3 H3 a3 3 0 0 1 -3 -3 Z" fill="#f4f5ff" />
                            <path d="M13 0 V5 a2 2 0 0 0 2 2 H20" fill="#c9cdf5" />
                            <rect x="4" y="12" width="11" height="2" rx="1" fill="#4d63ff" />
                            <rect x="4" y="17" width="8" height="2" rx="1" fill="#ff8a3d" />
                        </g>
                    </Travel>
                    {/* 2. a note: phone -> laptop */}
                    <Travel path={toLaptop} a={0.18} b={0.3}>
                        <g transform="translate(-11 -11)">
                            <rect width="22" height="22" rx="4" fill="#3ddc97" />
                            <rect x="5" y="7" width="12" height="2" rx="1" fill="#0b2a1c" opacity="0.7" />
                            <rect x="5" y="12" width="8" height="2" rx="1" fill="#0b2a1c" opacity="0.7" />
                        </g>
                    </Travel>
                    {/* 3. a message from a friend */}
                    <Travel path={fromFriend} a={0.42} b={0.52}>
                        <g transform="translate(-14 -9)">
                            <path d="M4 0 H24 a4 4 0 0 1 4 4 V12 a4 4 0 0 1 -4 4 H10 L5 20 V16 H4 a4 4 0 0 1 -4 -4 V4 a4 4 0 0 1 4 -4 Z" fill="#26262e" stroke="#c792ea" strokeOpacity="0.7" />
                            <circle cx="8.5" cy="8" r="1.6" fill="#e3c8f5" /><circle cx="14" cy="8" r="1.6" fill="#e3c8f5" /><circle cx="19.5" cy="8" r="1.6" fill="#e3c8f5" />
                        </g>
                    </Travel>
                    {/* 4. a link to the other friend */}
                    <Travel path={toFriend} a={0.55} b={0.65}>
                        <g transform="translate(-12 -12)">
                            <rect width="24" height="24" rx="12" fill="#1b2140" stroke="#4d63ff" strokeOpacity="0.8" />
                            <path d="M10.5 13.5 l3 -3 M9.2 11.2 l-1.4 1.4 a2.6 2.6 0 0 0 3.7 3.7 l1.4 -1.4 M14.8 12.8 l1.4 -1.4 a2.6 2.6 0 0 0 -3.7 -3.7 l-1.4 1.4" fill="none" stroke="#8e9bff" strokeWidth="1.6" strokeLinecap="round" />
                        </g>
                    </Travel>
                    {/* 5. an app pops up in the room */}
                    <g opacity="0">
                        <animate {...window_(0.75, 0.93, 0.03)} />
                        <g transform="translate(180 50)">
                            <g>
                                <animateTransform attributeName="transform" type="scale" dur={DUR} repeatCount="indefinite" values="0.6;0.6;1.08;1;1;0.9" keyTimes="0;0.75;0.79;0.81;0.92;1" />
                                <rect x="-14" y="-14" width="28" height="28" rx="8" fill="url(#lnd-app)" />
                                <path d="M-6 -6h4v4h-4zM2 -6h4v4h-4zM-6 2h4v4h-4zM2 2h4v4h-4z" fill="#fff" opacity="0.92" />
                            </g>
                        </g>
                    </g>
                </>
            )}

            {/* the room */}
            <circle cx="180" cy="98" r="30" fill="#0a22ff" opacity="0.3" filter="url(#lnd-glow)">
                {motion && <animate attributeName="opacity" dur={DUR} repeatCount="indefinite" values="0.3;0.3;0.75;0.75;0.3" keyTimes="0;0.66;0.71;0.95;1" />}
            </circle>
            <circle cx="180" cy="98" r="28" fill="none" stroke="#4d63ff" strokeOpacity="0.45">
                {motion && <animate attributeName="r" values="28;46" dur="3s" repeatCount="indefinite" />}
                {motion && <animate attributeName="stroke-opacity" values="0.45;0" dur="3s" repeatCount="indefinite" />}
            </circle>
            <rect x="156" y="74" width="48" height="48" rx="13" fill="url(#lnd-hub)" />
            <rect x="156" y="74" width="48" height="48" rx="13" fill="none" stroke="#ffffff" strokeOpacity="0.14" />
            <g transform="translate(180 98) scale(0.105) translate(-266 -282)">
                <path d="M176 384 V146 H332 M176 252 H296" fill="none" stroke="#fff" strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" />
                <g fill="none" stroke="url(#lnd-ar)" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M376 296 L326 346 M326 314 V346 H358" /><path d="M262 418 L312 368 M280 368 H312 V400" />
                </g>
            </g>

            {/* the line under the scene: one phrase at a time */}
            <g fontFamily={FONT} fontSize="17" fontWeight="600" textAnchor="middle" letterSpacing="-0.3">
                {motion ? (
                    <>
                        <text x="180" y="196" fill="#e8e8ee" opacity="0"><Fade a={0.01} b={0.32} />Your devices</text>
                        <text x="180" y="196" fill="#e8e8ee" opacity="0"><Fade a={0.34} b={0.65} />Your people</text>
                        <text x="180" y="196" fill="#8e9bff" opacity="0"><Fade a={0.67} b={0.98} />All in one room</text>
                    </>
                ) : (
                    <text x="180" y="196" fill="#e8e8ee" fontSize="15">Your devices and your people, <tspan fill="#8e9bff">in one room</tspan></text>
                )}
            </g>
        </svg>
    );
}

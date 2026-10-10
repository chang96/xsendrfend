import { useMemo } from "react";

// Lightweight SVG scene: laptop and phone connected through a faax room; a file travels one way,
// a note travels back, a friend joins. SMIL animation only (no JS loop), static when motion is reduced.
export default function RoomAnimation() {
    const motion = useMemo(() => {
        try { return !window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return true; }
    }, []);
    const A = (props) => (motion ? <animate {...props} /> : null);
    const M = (props) => (motion ? <animateMotion {...props} /> : null);

    const there = "M114 92 C140 92 150 96 180 96 C210 96 222 92 254 92";
    const back = "M254 104 C222 104 210 100 180 100 C150 100 140 104 114 104";

    return (
        <svg viewBox="0 0 360 190" className="w-full h-auto" role="img" aria-label="Your laptop and phone sharing a file and a note through a faax room, with a friend joining">
            <defs>
                <linearGradient id="lnd-hub" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#4357ff" /><stop offset="0.5" stopColor="#0a22ff" /><stop offset="1" stopColor="#0012b8" />
                </linearGradient>
                <linearGradient id="lnd-ar" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0" stopColor="#ff5b00" /><stop offset="1" stopColor="#ffa057" />
                </linearGradient>
                <filter id="lnd-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" /></filter>
            </defs>

            {/* connection lines (flowing dashes) */}
            <g fill="none" stroke="#33333b" strokeWidth="1.5" strokeDasharray="3 6" strokeLinecap="round">
                <path d="M114 98 C140 98 150 98 180 98 C210 98 222 98 254 98">
                    <A attributeName="stroke-dashoffset" from="0" to="-18" dur="1.2s" repeatCount="indefinite" />
                </path>
                <path d="M180 70 C182 52 200 40 226 36">
                    <A attributeName="stroke-dashoffset" from="0" to="-18" dur="1.6s" repeatCount="indefinite" />
                </path>
            </g>

            {/* laptop */}
            <g>
                <rect x="40" y="66" width="74" height="48" rx="6" fill="#18181c" stroke="#3a3a42" strokeWidth="1.5" />
                <rect x="47" y="73" width="60" height="34" rx="2.5" fill="#101013" />
                <rect x="52" y="79" width="26" height="3" rx="1.5" fill="#2e2e36" />
                <rect x="52" y="86" width="40" height="3" rx="1.5" fill="#26262d" />
                <rect x="52" y="93" width="32" height="3" rx="1.5" fill="#26262d" />
                <path d="M32 118 H122 L116 124 H38 Z" fill="#1f1f24" stroke="#3a3a42" strokeWidth="1.5" strokeLinejoin="round" />
            </g>

            {/* phone */}
            <g>
                <rect x="254" y="58" width="44" height="80" rx="9" fill="#18181c" stroke="#3a3a42" strokeWidth="1.5" />
                <rect x="260" y="66" width="32" height="62" rx="4" fill="#101013" />
                <rect x="270" y="61" width="12" height="2.5" rx="1.25" fill="#3a3a42" />
                <rect x="265" y="74" width="22" height="3" rx="1.5" fill="#2e2e36" />
                <rect x="265" y="81" width="16" height="3" rx="1.5" fill="#26262d" />
                {/* received badge */}
                <g opacity={motion ? 0 : 1}>
                    <circle cx="276" cy="108" r="9" fill="#3ddc97" />
                    <path d="M271.5 108.2l3 3 5.5-6" fill="none" stroke="#0b2a1c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    <A attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.5;0.56;0.9;1" dur="5s" repeatCount="indefinite" />
                </g>
            </g>

            {/* friend joining */}
            <g>
                <circle cx="238" cy="34" r="13" fill="#18181c" stroke="#3a3a42" strokeWidth="1.5" />
                <circle cx="238" cy="30" r="4" fill="#c792ea" />
                <path d="M230.5 41 a7.5 6 0 0 1 15 0" fill="#c792ea" />
                <circle cx="249" cy="24" r="4" fill="#3ddc97" stroke="#111113" strokeWidth="1.5">
                    <A attributeName="r" values="4;5;4" dur="2s" repeatCount="indefinite" />
                </circle>
            </g>

            {/* room hub */}
            <circle cx="180" cy="98" r="30" fill="#0a22ff" opacity="0.35" filter="url(#lnd-glow)" />
            <circle cx="180" cy="98" r="28" fill="none" stroke="#4d63ff" strokeOpacity="0.5">
                <A attributeName="r" values="28;44" dur="2.4s" repeatCount="indefinite" />
                <A attributeName="stroke-opacity" values="0.5;0" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <rect x="156" y="74" width="48" height="48" rx="13" fill="url(#lnd-hub)" />
            <rect x="156" y="74" width="48" height="48" rx="13" fill="none" stroke="#ffffff" strokeOpacity="0.14" />
            <g transform="translate(180 98) scale(0.105) translate(-266 -282)">
                <path d="M176 384 V146 H332 M176 252 H296" fill="none" stroke="#fff" strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" />
                <g fill="none" stroke="url(#lnd-ar)" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M376 296 L326 346 M326 314 V346 H358" /><path d="M262 418 L312 368 M280 368 H312 V400" />
                </g>
            </g>

            {/* file travelling laptop -> phone */}
            <g opacity={motion ? 0 : 1} transform={motion ? undefined : "translate(200 96)"}>
                <g transform="translate(-11 -14)">
                    <path d="M0 3 a3 3 0 0 1 3 -3 H14 L22 8 V25 a3 3 0 0 1 -3 3 H3 a3 3 0 0 1 -3 -3 Z" fill="#f4f5ff" />
                    <path d="M14 0 V6 a2 2 0 0 0 2 2 H22" fill="#c9cdf5" />
                    <rect x="4" y="13" width="12" height="2.2" rx="1.1" fill="#4d63ff" />
                    <rect x="4" y="18" width="9" height="2.2" rx="1.1" fill="#ff8a3d" />
                </g>
                <M path={there} dur="5s" repeatCount="indefinite" keyPoints="0;0;1;1" keyTimes="0;0.08;0.5;1" calcMode="linear" />
                <A attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.1;0.46;0.52;1" dur="5s" repeatCount="indefinite" />
            </g>

            {/* note travelling phone -> laptop */}
            {motion && (
                <g opacity="0">
                    <g transform="translate(-13 -8)">
                        <rect width="26" height="16" rx="8" fill="#26262e" stroke="#4d63ff" strokeOpacity="0.6" />
                        <circle cx="8" cy="8" r="1.6" fill="#8e9bff" /><circle cx="13" cy="8" r="1.6" fill="#8e9bff" /><circle cx="18" cy="8" r="1.6" fill="#8e9bff" />
                    </g>
                    <animateMotion path={back} dur="5s" begin="2.5s" repeatCount="indefinite" keyPoints="0;0;1;1" keyTimes="0;0.08;0.45;1" calcMode="linear" />
                    <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.1;0.42;0.48;1" dur="5s" begin="2.5s" repeatCount="indefinite" />
                </g>
            )}

            {/* labels */}
            <g fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="9" fill="#6b6b75" textAnchor="middle">
                <text x="77" y="140">Laptop</text>
                <text x="276" y="154">Phone</text>
                <text x="180" y="142" fill="#8e9bff">@you</text>
            </g>
        </svg>
    );
}

import { useMemo, useState } from "react";
import qrcode from "../../vendor/qrcode-generator";

export function QRCode({ value, size = 184 }) {
    const svg = useMemo(() => {
        const qr = qrcode(0, "M");
        qr.addData(value);
        qr.make();
        return qr
            .createSvgTag({ cellSize: 4, margin: 0, scalable: true })
            .replace("<svg ", '<svg width="100%" height="100%" ');
    }, [value]);

    return (
        <div
            className="bg-white rounded-xl p-3 shadow-inner"
            style={{ width: size, height: size }}
            aria-label={`QR code for ${value}`}
            role="img"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

// Bottom sheet on phones, centered card on larger screens
export function Sheet({ title, onClose, children }) {
    return (
        <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            <div
                className="w-full sm:w-80 max-h-[90vh] overflow-y-auto bg-[#1E1E1E] border border-[#2b2b2b] rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl text-left"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white text-sm font-semibold tracking-wide">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors" title="Close">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function useCopy() {
    const [copied, setCopied] = useState(null);
    const copy = async (text, tag = "default") => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (e) {
            const ta = document.createElement("textarea");
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand("copy"); } catch (err) {}
            document.body.removeChild(ta);
        }
        setCopied(tag);
        setTimeout(() => setCopied(null), 1500);
    };
    return [copied, copy];
}

export function PrimaryButton({ children, disabled, onClick, className = "" }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-full py-2.5 rounded-xl font-semibold text-xs tracking-wider uppercase shadow-md transition-all duration-150 flex items-center justify-center space-x-2 ${
                disabled
                    ? "bg-[#252525] text-gray-500 cursor-not-allowed"
                    : "bg-[#001AFF] text-white hover:bg-blue-700 active:scale-[0.98] cursor-pointer"
            } ${className}`}
        >
            {children}
        </button>
    );
}

export function GhostButton({ children, onClick, className = "" }) {
    return (
        <button
            onClick={onClick}
            className={`w-full py-2 rounded-xl text-[11px] font-semibold text-gray-400 hover:text-white bg-[#121212] border border-[#2b2b2b] hover:border-[#3a3a3a] transition-all duration-150 ${className}`}
        >
            {children}
        </button>
    );
}

// Recovery code block with copy + download (used at claim time and when rotating)
export function RecoveryCodeBox({ alias, code }) {
    const [copied, copy] = useCopy();
    const download = () => {
        const text =
            `faax.me/${alias} — recovery code\n\n${code}\n\n` +
            `Use this if you ever lose access on all your devices:\n` +
            `open faax.me/${alias}, tap "I own this link" and enter the code.\n` +
            `Anyone with this code can become an owner of faax.me/${alias}. Keep it private.\n`;
        const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `faax-${alias}-recovery-code.txt`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    return (
        <div className="space-y-2">
            <div className="bg-[#121212] border border-[#2b2b2b] rounded-xl px-3 py-3 text-center font-mono text-[13px] tracking-wider text-white select-all break-all">
                {code}
            </div>
            <div className="flex space-x-2">
                <GhostButton onClick={() => copy(code)}>{copied ? "Copied ✓" : "Copy"}</GhostButton>
                <GhostButton onClick={download}>Download .txt</GhostButton>
            </div>
        </div>
    );
}

export function Spinner({ className = "w-4 h-4" }) {
    return (
        <svg className={`${className} animate-spin text-[#4d63ff]`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
        </svg>
    );
}

export function formatCode(code) {
    return String(code || "").match(/.{1,5}/g)?.join("-") || "";
}

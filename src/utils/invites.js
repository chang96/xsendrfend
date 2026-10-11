// Access codes are made HERE, on an owner device, and signed with this device's own key.
// Nothing is stored anywhere: the server checks the signature against the key hash it already keeps
// for this device, plus the expiry written inside the code. Removing this device kills its codes.
// Layout (10 bytes -> 16 chars): expiry minutes since 2026-01-01 (3) | validity + random (1) |
// device tag (1) | HMAC-SHA256(sha256hex(deviceKey), "faax-invite|alias|hex(first 5 bytes)") first 5 bytes.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const EPOCH = Date.UTC(2026, 0, 1);
const DAYS_INDEX = { 1: 0, 7: 1, 30: 2 };

const enc = new TextEncoder();
const hex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = (text) => crypto.subtle.digest("SHA-256", enc.encode(text));

function base32(bytes) {
    let bits = 0, val = 0, out = "";
    for (const b of bytes) {
        val = (val << 8) | b; bits += 8;
        while (bits >= 5) { out += ALPHABET[(val >> (bits - 5)) & 31]; bits -= 5; }
    }
    if (bits > 0) out += ALPHABET[(val << (5 - bits)) & 31];
    return out;
}

export function canMakeCodes() {
    return !!(window.crypto && crypto.subtle);
}

export async function makeInviteCode(alias, creds, days = 7) {
    const d = DAYS_INDEX[days] === undefined ? 7 : days;
    const expMin = Math.floor((Date.now() - EPOCH) / 60000) + d * 1440; // issued this minute, valid d days
    const expiresAt = EPOCH + expMin * 60000;
    const rand = crypto.getRandomValues(new Uint8Array(1))[0] & 63;
    const tag = new Uint8Array(await sha256(creds.deviceId))[0];
    const payload = new Uint8Array([(expMin >> 16) & 255, (expMin >> 8) & 255, expMin & 255, (DAYS_INDEX[d] << 6) | rand, tag]);
    const keyHash = hex(await sha256(creds.key));
    const k = await crypto.subtle.importKey("raw", enc.encode(keyHash), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`faax-invite|${alias}|${hex(payload)}`))).slice(0, 5);
    const all = new Uint8Array(10);
    all.set(payload, 0); all.set(mac, 5);
    const code = base32(all).slice(0, 16);
    return { code: code.match(/.{4}/g).join("-"), expiresAt, days: d };
}

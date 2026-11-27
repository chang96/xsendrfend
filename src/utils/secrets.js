// Secrets to your own devices, end-to-end encrypted.
// Each open tab makes a throwaway ECDH key pair (the private half never leaves this tab).
// To send, we encrypt separately for each of your other open devices with AES-GCM; the server
// only relays ciphertext. Received secrets live in memory only and clear themselves.
export const SECRET_TTL = 15 * 60 * 1000;
const subtle = typeof window !== "undefined" && window.crypto && window.crypto.subtle;
export const secretsSupported = !!subtle;

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const CURVE = { name: "ECDH", namedCurve: "P-256" };

let mine = null; // Promise<{ keys, pub }>
function myKeys() {
    if (!mine && subtle) {
        mine = subtle.generateKey(CURVE, false, ["deriveKey"]).then(async (keys) => ({ keys, pub: b64(await subtle.exportKey("raw", keys.publicKey)) }));
    }
    return mine;
}
async function shared(theirPub, usage) {
    const { keys } = await myKeys();
    const pub = await subtle.importKey("raw", unb64(theirPub), CURVE, false, []);
    return subtle.deriveKey({ name: "ECDH", public: pub }, keys.privateKey, { name: "AES-GCM", length: 256 }, false, [usage]);
}

// tell the server our public key (call on every connect)
export async function announceSecretKey(socket) {
    if (!subtle || !socket) return;
    try { const { pub } = await myKeys(); socket.emit("secret:hello", { pub }); } catch (e) {}
}

export async function sealFor(peers, payload) {
    const { pub } = await myKeys();
    const data = new TextEncoder().encode(JSON.stringify(payload));
    const items = [];
    for (const p of peers) {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const key = await shared(p.pub, "encrypt");
        items.push({ to: p.id, iv: b64(iv), ct: b64(await subtle.encrypt({ name: "AES-GCM", iv }, key, data)) });
    }
    return { pub, items };
}

export async function open(msg) {
    const key = await shared(msg.pub, "decrypt");
    const plain = await subtle.decrypt({ name: "AES-GCM", iv: unb64(msg.iv) }, key, unb64(msg.ct));
    return JSON.parse(new TextDecoder().decode(plain));
}

// ---- received secrets: memory only
let list = [];
const subs = new Set();
const emit = () => subs.forEach((f) => f(list));
export const getSecrets = () => list;
export function subscribeSecrets(f) { subs.add(f); return () => subs.delete(f); }
export function removeSecret(id) { list = list.filter((s) => s.id !== id); emit(); }
export async function receiveSecret(msg) {
    try {
        const p = await open(msg);
        const s = {
            id: "s_" + Math.random().toString(36).slice(2, 10),
            label: String(p.label || "").slice(0, 80),
            secret: String(p.secret || "").slice(0, 4000),
            from: String((msg.from && msg.from.name) || "Your other device").slice(0, 40),
            at: Date.now(),
        };
        list = [s, ...list].slice(0, 20);
        emit();
        setTimeout(() => removeSecret(s.id), SECRET_TTL);
        return s;
    } catch (e) { return null; }
}

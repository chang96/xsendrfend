// Shared bits for per-app install: everything comes from the query string (name, glyph, colours).
// The app's code and data never come here; they stay on the person's devices.
const HEX = /^#?[0-9a-fA-F]{6}$/;
const clean = (s, max) => String(s || "").replace(/[\u0000-\u001f<>"'&]/g, "").trim().slice(0, max);

function parse(query) {
    const q = query || {};
    const alias = String(q.alias || "").toLowerCase();
    const app = String(q.app || "");
    if (!/^[a-z0-9](?:[a-z0-9-]{1,18})[a-z0-9]$/.test(alias) || !/^app_[a-z0-9]{4,40}$/i.test(app)) return null;
    const hex = (v, d) => (HEX.test(String(v || "")) ? "#" + String(v).replace("#", "") : d);
    return {
        alias, app,
        name: clean(q.n, 30) || "faax app",
        glyph: Array.from(clean(q.g, 8)).slice(0, 2).join("") || "✦",
        bg: hex(q.bg, "#1c2140"),
        fg: hex(q.fg, "#8e9bff"),
    };
}

function query(a) {
    return new URLSearchParams({ alias: a.alias, app: a.app, n: a.name, g: a.glyph, bg: a.bg.slice(1), fg: a.fg.slice(1) }).toString();
}

function iconSvg(a, maskable) {
    const size = 512;
    const pad = maskable ? 0 : 40;
    const r = maskable ? 0 : 112;
    const fs = a.glyph.length > 1 ? 190 : 240;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
        `<rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}" rx="${r}" fill="${a.bg}"/>` +
        `<text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="800" font-size="${fs}" letter-spacing="${a.glyph.length > 1 ? -8 : 0}" fill="${a.fg}">${a.glyph}</text>` +
        `</svg>`;
}

function manifest(a) {
    const q = query(a);
    const path = `/${a.alias}/a/${a.app}`;
    return {
        id: path,
        name: a.name,
        short_name: a.name.slice(0, 12),
        description: `${a.name}, made in faax`,
        start_url: `${path}?${new URLSearchParams({ n: a.name, g: a.glyph, bg: a.bg.slice(1), fg: a.fg.slice(1) })}`,
        scope: path,
        display: "standalone",
        background_color: a.bg,
        theme_color: a.bg,
        icons: [
            { src: `/api/app-icon?${q}`, sizes: "any", type: "image/svg+xml", purpose: "any" },
            { src: `/api/app-icon?${q}&maskable=1`, sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
    };
}

module.exports = { parse, iconSvg, manifest };

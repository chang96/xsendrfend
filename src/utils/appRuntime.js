// Turns a generated app's HTML into a sandboxed iframe document.
// The iframe gets sandbox="allow-scripts" only (opaque origin: no cookies, storage, parent access,
// popups, forms or top navigation) and this CSP (no network at all). The only way out is the
// faax SDK below, which talks to the parent page over postMessage; the parent decides what is allowed.

export const APP_CSP = [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    "img-src data: blob:",
    "font-src data:",
    "media-src data: blob:",
    "connect-src 'none'",
    "frame-src 'none'",
    "worker-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
].join("; ");

// Runs inside the iframe before the app's own code. Mirrors the API taught in the backend generator.
const SDK = `(function(){
  var P = window.parent, seq = 0, pending = {}, msgH = [], memH = [], ctx = null, waiting = [], early = [];
  function post(type, payload, id){ try { P.postMessage({ faax: 1, type: type, payload: payload, id: id }, "*"); } catch (e) {} }
  function call(type, payload){ return new Promise(function(res, rej){ var id = ++seq; pending[id] = { res: res, rej: rej }; post(type, payload, id); }); }
  function report(err, where){
    var m = err && err.message ? err.message : String(err);
    post("error", { message: String(m).slice(0, 500), stack: String((err && err.stack) || "").slice(0, 1500), where: where || "" });
  }
  function safe(fn, a, b){ try { fn(a, b); } catch (e) { report(e, "handler"); } }
  window.addEventListener("error", function(e){ report(e.error || e.message, "error"); });
  window.addEventListener("unhandledrejection", function(e){ report(e.reason, "promise"); });
  window.addEventListener("message", function(e){
    if (e.source !== P) return;
    var m = e.data; if (!m || m.faax !== 1) return;
    if (m.re) { var p = pending[m.re]; if (p) { delete pending[m.re]; if (m.error) p.rej(new Error(m.error)); else p.res(m.value); } return; }
    if (m.type === "init") { ctx = m.ctx; var w = waiting; waiting = []; w.forEach(function(r){ r(ctx); }); }
    else if (m.type === "members") { if (ctx) { ctx.members = m.members; ctx.me = m.me; } memH.forEach(function(f){ safe(f, m.members, m.me); }); }
    else if (m.type === "message") { if (!msgH.length) { if (early.length < 50) early.push(m); } else msgH.forEach(function(f){ safe(f, m.data, m.from); }); }
  });
  function clean(d){ return d === undefined ? null : JSON.parse(JSON.stringify(d)); }
  var faax = {
    version: 1,
    ready: function(){ return ctx ? Promise.resolve(ctx) : new Promise(function(r){ waiting.push(r); }); },
    onMembers: function(f){ if (typeof f === "function") memH.push(f); },
    onMessage: function(f){
      if (typeof f !== "function") return;
      msgH.push(f);
      if (early.length) { var q = early; early = []; setTimeout(function(){ q.forEach(function(m){ msgH.forEach(function(h){ safe(h, m.data, m.from); }); }); }, 0); }
    },
    send: function(d){ post("send", { to: "room", data: clean(d) }); },
    sendToOwners: function(d){ post("send", { to: "owners", data: clean(d) }); },
    sendTo: function(id, d){ post("send", { to: String(id), data: clean(d) }); },
    notify: function(t){ post("notify", { text: String(t).slice(0, 140) }); },
    store: Object.freeze({
      get: function(k){ return call("store.get", { k: String(k) }); },
      set: function(k, v){ return call("store.set", { k: String(k), v: clean(v) }); },
      remove: function(k){ return call("store.remove", { k: String(k) }); },
      keys: function(){ return call("store.keys", {}); }
    })
  };
  Object.defineProperty(window, "faax", { value: Object.freeze(faax), writable: false, configurable: false });
  post("hello", {});
})();`;

const esc = (s) => String(s).replace(/<\/script/gi, "<\\/script");

export function buildSrcdoc(html) {
    // Our CSP + SDK go first so they apply before anything the app declares.
    // (Dropping the app's own doctype keeps one standards-mode doctype at the very top.)
    const body = String(html || "").replace(/^\s*<!doctype[^>]*>/i, "");
    return (
        "<!doctype html>" +
        `<meta http-equiv="Content-Security-Policy" content="${APP_CSP}">` +
        '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
        `<script>${esc(SDK)}</script>` +
        body
    );
}

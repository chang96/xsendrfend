import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { WebSocketContext } from "../../utils/websocket";
import { buildSrcdoc } from "../../utils/appRuntime";
import { dataGet, dataKeys, dataSet } from "../../utils/appsStore";

const MAX_MSG = 60 * 1024;
const MAX_VALUE = 200 * 1024;
const size = (x) => { try { return JSON.stringify(x === undefined ? null : x).length; } catch (e) { return Infinity; } };

// Who is in the room, and who has THIS app open right now (presence is relayed as app messages
// with a reserved __faax envelope that never reaches the app). The host is the first owner device,
// by socket id, that has the app open — so the referee is always a device actually running it.
function useRoomPresence(socket, request, appId) {
    const [members, setMembers] = useState([]);
    const [me, setMe] = useState(null);
    const [inApp, setInApp] = useState(() => new Set());

    const refresh = useCallback(async () => {
        const res = await request("room:members", {}, 6000);
        if (!res || !res.ok) return;
        setMe(res.me);
        setMembers(res.members);
        const ids = new Set(res.members.map((m) => m.id));
        setInApp((prev) => new Set([...prev].filter((id) => ids.has(id))));
    }, [request]);

    useEffect(() => {
        if (!socket) return undefined;
        let t = null;
        const onCount = () => { clearTimeout(t); t = setTimeout(refresh, 250); };
        const onConnect = () => { refresh(); announce(true); };
        const announce = (open, reply) => socket.emit("app:msg", { appId, to: "room", data: { __faax: "here", open, reply: !!reply } });
        const onMsg = (m) => {
            if (!m || m.appId !== appId || !m.data || m.data.__faax !== "here") return;
            setInApp((prev) => {
                const next = new Set(prev);
                if (m.data.open) next.add(m.from.id); else next.delete(m.from.id);
                return next;
            });
            if (m.data.open && !m.data.reply) announce(true, true);
        };
        socket.on("room-members-count", onCount);
        socket.on("connect", onConnect);
        socket.on("app:msg", onMsg);
        refresh();
        announce(true);
        const poll = setInterval(refresh, 15000);
        return () => {
            announce(false);
            clearTimeout(t); clearInterval(poll);
            socket.off("room-members-count", onCount);
            socket.off("connect", onConnect);
            socket.off("app:msg", onMsg);
        };
    }, [socket, appId, refresh]);

    return useMemo(() => {
        if (!me) return null;
        const running = new Set(inApp); running.add(me.id);
        const owners = members.filter((m) => m.role === "owner" && running.has(m.id)).map((m) => m.id).sort();
        const hostId = owners[0] || null;
        const list = members.map((m) => ({ id: m.id, role: m.role, name: m.name, isHost: m.id === hostId, inApp: running.has(m.id) }));
        const meFull = list.find((m) => m.id === me.id) || { ...me, isHost: me.id === hostId, inApp: true };
        return { me: meFull, members: list, hostId };
    }, [me, members, inApp]);
}

export default function AppFrame({ app, html, secrets, who, onError, onNotify, onHost }) {
    const { socket, request } = useContext(WebSocketContext);
    const frameRef = useRef(null);
    const readyRef = useRef(false);
    const presenceRef = useRef(null);
    const loadsRef = useRef(0);
    const queueRef = useRef([]); // messages that arrive before the app has started
    const [frameKey, setFrameKey] = useState(0);
    const presence = useRoomPresence(socket, request, app.id);
    presenceRef.current = presence;

    const srcdoc = useMemo(() => buildSrcdoc(html), [html]);
    useEffect(() => { readyRef.current = false; loadsRef.current = 0; queueRef.current = []; }, [srcdoc, frameKey]);

    const toFrame = useCallback((msg) => {
        const w = frameRef.current && frameRef.current.contentWindow;
        if (w) w.postMessage({ faax: 1, ...msg }, "*");
    }, []);

    // tell the app who's here whenever that changes
    useEffect(() => {
        if (onHost) onHost(presence ? presence.members.some((m) => m.isHost) : true, presence);
        if (presence && readyRef.current) toFrame({ type: "members", members: presence.members, me: presence.me });
    }, [presence, toFrame, onHost]);

    // live messages from other devices -> app
    useEffect(() => {
        if (!socket) return undefined;
        const onMsg = (m) => {
            if (!m || m.appId !== app.id || (m.data && m.data.__faax)) return;
            const msg = { type: "message", data: m.data, from: m.from };
            if (readyRef.current) toFrame(msg);
            else if (queueRef.current.length < 50) queueRef.current.push(msg);
        };
        socket.on("app:msg", onMsg);
        return () => socket.off("app:msg", onMsg);
    }, [socket, app.id, toFrame]);

    // the bridge: everything the app asks for comes through here
    useEffect(() => {
        const onMessage = async (e) => {
            const w = frameRef.current && frameRef.current.contentWindow;
            if (!w || e.source !== w) return;
            const m = e.data;
            if (!m || m.faax !== 1 || typeof m.type !== "string") return;
            const p = m.payload || {};
            const reply = (value, error) => toFrame({ re: m.id, value, error });
            const pr = presenceRef.current;
            switch (m.type) {
                case "hello":
                    if (!pr) { setTimeout(() => onMessage(e), 300); break; } // presence not loaded yet
                    toFrame({ type: "init", ctx: { me: pr.me, members: pr.members, who: who || "room", app: { name: app.name }, secrets: pr.me.role === "owner" ? secrets || null : null } });
                    readyRef.current = true;
                    queueRef.current.splice(0).forEach(toFrame);
                    break;
                case "send": {
                    if (!socket || size(p.data) > MAX_MSG) return;
                    const to = p.to === "owners" ? "owners" : p.to === "room" ? "room" : String(p.to || "");
                    if (to !== "room" && to !== "owners" && !(pr && pr.me.role === "owner")) return; // direct: owners only
                    socket.emit("app:msg", { appId: app.id, to, data: p.data });
                    break;
                }
                case "store.get": reply(await dataGet(app.id, p.k)); break;
                case "store.keys": reply(await dataKeys(app.id)); break;
                case "store.set":
                    if (size(p.v) > MAX_VALUE) return reply(undefined, "value too large (max 200 KB)");
                    try { await dataSet(app.id, p.k, p.v); reply(true); } catch (err) { reply(undefined, "storage unavailable"); }
                    break;
                case "store.remove":
                    try { await dataSet(app.id, p.k, null, { remove: true }); reply(true); } catch (err) { reply(undefined, "storage unavailable"); }
                    break;
                case "notify": if (onNotify && p.text) onNotify(String(p.text)); break;
                case "error": if (onError) onError({ message: String(p.message || "Unknown error"), stack: String(p.stack || ""), where: p.where }); break;
                default: break;
            }
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [app.id, app.name, who, secrets, socket, toFrame, onError, onNotify]);

    // if the app ever navigates itself away from its document, put it back
    const onLoad = () => {
        loadsRef.current += 1;
        if (loadsRef.current > 1) {
            if (onError) onError({ message: "The app tried to navigate away from faax and was reloaded.", where: "navigation" });
            setFrameKey((k) => k + 1);
        }
    };

    return (
        <iframe
            key={frameKey}
            ref={frameRef}
            title={app.name || "App"}
            sandbox="allow-scripts"
            srcDoc={srcdoc}
            onLoad={onLoad}
            referrerPolicy="no-referrer"
            className="block w-full h-full border-0 bg-white"
        />
    );
}

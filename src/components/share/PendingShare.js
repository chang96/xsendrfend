import { useContext, useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { WebSocketContext } from "../../utils/websocket";
import { newMessageAction, setUpQueue } from "../../action/index";
import { buildFileMetadata } from "../../utils/fileQueue";
import { clearPendingShare, deleteShare, getShare, shareText, shareToFiles, takePendingShareId } from "../../utils/pwa";
import { formatBytes } from "./ShareReceiver";

// Inside a room: files that arrived via the share sheet wait here until another device is connected,
// then go out through the normal transfer (same as picking files with the paperclip).
function PendingShare({ roomName, userType, sendMessage, setQueue }) {
    const { socket, peersCount } = useContext(WebSocketContext);
    const [share, setShare] = useState(null);
    const [sent, setSent] = useState(false);
    const done = useRef(false);

    useEffect(() => {
        const id = takePendingShareId();
        if (!id) return;
        getShare(id).then((s) => { if (s) setShare(s); else clearPendingShare(); });
    }, []);

    useEffect(() => {
        if (!share || done.current || peersCount < 1 || !roomName.name || roomName.name === "****") return;
        done.current = true;

        const files = shareToFiles(share);
        if (files.length) {
            const list = buildFileMetadata(files, undefined);
            if (list.length) {
                setQueue(list);
                sendMessage({ type: "guest", message: list, niFile: true });
            }
        }
        const text = shareText(share);
        if (text) {
            sendMessage({ type: "guest", message: text });
            socket.emit("messageFromClient", { roomName: roomName.name, type: userType.userType || "guest", message: text, xtype: "text" });
        }
        clearPendingShare();
        deleteShare(share.id);
        setSent(true);
        setTimeout(() => setShare(null), 2500);
    }, [share, peersCount, roomName.name]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!share) return null;
    const files = share.files || [];
    const total = files.reduce((n, f) => n + (f.size || 0), 0);
    const label = files.length ? `${files.length} file${files.length > 1 ? "s" : ""} · ${formatBytes(total)}` : "Shared text";

    const cancel = () => { done.current = true; clearPendingShare(); deleteShare(share.id); setShare(null); };

    return (
        <div className="mb-2.5 flex items-center rounded-2xl border border-[#4d63ff]/40 bg-[#4d63ff]/10 px-3 py-2.5 text-left">
            <div className="h-8 w-8 rounded-xl bg-[#001AFF]/30 flex items-center justify-center flex-shrink-0 mr-3">
                {sent ? (
                    <svg className="w-4 h-4 text-[#8ff0c4]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : (
                    <svg className="w-4 h-4 text-[#b9c2ff] animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" /></svg>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[12px] text-white font-medium truncate">{sent ? "Sending now" : label}</p>
                <p className="text-[10px] text-[#b9c2ff]/80">{sent ? label : "Waiting for your other device to connect…"}</p>
            </div>
            {!sent && <button onClick={cancel} className="ml-2 text-[11px] text-gray-400 hover:text-white px-2 py-1">Cancel</button>}
        </div>
    );
}

export default connect(
    (state) => ({ roomName: state.roomName, userType: state.userType }),
    (dispatch) => ({
        sendMessage: (payload) => dispatch(newMessageAction(payload)),
        setQueue: (payload) => dispatch(setUpQueue(payload)),
    })
)(PendingShare);

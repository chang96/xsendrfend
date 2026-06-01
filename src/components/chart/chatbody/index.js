import Attachment from "../../../elements/attachment/attachment";
import "./index.css"
import { connect } from "react-redux"
import { WebSocketContext } from "../../../utils/websocket"
import { newMessageAction, completion } from "../../../action/index"
import { useState, useContext, useEffect, useRef } from 'react'

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

function ChartBody({messageFromServr, completion, sendMessage, userType, roomName, percentageIncrease, newMessageDispatch, queued}){
    const [transfers, setTransfers] = useState({});
    const [viewMode, setViewMode] = useState("notes"); // "notes" (default) or "chat"
    const [autoSendEnabled, setAutoSendEnabled] = useState(true);
    const [composerText, setComposerText] = useState("");
    const [syncStatus, setSyncStatus] = useState("standby"); // "standby", "typing", "synced"
    const autoSendTimerRef = useRef(null);

    const { 
        socket, 
        setDataChannelMessageHandler,
        submitBinaryChunk
    } = useContext(WebSocketContext);

    // Heartbeat Timeout Checker for Sender
    const resetHeartbeat = (fileId) => {
        const session = window.activeSenderSessions ? window.activeSenderSessions[fileId] : null;
        if (!session) return;
        if (session.ackTimeoutTimer) {
            clearTimeout(session.ackTimeoutTimer);
        }
        session.ackTimeoutTimer = setTimeout(() => {
            handleTimeout(fileId);
        }, 6000);
    };

    const handleTimeout = (fileId) => {
        const session = window.activeSenderSessions ? window.activeSenderSessions[fileId] : null;
        if (!session) return;
        console.warn(`File transfer timed out (6s without ACK) for file ${fileId}`);
        
        if (session.ackTimeoutTimer) {
            clearTimeout(session.ackTimeoutTimer);
            session.ackTimeoutTimer = null;
        }
        
        setTransfers(prev => {
            if (!prev[fileId] || prev[fileId].status === "paused") return prev;
            return {
                ...prev,
                [fileId]: {
                    ...prev[fileId],
                    status: "paused"
                }
            };
        });
    };

    // Heartbeat Timeout Checker for Receiver
    const resetReceiverHeartbeat = (fileId) => {
        const fileStore = window.incomingFiles ? window.incomingFiles[fileId] : null;
        if (!fileStore) return;
        if (fileStore.heartbeatTimer) {
            clearTimeout(fileStore.heartbeatTimer);
        }
        fileStore.heartbeatTimer = setTimeout(() => {
            handleReceiverTimeout(fileId);
        }, 7000); // 7s (slightly longer than sender's 6s)
    };

    const handleReceiverTimeout = (fileId) => {
        const fileStore = window.incomingFiles ? window.incomingFiles[fileId] : null;
        if (!fileStore) return;
        
        if (fileStore.heartbeatTimer) {
            clearTimeout(fileStore.heartbeatTimer);
            fileStore.heartbeatTimer = null;
        }

        setTransfers(prev => {
            if (!prev[fileId] || prev[fileId].status === "paused") return prev;
            return {
                ...prev,
                [fileId]: {
                    ...prev[fileId],
                    status: "paused"
                }
            };
        });
    };

    useEffect(() => {
        // Register Socket/WebRTC incoming chunk message handler
        setDataChannelMessageHandler((event) => {
            if (event.isSocketAck) {
                if (window.onFileChunkAckReceived) {
                    window.onFileChunkAckReceived(event.fileId, event.index);
                }
            } else if (event.isSocketRelay) {
                const { fileId, index, chunk } = event;
                storeIncomingChunk(fileId, index, chunk);
            } else if (typeof event.data === "string") {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.xtype === "file-meta") {
                        handleIncomingFileMeta(msg);
                    } else if (msg.xtype === "file-done") {
                        handleIncomingFileDone(msg);
                    } else {
                        // Standard chat message
                        newMessageDispatch({
                            type: "owner",
                            message: msg.message
                        });
                    }
                } catch (error) {
                    console.error("Error parsing WebRTC data channel message:", error);
                }
            }
        });

        // Register socket.io message handler as high-reliability fallback
        socket.on('messageFromServer', data => {
            if (data.xtype === "file-meta") {
                handleIncomingFileMeta(data);
            } else if (data.xtype === "file-done") {
                handleIncomingFileDone(data);
            } else if (data.xtype !== 'file') {
                newMessageDispatch({
                    type: "owner",
                    message: data.message
                });
            }
        });

        // Register global ACK receiver listener
        window.onFileChunkAckReceived = (fileId, ackIndex) => {
            const activeSession = window.activeSenderSessions ? window.activeSenderSessions[fileId] : null;
            if (activeSession) {
                // Restore status back to sending if it was paused/retrying
                setTransfers(prev => {
                    if (prev[fileId] && (prev[fileId].status === "paused" || prev[fileId].status === "retrying")) {
                        return {
                            ...prev,
                            [fileId]: {
                                ...prev[fileId],
                                status: "sending"
                            }
                        };
                    }
                    return prev;
                });

                // Reset heartbeat since progress is made
                resetHeartbeat(fileId);

                activeSession.latestAckIndex = Math.max(activeSession.latestAckIndex, ackIndex);
                
                // Slide window and send next chunks
                activeSession.sendNextChunks();
            }
        };

        // Resume Event Handlers
        socket.on('file-resume-request-received', (data) => {
            const fileId = data.fileId;
            const fileStore = window.incomingFiles ? window.incomingFiles[fileId] : null;
            if (fileStore) {
                // Find first missing index (first undefined chunk in array slot)
                let nextIndex = 0;
                for (let i = 0; i < fileStore.totalChunks; i++) {
                    if (fileStore.chunks[i] === undefined) {
                        nextIndex = i;
                        break;
                    }
                }
                
                // If all received, nextIndex is totalChunks
                if (fileStore.chunks.length === fileStore.totalChunks && !fileStore.chunks.includes(undefined)) {
                    nextIndex = fileStore.totalChunks;
                }

                // Send back response with nextIndex
                socket.emit("file-resume-response", {
                    roomName: roomName.name,
                    fileId: fileId,
                    nextIndex: nextIndex
                });
            }
        });

        socket.on('file-resume-response-received', (data) => {
            const fileId = data.fileId;
            const nextIndex = data.nextIndex;
            const session = window.activeSenderSessions ? window.activeSenderSessions[fileId] : null;
            if (session) {
                console.log(`Resuming file ${fileId} from chunk index ${nextIndex}`);

                // Update sender sliding window pointer
                session.nextChunkIndex = nextIndex;
                session.latestAckIndex = nextIndex - 1;
                session.isReading = false;

                // Update UI status to sending
                setTransfers(prev => ({
                    ...prev,
                    [fileId]: {
                        ...prev[fileId],
                        status: "sending"
                    }
                }));

                // Reset heartbeat and trigger streaming resumption
                resetHeartbeat(fileId);
                session.sendNextChunks();
            }
        });

        // Trigger queue processing if files are pre-loaded
        if (queued.queued.length > 0) {
            const nextFile = queued.queued[0];
            handleClick(nextFile);
            queued.queued.shift();
        }

        return () => {
            setDataChannelMessageHandler(null);
            socket.off('messageFromServer');
            socket.off('file-resume-request-received');
            socket.off('file-resume-response-received');
            window.onFileChunkAckReceived = null;
        }
    }, [userType, transfers, queued]);

    const handleIncomingFileMeta = (msg) => {
        window.incomingFiles = window.incomingFiles || {};
        window.incomingFiles[msg.fileId] = {
            name: msg.name,
            size: msg.size,
            type: msg.type,
            totalChunks: msg.totalChunks,
            chunks: [],
            receivedBytes: 0,
            heartbeatTimer: null
        };

        setTransfers(prev => ({
            ...prev,
            [msg.fileId]: {
                name: msg.name,
                size: msg.size,
                progress: 0,
                status: "receiving",
                type: msg.type
            }
        }));

        resetReceiverHeartbeat(msg.fileId);

        // Dispatch lightweight notification message into chat history
        newMessageDispatch({
            type: "owner",
            niFile: true,
            message: [{
                name: msg.name,
                size: msg.size,
                type: msg.type,
                fileId: msg.fileId
            }]
        });
    };

    const storeIncomingChunk = (fileId, index, binaryData) => {
        const fileStore = window.incomingFiles ? window.incomingFiles[fileId] : null;
        if (!fileStore) return;

        fileStore.chunks[index] = binaryData;
        fileStore.receivedBytes += binaryData.byteLength;

        // Reset receiver heartbeat on every received chunk
        resetReceiverHeartbeat(fileId);

        // Emit ACK back to the sender
        socket.emit("file-chunk-ack", {
            roomName: roomName.name,
            fileId: fileId,
            index: index
        });

        const percent = Math.min(100, Math.ceil((fileStore.receivedBytes / fileStore.size) * 100));

        setTransfers(prev => {
            const current = prev[fileId] || {};
            if (current.status !== "receiving" || current.progress !== percent) {
                return {
                    ...prev,
                    [fileId]: {
                        ...current,
                        status: "receiving",
                        progress: percent
                    }
                };
            }
            return prev;
        });
    };

    const handleIncomingFileDone = (msg) => {
        const fileStore = window.incomingFiles ? window.incomingFiles[msg.fileId] : null;
        if (!fileStore) return;

        // Clear receiver heartbeat timer
        if (fileStore.heartbeatTimer) {
            clearTimeout(fileStore.heartbeatTimer);
            fileStore.heartbeatTimer = null;
        }

        const blob = new Blob(fileStore.chunks, { type: fileStore.type });
        const objectUrl = URL.createObjectURL(blob);

        setTransfers(prev => ({
            ...prev,
            [msg.fileId]: {
                ...prev[msg.fileId],
                progress: 100,
                status: "done",
                objectUrl: objectUrl
            }
        }));

        // Clear binary chunks from browser memory cache to prevent leakage
        delete window.incomingFiles[msg.fileId];
    };

    const handleClick = (message) => {
        const file = window.fileMap ? window.fileMap[message.fileId] : null;
        if (!file) {
            console.error("File not found in local window cache map.");
            return;
        }

        const chunkSize = 32 * 1024; // High speed 32KB chunks
        const totalChunks = Math.ceil(file.size / chunkSize);
        const windowSize = 8; // Max 8 chunks in-flight (256KB)

        // Initialize active sending session in window map
        window.activeSenderSessions = window.activeSenderSessions || {};
        const session = {
            file: file,
            chunkSize: chunkSize,
            totalChunks: totalChunks,
            windowSize: windowSize,
            nextChunkIndex: 0,
            latestAckIndex: -1,
            isReading: false,
            reader: new FileReader(),
            ackTimeoutTimer: null,
            sendNextChunks: null
        };
        window.activeSenderSessions[message.fileId] = session;

        setTransfers(prev => ({
            ...prev,
            [message.fileId]: {
                name: file.name,
                size: file.size,
                progress: 0,
                status: "sending"
            }
        }));

        // Broadcast metadata to all room members over the stateless relay
        socket.emit("file-meta-relay", {
            roomName: roomName.name,
            fileId: message.fileId,
            name: file.name,
            size: file.size,
            type: file.type,
            totalChunks: totalChunks
        });

        const sendNextChunks = () => {
            if (session.isReading) return;

            // Reset heartbeat timer during active sending loop
            resetHeartbeat(message.fileId);

            // Check if we finished sending all chunks
            if (session.nextChunkIndex >= session.totalChunks) {
                // If all chunks are successfully acknowledged, we are fully done!
                if (session.latestAckIndex >= session.totalChunks - 1) {
                    socket.emit("file-done-relay", {
                        roomName: roomName.name,
                        fileId: message.fileId
                    });

                    // Clear timeout
                    if (session.ackTimeoutTimer) {
                        clearTimeout(session.ackTimeoutTimer);
                        session.ackTimeoutTimer = null;
                    }

                    setTransfers(prev => ({
                        ...prev,
                        [message.fileId]: {
                            ...prev[message.fileId],
                            progress: 100,
                            status: "done"
                        }
                    }));
                    
                    // Clear active sender session
                    delete window.activeSenderSessions[message.fileId];
                }
                return;
            }

            // Fill the sliding window: read and send while we have window capacity
            if (session.nextChunkIndex - session.latestAckIndex <= session.windowSize) {
                session.isReading = true;
                const offset = session.nextChunkIndex * session.chunkSize;
                const slice = session.file.slice(offset, offset + session.chunkSize);
                session.reader.readAsArrayBuffer(slice);
            }
        };

        // Attach function reference to session object for external access on retry
        session.sendNextChunks = sendNextChunks;

        session.reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            const currentSendingIndex = session.nextChunkIndex;

            // Stream chunk contents over socket binary relay
            submitBinaryChunk(roomName.name, message.fileId, currentSendingIndex, arrayBuffer);

            session.nextChunkIndex++;
            session.isReading = false;

            const offset = session.nextChunkIndex * session.chunkSize;
            const percent = Math.min(100, Math.ceil((offset / session.file.size) * 100));

            setTransfers(prev => {
                if (prev[message.fileId] && prev[message.fileId].progress === percent) {
                    return prev;
                }
                return {
                    ...prev,
                    [message.fileId]: {
                        ...prev[message.fileId],
                        progress: percent
                    }
                };
            });

            // Try to send the next chunk that fits in the window
            sendNextChunks();
        };

        // Trigger the initial batch burst (will fill up to the window size)
        sendNextChunks();
    };

    const handleRetry = (fileMeta) => {
        const fileId = fileMeta.fileId;
        const session = window.activeSenderSessions ? window.activeSenderSessions[fileId] : null;
        if (!session) {
            console.error("No active sender session found for retry.");
            return;
        }

        // Set status to retrying (or paused with spinner/indicator)
        setTransfers(prev => ({
            ...prev,
            [fileId]: {
                ...prev[fileId],
                status: "retrying"
            }
        }));

        // Request the resume point (first missing index) from the receiver
        socket.emit("file-resume-request", {
            roomName: roomName.name,
            fileId: fileId
        });
    };

    // Auto-Sync Debounce logic for active text composer (typing pause triggers sync!)
    const onComposerChange = (e) => {
        const text = e.target.value;
        setComposerText(text);

        if (text.trim() === "") {
            setSyncStatus("standby");
            if (autoSendTimerRef.current) {
                clearTimeout(autoSendTimerRef.current);
            }
            return;
        }

        setSyncStatus("typing");

        if (autoSendEnabled) {
            if (autoSendTimerRef.current) {
                clearTimeout(autoSendTimerRef.current);
            }
            autoSendTimerRef.current = setTimeout(() => {
                handleSendNote(text);
            }, 1200); // 1.2s auto-sync timer
        }
    };

    const handleSendNote = (textToSend) => {
        const finalMsg = textToSend || composerText;
        if (!finalMsg.trim()) return;

        // Dispatch locally in Redux
        newMessageDispatch({
            type: "guest",
            message: finalMsg
        });

        // Emit to room over Socket.io relay
        socket.emit("messageFromClient", {
            roomName: roomName.name,
            type: userType.userType || "guest",
            message: finalMsg,
            xtype: "text"
        });

        // Reset state
        setComposerText("");
        setSyncStatus("synced");

        // Reset sync status indicator back to standby after 1.5s
        setTimeout(() => {
            setSyncStatus(prev => prev === "synced" ? "standby" : prev);
        }, 1500);
    };

    // Helper functions for content card auto-detection
    const isUrl = (str) => {
        try {
            const url = new URL(str.trim());
            return url.protocol === "http:" || url.protocol === "https:";
        } catch (_) {
            return false;
        }
    };

    const isCode = (str) => {
        const trimmed = str.trim();
        if (trimmed.startsWith("```") && trimmed.endsWith("```")) return true;
        const codeKeywords = ["const ", "let ", "var ", "function ", "class ", "import ", "export ", "def ", "public ", "private "];
        return codeKeywords.some(keyword => trimmed.startsWith(keyword)) || (trimmed.startsWith("{") && trimmed.endsWith("}"));
    };

    const copyTextToClipboard = (text, element) => {
        navigator.clipboard.writeText(text).then(() => {
            const span = element.querySelector("span");
            if (span) {
                const originalText = span.innerText;
                span.innerText = "Copied! ✓";
                element.style.borderColor = "rgba(52, 199, 89, 0.4)";
                element.style.color = "#32D74B";
                
                setTimeout(() => {
                    span.innerText = originalText;
                    element.style.borderColor = "";
                    element.style.color = "";
                }, 1500);
            }
        });
    };

    // Check if channel is active (since sockets are instant, always true)
    const isChannelOpen = true;

    return (
        <div
            className="flex-1 flex flex-col justify-between min-h-0 w-full max-w-md mx-auto bg-[#121212]"
            style={{ borderRight: "1px solid #1f1f1f", borderLeft: "1px solid #1f1f1f" }}
        >
            {/* Header with Minimalist Notes/Chat Switcher Icons */}
            <div className="bg-[#1b1b1b] border-b border-[#252525] px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-white text-xs font-semibold tracking-wider uppercase">Relay</span>
                    <span className="text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded bg-[#242424] select-all">
                        {roomName.name}
                    </span>
                </div>

                {/* Header view mode toggler (Icons Only) */}
                <div className="flex bg-[#121212] p-0.5 rounded-lg border border-[#2b2b2b]">
                    <button
                        onClick={() => setViewMode("notes")}
                        title="Sticky Notes Stack"
                        className={`p-1.5 rounded transition-all duration-150 flex items-center justify-center ${
                            viewMode === "notes"
                                ? "bg-[#001AFF] text-white shadow-md"
                                : "text-gray-500 hover:text-white bg-transparent"
                        }`}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setViewMode("chat")}
                        title="Room Chat"
                        className={`p-1.5 rounded transition-all duration-150 flex items-center justify-center ${
                            viewMode === "chat"
                                ? "bg-[#001AFF] text-white shadow-md"
                                : "text-gray-500 hover:text-white bg-transparent"
                        }`}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content pane based on viewMode */}
            {viewMode === "notes" ? (
                /* NOTES MODE: Vertical Stack Pile (Newest at top) */
                <div
                    className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0"
                    style={{ scrollbarWidth: "thin" }}
                >
                    {messageFromServr.messages.slice().reverse().map(function(message, i) {
                        const isOwner = message.type === "owner";
                        // Skip empty text indicators
                        if (!message.message && !message.niFile) return null;

                        if (message.niFile) {
                            return (message.message || []).map((fileMeta, j) => {
                                const transfer = transfers[fileMeta.fileId] || { progress: 0, status: "idle" };
                                const isActive = transfer.status === "sending" || transfer.status === "receiving" || transfer.status === "paused" || transfer.status === "retrying";
                                const isDone = transfer.status === "done";

                                return (
                                    <div key={`${i}-${j}`} className="w-full">
                                        <div className={`bg-[#1E1E1E] rounded-xl p-3.5 border shadow-lg transition-all duration-200 text-left ${
                                            transfer.status === "paused" 
                                                ? "border-red-500/40 bg-red-950/5 shadow-red-950/20" 
                                                : transfer.status === "retrying"
                                                ? "border-yellow-500/40 bg-yellow-950/5 shadow-yellow-950/20"
                                                : "border-[#2b2b2b] hover:border-[#001AFF]/30"
                                        }`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Shared File</span>
                                                <span className={`flex items-center space-x-1 text-[9px] font-semibold ${
                                                    transfer.status === "paused" ? "text-red-400" : "text-green-400"
                                                }`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${
                                                        transfer.status === "paused" ? "bg-red-500" : "bg-green-400 animate-pulse"
                                                    }`}></span>
                                                    <span>{transfer.status === "paused" ? "Paused" : "Live Sync"}</span>
                                                </span>
                                            </div>

                                            <div className="flex items-center space-x-3 truncate">
                                                <div className="p-2.5 bg-[#001AFF] bg-opacity-10 text-[#001AFF] rounded-lg flex-shrink-0">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="truncate flex-1 text-left">
                                                    <h4 className="text-white text-xs font-semibold truncate leading-tight" title={fileMeta.name}>{fileMeta.name}</h4>
                                                    <span className="text-[#777777] text-[10px]">{formatBytes(fileMeta.size)}</span>
                                                </div>
                                            </div>

                                            {/* Dynamic Progress indicator */}
                                            {(isActive || isDone) && (
                                                <div className="mt-3">
                                                    <div className="w-full bg-[#121212] rounded-full h-1 overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-300 ease-out ${
                                                                transfer.status === "paused" 
                                                                    ? "bg-red-500" 
                                                                    : transfer.status === "retrying"
                                                                    ? "bg-yellow-500 animate-pulse"
                                                                    : "bg-[#001AFF]"
                                                            }`}
                                                            style={{ width: `${transfer.progress}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between items-center mt-1 text-[9px] text-[#777777]">
                                                        <span>
                                                            {transfer.status === "sending" 
                                                                ? "Streaming to Room..." 
                                                                : transfer.status === "receiving" 
                                                                ? "Receiving Stream..." 
                                                                : transfer.status === "paused"
                                                                ? "Transfer Paused"
                                                                : transfer.status === "retrying"
                                                                ? "Resuming..."
                                                                : "Ready in Room"}
                                                        </span>
                                                        <span className={transfer.status === "paused" ? "text-red-500 font-semibold" : ""}>
                                                            {transfer.progress}%
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action controls */}
                                            <div className="mt-2.5 flex justify-end space-x-2">
                                                {/* Send button for the uploading user */}
                                                {!isOwner && !isActive && !isDone && (
                                                    <button
                                                        className={`text-[10px] font-semibold px-2.5 py-1 rounded shadow transition-all duration-150 ${
                                                            isChannelOpen 
                                                                ? "bg-[#001AFF] text-white hover:bg-blue-700 cursor-pointer" 
                                                                : "bg-[#252525] text-gray-500 cursor-not-allowed"
                                                        }`}
                                                        onClick={() => handleClick(fileMeta)}
                                                        disabled={!isChannelOpen}
                                                    >
                                                        {isChannelOpen ? "Send to Room ☁" : "Connecting..."}
                                                    </button>
                                                )}

                                                {/* Retry/Paused status controls */}
                                                {!isOwner && transfer.status === "paused" && (
                                                    <button
                                                        className="text-[10px] font-semibold px-2.5 py-1 rounded border border-red-500/30 text-red-400 bg-red-950/20 hover:bg-red-900/30 shadow transition-all duration-150 cursor-pointer flex items-center space-x-1"
                                                        onClick={() => handleRetry(fileMeta)}
                                                    >
                                                        <span>Retry 🔄</span>
                                                    </button>
                                                )}

                                                {isOwner && transfer.status === "paused" && (
                                                    <div className="text-[9px] font-medium px-2 py-0.5 rounded border border-red-500/20 text-red-400 bg-red-950/10 flex items-center space-x-1 select-none">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping"></span>
                                                        <span>Paused</span>
                                                    </div>
                                                )}

                                                {/* Download/Save button for the receiving user */}
                                                {isOwner && isDone && (
                                                    <a
                                                        href={transfer.objectUrl || "#"}
                                                        download={fileMeta.name}
                                                        className="text-[10px] font-semibold px-2.5 py-1 rounded text-white bg-green-600 hover:bg-green-700 shadow transition-all duration-150 flex items-center space-x-1"
                                                    >
                                                        <span>Save File ⬇</span>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                        }

                        // Render Text Notes (URL, Code, or Text)
                        const msgText = typeof message.message === "string" ? message.message : "";
                        const urlMatch = isUrl(msgText);
                        const codeMatch = isCode(msgText);

                        if (urlMatch) {
                            return (
                                <div key={i} className="w-full">
                                    <div className="bg-[#1E1E1E] rounded-xl p-3.5 border border-[#2b2b2b] hover:border-[#001AFF]/30 shadow-lg text-left transition-all duration-200">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Web Link</span>
                                            <span className="flex items-center space-x-1 text-[9px] text-green-400 font-semibold">
                                                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                                <span>Live Sync</span>
                                            </span>
                                        </div>
                                        <div className="text-xs text-left truncate leading-normal">
                                            <a 
                                                href={msgText} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-[#001AFF] hover:underline break-all font-semibold"
                                            >
                                                {msgText}
                                            </a>
                                        </div>
                                        <div className="mt-2.5 flex justify-end">
                                            <button 
                                                onClick={(e) => copyTextToClipboard(msgText, e.currentTarget)}
                                                className="text-[9px] font-bold px-2.5 py-1 rounded border border-[#2b2b2b] text-gray-400 bg-[#171719] hover:bg-[#252527] transition-all flex items-center space-x-1 cursor-pointer"
                                            >
                                                <span>Copy Link</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        if (codeMatch) {
                            const cleanCode = msgText.replace(/```/g, "");
                            return (
                                <div key={i} className="w-full">
                                    <div className="bg-[#1E1E1E] rounded-xl p-3.5 border border-[#2b2b2b] hover:border-[#001AFF]/30 shadow-lg text-left transition-all duration-200">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Code Snippet</span>
                                            <span className="flex items-center space-x-1 text-[9px] text-green-400 font-semibold">
                                                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                                <span>Live Sync</span>
                                            </span>
                                        </div>
                                        <pre className="text-[10px] font-mono text-left bg-[#171719] p-2.5 rounded-lg text-gray-300 overflow-x-auto select-all max-h-40 border border-[#232325]">
                                            <code>{cleanCode}</code>
                                        </pre>
                                        <div className="mt-2.5 flex justify-end">
                                            <button 
                                                onClick={(e) => copyTextToClipboard(cleanCode, e.currentTarget)}
                                                className="text-[9px] font-bold px-2.5 py-1 rounded border border-[#2b2b2b] text-gray-400 bg-[#171719] hover:bg-[#252527] transition-all flex items-center space-x-1 cursor-pointer"
                                            >
                                                <span>Copy Snippet</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={i} className="w-full">
                                <div className="bg-[#1E1E1E] rounded-xl p-3.5 border border-[#2b2b2b] hover:border-[#001AFF]/30 shadow-lg text-left transition-all duration-200">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Pasted Note</span>
                                        <span className="flex items-center space-x-1 text-[9px] text-green-400 font-semibold">
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                            <span>Live Sync</span>
                                        </span>
                                    </div>
                                    <div className="text-xs text-left leading-relaxed text-gray-200 whitespace-pre-wrap break-words">
                                        {msgText}
                                    </div>
                                    <div className="mt-2.5 flex justify-end">
                                        <button 
                                            onClick={(e) => copyTextToClipboard(msgText, e.currentTarget)}
                                            className="text-[9px] font-bold px-2.5 py-1 rounded border border-[#2b2b2b] text-gray-400 bg-[#171719] hover:bg-[#252527] transition-all flex items-center space-x-1 cursor-pointer"
                                        >
                                            <span>Copy Note</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* CHAT MODE: Standard Chat Bubbles log (Scroll-free) */
                <div
                    className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0"
                    style={{ scrollbarWidth: "thin" }}
                >
                    {messageFromServr.messages.map(function(message, i){
                        const isOwner = message.type === "owner";
                        
                        // Skip empty text indicators
                        if (!message.message && !message.niFile) return null;

                        if (message.niFile) {
                            return (message.message || []).map((fileMeta, j) => {
                                const transfer = transfers[fileMeta.fileId] || { progress: 0, status: "idle" };
                                return (
                                    <div key={`${i}-${j}`} className={`flex w-full ${isOwner ? 'justify-start' : 'justify-end'}`}>
                                        <div className="bg-[#1E1E1E] rounded-xl px-3 py-2 text-xs border border-[#2b2b2b] text-left text-gray-300">
                                            📁 File Note: <span className="text-white font-medium">{fileMeta.name}</span> ({transfer.progress}%)
                                        </div>
                                    </div>
                                );
                            });
                        }

                        return (
                            <div
                                key={i}
                                className={`flex w-full ${isOwner ? 'justify-start' : 'justify-end'}`}
                            >
                                <div
                                    className={`max-w-[70%] rounded-xl px-3 py-2 text-xs leading-relaxed shadow-sm text-left break-all ${
                                        isOwner 
                                            ? 'bg-[#1E1E1E] text-gray-200 border border-[#2b2b2b]' 
                                            : 'bg-[#001AFF] text-white'
                                    }`}
                                >
                                    {message.message}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Integrated Minimalist Composer footer */}
            <div className="bg-[#121212] border-t border-[#1f1f1f] px-3 py-3">
                <div className="flex items-center space-x-2 w-full bg-[#1a1a1a] border border-[#2b2b2b] rounded-full px-3 py-1.5 focus-within:border-[#001AFF] transition-all duration-150 shadow-inner">
                    {/* Attachment Button */}
                    <div className="flex-shrink-0 flex items-center justify-center text-gray-400 hover:text-white transition-colors duration-150">
                        <Attachment msg={composerText} />
                    </div>

                    {/* Input Composer */}
                    <input 
                        type="text" 
                        value={composerText}
                        onChange={onComposerChange}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !autoSendEnabled) {
                                handleSendNote();
                            }
                        }}
                        placeholder={autoSendEnabled ? "Auto-syncs 1.2s after you pause..." : "Type text and hit enter to send..."}
                        className="flex-1 bg-transparent border-none outline-none text-white text-xs placeholder-[#555555] focus:ring-0 focus:outline-none py-1 px-1"
                        autoComplete="off"
                    />

                    {/* Auto/Manual Mode controller and Manual Send button */}
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {/* Tiny elegant Auto / Manual switch */}
                        <button
                            onClick={() => {
                                setAutoSendEnabled(!autoSendEnabled);
                                // Clear active timers
                                if (autoSendTimerRef.current) {
                                    clearTimeout(autoSendTimerRef.current);
                                }
                                setSyncStatus("standby");
                            }}
                            className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded transition-all duration-150 uppercase tracking-widest ${
                                autoSendEnabled
                                    ? "text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/20"
                                    : "text-gray-500 bg-[#252525] border border-transparent hover:text-white"
                            }`}
                            title={autoSendEnabled ? "Auto-Sync Enabled (Timer active)" : "Manual Send Mode"}
                        >
                            {autoSendEnabled ? "⚡ Auto" : "👤 Man"}
                        </button>

                        {/* Composer sync indicator (Auto Mode) or Send button (Manual Mode) */}
                        {autoSendEnabled ? (
                            <div 
                                className={`text-[8px] font-bold px-2 py-1 rounded-full flex items-center justify-center transition-all duration-200 select-none ${
                                    syncStatus === "typing"
                                        ? "text-yellow-500 bg-yellow-950/20"
                                        : syncStatus === "synced"
                                        ? "text-green-500 bg-green-950/20"
                                        : "text-gray-600"
                                }`}
                            >
                                <span className={`h-1 w-1 rounded-full mr-1 ${
                                    syncStatus === "typing"
                                        ? "bg-yellow-500 animate-pulse"
                                        : syncStatus === "synced"
                                        ? "bg-green-500"
                                        : "bg-gray-600"
                                }`}></span>
                                <span className="uppercase text-[7px] tracking-wider">
                                    {syncStatus === "typing" ? "Typing" : syncStatus === "synced" ? "Synced" : "Ready"}
                                </span>
                            </div>
                        ) : (
                            <button 
                                onClick={() => handleSendNote()}
                                disabled={!composerText.trim()}
                                className={`h-6 w-6 rounded-full flex items-center justify-center text-white shadow-md active:scale-95 focus:outline-none transition-all duration-150 ${
                                    composerText.trim() 
                                        ? "bg-[#001AFF] hover:bg-blue-700 cursor-pointer" 
                                        : "bg-[#252525] text-gray-600 cursor-not-allowed opacity-50"
                                }`}
                            >
                                <svg 
                                    className="w-3 h-3 transform rotate-45 -translate-x-[0.5px]" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24" 
                                    strokeWidth="2.5"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const mapStateToProps = state=> {
    return {
        ...state
    }
}
  
const mapDispatchToProps = dispatch => {
    return {
        sendMessage: (payload)=> dispatch(newMessageAction(payload)),
        percentageIncrease: (payload)=> dispatch(completion(payload)),
        newMessageDispatch: (payload, storedData=undefined)=> {
             if(storedData){
                 return dispatch(newMessageAction({...payload, message: storedData})) 
            } else { 
                 return dispatch(newMessageAction({...payload})) 
            } 
        }
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(ChartBody)
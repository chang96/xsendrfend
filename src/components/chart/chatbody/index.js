import ChartBodyElements from "./chatbodyelements";
import "./index.css"
import { connect } from "react-redux"
import { WebSocketContext } from "../../../utils/websocket"
import { newMessageAction, completion } from "../../../action/index"
import { useState, useContext, useEffect } from 'react'

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

    const { 
        socket, 
        setDataChannelMessageHandler,
        submitBinaryChunk
    } = useContext(WebSocketContext);

    // Socket connections are always open and instant
    const isChannelOpen = true;

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

    return (
        <div
            className="flex-1 flex flex-col justify-between min-h-0 w-full max-w-md mx-auto bg-[#121212]"
            style={{ borderRight: "1px solid #1f1f1f", borderLeft: "1px solid #1f1f1f" }}
        >
            {/* Space Title/Header */}
            <div className="bg-[#1b1b1b] border-b border-[#252525] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-white text-xs font-medium tracking-wider uppercase">Active Space</span>
                </div>
                <div className="text-gray-400 text-xs font-semibold px-2 py-0.5 rounded bg-[#242424]">
                    {roomName.name}
                </div>
            </div>

            {/* Chat/File log container */}
            <div
                className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0"
                style={{ scrollbarWidth: "thin" }}
            >
                {messageFromServr.messages.map(function(message, i){
                    const isOwner = message.type === "owner";

                    if (message.niFile) {
                        return (message.message || []).map((fileMeta, j) => {
                            const transfer = transfers[fileMeta.fileId] || { progress: 0, status: "idle" };
                            const isActive = transfer.status === "sending" || transfer.status === "receiving" || transfer.status === "paused" || transfer.status === "retrying";
                            const isDone = transfer.status === "done";

                            return (
                                <div 
                                    key={j} 
                                    className={`flex w-full ${isOwner ? 'justify-start' : 'justify-end'}`}
                                >
                                    <div className={`bg-[#1E1E1E] rounded-xl p-3 border shadow-lg w-72 transition-all duration-200 ${
                                        transfer.status === "paused" 
                                            ? "border-red-500/40 bg-red-950/5 shadow-red-950/20" 
                                            : transfer.status === "retrying"
                                            ? "border-yellow-500/40 bg-yellow-950/5 shadow-yellow-950/20"
                                            : "border-[#2b2b2b]"
                                    }`}>
                                        <div className="flex items-center space-x-3 truncate">
                                            <div className="p-2.5 bg-[#001AFF] bg-opacity-10 text-[#001AFF] rounded-lg">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div className="truncate text-left flex-1">
                                                <h4 className="text-white text-xs font-medium truncate leading-tight" title={fileMeta.name}>{fileMeta.name}</h4>
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

                    // Render Standard Text Messages
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

            {/* Input & attachments footer bar */}
            <div className="bg-[#121212] border-t border-[#1f1f1f] px-3 py-3">
                <ChartBodyElements />
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
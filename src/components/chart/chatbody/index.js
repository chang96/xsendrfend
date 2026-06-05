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
    const [viewMode, setViewMode] = useState("chat"); // "chat" (default) or "notes"
    const [notes, setNotes] = useState([]); // Collaborative note stack array
    const [composerText, setComposerText] = useState("");

    const { 
        socket, 
        setDataChannelMessageHandler,
        submitBinaryChunk,
        peersCount
    } = useContext(WebSocketContext);

    const [shouldShake, setShouldShake] = useState(false);
    const [notification, setNotification] = useState(null);
    const notificationTimeoutRef = useRef(null);

    const triggerNoDeviceAlert = () => {
        setShouldShake(true);
        setTimeout(() => setShouldShake(false), 400);

        setNotification("Connect another device to this room to start transferring.");

        if (notificationTimeoutRef.current) {
            clearTimeout(notificationTimeoutRef.current);
        }
        notificationTimeoutRef.current = setTimeout(() => {
            setNotification(null);
        }, 5000);
    };

    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        const shown = localStorage.getItem("faax_onboarding_shown");
        if (!shown) {
            setShowOnboarding(true);
        }
    }, []);

    const dismissOnboarding = () => {
        setShowOnboarding(false);
        localStorage.setItem("faax_onboarding_shown", "true");
    };

    useEffect(() => {
        return () => {
            if (notificationTimeoutRef.current) {
                clearTimeout(notificationTimeoutRef.current);
            }
        };
    }, []);

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
        // Automatically bind files with noteId from Redux message log into our collaborative notes stack
        messageFromServr.messages.forEach(msg => {
            if (msg.niFile && Array.isArray(msg.message)) {
                msg.message.forEach(fileMeta => {
                    if (fileMeta.noteId) {
                        setNotes(prev => {
                            return prev.map(n => {
                                if (n.id === fileMeta.noteId) {
                                    if (n.files.some(f => f.fileId === fileMeta.fileId)) return n;
                                    return {
                                        ...n,
                                        files: [...n.files, {
                                            ...fileMeta,
                                            ownerType: msg.type
                                        }]
                                    };
                                }
                                return n;
                            });
                        });
                    }
                });
            }
        });
    }, [messageFromServr.messages]);

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
                    if (msg.xtype === "note-create") {
                        handleIncomingNoteCreate(msg);
                    } else if (msg.xtype === "note-sync-text") {
                        handleIncomingNoteSyncText(msg);
                    } else if (msg.xtype === "note-delete") {
                        handleIncomingNoteDelete(msg);
                    } else if (msg.xtype === "file-meta") {
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
            if (data.xtype === "note-create") {
                handleIncomingNoteCreate(data);
            } else if (data.xtype === "note-sync-text") {
                handleIncomingNoteSyncText(data);
            } else if (data.xtype === "note-delete") {
                handleIncomingNoteDelete(data);
            } else if (data.xtype === "file-meta") {
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
                session.version++;

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

        // Initialize first collaborative note automatically if notes stack is empty
        setNotes(prev => {
            if (prev.length === 0) {
                return [{ id: "default", text: "", files: [], isEditing: false }];
            }
            return prev;
        });

        return () => {
            setDataChannelMessageHandler(null);
            socket.off('messageFromServer');
            socket.off('file-resume-request-received');
            socket.off('file-resume-response-received');
            window.onFileChunkAckReceived = null;
        }
    }, [userType, transfers, queued, roomName.name]);

    const handleIncomingNoteCreate = (data) => {
        const noteId = data.noteId;
        setNotes(prev => {
            if (prev.some(n => n.id === noteId)) return prev;
            return [...prev, { id: noteId, text: "", files: [], isEditing: false }];
        });
    };

    const handleIncomingNoteSyncText = (data) => {
        const noteId = data.noteId;
        const text = data.text;
        setNotes(prev => {
            return prev.map(n => {
                if (n.id === noteId) {
                    return { ...n, text: text };
                }
                return n;
            });
        });
    };

    const handleIncomingNoteDelete = (data) => {
        const noteId = data.noteId;
        setNotes(prev => prev.filter(n => n.id !== noteId));
    };

    const handleIncomingFileMeta = (msg) => {
        let noteId = msg.noteId;
        if (!noteId && msg.fileId && msg.fileId.startsWith("file--")) {
            const parts = msg.fileId.split("--");
            if (parts.length >= 2) {
                noteId = parts[1];
            }
        }

        window.incomingFiles = window.incomingFiles || {};
        window.incomingFiles[msg.fileId] = {
            name: msg.name,
            size: msg.size,
            type: msg.type,
            totalChunks: msg.totalChunks,
            chunks: [],
            receivedBytes: 0,
            heartbeatTimer: null,
            noteId: noteId
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

        // Bind file metadata locally inside note card files array
        if (noteId) {
            setNotes(prev => {
                return prev.map(n => {
                    if (n.id === noteId) {
                        if (n.files.some(f => f.fileId === msg.fileId)) return n;
                        return {
                            ...n,
                            files: [...n.files, {
                                name: msg.name,
                                size: msg.size,
                                type: msg.type,
                                fileId: msg.fileId,
                                noteId: noteId,
                                ownerType: "owner"
                            }]
                        };
                    }
                    return n;
                });
            });
        }
    };

    const storeIncomingChunk = (fileId, index, binaryData) => {
        const fileStore = window.incomingFiles ? window.incomingFiles[fileId] : null;
        if (!fileStore) return;

        // Prevent duplicate chunk byte aggregation in case of retransmissions
        if (fileStore.chunks[index] !== undefined) {
            return;
        }

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
        if (peersCount === 0) {
            triggerNoDeviceAlert();
            return;
        }
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
            version: 0,
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
            totalChunks: totalChunks,
            noteId: message.noteId
        });

        const sendNextChunks = () => {
            // Guard against operations when paused
            const activeSession = window.activeSenderSessions ? window.activeSenderSessions[message.fileId] : null;
            if (!activeSession) return;

            // Reset heartbeat timer during active sending loop
            resetHeartbeat(message.fileId);

            // Check if we finished sending all chunks
            if (activeSession.nextChunkIndex >= activeSession.totalChunks) {
                // If all chunks are successfully acknowledged, we are fully done!
                if (activeSession.latestAckIndex >= activeSession.totalChunks - 1) {
                    socket.emit("file-done-relay", {
                        roomName: roomName.name,
                        fileId: message.fileId
                      });

                    if (activeSession.ackTimeoutTimer) {
                        clearTimeout(activeSession.ackTimeoutTimer);
                        activeSession.ackTimeoutTimer = null;
                    }

                    setTransfers(prev => ({
                        ...prev,
                        [message.fileId]: {
                            ...prev[message.fileId],
                            progress: 100,
                            status: "done"
                        }
                    }));
                    
                    delete window.activeSenderSessions[message.fileId];
                }
                return;
            }

            // Fill the sliding window: read and send while we have window capacity
            const inFlight = activeSession.nextChunkIndex - activeSession.latestAckIndex;
            if (inFlight <= activeSession.windowSize) {
                const chunkIndex = activeSession.nextChunkIndex;
                const currentVersion = activeSession.version;
                activeSession.nextChunkIndex++;

                const offset = chunkIndex * activeSession.chunkSize;
                const slice = activeSession.file.slice(offset, offset + activeSession.chunkSize);
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    // Check if the session is still active
                    const s = window.activeSenderSessions ? window.activeSenderSessions[message.fileId] : null;
                    if (!s) return;

                    // If a resume handshake happened in the meantime, discard this read
                    if (currentVersion !== s.version) {
                        return;
                    }

                    // Check if this chunk is already processed
                    if (chunkIndex <= s.latestAckIndex) {
                        return;
                    }

                    const arrayBuffer = e.target.result;

                    // Stream chunk contents over socket binary relay
                    submitBinaryChunk(roomName.name, message.fileId, chunkIndex, arrayBuffer);

                    const percent = Math.min(100, Math.ceil(((chunkIndex + 1) * s.chunkSize) / s.file.size * 100));

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

                    // Trigger next chunk reading
                    sendNextChunks();
                };

                reader.readAsArrayBuffer(slice);

                // Try to fill window concurrently
                sendNextChunks();
            }
        };

        // Attach function reference to session object for external access on retry
        session.sendNextChunks = sendNextChunks;

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

    // Collaborative Note Creators & Synchronizers
    const handleCreateNote = () => {
        if (peersCount === 0) {
            triggerNoDeviceAlert();
        }
        const newNoteId = "note_" + Math.random().toString(36).substring(2, 9);
        
        // Add note card locally
        setNotes(prev => [
            ...prev,
            { id: newNoteId, text: "", files: [], isEditing: false }
        ]);

        // Emit creation event to the room
        socket.emit("messageFromClient", {
            roomName: roomName.name,
            xtype: "note-create",
            noteId: newNoteId
        });
    };

    const handleNoteTextChange = (noteId, e) => {
        if (peersCount === 0) {
            triggerNoDeviceAlert();
        }
        const newText = e.target.value;
        
        // Update locally
        setNotes(prev => {
            return prev.map(n => {
                if (n.id === noteId) {
                    return { ...n, text: newText };
                }
                return n;
            });
        });

        // Emit text updates character-by-character in real-time
        socket.emit("messageFromClient", {
            roomName: roomName.name,
            xtype: "note-sync-text",
            noteId: noteId,
            text: newText
        });
    };

    const handleDeleteNote = (noteId) => {
        // Remove locally
        setNotes(prev => prev.filter(n => n.id !== noteId));

        // Emit deletion to room
        socket.emit("messageFromClient", {
            roomName: roomName.name,
            xtype: "note-delete",
            noteId: noteId
        });
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
            className="flex-1 flex flex-col justify-between min-h-0 w-full max-w-md mx-auto bg-[#121212] relative"
            style={{ borderRight: "1px solid #1f1f1f", borderLeft: "1px solid #1f1f1f" }}
        >
            {/* Header with Minimalist Notes/Chat Switcher Icons */}
            <div className="bg-[#1b1b1b] border-b border-[#252525] px-4 py-2.5 flex items-center justify-between">
                <div className={`flex items-center space-x-2 transition-all duration-300 ${shouldShake ? 'animate-shake' : ''}`}>
                    <span className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${peersCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                    <span className="text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded bg-[#242424] select-all">
                        {roomName.name}
                    </span>
                    <span className={`text-[10px] font-semibold transition-all duration-300 ${peersCount > 0 ? 'text-gray-400' : 'text-red-400'}`}>
                        {peersCount} {peersCount === 1 ? 'device' : 'devices'} connected
                    </span>
                </div>

                {/* Alert Notification Banner */}
                {notification && (
                    <div className="absolute top-[48px] left-4 right-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 backdrop-blur-md z-30 flex items-center justify-between shadow-lg transition-all duration-300">
                        <div className="flex items-center space-x-2 text-left">
                            <svg className="w-4.5 h-4.5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-red-200 text-[10px] font-medium leading-relaxed">
                                {notification}
                            </span>
                        </div>
                        <button 
                            onClick={() => setNotification(null)}
                            className="text-red-400 hover:text-white text-[10px] ml-2 font-bold cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>
                )}

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

            {/* Onboarding popover */}
            {showOnboarding && (
                <div className="absolute right-4 top-[48px] bg-[#1E1E1F]/95 border border-[#2b2b2b] rounded-xl p-3.5 shadow-2xl z-40 max-w-[220px] text-[10px] text-gray-300 leading-relaxed text-left backdrop-blur-md">
                    <div className="absolute right-6 top-[-5px] w-2.5 h-2.5 bg-[#1E1E1F] border-t border-l border-[#2b2b2b] rotate-45"></div>
                    <p className="font-semibold text-white mb-2 uppercase tracking-wider text-[8px] flex items-center space-x-1">
                        <span>💡 Interface Modes</span>
                    </p>
                    <div className="space-y-2 text-[10px] text-gray-400">
                        <div>
                            <span className="font-bold text-white">📝 Notes:</span> Type text or upload files inside collaborative note cards that sync character-by-character in real-time.
                        </div>
                        <div>
                            <span className="font-bold text-white">💬 Chat:</span> Send standard messages and transfer files directly inside a rolling room timeline.
                        </div>
                    </div>
                    <button 
                        onClick={dismissOnboarding}
                        className="mt-3 w-full py-1.5 rounded-lg bg-[#001AFF] hover:bg-blue-700 text-white font-bold text-[8px] uppercase tracking-widest transition-all cursor-pointer"
                    >
                        Got it
                    </button>
                </div>
            )}

            {/* Content pane based on viewMode */}
            {viewMode === "notes" ? (
                /* NOTES MODE: Collaborative Notes stack pile (Newest at top) */
                <div
                    className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0"
                    style={{ scrollbarWidth: "thin" }}
                >
                    {notes.length === 0 ? (
                        /* Empty state placeholder */
                        <div className="h-full flex flex-col items-center justify-center text-center px-6">
                            <div className="p-4 bg-[#1E1E1E] rounded-full text-gray-500 mb-3">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-gray-400 text-xs font-semibold tracking-wider uppercase">No Notes Yet</h3>
                            <p className="text-gray-600 text-[10px] mt-1 max-w-[240px] leading-relaxed">
                                Click the "Create Note" button below to add a collaborative real-time mirrored card!
                            </p>
                        </div>
                    ) : (
                        notes.slice().reverse().map(function(note, index) {
                            const noteNum = notes.length - index;
                            const urlMatch = isUrl(note.text);
                            const codeMatch = isCode(note.text);

                            return (
                                <div key={note.id} className="w-full">
                                    <div className="bg-[#1E1E1E] rounded-2xl p-4 border border-[#2b2b2b] hover:border-[#001AFF]/30 shadow-lg text-left transition-all duration-200 flex flex-col space-y-3">
                                        
                                        {/* Card Header */}
                                        <div className="flex justify-between items-center border-b border-[#252527] pb-2">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Note #{noteNum}</span>
                                            </div>
                                            <div className="flex items-center space-x-2.5">
                                                {/* File Attachment Button inside specific note */}
                                                <div className="text-gray-400 hover:text-white transition-colors duration-150">
                                                    <Attachment noteId={note.id} peersCount={peersCount} triggerNoDeviceAlert={triggerNoDeviceAlert} />
                                                </div>
                                                
                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => handleDeleteNote(note.id)}
                                                    className="text-gray-500 hover:text-red-500 transition-colors duration-150"
                                                    title="Delete Note"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Card Textarea Editor (Time-free continuous typing) */}
                                        <div className="w-full">
                                            <textarea
                                                value={note.text}
                                                onChange={(e) => handleNoteTextChange(note.id, e)}
                                                placeholder="Pasted links, snippets or text... Updates instantly on all devices!"
                                                className="w-full bg-transparent border-none outline-none text-white text-xs placeholder-[#444446] focus:ring-0 focus:outline-none resize-y py-0.5 leading-relaxed min-h-[60px]"
                                            />
                                        </div>

                                        {/* Auto-detected rich preview tools */}
                                        {urlMatch && (
                                            <div className="p-2 bg-[#121214] border border-[#2b2b2d] rounded-xl flex items-center justify-between">
                                                <a 
                                                    href={note.text.trim()} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-[#001AFF] hover:underline text-[10px] font-semibold break-all truncate flex-1 text-left mr-2"
                                                >
                                                    🌐 Open Live Link
                                                </a>
                                                <button 
                                                    onClick={(e) => copyTextToClipboard(note.text.trim(), e.currentTarget)}
                                                    className="text-[8px] font-bold px-2 py-0.5 rounded border border-[#2b2b2b] text-gray-400 bg-[#171719] hover:bg-[#252527] transition-all flex items-center space-x-1 cursor-pointer flex-shrink-0"
                                                >
                                                    <span>Copy Link</span>
                                                </button>
                                            </div>
                                        )}

                                        {codeMatch && (
                                            <div className="flex justify-between items-center bg-[#121214] border border-[#2b2b2d] p-2 rounded-xl">
                                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-mono">Monospace Snippet</span>
                                                <button 
                                                    onClick={(e) => copyTextToClipboard(note.text.replace(/```/g, ""), e.currentTarget)}
                                                    className="text-[8px] font-bold px-2 py-0.5 rounded border border-[#2b2b2b] text-gray-400 bg-[#171719] hover:bg-[#252527] transition-all flex items-center space-x-1 cursor-pointer"
                                                >
                                                    <span>Copy Snippet</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* 1-Click Copy for standard notes */}
                                        {!urlMatch && !codeMatch && note.text.trim().length > 0 && (
                                            <div className="flex justify-end pt-1">
                                                <button 
                                                    onClick={(e) => copyTextToClipboard(note.text, e.currentTarget)}
                                                    className="text-[8px] font-bold px-2 py-0.5 rounded border border-[#2b2b2b] text-gray-400 bg-[#171719] hover:bg-[#252527] transition-all flex items-center space-x-1 cursor-pointer"
                                                >
                                                    <span>Copy Note</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Card-Specific File progress render area */}
                                        {note.files && note.files.length > 0 && (
                                            <div className="space-y-2 border-t border-[#252527] pt-3">
                                                {note.files.map((fileMeta) => {
                                                    const transfer = transfers[fileMeta.fileId] || { progress: 0, status: "idle" };
                                                    const isActive = transfer.status === "sending" || transfer.status === "receiving" || transfer.status === "paused" || transfer.status === "retrying";
                                                    const isDone = transfer.status === "done";
                                                    const isOwner = fileMeta.ownerType === "owner";

                                                    return (
                                                        <div key={fileMeta.fileId} className="w-full text-xs text-left bg-[#121214] border border-[#2b2b2d] rounded-xl p-2.5">
                                                            <div className="flex items-center space-x-2 truncate">
                                                                <div className="p-2 bg-[#001AFF] bg-opacity-10 text-[#001AFF] rounded-lg flex-shrink-0">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                    </svg>
                                                                </div>
                                                                <div className="truncate flex-1 text-left">
                                                                    <h4 className="text-white text-[11px] font-semibold truncate leading-tight" title={fileMeta.name}>{fileMeta.name}</h4>
                                                                    <span className="text-[#777777] text-[9px]">{formatBytes(fileMeta.size)}</span>
                                                                </div>
                                                            </div>

                                                            {/* Dynamic Progress indicator */}
                                                            {(isActive || isDone) && (
                                                                <div className="mt-2.5">
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
                                                                    <div className="flex justify-between items-center mt-1 text-[8px] text-[#777777]">
                                                                        <span>
                                                                            {transfer.status === "sending" 
                                                                                ? "Streaming..." 
                                                                                : transfer.status === "receiving" 
                                                                                ? "Receiving..." 
                                                                                : transfer.status === "paused"
                                                                                ? "Paused"
                                                                                : transfer.status === "retrying"
                                                                                ? "Resuming..."
                                                                                : "Ready"}
                                                                        </span>
                                                                        <span>{transfer.progress}%</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Action controls */}
                                                            <div className="mt-2 flex justify-end space-x-1.5">
                                                                {/* Send button for the uploading user */}
                                                                {!isOwner && !isActive && !isDone && (
                                                                    <button
                                                                        className={`text-[9px] font-semibold px-2 py-0.5 rounded shadow transition-all duration-150 ${
                                                                            isChannelOpen 
                                                                                ? "bg-[#001AFF] text-white hover:bg-blue-700 cursor-pointer" 
                                                                                : "bg-[#252525] text-gray-500 cursor-not-allowed"
                                                                        }`}
                                                                        onClick={() => handleClick(fileMeta)}
                                                                        disabled={!isChannelOpen}
                                                                    >
                                                                        {isChannelOpen ? "Send ☁" : "Connecting..."}
                                                                    </button>
                                                                )}

                                                                {/* Retry/Paused status controls */}
                                                                {!isOwner && transfer.status === "paused" && (
                                                                    <button
                                                                        className="text-[9px] font-semibold px-2 py-0.5 rounded border border-red-500/30 text-red-400 bg-red-950/20 hover:bg-red-900/30 shadow transition-all duration-150 cursor-pointer flex items-center space-x-1"
                                                                        onClick={() => handleRetry(fileMeta)}
                                                                    >
                                                                        <span>Retry 🔄</span>
                                                                    </button>
                                                                )}

                                                                {isOwner && transfer.status === "paused" && (
                                                                    <div className="text-[8px] font-medium px-2 py-0.5 rounded border border-red-500/20 text-red-400 bg-red-950/10 flex items-center space-x-1 select-none">
                                                                        <span className="h-1 w-1 rounded-full bg-red-400 animate-ping"></span>
                                                                        <span>Paused</span>
                                                                    </div>
                                                                )}

                                                                {/* Download/Save button for the receiving user */}
                                                                {isOwner && isDone && (
                                                                    <a
                                                                        href={transfer.objectUrl || "#"}
                                                                        download={fileMeta.name}
                                                                        className="text-[9px] font-semibold px-2 py-0.5 rounded text-white bg-green-600 hover:bg-green-700 shadow transition-all duration-150 flex items-center space-x-1"
                                                                    >
                                                                        <span>Save ⬇</span>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                /* CHAT MODE: Standard Chat Bubbles log (Fallback Room Chat) */
                <div
                    className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0"
                    style={{ scrollbarWidth: "thin" }}
                >
                    {messageFromServr.messages.map(function(message, i){
                        const isOwner = message.type === "owner";
                        
                        // Skip empty text logs
                        if (!message.message && !message.niFile) return null;

                        if (message.niFile) {
                            return (message.message || []).map((fileMeta, j) => {
                                const transfer = transfers[fileMeta.fileId] || { progress: 0, status: "idle" };
                                const isActive = transfer.status === "sending" || transfer.status === "receiving" || transfer.status === "paused" || transfer.status === "retrying";
                                const isDone = transfer.status === "done";
                                const isFileOwner = fileMeta.ownerType === "owner";

                                return (
                                    <div key={`${i}-${j}`} className={`flex w-full ${isOwner ? 'justify-start' : 'justify-end'} mb-2`}>
                                        <div className="w-full max-w-[280px] text-xs text-left bg-[#1E1E1E] border border-[#2b2b2b] rounded-xl p-3 shadow-md">
                                            <div className="flex items-center space-x-2 truncate">
                                                <div className="p-2 bg-[#001AFF] bg-opacity-10 text-[#001AFF] rounded-lg flex-shrink-0">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="truncate flex-1 text-left">
                                                    <h4 className="text-white text-[11px] font-semibold truncate leading-tight" title={fileMeta.name}>{fileMeta.name}</h4>
                                                    <span className="text-[#777777] text-[9px]">{formatBytes(fileMeta.size)}</span>
                                                </div>
                                            </div>

                                            {/* Dynamic Progress indicator */}
                                            {(isActive || isDone) && (
                                                <div className="mt-2.5">
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
                                                    <div className="flex justify-between items-center mt-1 text-[8px] text-[#777777]">
                                                        <span>
                                                            {transfer.status === "sending" 
                                                                ? "Streaming..." 
                                                                : transfer.status === "receiving" 
                                                                ? "Receiving..." 
                                                                : transfer.status === "paused"
                                                                ? "Paused"
                                                                : transfer.status === "retrying"
                                                                ? "Resuming..."
                                                                : "Ready"}
                                                        </span>
                                                        <span>{transfer.progress}%</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action controls */}
                                            <div className="mt-2 flex justify-end space-x-1.5">
                                                {/* Send button for the uploading user */}
                                                {!isFileOwner && !isActive && !isDone && (
                                                    <button
                                                        className={`text-[9px] font-semibold px-2 py-0.5 rounded shadow transition-all duration-150 ${
                                                            isChannelOpen 
                                                                ? "bg-[#001AFF] text-white hover:bg-blue-700 cursor-pointer" 
                                                                : "bg-[#252525] text-gray-500 cursor-not-allowed"
                                                        }`}
                                                        onClick={() => handleClick(fileMeta)}
                                                        disabled={!isChannelOpen}
                                                    >
                                                        {isChannelOpen ? "Send ☁" : "Connecting..."}
                                                    </button>
                                                )}

                                                {/* Retry/Paused status controls */}
                                                {!isFileOwner && transfer.status === "paused" && (
                                                    <button
                                                        className="text-[9px] font-semibold px-2 py-0.5 rounded border border-red-500/30 text-red-400 bg-red-950/20 hover:bg-red-900/30 shadow transition-all duration-150 cursor-pointer flex items-center space-x-1"
                                                        onClick={() => handleRetry(fileMeta)}
                                                    >
                                                        <span>Retry 🔄</span>
                                                    </button>
                                                )}

                                                {isFileOwner && transfer.status === "paused" && (
                                                    <div className="text-[8px] font-medium px-2 py-0.5 rounded border border-red-500/20 text-red-400 bg-red-950/10 flex items-center space-x-1 select-none">
                                                        <span className="h-1 w-1 rounded-full bg-red-400 animate-ping"></span>
                                                        <span>Paused</span>
                                                    </div>
                                                )}

                                                {/* Download/Save button for the receiving user */}
                                                {isFileOwner && isDone && (
                                                    <a
                                                        href={transfer.objectUrl || "#"}
                                                        download={fileMeta.name}
                                                        className="text-[9px] font-semibold px-2 py-0.5 rounded text-white bg-green-600 hover:bg-green-700 shadow transition-all duration-150 flex items-center space-x-1"
                                                    >
                                                        <span>Save ⬇</span>
                                                    </a>
                                                )}
                                            </div>
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

            {/* Integrated Collaborative notes footer */}
            {viewMode === "notes" ? (
                /* NOTES COMPOSER: Pure minimalist "Create Note" trigger */
                <div className="bg-[#121212] border-t border-[#1f1f1f] px-4 py-3.5 flex justify-center flex-shrink-0">
                    <button
                        onClick={handleCreateNote}
                        className="w-full max-w-xs py-2.5 rounded-xl bg-[#001AFF] hover:bg-blue-700 text-white font-semibold text-xs tracking-wider uppercase shadow-md transition-all duration-150 active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                        <span className="text-sm font-light">＋</span>
                        <span>Create Note</span>
                    </button>
                </div>
            ) : (
                /* CHAT COMPOSER: Standard input bar */
                <div className="bg-[#121212] border-t border-[#1f1f1f] px-3 py-3 flex-shrink-0">
                    <div className="flex items-center space-x-2 w-full bg-[#1a1a1a] border border-[#2b2b2b] rounded-full px-3 py-1.5 focus-within:border-[#001AFF] transition-all duration-150 shadow-inner">
                        {/* Dummy attachment trigger for standard room chat */}
                        <div className="flex-shrink-0 flex items-center justify-center text-gray-400 hover:text-white transition-colors duration-150">
                            <Attachment peersCount={peersCount} triggerNoDeviceAlert={triggerNoDeviceAlert} />
                        </div>

                        <input 
                            type="text" 
                            value={composerText}
                            onChange={(e) => {
                                setComposerText(e.target.value);
                                if (peersCount === 0 && e.target.value.length > 0) {
                                    triggerNoDeviceAlert();
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    if (peersCount === 0) {
                                        triggerNoDeviceAlert();
                                        return;
                                    }
                                    // Send standard chat message
                                    if (!composerText.trim()) return;
                                    newMessageDispatch({ type: "guest", message: composerText });
                                    socket.emit("messageFromClient", {
                                        roomName: roomName.name,
                                        type: userType.userType || "guest",
                                        message: composerText,
                                        xtype: "text"
                                    });
                                    setComposerText("");
                                }
                            }}
                            placeholder="Type room chat message..."
                            className="flex-1 bg-transparent border-none outline-none text-white text-xs placeholder-[#555555] focus:ring-0 focus:outline-none py-1 px-1"
                            autoComplete="off"
                        />

                        <button 
                            onClick={() => {
                                if (peersCount === 0) {
                                    triggerNoDeviceAlert();
                                    return;
                                }
                                if (!composerText.trim()) return;
                                newMessageDispatch({ type: "guest", message: composerText });
                                socket.emit("messageFromClient", {
                                    roomName: roomName.name,
                                    type: userType.userType || "guest",
                                    message: composerText,
                                    xtype: "text"
                                });
                                setComposerText("");
                            }}
                            disabled={!composerText.trim()}
                            className={`h-6 w-6 rounded-full flex items-center justify-center text-white shadow-md active:scale-95 focus:outline-none transition-all duration-150 flex-shrink-0 ${
                                composerText.trim() 
                                    ? "bg-[#001AFF] hover:bg-blue-700 cursor-pointer" 
                                    : "bg-[#252525] text-gray-600 cursor-not-allowed opacity-50"
                            }`}
                        >
                            <svg className="w-3.5 h-3.5 transform rotate-45 -translate-x-[0.5px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
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
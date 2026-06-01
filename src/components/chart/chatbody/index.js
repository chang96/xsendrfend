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
        setBufferedAmountLowHandler,
        submitBinaryChunk
    } = useContext(WebSocketContext);

    // Socket connections are always open and instant
    const isChannelOpen = true;

    useEffect(() => {
        // Register Socket/WebRTC incoming chunk message handler
        setDataChannelMessageHandler((event) => {
            if (event.isSocketRelay) {
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

        // Trigger queue processing if files are pre-loaded
        if (queued.queued.length > 0) {
            const nextFile = queued.queued[0];
            handleClick(nextFile);
            queued.queued.shift();
        }

        return () => {
            setDataChannelMessageHandler(null);
            setBufferedAmountLowHandler(null);
            socket.off('messageFromServer');
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
            receivedBytes: 0
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

        const percent = Math.min(100, Math.ceil((fileStore.receivedBytes / fileStore.size) * 100));

        setTransfers(prev => {
            if (prev[fileId] && prev[fileId].progress === percent) {
                return prev;
            }
            return {
                ...prev,
                [fileId]: {
                    ...prev[fileId],
                    progress: percent
                }
            };
        });
    };

    const handleIncomingFileDone = (msg) => {
        const fileStore = window.incomingFiles ? window.incomingFiles[msg.fileId] : null;
        if (!fileStore) return;

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
        let offset = 0;
        let chunkIndex = 0;

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

        const reader = new FileReader();

        const readNextChunk = () => {
            if (offset >= file.size) {
                // Transfer successfully completed
                socket.emit("file-done-relay", {
                    roomName: roomName.name,
                    fileId: message.fileId
                });

                setTransfers(prev => ({
                    ...prev,
                    [message.fileId]: {
                        ...prev[message.fileId],
                        progress: 100,
                        status: "done"
                    }
                }));
                return;
            }

            const slice = file.slice(offset, offset + chunkSize);
            reader.readAsArrayBuffer(slice);
        };

        reader.onload = (e) => {
            const arrayBuffer = e.target.result;

            // Stream chunk contents over high-reliability socket binary relay
            submitBinaryChunk(roomName.name, message.fileId, chunkIndex, arrayBuffer);

            offset += arrayBuffer.byteLength;
            chunkIndex++;

            const percent = Math.min(100, Math.ceil((offset / file.size) * 100));

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

            // Small delay to allow browser thread to handle visual updates smoothly
            setTimeout(readNextChunk, 1);
        };

        readNextChunk();
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
                            const isActive = transfer.status === "sending" || transfer.status === "receiving";
                            const isDone = transfer.status === "done";

                            return (
                                <div 
                                    key={j} 
                                    className={`flex w-full ${isOwner ? 'justify-start' : 'justify-end'}`}
                                >
                                    <div className="bg-[#1E1E1E] rounded-xl p-3 border border-[#2b2b2b] shadow-lg w-72 transition-all duration-200">
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
                                                        className="bg-[#001AFF] h-full rounded-full transition-all duration-300 ease-out"
                                                        style={{ width: `${transfer.progress}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center mt-1 text-[9px] text-[#777777]">
                                                    <span>{transfer.status === "sending" ? "Streaming to Room..." : transfer.status === "receiving" ? "Receiving Stream..." : "Ready in Room"}</span>
                                                    <span>{transfer.progress}%</span>
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
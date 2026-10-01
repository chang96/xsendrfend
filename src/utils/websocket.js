import React, { createContext, useState, useEffect } from 'react'
import { useDispatch } from 'react-redux';
import openSocket from "socket.io-client";
import {
  createSpaceAction,
  changRoomNameAction,
  setUserType,
  connectionEstablished,
  connecting
} from "../action/index"
import { saveGuestPass, removeOwnership, setLastAlias } from "./ownership"

const ENDPOINT = process.env.REACT_APP_SOCKET_URL || "https://faax.sandymoon.com.ng"
const WebSocketContext = createContext(null)

export { WebSocketContext }

let socket;
let statusOwner;
let statusReceiver;
let currentRoom;
let dataChannelMessageHandler = null;
// How to get back into an alias room after a reconnect:
// { type: "owner", alias, deviceId, key } | { type: "guest", alias, guestPass }
let currentAuth = null;

export default ({ children }) => {
  const [peersCount, setPeersCount] = useState(0);
  const [latency, setLatency] = useState(0);
  const [aliasSession, setAliasSession] = useState(null); // { alias, role: "owner" | "guest" }
  const [knocks, setKnocks] = useState([]);               // owner side: guests waiting at the door
  const dispatch = useDispatch();

  const sendMessage = (roomId, message) => {}

  function createRoom() {
    socket.emit("createRoom", { room: true })
  }

  function joinRoom(roomName) {
    socket.emit("joinRoom", { roomName: roomName })
  }

  // Promise wrapper around socket.io acknowledgements
  function request(event, payload, timeoutMs = 10000) {
    return new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done) { done = true; resolve({ ok: false, error: "timeout" }); }
      }, timeoutMs);
      socket.emit(event, payload || {}, (res) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(res || { ok: false, error: "no_response" });
      });
    });
  }

  function enterRoom(room, role) {
    currentRoom = room;
    if (role === "owner") statusOwner = "owner";
    else statusReceiver = "guest";
    dispatch(setUserType(role));
    dispatch(createSpaceAction());
    dispatch(changRoomNameAction(room));
  }

  async function enterAsOwner(alias, creds) {
    const res = await request("alias:enter", { alias, deviceId: creds.deviceId, key: creds.key });
    if (res.ok) {
      currentAuth = { type: "owner", alias: res.alias, deviceId: creds.deviceId, key: creds.key };
      setLastAlias(res.alias);
      setAliasSession({ alias: res.alias, role: "owner", deviceId: creds.deviceId });
      enterRoom(res.room, "owner");
    }
    return res;
  }

  async function rejoinAsGuest(alias, guestPass) {
    const res = await request("alias:rejoin", { alias, guestPass });
    if (res.ok) {
      currentAuth = { type: "guest", alias: res.alias, guestPass };
      setAliasSession({ alias: res.alias, role: "guest" });
      enterRoom(res.room, "guest");
    }
    return res;
  }

  async function decideKnock(requestId, allow) {
    setKnocks(prev => prev.filter(k => k.requestId !== requestId));
    return request("alias:decide", { requestId, allow });
  }

  function submitMessage(data) {
    socket.emit("messageFromClient", {
      roomName: currentRoom,
      ...data
    });
  }

  function submitBinaryChunk(roomName, fileId, index, chunk) {
    socket.emit("file-chunk-relay", { roomName, fileId, index, chunk });
  }

  if (!socket) {
    dispatch(connecting());
    socket = openSocket(ENDPOINT, { transports: ["websocket"] })

    socket.on("connect", () => {
      console.log("Socket.io connected successfully!");
      dispatch(connectionEstablished(true));
      if (currentAuth && currentAuth.type === "owner") {
        socket.emit("alias:enter", { alias: currentAuth.alias, deviceId: currentAuth.deviceId, key: currentAuth.key }, (res) => {
          if (!res || !res.ok) console.warn("Could not re-enter alias room as owner:", res);
        });
      } else if (currentAuth && currentAuth.type === "guest") {
        socket.emit("alias:rejoin", { alias: currentAuth.alias, guestPass: currentAuth.guestPass }, (res) => {
          // Pass expired (e.g. server restarted) -> go back through the door
          if (!res || !res.ok) window.location.replace("/" + currentAuth.alias);
        });
      } else if (currentRoom) {
        console.log("Auto-rejoining room on reconnection:", currentRoom);
        socket.emit("joinRoom", { roomName: currentRoom });
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket.io disconnected!");
      dispatch(connectionEstablished(false));
      setPeersCount(0);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.io connection error:", error);
      dispatch(connectionEstablished(false));
      setPeersCount(0);
    });

    socket.on("room-members-count", (data) => {
      console.log("Room members count updated:", data.count);
      setPeersCount(Math.max(0, data.count - 1));
    });

    socket.on("newRoomis", (msg) => {
      console.log("New room created:", msg);
      currentRoom = msg;
      dispatch(setUserType("owner"));
      statusOwner = "owner";
      dispatch(createSpaceAction());
      dispatch(changRoomNameAction(msg));
    })

    socket.on("joinedRoom", data => {
      console.log("Joined room:", data);
      currentRoom = data.room;

      if (!statusOwner) {
        dispatch(setUserType("guest"));
        statusReceiver = "guest";
      }

      dispatch(createSpaceAction());
      dispatch(changRoomNameAction(data.room));
    })

    // ---- Alias rooms ----
    // Guest was let in by an owner
    socket.on("alias:admitted", (data) => {
      saveGuestPass(data.alias, data.guestPass);
      currentAuth = { type: "guest", alias: data.alias, guestPass: data.guestPass };
      setAliasSession({ alias: data.alias, role: "guest" });
      enterRoom(data.room, "guest");
    });

    // Owner side: someone is knocking / a knock was handled elsewhere (e.g. on my other device)
    socket.on("alias:knock", (data) => {
      setKnocks(prev => prev.some(k => k.requestId === data.requestId) ? prev : [...prev, data]);
    });
    socket.on("alias:knock-resolved", (data) => {
      setKnocks(prev => prev.filter(k => k.requestId !== data.requestId));
    });

    // This device was removed as an owner from another device
    socket.on("alias:removed", (data) => {
      removeOwnership(data.alias);
      currentAuth = null;
      window.location.replace("/" + data.alias + "?removed=1");
    });

    // Typed an alias into the "join room code" box
    socket.on("aliasRoom", (data) => {
      window.location.href = "/" + data.alias;
    });

    socket.on("joinError", (data) => {
      console.warn("Join error:", data);
    });

    // Stateless Binary Relay Listener
    socket.on("file-chunk-received", (data) => {
      if (dataChannelMessageHandler) {
        dataChannelMessageHandler({
          isSocketRelay: true,
          fileId: data.fileId,
          index: data.index,
          chunk: data.chunk
        });
      }
    });

    socket.on("file-chunk-ack-received", (data) => {
      if (dataChannelMessageHandler) {
        dataChannelMessageHandler({
          isSocketAck: true,
          fileId: data.fileId,
          index: data.index
        });
      }
    });

    console.log("Socket initialized");
  }

  useEffect(() => {
    if (!socket) return;

    let pingInterval;
    let pingStart;

    const performPing = () => {
      pingStart = Date.now();
      socket.emit("ping-server");
    };

    socket.on("pong-client", () => {
      const duration = Date.now() - pingStart;
      setLatency(duration);
    });

    socket.on("connect", () => {
      performPing();
      pingInterval = setInterval(performPing, 10000);
    });

    socket.on("disconnect", () => {
      clearInterval(pingInterval);
      setLatency(0);
    });

    if (socket.connected) {
      performPing();
      pingInterval = setInterval(performPing, 10000);
    }

    return () => {
      clearInterval(pingInterval);
      if (socket) {
        socket.off("pong-client");
      }
    };
  }, [socket]);

  const ws = {
    socket: socket,
    sendMessage: sendMessage,
    createRoom: createRoom,
    joinRoom: joinRoom,
    submitMessage: submitMessage,
    submitBinaryChunk: submitBinaryChunk,
    request: request,
    enterAsOwner: enterAsOwner,
    rejoinAsGuest: rejoinAsGuest,
    decideKnock: decideKnock,
    aliasSession: aliasSession,
    knocks: knocks,
    get statusOwner() { return statusOwner; },
    get statusReceiver() { return statusReceiver; },
    peersCount: peersCount,
    latency: latency,
    setDataChannelMessageHandler: (handler) => {
      dataChannelMessageHandler = handler;
    }
  }

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  )
}
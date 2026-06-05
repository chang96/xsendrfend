import React, { createContext } from 'react'
import { useDispatch } from 'react-redux';
import openSocket from "socket.io-client";
import {
  createSpaceAction,
  changRoomNameAction,
  setUserType,
  connectionEstablished,
  connecting
} from "../action/index"

const ENDPOINT = "https://faax.sandymoon.com.ng"
const WebSocketContext = createContext(null)

export { WebSocketContext }

export default ({ children }) => {
  let socket;
  let ws;
  let statusOwner;
  let statusReceiver;
  let currentRoom;
  let dataChannelMessageHandler = null;

  const dispatch = useDispatch();

  const sendMessage = (roomId, message) => {}

  function createRoom() {
    socket.emit("createRoom", { room: true })
  }

  function joinRoom(roomName) {
    socket.emit("joinRoom", { roomName: roomName })
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
      if (currentRoom) {
        console.log("Auto-rejoining room on reconnection:", currentRoom);
        socket.emit("joinRoom", { roomName: currentRoom });
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket.io disconnected!");
      dispatch(connectionEstablished(false));
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.io connection error:", error);
      dispatch(connectionEstablished(false));
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

    ws = {
      socket: socket,
      sendMessage: sendMessage,
      createRoom: createRoom,
      joinRoom: joinRoom,
      submitMessage: submitMessage,
      submitBinaryChunk: submitBinaryChunk,
      get statusOwner() { return statusOwner; },
      get statusReceiver() { return statusReceiver; },
      setDataChannelMessageHandler: (handler) => {
        dataChannelMessageHandler = handler;
      }
    }
  }

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  )
}
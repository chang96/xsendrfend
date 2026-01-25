import React, { createContext } from 'react'
// import io from 'socket.io-client';
// import { WS_BASE } from './config';
import { useDispatch } from 'react-redux';
// import { updateChatLog } from './actions';
import openSocket from "socket.io-client";
import {
  createSpaceAction,
  changRoomNameAction,
  setUserType,
  connectionEstablished
} from "../action/index"

// TODO: Move these credentials to environment variables or fetch from server
// Security Risk: These credentials are exposed in client code and can be abused
// Recommendation: Use a server endpoint to generate temporary TURN credentials
const servers = {
  iceServers: [
    {
      urls: [
        "stun:stun.stunprotocol.org",
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
      ],
    },
    {
      urls: "turn:relay.metered.ca:80",
      username: "6bab8bf16065c49f92a874ad",
      credential: "FidJuZ2TMKrsY0BH",
    },
    {
      urls: "turn:relay.metered.ca:443",
      username: "6bab8bf16065c49f92a874ad",
      credential: "FidJuZ2TMKrsY0BH",
    },
    {
      urls: "turn:relay.metered.ca:443?transport=tcp",
      username: "6bab8bf16065c49f92a874ad",
      credential: "FidJuZ2TMKrsY0BH",
    },
  ],
  // Enable continuous gathering for better connectivity
  iceCandidatePoolSize: 10,
};

const ENDPOINT = "https://faax.sandymoon.com.ng" //="https://obscure-waters-87185.herokuapp.com"; // "https://xendr.onrender.com" //="https://140.238.157.123:3001"//  "https://obscure-waters-87185s.herokuapp.com"//="http://localhost:3001/"  //
const CONNECTION_TIMEOUT = 30000; // 30 seconds

const WebSocketContext = createContext(null)

export { WebSocketContext }

export default ({ children }) => {
  let socket;
  let ws;
  let local;
  let remote;
  let lchannel;
  let statusOwner;
  let statusReceiver;
  let currentRoom;
  let connectionTimeout;

  const dispatch = useDispatch();

  const sendMessage = (roomId, message) => {

  }

  function createRoom() {
    socket.emit("createRoom", { room: true })
  }

  function joinRoom(roomName) {
    socket.emit("joinRoom", { roomName: roomName })
  }

  function submitMessage(data) {
    if (statusOwner) {
      lchannel.send(JSON.stringify(data))
    } else {
      remote.channel.send(JSON.stringify(data))
    }
  }

  // Cleanup function to properly close connections
  function closeConnection() {
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }

    if (lchannel) {
      lchannel.close();
      lchannel = null;
    }

    if (local) {
      local.close();
      local = null;
      window.local = null;
    }

    if (remote) {
      if (remote.channel) {
        remote.channel.close();
      }
      remote.close();
      remote = null;
      window.remote = null;
    }
  }

  // Setup connection state monitoring
  function setupConnectionMonitoring(pc, role) {
    pc.onconnectionstatechange = () => {
      console.log(`[${role}] Connection state:`, pc.connectionState);

      if (pc.connectionState === "connected") {
        console.log(`[${role}] WebRTC connection established successfully`);
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
      } else if (pc.connectionState === "failed") {
        console.error(`[${role}] Connection failed`);
        // Attempt to restart ICE
        console.log(`[${role}] Attempting ICE restart...`);
        restartIce(pc, role);
      } else if (pc.connectionState === "disconnected") {
        console.warn(`[${role}] Connection disconnected`);
        // Could implement reconnection logic here
      } else if (pc.connectionState === "closed") {
        console.log(`[${role}] Connection closed`);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[${role}] ICE connection state:`, pc.iceConnectionState);

      if (pc.iceConnectionState === "failed") {
        console.error(`[${role}] ICE connection failed`);
        restartIce(pc, role);
      } else if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        console.log(`[${role}] ICE connection successful`);
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log(`[${role}] ICE gathering state:`, pc.iceGatheringState);
    };

    pc.onsignalingstatechange = () => {
      console.log(`[${role}] Signaling state:`, pc.signalingState);
    };
  }

  // Restart ICE when connection fails
  async function restartIce(pc, role) {
    try {
      if (role === "owner" && statusOwner === "owner") {
        console.log(`[${role}] Creating new offer with ICE restart`);
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);

        socket.emit("offer", {
          offer: pc.localDescription,
          room: currentRoom,
          iceRestart: true
        });
      }
    } catch (error) {
      console.error(`[${role}] Error during ICE restart:`, error);
    }
  }

  // Create connection for owner (initiator)
  async function createConnection() {
    try {
      console.log("[Owner] Creating peer connection...");
      window.local = local = new RTCPeerConnection(servers);

      // Setup connection monitoring
      setupConnectionMonitoring(local, "owner");

      // Handle ICE candidates with Trickle ICE
      local.onicecandidate = ({ candidate }) => {
        if (candidate) {
          console.log("[Owner] New ICE candidate:", candidate);
          // Send ICE candidate to remote peer via signaling server
          socket.emit("iceCandidate", {
            candidate: candidate,
            room: currentRoom,
            target: "guest"
          });
        } else {
          console.log("[Owner] ICE gathering completed");
        }
      };

      // Create data channel
      lchannel = local.createDataChannel("channel", {
        ordered: true,
        maxRetransmits: 3
      });
      window.lchannel = lchannel;

      // Setup data channel event handlers
      setupDataChannelHandlers(lchannel, "owner");

      // Create offer
      console.log("[Owner] Creating offer...");
      const offer = await local.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      });
      await local.setLocalDescription(offer);

      console.log("[Owner] Offer created and set as local description");

      // Set connection timeout
      connectionTimeout = setTimeout(() => {
        if (local && local.connectionState !== "connected") {
          console.error("[Owner] Connection timeout");
          // Could trigger UI notification here
        }
      }, CONNECTION_TIMEOUT);

    } catch (error) {
      console.error("[Owner] Error creating connection:", error);
      throw error;
    }
  }

  // Setup data channel event handlers
  function setupDataChannelHandlers(channel, role) {
    channel.onopen = () => {
      console.log(`[${role}] Data channel opened`);
      dispatch(connectionEstablished());
    };

    channel.onclose = () => {
      console.log(`[${role}] Data channel closed`);
      dispatch(connectionEstablished());
    };

    channel.onerror = (error) => {
      console.error(`[${role}] Data channel error:`, error);
      // Could dispatch error action here
    };

    channel.onbufferedamountlow = () => {
      console.log(`[${role}] Buffer amount low - ready for more data`);
    };

    channel.onmessage = ({ data }) => {
      try {
        const message = JSON.parse(data);
        console.log(`[${role}] Received message:`, message);
        // Could dispatch message action here
      } catch (error) {
        console.error(`[${role}] Error parsing message:`, error);
      }
    };
  }

  // Connect to connection for guest (receiver)
  async function connectToConnection(offer, data) {
    if (!offer) return;

    try {
      console.log("[Guest] Creating peer connection...");
      window.remote = remote = new RTCPeerConnection(servers);

      // Setup connection monitoring
      setupConnectionMonitoring(remote, "guest");

      // Handle ICE candidates with Trickle ICE
      remote.onicecandidate = ({ candidate }) => {
        if (candidate) {
          console.log("[Guest] New ICE candidate:", candidate);
          // Send ICE candidate to remote peer via signaling server
          socket.emit("iceCandidate", {
            candidate: candidate,
            room: data.room,
            target: "owner"
          });
        } else {
          console.log("[Guest] ICE gathering completed");
        }
      };

      // Handle incoming data channel
      remote.ondatachannel = ({ channel }) => {
        console.log("[Guest] Received data channel");
        const receive = channel;
        window.receive = receive;
        remote.channel = receive;

        setupDataChannelHandlers(receive, "guest");
      };

      // Set remote description (offer)
      console.log("[Guest] Setting remote description...");
      await remote.setRemoteDescription(new RTCSessionDescription(offer));

      // Create answer
      console.log("[Guest] Creating answer...");
      const answer = await remote.createAnswer();
      await remote.setLocalDescription(answer);

      console.log("[Guest] Answer created, sending to owner...");
      dispatch(connectionEstablished("pl"));

      // Send answer via signaling server
      socket.emit("offerReceived", {
        answer: remote.localDescription,
        room: data.room
      });

      // Set connection timeout
      connectionTimeout = setTimeout(() => {
        if (remote && remote.connectionState !== "connected") {
          console.error("[Guest] Connection timeout");
          // Could trigger UI notification here
        }
      }, CONNECTION_TIMEOUT);

    } catch (error) {
      console.error("[Guest] Error connecting to connection:", error);
      throw error;
    }
  }

  if (!socket) {
    socket = openSocket(ENDPOINT, { transports: ["websocket"] })

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

      // If owner, send the offer now (not from localStorage)
      if (statusOwner === "owner" && local && local.localDescription) {
        console.log("[Owner] Sending offer to guest...");
        socket.emit("offer", {
          offer: local.localDescription,
          room: data.room
        });
      }

      if (!statusOwner) {
        dispatch(setUserType("guest"));
        statusReceiver = "guest";
      }

      dispatch(createSpaceAction());
      dispatch(changRoomNameAction(data.room));
    })

    socket.on("offerSent", async function (data) {
      if (data.offer && statusReceiver === "guest" && statusOwner === undefined) {
        console.log("[Guest] Received offer from owner");
        await connectToConnection(data.offer, data);
      }
    })

    socket.on("answerSent", async function (data) {
      if (data.answer && statusOwner === "owner") {
        console.log("[Owner] Received answer from guest");
        dispatch(connectionEstablished("pl"));

        try {
          await local.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log("[Owner] Remote description set successfully");
        } catch (error) {
          console.error("[Owner] Error setting remote description:", error);
        }
      }
    })

    // NEW: Handle incoming ICE candidates (Trickle ICE)
    socket.on("iceCandidateReceived", async function (data) {
      try {
        const { candidate, target } = data;

        if (!candidate) return;

        // Determine which peer connection to add the candidate to
        let pc = null;
        if (target === "owner" && statusOwner === "owner" && local) {
          pc = local;
        } else if (target === "guest" && statusReceiver === "guest" && remote) {
          pc = remote;
        }

        if (pc && pc.remoteDescription) {
          console.log(`[${target}] Adding ICE candidate:`, candidate);
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else if (pc) {
          console.warn(`[${target}] Cannot add ICE candidate - remote description not set yet`);
          // Could queue candidates here for later processing
        } else {
          console.warn(`[${target}] No peer connection available for ICE candidate`);
        }
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    })

    console.log("Socket initialized");

    ws = {
      socket: socket,
      sendMessage: sendMessage,
      createRoom: createRoom,
      joinRoom: joinRoom,
      submitMessage,
      createConnection,
      connectToConnection,
      closeConnection,
      lchannel: lchannel,
      remote: remote
    }
  }

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  )
}
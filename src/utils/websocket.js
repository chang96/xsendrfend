import React, {createContext } from 'react'
// import io from 'socket.io-client';
// import { WS_BASE } from './config';
import { useDispatch } from 'react-redux';
// import { updateChatLog } from './actions';
import { debounce } from 'lodash';
import openSocket from "socket.io-client";
import {
    createSpaceAction, 
    changRoomNameAction,
    setUserType,
    newMessageAction,
    connectionEstablished
} from "../action/index"

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
};
const ENDPOINT = "https://sandysun.com.ng" //"https://obscure-waters-87185.herokuapp.com"; // "https://xendr.onrender.com" //"https://140.238.157.123:3001"//  "https://obscure-waters-87185s.herokuapp.com"//"http://localhost:3001/"  //

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

    const dispatch = useDispatch();

    const sendMessage = (roomId, message) => {
      
    }
    function createRoom(){
        socket.emit("createRoom", {room: true})
      }
    function joinRoom(roomName){
        socket.emit("joinRoom", {roomName: roomName})
    }

    function submitMessage(data){
        if(statusOwner){
        lchannel.send(JSON.stringify(data))
        } else {
        remote.channel.send(JSON.stringify(data))
        }
        // socket.emit("messageFromClient", {...data})
      }
    
      async function createConnection(){
          window.local = local = new RTCPeerConnection(servers)
          // window.local = local
          local.onicecandidate = e => {
            let offer = JSON.stringify(local.localDescription)
            console.log("offer::::::", offer)
            window.localStorage.setItem("offer", offer)
          }
          
          lchannel = local.createDataChannel("channel")
          window.lchannel = lchannel
          lchannel.onopen = ()=> {
            dispatch(connectionEstablished())
          }
          lchannel.onclose = ()=> dispatch(connectionEstablished())
          lchannel.onerror = (e)=> console.log(e)
          lchannel.onbufferedamountlow = (e)=>console.log(e, "low buffer")
          lchannel.onmessage = ({data})=> console.log(JSON.parse(data))
          await local.createOffer().then(async o=> await local.setLocalDescription(o))
    }
    
var lim = 0
    async function connectToConnection(offer, data){
         if(offer){ 
          window.remote = remote = new RTCPeerConnection(servers)
          console.log(offer, remote)
          remote.onicecandidate = e => {
          if(lim == 0){
            let answer = JSON.stringify(remote.localDescription)

            console.log(answer, e)
            console.log("now sendingnngngnngn",answer)
            socket.emit("offerReceived", {"answer": answer, room: data.room})
            lim = 1
          } else {
            return;
          }
        
        }
        dispatch(connectionEstablished("pl"))
        remote.ondatachannel = ({channel}) => {
        const receive = channel
        window.receive = receive
        receive.onopen = ()=> {
          dispatch(connectionEstablished())
          console.log("opened")
        }
        receive.onclose = ()=> dispatch(connectionEstablished())
        receive.onmessage = ({data})=> console.log(JSON.parse(data))
        receive.onerror= (e)=> console.log(e)
        remote.channel = receive 
      }
    }
      await remote.setRemoteDescription(offer)
      await remote.createAnswer().then(async a=> await remote.setLocalDescription(a))
      }
  

    if (!socket) {  
        socket = openSocket(ENDPOINT, {transports:["websocket"]})

        socket.on("newRoomis", (msg) => {
            // console.log("new room is ",msg)
            dispatch(setUserType("owner"))
            statusOwner = "owner"
            console.log("shiittiiti")
            dispatch(createSpaceAction())
            dispatch(changRoomNameAction(msg))
        })
        socket.on("joinedRoom", data=>{
            console.log(data, statusOwner)
            // alert(`new client connected to ${data.room}`)
            let offer = window.localStorage.getItem("offer")
            socket.emit("offer", {"offer": JSON.parse(offer), "room": data.room})
            if(!statusOwner){
              dispatch(setUserType("guest"))
              statusReceiver = "guest"
            }
            
            dispatch(createSpaceAction())
            dispatch(changRoomNameAction(data.room))
          })
        
         socket.on("offerSent", async function(data){

            if(data.offer && statusReceiver === "guest" && statusOwner === undefined){
                console.log("offer::", data, statusOwner, statusReceiver)
                await connectToConnection(data.offer, data)
             
            }
           
         })

         socket.on("answerSent", async function(data){
            if(data.answer && statusOwner === "owner"){
              console.log(data.answer)
              //loading here
              dispatch(connectionEstablished("pl"))
              await local.setRemoteDescription(JSON.parse(data.answer))
            }
         })
        // socket.on("messageFromServer", data=>{
        //   setState(state => {
        //     let newMessages = [...state.messageFromServr]
        //     newMessages.push(data)
        //     let obj = {...state, messageFromServr: newMessages}
        //     return obj
        //   })
        // console.log(data)
        // data.type = "owner"
        // if(data.xtype === 'file' && data.completed){
        //     storedData += data.message
        //     if(data.completed === 1){
        //         dispatch(newMessageAction({...data, message: storedData}))
        //         storedData =''
        //     }
        // } else 
        // dispatch(newMessageAction(data))
      
        // })
         console.log(lchannel, remote, "lchannel and remote")
        ws = {
            socket: socket,
            sendMessage: sendMessage,
            createRoom: createRoom,
            joinRoom: joinRoom,
            submitMessage,
            createConnection,
            connectToConnection,
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
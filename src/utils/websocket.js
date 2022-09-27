import { reverse } from 'lodash';
import React, {createContext } from 'react'
// import io from 'socket.io-client';
// import { WS_BASE } from './config';
import { useDispatch } from 'react-redux';
// import { updateChatLog } from './actions';
import openSocket from "socket.io-client";
import {
    createSpaceAction, 
    changRoomNameAction,
    setUserType,
    newMessageAction
} from "../action/index"


const ENDPOINT = "http://localhost:3001/" //"https://obscure-waters-87185.herokuapp.com"// 

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
        
        socket.emit("messageFromClient", {...data})
      }
    
      async function createConnection(){
         window.local = local = new RTCPeerConnection()
        console.log(local)
          local.onicecandidate = e => {
            let offer = JSON.stringify(local.localDescription)
            console.log(offer)
            window.localStorage.setItem("offer", offer)
          }
          
          lchannel = local.createDataChannel("channel")
          lchannel.onopen = ()=> console.log("opened")
          lchannel.onclose = ()=> console.log("closed")
          lchannel.onmessage = ({data})=> console.log(data)
          await local.createOffer().then(async o=> await local.setLocalDescription(o))
    }

    async function connectToConnection(offer, data){
         if(offer){ 
          window.remote = remote = new RTCPeerConnection()
          console.log(offer, remote)
          remote.onicecandidate = e => {
          let answer = JSON.stringify(remote.localDescription)

          console.log(answer, e)
          console.log("now sendingnngngnngn",answer)
          socket.emit("offerReceived", {"answer": answer, room: data.room})
        }
        remote.ondatachannel = ({channel}) => {
        const receive = channel
        receive.onopen = ()=> console.log("opened")
        receive.onclose = ()=> console.log("closed")
        receive.onmessage = ({data})=> console.log(data)
        receive.onerror= (e)=> console.log(e)
        remote.channel = receive 
      }}
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
            // console.log(data)
            // alert(`new client connected to ${data.room}`)
            let offer = window.localStorage.getItem("offer")
            socket.emit("offer", {"offer": JSON.parse(offer), "room": data.room})
            dispatch(setUserType("guest"))
            statusReceiver = "guest"
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
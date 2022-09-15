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


const ENDPOINT = "https://obscure-waters-87185.herokuapp.com"// "http://localhost:3001/" //

const WebSocketContext = createContext(null)

export { WebSocketContext }

export default ({ children }) => {
    let socket;
    let ws;

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

    //   useEffect(()=>{
    //     socket.on("newRoomis", data=>{
    //     //   setState({...state, roomName: data})
    //     console.log("new room is ",data)
    //     dispatch(createSpaceAction())
    //     })
    
      
    
    //     socket.on("messageFromServer", data=>{
    //     //   setState(state => {
    //     //     let newMessages = [...state.messageFromServr]
    //     //     newMessages.push(data)
    //     //     let obj = {...state, messageFromServr: newMessages}
    //     //     return obj
    //     //   })
    //     })
    //   }, [])

    if (!socket) {  
        socket = openSocket(ENDPOINT, {transports:["websocket"]})

        socket.on("newRoomis", (msg) => {
            // console.log("new room is ",msg)
            dispatch(setUserType("owner"))

            dispatch(createSpaceAction())
            dispatch(changRoomNameAction(msg))
        })
        socket.on("joinedRoom", data=>{
            // console.log(data)
            // alert(`new client connected to ${data.room}`)
            dispatch(setUserType("guest"))

            dispatch(createSpaceAction())
            dispatch(changRoomNameAction(data.room))
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
            submitMessage
        }
    }

    return (
        <WebSocketContext.Provider value={ws}>
            {children}
        </WebSocketContext.Provider>
    )
}
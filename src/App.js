import {useState, useEffect} from "react";
import openSocket from "socket.io-client";
import ChatBodyAndChatHead from "./components/chart";
import ChartBody from "./components/chart/chatbody";
import CreateSpace from "./components/createspace";
import Description from "./components/description";
import JoinOrCreate from "./components/joinorcreate";
import JoinSpace from "./components/joinspace";
import Logo from "./components/logo";
import Or from "./elements/or"
import { connect } from "react-redux";
import WebSocketProvider, { WebSocketContext } from "./utils/websocket"
// import ss  from "../node_modules/socket.io-stream/socket.io-stream"
import {toBase64} from "./utils/index"
import { Provider } from "react-redux";
import configureStore from "./store/store";
import Home from "./home";
const ENDPOINT = "http://localhost:3001"  //"https://obscure-waters-87185.herokuapp.com"
const socket = openSocket(ENDPOINT, {transports:["websocket"]})



function App() {
  // let [state, setState] = useState({
  //   response: "",
  //   joined:"",
  //   message:"",
  //   messageFromServr:[],
  //   roomName:""
  // })
  // function createRoom(){
  //   socket.emit("createRoom", {room: true})
  // }

  // function joinRoom(roomName){
  //   setState({...state, roomName})
  //   socket.emit("joinRoom", {roomName: roomName})
  // }
  // function handleChange(e){
  //   let {name,value} = e.target
  //   setState({...state, [name]: value})
  // }

  // function submitMessage(){
  //   let {message, roomName} = state
  //   socket.emit("messageFromClient", {message: message, roomName: roomName, type:"text"})
  // }

  // function handleMessageChange(e){
  //   let {name, value} = e.target
  //   setState({...state, [name]: value})
  // }
  // async function uploadFile(e){
  //   let file = e.target.files[0]
  //   let {roomName} = state
  //   let b64 = await toBase64(file)
  //   socket.emit("messageFromClient", {message: b64, roomName: roomName, type:"file"})
  //   // let stream = ss.createStream()
  //   // console.log(file,b64)
  //   // ss(socket).emit("file", roomName, b64)
  //   // ss.createBlobReadStream(b64).pipe(stream)
  // }

  // useEffect(()=>{
  //   socket.on("newRoomis", data=>{
  //     setState({...state, roomName: data})
  //   })

  //   socket.on("joinedRoom", data=>{
  //     // alert(`new client connected to ${data.room}`)
  //   })

  //   socket.on("messageFromServer", data=>{
  //     setState(state => {
  //       let newMessages = [...state.messageFromServr]
  //       newMessages.push(data)
  //       let obj = {...state, messageFromServr: newMessages}
  //       return obj
  //     })
  //   })
  // }, [])

  return (
    <Provider store={configureStore()}>
        <WebSocketProvider>
         <Home /> 
        </WebSocketProvider>  
    </Provider>

  );
}



export default App;

import {useState, useEffect, useContext} from "react";
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
import {WebSocketContext} from "./utils/websocket"
// import ss  from "../node_modules/socket.io-stream/socket.io-stream"
import {toBase64} from "./utils/index"
import { Provider } from "react-redux";
import configureStore from "./store/store";
// const ENDPOINT = "http://localhost:3001" //"https://obscure-waters-87185.herokuHome.com"
// const socket = openSocket(ENDPOINT, {transports:["websocket"]})



function Home(l) {
  let {messageFromServr, response, joined, message, roomName} = l
  let [state, setState] = useState({
    response: response,
    joined:joined,
    message:message,
    messageFromServr: messageFromServr,
    roomName: roomName
  })
  const {socket} = useContext(WebSocketContext)
  function createRoom(){
    socket.emit("createRoom", {room: true})
  }

  function joinRoom(roomName){
    setState({...state, roomName})
    socket.emit("joinRoom", {roomName: roomName})
  }
  function handleChange(e){
    let {name,value} = e.target
    setState({...state, [name]: value})
  }

  function submitMessage(){
    let {message, roomName} = state
    socket.emit("messageFromClient", {message: message, roomName: roomName, type:"text"})
  }

  function handleMessageChange(e){
    let {name, value} = e.target
    setState({...state, [name]: value})
  }
  async function uploadFile(e){
    let file = e.target.files[0]
    let {roomName} = state
    let b64 = await toBase64(file)
    socket.emit("messageFromClient", {message: b64, roomName: roomName, type:"file"})
    // let stream = ss.createStream()
    // console.log(file,b64)
    // ss(socket).emit("file", roomName, b64)
    // ss.createBlobReadStream(b64).pipe(stream)
  }

  useEffect(()=>{
    
    // socket.on("newRoomis", data=>{
    //   setState({...state, roomName: data})
    // })

    // socket.on("joinedRoom", data=>{
    //   // alert(`new client connected to ${data.room}`)
    // })

    // socket.on("messageFromServer", data=>{
    //   setState(state => {
    //     let newMessages = [...state.messageFromServr]
    //     newMessages.push(data)
    //     let obj = {...state, messageFromServr: newMessages}
    //     return obj
    //   })
    // })
  }, [])

  return (
   
      <div>
         
        {/* <div><button onClick={()=> createRoom()}>create room</button></div>
        <div>created room @ {state.roomName}</div> 
        <hr />
        <div><input placeholder="paste room code here" name="joined" value={state.joined} onChange={(e)=> handleChange(e)} /></div>
        <div> <button onClick={()=> joinRoom(state.joined)}>join button</button></div>
        <hr />
        <div><textarea name="message" value={state.message} onChange={(e)=> handleMessageChange(e)} ></textarea> <br></br>
        <button onClick={()=> submitMessage()}>submit message</button> </div>
        <input type={"file"} onChange={(e)=> uploadFile(e)} />
        <hr />
        <p>Messages:</p>
        <div>{state.messageFromServr.map((message, i)=> {
          return <div key={i}>
            {message.type=== "text"? 
            message.message : 
            <div>
            <object width={"120px"} height="120px" data= {message.message} >
            </object>
            <p><a href={message.message} download={Date.now()} >download</a></p>
            </div>
            }
          </div>
        })}</div>

        <hr /> */}
        <div><Logo /></div>
        <div 
         className="flex flex-col sm:flex sm:flex-row"
        >
        <div 
        className="sm:h-7070 sm:w-1/2 sm:flex sm:justify-center"
        ><Description />

        </div>
        
        <div
        className="sm:h-7070 sm:w-1/2 sm:flex sm:justify-center"
        >{joined.status ? <ChatBodyAndChatHead /> : <JoinOrCreate />} </div>
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
      
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Home);

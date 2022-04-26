import {useState, useEffect} from "react";
import openSocket from "socket.io-client";

const ENDPOINT = "https://obscure-waters-87185.herokuapp.com"
const socket = openSocket(ENDPOINT, {transports:["websocket"]})

function App() {
  let [state, setState] = useState({
    response: "",
    joined:"",
    message:"",
    messageFromServr:[],
    roomName:""
  })
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
    socket.emit("messageFromClient", {message: message, roomName: roomName})
  }

  function handleMessageChange(e){
    let {name, value} = e.target
    setState({...state, [name]: value})
  }
  // function uploadFile(e){
  //   let file = e.target.files[0]
  //   let stream = ss.createStream
  //   ss(socket).emit("file", stream, {size: file.size})
  //   ss.createBlobReadStream(file).pipe(stream)
  // }

  useEffect(()=>{
    socket.on("newRoomis", data=>{
      setState({...state, roomName: data})
    })

    socket.on("joinedRoom", data=>{
      // alert(`new client connected to ${data.room}`)
    })

    socket.on("messageFromServer", data=>{
      setState(state => {
        let newMessages = [...state.messageFromServr]
        newMessages.push(data.message)
        let obj = {...state, messageFromServr: newMessages}
        return obj
      })
    })
  }, [])

  return (
      <div>
         
        <div><button onClick={()=> createRoom()}>create room</button></div>
        <div>created room @ {state.roomName}</div> 
        <hr />
        <div><input placeholder="paste room code here" name="joined" value={state.joined} onChange={(e)=> handleChange(e)} /></div>
        <div> <button onClick={()=> joinRoom(state.joined)}>join button</button></div>
        <hr />
        <div><textarea name="message" value={state.message} onChange={(e)=> handleMessageChange(e)} ></textarea> <br></br>
        <button onClick={()=> submitMessage()}>submit message</button> </div>
        <hr />
        <p>Messages:</p>
        <div>{state.messageFromServr.map((message, i)=> {
          return <div key={i}>
            {message}
          </div>
        })}</div>

        <hr />

      </div>

  );
}

export default App;

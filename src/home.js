// import {useState, useEffect, useContext} from "react";
import ChatBodyAndChatHead from "./components/chart";
import Description from "./components/description";
import JoinOrCreate from "./components/joinorcreate";
import Logo from "./components/logo";
import { connect } from "react-redux";
// import {WebSocketContext} from "./utils/websocket"
// import ss  from "../node_modules/socket.io-stream/socket.io-stream"
// const ENDPOINT = "http://localhost:3001" //"https://obscure-waters-87185.herokuHome.com"
// const socket = openSocket(ENDPOINT, {transports:["websocket"]})



function Home(l) {
  let {joined} = l
 


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
        <div className="text-white absolute left-0 bottom-0 font-thin text-[12px]">
        {/* contribution: <a>coding salafi</a>, <a>chang</a> */}
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

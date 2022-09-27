import Input from "../../elements/input/input";
import Btn from "../../elements/button/btn";
import { connect } from "react-redux"
import { useContext } from "react";
import { WebSocketContext } from "../../utils/websocket";
import { changRoomNameAction } from "../../action/index"
// import {connectToConnection} from "../../utils/webrtc"
function JoinSpace({roomName, changeName}){
    const {joinRoom, connectToConnection} = useContext(WebSocketContext)
    const handleJoinroom = function(roomName){
        joinRoom(roomName)

    }
    let onchange = function({name, value}){
        changeName(value)
    }
    return <div
    style={{display:"flex", flexDirection:"row", justifyContent:"space-between"}}
    >
        <Input name={"join"} onChange={onchange} cN={"border-b-2 border-blue-600 h-8 bg-[#121212] text-white outline-none"} />
        <Btn 
        cN={"bg-white text-blue-600 font-thin hover:bg-blue-700 hover:text-white w-20 h-8"} 
        name="Join"
        onclick={()=> handleJoinroom(roomName.name)}
        />
        </div>
}

const mapStateToProps = state=> {
    return {
        ...state
    }
  }
  
  
  const mapDispatchToProps = dispatch => {
    return {
        changeName: (name)=> dispatch(changRoomNameAction(name))
    }
  }
  
  export default connect(mapStateToProps, mapDispatchToProps)(JoinSpace);
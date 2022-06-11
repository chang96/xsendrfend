import Attachment from "../../../elements/attachment/attachment";
import Btn from "../../../elements/button/btn";
import Input from "../../../elements/input/input";
import sendlogo from "../../../assets/send.png"
import {useState, useContext} from "react"
import {connect} from "react-redux"
import {newMessageAction} from "../../../action/index"
import {WebSocketContext} from "../../../utils/websocket"
function ChartBodyElements({userType, sendMessage, roomName}){
    let [state, setState] = useState({
        message: '',
    })
    let {submitMessage} = useContext(WebSocketContext)
    
    function changing({name, value}){
        setState({ message: value})
    }

    function clicked(){
        sendMessage({type: 'guest', message:state.message})
        submitMessage({type: userType.userType, message:state.message, roomName: roomName.name, xtype:"text"})
        setState({ message: ''})
    }
    return <div className="flex flex-row justify-center sm:flex sm:flex-row sm:space-x-1">
        <div className="flex flex-row border rounded border-white">
            <Attachment msg={state.message} />
            <Input ta={true} msg={state.message} name={"chat"} onChange={changing} cN={"h-10 border-none outline-none bg-[#121212] rounded text-white"} />
        </div>
        <div>
            <Btn onclick={()=> clicked()} cN={"h-10 w-20 bg-[#001AFF] rounded-sm text-sm text-center text-white font-thin"} image={true} link={sendlogo} name={`Send`}  />
        </div>
    </div>
}
const mapStateToProps = state=> {
    return {
        ...state
    }
  }

const mapDispatchToProps = dispatch =>{
    return {
        sendMessage: (payload)=> dispatch(newMessageAction(payload))
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(ChartBodyElements)
import Attachment from "../../../elements/attachment/attachment";
import {useState, useContext} from "react"
import {connect} from "react-redux"
import {newMessageAction} from "../../../action/index"
import {WebSocketContext} from "../../../utils/websocket"

function ChartBodyElements({userType, sendMessage, roomName}){
    let [state, setState] = useState({
        message: '',
    })
    let {submitMessage} = useContext(WebSocketContext)
    
    function changing(e){
        setState({ message: e.target.value })
    }

    function clicked(){
        if (!state.message.trim()) return;
        sendMessage({type: 'guest', message:state.message})
        submitMessage({type: userType.userType, message:state.message, roomName: roomName.name, xtype:"text"})
        setState({ message: ''})
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            clicked();
        }
    };

    return (
        <div className="flex items-center space-x-2 w-full bg-[#1a1a1a] border border-[#2b2b2b] rounded-full px-3 py-1.5 focus-within:border-[#001AFF] transition-all duration-150 shadow-inner">
            {/* Attachment Button */}
            <div className="flex-shrink-0 flex items-center justify-center text-gray-400 hover:text-white transition-colors duration-150">
                <Attachment msg={state.message} />
            </div>

            {/* Input field */}
            <input 
                type="text" 
                value={state.message}
                name="chat"
                onChange={changing}
                onKeyDown={handleKeyDown}
                placeholder="Type a message or share a link..."
                className="flex-1 bg-transparent border-none outline-none text-white text-xs placeholder-[#555555] focus:ring-0 focus:outline-none py-1 px-1"
                autoComplete="off"
            />

            {/* Send Button (Icon Only) */}
            <button 
                onClick={clicked}
                disabled={!state.message.trim()}
                className={`h-8 w-8 rounded-full flex items-center justify-center text-white shadow-md active:scale-95 focus:outline-none transition-all duration-150 flex-shrink-0 ${
                    state.message.trim() 
                        ? "bg-[#001AFF] hover:bg-blue-700 cursor-pointer" 
                        : "bg-[#252525] text-gray-600 cursor-not-allowed opacity-50"
                }`}
            >
                <svg 
                    className="w-4 h-4 transform rotate-45 -translate-x-[1px]" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    strokeWidth="2.5"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            </button>
        </div>
    );
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
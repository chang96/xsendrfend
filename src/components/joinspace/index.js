import { connect } from "react-redux"
import { useContext } from "react";
import { WebSocketContext } from "../../utils/websocket";
import { changRoomNameAction } from "../../action/index"

function JoinSpace({roomName, changeName}){
    const {joinRoom} = useContext(WebSocketContext)
    const handleJoinroom = function(roomName){
        joinRoom(roomName)
    }
    let onchange = function({name, value}){
        changeName(value)
    }

    return (
        <div className="w-80 bg-[#1E1E1E] rounded-2xl p-6 border border-[#2b2b2b] hover:border-[#001AFF]/40 shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4">
            <div className="flex items-center space-x-3">
                <div className="p-3 bg-[#001AFF]/10 text-[#001AFF] rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-white text-sm font-semibold tracking-wide">
                    Join Existing Space
                  </h3>
                  <p className="text-[#777777] text-[11px] leading-tight mt-0.5">
                    Enter a 4-letter alphanumeric code to securely enter an active room.
                  </p>
                </div>
            </div>

            <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2 bg-[#121212] rounded-xl border border-[#2b2b2b] focus-within:border-[#001AFF] px-3 py-1 transition-all duration-150">
                    <input 
                        type="text" 
                        placeholder="Enter Room Code (e.g. ABCD)"
                        className="flex-1 bg-transparent text-white text-xs py-1.5 focus:outline-none uppercase placeholder-gray-600 font-semibold tracking-wider" 
                        onChange={(e) => onchange({ name: "join", value: e.target.value })} 
                    />
                    <button 
                        onClick={() => handleJoinroom(roomName.name)}
                        disabled={!roomName.name || roomName.name.trim().length === 0}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase shadow-md transition-all duration-150 flex items-center space-x-1 ${
                            roomName.name && roomName.name.trim().length > 0
                                ? "bg-[#001AFF] text-white hover:bg-blue-700 active:scale-95 cursor-pointer"
                                : "bg-[#252525] text-gray-500 cursor-not-allowed"
                        }`}
                    >
                        <span>Join</span>
                    </button>
                </div>
            </div>
        </div>
    )
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
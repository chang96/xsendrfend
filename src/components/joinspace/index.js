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
        <div className="w-80 bg-gradient-to-b from-[#1b1b1e] to-[#18181b] rounded-3xl p-6 border border-[#2a2a2e] hover:border-[#3a3a42] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.9)] transition-all duration-300 flex flex-col justify-between space-y-4">
            <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-[#4d63ff]/[0.12] text-[#8e9bff] rounded-xl ring-1 ring-inset ring-[#4d63ff]/25">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-white text-[14px] font-semibold tracking-tight">
                    Join a room
                  </h3>
                  <p className="text-gray-500 text-[11.5px] leading-snug mt-0.5">
                    Type the code shown on your other device, or a friend's.
                  </p>
                </div>
            </div>

            <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2 bg-[#111113] rounded-xl border border-[#2a2a2e] focus-within:border-[#4d63ff]/70 focus-within:shadow-[0_0_0_3px_rgba(77,99,255,0.12)] px-3 py-1 transition-all duration-150">
                    <input 
                        type="text" 
                        placeholder="Code, e.g. ABCD"
                        className="flex-1 bg-transparent text-white text-xs py-1.5 focus:outline-none uppercase placeholder-gray-600 placeholder:normal-case placeholder:tracking-normal placeholder:font-normal font-semibold tracking-[0.2em]" 
                        onChange={(e) => onchange({ name: "join", value: e.target.value })} 
                    />
                    <button 
                        onClick={() => handleJoinroom(roomName.name)}
                        disabled={!roomName.name || roomName.name.trim().length === 0}
                        className={`text-[11px] font-semibold px-3.5 py-1.5 rounded-lg shadow-md transition-all duration-150 flex items-center space-x-1 ${
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
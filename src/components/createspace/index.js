import { connect } from "react-redux"
import { useState } from "react"
import { useContext } from "react";
import { WebSocketContext } from "../../utils/websocket";
import {createSpaceAction} from "../../action/index"
import loader from "../../assets/loader.svg"

function CreateSpace({joined, socket, join}){
  const {createRoom, createConnection} = useContext(WebSocketContext)
  const [loading, setLoading] = useState(false)

  return (
    <div className="w-80 bg-gradient-to-b from-[#1b1b1e] to-[#18181b] rounded-3xl p-6 border border-[#2a2a2e] hover:border-[#3a3a42] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.9)] transition-all duration-300 flex flex-col justify-between space-y-4">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 bg-[#4d63ff]/[0.12] text-[#8e9bff] rounded-xl ring-1 ring-inset ring-[#4d63ff]/25">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div className="text-left">
          <h3 className="text-white text-[14px] font-semibold tracking-tight">
            {loading ? "Starting…" : "Start a room"}
          </h3>
          <p className="text-gray-500 text-[11.5px] leading-snug mt-0.5">
            Get a 4-character code. Open it on any device to send files and chat.
          </p>
        </div>
      </div>

      <button
        onClick={async () => {
          setLoading(true)
          createRoom()
          if (createConnection) await createConnection()
        }}
        disabled={loading}
        className={`w-full py-2.5 rounded-xl font-semibold text-[13px] tracking-tight shadow-[0_8px_24px_-12px_rgba(0,26,255,0.9)] transition-all duration-150 flex items-center justify-center space-x-2 ${
          loading 
            ? "bg-[#252525] text-gray-500 cursor-not-allowed" 
            : "bg-[#001AFF] text-white hover:bg-blue-700 active:scale-[0.98] cursor-pointer"
        }`}
      >
        {loading ? (
          <>
            <img alt="loading" className="w-4 h-4 animate-spin filter invert" src={loader} />
            <span>Creating…</span>
          </>
        ) : (
          <>
            <span>Create room</span>
            <span className="text-sm font-light">+</span>
          </>
        )}
      </button>
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
      join: ()=> dispatch(createSpaceAction())
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(CreateSpace);
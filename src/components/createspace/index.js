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
    <div className="w-80 bg-[#1E1E1E] rounded-2xl p-6 border border-[#2b2b2b] hover:border-[#001AFF]/40 shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4">
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-[#001AFF]/10 text-[#001AFF] rounded-xl">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div className="text-left">
          <h3 className="text-white text-sm font-semibold tracking-wide">
            {loading ? "Creating Space..." : "New Transfer Space"}
          </h3>
          <p className="text-[#777777] text-[11px] leading-tight mt-0.5">
            Set up a secure stateless room to share large files and real-time chat.
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
        className={`w-full py-2.5 rounded-xl font-semibold text-xs tracking-wider uppercase shadow-md transition-all duration-150 flex items-center justify-center space-x-2 ${
          loading 
            ? "bg-[#252525] text-gray-500 cursor-not-allowed" 
            : "bg-[#001AFF] text-white hover:bg-blue-700 active:scale-[0.98] cursor-pointer"
        }`}
      >
        {loading ? (
          <>
            <img alt="loading" className="w-4 h-4 animate-spin filter invert" src={loader} />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <span>Create Space</span>
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
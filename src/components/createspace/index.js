import { connect } from "react-redux"
import { useEffect, useState } from "react"
import { useContext } from "react";
import { WebSocketContext } from "../../utils/websocket";
import {createSpaceAction} from "../../action/index"
import loader from "../../assets/loader.svg"
// import {createConnection} from "../../utils/webrtc"
function CreateSpace({joined, socket, join}){
  const {createRoom, createConnection} = useContext(WebSocketContext)
  const [loading, setLoading] = useState(false)
    return <div 
    style={{backgroundColor:"#001AFF"}}
    className="w-72 h-32 rounded-md flex justify-center"
    >
        <div
        style={{textAlign:"center", paddingTop:"15%"}}
        >
        {/* <div>xx</div> */}
        {
          loading?
          <div className="flex flex-row">
          <p className="text-white">Creating Faax Space</p> <img className="w-8 h-8" src={loader}/>
        </div> :
         <div className="flex flex-row">
         <p className="text-white">Create Faax Space</p>
       </div>
        }
       
        
        <div 
        style={{}}
        ><button style={{
          border:"1px black",
          backgroundColor:"#99A3FF",
          width:"42px",
          height:"42px",
          borderRadius:"50%",
          color:"blue",
          fontSize:"18px",
        }}
        // onClick={()=> join()}
        onClick={async ()=> {
            setLoading(true)
            createRoom()
            await createConnection()
        }}
        >+</button></div>
        </div>
    </div>
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
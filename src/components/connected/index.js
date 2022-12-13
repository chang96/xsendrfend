import { connect } from "react-redux"
import loader from "../../assets/loader.svg"
function Connected({roomName, connected}){

    let c = connected.connected? "w-2 h-2 bg-green-600" : "w-2 h-2 bg-red-600" 
    console.log(connected)
    return <div className="absolute top-0 left-0">
       <span className="flex flex-row"> 
       <p className={c}>
        
        </p>
        <p className="-mt-1 ml-1">{connected.connected === "CONNECTING"? <img className="h-6 w-6" src={loader} /> : connected.connected? 'connected': 'not connected'}</p>
        </span>

</div>
}

const mapStateToProps = state=> {
    return {
        ...state
    }
  }
  
  

export default connect(mapStateToProps, null)(Connected)
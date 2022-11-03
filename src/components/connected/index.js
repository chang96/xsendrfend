import { connect } from "react-redux"
function Connected({roomName, connected}){

    let c = connected.connected? "w-2 h-2 bg-green-600" : "w-2 h-2 bg-red-600" 
    return <div className="absolute top-0 left-0">
       <span className="flex flex-row"> 
       <p className={c}>
        
        </p>
        <p className="-mt-1 ml-1">{connected.connected? 'connected': 'not connected'}</p>
        </span>

</div>
}

const mapStateToProps = state=> {
    return {
        ...state
    }
  }
  
  

export default connect(mapStateToProps, null)(Connected)
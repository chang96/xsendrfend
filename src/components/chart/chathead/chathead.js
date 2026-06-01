import { connect } from "react-redux";
import Connected from "../../connected/index";

function ChartHead({roomName}){
    return (
        <div className="bg-[#001AFF] w-full px-4 py-3 flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-2">
                <Connected roomName={roomName} />
            </div>
            <div className="flex items-center space-x-1.5 text-white">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">Space Code:</span>
                <span className="text-sm font-bold bg-white bg-opacity-20 px-2 py-0.5 rounded tracking-widest">{roomName.name}</span>
            </div>
        </div>
    );
}

const mapStateToProps = state=> {
    return {
        ...state
    }
  }
  
  
  const mapDispatchToProps = dispatch => {
    return {
    }
  }

export default connect(mapStateToProps, mapDispatchToProps)(ChartHead)


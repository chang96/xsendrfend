import { connect } from "react-redux";
import Connected from "../../connected/index";

function ChartHead({roomName}){
    return <div
    style={{
        height:"16%",
        margin:"0 auto",
        color:"white",
        paddingTop:"5%",
        marginTop:"6%",
        marginBottom:"5%",
        borderRadius:"2px",
        position: "relative"
        
    }}
    className="bg-[#001AFF] w-96">
        <div style={{
            display:"flex",
            flexDirection:"row",
            justifyContent:"space-around",
        }}>
    {<Connected roomName={roomName} />}

            <span className="flex flex-row">
                <h1
                style={{
                    letterSpacing:"1px",
                    fontFamily:"",
                    fontWeight:"900",
                    fontSize:"20px",
                    
                }}
                className="">Space Code:</h1>
                <p
                style={{
                    marginTop:"3px"
                }}
                >{roomName.name}</p>
            </span>
        </div>
        <div
        style={{
            display:"flex",
            flexDirection:"row",
            justifyContent:"space-around"
        }}
        >
            <span className="flex flex-row">
            {/* <p 
            className="mr-1"
            >0</p>
            <p>Connected</p> */}
            </span>
            
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
    }
  }

export default connect(mapStateToProps, mapDispatchToProps)(ChartHead)


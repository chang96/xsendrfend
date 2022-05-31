import CreateSpace from "../createspace"
import Or from "../../elements/or"
import JoinSpace from "../joinspace"

function JoinOrCreate(){
    return <div 
    style={{paddingTop:"20vh", backgroundColor:"#121212"}}
    className="flex justify-center w-128"
    >
        <div>
        <CreateSpace />
        <Or />
        <JoinSpace />
        </div>
    </div>
}


export default JoinOrCreate
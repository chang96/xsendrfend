import CreateSpace from "../createspace"
import Or from "../../elements/or"
import JoinSpace from "../joinspace"

function JoinOrCreate(){
    return <div 
    style={{width:"55%" ,paddingTop:"20vh", backgroundColor:"#121212"}}
    className="flex justify-center"
    >
        <div>
        <CreateSpace />
        <Or />
        <JoinSpace />
        </div>
    </div>
}


export default JoinOrCreate
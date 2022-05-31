import CreateSpace from "../createspace"
import Or from "../../elements/or"
import JoinSpace from "../joinspace"

function JoinOrCreate(){
    return <div 
    style={{paddingTop:"20vh"}}
    className="flex justify-center sm:flex sm:flex-center sm:w-128 sm:bg-[#121212]"
    >
        <div>
        <CreateSpace />
        <Or />
        <JoinSpace />
        </div>
    </div>
}


export default JoinOrCreate
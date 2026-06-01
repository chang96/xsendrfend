import CreateSpace from "../createspace"
import Or from "../../elements/or"
import JoinSpace from "../joinspace"

function JoinOrCreate(){
    return (
        <div className="flex flex-col items-center justify-center py-6 w-full max-w-sm mx-auto">
            <CreateSpace />
            <Or />
            <JoinSpace />
        </div>
    )
}

export default JoinOrCreate
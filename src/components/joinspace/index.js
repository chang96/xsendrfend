import Input from "../../elements/input/input";
import Btn from "../../elements/button/btn";

function JoinSpace(){
    return <div
    style={{display:"flex", flexDirection:"row", justifyContent:"space-between"}}
    >
        <Input cN={"border-b-2 border-blue-600 h-8 bg-[#121212]"} />
        <Btn 
        cN={"bg-white text-blue-600 font-thin hover:bg-blue-700 hover:text-white w-20 h-8"} 
        name="Join"
        />
        </div>
}

export default JoinSpace
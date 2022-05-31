import Attachment from "../../../elements/attachment/attachment";
import Btn from "../../../elements/button/btn";
import Input from "../../../elements/input/input";
import sendlogo from "../../../assets/send.png"
function ChartBodyElements(){
    return <div className="flex flex-row justify-center sm:flex sm:flex-row sm:space-x-1">
        <div className="flex flex-row border rounded border-white">
            <Attachment />
            <Input cN={"h-10 border-none outline-none bg-[#121212] rounded text-white"} />
        </div>
        <div>
            <Btn cN={"h-10 w-20 bg-[#001AFF] rounded-sm text-sm text-center text-white font-thin"} image={true} link={sendlogo} name={`Send`}  />
        </div>
    </div>
}


export default ChartBodyElements
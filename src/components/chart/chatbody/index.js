import ChartBodyElements from "./chatbodyelements";
import "./index.css"
function ChartBody(){
    return <div
        className="relative bg-[#1B1B1B] w-96 mb-4"
        style={{
            height:"72%",
            margin:"0 auto"

        }}
    >
        <p className="text-white font-bold">space</p>
        <div
        style={{
            overflow:"auto",
            height:"70%",
            marginTop:"1px"
        }}
        >
        <div>
            <p>message</p>
        </div>
        <div>
            <p>Another message</p>
        </div>
        <div>
            <p>Another message</p>
        </div>
        <div
        style={{
            display:"flex",
            float:"right",
            width:"100%",
            justifyContent:"end"

        }}
        >
            <p>Another message</p>
        </div>
        <div>
            <p>Another message</p>
        </div>
        <div>
            <p>Another message</p>
        </div>
        <div>
            <p>Another message</p>
        </div>
        <div>
            <p>Another message</p>
        </div>
        <div>
            <p>Another message</p>
        </div>
        <div>
            <p>Another message</p>
        </div>
        <div>
            <p>Another message</p>
        </div>
        <div>
            <p>Another message</p>
        </div>
        <div>
            <p>Another message</p>
        </div>
        <div>
            <p>Another message</p>
        </div>
        <div>
            <p>Another message</p>
        </div>
        <div>
            <p>Another message</p>
        </div>
        <div>
            <p>Another message</p>
        </div><div>
            <p>Another message</p>
        </div>
        <div>
            <p>Another message</p>
        </div>
        </div>
        <div
        className="absolute bottom-0 left-[10%] sm:absolute sm:bottom-5 sm:left-[12%]"
        ><ChartBodyElements /></div>
    </div>
}


export default ChartBody
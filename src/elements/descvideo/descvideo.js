import vidl from "../../assets/abstract.mp4"
import vid from "../../assets/abstractx.mp4"
function Vid({name, color, height, width, onclick, cN}){

    return <div className="bg-white relative">
        <div style={{
            position:"absolute"

        }}>
        <video style={{
            
        }} className="ml-24 origin-center rotate-[-25deg]" muted autoPlay loop height={""} width={"30%"} src= {vid}></video>
        </div>

        <video style={{
            marginLeft:"45%",
            position:"absolute",
            marginTop:"39%",
            zIndex:"-100"
            }}className="origin-center rotate-[20deg]" muted autoPlay loop width={"30%"} src= {vidl}></video>
    </div>
}


export default Vid
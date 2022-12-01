let vidl ="https://res.cloudinary.com/codebono/video/upload/v1669878426/recipes/abstract_rpkuc9.mp4"
let vid ="https://res.cloudinary.com/codebono/video/upload/c_scale,h_525,q_86/v1669878449/recipes/abstractx_vjonpi.mp4"
let vid2 ="https://res.cloudinary.com/codebono/video/upload/v1669878449/recipes/abstractx_vjonpi.mp4"
let bigScreen = window.matchMedia('screen and (min-width: 680px)')

function Vid({name, color, height, width, onclick, cN}){

    return <div className="bg-white relative">
        <div style={{
            position:"absolute"

        }}>
        <video style={{
            
        }} className="ml-24 origin-center rotate-[-25deg]" muted autoPlay loop height={""} width={"30%"} src= {!bigScreen.matches? vid : vid2}></video>
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
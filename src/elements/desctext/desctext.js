
function Caption(){
    return <p style={{fontFamily:""}} className="text-white text-center text-2xl font-thin">
        Sending files between all your devices and even those of third parties just got easier
    </p>
}

function DescText(){

    return <div style={{
        zIndex:10
    }} className="w-full absolute sm:relative">
        <div className="absolute sm:mt-[16vh]"><h1 
        style={{fontFamily:"", zIndex:2}}
        className="text-white text-center font-bold text-5xl mb-5 sm:text-6xl sm:mb-0">
            SEND FILES & TEXTS INSTANTLY WITH WEBRTC</h1>
        <Caption /></div>
    </div>
}


export default DescText
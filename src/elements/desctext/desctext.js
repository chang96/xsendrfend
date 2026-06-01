
function Caption(){
    return <p style={{fontFamily:""}} className="text-white text-center text-lg sm:text-xl font-light opacity-80 mt-4 max-w-lg mx-auto leading-relaxed">
        Sending files between all your devices and even those of third parties just got easier.
    </p>
}

function DescText(){
    return <div style={{
        zIndex:10
    }} className="w-full absolute sm:relative">
        <div className="absolute sm:mt-[16vh] px-4 w-full text-center">
            <h1 
                style={{fontFamily:"", zIndex:2}}
                className="text-white font-black text-4xl mb-3 sm:text-5xl sm:mb-0 tracking-tight leading-none bg-clip-text bg-gradient-to-r from-white via-white to-blue-500"
            >
                SEND FILES & TEXTS INSTANTLY & SECURELY
            </h1>
            <Caption />
        </div>
    </div>
}

export default DescText
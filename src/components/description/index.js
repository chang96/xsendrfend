import DescText from "../../elements/desctext/desctext"
import Vid from "../../elements/descvideo/descvideo";

function Description (){
    return <div className="w-full h-56 sm:h-56 sm:w-4/5 ">
        <DescText />
        <Vid />
    </div>
}

export default Description
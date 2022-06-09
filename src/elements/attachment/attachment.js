import attach from "../../assets/attach.png"
import {useRef} from "react"

function Attachment({name, color, height, width, onChange, cN}){
    const inputFile = useRef(null)
    const handleClick = ()=>{
        inputFile.current.click()
    }
    return <div className="">
        <img onClick={()=>handleClick()} src={attach} className="w-8 h-10" /> 
        <input type="file" ref={inputFile} name={name} style={{width: 0, height: 0, color: color, display:"none"}} onChange={()=> onChange} />
    </div>
}


export default Attachment
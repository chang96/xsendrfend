import attach from "../../assets/attach.png"
import {useRef} from "react"
import {connect} from "react-redux"
import {newMessageAction, completion} from "../../action/index"
import {toBase64} from "../../utils/index"


function Attachment({name, color, height, width, onChange, cN, sendMessage, msg, userType, roomName, percentageIncrease}){
    const inputFile = useRef(null)
    const handleClick = ()=>{
        inputFile.current.click()
    }
    const handleChange = async (e)=>{
       const {name, value, files} = e.target
       const file = await toBase64(files[0])//files[0]
       sendMessage({type: 'guest', message: file, niFile: true})
    
    }

 
    return <div className="">
        <img alt="" onClick={()=>handleClick()} src={attach} className="w-8 h-10" /> 
        <input type="file" ref={inputFile} name={'file'} style={{width: 0, height: 0, color: color, display:"none"}} onChange={(e)=> handleChange(e)} />
    </div>
}

const mapStateToProps = state=> {
    return {
        ...state
    }
  }

const mapDispatchToProps = dispatch =>{
    return {
        sendMessage: (payload)=> dispatch(newMessageAction(payload)),
        percentageIncrease: (payload)=> dispatch(completion(payload))
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Attachment)

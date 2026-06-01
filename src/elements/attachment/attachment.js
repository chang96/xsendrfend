import attach from "../../assets/attach.png"
import {useRef} from "react"
import {connect} from "react-redux"
import {newMessageAction, completion, setUpQueue} from "../../action/index"

function Attachment({name, color, height, width, onChange, cN, sendMessage, msg, userType, roomName, percentageIncrease, setQueue}){
    const inputFile = useRef(null)
    const handleClick = ()=>{
        inputFile.current.click()
    }
    const handleChange = (e)=>{
       const {files} = e.target
       if (!files || files.length === 0) return;

       const metadataList = []
       window.fileMap = window.fileMap || {}

       for(let i = 0; i < files.length; i++){
        const file = files.item(i)
        const fileId = "file_" + Math.random().toString(36).substring(2, 9)
        window.fileMap[fileId] = file
        metadataList.push({
          name: file.name,
          size: file.size,
          type: file.type,
          fileId: fileId
        })
       }

       setQueue(metadataList)
       sendMessage({type: 'guest', message: metadataList, niFile: true})
    }

 
    return <div className="">
        <img alt="" onClick={()=>handleClick()} src={attach} className="w-8 h-10 cursor-pointer" /> 
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
        percentageIncrease: (payload)=> dispatch(completion(payload)),
        setQueue: (payload)=> dispatch(setUpQueue(payload))
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Attachment)
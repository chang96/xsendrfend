import {useRef} from "react"
import {connect} from "react-redux"
import {newMessageAction, completion, setUpQueue} from "../../action/index"

function Attachment({name, color, height, width, onChange, cN, sendMessage, msg, userType, roomName, percentageIncrease, setQueue, noteId}){
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
        const fileId = "file--" + (noteId || "default") + "--" + Math.random().toString(36).substring(2, 9)
        window.fileMap[fileId] = file
        metadataList.push({
          name: file.name,
          size: file.size,
          type: file.type,
          fileId: fileId,
          noteId: noteId
        })
       }

       setQueue(metadataList)
       sendMessage({type: 'guest', message: metadataList, niFile: true, noteId: noteId})
    }

 
    return (
        <div className="flex items-center justify-center">
            <svg 
                onClick={handleClick} 
                className="w-[18px] h-[18px] cursor-pointer text-gray-400 hover:text-white transition-colors duration-150" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                viewBox="0 0 24 24"
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <input 
                type="file" 
                ref={inputFile} 
                name="file" 
                style={{ display: "none" }} 
                onChange={handleChange} 
            />
        </div>
    );
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
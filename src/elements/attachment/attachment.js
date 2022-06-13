import attach from "../../assets/attach.png"
import {useRef} from "react"
// import {WebSocketContext} from "../../utils/websocket"
import {connect} from "react-redux"
import {newMessageAction, completion} from "../../action/index"
import {toBase64} from "../../utils/index"


function Attachment({name, color, height, width, onChange, cN, sendMessage, msg, userType, roomName, percentageIncrease}){
    const inputFile = useRef(null)
    // let [state, setState] = useState({
    //     display: 'none',
    //     completion: 0
    // })
    // async function uploadFile(e){
    //     let file = e.target.files[0]
    //     let {roomName} = state
    //     let b64 = await toBase64(file)
    //     socket.emit("messageFromClient", {message: b64, roomName: roomName, type:"file"})
    //     // let stream = ss.createStream()
    //     // console.log(file,b64)
    //     // ss(socket).emit("file", roomName, b64)
    //     // ss.createBlobReadStream(b64).pipe(stream)
    //   }
    const handleClick = ()=>{
        inputFile.current.click()
    }
    const handleChange = async (e)=>{
       const {name, value, files} = e.target
       const file = await toBase64(files[0])//files[0]
       sendMessage({type: 'guest', message: file, niFile: true})
       console.log(e.target, name, value, files)
    //    let chunkSize = 64*1024
    //    let offset = 0
    //    while(offset < file.length){
    //        const chunkFile = file.slice(offset, offset + chunkSize)
    //        const chunk =  chunkFile // await.arrayBuffer()
    //     //    console.log(chunk)
    //     let frac = (offset + chunkSize)/file.length
    //     let percent = frac >= 1? 1 : frac 
    //     percentageIncrease(percent)
    //     submitMessage({type: userType.userType, message:chunk, niFile: true, roomName: roomName.name, xtype:"file", completed: percent})

    //     console.log(percent)
    //        offset+= chunkSize
    //    }
    //     setTimeout(()=> handleSending(file), 5000)
    //    console.log("all done o")
        
        
        // console.log(b64)
        // sendMessage({type: 'guest', message: b64, niFile: true})
        // submitMessage({type: userType.userType, message:b64, niFile: true, roomName: roomName.name, xtype:"file"})

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





// let streaming = files[0].stream()
// let reader = streaming.getReader()
// while(true){
//     let {done, value} = await reader.read()
//     if(done){
//         console.log('done')
//         break;
//     }
//     submitMessage({type: userType.userType, message:value, niFile: true, roomName: roomName.name, xtype:"file"})
//     console.log(value)
// }


// let chunkSize = 64*1024
// let offset = 0
// while(offset < file.size){
//     const chunkFile = await file.slice(offset, offset + chunkSize)
//     const chunk = await chunkFile.arrayBuffer()
//     submitMessage({type: userType.userType, message:chunk, niFile: true, roomName: roomName.name, xtype:"file"})

//     console.log(chunk)
//     offset+= chunkSize
// }

// console.log("all done o")
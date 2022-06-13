import ChartBodyElements from "./chatbodyelements";
import "./index.css"
import { connect } from "react-redux"
import {WebSocketContext} from "../../../utils/websocket"
import {newMessageAction, completion} from "../../../action/index"
import {useState, useContext, useEffect} from 'react'

function Download (){
    return <u
    className="font-bold font-sans"
    >⭳</u>
}

function Sending(){
    return <div>
        <div className="flex flex-row">Sending File...
           <svg role="status" className="w-5 h-5 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
</svg></div>
        {/* <p>{comp}/100</p> */}
        </div>
}
function ChartBody({messageFromServr, completion, sendMessage, userType, roomName, percentageIncrease}){
    let [state, setState] = useState({
        loading: false,
        disabled: false,
        file:'',
        comp:0
    })

    useEffect(()=>{
         let rec = (offset, file)=>{
            if(offset < file.length){
            let chunkSize = 64*1024
            const chunkFile = file.slice(offset, offset + chunkSize)
            const chunk =  chunkFile // await.arrayBuffer()
            let frac = (offset + chunkSize)/file.length
            let percent = frac >= 1? 1 : frac
            setState(state=> {
                return {...state, comp: percent}
            })
            submitMessage({type: userType.userType, message:chunk, niFile: true, roomName: roomName.name, xtype:"file", completed: percent})
            offset+= chunkSize
            return rec(offset, file) 
            } else {
                console.log('done o')
                setState({
                    loading: false,
                    disabled: false,
                    file:''
                })
            }
            
        }
        if(state.loading)
        rec(0, state.file)
    }, [state])
    let {submitMessage} = useContext(WebSocketContext)
    const handleClick = function(file){
        setState((state)=> {
            return {loading: true, disabled: true, file: file}
        })
        // let rec = (offset, file)=>{
        //     if(offset < file.length){
        //     const chunkFile = file.slice(offset, offset + chunkSize)
        //     const chunk =  chunkFile // await.arrayBuffer()
        //     let frac = (offset + chunkSize)/file.length
        //     let percent = frac >= 1? 1 : frac
        //     submitMessage({type: userType.userType, message:chunk, niFile: true, roomName: roomName.name, xtype:"file", completed: percent})
        //     offset+= chunkSize
        //     return rec(offset, file) 
        //     } else {
        //         console.log('done o')
        //         setState({
        //             loading: false,
        //             disabled: false
        //         })
        //     }
            
        // }
        // rec(0, file)
        // while(offset < file.length){
        //     const chunkFile = file.slice(offset, offset + chunkSize)
        //     const chunk =  chunkFile // await.arrayBuffer()
        //  let frac = (offset + chunkSize)/file.length
        //  let percent = frac >= 1? 1 : frac 
        // let updating = {}
        // submitMessage({type: userType.userType, message:chunk, niFile: true, roomName: roomName.name, xtype:"file", completed: percent})
        //     offset+= chunkSize
        // }
        // // setState({...state, disabled: false})
        // console.log('done o')
        //         setState({
        //             loading: false,
        //             disabled: false
        //         })
    }

    let rgx = /(?<=data:).*(?=;)/

    return <div
        className="relative bg-[#1B1B1B] w-96 mb-4"
        style={{
            height:"72%",
            margin:"0 auto"

        }}
    >
        <div className="text-white font-thin">{!state.loading? 'space': <Sending comp={state.comp} />}</div>
        <div
        style={{
            overflow:"auto",
            height:"70%",
            marginTop:"1px",
            width:"100%"
            
        }}
        >
        {messageFromServr.messages.map(function(message, i){
            if(message.type=== "owner"){
                if(message.niFile){
                
                   return <div style={{
                        color:"white",
                        width:"100%",
                        padding:"2px"
    
                    }} key={i}>
                    <object
                    style={{
                        width:"120px",
                        height:'60px',
                    }}
                    data={message.message}

                    ></object>
                    <p><a href={message.message} download={Date.now()} ><Download /></a>{message.message.match(rgx)}</p>
                </div> 
                } else 
                return  <div style={{
                    color:"white",
                    width:"100%",
                    padding:"2px"

                }} key={i}>
                <p
                style={{
                    width:"50%"
                }}
                >{message.message}</p>
            </div> 
        } else {
            if(message.niFile){
                return <div style={{
                    display:"flex",
                    float:"right",
                    width:"100%",
                    justifyContent:"end",
                    color:"white",
                    padding:"2px",
                }} key={i}>
                    {/* <p className="font-thin from-neutral-400 text-sm">{(state.comp)}/100</p> */}
                <div>
                <object
                style={{
                    width:"120px",
                    height:'60px',
                    border:"1px solid blue",
                    borderRadius:"10px"
                }}
                data={message.message}
                
                ></object>
                <span className="flex flex-row">
                    <button
                    className="font-thin text-sm text-blue-600"
                    onClick={()=> handleClick(message.message)}
                    disabled={state.disabled}
                    >Send</button>
                    <span className="text-sm font-thin ml-1">{message.message.match(rgx)}</span>
                </span>
                </div>
            </div> 
            } else return    <div
                style={{
                    display:"flex",
                    float:"right",
                    width:"100%",
                    justifyContent:"end",
                    color:"white",
                    padding:"2px"

                }}
                key={i}
                >
                    <p
                    style={{
                        width:""
                    }}
                    >{message.message}</p>
                </div>
            }
        })}
        </div>
        <div
        className="absolute bottom-0 left-[10%] sm:absolute sm:bottom-5 sm:left-[12%]"
        ><ChartBodyElements /></div>
    </div>
}

const mapStateToProps = state=> {
    return {
        ...state
    }
  }
  
  
  const mapDispatchToProps = dispatch => {
    return {
        sendMessage: (payload)=> dispatch(newMessageAction(payload)),
        percentageIncrease: (payload)=> dispatch(completion(payload))
    }
  }

export default connect(mapStateToProps, mapDispatchToProps)(ChartBody)
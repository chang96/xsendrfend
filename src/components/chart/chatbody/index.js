import ChartBodyElements from "./chatbodyelements";
import "./index.css"
import { connect } from "react-redux"

function Download (){
    return <u
    className="font-bold"
    >⭳</u>
}
function ChartBody({messageFromServr, completion}){
    console.log(messageFromServr, completion)
    return <div
        className="relative bg-[#1B1B1B] w-96 mb-4"
        style={{
            height:"72%",
            margin:"0 auto"

        }}
    >
        <p className="text-white font-bold">space</p>
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
                        height:'120px',
                    }}
                    data={message.message}

                    ></object>
                    <p><a href={message.message} download={Date.now()} ><Download /></a></p>
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
                    <p>{completion.completion * 100}/100</p>
                <div>
                <object
                style={{
                    width:"120px",
                    height:'120px',
                }}
                data={message.message}

                ></object>
                <p><a href={message.message} download={Date.now()} ><Download /></a></p>
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
        
    }
  }

export default connect(mapStateToProps, mapDispatchToProps)(ChartBody)
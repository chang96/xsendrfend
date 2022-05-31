import ChartBody from "./chatbody";
import ChartHead from "./chathead/chathead";

function ChatBodyAndChatHead(){
    return <div
  
    className="
    fixed
    left-0
    top-0
    w-full
    h-full
    z-20
    bg-[#121212]
    sm:relative
    sm:bg-[#121212] 
    sm:w-128"
    
    >
        <ChartHead />
        <ChartBody/>
    </div>
}


export default ChatBodyAndChatHead
import ChartBody from "./chatbody";
import ChartHead from "./chathead/chathead";

function ChatBodyAndChatHead(){
    return <div
  
    className="bg-[#121212] w-128"
    >
        <ChartHead />
        <ChartBody/>
    </div>
}


export default ChatBodyAndChatHead
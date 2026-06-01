import ChartBody from "./chatbody";
import ChartHead from "./chathead/chathead";

function ChatBodyAndChatHead(){
    return (
        <div className="fixed left-0 top-0 w-full h-full z-20 bg-[#121212] flex flex-col justify-between overflow-hidden sm:relative sm:w-128 sm:h-[80vh] sm:rounded-xl sm:border sm:border-[#1f1f1f] sm:shadow-2xl sm:overflow-hidden">
            <ChartHead />
            <ChartBody/>
        </div>
    );
}


export default ChatBodyAndChatHead
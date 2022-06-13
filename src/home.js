import ChatBodyAndChatHead from "./components/chart";
import Description from "./components/description";
import JoinOrCreate from "./components/joinorcreate";
import Logo from "./components/logo";
import { connect } from "react-redux";



function Home(l) {
  let {joined} = l
 


  return (
   
      <div>
        <div><Logo /></div>
        <div 
         className="flex flex-col sm:flex sm:flex-row"
        >
        <div 
        className="sm:h-7070 sm:w-1/2 sm:flex sm:justify-center"
        ><Description />

        </div>
        
        <div
        className="sm:h-7070 sm:w-1/2 sm:flex sm:justify-center"
        >{joined.status ? <ChatBodyAndChatHead /> : <JoinOrCreate />} </div>

        </div>
        <div className="text-white absolute left-0 bottom-0 font-thin text-[12px]">
        {/* contribution: <a>coding salafi</a>, <a>chang</a> */}
        </div>
      </div>

  );
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

export default connect(mapStateToProps, mapDispatchToProps)(Home);

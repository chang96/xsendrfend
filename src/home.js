import ChatBodyAndChatHead from "./components/chart";
import Description from "./components/description";
import JoinOrCreate from "./components/joinorcreate";
import Logo from "./components/logo";
import { connect } from "react-redux";
import AliasGate from "./components/alias/AliasGate";
import { getLastAlias } from "./utils/ownership";

// faax.me/<alias>          -> alias room (owner walks in, others knock)
// faax.me/<alias>?pair=X   -> add this device as an owner
// faax.me/                 -> opens your own room if this device owns one (?home=1 to stay home)
function resolveRoute() {
  const params = new URLSearchParams(window.location.search);
  let alias = decodeURIComponent(window.location.pathname.replace(/^\/+|\/+$/g, ""));
  if (!alias && !params.has("home") && !params.has("join")) {
    const mine = getLastAlias();
    if (mine) {
      alias = mine;
      window.history.replaceState(null, "", "/" + mine);
    }
  }
  return {
    alias: alias || null,
    pairCode: params.get("pair"),
    removed: params.has("removed"),
  };
}

const route = resolveRoute();

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
        >{joined.status
          ? <ChatBodyAndChatHead />
          : route.alias
            ? <AliasGate alias={route.alias} pairCode={route.pairCode} removed={route.removed} />
            : <JoinOrCreate />} </div>

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

// import {useState, useEffect} from "react";
// import openSocket from "socket.io-client";
// import ChatBodyAndChatHead from "./components/chart";
// import ChartBody from "./components/chart/chatbody";
// import CreateSpace from "./components/createspace";
// import Description from "./components/description";
// import JoinOrCreate from "./components/joinorcreate";
// import JoinSpace from "./components/joinspace";
// import Logo from "./components/logo";
// import Or from "./elements/or"
// import { connect } from "react-redux";
import WebSocketProvider from "./utils/websocket"
// import ss  from "../node_modules/socket.io-stream/socket.io-stream"
// import {toBase64} from "./utils/index"
import { Provider } from "react-redux";
import configureStore from "./store/store";
import Home from "./home";
import ReactGA from 'react-ga';
const TRACKING_ID = "UA-102722346-3";
ReactGA.initialize(TRACKING_ID);
ReactGA.pageview(window.location.pathname + window.location.search);



function App() {


  return (
    <Provider store={configureStore()}>
        <WebSocketProvider>
         <Home /> 
        </WebSocketProvider>  
    </Provider>

  );
}



export default App;

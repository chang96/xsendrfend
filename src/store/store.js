import { createStore, combineReducers } from "redux";
import {
    createSpaceReducer,
    messageReducer,
    fromServerReducer,
    // joinedReducer,
    roomNameReducer,
    // guestNumberReducer,
    // responseReducer
    setUserTypeReducer,
    completionReducer,
    connectionEstablishedReducer
} from "../reducers/index"
const rootReducer = combineReducers({
    joined: createSpaceReducer,
    messageFromServr: fromServerReducer,
    // guests: guestNumberReducer,
    roomName: roomNameReducer,
    // createSpace: joinedReducer,
    message: messageReducer,
    // response: responseReducer
    userType: setUserTypeReducer,
    completion: completionReducer,
    connected: connectionEstablishedReducer
})

const initialState = {
    messageFromServr: {messages: [
        {type:"owner", message:""},
        {type:"guest", message:""}
    ]},
    // createSpace: false,
    // guests:0,
    roomName:{name: "****"},
    joined: {status: false},
    userType:{userType: ""},
    message:{message: ""},
    completion: {completion:0},
    connected:{connected: false}
    // response:""
}


function configureStore(state = initialState){
    return createStore(rootReducer, state)
}

export default configureStore;
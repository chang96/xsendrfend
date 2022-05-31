import { createStore, combineReducers } from "redux";
import {
    createSpaceReducer,
    messageReducer,
    fromServerReducer,
    joinedReducer,
    roomNameReducer,
    guestNumberReducer,
    responseReducer
} from "../reducers/index"
const rootReducer = combineReducers({
    createSpace: createSpaceReducer,
    messageFromServr: fromServerReducer,
    guests: guestNumberReducer,
    roomName: roomNameReducer,
    joined: joinedReducer,
    message: messageReducer,
    response: responseReducer
})
const initialState = {
    messageFromServr: [],
    createSpace: false,
    guests:0,
    roomName:{name: "****"},
    joined:"",
    message:"",
    response:""
}


function configureStore(state = initialState){
    return createStore(rootReducer, state)
}

export default configureStore;
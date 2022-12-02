import { CONNECTED, CREATE_SPACE, NEWQUEUE } from "../actionTypes"
import { CHANGE_NAME } from "../actionTypes"
import { USER_TYPE } from "../actionTypes"
import { NEW_MESSAGE } from "../actionTypes"
import { COMPLETION} from "../actionTypes"

// const initialState = {
//     messageFromServr: [],
//     createSpace: false,
//     guests:0,
//     roomName:{name: "****"},
//     joined: {joined: false},
//     message:"",
//     response:""
// }

const createSpaceReducer = function (state, action){
    
    switch(action.type){
        case CREATE_SPACE:
            return {
                status: true
            }
        default:
            return {
                ...state
            }
    }
}

const messageReducer = function (state, action){
    switch(action.type){
        case "N":
            return {
                message:''
            }
        default:
            return {
                ...state
            }
    }
}

const roomNameReducer = function (state, action){
    switch(action.type){
        case CHANGE_NAME:
            return {
                name: action.name
            }
        default:
            return {
                ...state
            }
    }
}

// const joinedReducer = function (state, action){
//     switch(action.type){
//         case NEWUSER:
//             return {
//                 users: state.users + 1
//             }
//         default:
//             return {
//                 ...state
//             }
//     }
// }


const fromServerReducer = function (state, action){
    switch(action.type){
        case NEW_MESSAGE:
            return {
                messages: [...state.messages, action.payload]
            }
        default:
            return {
                ...state
            }
    }
}

const setUserTypeReducer = function(state, action){
    switch(action.type){
        case USER_TYPE:
            return {
                userType: action.userType
            }
        default:
            return {
                ...state
            }
    }
}

const completionReducer = function(state,action){
    switch(action.type){
        case COMPLETION:
            return {
                completion: action.payload
            }
        default:
            return {
                ...state
            }
    }
}

const connectionEstablishedReducer = function (state, action){
    switch(action.type){
        case CONNECTED:
            return {
                connected: true
            }
        default: 
            return {
                ...state
            }
    }
}

const setUpQueueReducer = function(state, action){
    switch(action.type){
        case NEWQUEUE:
            return {
                queued: [...action.queue]
            }
        default:
            return {
                ...state
            }
    }
}
export {
    createSpaceReducer,
    messageReducer,
    fromServerReducer,
    // joinedReducer,
    roomNameReducer,
    // guestNumberReducer,
    // responseReducer
    setUserTypeReducer,
    completionReducer,
    connectionEstablishedReducer,
    setUpQueueReducer
}
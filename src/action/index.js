import { CONNECTED, CREATE_SPACE } from "../actionTypes"
import { CHANGE_NAME } from "../actionTypes"
import { USER_TYPE } from "../actionTypes"
import { NEW_MESSAGE } from "../actionTypes"
import { COMPLETION, NEWUSER } from "../actionTypes"


const createSpaceAction = function(){
    return {
        type: CREATE_SPACE,
        
    }
}

const changRoomNameAction = function(name){
    return {
        type: CHANGE_NAME,
        name: name
    }
}

const setUserType = function (userType){
    return {
        type: USER_TYPE,
        userType

    }
}

const newMessageAction = function(payload){
    return {
        type: NEW_MESSAGE,
        payload: payload
    }
}

const completion = function (payload){
    return {
        type: COMPLETION,
        payload: payload
    }
}

const userJoined = function(user){
    return {
        type: NEWUSER,
        user: user
    }
}

const connectionEstablished = function(){
    return {
        type: CONNECTED
    }
}

// const sendMessagAction = function(message){
//     return {
//         type: SEND_MESSAGE,
//         payload: {
//             message,
//             type:"send"
//         }
//     }
// }

// const receiveMessageAction = function(message){
//     return {
//         type: RECEIVE_MESSAGE,
//         payload: {
//             message,
//             type:"receive"
//         }
//     }
// }


export {
    createSpaceAction,
    userJoined,
    changRoomNameAction,
    setUserType,
    newMessageAction,
    completion,
    connectionEstablished
}
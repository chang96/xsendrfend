import { CONNECTED,
        CONNECTING,
        CREATE_SPACE,
        CHANGE_NAME,
        USER_TYPE,
        NEW_MESSAGE,
        COMPLETION, 
        NEWUSER 
     } from "../actionTypes"

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

const connectionEstablished = function(payload){
    if(!payload){
        return {
            type: CONNECTED
        }
    } else {
        return {
            type: CONNECTING,
            payload: payload
        }
    }
   
}

const connecting = function (){
    return {
        type: CONNECTING
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
    connectionEstablished,
    connecting
}
import { CREATE_SPACE } from "../actionTypes"
import { GUEST_NUM } from "../actionTypes"
import { SEND_MESSAGE } from "../actionTypes"
import { RECEIVE_MESSAGE } from "../actionTypes"


const createSpaceAction = function(){
    return {
        type: CREATE_SPACE,
        
    }
}

const guestAction = function(num){
    return {
        type: GUEST_NUM,
        num: num
    }
}

const sendMessagAction = function(message){
    return {
        type: SEND_MESSAGE,
        payload: {
            message,
            type:"send"
        }
    }
}

const receiveMessageAction = function(message){
    return {
        type: RECEIVE_MESSAGE,
        payload: {
            message,
            type:"receive"
        }
    }
}


export default {
    createSpaceAction,
    guestAction,
    sendMessagAction,
    receiveMessageAction
}
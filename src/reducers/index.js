import { CREATE_SPACE } from "../actionTypes"

const createSpaceReducer = function (state, action){
    switch(action.type){
        case CREATE_SPACE:
            return {
                createSpace: true
            }
        default:
            return {
                ...state
            }
    }
}

const messageReducer = function (state, action){
    switch(action.type){
        case "":
            return {
                
            }
        default:
            return {
                ...state
            }
    }
}

const roomNameReducer = function (state, action){
    console.log(state, action)
    switch(action.type){
        case "":
            return {
                
            }
        default:
            return {
                ...state
            }
    }
}

const guestNumberReducer = function (state, action){
    switch(action.type){
        case "":
            return {
                
            }
        default:
            return {
                ...state
            }
    }
}

const joinedReducer = function (state, action){
    switch(action.type){
        case "":
            return {
                
            }
        default:
            return {
                ...state
            }
    }
}

const responseReducer = function (state, action){
    switch(action.type){
        case "":
            return {
                
            }
        default:
            return {
                ...state
            }
    }
}

const fromServerReducer = function (state, action){
    switch(action.type){
        case "":
            return {
                
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
    joinedReducer,
    roomNameReducer,
    guestNumberReducer,
    responseReducer
}
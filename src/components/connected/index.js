
function Connected({roomName}){
    let c = roomName.name? "w-2 h-2 bg-green-600" : "w-2 h-2 bg-red-600" 
    return <div className="absolute top-0 left-0">
       <span className="flex flex-row"> 
       <p className={c}>
        
        </p>
        <p className="-mt-1 ml-1">{roomName.name? 'connected': 'not connected'}</p>
        </span>

</div>
}


export default Connected
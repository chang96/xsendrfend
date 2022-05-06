function Btn({name, color, height, width, onclick, cN}){

    return <div>
        <button className={cN} style={{width: width, height: height, color: color}} onClick={()=> onclick}>{name}</button>
    </div>
}


export default Btn
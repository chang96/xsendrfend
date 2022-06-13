function Btn({name, color, height, width, onclick, cN, image=false, link}){

    return <div>
        <button className={cN} style={{width: width, height: height, color: color}} onClick={()=> onclick()}>{name}  {image?<img alt="" className="-mt-4 ml-14" width={"10px"} height={"10px"} src={link} />:""}</button>
        
    </div>
}


export default Btn
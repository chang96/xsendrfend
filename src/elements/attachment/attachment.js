import attach from "../../assets/attach.png"
function Attachment({name, color, height, width, onChange, cN}){

    return <div className="">
        <img src={attach} className="w-8 h-10" /> {/* <input type="file" className={cN} name={name} style={{width: width, height: height, color: color}} onChange={()=> onChange} /> */}
    </div>
}


export default Attachment
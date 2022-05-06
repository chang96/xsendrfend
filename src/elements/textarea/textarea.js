function Textarea({name, color, height, width, onChange, cN}){

    return <div>
        <textarea type="text" className={cN} name={name} style={{width: width, height: height, color: color}} onChange={()=> onChange}></textarea>
    </div>
}


export default Textarea
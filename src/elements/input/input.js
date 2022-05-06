function Input({name, color, height, width, onChange, cN}){

    return <div>
        <input type="text" className={cN} name={name} style={{width: width, height: height, color: color}} onChange={()=> onChange} />
    </div>
}


export default Input
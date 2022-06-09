import {useState} from "react"
function Input({name, color, height, width, onChange, cN, ta, msg}){
let [state, setState] = useState({
    name: name,
    value:msg
})
    const handleChange = function(e){
        let {name, value} = e.target
        setState({[name]: value})
        onChange({name, value})
}
    if(ta){
        let st = "h-9 border-none outline-none bg-[#121212] text-white"
        return <div className="bg-[#121212] ">
        <textarea value={msg} type="text" className={st} name={name} onChange={(e)=> handleChange(e)} />
    </div>
    }else {
    return <div>
        <input type="text" className={cN} name={name} style={{width: width, height: height, color: color}} onChange={(e)=> handleChange(e)} />
    </div>
    }
}

const mapStateToProps = state=> {
    return {
        ...state
    }
  }

export default Input
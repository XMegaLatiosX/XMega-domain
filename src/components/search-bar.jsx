import { useState } from "react"


function result() {
    
}

function SearchBar({placeholder, onChanged, onSearch, results, onInteract}) {
    const [value, set_value] = useState("")
    const [is_open, set_is_open] = useState(false)

    function handle_submit(e) {
        e.preventDefault()

        onSearch(value)
    }

    function handle_change(e) {
        e.preventDefault()
        set_is_open(true)
        set_value(e.target.value)

        onChanged(e.target.value)
    }

    return (
        <div className="relative" onBlur={() => set_is_open(false)}>
            <form onSubmit={handle_submit} className="relative w-64 h-7.5 border border-cyan-600 rounded-full z-30 bg-gray-950">
                <input type="text" placeholder={placeholder || "Search..."} className="w-full h-full pl-2 outline-0" onFocus={handle_change} onChange={handle_change}/>
            </form>

            {is_open && results && (
                <div className="relative -top-3.5 pt-3.5 w-full max-h-32 flex flex-col overflow-auto bg-gray-900">
                    <div className="h-6 flex flex-row justify-between items-center px-2 py-4">
                        <span className="">nickname:</span>
                        <span className="text-right">skills count:</span>
                    </div>
                    <hr className="text-gray-700 mx-2"/>
                    {
                    results.map(result => {
                        
                        return (
                            <a className="flex flex-col hover:bg-gray-800 cursor-pointer" onClick={(input_value)=> onInteract(result.nickname)}>
                                <div className="h-10 flex flex-row justify-around items-center">
                                    <span className="w-48">{result.nickname}</span>
                                    <span className="w-4">{result.skill_count}</span>
                                </div>
                                <hr className="text-gray-700 mx-2"/>
                            </a>
                        )
                    })}
                </div>

            )}
        </div>
    )
}

export default SearchBar
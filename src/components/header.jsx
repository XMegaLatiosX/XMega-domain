import { useEffect } from "react"
import { Link } from "react-router-dom"





function toggle_side_bar() {
    const sidebar_div = document.getElementById('sidebar_div');
    sidebar_div.classList.toggle('open');
}

function Header() {
    
    useEffect(() => {
        async function isLive() {
        
            const res = await fetch("/data/twitch.json",)
            const data = await res.json()

            if(data.live) {
                document.getElementById('is_live_display').innerHTML = `${data.viewer_count} - 🔴Live`
            }
            else document.getElementById('is_live_display').innerHTML = ""
        }
        isLive();
        const interval = setInterval(isLive, 25000)
        return () => clearInterval(interval)
    }, [])
    return (
        <header className="relative top-0 w-screen h-16 bg-black flex justify-between items-center pl-2">
            <div className="h-full flex justify-between space-x-1 items-center pl-4 gap-2">
                <a className="border-none" onClick={toggle_side_bar}>
                    <img className="rounded-4xl h-10 w-10" src="/src/assets/images/side-bar-icon.png" />
                </a>
                <Link to="/" className="h-full flex items-center justify-center">
                    <img className="absolute h-7/12" src="/src/assets/images/star_icon.png" />
                    <h2 className="font-bold text-cyan-300 font-mono font-stretch-condensed z-20 text-shadow-2xs text-shadow-black">XMega</h2>
                </Link>
            </div>

            <img className="pixel-art h-2/3 w-3/12" src="/src/assets/images/soundwaveplaceholder.png"/>

            <div className="h-full w-16 flex items-center">
                <a id="is_live_display" target="_blank" href="https://www.twitch.tv/xmegalatiosx"></a>
            </div>
        </header>
    )
}
export default Header
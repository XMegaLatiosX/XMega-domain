function toggle_side_bar() {
    const sidebar_div = document.getElementById('sidebar_div');
    sidebar_div.classList.toggle('open');
}

function Header() {
    return (
        <header className="relative top-0 w-screen h-16 bg-black flex justify-between items-center pl-2">
            <div className="h-full flex justify-between space-x-1 items-center">
                <button onClick={toggle_side_bar}>
                    <img className="rounded-4xl h-10 w-10" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRyEVHxnarUNfArnjsywlB1j-Q5FFIsqlAriQ&amp;s" />
                </button>
                <div className="h-full flex items-center justify-center">
                    <img className="absolute h-7/12" src="src/assets/images/star_icon.png" />
                    <h2 className="font-bold text-cyan-300 font-mono font-stretch-condensed z-20 text-shadow-2xs text-shadow-black">XMega</h2>
                </div>
            </div>

            <img className="pixel-art h-2/3 w-3/12" src="src/assets/images/soundwaveplaceholder.png"/>

            <div className="h-full w-16 flex items-center">
                <a target="_blank" href="https://www.twitch.tv/xmegalatiosx">🔴Live</a>
            </div>
        </header>
    )
}
export default Header
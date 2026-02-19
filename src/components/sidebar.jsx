import { Link } from "react-router-dom"

function Sidebar() {
    return (
        <aside id="sidebar_div" className="sidebar_div">
            <a className="sidebar_topic" href="https://discord.gg/KJ398CH2Th"> <span className="sidebar_topic_text">Join our discord!</span> </a>
            
            <Link className="sidebar_topic" to="/blog/"> <span className="sidebar_topic_text">What is new?</span> </Link>
            <Link className="sidebar_topic" to="/progress"> <span className="sidebar_topic_text">Progress</span> </Link>
            <Link className="sidebar_topic" to="/about"> <span className="sidebar_topic_text">About</span> </Link>
            
            <Link className="sidebar_topic" to="/settings"> <span className="sidebar_topic_text">Settings</span> </Link>
            {/* <div className="sidebar_topic"> <span className="sidebar_topic_text" href="">Support me develop</span> </div> SEM PEDIR ESMOLA POR ENQUANTO */}
            <a className="sidebar_topic" target="_blank" href="https://docs.google.com/forms/d/e/1FAIpQLSfZDQMxMEjC9BdKI-uSBisRYu-w1N3wKu9aZirxOFS0li5Q3g/viewform?usp=publish-editor"> <span className="sidebar_topic_text">send your feedback!</span> </a>
            <a className="sidebar_topic" target="_blank" href="https://docs.google.com/forms/d/e/1FAIpQLSfZDQMxMEjC9BdKI-uSBisRYu-w1N3wKu9aZirxOFS0li5Q3g/viewform?usp=publish-editor"> <span className="sidebar_topic_text">report a bug</span> </a>
            
            <Link className="sidebar_topic" to="/404"> <span className="sidebar_topic_text">404</span> </Link>
            
            <div className="flex gap-2 pl-2 h-12 items-center">
                <a href="https://github.com/XMegaLatiosX" target="_blank">          <img className="h-8" src="/src/assets/images/github.png"/></a>
                <a href="https://discord.gg/KJ398CH2Th" target="_blank">            <img className="h-8" src="/src/assets/images/discord.png"/></a>
                <a href="https://www.instagram.com/xmega_latiosx/#" target="_blank"> <img className="h-8" src="/src/assets/images/instagram.png"/></a>
            </div>

            {/* <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSfZDQMxMEjC9BdKI-uSBisRYu-w1N3wKu9aZirxOFS0li5Q3g/viewform?usp=publish-editor" className="w-lg h-140"></iframe> GOOGLE FORM EMBED*/}

        </aside>
    )
}
export default Sidebar
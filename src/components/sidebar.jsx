import { useEffect } from "react"
import { NavLink } from "react-router-dom"
import github_icon from "../assets/images/github.png"
import discord_icon from "../assets/images/discord.png"
import instagram_icon from "../assets/images/instagram.png"
import soundcloud_icon from "../assets/images/soundcloud.png"

const ITEMS = [
    { to: "/blog/", label: "What is new?" },
    { to: "/gallery", label: "Gallery" },
    { to: "/music", label: "Music" },
    { to: "/projects", label: "Projects" },
    { to: "/about", label: "About" },
    { to: "/settings", label: "Settings" },
    { to: "/feedback", label: "Feedback / bugs" },
]

const EDGE = 28 // px from the left edge where a swipe to open can start
const SWIPE = 55 // px of horizontal movement that counts as a swipe

function Sidebar() {
    const link_class = ({ isActive }) => "sidebar_topic" + (isActive ? " active" : "")

    useEffect(() => {
        const panel = () => document.getElementById("sidebar_div")
        const set_open = (open) => panel()?.classList.toggle("open", open)
        const is_open = () => !!panel()?.classList.contains("open")

        // closes when the focus or a click goes anywhere else (the header button that opens it is left alone)
        const outside = (event) => {
            if (!is_open()) return
            const target = event.target
            if (!(target instanceof Element)) return
            if (target.closest("#sidebar_div") || target.closest("[data-sidebar-toggle]")) return
            set_open(false)
        }
        const escape = (event) => { if (event.key === "Escape") set_open(false) }

        // touch: a swipe right from the left edge opens it, a swipe left on it (or anywhere, while open) closes it
        let start = null
        const touch_start = (event) => {
            const t = event.touches[0]
            start = (is_open() || t.clientX <= EDGE) ? { x: t.clientX, y: t.clientY, open: is_open() } : null
        }
        const touch_end = (event) => {
            if (!start) return
            const t = event.changedTouches[0]
            const dx = t.clientX - start.x, dy = t.clientY - start.y
            if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy) * 1.5) {
                if (!start.open && dx > 0) set_open(true)
                else if (start.open && dx < 0) set_open(false)
            }
            start = null
        }

        document.addEventListener("pointerdown", outside)
        document.addEventListener("focusin", outside)
        document.addEventListener("keydown", escape)
        document.addEventListener("touchstart", touch_start, { passive: true })
        document.addEventListener("touchend", touch_end, { passive: true })
        return () => {
            document.removeEventListener("pointerdown", outside)
            document.removeEventListener("focusin", outside)
            document.removeEventListener("keydown", escape)
            document.removeEventListener("touchstart", touch_start)
            document.removeEventListener("touchend", touch_end)
        }
    }, [])

    return (
        <aside id="sidebar_div" className="sidebar_div">
            <a className="sidebar_topic sidebar_cta" href="https://discord.gg/KJ398CH2Th" target="_blank" rel="noreferrer"> <span className="sidebar_topic_text">Join our discord!</span> </a>

            <NavLink end className={link_class} to="/"> <span className="sidebar_topic_text">Visualizer</span> </NavLink>
            <NavLink className={link_class} to="/mural"> <span className="sidebar_topic_text">Mural</span> </NavLink>

            {ITEMS.map(item => (
                <NavLink key={item.to} className={link_class} to={item.to}> <span className="sidebar_topic_text">{item.label}</span> </NavLink>
            ))}

            {/* empty space on purpose: the pixel-art animation goes here later */}
            <div className="flex-1" />

            <div className="flex gap-2 pl-1 h-12 items-center">
                <a href="https://github.com/XMegaLatiosX" target="_blank" rel="noreferrer"><img className="h-8" src={github_icon} alt="github" /></a>
                <a href="https://discord.gg/KJ398CH2Th" target="_blank" rel="noreferrer"><img className="h-8" src={discord_icon} alt="discord" /></a>
                <a href="https://www.instagram.com/xmega_latiosx/#" target="_blank" rel="noreferrer"><img className="h-8" src={instagram_icon} alt="instagram" /></a>
                <a href="https://soundcloud.com/xmega_latiosx" target="_blank" rel="noreferrer"><img className="h-8" src={soundcloud_icon} alt="soundcloud" /></a>
            </div>
        </aside>
    )
}
export default Sidebar

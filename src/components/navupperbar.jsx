import { Link, useLocation } from "react-router-dom"

// Only the links, floating (no bar behind them), 2.5rem tall. The pages below it are sized with calc(100vh-6.5rem):
// the header is 4rem and this is 2.5rem.
function UpperBarButton({ label, to }) {
    return (
        <Link className="h-full flex justify-center items-center shrink-0 pointer-events-auto" to={to}>
            <span className="whitespace-nowrap h-7 flex items-center bg-cyan-950/50 rounded-xl border-2 border-cyan-500/35 px-2 text-sm text-cyan-600 hover:text-cyan-300 hover:border-cyan-300 transition-colors">
                {label}
            </span>
        </Link>
    )
}

// floating: on wide screens (lg) it sits over the top of the page (the home page's wall shows through behind the links) and takes no
// room of its own: pass it to a page whose main is then 2.5rem taller. Below lg it stays in the flow.
// The link to the page you are on is not shown; "home" is there for every other page.
const LINKS = [
    { to: "/", label: "home" },
    { to: "/about", label: "about" },
    { to: "/mural", label: "mural" },
    { to: "/blog", label: "blog" },
    { to: "/music", label: "music" },
    { to: "/gallery", label: "gallery" },
    { to: "/projects", label: "projects" },
    { to: "/self-improvement", label: "self improvement" },
]
const is_here = (to, pathname) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/"))

function NavUpperBar({ floating = false }) {
    const { pathname } = useLocation()
    return (
        <div className={`UpperBar w-full h-10 flex justify-start lg:justify-evenly gap-2 px-2 lg:px-6 overflow-x-auto overflow-y-hidden ${floating ? "lg:relative lg:z-30 lg:-mb-10 lg:pointer-events-none" : ""}`}>
            {LINKS.filter((link) => !is_here(link.to, pathname)).map((link) => <UpperBarButton key={link.to} to={link.to} label={link.label}></UpperBarButton>)}
        </div>
    )
}
export default NavUpperBar

import { Link } from "react-router-dom"

function UpperBarButton({ label, to }) {
    return (
        <Link className="h-full flex justify-center items-center" to={to}>
            <span className="h-7/12 bg-cyan-950 rounded-xl mx-1 border-2 border-cyan-500 px-1.5 text-cyan-600">
                {label}
            </span>
        </Link>
    )
}

function NavUpperBar() {
    return (
        <div className="UpperBar bg-gray-900 w-full h-12 flex justify-around overflow-scroll">
            <UpperBarButton to="/about" label="about"></UpperBarButton>
            <UpperBarButton to="/blog" label="blog"></UpperBarButton>
            {/* <UpperBarButton to="/music" label="music"></UpperBarButton> dont know what to put here yet... */}
            <UpperBarButton to="/gallery" label="gallery"></UpperBarButton>
            <UpperBarButton to="/programming" label="programming"></UpperBarButton>
            <UpperBarButton to="/progress" label="progress"></UpperBarButton>
        </div>
    )
}
export default NavUpperBar
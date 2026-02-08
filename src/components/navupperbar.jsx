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
        <div className="categorys bg-gray-900 w-full h-12 flex justify-around overflow-scroll">
            <UpperBarButton to="../pages/about.jsx" label="about"></UpperBarButton>
            {/* <UpperBarButton to="../pages/blog/index.jsx" label="blog"></UpperBarButton>
            <UpperBarButton to="../pages/about" label="music"></UpperBarButton>
            <UpperBarButton to="../pages/about" label="gallery"></UpperBarButton>
            <UpperBarButton to="../pages/about" label="programming"></UpperBarButton>
            <UpperBarButton to="../pages/about" label="progress"></UpperBarButton> */}
        </div>
    )
}
export default NavUpperBar
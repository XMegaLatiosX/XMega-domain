import { Link } from "react-router-dom"
import Screen from "../../components/screen"
import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Sidebar from "../../components/sidebar"
import pixelart_thumbnail from "../../assets/images/pixelart_thumbnail.png"
import edits_thumbnail from "../../assets/images/edits-thumbnail.png"
import dance_thumbnail from "../../assets/images/dance-thumbnail.png"
import photos_thumbnail from "../../assets/images/photos_thumbnail.png"

// A folder: the picture fills the card, the name sits on it over a dark fade so it always reads.
function Categorie({ name, note, src, to }) {
    return (
        <Link to={to} className="group relative block aspect-[4/5] overflow-hidden border-2 border-cyan-900 bg-gray-950 hover:border-cyan-400 transition-colors">
            <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition duration-300" />
            <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-14 bg-gradient-to-t from-black via-black/70 to-transparent">
                <h2 className="pixel-font text-xl sm:text-2xl text-cyan-300 [text-shadow:0_2px_0_#000]">{name}</h2>
                <p className="text-xs text-cyan-100/70">{note}</p>
            </div>
        </Link>
    )
}

function GalleryHome() {
    return (
        <Screen>
            <Header />
            <NavUpperBar />
            <Sidebar />

            <main className="relative w-screen h-[calc(100vh-6.5rem)] overflow-auto">
                <div className="w-full max-w-6xl mx-auto px-3 pt-6 pb-24">
                    <h1 className="pixel-font text-3xl text-cyan-300">gallery</h1>
                    <p className="text-sm text-cyan-700 mb-5">pick a folder</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <Categorie to="/gallery/pixelarts" src={pixelart_thumbnail} name="pixel arts" note="sprites and scenes" />
                        <Categorie to="/gallery/edits" src={edits_thumbnail} name="edits" note="videos and visuals" />
                        <Categorie to="/gallery/dances" src={dance_thumbnail} name="dance" note="moves and sessions" />
                        <Categorie to="/gallery/photos" src={photos_thumbnail} name="photos" note="moments" />
                    </div>
                </div>
            </main>
        </Screen>
    )
}
export default GalleryHome

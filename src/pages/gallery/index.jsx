import { Link } from "react-router-dom"
import Screen from "../../components/screen"
import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Sidebar from "../../components/sidebar"
import pixelart_thumbnail from "../../assets/images/pixelart_thumbnail.png"
import edits_thumbnail from "../../assets/images/edits-thumbnail.png"
import dance_thumbnail from "../../assets/images/dance-thumbnail.png"
import photos_thumbnail from "../../assets/images/photos_thumbnail.png"

function Categorie({ name, src, to }) {
    return (
        <Link className="folder" to={to}>
            <img src={src} className="folder_thumbnail" />
            <div className="folder_description_div">
                <h2 className="folder_title"> {name} </h2>
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

            <main className="relative w-screen h-[calc(100vh-7rem)] overflow-auto">
                <div className="flex flex-wrap content-start justify-around pt-4 px-1.5">
                    <Categorie to="/gallery/pixelarts" src={pixelart_thumbnail} name="pixel arts" />
                    <Categorie to="/gallery/edits" src={edits_thumbnail} name="edits" />
                    <Categorie to="/gallery/dances" src={dance_thumbnail} name="dance" />
                    <Categorie to="/gallery/photos" src={photos_thumbnail} name="photos" />
                </div>

            </main>
        </Screen>
    )
}
export default GalleryHome
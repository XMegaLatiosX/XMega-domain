import { Link } from "react-router-dom"
import Screen from "../../components/Screen"
import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Sidebar from "../../components/sidebar"

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


function GalleryPage() {
    return (
        <Screen>
            <Header />
            <NavUpperBar />
            <Sidebar />

            <main className="relative w-screen h-[calc(100vh-7rem)] overflow-auto flex flex-wrap content-start justify-around pt-4 px-1.5">

                <Categorie to="/gallery/pixelart" src="src\assets\pixelarts\NICK POMNI PNG.png" name="pixel arts" />
                <Categorie to="/gallery/edits" src="src\assets\pixelarts\NICK POMNI PNG.png" name="edits" />
                <Categorie to="/gallery/dance" src="src\assets\pixelarts\NICK POMNI PNG.png" name="dance" />
                <Categorie to="/gallery/photos" src="src\assets\pixelarts\NICK POMNI PNG.png" name="photos" />

            </main>
        </Screen>
    )
}
export default GalleryPage
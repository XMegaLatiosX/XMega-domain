import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/Screen"
import Sidebar from "../../components/sidebar"



function Piece({ name, src, to }) {
    return (
        <Link className="folder" to={to}>
            <img src={src} className="folder_thumbnail" />
            <div className="folder_description_div">
                <h2 className="folder_title"> {name} </h2>
            </div>
        </Link>
    )
}

function PixelArtPage() {
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="relative w-screen h-[calc(100vh-7rem)] overflow-auto flex flex-wrap content-start justify-around pt-4 px-1.5">
            { }
            </main>
        </Screen>
    )
}
export default PixelArtPage
// faz sentido trocar link clicando em imagem? Talvez pra compartilhar link com a imagem já aberta
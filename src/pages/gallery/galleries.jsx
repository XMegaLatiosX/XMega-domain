import { Link, Navigate, useNavigate, useParams } from "react-router-dom"
import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/Screen"
import Sidebar from "../../components/sidebar"
import medias from "../../data/medias.json"

function toggle_modal(src) {
    const modal = document.getElementById('modal_bg')
    modal.style.display = modal.style.display == 'flex'? 'none' : 'flex'
    // if modal is visible, then it will be shut

    if(modal.style.display === 'flex') document.getElementById('modal_img').src = `/media/${src}`;

    window.history.replaceState(null, "New Page Title", `/gallery/${src}`)
}

function Media_element({ name, src, category }) {
    return (
        <a className="folder" onClick={() => {toggle_modal(`${category}/${name}`)}}>
            <img src={src} className="folder_thumbnail" />
            <div className="folder_description_div">
                <h2 className="folder_title"> {name} </h2>
            </div>
        </a>
    )
}
function Modal({ display, media, category }) {
    const path = '/media/' + category + '/'+media
    return (
        <div style={{display: display}} className="fixed bottom-0 w-screen h-[calc(100vh-7rem)] overflow-auto flex justify-around" id="modal_bg">
            <div className="w-full h-full" onClick={() => {toggle_modal(`${category}/`)}}></div>
            <div  className="fixed w-[95vw] z-50" id="modal_div">
                <img id="modal_img" src={path} />
            </div>

        </div>
    )
}


function Gallery() {
    const { category, media_name} = useParams()
    // if(!category) return <Navigate to="/404" replace/> REVER CONDIÇOES DE LOADING PRA CASO CATEGORIA NAO EXISTA OU IMAGEM NAO EXISTA
    const current_display = media_name ? 'flex' : 'none'


    const filtered_media = medias.filter(item => item.category === category)
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="relative w-screen h-[calc(100vh-7rem)] overflow-auto flex flex-wrap content-start justify-around pt-4 px-1.5">
                {   
                    filtered_media.map(piece => {
                        return <Media_element name={piece.name} key={piece.name} src={piece.path} category={category}/>
                    })
                    
                }
            </main>
            <Modal display={current_display} media={media_name} category={category}/>
        </Screen>
    )
}
export default Gallery
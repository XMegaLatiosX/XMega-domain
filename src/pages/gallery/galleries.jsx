import { Link, Navigate, useNavigate, useParams } from "react-router-dom"
import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/Screen"
import Sidebar from "../../components/sidebar"
import medias from "../../data/medias.json"

function toggle_modal(src) {
    const modal = document.getElementById('modal_bg')
    modal.style.display = modal.style.display == 'flex'? 'none' : 'flex'

    if(modal.style.display === 'flex') document.getElementById('modal_img').src = `/media/${src}`;
    // if(modal.style.display === 'flex') document.getElementById('modal_title').src = `/media/${src}`;

    window.history.replaceState(null, "New Page Title", `/gallery/${src}`)
}

function Media_element({ name, src, category }) {
    return (
        <a className="relative flex items-start mb-1" onClick={() => {toggle_modal(`${category}/${name}`)}}>
            <img src={src} className="rounded-sm" />
            <div className="absolute flex items-center justify-center top-0 right-0 p-0.5">
                <h2 className="text-sm text-cyan-500 opacity-45"> {name.split('.')[0]} </h2>
            </div>
        </a>
    )
}
function Modal({ display, media, category, func }) {
    const path = '/media/' + category + '/'+media
    return (
        <div style={{display: display}} className="fixed bottom-0 w-screen h-[calc(100vh-7rem)] overflow-auto flex justify-around items-center mb-8" id="modal_bg">
            <div className="w-full h-full" onClick={() => {toggle_modal(`${category}/`)}}></div>
            <div  className="absolute z-50 flex flex-col items-center justify-center max-w-[90%]" id="modal_div">
                <div className="relative flex items-center justify-center grow">
                    <a onClick={() => {func(-1)}} className="fixed rounded-full bg-[rgba(53,31,61,0.75)] w-12 h-12 left-2 sm:left-2/12 flex justify-center  pl-2 items-center"><i className="arrow select-none w-6 h-6 rotate-135"></i></a>
                    <img id="modal_img" className="max-h-[60vh]" src={path} />
                    <a onClick={() => {func(1)}} className="fixed rounded-full bg-[rgba(0,0,0,.5)] w-12 h-12 right-2 sm:right-2/12 flex justify-center  pr-2 items-center"><i className="arrow select-none w-6 h-6 -rotate-45"></i></a>
                </div>
                <h2>{media}</h2>
            </div>

        </div>
    )
}


function Gallery() {
    const { category, media_name} = useParams()
    // if(!category) return <Navigate to="/404" replace/> REVER CONDIÇOES DE LOADING PRA CASO CATEGORIA NAO EXISTA OU IMAGEM NAO EXISTA
    const current_display = media_name ? 'flex' : 'none'


    const filtered_media = medias.filter(item => item.category === category)
    
    let current_index = 0;
    function change_modal(wich_side) {
        if((current_index+wich_side) == -1 || current_index+wich_side == (filtered_media.length)) return //limite, fa animação pra tentar scrollar pro lado mas nn ir dps
        current_index = current_index+wich_side
        const next_item = filtered_media[current_index]
        document.getElementById('modal_img').src = next_item.path;
        window.history.replaceState(null, "New Page Title", `/gallery/${next_item.category}/${next_item.name}`)

    }    
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="relative w-screen h-[calc(100vh-7rem)] overflow-auto pt-2">
                <div className="w-full min-h-[calc(100vh-7rem)] px-1 sm:px-2 lg:px-3 columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-2">
                    {   
                        filtered_media.map(piece => {
                            return <Media_element name={piece.name} key={piece.name} src={piece.path} category={category}/>
                        })
                        
                    }
                </div>
            </main>
            <Modal func={change_modal} display={current_display} media={media_name} category={category}/>
        </Screen>
    )
}
export default Gallery
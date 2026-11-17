import { Link, Outlet, useLocation, useNavigate, useParams } from "react-router-dom"
import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/screen"
import Sidebar from "../../components/sidebar"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { v4 } from "uuid"
import AdminFab from "../../components/admin-fab"



const TITLES = { pixelarts: "pixel arts", edits: "edits", dances: "dance", photos: "photos" }

// One piece: the picture at its own shape (a masonry wall), the name and description always readable on a dark fade at the bottom.
function Media_element({ name, description, src, category, type }) {
    const navigate = useNavigate()
    return (
        <a className="group relative block mb-3 break-inside-avoid overflow-hidden border border-cyan-900 bg-gray-950 hover:border-cyan-400 transition-colors cursor-pointer" onClick={() => navigate(`/gallery/${category}/${name}`)}>
            {
                type === "image"
                    ? <img src={src} alt={name} loading="lazy" className="block w-full" />
                    : <video src={src} muted preload="metadata" className="block w-full"></video>
            }
            {type !== "image" && <span className="absolute top-2 left-2 h-7 px-2 flex items-center bg-black/70 border border-cyan-700 text-cyan-300 text-xs pixel-font">▶ video</span>}
            <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2 pt-10 bg-gradient-to-t from-black/95 via-black/65 to-transparent">
                <h2 className="text-sm font-bold text-cyan-200 truncate">{name.split('.')[0]}</h2>
                {description && <p className="text-xs text-cyan-100/70 truncate">{description}</p>}
            </div>
        </a>
    )
}



function Gallery() {
    const location = useLocation()
    const { category } = useParams()
    const [user, set_user] = useState(null)
    const [new_image, set_new_image] = useState(null)
    
    const [medias, set_medias] = useState([])

    const [show_form, set_show_form] = useState(false)
    
    useEffect(() => {
        async function get_category_medias() {
            const { data, error } = await supabase
            .from("gallery")
            .select("*")
            .eq("category", category)
            .order("created_at", {ascending: false})
            
            if (error) {
                console.error(error);
                return
            }

            set_medias(data)
            console.log(data);
            
        }
        get_category_medias()
        
    }, [location.state])
    
    // simple listener to user change
    useEffect(() => {
        async function get_user() {
            const { data } = await supabase.auth.getUser()
            set_user(data.user)
        }
        get_user()
        
        const { data: listener } = supabase.auth.onAuthStateChange(
            (event, session) => {set_user(session?.user ?? null)}
        )
        return () => {listener.subscription.unsubscribe()}
    }, [])
    

    async function handle_submit(e) {
        
        e.preventDefault()
        close_form()
        
        const img_id = v4()
        const name = document.getElementById('name_input').value
        const description = document.getElementById('description_input').value
        const file_type = document.getElementById('file_type_input').value
        
        
        const file = document.getElementById('file_input').files[0]
        const ext = file.name.split('.').pop()
        const file_path = `${category}/${img_id}.${ext}`

        const { error: upload_img_error } = await supabase.storage
        .from("gallery")
        .upload(file_path, file, {upsert: true})

        if (upload_img_error) {
            console.error(upload_img_error);
            return
        }

        const {data: data_public_url} = supabase.storage
        .from("gallery")
        .getPublicUrl(file_path)
        const img_public_url = data_public_url.publicUrl

        const {data, error} = await supabase
        .from("gallery")
        .insert([{
            id: img_id,
            name: name,
            description: description,
            category: category,
            file_type: file_type,
            url: img_public_url
        }])
        if (error) {
            console.error(error);
            return
        }
        
        close_form()
        window.location.reload()
    }


    function change_img(e) {
        const file = e.target.files[0]
        if(file) {
            const temporary_url = URL.createObjectURL(file)
            set_new_image(temporary_url)
        }
    }

    function close_form() {
        set_new_image(null)
        set_show_form(false)
    }
  
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="relative w-screen h-[calc(100vh-6.5rem)] overflow-auto pt-2">
                <div className="w-full max-w-7xl mx-auto px-3 pt-4 pb-24">
                    <div className="relative flex items-center justify-center mb-4 border-b border-cyan-900 pb-3 min-h-10">
                        <Link to="/gallery" className="absolute left-0 flex items-center gap-2 h-9 px-3 border-2 border-cyan-900 text-cyan-500 hover:border-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/40 transition-colors" aria-label="back to the gallery">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" shapeRendering="crispEdges"><path d="M9 2L4 7l5 5" /></svg>
                            <span className="pixel-font text-sm hidden sm:inline">gallery</span>
                        </Link>
                        <h1 className="pixel-font text-2xl text-cyan-300 text-center">{TITLES[category] || category}</h1>
                        <span className="absolute right-0 text-xs text-cyan-700">{medias.length} {medias.length === 1 ? "piece" : "pieces"}</span>
                    </div>
                    {medias.length === 0 && <p className="text-cyan-700 text-sm">nothing here yet.</p>}
                    <div className="columns-2 md:columns-3 xl:columns-4 gap-3">
                    {
                        medias.map(piece => {
                            return <Media_element name={piece.name} description={piece.description} key={piece.id} src={piece.url} category={category} type={piece.file_type}/>
                        })
                    }
                    </div>
                    {user?.app_metadata?.is_admin ? <AdminFab onClick={() => set_show_form(true)} label="add media" /> : null}

                    {
                        show_form? 
                        <div className="fixed z-[70] left-0 top-26 w-screen h-[calc(100vh-6.5rem)] flex justify-center items-center">
                            
                            <div className="absolute z-10 w-full h-full opacity-25" onClick={close_form}></div>
                            
                            <form onSubmit={handle_submit} className="relative flex flex-col gap-2 p-4 w-72 rounded-sm border-2 border-cyan-600 bg-gray-900 z-20">
                                <a onClick={close_form} className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center bg-red-900 hover:bg-red-700 cursor-pointer">✕</a>
                                <input type="text" id="name_input" placeholder="name:" className="p-0.5 pl-2 bg-gray-950 border rounded-sm border-cyan-600"/>
                                <input type="text" id="description_input" placeholder="description:" className="p-0.5 pl-2 bg-gray-950 border rounded-sm border-cyan-600"/>

                                <select id="file_type_input" className="p-0.5 pl-1 bg-gray-950 border rounded-sm border-cyan-600">
                                    <option value="image">image</option>
                                    <option value="video">video</option>
                                </select>
                                
                                <div className="relative flex justify-center w-full">
                                    <img id="media_display" src={new_image} className="h-32 rounded-sm"/>
                                    <input type="file" id="file_input" className={`absolute w-full h-32 bg-gray-950 border rounded-sm border-cyan-600 ${new_image? "opacity-0": "opacity-100"}`} onChange={change_img}/>
                                </div>
                                <button type="submit" className="h-9 border-2 border-cyan-500 bg-cyan-950 text-cyan-200 hover:bg-cyan-900 cursor-pointer">send media</button>
                            </form>
                        </div>
                        : null
                    }
                </div>
            </main>
            <Outlet/>
        </Screen>
    )
}
export default Gallery
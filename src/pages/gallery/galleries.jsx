import { Link, Navigate, Outlet, useLocation, useNavigate, useParams } from "react-router-dom"
import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/screen"
import Sidebar from "../../components/sidebar"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"



function Media_element({ name, src, category, type }) {
    const navigate = useNavigate()
    return (
        <a className="relative flex items-start mb-1" onClick={() => navigate(`/gallery/${category}/${name}`)}>
            {
                type === "image"? <img src={src} className="rounded-sm max-h-32"/> : <video src={src} className="rounded-sm max-h-32"></video>
            }
            <div className="absolute flex items-center justify-center top-0 right-0 p-0.5">
                <h2 className="text-sm text-cyan-500 opacity-45"> {name.split('.')[0]} </h2>
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
        set_show_form(false)
        
        const img_id = crypto.randomUUID()
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
        document.getElementById("media_display").src = ""
        document.getElementById("file_input").value = null
        set_new_image(null)
        set_show_form(false)
    }
  
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="relative w-screen h-[calc(100vh-7rem)] overflow-auto pt-2">
                <div className="w-full min-h-[calc(100vh-7rem)] px-1 sm:px-2 lg:px-3 columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-2">
                    {   
                        medias.map(piece => {
                            return <Media_element name={piece.name} key={piece.id} src={piece.url} category={category} type={piece.file_type}/>
                        })
                    }
                    {user?.app_metadata?.is_admin? <a onClick={() => set_show_form(true)} className="fixed flex justify-center items-center select-none rounded-md font-bold h-12 w-12 right-8 bottom-4 text-3xl pb-1.5 text-cyan-600 bg-gray-900 border border-transparent hover:border-[rgb(83,91,243)] transition-all duration-300">+</a> : null}

                    {
                        show_form? 
                        <div className="fixed left-0 top-28 w-screen h-[calc(100vh-7rem)] flex justify-center items-center">
                            
                            <div className="absolute z-10 w-full h-full opacity-25" onClick={close_form}></div>
                            
                            <form onSubmit={handle_submit} className="relative flex flex-col gap-2 p-4 w-72 rounded-sm border-2 border-cyan-600 bg-gray-900 z-20">
                                <a onClick={close_form} className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center bg-red-900 rounded-bl-sm">X</a>
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
                                <button type="submit" className="bg-amber-300"><span>send media!</span></button>
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
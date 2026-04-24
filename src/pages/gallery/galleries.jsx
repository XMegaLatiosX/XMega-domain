import { Link, Navigate, Outlet, useNavigate, useParams } from "react-router-dom"
import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/screen"
import Sidebar from "../../components/sidebar"
import medias from "../../data/medias.json"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"



function Media_element({ name, src, category }) {
    const navigate = useNavigate()
    const components = {
        "mp4": <video src={src} className="rounded-sm"></video>
    }
    return (
        <a className="relative flex items-start mb-1" onClick={() => navigate(`/gallery/${category}/${name}`)}>
            {
                components[name.split('.')[1]] || <img src={src} className="rounded-sm" />
            }
            <div className="absolute flex items-center justify-center top-0 right-0 p-0.5">
                <h2 className="text-sm text-cyan-500 opacity-45"> {name.split('.')[0]} </h2>
            </div>
        </a>
    )
}



function Gallery() {
    const { category } = useParams()
    const [user, set_user] = useState(null)
    const [new_image, set_new_image] = useState(null)

    const [show_form, set_show_form] = useState(false)
    const img_id = crypto.randomUUID()

        
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
        console.log('submited: ', data)
        set_show_form(false)

    }


    function change_img(e) {
        const file = e.target.files[0]
        if(file) {
            const temporary_url = URL.createObjectURL(file)
            set_new_image(temporary_url)
        }
    }


    const filtered_media = medias.filter(item => item.category === category)
  
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
                    {user?.app_metadata?.is_admin? <a onClick={() => set_show_form(true)} className="fixed flex justify-center items-center select-none rounded-md font-bold h-12 w-12 right-8 bottom-4 text-3xl pb-1.5 text-cyan-600 bg-gray-900 border border-transparent hover:border-[rgb(83,91,243)] transition-all duration-300">+</a> : null}

                    {
                        show_form? 
                        <div className="fixed left-0 top-28 w-screen h-[calc(100vh-7rem)] flex justify-center items-center">
                            
                            <div className="absolute z-10 w-full h-full opacity-25" onClick={() => set_show_form(false)}></div>
                            
                            <form onSubmit={handle_submit} className="relative flex flex-col gap-2 p-4 w-72 rounded-sm border-2 border-cyan-600 bg-gray-900 z-20">
                                <a onClick={() => {set_show_form(false)}} className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center bg-red-900 rounded-bl-sm">X</a>
                                <input type="text" id="name_input" placeholder="name:" className="p-0.5 pl-2 bg-gray-950 border rounded-sm border-cyan-600"/>
                                <input type="text" id="description_input" placeholder="description:" className="p-0.5 pl-2 bg-gray-950 border rounded-sm border-cyan-600"/>

                                <select id="file_type_input" className="p-0.5 pl-1 bg-gray-950 border rounded-sm border-cyan-600">
                                    <option value="image">image</option>
                                    <option value="video">video</option>
                                </select>
                                
                                <div className="relative flex justify-center w-full">
                                    <img src={new_image} className="h-32 rounded-sm"/>
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
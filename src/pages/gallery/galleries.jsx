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
                    {user?.app_metadata?.is_admin? <a onClick={() => {return <div></div>}} className="fixed flex justify-center items-center select-none rounded-md font-bold h-12 w-12 right-8 bottom-4 text-3xl pb-1.5 text-cyan-600 bg-gray-900 border border-transparent hover:border-[rgb(83,91,243)] transition-all duration-300">+</a> : null}
                </div>
            </main>
            <Outlet/>
        </Screen>
    )
}
export default Gallery
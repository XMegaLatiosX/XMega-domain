import { useNavigate, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"


function Modal() {
    const { category, media_name } = useParams()
    
    const [piece, set_piece] = useState(null)
    const [neighbors, set_neighbors] = useState([])
    
    const [user, set_user] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        async function get_media() {
            const {data, error} = await supabase
            .from("gallery")
            .select("*")
            .eq("name", media_name)
            .maybeSingle()

            if (error) {
                console.error(error);
                return
            }
            set_piece(data)
            console.log("post: ", data);
        }
        get_media()
        async function get_neighbors() {
            const {data: all_medias, error} = await supabase
            .from("gallery")
            .select("*")
            .eq("category", category)
            .order('created_at', {ascending: false})

            if (error) {
                console.error(error);
                return
            }

            const current_index = all_medias.findIndex(media => media.name === media_name )
            const prev = all_medias[current_index - 1]?.name || all_medias[all_medias.length -1].name
            const next = all_medias[current_index + 1]?.name || all_medias[0].name
            console.log("AAA", all_medias);
            
            set_neighbors([prev, next])
        }
        get_neighbors()
    }, [media_name])
    
    useEffect(() => {
        async function get_user() {
            const {data} = await supabase.auth.getUser()
            set_user(data.user)
        }
        get_user()

        const {data: listener} = supabase.auth.onAuthStateChange(
            (event, session) => {set_user(session?.user ?? null)}
        )
        return () => {listener.subscription.unsubscribe()}
    }, [])

    async function delete_media() {
        const {error} = await supabase
        .from("gallery")
        .delete()
        .eq("name", piece.name)
        
        if (error) {
            console.error(error);
            return
        }
        console.log("table deleted");
        
        const {error: bucket_error} = supabase.storage
        .from("gallery")
        .remove([`${category}/${piece.url.split('/').pop()}`])
        
        if (bucket_error) {
            console.error(bucket_error);
            return
        }
        console.log("file deleted");
        navigate(`/gallery/${category}`, {state: {updated: true}})
    }

    return (
        <div className="fixed top-16 w-screen h-[calc(100vh-4rem)] overflow-auto flex justify-around items-center mb-8" id="modal_bg">
            <div className="fixed top-0 w-full h-screen backdrop-blur-xs bg-[#03071281]" onClick={() => navigate(`/gallery/${category}`)}></div>

            <div  className="fixed z-50 flex flex-col items-center justify-center" id="modal_div">
                <div className="relative flex flex-row items-center justify-center max-w-5xl pointer-events-auto">
                    <a onClick={() => navigate(`/gallery/${category}`)} className="fixed z-30 rounded-full bg-[rgba(0,0,0,.5)] w-12 h-12 right-2 sm:right-2/12 top-40 flex justify-center items-center select-none"><span className="text-cyan-500 text-4xl">×</span></a>
                    <a onClick={() => navigate(`/gallery/${category}/${neighbors[0]}`)} className="fixed z-30 rounded-full bg-[#000000f0] opacity-35 w-12 h-12 left-2 sm:left-2/12 flex justify-center  pl-2 items-center"><i className="arrow select-none w-6 h-6 rotate-135"></i></a>
                    {piece?.file_type == "image"? 
                        <img id="modal_img" className="max-h-[60vh]" src={piece?.url}/>
                    : 
                        <video id="modal_video" className="max-h-[60vh]" src={piece?.url} autoPlay loop onClick={() => {
                            document.getElementById('modal_video').paused ? document.getElementById('modal_video').play() : document.getElementById('modal_video').pause()
                        }}
                        >
                        {/* <button onClick={() => { VOL, TIME AND ETC 
                        }}></button> */}
                        </video>
                    }
                    {user?.app_metadata?.is_admin? <a className="absolute bottom-0 left-0 bg-red-700" onClick={delete_media}>DELETE</a> : null}
                    <a onClick={() => navigate(`/gallery/${category}/${neighbors[1]}`)} className="fixed z-30 rounded-full bg-[#000000f0] opacity-35 w-12 h-12 right-2 sm:right-2/12 flex justify-center  pr-2 items-center"><i className="arrow select-none w-6 h-6 -rotate-45"></i></a>
                </div> 
                {/* onClick={() => change_modal(1)} */}
                <h2>{media_name}</h2>
            </div>

        </div>
    )
}
export default Modal
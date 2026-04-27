import { useNavigate, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"


function Modal() {
    const { category, media_name } = useParams()
    const navigate = useNavigate()
    const [piece, set_piece] = useState(null)
    const [user, set_user] = useState(null)

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
    }, [])
    
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
            <div className="fixed top-0 w-full h-screen" onClick={() => navigate(`/gallery/${category}`)}></div>
            <div  className="fixed z-50 flex flex-col items-center justify-center max-w-[90%]" id="modal_div">
                <div className="relative flex items-center justify-center grow">

                    <a onClick={() => navigate(`/gallery/${category}`)} className="fixed z-30 rounded-full bg-[rgba(0,0,0,.5)] w-12 h-12 right-2 sm:right-2/12 top-40 flex justify-center items-center select-none"><span className="text-cyan-500 text-4xl">×</span></a>
                    <a  className="fixed z-30 rounded-full bg-[rgba(0,0,0,.5)] w-12 h-12 left-2 sm:left-2/12 flex justify-center  pl-2 items-center"><i className="arrow select-none w-6 h-6 rotate-135"></i></a>
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
                    {user?.app_metadata?.is_admin? <a className="bg-red-500" onClick={delete_media}>DELETE</a> : null}
                    <a  className="fixed z-30 rounded-full bg-[rgba(0,0,0,.5)] w-12 h-12 right-2 sm:right-2/12 flex justify-center  pr-2 items-center"><i className="arrow select-none w-6 h-6 -rotate-45"></i></a>
                </div> 
                {/* onClick={() => change_modal(1)} */}
                <h2>{media_name}</h2>
            </div>

        </div>
    )
}
export default Modal
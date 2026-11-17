import { useNavigate, useParams } from "react-router-dom"
import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "../lib/supabase"
import AdminFab from "./admin-fab"
import logo from "../assets/images/starof_circle.gif"

// One piece, big. Layout: the picture (or video) in a bordered frame, the name and description under it, the buttons on the frame:
// close at the top right, previous / next on the sides (also the arrow keys; Esc closes). The admin gets a red delete button
// (the first press asks "sure?", the second deletes), in the same style as the other admin buttons.
const BUTTON = "h-11 w-11 flex items-center justify-center border-2 border-cyan-600 bg-gray-950/90 text-cyan-200 text-2xl leading-none hover:bg-cyan-950 hover:border-cyan-300 cursor-pointer select-none transition-colors"

// While the picture or video loads, the logo flies in from the right, spinning and slowing down until it sits in the middle; when the media
// is ready the logo leaves quickly while the media fades in. (Performance "low" skips the logo and just fades the media in.)
function LoadingLogo({ done }) {
    const box = useRef(null)
    const spin = useRef(null)
    useEffect(() => {
        const el = box.current
        if (!el) return
        const arrive = el.animate(
            [{ transform: "translateX(55vw) rotate(540deg) scale(0.6)", opacity: 0 }, { opacity: 1, offset: 0.15 }, { transform: "translateX(0) rotate(0deg) scale(1)", opacity: 1 }],
            { duration: 900, easing: "cubic-bezier(0.1, 0.85, 0.2, 1)", fill: "forwards" },
        )
        let idle
        arrive.onfinish = () => { idle = el.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], { duration: 700, iterations: Infinity, easing: "ease-in-out" }); spin.current = idle }
        return () => { arrive.cancel(); idle?.cancel() }
    }, [])
    useEffect(() => {
        if (!done || !box.current) return
        spin.current?.cancel()
        const leave = box.current.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.6) rotate(-90deg)" }], { duration: 240, easing: "cubic-bezier(0.5, 0, 0.9, 0.4)", fill: "forwards" })
        return () => leave.cancel()
    }, [done])
    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <img ref={box} src={logo} alt="" className="w-24 h-24 select-none" style={{ imageRendering: "pixelated", opacity: 0 }} />
        </div>
    )
}

function Modal() {
    const { category, media_name } = useParams()

    const [piece, set_piece] = useState(null)
    const [neighbors, set_neighbors] = useState([])
    const [user, set_user] = useState(null)
    const [sure_for, set_sure_for] = useState("") // the piece the delete button was pressed on once
    const sure = sure_for === media_name
    const video = useRef(null)
    const [loaded_url, set_loaded_url] = useState("") // the media whose file has finished loading
    const loaded = !!piece?.url && loaded_url === piece.url
    const [crisp_url, set_crisp_url] = useState("") // a small picture (pixel art): scaled up with hard pixels instead of blurred
    const crisp = !!piece?.url && crisp_url === piece.url
    const remember_size = (el) => { if (el.naturalWidth && el.naturalWidth < 700) set_crisp_url(el.src) }
    const fancy = !document.documentElement.classList.contains("perf-low")
    const navigate = useNavigate()

    useEffect(() => {
        async function get_media() {
            const { data, error } = await supabase
                .from("gallery")
                .select("*")
                .eq("category", category)
                .eq("name", media_name)
                .maybeSingle()
            if (error) { console.error(error); return }
            set_piece(data)
        }
        get_media()
        async function get_neighbors() {
            const { data: all_medias, error } = await supabase
                .from("gallery")
                .select("name")
                .eq("category", category)
                .order("created_at", { ascending: false })
            if (error || !all_medias?.length) { if (error) console.error(error); return }
            const current_index = all_medias.findIndex((media) => media.name === media_name)
            const prev = all_medias[current_index - 1]?.name || all_medias[all_medias.length - 1].name
            const next = all_medias[current_index + 1]?.name || all_medias[0].name
            set_neighbors([prev, next])
        }
        get_neighbors()
    }, [media_name, category])

    useEffect(() => {
        async function get_user() {
            const { data } = await supabase.auth.getUser()
            set_user(data.user)
        }
        get_user()
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => { set_user(session?.user ?? null) })
        return () => { listener.subscription.unsubscribe() }
    }, [])

    const close = useCallback(() => navigate(`/gallery/${category}`), [navigate, category])
    const go = useCallback((name) => { if (name) navigate(`/gallery/${category}/${name}`) }, [navigate, category])

    useEffect(() => {
        const on_key = (event) => {
            if (event.target instanceof Element && event.target.closest("input, textarea, select")) return
            if (event.key === "Escape") close()
            else if (event.key === "ArrowLeft") go(neighbors[0])
            else if (event.key === "ArrowRight") go(neighbors[1])
        }
        window.addEventListener("keydown", on_key)
        return () => window.removeEventListener("keydown", on_key)
    }, [close, go, neighbors])

    async function delete_media() {
        if (!sure) { set_sure_for(media_name); return }
        const { error } = await supabase.from("gallery").delete().eq("name", piece.name).eq("category", category)
        if (error) { console.error(error); return }
        const { error: bucket_error } = await supabase.storage.from("gallery").remove([`${category}/${piece.url.split("/").pop()}`])
        if (bucket_error) console.error(bucket_error)
        navigate(`/gallery/${category}`, { state: { updated: true } })
    }

    return (
        <div className="fixed top-16 left-0 w-screen h-[calc(100vh-4rem)] z-50 flex items-center justify-center p-3" id="modal_bg">
            <div className="absolute inset-0 backdrop-blur-sm bg-[#030712d9]" onClick={close}></div>

            <div className="relative flex flex-col items-stretch" id="modal_div">
                {/* the frame always has the same size, whatever the picture: small ones are scaled up to fill it, big ones shrink to fit,
                    so the close / previous / next buttons never move */}
                <div className="relative border-2 border-cyan-700 bg-black shadow-[0_0_24px_rgba(34,211,238,0.2)] w-[min(94vw,68rem)] h-[min(72vh,44rem)]">
                    {fancy && piece && <LoadingLogo key={piece.url} done={loaded} />}
                    {piece?.file_type === "image"
                        ? <img key={piece.url} id="modal_img" className={`block w-full h-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`} style={crisp ? { imageRendering: "pixelated" } : undefined} src={piece?.url} alt={piece?.name} ref={(el) => { if (el?.complete && el.naturalWidth && !loaded) { remember_size(el); set_loaded_url(piece.url) } }} onLoad={(event) => { remember_size(event.currentTarget); set_loaded_url(piece.url) }} onError={() => set_loaded_url(piece.url)} />
                        : <video key={piece?.url} id="modal_video" ref={video} onLoadedData={() => set_loaded_url(piece.url)} onError={() => set_loaded_url(piece?.url)} className={`block w-full h-full object-contain cursor-pointer transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`} src={piece?.url} autoPlay loop controls onClick={(event) => { event.preventDefault(); video.current?.paused ? video.current.play() : video.current?.pause() }} />}
                    <button type="button" onClick={close} aria-label="close" title="close (Esc)" className={`${BUTTON} absolute top-2 right-2`}>✕</button>
                    <button type="button" onClick={() => go(neighbors[0])} aria-label="previous" title="previous (←)" className={`${BUTTON} absolute left-2 top-1/2 -translate-y-1/2`}>‹</button>
                    <button type="button" onClick={() => go(neighbors[1])} aria-label="next" title="next (→)" className={`${BUTTON} absolute right-2 top-1/2 -translate-y-1/2`}>›</button>
                </div>
                <div className="px-1 pt-2 text-left">
                    <h2 className="pixel-font text-xl text-cyan-300">{(piece?.name || media_name).split(".")[0]}</h2>
                    {piece?.description && <p className="text-sm text-cyan-100/80">{piece.description}</p>}
                </div>
            </div>

            {user?.app_metadata?.is_admin ? <AdminFab onClick={delete_media} icon="✕" label={sure ? "sure? press again" : "delete"} danger /> : null}
        </div>
    )
}
export default Modal

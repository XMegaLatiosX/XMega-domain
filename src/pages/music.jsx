import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { useMusic } from "../music/useMusic"
import PlayerBars from "../music/PlayerBars"

import Header from "../components/header"
import NavUpperBar from "../components/navupperbar"
import Screen from "../components/screen"
import Sidebar from "../components/sidebar"

// My music: a list of tracks (title + play). Playing one sends it to the same player the home page uses, so the whole site
// follows its beat. Only the admin (app_metadata.is_admin, as on the blog and projects) sees the form to add tracks.
// The table comes from supabase/music.sql.
const BUCKET = "music"
const FILE_MAX = 50 * 1024 * 1024 // the free Supabase plan does not take files above 50 MB
const THUMB_MAX = 5 * 1024 * 1024

export default function Music() {
    const { play_input, toggle, playing, loading } = useMusic()
    const [tracks, set_tracks] = useState([])
    const [ready, set_ready] = useState(false)
    const [user, set_user] = useState(null)
    const [active, set_active] = useState(null)
    const [form, set_form] = useState({ title: "", url: "", bpm: "", note: "", thumbnail: "" })
    const [error, set_error] = useState("")
    const [confirm_id, set_confirm_id] = useState(null)
    const [uploading, set_uploading] = useState(false)
    const [file_name, set_file_name] = useState("")
    const [thumb_name, set_thumb_name] = useState("")

    const fetch_tracks = () => supabase.from("tracks").select("*").order("created_at", { ascending: false })
    function show({ data, error: failure }) {
        if (failure) { set_error("could not load the tracks"); console.error(failure) } else set_tracks(data)
        set_ready(true)
    }
    const load = () => fetch_tracks().then(show)

    useEffect(() => {
        fetch_tracks().then(show)
        supabase.auth.getUser().then(({ data }) => set_user(data.user))
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => set_user(session?.user ?? null))
        return () => listener.subscription.unsubscribe()
    }, [])

    const admin = !!user?.app_metadata?.is_admin

    function play(track) {
        if (active === track.id) { toggle(); return }
        set_active(track.id)
        play_input(track.url, track.title)
    }

    async function add(event) {
        event.preventDefault()
        set_error("")
        const row = { title: form.title.trim(), url: form.url.trim(), bpm: form.bpm ? Number(form.bpm) : null, note: form.note.trim() || null }
        if (form.thumbnail.trim()) row.thumbnail = form.thumbnail.trim() // (needs supabase/music-thumbnail.sql, run once)
        if (!row.title || !/^https?:\/\//i.test(row.url)) { set_error("a title and a link starting with http are needed"); return }
        const { error: failure } = await supabase.from("tracks").insert(row)
        if (failure) { set_error(row.thumbnail ? "could not add it (did you run supabase/music-thumbnail.sql, and are you logged in as admin?)" : "could not add it (are you logged in as admin?)"); return }
        set_form({ title: "", url: "", bpm: "", note: "", thumbnail: "" })
        set_file_name("")
        set_thumb_name("")
        load()
    }

    // A file from this computer: it goes to the "music" bucket (supabase/music-files.sql) and its public link fills the link field.
    async function upload(event) {
        const file = event.target.files?.[0]
        event.target.value = ""
        if (!file) return
        set_error("")
        if (file.size > FILE_MAX) { set_error(`file too big (the limit is ${FILE_MAX / 1048576} MB)`); return }
        set_uploading(true)
        const ext = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] || "mp3").toLowerCase()
        const path = `${crypto.randomUUID()}.${ext}`
        const { error: failure } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, cacheControl: "31536000" })
        set_uploading(false)
        if (failure) { set_error("could not upload it (did you run supabase/music-files.sql, and are you logged in as admin?)"); console.error(failure); return }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
        set_file_name(file.name)
        set_form((current) => ({ ...current, url: data.publicUrl, title: current.title || file.name.replace(/\.[a-z0-9]+$/i, "") }))
    }

    // A picture for the track: it goes to the same bucket, in the "thumbs" folder, and its public link fills the thumbnail field.
    async function upload_thumb(event) {
        const file = event.target.files?.[0]
        event.target.value = ""
        if (!file) return
        set_error("")
        if (!file.type.startsWith("image/")) { set_error("the thumbnail must be an image"); return }
        if (file.size > THUMB_MAX) { set_error(`image too big (the limit is ${THUMB_MAX / 1048576} MB)`); return }
        set_uploading(true)
        const ext = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] || "png").toLowerCase()
        const path = `thumbs/${crypto.randomUUID()}.${ext}`
        const { error: failure } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: "31536000" })
        set_uploading(false)
        if (failure) { set_error("could not upload the image (did you run supabase/music-files.sql, and are you logged in as admin?)"); console.error(failure); return }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
        set_thumb_name(file.name)
        set_form((current) => ({ ...current, thumbnail: data.publicUrl }))
    }

    async function remove(id) {
        if (confirm_id !== id) { set_confirm_id(id); return } // first press asks, second deletes
        const gone = tracks.find((track) => track.id === id)
        const stored = [gone?.url, gone?.thumbnail].map((link) => link?.split(`/object/public/${BUCKET}/`)[1]).filter(Boolean) // uploaded files (song, picture) leave the storage too
        if (stored.length) await supabase.storage.from(BUCKET).remove(stored.map(decodeURIComponent))
        const { error: failure } = await supabase.from("tracks").delete().eq("id", id)
        set_confirm_id(null)
        if (failure) set_error("could not delete it")
        else load()
    }

    const input = "h-9 px-2 bg-gray-950 border border-cyan-800 text-cyan-100 outline-none focus:border-cyan-500 min-w-0"

    return (
        <Screen>
            <Header />
            <NavUpperBar />
            <Sidebar />
            <main className="relative w-screen h-[calc(100vh-6.5rem)] overflow-auto pt-2 px-2">
                <div className="w-full flex justify-center py-6">
                    <div className="flex flex-col grow min-w-0 max-w-200 gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-cyan-300">music</h1>
                            <p className="text-cyan-600 text-sm">press play and the whole site moves to the beat.</p>
                        </div>
                        {ready && tracks.length === 0 && !error && <span className="text-cyan-600">nothing here yet.</span>}
                        {tracks.map((track) => {
                            const is_active = active === track.id
                            return (
                                <div key={track.id} className={`relative isolate overflow-hidden flex items-center gap-3 p-2 ${is_active ? "min-h-16" : ""} border ${is_active ? "border-cyan-400 bg-cyan-950/60" : "border-cyan-900 bg-gray-950"}`}>
                                    {is_active && <PlayerBars playing={playing} count={96} />}
                                    <button type="button" onClick={() => play(track)} disabled={loading && is_active} aria-label={is_active && playing ? `pause ${track.title}` : `play ${track.title}`}
                                        className="h-10 w-10 shrink-0 flex items-center justify-center border-2 border-cyan-500 bg-cyan-950/80 text-cyan-200 hover:bg-cyan-900 cursor-pointer">
                                        {is_active && playing ? "❚❚" : "▶"}
                                    </button>
                                    {track.thumbnail && <img src={track.thumbnail} alt="" loading="lazy" className="h-10 w-10 shrink-0 object-cover border border-cyan-800" />}
                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold text-cyan-100 truncate [text-shadow:0_0_4px_#000,0_0_8px_#000]">{track.title}</div>
                                        <div className="text-xs text-cyan-600 truncate [text-shadow:0_0_4px_#000]">{[track.bpm ? `${track.bpm} BPM` : "", track.note].filter(Boolean).join(" · ")}</div>
                                    </div>
                                    {admin && (
                                        <button type="button" onClick={() => remove(track.id)} onBlur={() => set_confirm_id(null)} className="h-8 px-2 text-xs border border-red-900 text-red-400 hover:bg-red-950 cursor-pointer">
                                            {confirm_id === track.id ? "sure?" : "delete"}
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                        {error && <span className="text-amber-300 text-sm">{error}</span>}
                        {admin && (
                            <form onSubmit={add} className="mt-4 p-2 border border-cyan-900 flex flex-col gap-2">
                                <span className="text-cyan-400 text-sm">add a track (admin)</span>
                                <input className={input} placeholder="title" value={form.title} maxLength={120} onChange={(e) => set_form({ ...form, title: e.target.value })} />
                                <input className={input} placeholder="link (soundcloud, youtube) or upload a file below" value={form.url} maxLength={500} onChange={(e) => set_form({ ...form, url: e.target.value })} />
                                <label className="h-9 px-2 flex items-center gap-2 border border-dashed border-cyan-800 text-cyan-300 hover:bg-cyan-950 cursor-pointer text-sm">
                                    <input type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.opus" onChange={upload} disabled={uploading} className="hidden" />
                                    {uploading ? "uploading..." : file_name ? `uploaded: ${file_name}` : "upload an audio file (mp3, wav, ogg, m4a, flac; up to 50 MB)"}
                                </label>
                                <div className="flex gap-2">
                                    <input className={`${input} flex-1`} placeholder="thumbnail link (optional) or upload an image" value={form.thumbnail} maxLength={500} onChange={(e) => set_form({ ...form, thumbnail: e.target.value })} />
                                    <label className="h-9 px-3 flex items-center shrink-0 border border-dashed border-cyan-800 text-cyan-300 hover:bg-cyan-950 cursor-pointer text-sm">
                                        <input type="file" accept="image/*" onChange={upload_thumb} disabled={uploading} className="hidden" />
                                        {thumb_name ? "image ✓" : "image"}
                                    </label>
                                </div>
                                <div className="flex gap-2">
                                    <input className={`${input} w-24`} placeholder="BPM" inputMode="numeric" value={form.bpm} onChange={(e) => set_form({ ...form, bpm: e.target.value.replace(/\D/g, "").slice(0, 3) })} />
                                    <input className={`${input} flex-1`} placeholder="note (optional)" value={form.note} maxLength={200} onChange={(e) => set_form({ ...form, note: e.target.value })} />
                                </div>
                                <button type="submit" className="h-9 border-2 border-cyan-500 bg-cyan-950 text-cyan-200 hover:bg-cyan-900 cursor-pointer">add</button>
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </Screen>
    )
}

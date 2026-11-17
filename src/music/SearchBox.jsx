import { useState } from "react"
import { useMusic } from "./useMusic"
import { supabase } from "../lib/supabase"

// Play with nothing written: one of the songs saved on /music, at random, none twice until all have played (then it starts over).
const heard = new Set()
async function random_saved() {
    const { data, error } = await supabase.from("tracks").select("id, url, title")
    if (error || !data || !data.length) return null
    let pool = data.filter((track) => !heard.has(track.id))
    if (!pool.length) { heard.clear(); pool = data }
    const pick = pool[Math.floor(Math.random() * pool.length)]
    heard.add(pick.id)
    return pick
}

// One input for everything: a YouTube/SoundCloud/Spotify link or a song name.
export default function SearchBox({ big = false, compact = false }) {
    const { play_input, loading, message, set_dock_open, started, playing, toggle } = useMusic()
    const [value, set_value] = useState("")

    const [picking, set_picking] = useState(false)

    async function submit(e) {
        e.preventDefault()
        if (loading || picking) return
        if (value.trim()) { play_input(value.trim()); return }
        if (started) { toggle(); return } // nothing typed: the button pauses what plays, or plays what was paused
        set_picking(true) // nothing typed and nothing playing yet: a saved song at random
        try {
            const pick = await random_saved()
            if (pick) play_input(pick.url, pick.title)
        } finally { set_picking(false) }
    }

    return (
        <form onSubmit={submit} className="w-full" data-music-ui>
            <div className={`flex items-stretch border-2 border-cyan-600 bg-gray-950/95 rounded-full overflow-hidden shadow-[0_0_14px_rgba(0,255,255,0.25)] ${big ? "h-14" : "h-10"}`}>
                <input
                    value={value}
                    onChange={(e) => set_value(e.target.value)}
                    onFocus={(e) => { set_dock_open(true); e.currentTarget.select() }} // a new song: what is written is selected, so pasting replaces it
                    onMouseUp={(e) => e.preventDefault()} // (keeps the click from undoing the selection)
                    placeholder={compact ? "" : "paste a link or type a song name"}
                    aria-label="song link or name"
                    className={`min-w-0 flex-1 bg-transparent ${compact ? "px-3" : "px-5"} text-cyan-100 placeholder:text-cyan-900 outline-none ${big ? "text-lg" : "text-sm"}`}
                />
                <button
                    type="submit"
                    disabled={loading || picking}
                    aria-label={started && !value.trim() && playing ? "pause" : "play"}
                    className="px-5 text-cyan-400 font-bold border-l-2 border-cyan-600 hover:bg-cyan-950 disabled:opacity-50 cursor-pointer"
                >
                    {loading || picking ? "..." : started && !value.trim() && playing ? "❚❚" : "▶"}
                </button>
            </div>
            {message && <p className="mt-1 text-xs text-rose-300" role="status">{message}</p>}
        </form>
    )
}

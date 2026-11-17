import { useState } from "react"
import { useMusic } from "./useMusic"

// One input for everything: a YouTube/SoundCloud/Spotify link or a song name.
export default function SearchBox({ big = false, compact = false }) {
    const { play_input, loading, message, set_dock_open, started, playing, toggle } = useMusic()
    const [value, set_value] = useState("")

    function submit(e) {
        e.preventDefault()
        if (loading) return
        if (value.trim()) { play_input(value.trim()); return }
        if (started) toggle() // nothing typed: the button pauses what plays, or plays what was paused
    }

    return (
        <form onSubmit={submit} className="w-full" data-music-ui>
            <div className={`flex items-stretch border-2 border-cyan-600 bg-gray-950/95 rounded-full overflow-hidden shadow-[0_0_14px_rgba(0,255,255,0.25)] ${big ? "h-14" : "h-10"}`}>
                <input
                    value={value}
                    onChange={(e) => set_value(e.target.value)}
                    onFocus={() => set_dock_open(true)}
                    placeholder={compact ? "" : "paste a link or type a song name"}
                    aria-label="song link or name"
                    className={`min-w-0 flex-1 bg-transparent ${compact ? "px-3" : "px-5"} text-cyan-100 placeholder:text-cyan-900 outline-none ${big ? "text-lg" : "text-sm"}`}
                />
                <button
                    type="submit"
                    disabled={loading}
                    aria-label={started && !value.trim() && playing ? "pause" : "play"}
                    className="px-5 text-cyan-400 font-bold border-l-2 border-cyan-600 hover:bg-cyan-950 disabled:opacity-50 cursor-pointer"
                >
                    {loading ? "..." : started && !value.trim() && playing ? "❚❚" : "▶"}
                </button>
            </div>
            {message && <p className="mt-1 text-xs text-rose-300" role="status">{message}</p>}
        </form>
    )
}

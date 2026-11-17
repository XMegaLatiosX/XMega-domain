import { useEffect, useRef } from "react"
import { useBeat } from "../music/useBeat"
import { useMusic } from "../music/useMusic"

// On a touch screen, tapping the page to the beat sets the tempo: no need to open the player and find the small
// "tap" button. It is the same tap the button does (the 2nd tap and on give the tempo, the last tap is a beat).
// Only for touch (a mouse click is not a tap on the beat), only on empty parts of the page (not on links, buttons or
// the search box), and not while the tab's sound is being followed or a BPM was typed.
export default function TapAnywhere() {
    const beat = useBeat()
    const { playing } = useMusic()
    const beat_ref = useRef(beat)
    const mark = useRef(null)
    useEffect(() => {
        beat_ref.current = beat
    })

    useEffect(() => {
        const stage = mark.current && mark.current.parentElement
        if (!stage) return
        const on_down = (event) => {
            if (event.pointerType !== "touch" || !event.isPrimary) return
            if (event.target.closest && event.target.closest("a, button, input, textarea, select, label, form, iframe, #twitch_embed, [role='button'], [data-music-ui]")) return
            const current = beat_ref.current
            if (current.mode === "auto" || current.mode === "analyzing") return
            current.tap()
        }
        stage.addEventListener("pointerdown", on_down)
        return () => stage.removeEventListener("pointerdown", on_down)
    }, [])

    // only on touch screens, right under the logo (whether or not something plays here: the music may be coming from another app):
    // until the tempo is set, a clear hint to tap; after that the tempo itself, faint, so it can always be seen
    const touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
    const idle = beat.mode === "idle"
    return (
        <div ref={mark} aria-hidden="true" className="absolute left-0 right-0 flex justify-center pointer-events-none top-[calc(50%+22.5vw+0.4rem)] sm:top-[calc(50vh-4.1rem+13vw+0.9rem)]" style={{ opacity: touch ? 1 : 0 }}>
            {idle ? (
                <span className="pixel-font text-center text-cyan-100 px-3 py-2 bg-gray-950/85 border border-cyan-500 animate-pulse leading-snug">
                    <span className="block text-base">{playing ? "tap the screen along with the music" : "tap the screen to the beat"}</span>
                    <span className="block text-xs text-cyan-300">{beat.taps > 0 ? "1 tap... keep going" : "to set the BPM (tap 4 or more times)"}</span>
                </span>
            ) : (
                <span className="pixel-font text-base text-cyan-200 opacity-40 px-3 py-1 tabular-nums">{beat.mode === "analyzing" ? "listening..." : `${Math.round(beat.bpm)} BPM`}</span>
            )}
        </div>
    )
}

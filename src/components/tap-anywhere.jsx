import { useEffect, useRef } from "react"
import { useBeat } from "../music/useBeat"

// On a touch screen, tapping the page to the beat sets the tempo: no need to open the player and find the small
// "tap" button. It is the same tap the button does (the 2nd tap and on give the tempo, the last tap is a beat).
// Only for touch (a mouse click is not a tap on the beat), only on empty parts of the page (not on links, buttons or
// the search box), and not while the tab's sound is being followed or a BPM was typed.
export default function TapAnywhere() {
    const beat = useBeat()
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

    // a faint hint, only on touch screens and only until the first tap
    const hint = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && beat.mode === "idle"
    return (
        <div ref={mark} aria-hidden="true" className="absolute bottom-3 left-0 right-0 text-center text-[11px] text-cyan-200 pointer-events-none pixel-font" style={{ opacity: hint ? 0.45 : 0, transition: "opacity 400ms" }}>
            tap the screen to the beat
        </div>
    )
}

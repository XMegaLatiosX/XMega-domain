import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { useBeat } from "./useBeat"
import { useMusic } from "./useMusic"
import { toggle_panel, useVizUi } from "./viz-ui"

// Small row at the top of the player: what the beat follows.
//   auto  follow the tab's sound (asks once to share the tab's sound, then keeps it). Only shown where the browser
//         can share a tab's sound (desktop Chrome and the like): phones cannot, so there it is left out

//   tap   tap the beat: counts from the 2nd tap, the last tap is a beat. Also on the T key.
//   bpm   type a tempo and press Enter: it starts at that moment, then a tap moves where the beat falls
//   x     let go of everything and go back to the idle 144
// can this browser share a tab's sound and read it? (not on phones)
const CAN_FOLLOW = typeof window !== "undefined" && typeof window.MediaStreamTrackProcessor !== "undefined" && !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)

export default function BeatControls() {
    const { mode, bpm, silent, message, taps, auto, tap, set_bpm, nudge, reset } = useBeat()
    const { dock_open } = useMusic()
    const [draft, set_draft] = useState(null) // text while the BPM box is being edited
    const { pathname } = useLocation()
    const { pad } = useVizUi()

    // keyboard: T taps, [ and ] move the pulse 10 ms earlier/later (fine tuning for a delay you can hear)
    useEffect(() => {
        if (!dock_open) return
        const on_key = (event) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return
            const target = event.target
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return
            if (event.key === "t" || event.key === "T") { if (!event.repeat) tap() }
            else if (event.key === "[") nudge(-10)
            else if (event.key === "]") nudge(10)
        }
        window.addEventListener("keydown", on_key)
        return () => window.removeEventListener("keydown", on_key)
    }, [dock_open, tap, nudge])

    const analyzing = mode === "analyzing"
    const shown = analyzing ? (silent ? "no sound" : "listening") : String(Math.round(bpm))
    const hint =
        message ||
        (mode === "analyzing" ? (silent ? "Nothing audible in this tab yet. Start a song." : "Listening for the beat... the pulse is paused until it finds it.") :
        mode === "auto" ? "Following this tab's sound. [ and ] move the pulse 10 ms." :
        mode === "manual" ? "Manual tempo. Tap to move where the beat falls." :
        (CAN_FOLLOW ? "Idle beat, 144 BPM. Press auto to follow the music." : "Idle beat, 144 BPM. Tap the beat or type a BPM."))

    const small = "h-5 px-1.5 text-[11px] leading-none border border-cyan-800 text-cyan-300 hover:bg-cyan-950 cursor-pointer whitespace-nowrap"
    const on = "bg-cyan-950 text-cyan-100 border-cyan-500"

    function commit() {
        if (draft !== null && draft.trim() !== "") set_bpm(draft)
        set_draft(null)
    }

    return (
        <div className="flex items-center gap-1 shrink-0" data-music-ui>
            {CAN_FOLLOW && <button type="button" className={`${small} ${mode === "auto" || analyzing ? on : ""}`} onClick={auto} title={hint} aria-label="auto: follow the music's beat">auto sync</button>}
            <button
                type="button" className={`${small} w-12 text-center ${mode === "manual" && taps > 0 ? on : ""}`} /* fixed width: "tap 12" must not push the other buttons around under the pointer */
                onPointerDown={tap} onClick={(event) => { if (event.detail === 0) tap() }}
                title="Tap the beat (T key). It counts from the 2nd tap: the gap is the tempo, the last tap is a beat."
                aria-label="tap the beat"
            >
                {taps > 0 ? `tap ${taps}` : "tap"}
            </button>
            <input
                type="text" inputMode="decimal" aria-label="BPM"
                value={draft !== null ? draft : analyzing ? "" : shown}
                placeholder={shown}
                onFocus={(event) => { set_draft(""); event.target.select() }}
                onChange={(event) => set_draft(event.target.value)}
                onBlur={commit}
                onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { set_draft(null); event.currentTarget.blur() } }}
                title="Type a BPM and press Enter"
                className={`h-5 w-14 shrink-0 px-1 text-center text-[11px] leading-none bg-transparent border border-cyan-800 text-cyan-100 placeholder:text-cyan-600 ${mode === "idle" ? "opacity-70" : ""}`}
            />
            {/* manual beat: opens the pad on the home page, where the visualizer is */}
            {pathname === "/" && (
                <button type="button" className={`${small} ${pad ? on : ""}`} onClick={() => toggle_panel("pad")} aria-pressed={pad} title="Manual beat: fire the effects by hand" aria-label="manual beat pad">pad</button>
            )}
            {/* always in the row (hidden while idle) so the first tap does not add a button and shift the others */}
            <button type="button" className={`${small} ${mode === "idle" ? "invisible" : ""}`} onClick={reset} disabled={mode === "idle"} tabIndex={mode === "idle" ? -1 : 0} title="Back to the idle beat (144) and stop listening to the tab" aria-label="reset the beat">×</button>
        </div>
    )
}

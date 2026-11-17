import Marquee from "./marquee"
import PlayerBars from "../music/PlayerBars"
import { useMusic } from "../music/useMusic"
import { useSyncExternalStore } from "react"

// as many bars as fit: 72 need about 300px, a phone gives the middle of the header only about 130px
const WIDE = "(min-width: 768px)"
const useWide = () => useSyncExternalStore((notify) => { const q = window.matchMedia(WIDE); q.addEventListener("change", notify); return () => q.removeEventListener("change", notify) }, () => window.matchMedia(WIDE).matches, () => true)

// The middle of the header: the frequencies as symmetric bars (up and down from the middle line, the same bands as the player) with the
// name of what is playing floating over them (no frame; at most 40% of the width, sliding left when it is longer). Click to open the player. With nothing playing a slow wave runs at the site's tempo.
// On narrow screens only the bars are shown (no room for the title).
export default function HeaderNowPlaying() {
    const { playing, title, started, set_dock_open } = useMusic()
    const wide = useWide()
    const text = started ? (title || "loading...") : "nothing playing"
    return (
        <button type="button" onClick={() => set_dock_open((open) => !open)} aria-label="open the music player" title={started ? title : "open the music player"}
            className="flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 isolate overflow-hidden items-center justify-start gap-2 h-11 w-[min(34rem,34vw)] md:w-[min(34rem,36vw)] px-3 cursor-pointer">
            <PlayerBars playing={playing} pattern count={wide ? 72 : 26} mirror tone="opacity-70" />
            <span className="hidden md:inline text-cyan-300/80 text-lg leading-none shrink-0 [text-shadow:0_0_4px_#000]" aria-hidden="true">♪</span>
            <Marquee className={`hidden md:block max-w-[40%] text-sm [text-shadow:0_0_3px_#000,0_0_8px_#000] ${started ? "text-cyan-50/80" : "text-cyan-700"}`}>{text}</Marquee>
        </button>
    )
}

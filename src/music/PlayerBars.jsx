import { useEffect, useRef } from "react"
import { get_bars } from "./reactor"
import { useBeat } from "./useBeat"
import { fake_levels, bar_luck } from "./fake-bands"

// Frequency bars behind the player controls. With sound they follow the music (the same 24 bands the visualizer uses);
// with nothing playing a slow wave runs at the site's tempo (default, tapped or typed). Drawn by script, not by CSS delays,
// so it stays on the site clock (see the synced-animation rule in index.css).
const BANDS = 24
const MIN = 0.03 // the thinnest a bar gets (a hair line), so the tall ones look even taller

// count: how many bars to draw (24 fits the small player; a long thin row, like a track on the music page, takes more)
// pattern: when no sound is heard, draw the pretend drum pattern (fake-bands.js) on the site's tempo (the idle 144 BPM one when nothing
//          sets it) instead of the slow wave; heard sound still wins, so the bars follow the music; only "rhythm off" gives the slow wave (the header uses it)
// mirror: the bars grow up and down from the middle line (for a wide row), instead of only up from the bottom
const TOUCH = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches // a phone cannot hear the page's sound: it gets the pretend drum pattern (fake-bands.js) while something plays

export default function PlayerBars({ playing, count = 24, mirror = false, tone = "opacity-40", pattern = false }) {
    const box = useRef(null)
    const { get_clock } = useBeat()
    const clock = useRef(get_clock)
    useEffect(() => { clock.current = get_clock }, [get_clock])

    useEffect(() => {
        const bars = box.current ? Array.from(box.current.children) : []
        let raf = 0
        const frame = () => {
            let levels = playing ? get_bars() : null
            let energy = 0
            if (levels) for (let i = 0; i < BANDS; i++) energy += levels[i] || 0
            let live = energy > 0.05
            const { beat_ms, anchor_perf } = clock.current()
            const phase = (performance.now() - anchor_perf) / beat_ms
            let faked = false
            if (pattern) {
                // real sound when it is being heard (shared tab audio); otherwise the pretend drums
                if (!live) {
                    const root = document.documentElement
                    if (!root.classList.contains("rhythm-off")) { levels = fake_levels(phase); live = true; faked = true } else live = false
                }
            } else if (!live && playing && TOUCH) { levels = fake_levels(phase); live = true }
            for (let i = 0; i < count; i++) {
                let h
                if (live) {
                    const at = (i / Math.max(1, count - 1)) * (BANDS - 1) // between two bands: blended, so many bars do not look stepped
                    const low = Math.floor(at)
                    const mix = at - low
                    const level = Math.min(1, (levels[low] || 0) * (1 - mix) + (levels[Math.min(BANDS - 1, low + 1)] || 0) * mix)
                    if (faked) h = MIN + (1 - MIN) * Math.min(1, level * (count > BANDS ? bar_luck(i, phase) * 1.35 : 1)) // pretend drums: every bar its own height
                    else h = MIN + (1 - MIN) * (mirror ? Math.pow(level, 0.7) : level) // the wide row lifts quiet bands a little so the highs show too
                } else h = MIN + 0.3 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (phase / 2 - (i / count) * 1.5))) + 0.1 * Math.pow(1 - (phase % 1), 3)
                bars[i].style.transform = `scaleY(${h.toFixed(3)})`
            }
            raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)
        return () => cancelAnimationFrame(raf)
    }, [playing, count, mirror, pattern])

    return (
        <div ref={box} aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-full flex ${mirror ? "items-center" : "items-end"} gap-[2px] px-1 -z-10 pointer-events-none ${tone} overflow-hidden`}>
            {Array.from({ length: count }, (_, i) => <div key={i} className={`flex-1 h-full bg-cyan-400 ${mirror ? "origin-center" : "origin-bottom"}`} style={{ transform: "scaleY(0.1)" }} />)}
        </div>
    )
}

import { useEffect, useRef } from "react"
import { get_bars } from "./reactor"
import { useBeat } from "./useBeat"

// Frequency bars behind the player controls. With sound they follow the music (the same 24 bands the visualizer uses);
// with nothing playing a slow wave runs at the site's tempo (default, tapped or typed). Drawn by script, not by CSS delays,
// so it stays on the site clock (see the synced-animation rule in index.css).
const BANDS = 24

// count: how many bars to draw (24 fits the small player; a long thin row, like a track on the music page, takes more)
// mirror: the bars grow up and down from the middle line (for a wide row), instead of only up from the bottom
export default function PlayerBars({ playing, count = 24, mirror = false, tone = "opacity-40" }) {
    const box = useRef(null)
    const { get_clock } = useBeat()
    const clock = useRef(get_clock)
    useEffect(() => { clock.current = get_clock }, [get_clock])

    useEffect(() => {
        const bars = box.current ? Array.from(box.current.children) : []
        let raf = 0
        const frame = () => {
            const levels = playing ? get_bars() : null
            let energy = 0
            if (levels) for (let i = 0; i < BANDS; i++) energy += levels[i] || 0
            const live = energy > 0.05
            const { beat_ms, anchor_perf } = clock.current()
            const phase = (performance.now() - anchor_perf) / beat_ms
            for (let i = 0; i < count; i++) {
                let h
                if (live) {
                    const at = (i / Math.max(1, count - 1)) * (BANDS - 1) // between two bands: blended, so many bars do not look stepped
                    const low = Math.floor(at)
                    const mix = at - low
                    const level = Math.min(1, (levels[low] || 0) * (1 - mix) + (levels[Math.min(BANDS - 1, low + 1)] || 0) * mix)
                    h = 0.06 + 0.94 * (mirror ? Math.pow(level, 0.7) : level) // the wide row lifts quiet bands a little so the highs show too
                } else h = 0.12 + 0.3 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (phase / 2 - (i / count) * 1.5))) + 0.1 * Math.pow(1 - (phase % 1), 3)
                bars[i].style.transform = `scaleY(${h.toFixed(3)})`
            }
            raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)
        return () => cancelAnimationFrame(raf)
    }, [playing, count, mirror])

    return (
        <div ref={box} aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-full flex ${mirror ? "items-center" : "items-end"} gap-[2px] px-1 -z-10 pointer-events-none ${tone} overflow-hidden`}>
            {Array.from({ length: count }, (_, i) => <div key={i} className={`flex-1 h-full bg-cyan-400 ${mirror ? "origin-center" : "origin-bottom"}`} style={{ transform: "scaleY(0.1)" }} />)}
        </div>
    )
}

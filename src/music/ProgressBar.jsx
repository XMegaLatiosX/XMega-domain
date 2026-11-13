import { useEffect, useRef } from "react"
import { useMusic } from "./useMusic"

function format(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${String(s).padStart(2, "0")}`
}

// Position bar. It reads the player on its own timer and writes straight to the DOM,
// so the rest of the app does not re-render every tick. Click to jump to a point.
export default function ProgressBar() {
    const { playing, get_progress, seek } = useMusic()
    const fill = useRef(null)
    const label = useRef(null)

    useEffect(() => {
        function tick() {
            const { pos, dur } = get_progress()
            if (fill.current) fill.current.style.width = dur > 0 ? `${Math.min(100, (pos / dur) * 100)}%` : "0%"
            if (label.current) label.current.textContent = `${format(pos)} / ${format(dur)}`
        }
        tick()
        if (!playing) return
        const id = setInterval(tick, 250)
        return () => clearInterval(id)
    }, [playing, get_progress])

    function jump(e) {
        const box = e.currentTarget.getBoundingClientRect()
        seek(Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)))
    }

    return (
        <div className="flex items-center gap-2">
            <div
                role="slider" aria-label="song position" aria-valuemin={0} aria-valuemax={100}
                onClick={jump}
                className="relative h-3 flex-1 border border-cyan-800 bg-gray-900 cursor-pointer"
            >
                <div ref={fill} className="absolute inset-y-0 left-0 bg-cyan-400" style={{ width: "0%" }} />
            </div>
            <span ref={label} className="text-[10px] text-cyan-300 tabular-nums w-20 text-right">0:00 / 0:00</span>
        </div>
    )
}

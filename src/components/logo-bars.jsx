import { useEffect, useRef } from "react"
import { get_bars } from "../music/reactor"
import { useBeat } from "../music/useBeat"
import { fake_levels } from "../music/fake-bands"

// A ring of frequency bars around the central logo, drawn with the same 24 bands the rest of the page reacts to: the lowest band on the left,
// going round to the highest, and back (so the ring is not symmetric). Flat thick cyan bars, with a thinner dark-blue "sub-bar" between every two,
// as tall as the average of its two neighbours. Under them sits a fake base: a short, uneven rim of dark blue that is always there while sound
// is analysed, so the bars look attached to the logo instead of coming out of a perfect invisible circle (the logo is pixel art).
// The bars start inside the logo's edge, from the badge's size RIGHT NOW (it swells on every beat); the logo is drawn over them.
// They follow the bands exactly like the player's bars: no smoothing and no cutting of weak bands.
const COUNT = 30
const RIM = Array.from({ length: COUNT * 2 }, (_, i) => 0.05 + 0.07 * (0.5 + 0.5 * Math.sin(i * 2.399 + Math.sin(i * 0.7) * 2))) // fixed, uneven heights

export default function LogoBars() {
    const canvas = useRef(null)
    const { get_clock } = useBeat()
    const clock = useRef(get_clock)
    useEffect(() => { clock.current = get_clock }, [get_clock])
    useEffect(() => {
        const el = canvas.current
        if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
        const ctx = el.getContext("2d")
        const shown = new Float32Array(COUNT)
        const touch = window.matchMedia("(pointer: coarse)").matches
        let badge = null
        let raf = 0
        let last = 0
        let dt = 33
        const fit = () => {
            const dpr = Math.min(2, window.devicePixelRatio || 1)
            el.width = Math.round(el.clientWidth * dpr)
            el.height = Math.round(el.clientHeight * dpr)
        }
        fit()
        const observer = new ResizeObserver(fit)
        observer.observe(el)
        const frame = (now) => {
            raf = requestAnimationFrame(frame)
            const root = document.documentElement
            const off = root.classList.contains("rhythm-off") || root.classList.contains("perf-low")
            if (now - last < 30) return // about 30 frames a second is plenty
            dt = Math.min(100, now - (last || now))
            last = now
            const w = el.width
            ctx.clearRect(0, 0, w, el.height)
            if (off) return
            let levels = get_bars()
            let energy = 0
            for (let i = 0; i < 24; i++) energy += levels[i] || 0
            // a phone cannot listen to the page's sound, so there are no real bands: while a tempo is set the bars move on the beat instead
            // (a pretend drum pattern, see music/fake-bands.js), so the ring is not just empty
            if (energy <= 0.05 && touch && root.hasAttribute("data-beat-on") && root.getAttribute("data-beat") !== "analyzing") {
                const { beat_ms, anchor_perf } = clock.current()
                const phase = (performance.now() - anchor_perf) / beat_ms
                levels = fake_levels(phase)
                energy = 24
            }
            const scale = w / el.clientWidth
            const radius = (el.clientWidth / 2.1 / 2) * scale // the badge is 1/2.1 of the canvas
            // how big the badge is right now (its beat pulse is a scale transform)
            if (!badge || !badge.isConnected) badge = document.querySelector(".pixel_logo_gif")
            const swell = badge ? new DOMMatrixReadOnly(getComputedStyle(badge).transform).a || 1 : 1
            const inner = radius * swell * 0.8
            const room = Math.max(10 * scale, w / 2 - inner - 2 * scale) // the canvas edge limits how far a bar can reach
            const max = Math.min(radius * 1.25, room)
            const half = COUNT / 2
            for (let k = 0; k < COUNT; k++) {
                const m = k < half ? k : COUNT - 1 - k // mirrored: both sides show the same band
                const band = Math.min(23, Math.floor((m / half) * 24))
                const target = energy > 0.05 ? 0.06 + 0.94 * Math.min(1, levels[band] || 0) : 0
                // a little smoothing, only to take away the feeling of lag: a hit still lands at once, the fall is eased over about 60 ms
                shown[k] = shown[k] + (target - shown[k]) * (1 - Math.exp(-dt / (target >= shown[k] ? 25 : 55)))
            }
            const slot = (2 * Math.PI * inner) / COUNT
            const draw = (angle, thickness, height, from, outline) => {
                if (height < 2 * scale) return
                ctx.save()
                ctx.globalAlpha = 0.6
                ctx.translate(w / 2, el.height / 2)
                ctx.rotate(angle)
                ctx.fillStyle = from
                ctx.strokeStyle = outline
                ctx.lineWidth = Math.max(1, 1.5 * scale)
                ctx.beginPath()
                ctx.rect(-thickness / 2, inner, thickness, height)
                ctx.fill()
                ctx.stroke()
                ctx.restore()
            }
            const BLUE = "#0b2fd6"
            const OUTLINE = "rgba(0, 0, 0, 0.6)"
            // the fake rim first, then the sub-bars, then the main bars (thicker than before)
            if (energy > 0.05) for (let k = 0; k < COUNT * 2; k++) draw(Math.PI / 2 + (k / (COUNT * 2)) * 2 * Math.PI, slot * 0.38, RIM[k] * max * 1.6, BLUE, OUTLINE)
            for (let k = 0; k < COUNT; k++) {
                const average = (shown[k] + shown[(k + 1) % COUNT]) / 2
                draw(Math.PI / 2 + ((k + 1) / COUNT) * 2 * Math.PI, slot * 0.5, average * max * 0.85 + RIM[k] * max, BLUE, OUTLINE)
            }
            for (let k = 0; k < COUNT; k++) {
                draw(Math.PI / 2 + ((k + 0.5) / COUNT) * 2 * Math.PI, slot * 0.72, shown[k] * max + RIM[k + COUNT] * max, "#22e5ff", "rgba(0, 0, 0, 0.7)")
            }
        }
        raf = requestAnimationFrame(frame)
        return () => { cancelAnimationFrame(raf); observer.disconnect() }
    }, [])

    return (
        <div className="absolute w-[45%] sm:w-[26%] aspect-square translate-y-2 pointer-events-none" aria-hidden="true">
            <canvas ref={canvas} className="absolute w-[210%] h-[210%] -left-[55%] -top-[55%]" />
        </div>
    )
}

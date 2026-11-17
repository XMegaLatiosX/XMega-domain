import { useEffect, useMemo, useRef, useState } from "react"

import img1 from "../assets/images/scroll images/BMTA main screen.webp"
import img2 from "../assets/images/scroll images/bmtacode.webp"
import img3 from "../assets/images/scroll images/concept.png"
import img4 from "../assets/images/scroll images/curriculum.webp"
import img5 from "../assets/images/scroll images/dead mileage.webp"
import img6 from "../assets/images/scroll images/fl studio.webp"
import img7 from "../assets/images/scroll images/gallery.webp"
import img8 from "../assets/images/scroll images/instagram.webp"
import img9 from "../assets/images/scroll images/login screen code.webp"
import img10 from "../assets/images/scroll images/others skills.webp"
import img11 from "../assets/images/scroll images/pixel arts.webp"
import img12 from "../assets/images/scroll images/register screen.webp"
import img13 from "../assets/images/scroll images/screen rec.webp"
import img14 from "../assets/images/scroll images/skill track.webp"
import img15 from "../assets/images/scroll images/tower defense.webp"
import img16 from "../assets/images/scroll images/404.webp"
import img17 from "../assets/images/scroll images/blog.webp"

const IMAGES = [img1, img2, img3, img4, img5, img6, img7, img8, img9, img10, img11, img12, img13, img14, img15, img16, img17]

// How the layout is made:
// - Every image travels along a diagonal path, from the bottom-left to the top-right of the screen.
// - Images are grouped in parallel "columns" (lanes) along that path. The tilted image is w wide ACROSS
//   the path, so columns are w + 1px apart (plus room for the random sideways offsets): at the closest
//   they almost touch, but never overlap.
// - Every image starts already somewhere along its path, so the screen is full on the first frame.
//   When an image leaves the top-right it is off-screen, and it comes back at the bottom-left, also off-screen.
// - Sizes follow the screen, so it looks right from a phone to a 4K monitor.
//
// Two animations (prop `mode`):
// - "drift" (default): every image moves continuously along the path, each column at its own speed.
// - "step": columns move on the beat. Odd columns take a step on one beat, even columns on the next.
//   Pure JS clock, one BPM value (prop `bpm`); the positions are the same as in "drift".
// Preview without touching code: add ?bg=step to the address.

const HEADER_REM = 7 // header + upper bar above the page, in rem
const SIZE_SMALL = 0.48 // image width as a fraction of the smaller screen side, on small/medium screens
const SIZE_LARGE = 0.56 // ...and on large screens (in between it is interpolated)
const SMALL_UNTIL = 700 // smaller side (px) up to which the "small" size is used
const LARGE_FROM = 1000 // smaller side (px) from which the "large" size is used
const COLUMN_GAP_PX = 1 // closest distance between two columns, counting the sideways offsets
const SIDE_OFFSET = 0.115 // max sideways offset, as a fraction of the image width
const STEP_IN_IMAGES = 0.5 // "step" mode: distance of one step, in image heights (1 = one whole image)
const STEP_MOVE_FRACTION = 0.6 // "step" mode: fraction of a beat spent moving; the rest is a pause

function mulberry32(seed) {
    let a = seed
    return function random() {
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function clamp(min, value, max) {
    return Math.min(max, Math.max(min, value))
}

function ease_out(x) {
    return 1 - Math.pow(1 - x, 3)
}

function buildLayout(width, height, seed) {
    const random = mulberry32(seed)
    const root_px = 16

    // image size: scales with the screen, 16:9 (21rem..49rem wide, a bit less on narrow phones)
    const vmin = Math.min(width, height)
    const t = clamp(0, (vmin - SMALL_UNTIL) / (LARGE_FROM - SMALL_UNTIL), 1)
    const size_vmin = SIZE_SMALL + (SIZE_LARGE - SIZE_SMALL) * t
    const w = clamp(Math.min(21 * root_px, 0.6 * width), size_vmin * vmin, 49 * root_px)
    const h = (w * 9) / 16
    const r = 0.5 * Math.hypot(w, h) // radius of a circle that contains the tilted image

    // coordinates along (a) and across (p) the diagonal
    const along_start = -height / Math.SQRT2 - 2 * r
    const along_end = width / Math.SQRT2 + 2 * r
    const path_length = along_end - along_start
    const across_total = (width + height) / Math.SQRT2

    // the tilted image is w wide across the path, so columns only need w + gap (+ the two possible offsets)
    const side_max = SIDE_OFFSET * w
    const lane_pitch = w + 2 * side_max + COLUMN_GAP_PX
    const lane_count = Math.ceil((across_total + w) / lane_pitch)

    // images of the same column: the tilted image is h long ALONG the path, so 0.8w apart (centre to centre)
    // leaves a gap of ~0.24w between neighbours at the closest; on average they are 1.25w apart
    const min_spacing = 0.8 * w
    const per_lane = Math.max(2, Math.floor(path_length / (1.25 * w)))
    const slot = path_length / per_lane
    const along_jitter = 0.5 * (slot - min_spacing)

    const base_speed = clamp(50, 0.085 * height, 220) // px per second, similar to the old animation

    const items = []
    const lanes = []
    let counter = 0
    for (let j = 0; j < lane_count; j++) {
        const p = -w / 2 + (j + 0.5) * lane_pitch
        const speed = base_speed * (0.85 + 0.3 * random())
        const duration = path_length / speed
        const phase = random() * slot
        const x0 = (along_start + p) / Math.SQRT2
        const y0 = (p - along_start) / Math.SQRT2
        lanes.push({ speed, duration, phase })

        for (let k = 0; k < per_lane; k++) {
            // (the random jitter can push the first images below 0: wrap them to the end of the path)
            const offset = (((k * slot + phase + (random() * 2 - 1) * along_jitter) % path_length) + path_length) % path_length
            // ~60% of the images get a sideways offset (perpendicular to the path), the rest stay on the line
            const side = random() < 0.6 ? (random() * 2 - 1) * side_max : 0
            items.push({
                key: `${j}-${k}`,
                lane: j,
                cell: (j + k) % 2, // a chessboard: neighbours in a column and in the next column differ
                src: IMAGES[(counter * 7 + j * 3) % IMAGES.length],
                x0,
                y0,
                duration,
                offset,
                delay: -(offset / path_length) * duration,
                ox: side / Math.SQRT2,
                oy: side / Math.SQRT2,
            })
            counter++
        }
    }

    // A second set of images, in between the first ones (half a lane to the side, half a slot along): invisible at rest (opacity 0),
    // it fades in with the "open space" mode (see index.css, .bg-extra), when the images are small, so the wall is not left with holes.
    for (let j = 0; j < lane_count; j++) {
        const p = -w / 2 + (j + 1) * lane_pitch
        const { duration, phase } = lanes[j]
        const x0 = (along_start + p) / Math.SQRT2
        const y0 = (p - along_start) / Math.SQRT2
        for (let k = 0; k < per_lane; k++) {
            const offset = (((k * slot + phase + slot / 2) % path_length) + path_length) % path_length
            items.push({
                key: `x${j}-${k}`,
                lane: j,
                extra: true,
                cell: (j + k + 1) % 2,
                src: IMAGES[(counter * 7 + j * 3 + 5) % IMAGES.length],
                x0,
                y0,
                duration,
                offset,
                delay: -(offset / path_length) * duration,
                ox: 0,
                oy: 0,
            })
            counter++
        }
    }

    return { w, h, items, lane_pitch, lane_count, path_length, dx: path_length / Math.SQRT2, dy: -path_length / Math.SQRT2 }
}

function screen_size() {
    return { width: window.innerWidth, height: Math.max(300, window.innerHeight - HEADER_REM * 16) }
}

function same_size(a, b) {
    return Math.abs(a.width - b.width) < 2 && Math.abs(a.height - b.height) < 2
}

// position (px along the path) added by the beat steps, for a column of the given parity
function step_distance(beats, parity, step) {
    const b = Math.floor(beats)
    const frac = beats - b
    const done = Math.max(0, Math.ceil((b - parity) / 2))
    const moving = b >= parity && (b - parity) % 2 === 0
    const partial = moving ? ease_out(Math.min(1, frac / STEP_MOVE_FRACTION)) : 0
    return (done + partial) * step
}

export default function BackgroundWall({ mode = "drift", bpm = 144 }) {
    const preview = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("bg") : null
    const active_mode = preview === "step" || preview === "drift" ? preview : mode

    // random every visit, fixed while the page is open
    const [seed] = useState(() => (Math.random() * 4294967296) >>> 0)
    const [size, set_size] = useState(screen_size)
    const nodes = useRef([])
    const wall = useRef(null)

    // follow the real size of the wall (the whole page area), rebuilding after a resize settles
    useEffect(() => {
        const el = wall.current
        if (!el) return
        let timer
        const measure = () => {
            // layout size (clientWidth), not getBoundingClientRect: the holding zoom-out scales this layer and would shrink the numbers
            if (el.clientWidth < 10 || el.clientHeight < 10) return
            const next = { width: el.clientWidth, height: el.clientHeight }
            set_size((current) => (same_size(current, next) ? current : next))
        }
        measure()
        const observer = new ResizeObserver(() => {
            clearTimeout(timer)
            timer = setTimeout(measure, 250)
        })
        observer.observe(el)
        return () => {
            clearTimeout(timer)
            observer.disconnect()
        }
    }, [])

    const layout = useMemo(() => buildLayout(size.width, size.height, seed), [size, seed])

    // "step" mode: on every frame, put each image where the beat clock says
    useEffect(() => {
        const list = nodes.current
        if (active_mode !== "step") return
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

        const beat_ms = 60000 / bpm
        const step = STEP_IN_IMAGES * layout.h
        const start = performance.now()
        let frame
        const tick = (now) => {
            const beats = (now - start) / beat_ms
            const moved = [step_distance(beats, 0, step), step_distance(beats, 1, step)]
            layout.items.forEach((item, i) => {
                const el = list[i]
                if (!el) return
                const pos = (item.offset + moved[item.lane % 2]) % layout.path_length
                el.style.transform = `translate(${item.x0 + pos / Math.SQRT2}px, ${item.y0 - pos / Math.SQRT2}px)`
            })
            frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
        return () => {
            cancelAnimationFrame(frame)
            list.forEach((el) => el && el.style.removeProperty("transform"))
        }
    }, [active_mode, bpm, layout])

    return (
        <div ref={wall} className={`bg-wall${active_mode === "step" ? " bg-step" : ""}`} aria-hidden="true" data-pitch={layout.lane_pitch} data-lanes={layout.lane_count} style={{ "--w": `${layout.w}px`, "--dx": `${layout.dx}px`, "--dy": `${layout.dy}px` }}>
            {layout.items.map((item, i) => (
                <div
                    className={item.extra ? "bg-drift bg-extra" : "bg-drift"}
                    data-j={item.lane}
                    key={item.key}
                    ref={(el) => (nodes.current[i] = el)}
                    style={{ "--x0": `${item.x0}px`, "--y0": `${item.y0}px`, "--ox": `${item.ox}px`, "--oy": `${item.oy}px`, animationDuration: `${item.duration}s`, animationDelay: `${item.delay}s` }}
                >
                    <img className="bg-img" src={item.src} alt="" draggable={false} decoding="async" data-lane={item.lane % 2} data-cell={item.cell} />
                </div>
            ))}
        </div>
    )
}

import { useEffect, useRef } from "react"
import { useBeat } from "../music/useBeat"
import { emit_hit, on_hit, get_bands, get_tone } from "../music/reactor"

// Visual reactions to the drums, for the home page.
//
// Where the hits come from:
//   - while the tab's sound is being followed (auto sync): real kick and snare hits heard in the sound
//   - otherwise (idle 144, tapped or typed tempo): made up from the beat clock, a kick on every beat and a
//     snare on every other one (sent on the same bus, so the dock's K/S lights blink too)
//
// What reacts: there are several "looks" for the kick and several for the snare. A new look is picked at random
// every 16 beats (never the same one twice in a row). Every look is a function below; the looks that change the
// wall of images leave things as they found them when they are swapped out.
//
// Besides the hits there are effects that follow how loud the sound is all the time (the continuous ones):
// little squares streaming out of the logo, squares rising from the floor, and thin laser beams behind the
// images (BackBeams, below). They use the levels the BeatProvider measures; without followed sound they are made up
// from the beat clock.
//
// To try one look: add ?kick=checker or ?snare=laser or ?hat=twinkle (any of them) to the address.

const KICKS = ["checker", "shove", "flash", "lines", "lanes", "slide"]
const SNARES = ["laser", "columns", "glitch", "hue", "pixels"]
// looks that change the same property of the images cannot play together
const CONFLICTS = { checker: "scale", columns: "scale", shove: "translate", slide: "translate", lanes: "opacity" }
const HATS = ["twinkle", "sparks", "tick"]
// Every so often the title swaps its colours on a run of snares, 4, 8, 12 or 16 of them, one swap per snare, so it
// goes back to normal at the end: cyan letters with a black edge <-> black letters with a cyan edge.
const INVERT_EVERY = [20, 40] // snares to wait between those runs (min, max)
const LASER_ALONGSIDE = 0.6 // chance that a snare also fires the thin laser, whatever its look
const SCENE_BEATS = 16

const clamp = (value, low, high) => Math.min(high, Math.max(low, value))
const mod = (value, size) => ((value % size) + size) % size
const pick = (list, not) => {
    const rest = list.filter((name) => name !== not)
    return rest[Math.floor(Math.random() * rest.length)]
}
const PIXEL_COLORS = ["#00ffff", "#ffffff", "#ff2bd6", "#ffee33"]

// How loud [low, body, mid, crack, air] are, 0..1, smoothed. Followed sound: measured. Otherwise made up from the clock.
function make_levels(beat_ref, force_followed = false) {
    const out = new Float32Array(5)
    out.sustain = 0
    let last = 0
    return (now) => {
        const current = beat_ref.current
        const clock = current.get_clock()
        const followed = force_followed || (current.mode === "auto" && !current.silent)
        let target = get_bands()
        if (!followed) {
            const beats = (now - clock.anchor_perf) / clock.beat_ms
            const phase = mod(beats, 1)
            const odd = mod(Math.floor(beats), 2) === 1
            const low = Math.exp(-phase * 5)
            const snap = odd ? Math.exp(-phase * 7) : 0
            target = [low, low * 0.6, snap * 0.7, snap * 0.8, 0.3 + 0.25 * Math.sin(now / 900) + 0.3 * Math.exp(-mod(beats * 2, 1) * 8)]
        }
        for (let g = 0; g < 5; g++) out[g] = target[g] > out[g] ? target[g] : out[g] * 0.86 + target[g] * 0.14
        // how loud it has been for the last second or so (not the hits): drives the effects for sound that holds
        const loud = Math.max(out[1], out[2], out[3] * 0.9, out[4] * 0.8)
        const dt = Math.min(100, now - last)
        last = now
        out.sustain += (loud - out.sustain) * (1 - Math.exp(-dt / (loud > out.sustain ? 500 : 1400)))
        out.followed = followed
        return out
    }
}

// the thin lasers behind the wall of images: a fan of beams from the bottom corners that sweeps with the music
export function BackBeams() {
    const beat = useBeat()
    const beat_ref = useRef(beat)
    const box = useRef(null)
    useEffect(() => {
        beat_ref.current = beat
    })
    useEffect(() => {
        const root = box.current
        if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
        const beams = Array.from(root.querySelectorAll(".fx-beam"))
        const tint = root.querySelector(".fx-tint")
        const levels = make_levels(beat_ref)
        const angles = beams.map(() => null)
        // the mood: slow averages of how fast, how bright and how loud the music is, turned into a faint colour
        // (calm and dark = blue, fast, bright and loud = red). Only a rough guess from the numbers we have.
        const mood = { energy: 0.3, tone: 0.45, hue: 215, alpha: 0.12 }
        let last = 0
        let frame = 0
        const draw = (now) => {
            const dt = Math.min(100, now - (last || now))
            last = now
            const lv = levels(now)
            const sparkle = Math.min(1, lv[3] * 0.9 + lv[4] * 0.7 + lv[0] * 0.3)
            beams.forEach((el, i) => {
                const side = i % 2 === 0 ? 1 : -1 // left corner leans right, right corner leans left
                const sweep = Math.sin(now / (3200 + i * 700) + i * 1.7) // slow
                const target = side * (18 + 26 * (i / beams.length)) + sweep * (8 + 8 * lv.sustain)
                angles[i] = angles[i] === null ? target : angles[i] + (target - angles[i]) * 0.05 // eased, no jerks
                el.style.transform = `rotate(${angles[i].toFixed(2)}deg)`
                const wanted = 0.04 + 0.3 * sparkle * (0.5 + 0.5 * Math.abs(sweep)) // subtle: they are always there
                el.style.opacity = String(wanted)
            })
            if (tint) {
                const current = beat_ref.current
                const followed = lv.followed
                const slow = (target, tau) => 1 - Math.exp(-dt / tau)
                mood.energy += ((followed ? lv.sustain : 0.3) - mood.energy) * slow(0, 12000)
                mood.tone += ((followed ? get_tone() : 0.45) - mood.tone) * slow(0, 15000)
                const bpm = followed && current.bpm ? current.bpm : 110
                const fast = clamp((bpm - 85) / 90, 0, 1)
                const bright = clamp((mood.tone - 0.3) / 0.35, 0, 1)
                const loud = clamp((mood.energy - 0.25) / 0.5, 0, 1)
                const vibe = 0.45 * fast + 0.3 * bright + 0.25 * loud
                const hue = (215 + vibe * 140) % 360 // blue, through violet, to red
                mood.hue += (hue - mood.hue) * slow(0, 6000)
                mood.alpha += ((0.13 + 0.08 * vibe) - mood.alpha) * slow(0, 6000)
                tint.style.background = `radial-gradient(ellipse at 50% 55%, hsla(${mood.hue.toFixed(1)}, 85%, 52%, ${mood.alpha.toFixed(3)}), hsla(${mood.hue.toFixed(1)}, 85%, 40%, ${(mood.alpha * 0.4).toFixed(3)}) 60%, transparent 85%)`
            }
            frame = requestAnimationFrame(draw)
        }
        frame = requestAnimationFrame(draw)
        return () => cancelAnimationFrame(frame)
    }, [])
    return (
        <div ref={box} className="fx-beams" aria-hidden="true">
            <div className="fx-tint"></div>
            {[0, 1, 2, 3, 4, 5].map((i) => <div className="fx-beam" key={i} style={{ left: i % 2 === 0 ? "0%" : "100%", transformOrigin: "50% 100%", marginLeft: i % 2 === 0 ? 0 : -2 }}></div>)}
        </div>
    )
}

export default function ReactionsLayer() {
    const beat = useBeat()
    const beat_ref = useRef(beat)
    const layer = useRef(null)
    useEffect(() => {
        beat_ref.current = beat
    })

    useEffect(() => {
        const root = layer.current
        if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
        const params = new URLSearchParams(window.location.search)
        const pinned = { kick: params.get("kick"), snare: params.get("snare"), hat: params.get("hat") }

        const wall = () => document.querySelector(".bg-wall")
        const images = () => Array.from(document.querySelectorAll(".bg-img"))
        const unit = () => clamp(beat_ref.current.get_clock().beat_ms, 250, 1000) // how long one reaction lasts, tied to the tempo

        const state = { invert_wait: INVERT_EVERY[0] + Math.floor(Math.random() * (INVERT_EVERY[1] - INVERT_EVERY[0])), invert_left: 0, inverted: false, invert_timer: 0, slide: 0, parity: { checker: 0, shove: 0, lanes: 0, columns: 0 }, running: new Set(), laser: 0, laser_side: 0, pixel: 0, stream: 0, floor: 0, spark: 0 }
        const lines = Array.from(root.querySelectorAll(".fx-line"))
        const lasers = Array.from(root.querySelectorAll(".fx-laser"))
        const pixels = Array.from(root.querySelectorAll(".fx-pixel"))
        const streams = Array.from(root.querySelectorAll(".fx-stream"))
        const floors = Array.from(root.querySelectorAll(".fx-floor"))
        const play = (el, keyframes, options) => {
            if (!el) return null
            const animation = el.animate(keyframes, { fill: "none", ...options })
            return animation
        }

        // for a moment the images are less see-through (their own opacity is not touched: a play on top of it)
        function solid(time) {
            for (const img of images()) {
                const base = Number(getComputedStyle(img).opacity) || 0.5
                play(img, [{ opacity: Math.min(1, base + 0.45) }, { opacity: base }], { duration: time, easing: "ease-out" })
            }
        }

        // ---- looks for the kick ----
        const looks = {
            // chessboard: half the images grow while the other half shrink, and they swap on the next kick
            checker(strength) {
                state.parity.checker ^= 1
                const big = 1.2 + 0.04 * Math.min(strength, 2)
                for (const img of images()) img.style.scale = (Number(img.dataset.cell) ^ state.parity.checker) === 0 ? String(big) : String(2 - big - 0.04)
            },
            // columns as pistons: the odd columns jump forward along the diagonal while the even ones fall back, then swap
            shove() {
                state.parity.shove ^= 1
                for (const img of images()) {
                    const direction = (Number(img.dataset.lane) ^ state.parity.shove) === 0 ? 1 : -1
                    const distance = (direction * 0.28 * img.offsetWidth) / Math.SQRT2
                    img.style.translate = `${distance}px ${-distance}px`
                }
            },
            // the whole wall punches out and flashes, then settles
            flash(strength) {
                const el = wall()
                if (state.flash) state.flash.cancel()
                state.flash = play(el, [
                    { scale: 1 + 0.05 * Math.min(strength, 2), filter: "brightness(1.9) saturate(1.4)" },
                    { scale: 1, filter: "brightness(1) saturate(1)" },
                ], { duration: unit() * 0.8, easing: "cubic-bezier(0.1, 0.7, 0.3, 1)" })
                solid(unit() * 0.8)
            },
            // one line leaves each side and drifts inward, thick at first and thinning out until it is gone (like the logo's ring)
            lines() {
                const width = root.clientWidth
                const travel = width * 0.32
                const time = unit() * 1.1
                play(lines[0], [
                    { transform: "translateX(0)", width: "18px", opacity: 0.95 },
                    { transform: `translateX(${travel}px)`, width: "3px", opacity: 0 },
                ], { duration: time, easing: "cubic-bezier(0.15, 0.6, 0.3, 1)" })
                play(lines[1], [
                    { transform: "translateX(0)", width: "18px", opacity: 0.95 },
                    { transform: `translateX(${-travel}px)`, width: "3px", opacity: 0 },
                ], { duration: time, easing: "cubic-bezier(0.15, 0.6, 0.3, 1)" })
            },
            // the whole grid steps one column toward the bottom-right on every kick; the column that leaves at the
            // bottom-right comes back in at the top-left (both are off-screen), so it looks like an endless grid
            slide() {
                const el = wall()
                if (!el) return
                const pitch = Number(el.dataset.pitch)
                const count = Number(el.dataset.lanes)
                if (!pitch || !count) return
                state.slide = (state.slide + 1) % count
                const along = pitch / Math.SQRT2
                for (const item of el.querySelectorAll(".bg-drift")) {
                    const j = Number(item.dataset.j)
                    const target = (j + state.slide) % count - j // columns moved, counted from where this one started
                    const wrapped = item.dataset.at !== undefined && Number(item.dataset.at) > target + 1
                    if (wrapped) item.style.transition = "none"
                    item.style.setProperty("--lx", `${target * along}px`)
                    item.style.setProperty("--ly", `${target * along}px`)
                    item.dataset.at = String(target)
                    if (wrapped) {
                        void item.offsetWidth
                        item.style.removeProperty("transition")
                    }
                }
            },
            // alternate columns light up and the others dim, swapping on every kick
            lanes() {
                state.parity.lanes ^= 1
                for (const img of images()) img.style.opacity = (Number(img.dataset.lane) ^ state.parity.lanes) === 0 ? "0.95" : "0.22"
            },

            // ---- looks for the snare ----
            // a bright line sweeps across at a random height and angle, from alternating sides
            laser(strength) {
                const el = lasers[state.laser++ % lasers.length]
                if (!el) return
                state.laser_side ^= 1
                const from_left = state.laser_side === 0
                const angle = (Math.random() * 2 - 1) * 24
                el.style.top = `${12 + Math.random() * 76}%`
                el.style.transformOrigin = from_left ? "left center" : "right center"
                const time = unit() * 0.9
                play(el, [
                    { transform: `rotate(${angle}deg) scaleX(0)`, opacity: 1 },
                    { transform: `rotate(${angle}deg) scaleX(1)`, opacity: 1, offset: 0.28 },
                    { transform: `rotate(${angle}deg) scaleX(1)`, opacity: 0 },
                ], { duration: time * (0.8 + 0.2 * Math.min(strength, 2)), easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" })
            },
            // like the checker, but whole columns: the even ones grow while the odd ones shrink, then swap
            columns() {
                state.parity.columns ^= 1
                for (const img of images()) img.style.scale = (Number(img.dataset.lane) ^ state.parity.columns) === 0 ? "1.25" : "0.8"
            },
            // the title splits into two colours and tilts for a moment
            glitch(strength) {
                const title = document.querySelector(".main-logo")
                const shift = 6 + 4 * Math.min(strength, 2)
                const tilt = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 1.5)
                play(title, [
                    { rotate: `${tilt}deg`, textShadow: `${-shift}px 0 #ff2bd6, ${shift}px 0 #00f0ff`, filter: "brightness(1.6)" },
                    { rotate: `${-tilt / 2}deg`, textShadow: `${shift / 2}px 0 #ff2bd6, ${-shift / 2}px 0 #00f0ff`, filter: "brightness(1.3)", offset: 0.4 },
                    { rotate: "0deg", textShadow: "0 0 0 transparent", filter: "brightness(1)" },
                ], { duration: unit() * 0.55, easing: "steps(5, end)" })
            },
            // the wall's colours spin for a moment
            hue(strength) {
                const el = wall()
                if (state.hue) state.hue.cancel()
                const turn = (Math.floor(Math.random() * 5) + 1) * 60
                state.hue = play(el, [
                    { filter: `hue-rotate(${turn}deg) saturate(${1.8 + 0.3 * Math.min(strength, 2)}) brightness(1.5)` },
                    { filter: "hue-rotate(0deg) saturate(1) brightness(1)" },
                ], { duration: unit() * 0.8, easing: "ease-out" })
                solid(unit() * 0.8)
            },
            // little squares burst out of the logo
            pixels(strength) {
                const badge = document.querySelector(".pixel_logo_gif")
                if (!badge) return
                const box = badge.getBoundingClientRect()
                const base = root.getBoundingClientRect()
                const cx = box.left + box.width / 2 - base.left
                const cy = box.top + box.height / 2 - base.top
                const count = 8 + Math.round(4 * Math.min(strength, 2))
                for (let i = 0; i < count; i++) {
                    const el = pixels[state.pixel++ % pixels.length]
                    const angle = Math.random() * Math.PI * 2
                    const distance = box.width * (0.7 + Math.random() * 1.4)
                    el.style.left = `${cx - 5}px`
                    el.style.top = `${cy - 5}px`
                    el.style.background = PIXEL_COLORS[Math.floor(Math.random() * PIXEL_COLORS.length)]
                    play(el, [
                        { transform: "translate(0, 0) scale(1)", opacity: 1 },
                        { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0.3)`, opacity: 0 },
                    ], { duration: unit() * (0.9 + Math.random() * 0.6), easing: "cubic-bezier(0.1, 0.7, 0.3, 1)" })
                }
            },
        }

        // ---- looks for the hi-hat (small ones: they come often) ----
        looks.twinkle = () => {
            const list = images()
            const img = list[Math.floor(Math.random() * list.length)]
            if (!img) return
            play(img, [{ opacity: 1, filter: "brightness(1.8)" }, { opacity: 0.5, filter: "brightness(1)" }], { duration: 160, easing: "ease-out" })
        }
        // a few specks light up where they are and go out
        looks.sparks = () => {
            const width = root.clientWidth
            const height = root.clientHeight
            for (let i = 0; i < 3; i++) {
                const el = pixels[state.spark++ % pixels.length]
                el.style.left = `${Math.random() * width}px`
                el.style.top = `${Math.random() * height}px`
                el.style.background = "#ffffff"
                play(el, [{ opacity: 1, transform: "scale(0.5)" }, { opacity: 0, transform: "scale(1.4)" }], { duration: 220, easing: "ease-out" })
            }
        }
        // a short thin tick of light at a random height (a small cousin of the laser)
        looks.tick = () => {
            const el = lasers[state.laser++ % lasers.length]
            if (!el) return
            el.style.top = `${8 + Math.random() * 84}%`
            el.style.transformOrigin = Math.random() < 0.5 ? "left center" : "right center"
            play(el, [
                { transform: "scaleX(0)", opacity: 0.8 },
                { transform: "scaleX(0.22)", opacity: 0.8, offset: 0.4 },
                { transform: "scaleX(0.22)", opacity: 0 },
            ], { duration: 140, easing: "ease-out" })
        }

        // put back what the looks that stay on (scale, shift, opacity) changed
        function clean_wall() {
            for (const img of images()) {
                img.style.removeProperty("scale")
                img.style.removeProperty("translate")
                img.style.removeProperty("opacity")
            }
            state.slide = 0
            for (const item of document.querySelectorAll(".bg-drift")) {
                item.style.removeProperty("--lx")
                item.style.removeProperty("--ly")
                delete item.dataset.at
            }
        }

        // a second look on top of the main one: always for the colour-only looks (flash, hue) so they never stop the
        // images from moving, and now and then for the others. Two looks never change the same property.
        const with_extras = (base) => {
            const used = new Set([CONFLICTS[base.kick], CONFLICTS[base.snare]])
            const extra = { kick: null, snare: null }
            for (const [kind, list, colour] of [["kick", KICKS, "flash"], ["snare", SNARES, "hue"]]) {
                if (base[kind] !== colour && Math.random() > 0.3) continue
                const options = list.filter((name) => name !== base[kind] && !(CONFLICTS[name] && used.has(CONFLICTS[name])) && name !== colour)
                if (!options.length) continue
                extra[kind] = options[Math.floor(Math.random() * options.length)]
                used.add(CONFLICTS[extra[kind]])
            }
            return { ...base, extra }
        }
        let scene = with_extras({ kick: pinned.kick && KICKS.includes(pinned.kick) ? pinned.kick : pick(KICKS), snare: pinned.snare && SNARES.includes(pinned.snare) ? pinned.snare : pick(SNARES), hat: pinned.hat && HATS.includes(pinned.hat) ? pinned.hat : pick(HATS) })
        const show = () => {
            root.dataset.kick = scene.kick
            root.dataset.snare = scene.snare
            root.dataset.hat = scene.hat
            root.dataset.extra = `${scene.extra.kick || "-"},${scene.extra.snare || "-"}`
        }
        show()

        const title_swap = () => {
            const title = document.querySelector(".main-logo")
            if (!title) return
            if (state.invert_left === 0) {
                if (--state.invert_wait > 0) return
                state.invert_left = [4, 8, 12, 16][Math.floor(Math.random() * 4)] // always an even number of swaps (ends normal), in whole bars of snares
                state.invert_wait = INVERT_EVERY[0] + Math.floor(Math.random() * (INVERT_EVERY[1] - INVERT_EVERY[0]))
            }
            state.inverted = !state.inverted
            state.invert_left--
            title.classList.toggle("is-inverted", state.inverted)
            // the snares stopped half-way through: do not leave the title swapped
            clearTimeout(state.invert_timer)
            if (state.inverted) state.invert_timer = setTimeout(() => { state.inverted = false; state.invert_left = 0; title.classList.remove("is-inverted") }, 3000)
        }

        const hit = (kind, strength) => {
            const look = looks[scene[kind]]
            if (look) look(strength)
            const extra = scene.extra && looks[scene.extra[kind]]
            if (extra) extra(strength)
            // the thin laser is the favourite: it also goes off on most snares, whatever the snare look is
            if (kind === "snare" && scene.snare !== "laser" && Math.random() < LASER_ALONGSIDE) looks.laser(Math.min(strength, 1.2))
            // now and then the title swaps its colours (cyan letters with a black edge <-> black letters with a cyan edge)
            if (kind === "snare") title_swap()
        }
        const stop_hits = on_hit(hit)

        // one step per beat of the clock: a new look every 16 beats, and the made-up hits when no sound is being followed
        let last_index = null
        let frame = 0
        const levels = make_levels(beat_ref, params.get("bands") === "manual") // ?bands=manual: for trying things out with levels set by hand
        // The big laser (full opacity): rare, wide, from the middle of the logo (above the images, below the logo). It shows up for a
        // few seconds when the sound has been holding, changes its width, and starts to turn when the tone of the music
        // changes: it speeds up and slows down at a constant rate, so the turn is smooth.
        const thick = root.querySelector(".fx-thick")
        const big = { level: 0, start: 0, on: false, until: 0, next: performance.now() + 6000, fade: 0, angle: Math.random() * 180, omega: 0, dir: 1, spin_until: 0, phase: 0, fast: null, slow: null, cool: 0 }
        const demo = params.get("thick") === "demo"
        const OMEGA_MAX = 70 // degrees per second
        const ALPHA = 40 // degrees per second, every second
        const run_big = (now, dt, lv) => {
            if (!thick) return
            if (!big.on && now > big.next && (demo || (lv.followed && lv.sustain > 0.5))) {
                big.on = true
                big.start = now
                big.level = lv.sustain
                big.until = now + 5000 + Math.random() * 4000
                big.next = big.until + (demo ? 1500 : 12000 + Math.random() * 14000)
            }
            // while the sound that brought it in is still relatively strong, it stays (up to 90 s)
            if (big.on && !demo && lv.followed && lv.sustain >= Math.max(0.4, 0.75 * big.level) && now - big.start < 90000) big.until = Math.max(big.until, now + 1500)
            if (big.on && now > big.until) big.on = false
            big.fade += ((big.on ? 1 : 0) - big.fade) * (1 - Math.exp(-dt / 400))
            // a change of tone (the weight of the sound moving up or down) sets it turning
            const tone = get_tone()
            if (big.fast === null) { big.fast = tone; big.slow = tone }
            big.fast += (tone - big.fast) * (1 - Math.exp(-dt / 250))
            big.slow += (tone - big.slow) * (1 - Math.exp(-dt / 2500))
            const changed = Math.abs(big.fast - big.slow) > 0.06 || (demo && Math.floor(now / 5000) !== Math.floor((now - dt) / 5000))
            if (big.on && changed && now > big.cool) {
                big.dir = big.fast > big.slow ? 1 : -1
                if (demo) big.dir = Math.random() < 0.5 ? 1 : -1
                big.spin_until = now + 2500 + Math.random() * 2000
                big.cool = big.spin_until + 1000
            }
            const target_omega = now < big.spin_until ? big.dir * OMEGA_MAX : 0
            const step = ALPHA * (dt / 1000)
            big.omega += Math.max(-step, Math.min(step, target_omega - big.omega))
            big.angle += big.omega * (dt / 1000)
            big.phase += (dt / 1000) * 0.7
            if (big.fade < 0.01) { thick.style.opacity = "0"; return }
            const badge = document.querySelector(".pixel_logo_gif")
            if (badge) {
                const box = badge.getBoundingClientRect()
                const base = root.getBoundingClientRect()
                thick.style.left = `${box.left + box.width / 2 - base.left}px`
                thick.style.top = `${box.top + box.height / 2 - base.top}px`
            }
            const opening = 260 * Math.exp(-(now - big.start) / 1600) // starts extra thick and settles
            const phone = clamp(window.innerWidth / 900, 0.3, 1) // thinner on a phone
            const width = phone * (120 + 110 * (0.5 + 0.5 * Math.sin(big.phase)) + 80 * lv[0] + opening)
            thick.style.width = `${width.toFixed(0)}px`
            thick.style.marginLeft = `${(-width / 2).toFixed(0)}px`
            thick.style.transform = `rotate(${big.angle.toFixed(2)}deg)`
            thick.style.opacity = big.fade.toFixed(3)
        }
        let last_now = 0
        let stream_debt = 0
        let floor_debt = 0
        let drift_at = -1e9
        let drifts = []
        let drift_rate = 1
        // ---- breaks and drops ----
        // A break: the sound has been much quieter for a moment after being loud. A drop: it comes back loud all at once
        // (right after a break, or any big jump). In a break the wall dims, the pulse of the logo gets smaller and the
        // effects calm down; a drop makes a flash, shock rings, a burst of pixels, the big laser, a fast grid and a glitch.
        const song = { fast: 0, history: [], hist_at: 0, quiet_since: 0, size: 1, in_break: false, break_at: 0, drop_at: -1e9, peak: 0, pulse: 1, calm: 0 }
        const flash_el = root.querySelector(".fx-flash")
        const shocks = Array.from(root.querySelectorAll(".fx-shock"))
        const do_drop = (now, lv) => {
            song.drop_at = now
            song.in_break = false
            song.calm = 0
            if (flash_el) play(flash_el, [{ opacity: 0.8 }, { opacity: 0 }], { duration: 500, easing: "ease-out" })
            const badge = document.querySelector(".pixel_logo_gif")
            const base = root.getBoundingClientRect()
            if (badge) {
                const box = badge.getBoundingClientRect()
                const reach = Math.hypot(root.clientWidth, root.clientHeight) / 200
                shocks.forEach((el, i) => {
                    el.style.left = `${box.left + box.width / 2 - base.left}px`
                    el.style.top = `${box.top + box.height / 2 - base.top}px`
                    play(el, [{ transform: "scale(0.4)", opacity: 0.9, borderWidth: "14px" }, { transform: `scale(${reach})`, opacity: 0, borderWidth: "3px" }], { duration: 1100, delay: i * 140, easing: "cubic-bezier(0.1, 0.6, 0.3, 1)", fill: "backwards" })
                })
            }
            looks.pixels(2)
            setTimeout(() => looks.pixels(2), 120)
            setTimeout(() => looks.pixels(2), 260)
            looks.glitch(2)
            big.on = true
            big.start = now
            big.level = lv.sustain
            big.until = Math.max(big.until, now + 7000)
            big.next = Math.max(big.next, big.until + 9000)
        }
        const run_song = (now, dt, lv) => {
            if (!lv.followed) {
                song.pulse += (1 - song.pulse) * 0.05
                song.size += (1 - song.size) * 0.05
                document.documentElement.style.setProperty("--pulse", song.pulse.toFixed(3))
                document.documentElement.style.setProperty("--size", song.size.toFixed(3))
                if (song.in_break) { song.in_break = false; wall()?.style.removeProperty("opacity") }
                return
            }
            const loud = Math.max(lv[0], lv[1], lv[2] * 0.8)
            song.fast += (loud - song.fast) * (1 - Math.exp(-dt / 220))
            song.peak = Math.max(song.peak * Math.exp(-dt / 20000), lv.sustain)
            // the sustained level a little while ago, to see a jump
            if (now - song.hist_at > 200) {
                song.hist_at = now
                song.history.push(lv.sustain)
                if (song.history.length > 6) song.history.shift()
            }
            const before = song.history.length >= 5 ? song.history[0] : null
            // quiet for 1.2 s after having been loud: a break
            if (lv.sustain < 0.28 && song.peak > 0.5) { song.quiet_since = song.quiet_since || now } else { song.quiet_since = 0 }
            if (!song.in_break && song.quiet_since && now - song.quiet_since > 1200) {
                song.in_break = true
                song.break_at = now
                const el = wall()
                if (el) el.style.opacity = "0.4"
            }
            const cooled = now - song.drop_at > 8000
            const jumped = before !== null && lv.sustain - before > 0.3 && lv.sustain > 0.55
            if (cooled && ((song.in_break && now - song.break_at > 1500 && song.fast > 0.7) || jumped)) {
                const el = wall()
                if (el) el.style.removeProperty("opacity")
                do_drop(now, lv)
            } else if (song.in_break && lv.sustain > 0.45) { // back, but not with a bang
                song.in_break = false
                const el = wall()
                if (el) el.style.removeProperty("opacity")
            }
            // very quiet music: the logo's pulse is weaker (1 = normal)
            const pulse_target = 0.55 + 0.45 * clamp(lv.sustain / 0.35, 0, 1)
            song.pulse += (pulse_target - song.pulse) * 0.04
            document.documentElement.style.setProperty("--pulse", song.pulse.toFixed(3))
            // the size of the logo follows how loud it is (a mix of the quick level and the held one)
            const size_target = 0.9 + 0.22 * clamp((0.5 * song.fast + 0.5 * lv.sustain) / 0.8, 0, 1)
            song.size += (size_target - song.size) * (1 - Math.exp(-dt / 120))
            document.documentElement.style.setProperty("--size", song.size.toFixed(3))
            song.calm += ((song.in_break ? 1 : 0) - song.calm) * 0.05
        }
        // squares that flow out of the logo and up from the floor, as many as the sound is loud
        const flow = (now) => {
            const dt = Math.min(0.1, (now - (last_now || now)) / 1000)
            last_now = now
            const lv = levels(now)
            run_big(now, dt * 1000, lv)
            run_song(now, dt * 1000, lv)
            const energy = Math.max(lv[0], lv[1], lv[2] * 0.8)
            const base = root.getBoundingClientRect()
            const badge = document.querySelector(".pixel_logo_gif")
            stream_debt += dt * (8 + 40 * energy) * (1 - 0.7 * song.calm)
            while (stream_debt >= 1) {
                stream_debt -= 1
                const el = streams[state.stream++ % streams.length]
                if (!badge || !el) continue
                const box = badge.getBoundingClientRect()
                const angle = Math.random() * Math.PI * 2
                const start = box.width * 0.3
                const reach = box.width * (0.9 + Math.random() * 1.3) * (0.7 + lv[0])
                el.style.left = `${box.left + box.width / 2 - base.left - 3 + Math.cos(angle) * start}px`
                el.style.top = `${box.top + box.height / 2 - base.top - 3 + Math.sin(angle) * start}px`
                el.style.background = PIXEL_COLORS[Math.floor(Math.random() * PIXEL_COLORS.length)]
                play(el, [
                    { transform: "translate(0, 0) scale(1)", opacity: 1 },
                    { transform: `translate(${Math.cos(angle) * reach}px, ${Math.sin(angle) * reach}px) scale(0.3)`, opacity: 0 },
                ], { duration: 800 + Math.random() * 800, easing: "cubic-bezier(0.2, 0.6, 0.4, 1)" })
            }
            // the wall of images moves faster while the sound is loud (only for real, followed sound)
            if (now - drift_at > 1500) {
                drift_at = now
                drifts = document.getAnimations().filter((a) => a.effect && a.effect.target && a.effect.target.classList && a.effect.target.classList.contains("bg-drift") && a.animationName === "bg-diagonal")
            }
            const spike = 4 * Math.exp(-(now - song.drop_at) / 2500)
            const rate_target = (lv.followed ? 1 + 2.4 * Math.max(0, lv.sustain - 0.3) : 1) + spike
            drift_rate += (rate_target - drift_rate) * 0.04
            for (const a of drifts) a.playbackRate = drift_rate
            floor_debt += dt * (2 + 22 * lv[0] * lv[0] + 6 * lv[1]) * (1 - 0.7 * song.calm)
            while (floor_debt >= 1) {
                floor_debt -= 1
                const el = floors[state.floor++ % floors.length]
                if (!el) continue
                const rise = root.clientHeight * (0.15 + Math.random() * 0.3)
                el.style.left = `${Math.random() * root.clientWidth}px`
                el.style.top = `${root.clientHeight - 8}px`
                el.style.background = PIXEL_COLORS[Math.floor(Math.random() * 2)] // cyan or white
                play(el, [
                    { transform: "translate(0, 0)", opacity: 0.85 },
                    { transform: `translate(${(Math.random() * 2 - 1) * 24}px, ${-rise}px)`, opacity: 0 },
                ], { duration: 1500 + Math.random() * 1000, easing: "ease-out" })
            }
        }
        const tick = (now) => {
            flow(now)
            const current = beat_ref.current
            const clock = current.get_clock()
            const index = Math.floor((now - clock.anchor_perf) / clock.beat_ms)
            if (last_index === null) last_index = index
            if (index !== last_index) {
                const jumped = Math.abs(index - last_index) > 1 // the clock was re-aligned: not a real beat
                last_index = index
                if (!jumped) {
                    if (mod(index, SCENE_BEATS) === 0) {
                        const next = { kick: pinned.kick && KICKS.includes(pinned.kick) ? scene.kick : pick(KICKS, scene.kick), snare: pinned.snare && SNARES.includes(pinned.snare) ? scene.snare : pick(SNARES, scene.snare), hat: pinned.hat && HATS.includes(pinned.hat) ? scene.hat : pick(HATS, scene.hat) }
                        const next_scene = with_extras(next)
                        clean_wall()
                        scene = next_scene
                        show()
                    }
                    const followed = current.mode === "auto" || current.mode === "analyzing"
                    if (!followed) {
                        emit_hit("kick", 1)
                        if (mod(index, 2) === 1) emit_hit("snare", 1)
                        setTimeout(() => emit_hit("hat", 1), clock.beat_ms / 2)
                    }
                }
            }
            frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(frame)
            stop_hits()
            document.documentElement.style.removeProperty("--pulse")
            document.documentElement.style.removeProperty("--size")
            wall()?.style.removeProperty("opacity")
            clearTimeout(state.invert_timer)
            document.querySelector(".main-logo")?.classList.remove("is-inverted")
            clean_wall()
            root.getAnimations({ subtree: true }).forEach((animation) => animation.cancel())
            for (const a of drifts) a.playbackRate = 1
            if (state.flash) state.flash.cancel()
            if (state.hue) state.hue.cancel()
        }
    }, [])

    return (
        <div ref={layer} className="fx-layer" aria-hidden="true">
            <div className="fx-line" style={{ left: 0 }}></div>
            <div className="fx-line" style={{ right: 0 }}></div>
            <div className="fx-flash"></div>
            {[0, 1, 2].map((i) => <div className="fx-shock" key={i}></div>)}
            <div className="fx-thick"></div>
            <div className="fx-laser"></div>
            <div className="fx-laser"></div>
            <div className="fx-laser"></div>
            {Array.from({ length: 24 }, (_, i) => <div className="fx-pixel" key={i}></div>)}
            {Array.from({ length: 64 }, (_, i) => <div className="fx-stream" key={i}></div>)}
            {Array.from({ length: 36 }, (_, i) => <div className="fx-floor" key={i}></div>)}
        </div>
    )
}

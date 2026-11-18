import { useEffect, useRef } from "react"
import { useBeat } from "../music/useBeat"
import { emit_hit, on_hit, get_bands, get_tone } from "../music/reactor"
import { S, subscribe_settings } from "../music/settings"
import { rhythm_on, streak_factor } from "../music/perf"
import { register_manual, thick as manual_thick } from "../music/manual"

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
const HATS = ["twinkle", "sparks", "tick", "blink"]
// Every so often the title swaps its colours on a run of snares, 4, 8, 12 or 16 of them, one swap per snare, so it
// goes back to normal at the end: cyan letters with a black edge <-> black letters with a cyan edge.
const INVERT_EVERY = [20, 40] // snares to wait between those runs (min, max)
// (S in music/settings.js holds every number that can be tuned: laser_alongside, scene_beats, extras_chance, fx_*, show_*, drop_*, ...)
const WALL_LOOKS = new Set(["checker", "shove", "flash", "slide", "lanes", "columns", "hue", "twinkle"]) // change the images
const TITLE_LOOKS = new Set(["glitch", "blink"])
const PIXEL_LOOKS = new Set(["pixels", "sparks"])
const LASER_LOOKS = new Set(["laser", "tick", "lines"])
// the big laser's strength, 0 when rhythm is switched off
const fx_thick = () => (rhythm_on() ? S.fx_thick : 0)
const MIN_GAP_MS = 25 // the same kind of hit never reacts twice within this (keeps a silly sensitivity from burying the page)

const clamp = (value, low, high) => Math.min(high, Math.max(low, value))
// least-squares line through evenly spaced values: slope per second (step = seconds between values), how well it
// fits (r2, 1 = a straight line) and how far it climbs from the first to the last value
function fit_line(values, step) {
    const n = values.length
    let sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0
    for (let i = 0; i < n; i++) {
        const x = i * step
        sx += x; sy += values[i]; sxy += x * values[i]; sxx += x * x; syy += values[i] * values[i]
    }
    const denom = n * sxx - sx * sx
    const slope = denom ? (n * sxy - sx * sy) / denom : 0
    const ss_tot = syy - (sy * sy) / n
    const ss_res = ss_tot - slope * (sxy - (sx * sy) / n)
    return { slope, r2: ss_tot > 1e-9 ? 1 - ss_res / ss_tot : 0, rise: values[n - 1] - values[0] }
}
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
        let hat_glow = 0 // the thin beams flash a little on every hi-hat
        const stop_hats = on_hit((kind) => { if (kind === "hat") hat_glow = 1 })
        let last = 0
        let frame = 0
        const draw = (now) => {
            const dt = Math.min(100, now - (last || now))
            last = now
            hat_glow *= Math.exp(-dt / 150)
            const lv = levels(now)
            const sparkle = Math.min(1, lv[3] * 0.9 + lv[4] * 0.7 + lv[0] * 0.3)
            beams.forEach((el, i) => {
                const side = i % 2 === 0 ? 1 : -1 // left corner leans right, right corner leans left
                const sweep = Math.sin(now / (3200 + i * 700) + i * 1.7) // slow
                const target = side * (18 + 26 * (i / beams.length)) + sweep * (8 + 8 * lv.sustain)
                angles[i] = angles[i] === null ? target : angles[i] + (target - angles[i]) * 0.05 // eased, no jerks
                el.style.transform = `rotate(${angles[i].toFixed(2)}deg)`
                const wanted = (0.04 + 0.3 * sparkle * (0.5 + 0.5 * Math.abs(sweep)) + 0.22 * hat_glow) * S.fx_thin // subtle: they are always there
                el.style.opacity = String(Math.min(1, wanted))
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
                const alpha = Math.min(1, mood.alpha * S.fx_tint)
                tint.style.background = `radial-gradient(ellipse at 50% 55%, hsla(${mood.hue.toFixed(1)}, 85%, 52%, ${alpha.toFixed(3)}), hsla(${mood.hue.toFixed(1)}, 85%, 40%, ${(alpha * 0.4).toFixed(3)}) 60%, transparent 85%)`
            }
            frame = requestAnimationFrame(draw)
        }
        frame = requestAnimationFrame(draw)
        return () => {
            cancelAnimationFrame(frame)
            stop_hats()
        }
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
    // the "logo" switch (settings): a class on <html> turns the logo's beat animation off (see index.css)
    useEffect(() => {
        const html = document.documentElement
        const apply = () => html.classList.toggle("fx-no-logo", !S.show_logo)
        apply()
        const stop = subscribe_settings(apply)
        return () => { stop(); html.classList.remove("fx-no-logo") }
    }, [])

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

        // flashes per second are limited (S.flash_per_s, 0 = no limit): a look that would flash is skipped when the limit is reached
        const flash_times = []
        const flash_ok = () => {
            const now = performance.now()
            while (flash_times.length && now - flash_times[0] > 1000) flash_times.shift()
            if (S.flash_per_s > 0 && flash_times.length >= S.flash_per_s) return false
            flash_times.push(now)
            return true
        }
        // may this look run, with the "where effects show" switches and the thin laser strength?
        const allowed = (name) => {
            if (WALL_LOOKS.has(name)) return S.show_wall
            if (TITLE_LOOKS.has(name)) return S.show_title
            if (PIXEL_LOOKS.has(name)) return S.show_pixels
            if (LASER_LOOKS.has(name)) return S.fx_thin > 0 && (S.fx_thin >= 1 || Math.random() < S.fx_thin)
            return true
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
                if (!flash_ok()) return
                const el = wall()
                if (state.flash) state.flash.cancel()
                state.flash = play(el, [
                    { scale: 1 + 0.05 * Math.min(strength, 2), filter: `brightness(${1 + 0.9 * S.flash_power}) saturate(${1 + 0.4 * S.flash_power})` },
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
                if (!flash_ok()) return
                const el = wall()
                if (state.hue) state.hue.cancel()
                const turn = (Math.floor(Math.random() * 5) + 1) * 60
                state.hue = play(el, [
                    { filter: `hue-rotate(${turn}deg) saturate(${1.8 + 0.3 * Math.min(strength, 2)}) brightness(${1 + 0.5 * S.flash_power})` },
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
                const count = Math.min(48, Math.round((8 + 4 * Math.min(strength, 2)) * Math.min(S.fx_pixels, 4)))
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
        // the title blinks white for a moment
        looks.blink = () => {
            if (!flash_ok()) return
            play(document.querySelector(".main-logo"), [{ color: "#ffffff" }, { color: "#ffffff" }], { duration: 90, easing: "steps(1, end)" })
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
                if (base[kind] !== colour && Math.random() > S.extras_chance) continue
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
            if (!title || S.title_swap_every <= 0) return
            if (state.invert_left === 0) {
                if (--state.invert_wait > 0) return
                state.invert_left = [4, 8, 12, 16][Math.floor(Math.random() * 4)] // always an even number of swaps (ends normal), in whole bars of snares
                state.invert_wait = Math.max(1, Math.round((INVERT_EVERY[0] + Math.floor(Math.random() * (INVERT_EVERY[1] - INVERT_EVERY[0]))) * S.title_swap_every))
            }
            state.inverted = !state.inverted
            state.invert_left--
            title.classList.toggle("is-inverted", state.inverted)
            // the snares stopped half-way through: do not leave the title swapped
            clearTimeout(state.invert_timer)
            if (state.inverted) state.invert_timer = setTimeout(() => { state.inverted = false; state.invert_left = 0; title.classList.remove("is-inverted") }, 3000)
        }

        const last_hit = { kick: 0, snare: 0, hat: 0 }
        const hit = (kind, strength) => {
            if (!rhythm_on()) return
            // the strength of this kind (settings: fx_kick, fx_snare, fx_hat): 0 = off, below 1 = weaker and rarer
            const sens = S[`fx_${kind}`]
            if (!(sens > 0) || (sens < 1 && Math.random() > sens)) return
            const at = performance.now()
            if (at - last_hit[kind] < MIN_GAP_MS) return
            last_hit[kind] = at
            strength *= sens
            for (const name of [scene[kind], scene.extra && scene.extra[kind]]) {
                if (name && looks[name] && allowed(name)) looks[name](strength)
            }
            // the thin laser is the favourite: it also goes off on most snares, whatever the snare look is
            if (kind === "snare" && scene.snare !== "laser" && allowed("laser") && Math.random() < S.laser_alongside) looks.laser(Math.min(strength, 1.2))
            // now and then the title swaps its colours (cyan letters with a black edge <-> black letters with a cyan edge)
            if (kind === "snare" && S.show_title) title_swap()
        }
        const stop_hits = on_hit(hit)
        let stop_manual = () => {}

        // one step per beat of the clock: a new look every 16 beats, and the made-up hits when no sound is being followed
        let last_index = null
        let frame = 0
        const levels = make_levels(beat_ref, params.get("bands") === "manual") // ?bands=manual: for trying things out with levels set by hand
        // The big laser (full opacity): rare, wide, from the middle of the logo (above the images, below the logo). It shows up for a
        // few seconds when the sound has been holding, changes its width, and starts to turn when the tone of the music
        // changes: it speeds up and slows down at a constant rate, so the turn is smooth.
        const thick = root.querySelector(".fx-thick")
        // thin bright streaks that run along the big laser, away from the logo in both directions: it looks like the beam is really firing
        const streaks = Array.from(root.querySelectorAll(".fx-streak"))
        let streak_at = 0
        let streak_debt = 0
        const big = { level: 0, start: 0, on: false, until: 0, next: performance.now() + 6000, fade: 0, angle: Math.random() * 180, omega: 0, dir: 1, spin_until: 0, phase: 0, fast: null, slow: null, cool: 0 }
        const demo = params.get("thick") === "demo"
        const OMEGA_MAX = 70 // degrees per second
        const ALPHA = 40 // degrees per second, every second
        const zoom = { level: 0, open: false, open_until: 0, busy_open: false, busy_since: 0, calm_since: 0, shown: "" } // open space: how far in (0..1), the state, and since when the laser has been up / down
        const run_big = (now, dt, lv) => {
            if (!thick) return
            if (manual_thick.on && fx_thick() > 0) {
                if (!big.on) { big.on = true; big.start = now; big.level = 0.6 }
                big.until = now + 1500
                big.next = Math.max(big.next, now + 8000)
            }
            if (big.on && fx_thick() <= 0) big.on = false
            if (!big.on && fx_thick() > 0 && now > big.next && (demo || (lv.followed && lv.sustain > 0.5))) {
                big.on = true
                big.start = now
                big.level = lv.sustain
                big.until = now + 5000 + Math.random() * 4000
                big.next = big.until + (demo ? 1500 : (12000 + Math.random() * 14000) * S.thick_pause)
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
            const target_omega = manual_thick.on ? big.dir * OMEGA_MAX * manual_thick.amount : now < big.spin_until ? big.dir * OMEGA_MAX : 0
            const step = ALPHA * (dt / 1000)
            big.omega += Math.max(-step, Math.min(step, target_omega - big.omega))
            big.angle += big.omega * (dt / 1000)
            big.phase += (dt / 1000) * 0.7
            // "Open space": the wall images shrink to a fixed size, far apart, and move faster; the page itself always fills the screen.
            // It opens in a drop and stays open for hold_bars bars (or, with hold_busy, while the big laser has been up for a while).
            // Only two states, "normal" and "open", and the change between them is a straight line in time, so it never wobbles.
            const stage = root.parentElement
            const depth_max = clamp(S.hold_zoom, 0, 0.5)
            if (big.on) { zoom.calm_since = 0; if (!zoom.busy_since) zoom.busy_since = now } else { zoom.busy_since = 0; if (!zoom.calm_since) zoom.calm_since = now }
            if (!S.hold_busy) zoom.busy_open = false
            else if (!zoom.busy_open && zoom.busy_since && now - zoom.busy_since > S.hold_wait * 1000) zoom.busy_open = true
            else if (zoom.busy_open && zoom.calm_since && now - zoom.calm_since > S.hold_leave * 1000) zoom.busy_open = false
            zoom.open = rhythm_on() && depth_max > 0.001 && (S.hold_force || now < zoom.open_until || zoom.busy_open)
            zoom.level = clamp(zoom.level + (zoom.open ? dt / (Math.max(0.2, S.hold_in) * 1000) : -dt / (Math.max(0.2, S.hold_out) * 1000)), 0, 1)
            const key = `${depth_max}|${zoom.level.toFixed(3)}|${S.hold_thin}|${S.hold_fill}`
            if (stage && zoom.shown !== key) {
                zoom.shown = key
                stage.style.setProperty("--zoom-items", (1 - depth_max * zoom.level).toFixed(4))
                stage.style.setProperty("--zoom-logo", (1 - depth_max * 0.5 * zoom.level).toFixed(4)) // the logo shrinks half as much
                stage.style.setProperty("--open-level", zoom.level.toFixed(3))
                stage.style.setProperty("--open-thin", String(clamp(S.hold_thin, 0, 1))) // how many of the wall images go away in the open space
                stage.style.setProperty("--open-fill", String(clamp(S.hold_fill, 0, 1))) // how much the second set fills the gaps
            }
            if (big.fade < 0.01) { thick.style.opacity = "0"; return }
            const badge = document.querySelector(".pixel_logo_gif")
            let logo_diameter = Infinity
            if (badge) {
                const box = badge.getBoundingClientRect()
                logo_diameter = Math.min(badge.offsetWidth, badge.offsetHeight) * (1 - depth_max * 0.5 * zoom.level) // layout size (not changed by the logo's own pulse), times the open-space shrink of the logo
                const base = root.getBoundingClientRect()
                thick.style.left = `${box.left + box.width / 2 - base.left}px`
                thick.style.top = `${box.top + box.height / 2 - base.top}px`
            }
            const opening = 260 * Math.exp(-(now - big.start) / 1600) // starts extra thick and settles
            const phone = clamp(window.innerWidth / 900, 0.3, 1) // thinner on a phone
            const hand = manual_thick.on ? 0.35 + 1.65 * manual_thick.amount : 1
            // never wider than 95% of the logo's diameter, whatever the settings
            const width = Math.min(0.95 * logo_diameter, hand * fx_thick() * phone * (120 + 110 * (0.5 + 0.5 * Math.sin(big.phase)) + 80 * lv[0] + opening))
            thick.style.width = `${width.toFixed(0)}px`
            thick.style.marginLeft = `${(-width / 2).toFixed(0)}px`
            thick.style.transform = `rotate(${big.angle.toFixed(2)}deg)`
            thick.style.opacity = big.fade.toFixed(3)
            // the streaks are children of the beam, so they turn with it and fade with it
            streak_debt = Math.min(6, streak_debt + (dt / 1000) * (12 + 26 * lv[0]) * big.fade * Math.min(S.fx_streaks, 4) * streak_factor())
            const reach = Math.hypot(window.innerWidth, window.innerHeight) * 0.7
            while (streak_debt >= 1 && streaks.length) {
                streak_debt -= 1
                const el = streaks[streak_at++ % streaks.length]
                const direction = Math.random() < 0.5 ? -1 : 1
                const length = 70 + Math.random() * 170
                el.style.left = `${4 + Math.random() * 92}%`
                el.style.height = `${length.toFixed(0)}px`
                el.style.marginTop = `${(-length / 2).toFixed(0)}px`
                play(el, [
                    { transform: "translateY(0) scaleY(0.3)", opacity: 0 },
                    { transform: `translateY(${direction * reach * 0.15}px) scaleY(1)`, opacity: 1, offset: 0.15 },
                    { transform: `translateY(${direction * reach}px) scaleY(1.7)`, opacity: 0 },
                ], { duration: 700 + Math.random() * 700, easing: "cubic-bezier(0.35, 0.1, 0.9, 0.6)" })
            }
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
        const song = { fast: 0, quiet_since: 0, short: 0, long: 0, hist: [], hist_at: 0, ramp_at: -1e9, log: [], size: 1, in_break: false, break_at: 0, drop_at: -1e9, peak: 0, pulse: 1, calm: 0 }
        if (typeof window !== "undefined") window.__song = song // for the console: __song.in_break, __song.log (the last breaks and drops)
        const flash_el = root.querySelector(".fx-flash")
        const shocks = Array.from(root.querySelectorAll(".fx-shock"))
        // the space around the shrunken page: stars streaming out from the middle of the screen, behind the page
        const warp_stars = (count) => {
            const holder = document.createElement("div")
            holder.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden"
            document.body.insertBefore(holder, document.body.firstChild)
            const reach = Math.hypot(window.innerWidth, window.innerHeight) * 0.6
            for (let i = 0; i < count; i++) {
                const star = document.createElement("div")
                const angle = Math.random() * 360
                const near = 0.05 + Math.random() * 0.25
                star.style.cssText = `position:absolute;left:50%;top:50%;width:${24 + Math.random() * 40}px;height:${Math.random() < 0.3 ? 3 : 2}px;background:${Math.random() < 0.7 ? "#bff" : "#fff"};box-shadow:0 0 6px #0ff;opacity:0;transform-origin:0 50%`
                holder.appendChild(star)
                star.animate([
                    { transform: `rotate(${angle}deg) translateX(${reach * near}px) scaleX(0.2)`, opacity: 0 },
                    { transform: `rotate(${angle}deg) translateX(${reach * (near + 0.35)}px) scaleX(1)`, opacity: 0.9, offset: 0.35 },
                    { transform: `rotate(${angle}deg) translateX(${reach * 1.1}px) scaleX(2.2)`, opacity: 0 },
                ], { duration: 1500 + Math.random() * 900, delay: Math.random() * 700, easing: "cubic-bezier(0.3, 0.1, 0.8, 0.6)", fill: "both" })
            }
            setTimeout(() => holder.remove(), 3400)
        }
        let last_lv = null
        const do_drop = (now, lv) => {
            song.drop_at = now
            song.in_break = false
            song.calm = 0
            const bars_low = Math.max(1, S.hold_bars), bars_high = Math.max(bars_low, S.hold_bars_max)
            zoom.open_until = now + (bars_low + Math.random() * (bars_high - bars_low)) * 4 * beat_ref.current.get_clock().beat_ms // the open space stays for a few bars
            if (!(S.fx_drop > 0) || !rhythm_on()) return // drops are logged and keep their cooldown, but nothing happens
            if (flash_el && flash_ok()) play(flash_el, [{ opacity: Math.min(1, 0.8 * S.flash_power) }, { opacity: 0 }], { duration: 500, easing: "ease-out" })
            // no zoom-out in a drop (it was too heavy): the stars still stream past and the frame flashes cyan
            const stage = root.parentElement
            if (stage) {
                if (S.drop_stars > 0) warp_stars(Math.min(1000, Math.round(S.drop_stars * Math.min(S.fx_drop, 3))))
                play(stage, [
                    { boxShadow: "inset 0 0 0 3px rgba(0,255,255,0.8), inset 0 0 40px 6px rgba(0,255,255,0.4)" },
                    { boxShadow: "inset 0 0 0 0 rgba(0,255,255,0)" },
                ], { duration: 900, easing: "ease-out" })
            }
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
            if (S.show_pixels) {
                looks.pixels(2)
                setTimeout(() => looks.pixels(2), 120)
                setTimeout(() => looks.pixels(2), 260)
            }
            if (S.show_title) looks.glitch(2)
            if (fx_thick() > 0) {
                big.on = true
                big.start = now
                big.level = lv.sustain
                big.until = Math.max(big.until, now + 7000)
                big.next = Math.max(big.next, big.until + 9000 * S.thick_pause)
            }
        }
        const run_song = (now, dt, lv) => {
            if (!lv.followed) {
                song.pulse += (1 - song.pulse) * 0.05
                song.size += (1 - song.size) * 0.05
                document.documentElement.style.setProperty("--pulse", (song.pulse * S.fx_logo).toFixed(3))
                document.documentElement.style.setProperty("--size", song.size.toFixed(3))
                if (song.in_break) { song.in_break = false; wall()?.style.removeProperty("opacity") }
                return
            }
            const loud = Math.max(lv[0], lv[1], lv[2] * 0.8)
            song.fast += (loud - song.fast) * (1 - Math.exp(-dt / 220))
            song.peak = Math.max(song.peak * Math.exp(-dt / 20000), lv.sustain)
            // quiet for 1.2 s after having been loud: a break
            if (lv.sustain < 0.28 * S.break_sens && song.peak > 0.5) { song.quiet_since = song.quiet_since || now } else { song.quiet_since = 0 }
            if (!song.in_break && song.quiet_since && now - song.quiet_since > 1200) {
                song.in_break = true
                song.break_at = now
                song.log.push({ at: Math.round(now), what: "break", sustain: +lv.sustain.toFixed(2) })
                const el = wall()
                if (el) el.style.opacity = String(S.break_dim)
            }
            // How the sound moves. A build-up is a rise that is close to a straight line for 5 s or more (a riser); a drop
            // is a jump up all at once, and it only counts right after a break or the end of a build-up. A kick on its
            // own proves nothing: kicks are also used in build-ups.
            song.short += (loud - song.short) * (1 - Math.exp(-dt / 300))
            song.long += (loud - song.long) * (1 - Math.exp(-dt / 2200))
            if (now - song.hist_at > 250) {
                song.hist_at = now
                song.hist.push(lv.sustain)
                if (song.hist.length > 40) song.hist.shift()
                if (song.hist.length >= 20) {
                    const line = fit_line(song.hist.slice(-20), 0.25)
                    if (line.slope > 0.03 / S.buildup_sens && line.r2 > 0.8 && line.rise > 0.12 / S.buildup_sens) {
                        if (now - song.ramp_at > 6000) song.log.push({ at: Math.round(now), what: "build-up", slope: +line.slope.toFixed(3), r2: +line.r2.toFixed(2) })
                        song.ramp_at = now
                    }
                }
            }
            const armed = now - song.ramp_at < 6000
            const cooled = now - song.drop_at > S.drop_cooldown * 1000
            const long_break = song.in_break && now - song.break_at > 1500
            const jump = song.short - song.long
            if (cooled && (armed || long_break) && jump >= 0.25 / S.drop_sens && song.short > clamp(0.55 / S.drop_sens, 0.15, 0.9)) {
                const el = wall()
                if (el) el.style.removeProperty("opacity")
                song.log.push({ at: Math.round(now), what: armed ? "drop (after build-up)" : "drop (after break)", jump: +jump.toFixed(2), level: +song.short.toFixed(2) })
                song.ramp_at = -1e9
                do_drop(now, lv)
            } else if (song.in_break && lv.sustain > 0.45) { // back, but not with a bang
                song.in_break = false
                const el = wall()
                if (el) el.style.removeProperty("opacity")
            }
            // very quiet music: the logo's pulse is weaker (1 = normal)
            const pulse_target = S.pulse_min + (1 - S.pulse_min) * clamp(lv.sustain / 0.35, 0, 1)
            song.pulse += (pulse_target - song.pulse) * 0.04
            document.documentElement.style.setProperty("--pulse", (song.pulse * S.fx_logo).toFixed(3))
            // the size of the logo follows how loud it is (a mix of the quick level and the held one)
            const size_target = S.size_min + (S.size_max - S.size_min) * clamp((0.5 * song.fast + 0.5 * lv.sustain) / 0.8, 0, 1)
            song.size += (size_target - song.size) * (1 - Math.exp(-dt / 120))
            document.documentElement.style.setProperty("--size", song.size.toFixed(3))
            song.calm += ((song.in_break ? 1 : 0) - song.calm) * 0.05
        }
        // squares that flow out of the logo and up from the floor, as many as the sound is loud
        const flow = (now) => {
            const dt = Math.min(0.1, (now - (last_now || now)) / 1000)
            last_now = now
            const lv = levels(now)
            last_lv = lv
            run_big(now, dt * 1000, lv)
            run_song(now, dt * 1000, lv)
            const energy = Math.max(lv[0], lv[1], lv[2] * 0.8)
            const base = root.getBoundingClientRect()
            const badge = document.querySelector(".pixel_logo_gif")
            const pixel_gain = S.show_pixels ? S.fx_pixels : 0
            stream_debt += dt * (8 + 40 * energy) * (1 - 0.7 * song.calm) * pixel_gain
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
            const spike = 6.5 * S.fx_drop * Math.exp(-(now - song.drop_at) / 3500) // the grid races after a drop, then settles
            const open_rate = 1 + (Math.max(1, S.hold_speed) - 1) * zoom.level // faster still while the open space is on
            const rate_target = Math.min(16, Math.min(12, (lv.followed ? 1 + 2.4 * S.fx_grid * Math.max(0, lv.sustain - 0.3) : 1) + spike) * open_rate)
            drift_rate += (rate_target - drift_rate) * 0.04
            for (const a of drifts) a.playbackRate = drift_rate
            floor_debt += dt * (2 + 22 * lv[0] * lv[0] + 6 * lv[1]) * (1 - 0.7 * song.calm) * pixel_gain
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
                    if (mod(index, Math.max(1, Math.round(S.scene_beats))) === 0) {
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

        stop_manual = register_manual({
            thin: () => { if (looks.laser) looks.laser(1.2) },
            drop: () => { if (last_lv) do_drop(performance.now(), last_lv) },
        })

        return () => {
            cancelAnimationFrame(frame)
            stop_hits()
            stop_manual()
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
            <div className="fx-thick">
                {Array.from({ length: 40 }, (_, i) => <div className="fx-streak" key={i}></div>)}
            </div>
            <div className="fx-laser"></div>
            <div className="fx-laser"></div>
            <div className="fx-laser"></div>
            {Array.from({ length: 24 }, (_, i) => <div className="fx-pixel" key={i}></div>)}
            {Array.from({ length: 64 }, (_, i) => <div className="fx-stream" key={i}></div>)}
            {Array.from({ length: 36 }, (_, i) => <div className="fx-floor" key={i}></div>)}
        </div>
    )
}

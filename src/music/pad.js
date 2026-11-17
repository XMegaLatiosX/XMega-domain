import { useSyncExternalStore } from "react"
import { emit_hit } from "./reactor"

// The pad does more than play what you tap: it listens to the rhythm you play, finds the tempo, and keeps going with
// your pattern (at most one bar, 16 steps), exactly where you left off. You can add hits on top while it plays.
//   pad_press(kind)   a button was pressed: it plays now, is remembered, and may start the loop
//   pad_stop()        end the loop and forget the hits
// The tempo found is handed to the beat clock (BeatProvider), so the logo and the rest of the page pulse with it.
const STEPS = 16
const KINDS = ["kick", "snare", "hat"]
const STRENGTH = { kick: 1.4, snare: 1.3, hat: 0.9 }
const MIN_BEAT_MS = 315 // 190 BPM
const MAX_BEAT_MS = 857 // 70 BPM
const SAME_PHRASE_MS = 2500 // a pause this long and the next hits are a new phrase
const MIN_HITS = 4
const MAX_RESIDUAL = 0.18 // steps: on average the hits may sit this far from the grid

let apply_clock = null // (beat_ms, anchor_ms) => ..., given by BeatProvider
export function attach_pad(fn) {
    apply_clock = fn
}

const state = {
    enabled: true,
    presses: [], // { kind, t }
    looping: false,
    beat_ms: 0,
    a: 0, // the time of grid step 0
    step_ms: 0,
    n_start: 0, // grid number of the first step of the pattern window
    n_next: 0,
    pattern: { kick: new Set(), snare: new Set(), hat: new Set() },
    message: "tap the pad in rhythm (4 hits or more) and it keeps your pattern going",
}
let start_timer = null
let loop_timer = null
let version = 0
const listeners = new Set()
function notify() {
    version++
    listeners.forEach((listener) => listener())
}

const wrap = (x) => x - Math.round(x)

// Finds the tempo and where the 16th grid sits, from the times of the hits. The tempo candidates are not scanned blindly:
// they come from the gaps between hits (a gap is 1, 2, 3, 4, 6, 8, 12 or 16 steps), because hits on the beat alone fit
// many tempos. Among the candidates the one that puts the hits closest to the grid wins; a tie goes to the one near 120 BPM.
export function estimate(times) {
    if (times.length < MIN_HITS) return null
    const sorted = [...times].sort((x, y) => x - y)
    const gaps = []
    for (let i = 1; i < sorted.length; i++) if (sorted[i] - sorted[i - 1] > 80) gaps.push(sorted[i] - sorted[i - 1])
    if (!gaps.length) return null
    let best = null
    for (const gap of gaps) {
        for (const [steps, prior] of [[4, 0], [2, 0.012], [8, 0.012], [1, 0.03], [16, 0.03], [3, 0.07], [6, 0.07], [12, 0.07]]) {
            const beat = (gap * 4) / steps
            if (beat < MIN_BEAT_MS || beat > MAX_BEAT_MS) continue
            const step = beat / 4
            let cx = 0
            let cy = 0
            for (const t of sorted) {
                const angle = (2 * Math.PI * (t % step)) / step
                cx += Math.cos(angle)
                cy += Math.sin(angle)
            }
            const phase = Math.atan2(cy, cx) / (2 * Math.PI)
            let residual = 0
            for (const t of sorted) residual += Math.abs(wrap((t % step) / step - phase))
            residual /= sorted.length
            const score = (residual * step) / 60 + prior + 0.01 * Math.abs(Math.log2(60000 / beat / 120))
            if (!best || score < best.score) best = { score, residual, step, a: phase * step }
        }
    }
    if (!best || best.residual > MAX_RESIDUAL) return null
    // refine: fit a straight line through (grid number, time) of every hit
    const numbers = sorted.map((t) => Math.round((t - best.a) / best.step))
    const n_mean = numbers.reduce((s, v) => s + v, 0) / numbers.length
    const t_mean = sorted.reduce((s, v) => s + v, 0) / sorted.length
    let num = 0
    let den = 0
    numbers.forEach((n, i) => { num += (n - n_mean) * (sorted[i] - t_mean); den += (n - n_mean) ** 2 })
    let step = best.step
    if (den > 0) {
        const fitted = num / den
        if (Math.abs(fitted / best.step - 1) < 0.03) step = fitted
    }
    const a = t_mean - n_mean * step
    return { beat_ms: step * 4, step_ms: step, a, residual: best.residual }
}

function slot_time(n) {
    return state.a + n * state.step_ms
}

function emit_step(index, at) {
    for (const kind of KINDS) {
        if (!state.pattern[kind].has(index)) continue
        const delay = Math.max(0, at - performance.now())
        setTimeout(() => { if (state.looping) emit_hit(kind, STRENGTH[kind], false) }, delay)
    }
}

function loop_tick() {
    const now = performance.now()
    if (slot_time(state.n_next) < now - 250) state.n_next = Math.ceil((now - state.a) / state.step_ms) // the tab slept: skip ahead on the grid
    while (slot_time(state.n_next) <= now + 20) {
        emit_step((((state.n_next - state.n_start) % STEPS) + STEPS) % STEPS, slot_time(state.n_next))
        state.n_next++
    }
}

function try_start() {
    const est = estimate(state.presses.map((press) => press.t))
    if (!est) {
        state.message = state.presses.length < MIN_HITS ? `${state.presses.length} hits so far: keep tapping in rhythm` : "could not find a steady beat: try again, in time with one tempo"
        notify()
        return
    }
    state.step_ms = est.step_ms
    state.beat_ms = est.beat_ms
    state.a = est.a
    const numbers = state.presses.map((press) => Math.round((press.t - est.a) / est.step_ms))
    const last = Math.max(...numbers)
    state.n_start = last - (STEPS - 1)
    state.pattern = { kick: new Set(), snare: new Set(), hat: new Set() }
    state.presses.forEach((press, i) => { if (numbers[i] >= state.n_start) state.pattern[press.kind].add(numbers[i] - state.n_start) })
    const total = KINDS.reduce((sum, kind) => sum + state.pattern[kind].size, 0)
    if (total < 2) { state.message = "not enough hits inside one bar"; notify(); return }
    // the beat falls on the step (every 4th) where most of your kicks and snares are
    const weight = [0, 0, 0, 0]
    state.presses.forEach((press, i) => { weight[((numbers[i] % 4) + 4) % 4] += press.kind === "kick" ? 2 : press.kind === "snare" ? 1.5 : 0.5 })
    let residue = 0
    for (let r = 1; r < 4; r++) if (weight[r] > weight[residue]) residue = r
    const reference = last - ((((last - residue) % 4) + 4) % 4)
    if (apply_clock) apply_clock(est.beat_ms, slot_time(reference))
    state.n_next = Math.max(last + 1, Math.ceil((performance.now() - est.a) / est.step_ms))
    state.looping = true
    clearInterval(loop_timer)
    loop_timer = setInterval(loop_tick, 15)
    state.message = `following your pattern at ${(60000 / est.beat_ms).toFixed(1)} BPM: tap to add hits, stop to end`
    notify()
}

export function pad_press(kind) {
    const now = performance.now()
    emit_hit(kind, STRENGTH[kind], false) // plays right away, like a heard hit
    if (!state.enabled) return
    if (state.looping) {
        // on top of the loop: the hit joins the pattern at the nearest step
        const index = ((Math.round((now - state.a) / state.step_ms) - state.n_start) % STEPS + STEPS) % STEPS
        state.pattern[kind].add(index)
        notify()
        return
    }
    const last = state.presses[state.presses.length - 1]
    if (last && now - last.t > SAME_PHRASE_MS) state.presses = []
    state.presses.push({ kind, t: now })
    state.presses = state.presses.slice(-40)
    clearTimeout(start_timer)
    if (state.presses.length < MIN_HITS) {
        state.message = `${state.presses.length} hit${state.presses.length === 1 ? "" : "s"} so far: keep tapping in rhythm`
        notify()
        return
    }
    state.message = "listening..."
    notify()
    const est = estimate(state.presses.map((press) => press.t))
    start_timer = setTimeout(try_start, est ? Math.min(1100, est.beat_ms * 1.1) : 800) // a short silence after the last hit starts it
}

export function pad_stop() {
    clearTimeout(start_timer)
    clearInterval(loop_timer)
    const was = state.looping
    state.looping = false
    state.presses = []
    state.pattern = { kick: new Set(), snare: new Set(), hat: new Set() }
    state.message = was ? "stopped" : "tap the pad in rhythm (4 hits or more) and it keeps your pattern going"
    notify()
}

export function pad_enable(on) {
    state.enabled = on
    if (!on) pad_stop()
    else notify()
}

// what the panel draws (read it a few times a second)
export function pad_info(now = performance.now()) {
    const step = state.looping ? ((((Math.floor((now - state.a) / state.step_ms) - state.n_start) % STEPS) + STEPS) % STEPS) : -1
    return { enabled: state.enabled, looping: state.looping, bpm: state.beat_ms ? 60000 / state.beat_ms : 0, step, pattern: state.pattern, message: state.message, hits: state.presses.length }
}

export function usePad() {
    return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener) }, () => version, () => version)
}

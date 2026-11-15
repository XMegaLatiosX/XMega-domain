import { useSyncExternalStore } from "react"
import { on_hit } from "./reactor"

// Feedback sound for tuning: a hit sound each time a kick, snare or hat is found, so you can hear what the site hears
// (like the hit sounds in osu!): a punchy thump for the kick, a clap for the snare, a short tick for the hat. A hit filled
// in from the pattern (a ghost) is softer and a bit lower, so it can be told apart.
//
// These sounds are loud and sharp, so when the site follows this tab's sound it would hear them as drum hits. To keep it
// from hearing itself, every sound played is remembered, and a hit "found" in the moments right after one (of a kind
// that sound can set off, see ECHO) is thrown away: is_echo() in BeatProvider. The counter shows how many were thrown away.
let state = { on: false, kick: true, snare: true, hat: true, ghost: true, volume: 100 }
const listeners = new Set()
let context = null
let out = null // everything goes through a limiter, so a loud setting cannot clip
let noise = null
let stop = null

const LENGTH = { kick: 0.26, snare: 0.16, hat: 0.06 }
// which detector channels each sound can wake up (measured with the real detector, see the notes at the end of this file)
// (a kick wakes the kick and snare channels, a clap wakes snare and hat, a tick wakes hat and snare; found 11 ms before to 31 ms
// after the sound started, in tests with a synthetic house and dense-hat background)
const ECHO = { kick: ["kick", "snare"], snare: ["snare", "hat", "kick"], hat: ["snare", "hat"] }
const ECHO_BEFORE_MS = 15 // a hit found this long before the sound was started can still be its echo (timing is not exact)
const ECHO_AFTER_MS = 40
const recent = [] // { at, kind } of the sounds played lately
let echoes = 0

function noise_buffer(ctx) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    return buffer
}

// One hit sound into `destination`, starting at `when` (seconds on ctx's clock). level is 0..1.
export function synth(ctx, destination, noise_source, kind, level, ghost, when) {
    const pitch = ghost ? 0.8 : 1
    const master = ctx.createGain()
    master.gain.value = level * (ghost ? 0.5 : 1)
    master.connect(destination)
    const burst = (at, length, filter_type, hz, q, peak, decay) => {
        const source = ctx.createBufferSource()
        source.buffer = noise_source
        source.loopStart = 0
        const filter = ctx.createBiquadFilter()
        filter.type = filter_type
        filter.frequency.value = hz
        filter.Q.value = q
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0, at)
        gain.gain.linearRampToValueAtTime(peak, at + 0.001)
        gain.gain.exponentialRampToValueAtTime(0.0001, at + decay)
        source.connect(filter)
        filter.connect(gain)
        gain.connect(master)
        source.start(at, Math.random() * 0.5)
        source.stop(at + length)
    }
    if (kind === "kick") {
        // a thump: a sine that drops fast in pitch (no click on the front: a click would wake the snare channel)
        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()
        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(160 * pitch, when)
        oscillator.frequency.exponentialRampToValueAtTime(55 * pitch, when + 0.12)
        gain.gain.setValueAtTime(0, when)
        gain.gain.linearRampToValueAtTime(1, when + 0.002)
        gain.gain.exponentialRampToValueAtTime(0.0001, when + LENGTH.kick)
        oscillator.connect(gain)
        gain.connect(master)
        oscillator.start(when)
        oscillator.stop(when + LENGTH.kick + 0.02)
    } else if (kind === "snare") {
        // a clap: three quick bursts of band-passed noise, the last one rings a bit longer
        burst(when, 0.03, "bandpass", 1500, 1.1, 2, 0.014)
        burst(when + 0.011, 0.03, "bandpass", 1600, 1.1, 2, 0.014)
        burst(when + 0.023, LENGTH.snare, "bandpass", 1400, 0.9, 2.5, 0.11)
    } else {
        // a tick: a very short burst of high noise
        burst(when, LENGTH.hat, "highpass", 7000, 0.7, 0.9, 0.04)
    }
}

function play(kind, strength, ghost) {
    if (!state.on || !state[kind] || (ghost && !state.ghost) || !context) return
    if (context.state === "suspended") context.resume()
    const level = 0.9 * (state.volume / 100) * Math.min(1, Math.max(0.6, strength / 1.5)) // 100% is about as loud as a song
    synth(context, out, noise, kind, level, ghost, context.currentTime)
    const now = performance.now()
    recent.push({ at: now, kind })
    while (recent.length && now - recent[0].at > 1000) recent.shift()
}

// Is a hit that was found at `onset_ms` (performance.now() clock) probably one of our own sounds heard again?
export function is_echo(kind, onset_ms) {
    if (!state.on) return false
    for (const sound of recent) {
        if (!ECHO[sound.kind].includes(kind)) continue
        if (onset_ms >= sound.at - ECHO_BEFORE_MS && onset_ms <= sound.at + ECHO_AFTER_MS) {
            echoes++
            return true
        }
    }
    return false
}
export function echo_count() {
    return echoes
}

export function set_beeps(patch) {
    const was_on = state.on
    state = { ...state, ...patch }
    if (state.on && !was_on) {
        // must start from a click (the browser keeps the sound off until the visitor has done something)
        if (!context) {
            context = new (window.AudioContext || window.webkitAudioContext)()
            out = context.createDynamicsCompressor()
            out.threshold.value = -6
            out.ratio.value = 12
            out.connect(context.destination)
            noise = noise_buffer(context)
        }
        if (context.state === "suspended") context.resume()
        stop = on_hit(play)
    } else if (!state.on && was_on && stop) {
        stop()
        stop = null
    }
    listeners.forEach((listener) => listener())
}

function subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function useBeeps() {
    return useSyncExternalStore(subscribe, () => state, () => state)
}

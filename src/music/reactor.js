// A tiny event bus for drum hits, so the music side (beat-worker -> BeatProvider) and the visual side
// (components/reactions-layer.jsx, the dock's K/S lights) do not need to know about each other.
//   on_hit((kind, strength, ghost) => ...)   kind is "kick", "snare" or "hat"; strength is about 1 for a normal hit, up to 4
//   emit_hit(kind, strength, ghost)   ghost = filled in from the pattern, not heard
const listeners = new Set()

// how loud each part of the sound is right now, 0..1: [low, body, mid, crack, air]. Kept here, not sent as events:
// the visual side reads it whenever it draws a frame (a few times a second it is refreshed by the BeatProvider).
const bands = new Float32Array(5)
let tone = 0.5 // where the weight of the sound sits, 0 = low .. 1 = high
const bars = new Float32Array(24) // the same, for each of the 24 bands (what the data panel draws)
export function set_bands(values, new_tone = 0.5, new_bars = null) {
    for (let i = 0; i < 5; i++) bands[i] = values[i]
    tone = new_tone
    if (new_bars) for (let i = 0; i < 24; i++) bars[i] = new_bars[i]
}
export function get_bars() {
    return bars
}
export function get_tone() {
    return tone
}
export function get_bands() {
    return bands
}

export function on_hit(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function emit_hit(kind, strength = 1, ghost = false) {
    for (const listener of listeners) listener(kind, strength, ghost)
}

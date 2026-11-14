// Runs off the main thread: reads the shared tab's audio, finds the tempo and the beat positions.
// In:  { type: "start", readable }  (a stream of AudioData from MediaStreamTrackProcessor) | { type: "stop" }
//      { type: "reset" }  forget the tempo found so far and listen again (a new song started)
// Out: { type: "state", bpm, beat_ms, anchor_wall_ms, confidence }  (anchor = wall-clock time of one beat, epoch ms)
//      { type: "hit", kind: "kick" | "snare" | "hat", strength }
//      { type: "bands", values, tone }   (about 30 times a second: how loud [low, body, mid, crack, air] are, each 0..1)   (a drum hit was just heard)
//      { type: "level", rms }   (about twice a second: is there any sound at all?)
//      { type: "ended" }
import { TempoFollower } from "./tempo.js"
import { HitDetector } from "./hits.js"

let stopped = false

// loudness of each part of the sound, scaled by what that part has recently peaked at (so quiet and loud songs look alike)
class Bands {
    constructor(rate) {
        this.peak = new Float32Array(5).fill(0.2)
        this.decay = Math.pow(0.5, 1 / (8 * rate)) // halves in about 8 s
        this.every = Math.max(1, Math.round(rate / 30))
        this.count = 0
        this.out = new Array(5).fill(0)
    }
    frame(levels, tone) {
        for (let g = 0; g < 5; g++) this.peak[g] = Math.max(0.15, levels[g], this.peak[g] * this.decay)
        if (++this.count % this.every) return
        for (let g = 0; g < 5; g++) this.out[g] = Math.min(1, Math.max(0, levels[g] / this.peak[g]))
        self.postMessage({ type: "bands", values: this.out, tone })
    }
}
let reset_requested = false

self.onmessage = (event) => {
    if (event.data.type === "stop") stopped = true
    if (event.data.type === "reset") reset_requested = true
    if (event.data.type === "start") run(event.data.readable)
}

async function run(readable) {
    const reader = readable.getReader()
    let follower = null
    let detector = null
    let bands = null
    const hook = () => { follower.tracker.on_frame = (groups, levels) => { detector.frame(groups); bands.frame(levels, follower.tracker.tone) } }
    let sample_rate = 0
    let total = 0 // samples fed so far
    let wall_start = Infinity // wall-clock time (epoch ms) when the stream's first sample was played
    let last_state = null
    let follower_start_s = 0 // stream time (s) when the current follower started listening
    let level_sum = 0
    let level_count = 0
    let level_at = 0

    try {
        while (!stopped) {
            const { value: frame, done } = await reader.read()
            if (done) break
            if (!follower) {
                sample_rate = frame.sampleRate
                follower = new TempoFollower(sample_rate)
                detector = new HitDetector(follower.rate, (kind, strength) => self.postMessage({ type: "hit", kind, strength }))
                bands = new Bands(follower.rate)
                hook()
            }
            const n = frame.numberOfFrames
            const channels = frame.numberOfChannels
            const mono = new Float32Array(n)
            const plane = new Float32Array(n)
            for (let c = 0; c < channels; c++) {
                frame.copyTo(plane, { planeIndex: c, format: "f32-planar" })
                for (let i = 0; i < n; i++) mono[i] += plane[i] / channels
            }
            frame.close()

            if (reset_requested) {
                reset_requested = false
                follower = new TempoFollower(sample_rate)
                hook() // the drum hits keep their own recent levels across songs
                follower_start_s = total / sample_rate
                last_state = null
            }
            total += n
            // when this chunk arrived minus how much audio came before it = when the stream started.
            // chunks that arrive late make the estimate too early, so keep the smallest and let it creep up
            const now = performance.timeOrigin + performance.now()
            wall_start = Math.min(wall_start + 0.05, now - (total / sample_rate) * 1000)

            for (let i = 0; i < n; i++) level_sum += mono[i] * mono[i]
            level_count += n

            const state = follower.push(mono)
            if (state && state !== last_state) {
                last_state = state
                self.postMessage({
                    type: "state",
                    bpm: state.bpm,
                    beat_ms: state.beat_s * 1000,
                    anchor_wall_ms: wall_start + (follower_start_s + state.anchor_s) * 1000,
                    confidence: state.confidence,
                })
            }
            if (now - level_at > 500) {
                level_at = now
                self.postMessage({ type: "level", rms: Math.sqrt(level_sum / Math.max(1, level_count)) })
                level_sum = 0
                level_count = 0
            }
        }
    } catch (error) {
        self.postMessage({ type: "error", message: String(error && error.message ? error.message : error) })
    }
    try { reader.cancel() } catch { /* already closed */ }
    self.postMessage({ type: "ended" })
}

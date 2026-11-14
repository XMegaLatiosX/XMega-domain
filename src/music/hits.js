// Kick and snare hits, found live from how much each part of the spectrum grows (OnsetTracker's `groups`:
// [low, body, mid, crack, air]). Plain signal processing, no AI.
//   kick  = a sudden rise in the low end (40-160 Hz) whose shape is "low-heavy"
//   hat   = a sudden rise in the air and the snap with hardly any low end or body
//   snare = a sudden rise in the mids and the snap (450 Hz - 5 kHz); the low end is left out of its level
//           because a kick's pitch sweep fills the 150-450 Hz range too
// Each one is compared with its own recent level (a running mean and spread), so quiet and loud tracks work alike.
// The SHAPE of the rise then decides what it was: a kick has far more low end than snap, a snare has a thump
// in the body range and a lot of snap, a hi-hat is mostly air and is ignored.
// A hit is reported one frame after it happens (the detector waits for the peak).

const K = 3.2 // how many "spreads" above the recent level a rise must be to count as a hit
const MIN_KICK = 0.35 // and never less than this much flux, so silence and hiss are not "hits"
const MIN_SNARE = 0.9
const MIN_HAT = 0.5
const HAT_AIR_OVER_REST = 1.5 // a hat: (air + crack) >= 1.5 * (low + body + mid)
const KICK_LOW_OVER_BODY = 0.7 // a kick: low >= 0.7 * body (a snare's thump lives in the body range)
const SNARE_SNAP_OVER_LOW = 0.25 // a snare: (mid + crack) >= 0.25 * low (a kick alone has almost no snap)
const REFRACTORY_S = 0.07
const HAT_REFRACTORY_S = 0.04

export class HitDetector {
    // rate: frames per second. emit(kind, strength): kind is "kick", "snare" or "hat", strength is about 1 (a normal hit) to 4
    constructor(rate, emit) {
        this.rate = rate
        this.emit = emit
        this.alpha = 1 - Math.exp(-1 / (2.5 * rate))
        this.frame_count = 0
        this.kick = { mean: 0, spread: 0.1, a: 0, b: 0, last: -1 } // a = value two frames ago, b = one frame ago
        this.snare = { mean: 0, spread: 0.1, a: 0, b: 0, last: -1 }
        this.hat = { mean: 0, spread: 0.1, a: 0, b: 0, last: -1 }
        this.before = new Float32Array(5) // the groups of the previous frame (the candidate peak)
    }

    frame(groups) {
        this.frame_count++
        const kick_value = groups[0]
        const snare_value = groups[2] + groups[3] + 0.5 * groups[4]
        const [low, body, mid, crack, air] = this.before
        const kick = this.step(this.kick, kick_value, MIN_KICK, low >= KICK_LOW_OVER_BODY * body)
        const snare = this.step(this.snare, snare_value, MIN_SNARE, mid + crack >= SNARE_SNAP_OVER_LOW * low)
        const hat = this.step(this.hat, groups[4] + 0.5 * groups[3], MIN_HAT, air + crack >= HAT_AIR_OVER_REST * (low + body + mid), HAT_REFRACTORY_S)
        if (kick > 0) this.fire("kick", kick)
        if (snare > 0) this.fire("snare", snare)
        if (hat > 0) this.fire("hat", hat)
        this.before.set(groups)
    }

    fire(kind, strength) {
        const state = this[kind]
        state.last = this.frame_count
        this.emit(kind, Math.min(4, strength / K))
    }

    // returns the strength (in "spreads" above the recent level) if the PREVIOUS frame was a peak that counts, else 0
    step(state, value, minimum, shape_ok, refractory_s = REFRACTORY_S) {
        const { a, b } = state
        const threshold = Math.max(minimum, state.mean + K * state.spread)
        let strength = 0
        const refractory = this.frame_count - state.last < refractory_s * this.rate
        if (!refractory && shape_ok && b > threshold && b > a && b >= value) strength = (b - state.mean) / Math.max(1e-3, state.spread)
        // the level it is compared with follows the music
        const alpha = this.alpha
        state.mean += alpha * (value - state.mean)
        state.spread += alpha * (Math.abs(value - state.mean) - state.spread)
        state.a = b
        state.b = value
        return strength
    }
}

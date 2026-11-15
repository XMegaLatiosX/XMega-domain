// Tempo (BPM) and beat phase from audio, plain signal processing (no AI, no libraries).
//
// Two stages, so the first one can run live in an AudioWorklet and the second one on demand:
//   1. OnsetTracker: audio in -> "onset strength" values (how much new sound starts, ~94 per second).
//   2. estimateTempo: the last few seconds of onset strength -> { bpm, confidence, phase }.
//
// Onset strength = spectral flux: for each short frame, take the spectrum, group it in log-spaced
// bands, compress with a log, and sum how much each band grew compared to the previous frame.

const FFT_SIZE = 2048
const HOP = 512
const BANDS = 24
const MIN_HZ = 40
const MAX_HZ = 10000

function make_fft(n) {
    const levels = Math.log2(n)
    const cos = new Float32Array(n / 2)
    const sin = new Float32Array(n / 2)
    for (let i = 0; i < n / 2; i++) {
        cos[i] = Math.cos((2 * Math.PI * i) / n)
        sin[i] = Math.sin((2 * Math.PI * i) / n)
    }
    const reverse = new Uint32Array(n)
    for (let i = 0; i < n; i++) {
        let r = 0
        for (let b = 0; b < levels; b++) r |= ((i >> b) & 1) << (levels - 1 - b)
        reverse[i] = r
    }
    return function fft(re, im) {
        for (let i = 0; i < n; i++) {
            const j = reverse[i]
            if (j > i) {
                let t = re[i]; re[i] = re[j]; re[j] = t
                t = im[i]; im[i] = im[j]; im[j] = t
            }
        }
        for (let size = 2; size <= n; size *= 2) {
            const half = size / 2
            const step = n / size
            for (let start = 0; start < n; start += size) {
                for (let k = 0, t = 0; k < half; k++, t += step) {
                    const a = start + k
                    const b = a + half
                    const tr = re[b] * cos[t] + im[b] * sin[t]
                    const ti = -re[b] * sin[t] + im[b] * cos[t]
                    re[b] = re[a] - tr
                    im[b] = im[a] - ti
                    re[a] += tr
                    im[a] += ti
                }
            }
        }
    }
}

// for drawing the bands: the centre frequency of band b and which of the 5 groups it belongs to (roughly: the tracker
// itself rounds to FFT bins)
export const BAND_COUNT = BANDS
export function band_hz(b) {
    return MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, (b + 0.5) / BANDS)
}
export function band_group(b, kick_hz = 160, hat_hz = 5000) {
    const hz = band_hz(b)
    return hz < kick_hz ? 0 : hz < 450 ? 1 : hz < 1000 ? 2 : hz < hat_hz ? 3 : 4
}

export class OnsetTracker {
    constructor(sample_rate) {
        this.sample_rate = sample_rate
        this.rate = sample_rate / HOP // onset values per second
        this.fft = make_fft(FFT_SIZE)
        this.window = new Float32Array(FFT_SIZE)
        for (let i = 0; i < FFT_SIZE; i++) this.window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1))
        this.ring = new Float32Array(FFT_SIZE) // circular buffer with the last FFT_SIZE samples
        this.write = 0
        this.filled = 0
        this.since_hop = 0
        this.re = new Float32Array(FFT_SIZE)
        this.im = new Float32Array(FFT_SIZE)
        this.previous = new Float32Array(BANDS)
        // how much each part of the spectrum grew in the latest frame: [low, body, mid, crack, air]
        // (kick drums live in "low", snares in "body" + "crack", hi-hats in "air"). on_frame(groups) is called for every frame.
        this.groups = new Float32Array(5)
        // and how loud each of those parts is now (the average of its bands' levels, 0 = silence, about 1 = loud)
        this.levels = new Float32Array(5)
        this.band_levels = new Float32Array(BANDS) // the level of every one of the 24 bands in the latest frame (for the data panel)
        this.group_size = new Uint8Array(5)
        // where the weight of the sound sits above the kick range, 0 = low, 1 = high (a rough "tone" of what is playing)
        this.tone = 0.5
        this.on_frame = null

        // which FFT bins go in which band (log-spaced)
        const bin_hz = sample_rate / FFT_SIZE
        const max_hz = Math.min(MAX_HZ, sample_rate / 2 - bin_hz)
        this.edges = []
        for (let b = 0; b <= BANDS; b++) {
            const hz = MIN_HZ * Math.pow(max_hz / MIN_HZ, b / BANDS)
            this.edges.push(Math.max(1, Math.round(hz / bin_hz)))
        }
        for (let b = 1; b <= BANDS; b++) if (this.edges[b] <= this.edges[b - 1]) this.edges[b] = this.edges[b - 1] + 1
        this.group_of = new Uint8Array(BANDS)
        this.centre_hz = new Float32Array(BANDS)
        for (let b = 0; b < BANDS; b++) this.centre_hz[b] = Math.sqrt(this.edges[b] * this.edges[b + 1]) * bin_hz
        this.set_groups(160, 5000)
    }

    // where the 5 groups [low, body, mid, crack, air] begin and end: low ends at kick_hz, air starts at hat_hz
    set_groups(kick_hz, hat_hz) {
        this.group_size.fill(0)
        for (let b = 0; b < BANDS; b++) {
            const centre = this.centre_hz[b]
            this.group_of[b] = centre < kick_hz ? 0 : centre < 450 ? 1 : centre < 1000 ? 2 : centre < hat_hz ? 3 : 4
            this.group_size[this.group_of[b]]++
        }
    }

    // feed mono samples; returns the new onset-strength values (usually 0 to a few per call)
    push(samples) {
        const out = []
        for (let i = 0; i < samples.length; i++) {
            this.ring[this.write] = samples[i]
            this.write = (this.write + 1) % FFT_SIZE
            if (this.filled < FFT_SIZE) this.filled++
            if (this.filled === FFT_SIZE && ++this.since_hop >= HOP) {
                this.since_hop = 0
                out.push(this.frame())
            }
        }
        return out
    }

    frame() {
        const { re, im, ring, window, edges, previous } = this
        for (let i = 0; i < FFT_SIZE; i++) {
            re[i] = ring[(this.write + i) % FFT_SIZE] * window[i]
            im[i] = 0
        }
        this.fft(re, im)
        let flux = 0
        const groups = this.groups
        const levels = this.levels
        groups.fill(0)
        levels.fill(0)
        let weight = 0
        let centre = 0
        for (let b = 0; b < BANDS; b++) {
            let sum = 0
            const from = edges[b]
            const to = edges[b + 1]
            for (let k = from; k < to; k++) sum += Math.hypot(re[k], im[k])
            const level = Math.log1p(40 * (sum / (to - from)) / FFT_SIZE * 8)
            levels[this.group_of[b]] += level
            this.band_levels[b] = level
            if (this.group_of[b] > 0) {
                weight += level * level
                centre += level * level * b
            }
            const rise = level - previous[b]
            if (rise > 0) {
                flux += rise
                groups[this.group_of[b]] += rise
            }
            previous[b] = level
        }
        for (let g = 0; g < 5; g++) if (this.group_size[g]) levels[g] /= this.group_size[g]
        if (weight > 0.05) this.tone = centre / weight / (BANDS - 1)
        if (this.on_frame) this.on_frame(groups, levels)
        return flux
    }
}

// remove the slow-moving part so only the "hits" stay
function clean(onsets, rate) {
    const n = onsets.length
    const half = Math.max(2, Math.round(rate * 0.35))
    const out = new Float32Array(n)
    // moving average with a window of 2*half+1
    const prefix = new Float64Array(n + 1)
    for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + onsets[i]
    for (let i = 0; i < n; i++) {
        const a = Math.max(0, i - half)
        const b = Math.min(n, i + half + 1)
        const mean = (prefix[b] - prefix[a]) / (b - a)
        const v = onsets[i] - mean
        out[i] = v > 0 ? v : 0
    }
    return out
}

// strength of a beat grid: sum of the cleaned onsets at positions phase + k*period (linear interpolation)
function grid_score(env, period, phase) {
    let sum = 0
    let hits = 0
    for (let t = phase; t < env.length - 1; t += period) {
        const i = Math.floor(t)
        const f = t - i
        sum += env[i] * (1 - f) + env[i + 1] * f
        hits++
    }
    return hits ? sum / hits : 0
}

function best_phase(env, period) {
    let best = 0
    let best_score = -1
    const steps = Math.max(8, Math.round(period))
    for (let s = 0; s < steps; s++) {
        const phase = (s / steps) * period
        const score = grid_score(env, period, phase)
        if (score > best_score) {
            best_score = score
            best = phase
        }
    }
    return { phase: best, score: best_score }
}

// onsets: array/Float32Array of onset strength, rate: values per second.
// Returns null if there is not enough sound, otherwise:
//   bpm        tempo, folded into min_bpm..max_bpm
//   confidence 0..1, how much clearer the winner is than the average candidate
//   phase_s    seconds from the START of the given onsets to the first beat on the grid
//   beat_s     seconds between beats
export function estimateTempo(onsets, rate, { min_bpm = 70, max_bpm = 190, prior_center = 120, prior_octaves = 0.9, prefer_faster = 0.6 } = {}) {
    const n = onsets.length
    if (n < rate * 5) return null
    const env = clean(onsets, rate)
    let energy = 0
    for (let i = 0; i < n; i++) energy += env[i]
    if (energy / n < 1e-4) return null

    // 1) autocorrelation of the cleaned onsets, for every tempo from min/2 to max*2 (to check octaves)
    const lo = Math.floor((rate * 60) / (max_bpm * 2))
    const hi = Math.ceil((rate * 60) / (min_bpm / 2))
    const acf = new Float64Array(hi + 2)
    for (let lag = lo; lag <= hi + 1; lag++) {
        let sum = 0
        for (let i = lag; i < n; i++) sum += env[i] * env[i - lag]
        acf[lag] = sum / (n - lag)
    }
    const at = (lag) => {
        if (lag < lo || lag > hi) return 0
        const i = Math.floor(lag)
        const f = lag - i
        return acf[i] * (1 - f) + acf[i + 1] * f
    }

    // 2) score every tempo in range: its own peak plus its multiples (a real tempo repeats at 2x, 3x...),
    //    with a gentle preference for tempos people actually use (around 120)
    const candidates = []
    for (let bpm = min_bpm; bpm <= max_bpm; bpm += 0.25) {
        const lag = (rate * 60) / bpm
        let score = at(lag) + 0.5 * at(lag * 2) + 0.25 * at(lag * 4) + 0.35 * at(lag * 1.5) + 0.25 * at(lag * 3)
        const raw = score
        const octaves = Math.log2(bpm / prior_center)
        score *= Math.exp(-0.5 * (octaves / prior_octaves) ** 2)
        candidates.push({ bpm, score, raw })
    }
    const by_score = candidates.slice().sort((a, b) => b.score - a.score)
    let top = by_score[0]
    // When the same pattern also fits at twice the tempo, take the faster one: pulsing on every
    // half-beat lands on the beats AND the off-beats, and a half-speed pulse would miss the off-beats.
    const doubled_bpm = top.bpm * 2
    if (doubled_bpm <= max_bpm) {
        const twin = candidates.reduce((best, c) => (Math.abs(c.bpm - doubled_bpm) < Math.abs(best.bpm - doubled_bpm) ? c : best))
        if (twin.raw >= prefer_faster * top.raw) top = twin
    }
    if (!(top.score > 0)) return null
    const mean = candidates.reduce((s, c) => s + c.score, 0) / candidates.length

    // 3) fine tuning: the best beat grid within +-2% of the winner
    let bpm = top.bpm
    let best = { score: -1, phase: 0, bpm }
    for (let d = -0.02; d <= 0.02001; d += 0.002) {
        const test_bpm = top.bpm * (1 + d)
        const period = (rate * 60) / test_bpm
        const { phase, score } = best_phase(env, period)
        if (score > best.score) best = { score, phase, bpm: test_bpm }
    }
    bpm = best.bpm
    const period = (rate * 60) / bpm
    return {
        bpm,
        confidence: Math.max(0, Math.min(1, 1 - mean / top.score)),
        phase_s: best.phase / rate,
        beat_s: period / rate,
    }
}

// Follows a live stream: feed it audio, read `state` any time.
//   state = null until it has heard enough, then
//   { bpm, confidence, beat_s, anchor_s }  anchor_s = stream time (seconds of audio fed so far, same clock
//   as `time`) of one recent beat; the other beats are anchor_s + k * beat_s.
// A new tempo is only accepted after it shows up in several estimates in a row, so a single odd window
// (a break, a fill, a syncopated bar) does not make the beat jump around.
// The onset detector reports a hit slightly before the hit's peak. Measured on synthetic kick drums:
// the beat grid came out 41 ms early, so it is pushed forward by that. Real tracks will differ a little;
// the UI should offer a small manual nudge.
const ONSET_DELAY_S = -0.041
const PHASE_FOLLOW_S = 0.03 // a phase this close to the grid is drift: follow it a little
const PHASE_AGREE_S = 0.03 // two phase disagreements this close count as the same one
const PHASE_ADOPT_AFTER = 5 // a phase that disagrees with the grid is only accepted after this many estimates in a row
const RELATED_RATIOS = [2, 0.5, 1.5, 2 / 3, 4 / 3, 0.75]
const DOUBLE_BELOW_BPM = 80 // below this, assume half-time and double it (70 -> 140)

export class TempoFollower {
    constructor(sample_rate, { window_s = 10, every_s = 1, lock_after = 2, switch_after = 4 } = {}) {
        this.tracker = new OnsetTracker(sample_rate)
        this.rate = this.tracker.rate
        this.window = Math.round(window_s * this.rate)
        this.every = Math.round(every_s * this.rate)
        this.lock_after = lock_after
        this.switch_after = switch_after
        this.values = []
        this.frames = 0
        this.next_estimate_at = Math.round(6 * this.rate)
        this.pending = null
        this.phase_pending = null
        this.state = null
        this.tempo_options = {} // min_bpm, max_bpm, prior_center, prefer_faster (see estimateTempo), set from the settings
    }

    get time() {
        return this.frames / this.rate
    }

    push(samples) {
        for (const v of this.tracker.push(samples)) {
            this.values.push(v)
            this.frames++
            if (this.values.length > this.window * 1.5) this.values.splice(0, this.values.length - this.window)
            if (this.frames >= this.next_estimate_at) {
                this.next_estimate_at = this.frames + this.every
                this.update()
            }
        }
        return this.state
    }

    update() {
        const used = this.values.slice(-this.window)
        const r = estimateTempo(used, this.rate, this.tempo_options)
        if (!r) return
        // Slow results are usually half-time (the real tempo is twice as fast), so they are doubled.
        // The slow beats are a subset of the doubled grid, so the beat positions stay valid.
        const bpm = r.bpm < DOUBLE_BELOW_BPM ? r.bpm * 2 : r.bpm
        const beat_s = 60 / bpm
        const first_frame = this.frames - used.length
        const first_beat = first_frame / this.rate + r.phase_s - ONSET_DELAY_S
        const latest = first_beat + Math.floor((this.time - first_beat) / beat_s) * beat_s
        const candidate = { bpm, confidence: r.confidence, beat_s, anchor_s: latest }
        const close = (a, b) => Math.abs(a / b - 1) < 0.02

        if (!this.state) {
            if (this.pending && close(this.pending.bpm, candidate.bpm)) this.pending.count++
            else this.pending = { bpm: candidate.bpm, count: 1 }
            if (this.pending.count >= this.lock_after) {
                this.state = candidate
                this.pending = null
            }
            return
        }
        const current = this.state
        if (close(candidate.bpm, current.bpm)) {
            // Same tempo. The beat grid is a flywheel: it keeps turning at its tempo and only gives way slowly.
            //  - the tempo moves slowly toward the new estimate
            //  - a phase that disagrees by a little is followed a little (drift), by a lot it is ignored, unless the
            //    same disagreement shows up estimate after estimate (the music really moved). So one odd kick, a bass
            //    note off the grid or a break does not drag the beat along; the old grid is kept through it.
            const bpm = 0.85 * current.bpm + 0.15 * candidate.bpm
            const beat = 60 / bpm
            let anchor = current.anchor_s + Math.floor((this.time - current.anchor_s) / current.beat_s) * current.beat_s
            const wrap = (value) => value - Math.round(value / beat) * beat
            const error = wrap(candidate.anchor_s - anchor)
            if (Math.abs(error) < PHASE_FOLLOW_S) {
                anchor += 0.25 * error
                this.phase_pending = null
            } else if (this.phase_pending && Math.abs(wrap(error - this.phase_pending.error)) < PHASE_AGREE_S) {
                this.phase_pending.count++
                this.phase_pending.error = error
                if (this.phase_pending.count >= PHASE_ADOPT_AFTER) {
                    anchor += error
                    this.phase_pending = null
                }
            } else {
                this.phase_pending = { error, count: 1 }
            }
            this.state = { bpm, confidence: candidate.confidence, beat_s: beat, anchor_s: anchor }
            this.pending = null
            return
        }
        const ratio = candidate.bpm / current.bpm
        // The same pattern read at another speed (octave flips, and syncopation making a 3:2 or 4:3 reading) is not a
        // new tempo: the old tempo is kept, and the pulse keeps going.
        if (RELATED_RATIOS.some((related) => Math.abs(ratio / related - 1) < 0.03)) return
        if (this.pending && close(this.pending.bpm, candidate.bpm)) this.pending.count++
        else this.pending = { bpm: candidate.bpm, count: 1 }
        if (this.pending.count >= this.switch_after) {
            this.state = candidate
            this.pending = null
        }
    }
}

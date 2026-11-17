// A pretend drum pattern for screens that cannot hear the music (phones cannot capture the page's sound): 24 band levels (0..1, the same
// shape as the real bands, lowest first) made only from the tempo, so the bars still move on the beat like a plain four-on-the-floor groove.
//   kick   every beat: a short, tall wave that runs from the sub to the very end in about a step and a half (a step is a 16th: 0.25 beat),
//          getting smaller as it goes
//   snare  every 2 beats (beats 2 and 4): a strong swell in the middle bands, well marked
//   hat    between the kicks (on the "and"), a lighter swell in the high bands; every 8 bars it switches between "only between kicks"
//          and "between kicks and on them too"
// `phase` is the time in beats since the beat anchor (see get_clock in BeatProvider.jsx).
const BANDS = 24
const out = new Float32Array(BANDS)

const tail = (since, power) => Math.pow(Math.max(0, 1 - since), power) // 1 at the hit, fading to 0 after `since` = 1 beat
const bell = (b, centre, width) => Math.exp(-Math.pow((b - centre) / width, 2))

// Real drums are never the same twice, so every hit gets its own made-up numbers (the same ones for the whole hit, so nothing flickers):
// `luck(seed)` is a fixed pseudo-random number in 0..1 for a given whole number.
export const luck = (seed) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
const WAVE_BEATS = 0.6 // the kick wave crosses all the bands in about two and a half steps (a bit slower than a straight line of a step and a half)

export function fake_levels(phase) {
    const beat = Math.floor(phase)
    const frac = phase - beat
    const in_bar = ((beat % 4) + 4) % 4
    const bar = Math.floor(beat / 4)
    const hats_on_kicks = (((Math.floor(bar / 8)) % 2) + 2) % 2 === 1

    const snare_hit = 0.72 + 0.28 * luck(beat * 3 + 1) // how hard this particular snare is
    const hat_hit = 0.6 + 0.4 * luck(beat * 3 + 2)
    const kick_hit = 0.82 + 0.18 * luck(beat * 3)
    const snare = in_bar === 1 || in_bar === 3 ? tail(frac, 2.2) * snare_hit : 0
    const hat_off = frac >= 0.5 ? tail(frac - 0.5, 5) * hat_hit : 0 // the hit lands at frac = 0.5
    const hat_on = hats_on_kicks ? tail(frac, 6) * (0.5 + 0.5 * luck(beat * 3 + 5)) : 0
    const hat = Math.max(hat_off, hat_on)

    // the kick wave does not run at a steady speed: it hesitates and rushes a little, differently on every beat
    const wobble = 0.12 * Math.sin(frac * 17 + luck(beat * 7) * 6.28)
    const travel = Math.min(1, Math.max(0, frac / WAVE_BEATS + wobble * Math.min(1, frac / 0.1) * (1 - frac / WAVE_BEATS)))
    const front = travel * (BANDS + 1) - 0.5 // starts on the first band (the kick is seen at once) and leaves just after the last one
    const wave_alive = frac < WAVE_BEATS + 0.15
    const wave_height = (1 - 0.7 * travel) * kick_hit * 1.15 // tall at the sub, small at the end

    // every hit leans to one side (one end of the spectrum louder than the other), a different side and amount each time
    const lean = (luck(beat * 5 + 3) - 0.5) * 1.3
    const tilt = (b) => Math.max(0.15, 1 + lean * (b / (BANDS - 1) - 0.5) * 2)
    const ragged = (b, seed, floor) => floor + (1 - floor) * luck(b * 13 + seed) // neighbours can differ a lot: from `floor` to full

    for (let b = 0; b < BANDS; b++) {
        let level = 0
        if (wave_alive) {
            const d = b - front
            const shape = d <= 0 ? Math.exp(-Math.pow(d / 2.6, 2)) : Math.exp(-Math.pow(d / 1.1, 2)) // a short tail behind, a sharp edge in front
            level = Math.max(level, shape * wave_height * ragged(b, beat * 3, 0.3) * tilt(b)) // each band its own height
        }
        // snare and hats: every band gets its own strength for this hit, so the swell is ragged like a real spectrum
        level = Math.max(level, snare * 1.7 * bell(b, 11.5 + (luck(beat * 11) - 0.5) * 3, 3.6) * ragged(b, beat * 5 + 1, 0.25) * tilt(b))
        level = Math.max(level, hat * 0.7 * bell(b, 21, 2.8) * ragged(b, beat * 3 + 9 + (frac >= 0.5 ? 50 : 0), 0.1) * tilt(b))
        out[b] = Math.min(1, level)
    }
    return out
}

// For a row with more bars than bands (the header): each bar gets its own made-up height factor for the current half beat, so even
// bars between the same two bands differ a lot. `i` is the bar, `phase` as above.
export function bar_luck(i, phase) {
    return 0.15 + 0.85 * Math.pow(luck(i * 7.3 + Math.floor(phase * 2) * 13), 1.3)
}

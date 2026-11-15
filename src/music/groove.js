// Puts the drum hits on the song's grid and remembers the pattern, so the reactions stay in time.
//
// The hit detector hears things; this decides which of them count:
//   - every hit is snapped to the nearest 16th note of the beat clock; one slot can fire only once per kind,
//     so one kick that is heard five times is still one kick
//   - a hit that lands between two 16ths (more than 0.4 of a step away) is dropped, unless it is strong
//   - a known kick pattern (patterns.js: four on the floor, two-step, breaks, half-time, the build-up ones) that
//     fits what was heard becomes the song's default: missing kicks on its steps are filled in, weak odd hits dropped.
//     It is let go when something that recurs fits another pattern better, or when the sound stops.
//   - the bar (16 steps) is remembered per kind: how often each step had a hit lately. Once a pattern is known,
//     a weak hit on a step that never has one is dropped, and a step that always has one but was missed is
//     filled in (a "ghost" hit), so one tiny change does not break a pattern that was going well.
// Times are in ms of the same clock the beat anchor uses (performance.now()).

import { TEMPLATES, best_fit } from "./patterns.js"
import { S } from "./settings.js"

const KINDS = ["kick", "snare", "hat"]
const STEPS = 16
// (the numbers that can be tuned live in settings.js and are read from S: grid_tol, strong_hit, weak_hit, repeat_gap, ghost_at, floor_ghost_at,
// ghost_run, gate_below, lock_bars, unlock_bars, switch_margin, genre_lock, floor_assist, swing, bias_*, hit_delay_ms)
const LEARNED_SUM = { kick: 1.5, snare: 1.0, hat: 3 }
const RATE = 0.35 // how fast the pattern memory follows what was heard
// four on the floor (a kick on every beat) is assumed more easily: a missing kick on a beat is filled in when the
// memory of that step is only half-sure, as long as a real kick was heard within the last 3 beats
const FLOOR_NEAR_BEATS = 3
const FLOOR_RATE = 0.12 // how fast the memory of a beat fades while it is being filled in

const wrap = (x) => x - Math.round(x) // into -0.5 .. 0.5

export class Groove {
    constructor(emit) {
        this.emit = emit // (kind, strength, slot_time_ms, ghost)
        this.trace = null // optional (entry) => ...: every decision, for the data panel (see debug-log.js)
        this.epoch = 0
        this.reset()
    }

    reset() {
        this.epoch++ // a new tempo or song: the positions of the entries before it mean nothing now
        this.clock = null
        this.pattern = null // name of the kick pattern the song is locked to (see patterns.js), or null
        this.candidate = { name: null, count: 0 }
        this.bad_bars = 0
        this.sound = true // set from outside: is there sound at all? (the pattern is let go when it stops)
        this.quiet_at = 0
        this.floor_forced = false // set from outside: assume a kick on every beat (see BeatProvider)
        this.bias = 0 // how far (in steps) the hits really sit from the clock's grid: the clock may be a little early or late
        this.stats = { passed: 0, off_grid: 0, repeat: 0, gated: 0, ghost: 0, as_heard: 0 }
        this.lane = {}
        for (const kind of KINDS) this.lane[kind] = { score: new Float32Array(STEPS), run: new Uint8Array(STEPS), slots: new Map(), next: null, bars: 0, last: -1e9, last_strength: 0 }
    }

    // the clock the hits are measured against: anchor_ms is the time of a beat, beat_ms its length
    set_clock(anchor_ms, beat_ms) {
        const old = this.clock
        if (old && Math.abs(beat_ms - old.beat_ms) / old.beat_ms > 0.02) {
            this.reset()
        }
        const before = this.clock
        let offset = 0
        if (before) offset = Math.round(before.offset + (anchor_ms - before.anchor_ms) / before.beat_ms)
        if (before) {
            // the grid moved: so did where the hits sit against it
            const beats = (anchor_ms - before.anchor_ms) / before.beat_ms
            this.bias = wrap(this.bias - 4 * (beats - Math.round(beats)))
        }
        this.clock = { anchor_ms, beat_ms, offset }
    }

    // Swing: the odd 16ths (the "ands") sit later than half way between the even ones. d is how much later, in steps:
    // 0 for straight 16ths, 1/3 for a triplet feel (66.7 %). position() undoes it, slot_time() puts it back.
    swing_delay() {
        return Math.min(0.9, Math.max(0, (2 * S.swing) / 100 - 1))
    }
    position(time_ms) { // in 16th steps of the (unswung) grid, counted from an arbitrary but steady start
        const c = this.clock
        const raw = (c.offset + (time_ms - c.anchor_ms) / c.beat_ms) * 4
        const d = this.swing_delay()
        if (d === 0) return raw
        const base = Math.floor(raw / 2) * 2
        const r = raw - base
        return r < 1 + d ? base + r / (1 + d) : base + 1 + (r - (1 + d)) / (1 - d)
    }
    slot_time(n) {
        const c = this.clock
        const raw = n + (((n % 2) + 2) % 2 === 1 ? this.swing_delay() : 0)
        return c.anchor_ms + ((raw / 4) - c.offset) * c.beat_ms
    }

    learned(kind) {
        const lane = this.lane[kind]
        let sum = 0
        for (let i = 0; i < STEPS; i++) sum += lane.score[i]
        return lane.bars >= 2 && sum >= LEARNED_SUM[kind]
    }

    note(kind, strength, time_ms, outcome, n, dev) {
        if (this.trace) this.trace({ t: time_ms, epoch: this.epoch, kind, strength, outcome, pos: this.clock ? this.position(time_ms) : 0, index: n === null ? null : ((n % STEPS) + STEPS) % STEPS, dev })
    }

    hit(kind, strength, time_ms) {
        const c = this.clock
        if (!c) { this.emit(kind, strength, time_ms, false); return } // no beat clock yet: pass it through as heard
        const lane = this.lane[kind]
        const pos = this.position(time_ms)
        // a ring-out or a double trigger of one sound: close behind the last hit, and not clearly louder
        if (time_ms - lane.last < S.repeat_gap * c.beat_ms / 4 && strength < 1.5 * lane.last_strength) { this.stats.repeat++; this.note(kind, strength, time_ms, "repeat", null, null); return }
        // where the grid really is: follow where the kicks and snares land against it (a clock a bit early or late)
        if (!S.bias_auto) this.bias = wrap(S.bias_manual)
        else if (kind !== "hat") this.bias = wrap(this.bias + S.bias_rate * wrap(pos - Math.round(pos) - this.bias))
        const n = Math.round(pos - this.bias)
        const dev = pos - this.bias - n
        if (Math.abs(dev) > S.grid_tol) {
            if (strength < S.strong_hit) { this.stats.off_grid++; this.note(kind, strength, time_ms, "off_grid", n, dev); return }
            // between two steps but clearly a hit: show it when it was heard, not on the grid
            lane.last = time_ms
            lane.last_strength = strength
            this.stats.as_heard++
            this.note(kind, strength, time_ms, "as_heard", n, dev)
            this.emit(kind, strength, time_ms, false)
            return
        }
        lane.last = time_ms
        lane.last_strength = strength
        if (lane.next === null) lane.next = n
        let slot = lane.slots.get(n)
        if (!slot) { slot = { heard: false, fired: false, ghost: false, strength: 0 }; lane.slots.set(n, slot) }
        slot.strength = Math.max(slot.strength, strength)
        if (slot.heard) return // the same hit, heard again
        slot.heard = true
        if (slot.fired) return // a ghost already stood in for it
        const index = ((n % STEPS) + STEPS) % STEPS
        if (index % 4 !== 0 && this.learned(kind) && strength < S.weak_hit && lane.score[index] < S.gate_below) { this.stats.gated++; this.note(kind, strength, time_ms, "gated", n, dev); return } // not part of this pattern
        // locked to a pattern: a weak hit that is not on it and has not been heard before is not part of the song's pattern
        if (kind === "kick" && this.pattern && !TEMPLATES[this.pattern].includes(index) && strength < 1.6 && lane.score[index] < 0.35) { this.stats.gated++; this.note(kind, strength, time_ms, "gated", n, dev); return }
        slot.fired = true
        this.stats.passed++
        this.note(kind, strength, time_ms, "passed", n, dev)
        this.emit(kind, strength, this.slot_time(n) + this.bias * c.beat_ms / 4, false)
    }

    // call often (every ~25 ms): closes the slots that are over and fills in the missed ones
    // once a bar: does what was heard fit a known pattern? Lock on after 2 bars in a row of the same fit; switch only
    // when another fits clearly better for 2 bars; let go when nothing fits any more for 2 bars.
    evaluate() {
        const lane = this.lane.kick
        if (!S.genre_lock) { this.pattern = null; this.candidate = { name: null, count: 0 }; return }
        if (lane.bars < 3) return
        const { all, best } = best_fit(lane.score)
        if (!this.pattern) {
            if (best && best.name === this.candidate.name) this.candidate.count++
            else this.candidate = { name: best ? best.name : null, count: best ? 1 : 0 }
            if (best && this.candidate.count >= S.lock_bars) { this.pattern = best.name; this.bad_bars = 0; this.candidate = { name: null, count: 0 } }
            return
        }
        const current = all[this.pattern]
        this.bad_bars = current.fit < 0.3 ? this.bad_bars + 1 : 0
        if (this.bad_bars >= S.unlock_bars) { this.pattern = null; this.bad_bars = 0; return }
        if (best && best.name !== this.pattern && best.fit > current.fit + S.switch_margin) {
            if (best.name === this.candidate.name) this.candidate.count++
            else this.candidate = { name: best.name, count: 1 }
            if (this.candidate.count >= S.lock_bars) { this.pattern = best.name; this.candidate = { name: null, count: 0 } }
        } else {
            this.candidate = { name: null, count: 0 }
        }
    }

    tick(now_ms) {
        const c = this.clock
        if (!c) return
        // the sound stopped: let the pattern go (and put no kicks in the silence)
        if (!this.sound) {
            if (!this.quiet_at) this.quiet_at = now_ms
            if (now_ms - this.quiet_at > 1500) this.pattern = null
        } else {
            this.quiet_at = 0
        }
        for (const kind of KINDS) {
            const lane = this.lane[kind]
            if (lane.next === null) {
                if (!(this.floor_forced && kind === "kick")) continue
                lane.next = Math.floor(this.position(now_ms - S.hit_delay_ms))
            }
            const last = Math.floor(this.position(now_ms - S.hit_delay_ms) - this.bias - S.grid_tol) // a slot is over once nothing can still arrive for it
            if (lane.next < last - 64) lane.next = last - 64 // a long gap: do not walk through all of it
            while (lane.next <= last) {
                const n = lane.next
                const slot = lane.slots.get(n)
                const index = ((n % STEPS) + STEPS) % STEPS
                const heard = slot && slot.heard
                let ghosted = false
                const floor_step = kind === "kick" && index % 4 === 0
                const near = S.floor_assist && floor_step && this.slot_time(n) - lane.last < FLOOR_NEAR_BEATS * c.beat_ms
                const wanted = near ? lane.score[index] >= S.floor_ghost_at && lane.run[index] < S.ghost_run + 1 : lane.score[index] >= S.ghost_at && lane.run[index] < S.ghost_run
                const forced = S.floor_assist && this.floor_forced && floor_step // loud and messy: just put a kick on every beat
                const on_pattern = kind === "kick" && this.sound && this.pattern && TEMPLATES[this.pattern].includes(index) // a kick belongs here, by the song's pattern
                if (!heard && !(slot && slot.fired) && this.sound && (forced || on_pattern || (this.learned(kind) && wanted))) { // (no ghosts in silence)
                    ghosted = true
                    // the memory says a hit belongs here but none was heard: play it
                    lane.run[index]++
                    if (slot) slot.fired = true
                    else lane.slots.set(n, { heard: false, fired: true, ghost: true, strength: 0 })
                    this.stats.ghost++
                    this.note(kind, Math.min(1.2, lane.score[index] + 0.3), this.slot_time(n), forced ? "ghost_forced" : on_pattern ? "ghost_pattern" : "ghost", n, null)
                    this.emit(kind, Math.min(1.2, lane.score[index] + 0.3), this.slot_time(n) + this.bias * c.beat_ms / 4, true)
                }
                if (heard) lane.run[index] = 0
                if (forced && !heard) { lane.score[index] = Math.max(lane.score[index], 0.6); ghosted = false }
                // only what was really heard teaches the pattern
                lane.score[index] += (ghosted && near ? FLOOR_RATE : RATE) * ((heard ? 1 : 0) - lane.score[index])
                if (index === STEPS - 1) {
                    lane.bars++
                    if (kind === "kick") this.evaluate()
                }
                lane.slots.delete(n - 8)
                lane.next++
            }
        }
    }
}

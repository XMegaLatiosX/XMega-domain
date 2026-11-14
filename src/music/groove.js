// Puts the drum hits on the song's grid and remembers the pattern, so the reactions stay in time.
//
// The hit detector hears things; this decides which of them count:
//   - every hit is snapped to the nearest 16th note of the beat clock; one slot can fire only once per kind,
//     so one kick that is heard five times is still one kick
//   - a hit that lands between two 16ths (more than 0.4 of a step away) is dropped, unless it is strong
//   - the bar (16 steps) is remembered per kind: how often each step had a hit lately. Once a pattern is known,
//     a weak hit on a step that never has one is dropped, and a step that always has one but was missed is
//     filled in (a "ghost" hit), so one tiny change does not break a pattern that was going well.
// Times are in ms of the same clock the beat anchor uses (performance.now()).

const KINDS = ["kick", "snare", "hat"]
const STEPS = 16
const OFF_GRID = 0.3 // steps
const OFF_GRID_STRONG = 1.6 // strength that is let through (as heard, not snapped) even when off the grid
const WEAK = 1.3 // only hits this weak can be dropped for not fitting the pattern (and never the ones on the beat)
const LEARNED_SUM = { kick: 1.5, snare: 1.0, hat: 3 }
const RATE = 0.35 // how fast the pattern memory follows what was heard
const GHOST_AT = 0.7 // a step with at least this much memory is filled in when missed
const GATE_BELOW = 0.2 // a weak hit on a step with less memory than this is dropped, once learned
const REPEAT = 0.65 // steps: a hit this soon after the last one of its kind is the same sound heard again
const DETECT_DELAY_MS = 27 // a hit is heard this long after it happened
const MAX_GHOST_RUN = 2 // ghosts in a row on one step before it is let go
// four on the floor (a kick on every beat) is assumed more easily: a missing kick on a beat is filled in when the
// memory of that step is only half-sure, as long as a real kick was heard within the last 3 beats
const FLOOR_GHOST_AT = 0.45
const FLOOR_NEAR_BEATS = 3
const FLOOR_RATE = 0.12 // how fast the memory of a beat fades while it is being filled in

const wrap = (x) => x - Math.round(x) // into -0.5 .. 0.5

export class Groove {
    constructor(emit) {
        this.emit = emit // (kind, strength, slot_time_ms, ghost)
        this.reset()
    }

    reset() {
        this.clock = null
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

    position(time_ms) { // in 16th steps, counted from an arbitrary but steady start
        const c = this.clock
        return (c.offset + (time_ms - c.anchor_ms) / c.beat_ms) * 4
    }
    slot_time(n) {
        const c = this.clock
        return c.anchor_ms + ((n / 4) - c.offset) * c.beat_ms
    }

    learned(kind) {
        const lane = this.lane[kind]
        let sum = 0
        for (let i = 0; i < STEPS; i++) sum += lane.score[i]
        return lane.bars >= 2 && sum >= LEARNED_SUM[kind]
    }

    hit(kind, strength, time_ms) {
        const c = this.clock
        if (!c) { this.emit(kind, strength, time_ms, false); return } // no beat clock yet: pass it through as heard
        const lane = this.lane[kind]
        const pos = this.position(time_ms)
        // a ring-out or a double trigger of one sound: close behind the last hit, and not clearly louder
        if (time_ms - lane.last < REPEAT * c.beat_ms / 4 && strength < 1.5 * lane.last_strength) { this.stats.repeat++; return }
        // where the grid really is: follow where the kicks and snares land against it (a clock a bit early or late)
        if (kind !== "hat") this.bias = wrap(this.bias + 0.2 * wrap(pos - Math.round(pos) - this.bias))
        const n = Math.round(pos - this.bias)
        const dev = pos - this.bias - n
        if (Math.abs(dev) > OFF_GRID) {
            if (strength < OFF_GRID_STRONG) { this.stats.off_grid++; return }
            // between two steps but clearly a hit: show it when it was heard, not on the grid
            lane.last = time_ms
            lane.last_strength = strength
            this.stats.as_heard++
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
        if (index % 4 !== 0 && this.learned(kind) && strength < WEAK && lane.score[index] < GATE_BELOW) { this.stats.gated++; return } // not part of this pattern
        slot.fired = true
        this.stats.passed++
        this.emit(kind, strength, this.slot_time(n) + this.bias * c.beat_ms / 4, false)
    }

    // call often (every ~25 ms): closes the slots that are over and fills in the missed ones
    tick(now_ms) {
        const c = this.clock
        if (!c) return
        for (const kind of KINDS) {
            const lane = this.lane[kind]
            if (lane.next === null) continue
            const last = Math.floor(this.position(now_ms - DETECT_DELAY_MS) - this.bias - OFF_GRID) // a slot is over once nothing can still arrive for it
            if (lane.next < last - 64) lane.next = last - 64 // a long gap: do not walk through all of it
            while (lane.next <= last) {
                const n = lane.next
                const slot = lane.slots.get(n)
                const index = ((n % STEPS) + STEPS) % STEPS
                const heard = slot && slot.heard
                let ghosted = false
                const floor_step = kind === "kick" && index % 4 === 0
                const near = floor_step && this.slot_time(n) - lane.last < FLOOR_NEAR_BEATS * c.beat_ms
                const wanted = near ? lane.score[index] >= FLOOR_GHOST_AT && lane.run[index] < MAX_GHOST_RUN + 1 : lane.score[index] >= GHOST_AT && lane.run[index] < MAX_GHOST_RUN
                if (!heard && !(slot && slot.fired) && this.learned(kind) && wanted) {
                    ghosted = true
                    // the memory says a hit belongs here but none was heard: play it
                    lane.run[index]++
                    if (slot) slot.fired = true
                    else lane.slots.set(n, { heard: false, fired: true, ghost: true, strength: 0 })
                    this.stats.ghost++
                    this.emit(kind, Math.min(1.2, lane.score[index] + 0.3), this.slot_time(n) + this.bias * c.beat_ms / 4, true)
                }
                if (heard) lane.run[index] = 0
                // only what was really heard teaches the pattern
                lane.score[index] += (ghosted && near ? FLOOR_RATE : RATE) * ((heard ? 1 : 0) - lane.score[index])
                if (index === STEPS - 1) lane.bars++
                lane.slots.delete(n - 8)
                lane.next++
            }
        }
    }
}

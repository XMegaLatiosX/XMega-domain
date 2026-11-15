import { TEMPLATES, best_fit } from "./patterns.js"
import { echo_count } from "./beeps.js"
import { S, DEFAULTS } from "./settings.js"

// What the data panel shows and copies: a rolling record of what the groove decided (see groove.js, its `trace`) and
// of how loud each part of the sound was, so the last few beats can be copied as text and read later.
const MAX_EVENTS = 900
const MAX_SAMPLES = 400
const events = []
const samples = [] // { t, levels: [low, body, mid, crack, air] } about every 100 ms

export function note_event(entry) {
    events.push(entry)
    if (events.length > MAX_EVENTS) events.shift()
}

export function note_sample(t, levels) {
    const last = samples[samples.length - 1]
    if (last && t - last.t < 100) return
    samples.push({ t, levels: Array.from(levels) })
    if (samples.length > MAX_SAMPLES) samples.shift()
}

export function recent_events(count, epoch) {
    const out = []
    for (let i = events.length - 1; i >= 0 && out.length < count; i--) if (events[i].epoch === epoch) out.push(events[i])
    return out
}

const fixed = (value, digits = 2) => (typeof value === "number" && isFinite(value) ? value.toFixed(digits) : "-")
const NAMES = ["low", "body", "mid", "crack", "air"]

// the numbers that explain the decisions, as lines of text
export function stats_text(groove, extra) {
    const s = groove.stats
    const info = groove.info || {}
    const lines = []
    lines.push(`mode ${extra.mode}  bpm ${fixed(extra.bpm, 1)}  beat_ms ${groove.clock ? fixed(groove.clock.beat_ms, 1) : "-"}  grid bias ${fixed(groove.bias)} steps`)
    lines.push(`counters since the last tempo reset: passed ${s.passed}  off_grid ${s.off_grid}  repeat ${s.repeat}  gated ${s.gated}  ghost ${s.ghost}  as_heard ${s.as_heard}  echo ${echo_count()} (feedback sounds heard again and thrown away)`)
    lines.push(`pattern ${groove.pattern || "none"}${groove.candidate && groove.candidate.name ? `  (candidate ${groove.candidate.name} x${groove.candidate.count})` : ""}  bad_bars ${groove.bad_bars}  floor_forced ${groove.floor_forced}  sound ${groove.sound}`)
    lines.push(`loud ${fixed(info.loud)}  last 9 s: rejected ${info.rejected ?? "-"} passed ${info.passed ?? "-"}  tempo changes in 10 s ${info.changes ?? "-"}  kick_gone ${info.kick_gone ?? "-"}  messy ${info.messy ?? "-"}`)
    const { all } = best_fit(groove.lane.kick.score)
    lines.push("pattern fits (kick): " + Object.keys(TEMPLATES).map((name) => `${name} ${fixed(all[name].fit)}${all[name].ok ? "*" : ""}`).join("  ") + "   (* = fits)")
    for (const kind of ["kick", "snare", "hat"]) {
        const lane = groove.lane[kind]
        lines.push(`memory ${kind.padEnd(5)} (16 steps, bars ${lane.bars}): ` + Array.from(lane.score, (v) => fixed(v, 1).replace("0.", ".")).join(" "))
    }
    const changed = Object.keys(DEFAULTS).filter((key) => S[key] !== DEFAULTS[key]).map((key) => `${key}=${S[key]}`)
    lines.push(`settings changed from default: ${changed.length ? changed.join(", ") : "none"}`)
    const song = typeof window !== "undefined" ? window.__song : null
    if (song) {
        lines.push(`song: in_break ${song.in_break}  fast ${fixed(song.fast)}  short ${fixed(song.short)}  long ${fixed(song.long)}  drop meter (short-long, drops at 0.25) ${fixed(song.short - song.long)}  peak ${fixed(song.peak)}  pulse ${fixed(song.pulse)}  size ${fixed(song.size)}`)
        const log = song.log.slice(-4)
        if (log.length) lines.push("song log: " + log.map((e) => `${e.what} ${Math.round((performance.now() - e.at) / 1000)}s ago`).join(", "))
    }
    return lines.join("\n")
}

// the last `count` beats: for each, what each kind did on its 16th steps and how loud each part of the sound was
export function beats_text(groove, extra, count = 16) {
    const clock = groove.clock
    if (!clock) return stats_text(groove, extra) + "\n\n(no beat clock yet: nothing to show per beat)"
    const now = performance.now()
    const current = Math.floor(groove.position(now - 27) / 4)
    const from = current - count + 1
    const per_beat = new Map()
    for (const event of events) {
        if (event.epoch !== groove.epoch) continue
        const beat = Math.floor(event.pos / 4)
        if (beat < from || beat > current) continue
        if (!per_beat.has(beat)) per_beat.set(beat, [])
        per_beat.get(beat).push(event)
    }
    const lines = [stats_text(groove, extra), "", `last ${count} beats (oldest first). step = 16th inside the bar (0-15), a beat is 4 steps. dev = distance from the grid in steps.`, "outcomes: passed | ghost (filled in) | as_heard (strong, off grid, shown as heard) | dropped: repeat, off_grid, gated"]
    for (let beat = from; beat <= current; beat++) {
        const slot_from = groove.slot_time(beat * 4)
        const slot_to = groove.slot_time(beat * 4 + 4)
        const level = [0, 0, 0, 0, 0]
        let n = 0
        for (const sample of samples) {
            if (sample.t < slot_from || sample.t >= slot_to) continue
            for (let g = 0; g < 5; g++) level[g] += sample.levels[g]
            n++
        }
        const loud = n ? level.map((v, g) => `${NAMES[g][0]}${fixed(v / n, 1).replace("0.", ".")}`).join(" ") : "no samples"
        const list = (per_beat.get(beat) || []).sort((a, b) => a.pos - b.pos)
        const bar_beat = ((beat % 4) + 4) % 4
        lines.push(`beat ${beat - current} (beat ${bar_beat + 1} of the bar)  levels ${loud}`)
        if (!list.length) lines.push("   nothing heard")
        for (const event of list) {
            const step = event.index === null ? `~${((Math.round(event.pos) % 16) + 16) % 16}` : event.index
            lines.push(`   ${event.kind.padEnd(5)} step ${String(step).padStart(2)}  ${event.outcome.padEnd(13)} strength ${fixed(event.strength)}${event.dev === null ? "" : `  dev ${fixed(event.dev)}`}`)
        }
    }
    return lines.join("\n")
}

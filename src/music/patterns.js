// Kick patterns that show up again and again, as the steps (0..15, sixteenths of one bar) that carry a kick.
// groove.js matches what it has heard against these; when one fits, it becomes the default for the song:
// a missing kick on one of its steps is filled in, and weak odd hits off it are dropped, until something that
// recurs fits another pattern better, or the sound stops.
export const TEMPLATES = {
    four_on_floor: [0, 4, 8, 12], // house, techno, disco, most dance music
    two_step: [0, 10], // drum & bass, breakbeat
    breaks: [0, 6, 10], // hip hop, boom bap, trap-ish
    half_time: [0], // one kick a bar: dubstep, slow trap
    eighths: [0, 2, 4, 6, 8, 10, 12, 14], // 8 of the 16 steps: a build-up before a drop
    sixteenths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], // all 16: the roll right before a drop
}

// how well the memory of a bar (score per step, 0..1) matches each pattern: recall over the pattern's steps, minus
// what is there outside of it. `ok` = a believable match.
export function fits(score) {
    const out = {}
    let total = 0
    for (let i = 0; i < score.length; i++) total += Math.min(1, score[i])
    for (const [name, steps] of Object.entries(TEMPLATES)) {
        let inside = 0
        for (const i of steps) inside += Math.min(1, score[i])
        const recall = inside / steps.length
        const extra = total - inside
        const fit = recall - (0.5 * extra) / Math.max(steps.length, 2)
        out[name] = { fit, ok: recall >= 0.75 && extra <= 0.4 * steps.length + 0.3 }
    }
    return out
}

export function best_fit(score) {
    const all = fits(score)
    let best = null
    for (const [name, value] of Object.entries(all)) {
        if (value.ok && (!best || value.fit > best.fit)) best = { name, fit: value.fit }
    }
    return { all, best }
}

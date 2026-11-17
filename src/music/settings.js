import { useSyncExternalStore } from "react"

// Every number the visualizer can be tuned with, in one place. The settings panel is drawn from this list, and the rest of
// the code reads the current values from `S` (a plain object, always up to date) at the moment it needs them.
//   where: "fx" effects (components/reactions-layer.jsx), "groove" decisions (groove.js), "provider" (BeatProvider.jsx),
//          "worker" detection and tempo (sent to the worker, see worker_values())
// Each setting has a soft meaning (1 = normal for the multipliers) and hard limits: a value outside min..max is pulled
// back to the limit, so no typed number can break the page. Multipliers have no low-end surprise: 0 turns the effect off.
export const GROUPS = [
    { id: "effects", title: "effects", note: "how strong each effect is. 1 = normal, 0 = off, no top limit worth worrying about" },
    { id: "site", title: "whole site", note: "how the other pages move to the beat: header logo, screen glow, edge pixels and bars. 0 = off" },
    { id: "often", title: "how often", note: "how rare or common the big moves are" },
    { id: "flash", title: "flashes", note: "the white and bright flashes (also the drop flash)" },
    { id: "where", title: "where effects show", note: "turn whole parts of the page on or off" },
    { id: "song", title: "song events", note: "breaks, build-ups and drops: when they trigger and how they look" },
    { id: "detect", title: "detection", note: "what counts as a kick, snare or hat (only when following the tab's sound)" },
    { id: "decide", title: "decisions", note: "what the groove does with the hits it heard: grid, ghosts, patterns" },
    { id: "forced", title: "forced four on the floor", note: "when it gives up on the hits and puts a kick on every beat" },
    { id: "tempo", title: "tempo", note: "how the BPM is guessed" },
]

const n = (group, key, label, def, min, max, step, hint, where = "fx") => ({ group, key, label, def, min, max, step, hint, where, type: "number" })
const b = (group, key, label, def, hint, where = "fx") => ({ group, key, label, def, hint, where, type: "bool" })

export const SCHEMA = [
    // ---- effects
    n("effects", "fx_kick", "kick looks", 1, 0, 50, 0.1, "multiplies the strength of every kick; below 1 they also fire less often"),
    n("effects", "fx_snare", "snare looks", 1, 0, 50, 0.1, "the same for snares"),
    n("effects", "fx_hat", "hat looks", 1, 0, 50, 0.1, "the same for hi-hats"),
    n("effects", "fx_thin", "thin lasers", 1, 0, 50, 0.1, "the six lasers behind the images and the laser/tick/line looks"),
    n("effects", "fx_thick", "thick laser", 1, 0, 50, 0.1, "the big laser: how wide it gets (0 = never)"),
    n("effects", "fx_streaks", "laser streaks", 1, 0, 50, 0.1, "the lines that run along the big laser, away from the logo (0 = none)"),
    n("effects", "fx_drop", "drop", 1, 0, 50, 0.1, "how big the drop reaction is: flash, bursts, grid speed (0 = no reaction)"),
    n("effects", "fx_pixels", "pixels", 1, 0, 50, 0.1, "how many pixels stream from the logo and rise from the floor"),
    n("effects", "fx_grid", "grid speed", 1, 0, 50, 0.1, "how much faster the image grid moves when the sound is loud"),
    n("effects", "fx_tint", "mood colour", 1, 0, 50, 0.1, "the faint blue/violet/red glow that follows the mood (0 = off)"),
    n("effects", "fx_logo", "logo pulse", 1, 0, 50, 0.1, "how hard the logo and title hit on every beat"),
    n("effects", "flash_power", "flash power", 1, 0, 5, 0.1, "how bright the flash looks are (the limit below still applies)"),
    // ---- how often
    n("often", "thick_pause", "thick laser pause", 1, 0.05, 50, 0.1, "multiplies the wait between big lasers (normally 12 to 26 s)"),
    n("often", "laser_alongside", "snare also fires laser", 0.6, 0, 1, 0.05, "chance that a snare also fires the thin laser"),
    n("often", "extras_chance", "second look", 0.3, 0, 1, 0.05, "chance of a second look on top of the main one"),
    n("often", "scene_beats", "look changes every", 16, 1, 512, 1, "beats between one set of looks and the next"),
    n("often", "title_swap_every", "title swap wait", 1, 0, 50, 0.1, "multiplies how long the title waits before swapping colours (0 = never)"),
    // ---- flashes
    n("flash", "flash_per_s", "max flashes per second", 3, 0, 60, 1, "0 = no limit. 3 is the usual safe limit for people sensitive to flashing"),
    // ---- where
    b("where", "show_logo", "logo", true, "the beat animation of the logo, its rings and size"),
    b("where", "show_wall", "image wall", true, "every look that changes the images"),
    b("where", "show_title", "title", true, "glitch, blink and colour swap of the title"),
    b("where", "show_pixels", "pixels", true, "pixel bursts, sparks and the pixel streams"),
    // ---- song events
    n("song", "drop_sens", "drop sensitivity", 1, 0, 50, 0.1, "higher = easier to trigger (the jump needed is 0.25 divided by this). 0 = never"),
    n("song", "drop_cooldown", "drop cooldown (s)", 8, 0, 600, 1, "minimum time between two drops"),
    n("song", "buildup_sens", "build-up sensitivity", 1, 0, 50, 0.1, "higher = a gentler rise counts as a build-up. 0 = never"),
    n("song", "break_sens", "break sensitivity", 1, 0, 50, 0.1, "higher = a break is called at a higher volume. 0 = never"),
    n("song", "break_dim", "break wall opacity", 0.4, 0, 1, 0.05, "how visible the images stay in a break"),
    n("song", "hold_zoom", "open space: shrink", 0.5, 0, 0.5, 0.01, "how much the wall images shrink (0.5 = half size) in the open space, which comes in a drop: the images get small and far apart. The page itself never changes size. 0 = off"),
    n("song", "hold_bars", "open space: bars", 4, 1, 32, 1, "how many bars (4 beats each) the open space lasts after a drop"),
    n("song", "hold_speed", "open space: image speed", 2.5, 1, 8, 0.1, "how much faster the images move while it is open (1 = same speed)"),
    n("song", "hold_in", "open space: in (s)", 0.8, 0.2, 30, 0.1, "how long the shrink takes (a straight line)"),
    n("song", "hold_out", "open space: back (s)", 3, 0.2, 60, 0.5, "how long the return takes (a straight line)"),
    b("song", "hold_busy", "open space: also when very busy", false, "also opens it when the big laser stays up for a while (off = only in drops)"),
    n("song", "hold_wait", "busy: wait (s)", 2, 0, 60, 0.5, "seconds the big laser must stay up before the open space starts (only with the option above)"),
    n("song", "hold_leave", "busy: stay (s)", 6, 0, 120, 0.5, "seconds without the big laser before it goes back to normal (only with the option above)"),
    b("song", "hold_force", "open space: hold now", false, "keeps the open space on, to see how it looks"),
    n("song", "drop_stars", "drop stars", 90, 0, 1000, 10, "stars streaming past in the space around the page"),
    n("song", "pulse_min", "quiet pulse", 0.55, 0, 1, 0.05, "how strong the logo pulse stays in very quiet music"),
    n("song", "size_min", "logo size (quiet)", 0.9, 0.3, 1, 0.01, "logo size in quiet music"),
    n("song", "size_max", "logo size (loud)", 1.12, 1, 3, 0.01, "logo size in loud music"),
    // ---- detection (worker)
    n("detect", "det_kick", "kick sensitivity", 1, 0, 50, 0.1, "how little the low end has to rise to count as a kick (0 = off)", "worker"),
    n("detect", "det_snare", "snare sensitivity", 1, 0, 50, 0.1, "the same for snares", "worker"),
    n("detect", "det_hat", "hat sensitivity", 1, 0, 50, 0.1, "the same for hats", "worker"),
    n("detect", "min_kick", "kick floor", 0.35, 0.01, 20, 0.05, "smallest rise that can ever be a kick (keeps hiss from counting)", "worker"),
    n("detect", "min_snare", "snare floor", 0.9, 0.01, 20, 0.05, "smallest rise that can ever be a snare", "worker"),
    n("detect", "min_hat", "hat floor", 0.5, 0.01, 20, 0.05, "smallest rise that can ever be a hat", "worker"),
    n("detect", "kick_hz", "kick range ends at (Hz)", 160, 60, 400, 5, "the low band, where kicks live, ends here. Raise for a boomy kick, lower for a tight one", "worker"),
    n("detect", "hat_hz", "hat range starts at (Hz)", 5000, 2000, 12000, 100, "the air band, where hats live, starts here", "worker"),
    n("detect", "hat_air_ratio", "hat: air over the rest", 1.5, 0, 20, 0.1, "a hat needs this much more air and snap than low, body and mid", "worker"),
    n("detect", "kick_low_ratio", "kick: low over body", 0.7, 0, 20, 0.05, "a kick needs at least this much low end compared with the body range", "worker"),
    n("detect", "snare_snap_ratio", "snare: snap over low", 0.25, 0, 20, 0.05, "a snare needs at least this much snap compared with the low end", "worker"),
    n("detect", "refractory_ms", "kick/snare gap (ms)", 70, 10, 500, 5, "after a kick or snare, wait this long before hearing another", "worker"),
    n("detect", "hat_refractory_ms", "hat gap (ms)", 40, 10, 500, 5, "the same for hats", "worker"),
    // ---- decisions (groove)
    n("decide", "grid_tol", "grid tolerance", 0.3, 0.05, 0.5, 0.05, "how far (in 16th steps) a hit can sit from the grid and still be snapped to it", "groove"),
    n("decide", "strong_hit", "strong hit", 1.6, 0.3, 10, 0.1, "a hit this strong is shown as heard even when it is off the grid", "groove"),
    n("decide", "weak_hit", "weak hit", 1.3, 0.1, 10, 0.1, "only hits weaker than this can be dropped for not fitting the pattern", "groove"),
    n("decide", "repeat_gap", "same-sound gap", 0.65, 0.1, 2, 0.05, "steps: a hit this soon after the last one of its kind is the same sound heard again", "groove"),
    n("decide", "ghost_at", "ghost eagerness", 0.7, 0.05, 1, 0.05, "a step is filled in when its memory is at least this. Lower = more ghosts", "groove"),
    n("decide", "floor_ghost_at", "floor ghost eagerness", 0.45, 0.05, 1, 0.05, "the same, for the kick on a beat while four on the floor is likely", "groove"),
    n("decide", "ghost_run", "ghosts in a row", 2, 0, 16, 1, "how many ghosts in a row one step gets before it is let go", "groove"),
    n("decide", "gate_below", "weak-hit gate", 0.2, 0, 1, 0.05, "a weak hit on a step with less memory than this is dropped", "groove"),
    n("decide", "lock_bars", "bars to lock a pattern", 2, 1, 16, 1, "how many bars in a row must fit before the pattern is locked", "groove"),
    n("decide", "unlock_bars", "bars to let it go", 2, 1, 16, 1, "how many bars in a row must not fit before the pattern is dropped", "groove"),
    n("decide", "switch_margin", "pattern switch margin", 0.25, 0, 1, 0.05, "another pattern must fit this much better to take over", "groove"),
    b("decide", "genre_lock", "lock the genre pattern", true, "recognise and lock the kick pattern", "groove"),
    b("decide", "floor_assist", "four on the floor assist", true, "easier four on the floor, and the forced mode below", "groove"),
    n("decide", "swing", "swing (%)", 50, 50, 75, 0.5, "50 = straight 16ths, 66.7 = triplet feel (shuffle, trap, hip hop)", "groove"),
    b("decide", "bias_auto", "follow the grid by ear", true, "the grid follows where kicks and snares really land", "groove"),
    n("decide", "bias_manual", "grid offset", 0, -0.5, 0.5, 0.01, "steps, used when the line above is off", "groove"),
    n("decide", "bias_rate", "grid follow speed", 0.2, 0, 1, 0.05, "how fast the grid follows the hits", "groove"),
    n("decide", "hit_delay_ms", "detection delay (ms)", 27, 0, 200, 1, "how long after a hit starts the detector reports it", "provider"),
    // ---- whole site
    n("site", "site_logo", "header logo", 1, 0, 50, 0.1, "how hard the logo in the header hits on every beat"),
    n("site", "site_flash", "screen glow", 1, 0, 50, 0.1, "the faint glow that breathes at the edge of the screen"),
    n("site", "site_edges", "edge pixels and bars", 1, 0, 50, 0.1, "the row of pixels along the bottom and the bars on both sides"),
    // ---- forced four on the floor
    n("forced", "loud_on", "loud above", 0.45, 0, 1, 0.05, "only when the sound is at least this loud", "provider"),
    n("forced", "reject_ratio", "rejected vs passed", 1.5, 0, 20, 0.1, "hits thrown away this many times more than passed counts as messy", "provider"),
    n("forced", "tempo_changes", "tempo changes", 2, 1, 20, 1, "this many BPM changes in 10 s count as messy", "provider"),
    n("forced", "kick_gone_beats", "kick gone after (beats)", 6, 1, 64, 1, "no kick for this long after a kick pattern counts as messy", "provider"),
    n("forced", "forced_on_s", "switch on after (s)", 2, 0, 60, 0.5, "messy for this long turns it on", "provider"),
    n("forced", "forced_off_s", "switch off after (s)", 4, 0, 60, 0.5, "clear for this long turns it off", "provider"),
    n("forced", "sound_level", "sound threshold", 0.1, 0, 1, 0.01, "below this loudness there is no sound (no ghosts in silence)", "provider"),
    // ---- tempo (worker)
    n("tempo", "bpm_min", "lowest BPM", 70, 30, 300, 1, "the slowest tempo it will pick", "worker"),
    n("tempo", "bpm_max", "highest BPM", 190, 60, 400, 1, "the fastest tempo it will pick", "worker"),
    n("tempo", "prefer_faster", "prefer faster", 0.6, 0, 1, 0.05, "when half or double of a tempo both fit, how much to favour the faster one", "worker"),
    n("tempo", "prior_center", "usual BPM", 120, 60, 200, 1, "the tempo it expects first", "worker"),
]

export const DEFAULTS = Object.fromEntries(SCHEMA.map((item) => [item.key, item.def]))
const BY_KEY = Object.fromEntries(SCHEMA.map((item) => [item.key, item]))

// named sets of values (only what differs from the defaults)
export const PRESETS = {
    default: {},
    calm: { site_logo: 0.6, site_flash: 0.5, site_edges: 0.5, fx_kick: 0.6, fx_snare: 0.6, fx_hat: 0.5, fx_thin: 0.6, fx_thick: 0.6, fx_drop: 0.6, fx_pixels: 0.6, fx_grid: 0.5, flash_per_s: 2, flash_power: 0.6, thick_pause: 2, drop_zoom: 0.6 },
    club: { site_logo: 1.3, site_flash: 1.3, site_edges: 1.4, fx_kick: 1.3, fx_snare: 1.3, fx_hat: 1.2, fx_thin: 1.3, fx_pixels: 1.4, fx_grid: 1.5, fx_logo: 1.3, thick_pause: 0.6 },
    max: { site_logo: 1.6, site_flash: 2, site_edges: 2, fx_kick: 2, fx_snare: 2, fx_hat: 2, fx_thin: 2, fx_thick: 2, fx_drop: 2, fx_pixels: 2.5, fx_grid: 2, fx_tint: 1.5, fx_logo: 1.6, flash_power: 1.5, flash_per_s: 0, thick_pause: 0.3, scene_beats: 8, drop_sens: 1.5 },
}

const KEY = "xm_viz_settings"
const VERSION = 1

export function clamp_value(key, value) {
    const item = BY_KEY[key]
    if (!item) return undefined
    if (item.type === "bool") return !!value
    const number = Number(value)
    if (!isFinite(number)) return item.def
    const clamped = Math.min(item.max, Math.max(item.min, number))
    const stepped = item.step >= 1 ? Math.round(clamped) : clamped
    return Math.round(stepped * 1e6) / 1e6
}

// `S` is edited in place (never replaced), so code that holds on to it always sees the current values
export const S = { ...DEFAULTS }
let snapshot = { ...S } // a new object on every change, for React
const listeners = new Set()

function save() {
    try {
        const changed = {}
        for (const key of Object.keys(DEFAULTS)) if (S[key] !== DEFAULTS[key]) changed[key] = S[key]
        localStorage.setItem(KEY, JSON.stringify({ v: VERSION, values: changed }))
    } catch { /* private window: it just is not remembered */ }
}

function changed() {
    snapshot = { ...S }
    save()
    listeners.forEach((listener) => listener())
}

// Takes values from anywhere (the saved copy, a pasted text): only known keys, each pulled into its limits.
export function load_values(values) {
    let count = 0
    if (!values || typeof values !== "object" || Array.isArray(values)) return 0
    for (const key of Object.keys(DEFAULTS)) {
        if (!Object.prototype.hasOwnProperty.call(values, key)) continue
        S[key] = clamp_value(key, values[key])
        count++
    }
    return count
}

try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    if (saved && saved.v === VERSION) load_values(saved.values)
    snapshot = { ...S }
} catch { /* nothing saved, or no storage */ }

export function set_setting(key, value) {
    if (!BY_KEY[key]) return
    const next = clamp_value(key, value)
    if (S[key] === next) return
    S[key] = next
    changed()
}

export function reset_settings() {
    Object.assign(S, DEFAULTS)
    changed()
}

export function apply_preset(name) {
    const preset = PRESETS[name]
    if (!preset) return
    Object.assign(S, DEFAULTS)
    load_values(preset)
    changed()
}

// the changed values as text, to copy, keep or send
export function export_settings() {
    const diff = {}
    for (const key of Object.keys(DEFAULTS)) if (S[key] !== DEFAULTS[key]) diff[key] = S[key]
    return JSON.stringify({ xm_viz_settings: VERSION, values: diff }, null, 2)
}

// returns how many values were taken, or -1 when the text is not a settings text
export function import_settings(text) {
    try {
        const parsed = JSON.parse(text)
        const values = parsed && parsed.xm_viz_settings === VERSION ? parsed.values : null
        if (!values) return -1
        Object.assign(S, DEFAULTS)
        const count = load_values(values)
        changed()
        return count
    } catch {
        return -1
    }
}

// what the detection worker needs to know
export const WORKER_KEYS = SCHEMA.filter((item) => item.where === "worker").map((item) => item.key)
export function worker_values() {
    const values = {}
    for (const key of WORKER_KEYS) values[key] = S[key]
    return values
}

export function subscribe_settings(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function useSettings() {
    return useSyncExternalStore(subscribe_settings, () => snapshot, () => snapshot)
}

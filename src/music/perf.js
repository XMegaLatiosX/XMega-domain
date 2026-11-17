import { useSyncExternalStore } from "react"

// How heavy the site is allowed to be, kept apart from the presets (calm, club, max...): a preset says HOW the site reacts,
// this says HOW MUCH the device is asked to do. It is remembered per browser and never touched by the presets or by "reset all".
//   level   0 low, 1 medium (the default), 2 high
//   rhythm  false = nothing on the site reacts to the beat (no pulses, no effects, no screen glow)
// It is also written on <html> as perf-low / perf-medium / perf-high and rhythm-off, so the CSS can use it.
// What each level changes today: low turns off the screen glow and edges and the laser streaks; high makes the streaks denser.
// New heavy things (layers of images with animated properties, for example) should hang on these too.
const KEY = "xm_perf"
const NAMES = ["low", "medium", "high"]
const STREAKS = [0, 1, 1.5]

function load() {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY))
        const level = saved && Number.isInteger(saved.level) && saved.level >= 0 && saved.level <= 2 ? saved.level : 1
        return { level, rhythm: !(saved && saved.rhythm === false) }
    } catch {
        return { level: 1, rhythm: true }
    }
}

let state = load()
const listeners = new Set()

function mark() {
    const root = document.documentElement
    for (const name of NAMES) root.classList.toggle(`perf-${name}`, NAMES[state.level] === name)
    root.classList.toggle("rhythm-off", !state.rhythm)
}
mark()

export function set_perf(patch) {
    state = { ...state, ...patch }
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* private window: it just is not remembered */ }
    mark()
    listeners.forEach((listener) => listener())
}

export const perf_level = () => state.level
export const rhythm_on = () => state.rhythm
export const streak_factor = () => STREAKS[state.level]
export const PERF_NAMES = NAMES

export function usePerf() {
    return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener) }, () => state, () => state)
}

import { useSyncExternalStore } from "react"

// Which of the visualizer's panels are open: the data panel (what the site is hearing), the settings panel and the
// manual beat pad. Shared between the gear on the home page and the "pad" button in the player. Remembered per browser.
const KEY = "xm_viz_ui"
const EMPTY = { data: false, settings: false, pad: false }

function load() {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY))
        return { data: !!(saved && saved.data), settings: !!(saved && saved.settings), pad: !!(saved && saved.pad) }
    } catch {
        return { ...EMPTY }
    }
}

let state = load()
const listeners = new Set()

export function toggle_panel(name) {
    state = { ...state, [name]: !state[name] }
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* private window: it just is not remembered */ }
    listeners.forEach((listener) => listener())
}

function subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function useVizUi() {
    return useSyncExternalStore(subscribe, () => state, () => EMPTY)
}

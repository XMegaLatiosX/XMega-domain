import { useSyncExternalStore } from "react"

// The manual beat pad (see components/viz-ui.jsx): its buttons fire effects by hand. The effects live inside the
// reactions layer, which registers what each button should do while it is on the page.
//   kick, snare and hat go through the normal hit path (reactor.emit_hit), so they behave exactly like heard hits
//   thin  one thin laser          drop  a drop          thick  the big laser, on or off, with its bar (0..1)
const handlers = {}

export function register_manual(table) {
    Object.assign(handlers, table)
    return () => { for (const key of Object.keys(table)) if (handlers[key] === table[key]) delete handlers[key] }
}

export function fire(name, arg) {
    if (handlers[name]) handlers[name](arg)
}

// the big laser held by hand: on or off, and how strong and how fast it moves (0..1)
export const thick = { on: false, amount: 0.6 }
let snapshot = { ...thick }
const listeners = new Set()

export function set_thick(patch) {
    Object.assign(thick, patch)
    snapshot = { ...thick }
    listeners.forEach((listener) => listener())
}

export function useThick() {
    return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener) }, () => snapshot, () => snapshot)
}

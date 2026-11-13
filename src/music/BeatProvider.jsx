import { useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { BeatContext } from "./beat-context"

// One beat for the whole site.
//  - idle:   144 BPM, a soft pulse, not tied to any music
//  - synced: the visitor shares this tab's audio (Chrome/Edge on a computer), a worker finds the tempo and
//            where the beats fall, and the pulses are moved onto them
//  - tap:    the visitor taps the tempo by hand
// The pulses themselves are plain CSS animations (the "beat" and "pulseRing" keyframes) that read --beat
// (duration) and --beat-peak (size); this file only sets those two and puts the animations on the right phase.

const DEFAULT_BPM = 144
const IDLE_PEAK = 1.04
const ACTIVE_PEAK = 1.08
const PHASE_TOLERANCE_MS = 25
const NUDGE_KEY = "beat-nudge-ms"

function read_nudge() {
    try {
        const value = Number(localStorage.getItem(NUDGE_KEY))
        return Number.isFinite(value) ? value : 0
    } catch {
        return 0
    }
}

function mod(value, size) {
    return ((value % size) + size) % size
}

export default function BeatProvider({ children }) {
    const { pathname } = useLocation()
    const [info, set_info] = useState({ mode: "idle", bpm: DEFAULT_BPM, silent: false, message: "" })
    const [nudge_ms, set_nudge_ms] = useState(read_nudge)

    const applied = useRef(null) // { beat_ms, anchor_perf } currently on screen, or null when idle
    const nudge_ref = useRef(nudge_ms)
    const session = useRef(null) // { worker, audio } while sharing
    const taps = useRef([])
    const raw_anchor = useRef(null) // last anchor before the nudge was added, to re-apply when the nudge changes

    // put every beat animation on the phase the clock says: the "beat" keyframes peak at 50%, the ring starts at 0%
    function align_all() {
        const clock = applied.current
        if (!clock) return
        const now = performance.now()
        document.documentElement.getBoundingClientRect() // make sure a new --beat is already in effect
        for (const animation of document.getAnimations()) {
            const name = animation.animationName
            if (name === "beat") animation.currentTime = mod(now - clock.anchor_perf + clock.beat_ms / 2, clock.beat_ms)
            else if (name === "pulseRing") animation.currentTime = mod(now - clock.anchor_perf, clock.beat_ms)
        }
    }

    function apply(beat_ms, anchor_perf) {
        const root = document.documentElement
        applied.current = { beat_ms, anchor_perf }
        root.style.setProperty("--beat", `${(beat_ms / 1000).toFixed(4)}s`)
        root.style.setProperty("--beat-peak", String(ACTIVE_PEAK))
        align_all()
    }

    function back_to_idle() {
        const root = document.documentElement
        applied.current = null
        raw_anchor.current = null
        root.style.removeProperty("--beat")
        root.style.removeProperty("--beat-peak")
    }

    // a fresh estimate from the worker: only touch the animations if the tempo or the phase really moved
    function on_estimate(beat_ms, anchor_wall_ms) {
        raw_anchor.current = anchor_wall_ms - performance.timeOrigin
        const anchor_perf = raw_anchor.current + nudge_ref.current
        const clock = applied.current
        if (clock) {
            const same_tempo = Math.abs(beat_ms / clock.beat_ms - 1) < 0.003
            const error = mod(anchor_perf - clock.anchor_perf + clock.beat_ms / 2, clock.beat_ms) - clock.beat_ms / 2
            if (same_tempo && Math.abs(error) < PHASE_TOLERANCE_MS) return
        }
        apply(beat_ms, anchor_perf)
    }

    function stop_sync() {
        const current = session.current
        session.current = null
        if (!current) return
        current.worker.postMessage({ type: "stop" })
        current.worker.terminate()
        current.audio.stop()
    }

    function reset() {
        stop_sync()
        taps.current = []
        back_to_idle()
        set_info({ mode: "idle", bpm: DEFAULT_BPM, silent: false, message: "" })
    }

    async function start_sync() {
        if (typeof window.MediaStreamTrackProcessor === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            set_info({ mode: "unsupported", bpm: DEFAULT_BPM, silent: false, message: "Sharing the tab's sound needs Chrome or Edge on a computer. You can still tap the tempo." })
            return
        }
        reset()
        set_info({ mode: "asking", bpm: DEFAULT_BPM, silent: false, message: "" })
        let stream
        try {
            stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
                preferCurrentTab: true,
                selfBrowserSurface: "include",
                surfaceSwitching: "exclude",
                systemAudio: "exclude",
            })
        } catch {
            set_info({ mode: "idle", bpm: DEFAULT_BPM, silent: false, message: "" })
            return
        }
        const audio = stream.getAudioTracks()[0]
        stream.getVideoTracks().forEach((track) => track.stop()) // only the sound is needed
        if (!audio) {
            set_info({ mode: "error", bpm: DEFAULT_BPM, silent: false, message: "No sound was shared. Pick this tab and tick \"Also share tab audio\"." })
            return
        }

        const worker = new Worker(new URL("./beat-worker.js", import.meta.url), { type: "module" })
        const processor = new window.MediaStreamTrackProcessor({ track: audio })
        session.current = { worker, audio }
        audio.addEventListener("ended", () => {
            if (session.current && session.current.audio === audio) reset()
        })
        worker.onmessage = ({ data }) => {
            if (!session.current || session.current.worker !== worker) return
            if (data.type === "state") {
                on_estimate(data.beat_ms, data.anchor_wall_ms)
                set_info((current) => ({ ...current, mode: "locked", bpm: data.bpm, message: "" }))
            } else if (data.type === "level") {
                set_info((current) => (current.mode === "listening" || current.mode === "locked" ? { ...current, silent: data.rms < 0.0008 } : current))
            } else if (data.type === "error") {
                set_info({ mode: "error", bpm: DEFAULT_BPM, silent: false, message: data.message })
            }
        }
        worker.postMessage({ type: "start", readable: processor.readable }, [processor.readable])
        set_info({ mode: "listening", bpm: DEFAULT_BPM, silent: false, message: "" })
    }

    function tap() {
        stop_sync()
        const now = performance.now()
        taps.current = taps.current.filter((time) => now - time < 2500).concat(now).slice(-8)
        const times = taps.current
        if (times.length < 3) {
            set_info({ mode: "tap", bpm: DEFAULT_BPM, silent: false, message: "keep tapping..." })
            return
        }
        const beat_ms = (times[times.length - 1] - times[0]) / (times.length - 1)
        if (beat_ms < 250 || beat_ms > 1500) return
        raw_anchor.current = now
        apply(beat_ms, now + nudge_ref.current)
        set_info({ mode: "tap", bpm: 60000 / beat_ms, silent: false, message: "" })
    }

    function nudge(delta) {
        const next = Math.max(-200, Math.min(200, nudge_ref.current + delta))
        nudge_ref.current = next
        set_nudge_ms(next)
        try { localStorage.setItem(NUDGE_KEY, String(next)) } catch { /* private window */ }
        const clock = applied.current
        if (clock && raw_anchor.current !== null) apply(clock.beat_ms, raw_anchor.current + next)
    }

    // pages come and go: new elements start their animation from zero, so line them up again
    useEffect(() => {
        const frame = requestAnimationFrame(align_all)
        return () => cancelAnimationFrame(frame)
    }, [pathname])

    // stop listening when the whole site goes away
    useEffect(() => () => stop_sync(), [])

    const value = { ...info, nudge_ms, start_sync, stop_sync: reset, tap, nudge }
    return <BeatContext.Provider value={value}>{children}</BeatContext.Provider>
}

import { useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { BeatContext } from "./beat-context"
import { emit_hit, set_bands, get_bands } from "./reactor"
import { Groove } from "./groove"

// One beat for the whole site.
//  - idle:      144 BPM, a soft pulse, not tied to any music
//  - analyzing: the tab's sound is being listened to but no tempo is known yet: the pulse is held still
//  - auto:      the tempo and the beat positions come from the tab's sound (Chrome/Edge on a computer)
//  - manual:    the visitor typed a BPM or tapped it
// The pulses themselves are plain CSS animations (the "beat" and "pulseRing" keyframes) that read --beat
// (duration) and --beat-peak (size); this file only sets those two and puts the animations on the right phase.
//
// The tab's sound is asked for ONCE and kept for as long as the visitor stays on the site: the first song
// asks (the click that starts it is the permission to ask), later songs only restart the analysis.

const DEFAULT_BPM = 144
const ACTIVE_PEAK = 1.2
const PHASE_TOLERANCE_MS = 25
const NUDGE_KEY = "beat-nudge-ms"
const TAP_WINDOW_MS = 2500
const HIT_DETECT_DELAY_MS = 27 // a drum hit is reported about this long after it started (measured on synthetic drums)
const LAG_MS = 4000 // in lag mode the tab is silenced and its sound is played back this much later, so the beat is found before it is heard

function read_nudge() {
    try {
        const value = Number(localStorage.getItem(NUDGE_KEY))
        return Number.isFinite(value) ? value : 0
    } catch {
        return 0
    }
}

// TEST MODE: not remembered between visits, so a reload always goes back to the normal mode
function read_lag() {
    return false
}

function mod(value, size) {
    return ((value % size) + size) % size
}

export default function BeatProvider({ children }) {
    const { pathname } = useLocation()
    const [info, set_info] = useState({ mode: "idle", bpm: DEFAULT_BPM, silent: false, message: "", taps: 0 })
    const [nudge_ms, set_nudge_ms] = useState(read_nudge)
    const [lag, set_lag_state] = useState(read_lag)
    const lag_ref = useRef(lag)

    const applied = useRef(null) // { beat_ms, anchor_perf } currently on screen, or null
    const nudge_ref = useRef(nudge_ms)
    const session = useRef(null) // { worker, audio, latency } while the tab's sound is shared
    const source = useRef("auto") // who drives the pulse while the sound is shared: "auto" | "manual"
    const manual_kind = useRef("tap") // "tap" | "typed"
    const declined = useRef(false) // the visitor closed the sharing dialog: do not ask again by yourself
    const asking = useRef(false)
    // puts the heard drum hits on the beat grid (see groove.js); a hit it lets through is shown when it will be heard
    const groove = useRef(null)
    if (!groove.current) {
        groove.current = new Groove((kind, strength, slot_ms) => {
            const wait = Math.max(0, slot_ms + heard_delay_ms() + nudge_ref.current - performance.now())
            setTimeout(() => emit_hit(kind, strength), wait)
        })
    }
    if (typeof window !== "undefined") window.__groove = groove.current // for looking at in the console: __groove.stats, __groove.bias
    const last_bpm = useRef(0)
    const tempo_changes = useRef([]) // when the worker last changed its mind about the tempo
    const latest = useRef(null) // last estimate from the worker { beat_ms, raw_anchor_perf, bpm }
    const taps = useRef([])
    const tap_timer = useRef(0)
    const idle_clock = useRef(null) // { beat_ms, anchor_perf } the idle 144 BPM beat, aligned the same way as a real one
    const raw_anchor = useRef(null) // the anchor before nudge/latency, to re-apply when the nudge changes

    function set_mode(patch) {
        set_info((current) => {
            const next = { ...current, ...patch }
            document.documentElement.dataset.beat = next.mode === "analyzing" ? "analyzing" : ""
            return next
        })
    }

    // how long after the shared sound is taken it reaches the ears: the output latency, plus the playback delay in lag mode
    function heard_delay_ms() {
        const current = session.current
        if (!current) return 0
        const latency = current.latency && current.latency.outputLatency ? current.latency.outputLatency * 1000 : 0
        return latency + (current.chain ? LAG_MS : 0)
    }

    // put every beat animation on the phase the clock says: both the "beat" hit and the ring start at 0%, which is the beat
    function align_all() {
        const clock = applied.current || idle_clock.current
        if (!clock) return
        const now = performance.now()
        document.documentElement.getBoundingClientRect() // make sure a new --beat / un-paused state is already in effect
        for (const animation of document.getAnimations()) {
            const name = animation.animationName
            if (name === "beat" || name === "pulseRing") animation.currentTime = mod(now - clock.anchor_perf, clock.beat_ms)
        }
    }

    function apply(beat_ms, anchor_perf) {
        const root = document.documentElement
        applied.current = { beat_ms, anchor_perf }
        root.dataset.beat = ""
        root.style.setProperty("--beat", `${(beat_ms / 1000).toFixed(4)}s`)
        root.style.setProperty("--beat-peak", String(ACTIVE_PEAK))
        align_all()
    }

    function clear_css() {
        const root = document.documentElement
        applied.current = null
        raw_anchor.current = null
        root.style.removeProperty("--beat")
        root.style.removeProperty("--beat-peak")
    }

    // apply an anchor (taken before nudge/latency); skip it if nothing really moved
    function follow(beat_ms, raw_anchor_perf, force = false) {
        raw_anchor.current = raw_anchor_perf
        const anchor_perf = raw_anchor_perf + nudge_ref.current + heard_delay_ms()
        const clock = applied.current
        if (clock && !force) {
            const same_tempo = Math.abs(beat_ms / clock.beat_ms - 1) < 0.003
            const error = mod(anchor_perf - clock.anchor_perf + clock.beat_ms / 2, clock.beat_ms) - clock.beat_ms / 2
            if (same_tempo && Math.abs(error) < PHASE_TOLERANCE_MS) return
        }
        apply(beat_ms, anchor_perf)
    }

    // the beat the pulses are on right now: the one found (or tapped/typed), or the idle 144 BPM one
    function get_clock() {
        return applied.current || idle_clock.current || { beat_ms: 60000 / DEFAULT_BPM, anchor_perf: 0 }
    }

    function stop_capture() {
        const current = session.current
        session.current = null
        if (!current) return
        current.worker.postMessage({ type: "stop" })
        current.worker.terminate()
        clearInterval(current.groove_timer)
        groove.current.reset()
        current.audio.stop()
        if (current.chain) {
            current.chain.play_track.stop()
            clearInterval(current.chain.timer)
            current.chain.element.pause()
            current.chain.element.srcObject = null
            try { current.chain.node.disconnect(); current.chain.delay.disconnect(); current.chain.analyser.disconnect() } catch { /* already gone */ }
        }
        if (current.latency) current.latency.close().catch(() => {})
    }

    // back to the idle 144, and let go of the tab's sound
    function reset() {
        stop_capture()
        taps.current = []
        latest.current = null
        clear_css()
        set_mode({ mode: "idle", bpm: DEFAULT_BPM, silent: false, message: "", taps: 0 })
        requestAnimationFrame(align_all) // the idle pulses go back to the idle clock
    }

    async function start_capture() {
        if (session.current || asking.current) return
        if (typeof window.MediaStreamTrackProcessor === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            set_mode({ message: "Finding the beat from the sound needs Chrome or Edge on a computer. You can still tap or type the BPM." })
            return
        }
        asking.current = true
        const want_lag = lag_ref.current
        // created now, while the click that started all this still counts, only to read the output latency
        let latency = null
        try { latency = new AudioContext() } catch { /* no audio context: no latency correction */ }
        set_mode({ message: "" })
        let stream
        try {
            stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: want_lag ? { suppressLocalAudioPlayback: true, echoCancellation: false, noiseSuppression: false, autoGainControl: false } : true,
                preferCurrentTab: true,
                selfBrowserSurface: "include",
                surfaceSwitching: "exclude",
                systemAudio: "exclude",
            })
        } catch {
            asking.current = false
            declined.current = true
            if (latency) latency.close().catch(() => {})
            set_mode({ message: "Sharing was cancelled or blocked by the browser. Press auto to try again." })
            return
        }
        asking.current = false
        const audio = stream.getAudioTracks()[0]
        stream.getVideoTracks().forEach((track) => track.stop()) // only the sound is needed
        if (!audio) {
            if (latency) latency.close().catch(() => {})
            set_mode({ message: "No sound was shared. Choose this tab and tick \"Also share tab audio\"." })
            return
        }

        // lag mode: the browser must really silence the tab, then the sound is played back from here, delayed
        let chain = null
        let lag_message = ""
        if (want_lag) {
            const settings = audio.getSettings ? audio.getSettings() : {}
            if (latency && settings.suppressLocalAudioPlayback === true) {
                try {
                    await latency.resume()
                    const play_track = audio.clone()
                    const node = latency.createMediaStreamSource(new MediaStream([play_track]))
                    const delay = latency.createDelay(LAG_MS / 1000 + 1)
                    delay.delayTime.value = LAG_MS / 1000
                    // a meter on what is about to be played: it says whether sound reaches the speakers' side
                    const analyser = latency.createAnalyser()
                    analyser.fftSize = 1024
                    node.connect(delay)
                    delay.connect(analyser)
                    analyser.connect(latency.destination)
                    // some Chrome versions only feed a MediaStream into Web Audio while it is also attached to a media element
                    const element = new Audio()
                    element.srcObject = new MediaStream([play_track])
                    element.muted = true
                    element.play().catch(() => {})
                    const data = new Float32Array(analyser.fftSize)
                    const timer = setInterval(() => {
                        analyser.getFloatTimeDomainData(data)
                        let sum = 0
                        for (const v of data) sum += v * v
                        set_info((current) => ({ ...current, lag_level: Math.sqrt(sum / data.length), lag_state: latency.state }))
                    }, 250)
                    chain = { play_track, node, delay, analyser, element, timer }
                } catch {
                    lag_message = "Could not play the sound back with a delay. Lag mode is off."
                }
            } else {
                lag_message = `This browser did not silence the tab (suppressLocalAudioPlayback: ${String(settings.suppressLocalAudioPlayback)}). Lag mode is off.`
            }
            if (!chain) set_lag(false, false)
        }

        const worker = new Worker(new URL("./beat-worker.js", import.meta.url), { type: "module" })
        const processor = new window.MediaStreamTrackProcessor({ track: audio })
        groove.current.reset()
        // Loud and messy (the hits keep being rejected, the tempo keeps changing, or the kicks went silent): stop trusting the hits, put a
        // kick on every beat. It is switched on after 2 s of that and off after 4 s without it.
        let loud_average = 0
        let messy_since = 0
        let clear_since = 0
        let last_check = 0
        let marks = []
        const groove_timer = setInterval(() => {
            const now = performance.now()
            const bands = get_bands()
            loud_average += (Math.max(bands[0], bands[1], bands[2]) - loud_average) * 0.03
            groove.current.tick(now)
            if (now - last_check < 1000) return
            last_check = now
            const stats = groove.current.stats
            marks.push({ now, rejected: stats.repeat + stats.off_grid + stats.gated, passed: stats.passed })
            marks = marks.filter((mark) => now - mark.now < 9000)
            const first = marks[0]
            const rejected = stats.repeat + stats.off_grid + stats.gated - first.rejected
            const passed = stats.passed - first.passed
            const changes = tempo_changes.current.filter((time) => now - time < 10000).length
            // or: loud, a kick pattern was going, and for the last 6 beats not one kick has been heard (the kicks died)
            const last_kick = groove.current.lane.kick.last
            const kick_gone = groove.current.clock && last_kick > 0 && now - last_kick > 6 * groove.current.clock.beat_ms && now - last_kick < 60000
            const messy = loud_average > 0.45 && (rejected > 1.5 * (passed + 4) || changes >= 2 || kick_gone)
            if (messy) { clear_since = 0; messy_since = messy_since || now } else { messy_since = 0; clear_since = clear_since || now }
            if (!groove.current.floor_forced && messy_since && now - messy_since > 2000) groove.current.floor_forced = true
            if (groove.current.floor_forced && clear_since && now - clear_since > 4000) groove.current.floor_forced = false
        }, 25)
        session.current = { worker, audio, latency, chain, groove_timer }
        audio.addEventListener("ended", () => {
            if (session.current && session.current.audio === audio) reset()
        })
        worker.onmessage = ({ data }) => {
            if (!session.current || session.current.worker !== worker) return
            if (data.type === "state") {
                const raw = data.anchor_wall_ms - performance.timeOrigin
                latest.current = { beat_ms: data.beat_ms, raw_anchor_perf: raw, bpm: data.bpm }
                groove.current.set_clock(raw, data.beat_ms)
                if (last_bpm.current && Math.abs(data.bpm / last_bpm.current - 1) > 0.02) tempo_changes.current.push(performance.now())
                last_bpm.current = data.bpm
                if (source.current === "auto") {
                    follow(data.beat_ms, raw)
                    set_mode({ mode: "auto", bpm: data.bpm, message: "" })
                }
            } else if (data.type === "hit") {
                // the hit was reported a little after it started; the groove snaps it to the grid and drops repeats
                groove.current.hit(data.kind, data.strength, performance.now() - HIT_DETECT_DELAY_MS)
            } else if (data.type === "bands") {
                set_bands(data.values, data.tone)
            } else if (data.type === "level") {
                set_info((current) => (current.mode === "analyzing" || current.mode === "auto" ? { ...current, silent: data.rms < 0.0008 } : current))
            } else if (data.type === "error") {
                set_mode({ message: data.message })
            }
        }
        worker.postMessage({ type: "start", readable: processor.readable }, [processor.readable])
        if (source.current === "auto") {
            clear_css()
            set_mode({ mode: "analyzing", silent: false, message: lag_message })
        } else if (lag_message) {
            set_mode({ message: lag_message })
        }
    }

    // lag mode on/off. A running share has to be asked for again, because the browser fixes "silence the tab" when sharing starts.
    function set_lag(on, restart = true) {
        lag_ref.current = on
        set_lag_state(on)
        if (restart && session.current) {
            stop_capture()
            clear_css()
            source.current = "auto"
            declined.current = false
            start_capture()
        }
    }

    // called by the music player in the same click that starts a song: the first time, ask for the sound
    function ask_once() {
        if (session.current || asking.current || declined.current) return
        source.current = "auto"
        start_capture()
    }

    // a new song started: forget the old tempo and listen again (the pulse stays still meanwhile)
    function track_changed() {
        const current = session.current
        if (!current || source.current !== "auto") return
        current.worker.postMessage({ type: "reset" })
        latest.current = null
        groove.current.reset()
        // already following a song: keep pulsing at the old tempo until the new one is found.
        // The pulse is only held still when leaving the idle/manual beat for a first reading.
        if (info.mode !== "auto") {
            clear_css()
            set_mode({ mode: "analyzing", silent: false })
        }
    }

    // the "auto" button: follow the sound, listening again from scratch (so it also fixes a wrong or stale tempo,
    // for example after an intro). Asks for the sound only if it is not already shared.
    function auto() {
        source.current = "auto"
        taps.current = []
        declined.current = false
        const current = session.current
        if (!current) {
            start_capture()
            return
        }
        current.worker.postMessage({ type: "reset" })
        latest.current = null
        groove.current.reset()
        if (info.mode !== "auto") {
            clear_css()
            set_mode({ mode: "analyzing", silent: false, message: "" })
        } else {
            set_mode({ message: "" })
        }
    }

    function manual(beat_ms, anchor_perf, kind) {
        source.current = "manual"
        manual_kind.current = kind
        follow(beat_ms, anchor_perf, true)
        set_mode({ mode: "manual", bpm: 60000 / beat_ms, silent: false, message: "" })
    }

    // taps count from the 2nd one on: the gap between the last two taps is the tempo, the last tap is a beat
    function tap() {
        const now = performance.now()
        if (source.current === "manual" && manual_kind.current === "typed" && applied.current) {
            // a typed BPM only needs its phase: a tap says where a beat is
            manual(applied.current.beat_ms, now, "typed")
            return
        }
        let list = taps.current.filter((time) => now - time < TAP_WINDOW_MS)
        if (list.length >= 2) {
            const average = (list[list.length - 1] - list[0]) / (list.length - 1)
            if (Math.abs((now - list[list.length - 1]) / average - 1) > 0.4) list = [] // a very different gap: a new tempo
        }
        list = list.concat(now).slice(-8)
        taps.current = list
        clearTimeout(tap_timer.current)
        tap_timer.current = setTimeout(() => { taps.current = []; set_info((current) => ({ ...current, taps: 0 })) }, TAP_WINDOW_MS)
        if (list.length < 2) {
            set_info((current) => ({ ...current, taps: 1 }))
            return
        }
        const beat_ms = (list[list.length - 1] - list[0]) / (list.length - 1)
        if (beat_ms < 200 || beat_ms > 2000) return
        manual(beat_ms, now, "tap")
        set_info((current) => ({ ...current, taps: list.length }))
    }

    // a typed BPM starts now: the pulse begins at the moment of the Enter, and a tap can then move its phase
    function set_bpm(value) {
        const bpm = Number(String(value).replace(",", "."))
        if (!Number.isFinite(bpm) || bpm < 30 || bpm > 300) return false
        taps.current = []
        manual(60000 / bpm, performance.now(), "typed")
        return true
    }

    function nudge(delta) {
        const next = Math.max(-200, Math.min(200, nudge_ref.current + delta))
        nudge_ref.current = next
        set_nudge_ms(next)
        try { localStorage.setItem(NUDGE_KEY, String(next)) } catch { /* private window */ }
        const clock = applied.current
        if (clock && raw_anchor.current !== null) follow(clock.beat_ms, raw_anchor.current, true)
    }

    // pages come and go: new elements start their animation from zero, so line them up again
    useEffect(() => {
        if (!idle_clock.current) idle_clock.current = { beat_ms: 60000 / DEFAULT_BPM, anchor_perf: performance.now() }
        const frame = requestAnimationFrame(align_all)
        return () => cancelAnimationFrame(frame)
    }, [pathname])

    // stop listening when the whole site goes away
    useEffect(() => () => stop_capture(), [])

    const value = { ...info, nudge_ms, lag, set_lag, get_clock, ask_once, track_changed, auto, tap, set_bpm, nudge, reset }
    return <BeatContext.Provider value={value}>{children}</BeatContext.Provider>
}

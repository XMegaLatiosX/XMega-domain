import { useEffect, useState, useSyncExternalStore } from "react"
import { toggle_panel, useVizUi } from "../music/viz-ui"
import { useBeat } from "../music/useBeat"
import { useBeeps, set_beeps, echo_count } from "../music/beeps"
import { get_bars } from "../music/reactor"
import { band_group, band_hz, BAND_COUNT } from "../music/tempo"
import { best_fit } from "../music/patterns"
import { recent_events, stats_text, beats_text } from "../music/debug-log"
import { SCHEMA, GROUPS, PRESETS, DEFAULTS, useSettings, set_setting, reset_settings, apply_preset, export_settings, import_settings } from "../music/settings"

// The visualizer's tools on the home page. Layout only for now: nothing here is wired to the effects yet.
//   gear      very faint, top left. Opens a small menu that turns on the two panels below
//   data      what the site is hearing: one vertical bar per frequency band, plus sound feedback on each hit
//   settings  sensitivity of every effect, where each one shows up, patterns
//   pad       manual beat (opened from the "pad" button in the player): fire the effects by hand
const box = "border border-cyan-800 bg-black/75 backdrop-blur-sm text-cyan-200 leading-none pixel-font"
const panel = `${box} text-[11px]`
const small = "h-6 px-2 border border-cyan-800 text-cyan-300 hover:bg-cyan-950 cursor-pointer whitespace-nowrap"
const lit = "bg-cyan-950 text-cyan-100 border-cyan-500"

function Check({ label, checked, onChange }) {
    return (
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="accent-cyan-400" />
            <span>{label}</span>
        </label>
    )
}

function Slider({ label, value, onChange, max = 200, unit = "%" }) {
    return (
        <label className="flex items-center gap-2 select-none">
            <span className="w-20 shrink-0">{label}</span>
            <input type="range" min="0" max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="flex-1 min-w-0 accent-cyan-400" />
            <span className="w-9 text-right text-cyan-400">{value}{unit}</span>
        </label>
    )
}

function Title({ children, onClose }) {
    return (
        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-cyan-900 text-cyan-400">
            <span>{children}</span>
            <button type="button" className="px-1 cursor-pointer hover:text-cyan-100" onClick={onClose} aria-label="close">×</button>
        </div>
    )
}

// ---- data panel: what the site hears and what it decided from it ----

const BAND_NAMES = ["low", "body", "mid", "crack", "air"]
const fixed = (value, digits = 2) => (typeof value === "number" && isFinite(value) ? value.toFixed(digits) : "-")

// redraws the panel a few times a second while it is open (the numbers live outside React); returns the time of the redraw
function useLive(ms = 100) {
    const [now, set_now] = useState(() => performance.now())
    useEffect(() => {
        const id = setInterval(() => set_now(performance.now()), ms)
        return () => clearInterval(id)
    }, [ms])
    return now
}

async function copy_text(text) {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch {
        // no clipboard permission (or not a secure page): the old way
        const area = document.createElement("textarea")
        area.value = text
        area.style.position = "fixed"
        area.style.opacity = "0"
        document.body.appendChild(area)
        area.select()
        let ok = false
        try { ok = document.execCommand("copy") } catch { ok = false }
        area.remove()
        return ok
    }
}

function CopyButton({ label, make }) {
    const [state, set_state] = useState("")
    return (
        <button
            type="button" className={`${small} ${state ? lit : ""}`}
            onClick={async () => {
                const ok = await copy_text(make())
                set_state(ok ? "copied" : "failed")
                setTimeout(() => set_state(""), 1400)
            }}
        >
            {state || label}
        </button>
    )
}

const OUTCOME_COLOR = { passed: "#22d3ee", as_heard: "#67e8f9", ghost: "#0e7490", ghost_pattern: "#0e7490", ghost_forced: "#0e7490", repeat: "#f87171", off_grid: "#fb923c", gated: "#fbbf24" }

function Row({ label, children }) {
    return (
        <div className="flex items-start gap-2">
            <span className="w-14 shrink-0 text-cyan-600">{label}</span>
            <div className="flex-1 min-w-0">{children}</div>
        </div>
    )
}

function Advanced() {
    const now = useLive(100)
    const { mode, bpm } = useBeat()
    const groove = typeof window !== "undefined" ? window.__groove : null
    if (!groove) return null
    const following = !!groove.clock
    const info = groove.info || {}
    const stats = groove.stats
    const { all } = best_fit(groove.lane.kick.score)
    const step_now = following ? (((Math.floor(groove.position(now - 27)) % 16) + 16) % 16) : -1
    const song = window.__song
    const events = recent_events(10, groove.epoch)
    const extra = () => ({ mode, bpm })
    return (
        <div className="mt-2 pt-2 border-t border-cyan-900 space-y-2.5">
            {!following && <div className="text-cyan-600 leading-snug">Not following the tab&apos;s sound, so there are no hits to judge. Press auto sync in the player and play a song.</div>}
            <Row label="beat">
                <div>{mode} · {fixed(bpm, 1)} bpm · grid bias {fixed(groove.bias)} step</div>
                <div className="text-cyan-500 mt-1">sound {groove.sound ? "yes" : "no"} · loud {fixed(info.loud)}{groove.floor_forced ? " · floor forced" : ""}</div>
            </Row>
            <Row label="pattern">
                <div className="text-cyan-100">{groove.pattern || "none yet"}{groove.candidate && groove.candidate.name ? <span className="text-cyan-500"> (maybe {groove.candidate.name} x{groove.candidate.count})</span> : null}</div>
                <div className="mt-1 space-y-[3px]">
                    {Object.keys(all).map((name) => (
                        <div key={name} className="flex items-center gap-1.5" style={{ opacity: name === groove.pattern ? 1 : 0.7 }}>
                            <span className="w-20 shrink-0 truncate">{name}</span>
                            <div className="flex-1 h-1.5 bg-cyan-950"><div className="h-full" style={{ width: `${Math.max(0, Math.min(1, all[name].fit)) * 100}%`, background: all[name].ok ? "#22d3ee" : "#155e75" }} /></div>
                            <span className="w-7 text-right text-cyan-500">{fixed(all[name].fit)}</span>
                        </div>
                    ))}
                </div>
            </Row>
            <Row label="memory">
                <div className="space-y-[3px]">
                    {["kick", "snare", "hat"].map((kind) => (
                        <div key={kind} className="flex items-center gap-1.5">
                            <span className="w-9 shrink-0 text-cyan-500">{kind}</span>
                            <div className="flex-1 grid grid-cols-16 gap-px" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
                                {Array.from(groove.lane[kind].score, (value, index) => (
                                    <div key={index} className="h-3" style={{ background: `rgba(34,211,238,${0.08 + 0.92 * Math.min(1, value)})`, outline: index === step_now ? "1px solid #fff" : "none", marginLeft: index > 0 && index % 4 === 0 ? 2 : 0 }} title={`step ${index}: ${fixed(value)}`} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="text-cyan-600 mt-1">16 steps of a bar; the white box is now</div>
            </Row>
            <Row label="counters">
                <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                    {Object.keys(stats).map((key) => <span key={key}><span className="text-cyan-600">{key}</span> {stats[key]}</span>)}
                    <span title="feedback sounds the detector heard again, thrown away"><span className="text-cyan-600">echo</span> {echo_count()}</span>
                </div>
                <div className="text-cyan-500 mt-1">last 9 s: rejected {info.rejected ?? "-"} / passed {info.passed ?? "-"} · tempo changes {info.changes ?? "-"}{info.kick_gone ? " · kicks gone" : ""}{info.messy ? " · messy" : ""}</div>
            </Row>
            {song && (
                <Row label="song">
                    <div>{song.in_break ? "break" : "playing"} · pulse {fixed(song.pulse)} · size {fixed(song.size)}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-20 shrink-0 text-cyan-500">drop meter</span>
                        <div className="relative flex-1 h-1.5 bg-cyan-950">
                            <div className="h-full bg-cyan-400" style={{ width: `${Math.max(0, Math.min(1, (song.short - song.long) / 0.5)) * 100}%` }} />
                            <div className="absolute top-[-2px] bottom-[-2px] w-px bg-white" style={{ left: "50%" }} title="a drop fires here" />
                        </div>
                    </div>
                    {song.log.length > 0 && <div className="text-cyan-500 mt-1">{song.log.slice(-3).map((e) => `${e.what} ${Math.round((now - e.at) / 1000)}s ago`).join(" · ")}</div>}
                </Row>
            )}
            <Row label="hits">
                <div className="flex flex-wrap gap-1">
                    {events.length === 0 && <span className="text-cyan-600">none yet</span>}
                    {events.map((event, index) => (
                        <span key={index} className="px-1 py-[3px] border border-cyan-900" style={{ color: OUTCOME_COLOR[event.outcome] || "#22d3ee" }} title={`${event.kind} step ${event.index ?? "off grid"} ${event.outcome} strength ${fixed(event.strength)}`}>
                            {event.kind[0].toUpperCase()}{event.index ?? "~"}{event.outcome.startsWith("ghost") ? "g" : event.outcome === "passed" || event.outcome === "as_heard" ? "" : "×"}
                        </span>
                    ))}
                </div>
                <div className="text-cyan-600 mt-1">kind + step. g = filled in, × = dropped (red repeat, orange off grid, yellow gated)</div>
            </Row>
            <div className="flex gap-1.5 pt-1">
                <CopyButton label="copy stats" make={() => stats_text(groove, extra())} />
                <CopyButton label="copy last 16 beats" make={() => beats_text(groove, extra(), 16)} />
            </div>
        </div>
    )
}

function DataPanel() {
    useLive(60)
    const beeps = useBeeps()
    const [advanced, set_advanced] = useState(false)
    const bars = get_bars()
    // how many of the 24 bars each group has (for the labels under them)
    const counts = [0, 0, 0, 0, 0]
    const { kick_hz, hat_hz } = useSettings()
    for (let b = 0; b < BAND_COUNT; b++) counts[band_group(b, kick_hz, hat_hz)]++
    return (
        <div className={`${panel} w-72 max-w-[calc(100vw-1rem)] p-2`} data-music-ui>
            <Title onClose={() => toggle_panel("data")}>what it hears</Title>
            {/* one vertical bar per frequency band (24, left = bass, right = treble) */}
            <div className="flex items-end gap-[2px] h-24 px-1 border-b border-cyan-900" aria-label="frequency bands">
                {Array.from({ length: BAND_COUNT }, (_, index) => {
                    const group = band_group(index, kick_hz, hat_hz)
                    return (
                        <div key={index} className="flex-1" style={{ height: `${Math.max(4, bars[index] * 100)}%`, background: group % 2 ? "#0e90a8" : "#22d3ee", opacity: 0.35 + 0.65 * bars[index], marginLeft: index > 0 && band_group(index - 1, kick_hz, hat_hz) !== group ? 3 : 0 }} title={`${Math.round(band_hz(index))} Hz`} />
                    )
                })}
            </div>
            <div className="flex px-1 pt-1 text-[9px] text-cyan-600">
                {BAND_NAMES.map((name, group) => (
                    <span key={name} style={{ flex: counts[group] }} className="overflow-hidden whitespace-nowrap">{name}</span>
                ))}
            </div>
            <div className="px-1 pt-1 text-[9px] text-cyan-700">kick listens to low · snare to mid + crack · hat to air</div>
            <div className="mt-3 space-y-1.5">
                <Check label="feedback sound" checked={beeps.on} onChange={(on) => set_beeps({ on })} />
                <div className="flex gap-3 pl-5 flex-wrap" style={{ opacity: beeps.on ? 1 : 0.4 }}>
                    <Check label="kick" checked={beeps.kick} onChange={(kick) => set_beeps({ kick })} />
                    <Check label="snare" checked={beeps.snare} onChange={(snare) => set_beeps({ snare })} />
                    <Check label="hat" checked={beeps.hat} onChange={(hat) => set_beeps({ hat })} />
                    <Check label="ghosts" checked={beeps.ghost} onChange={(ghost) => set_beeps({ ghost })} />
                </div>
                <div className="pl-5" style={{ opacity: beeps.on ? 1 : 0.4 }}>
                    <Slider label="volume" value={beeps.volume} max={200} onChange={(volume) => set_beeps({ volume })} />
                </div>
            </div>
            <button type="button" className={`${small} mt-3 w-full flex items-center justify-between ${advanced ? lit : ""}`} onClick={() => set_advanced(!advanced)} aria-expanded={advanced}>
                <span>advanced options</span><span>{advanced ? "▲" : "▼"}</span>
            </button>
            {advanced && <Advanced />}
        </div>
    )
}

// ---- settings panel: drawn from the list in music/settings.js ----

function NumberField({ item, value }) {
    const [draft, set_draft] = useState(null) // what is typed while the box has focus
    return (
        <input
            type="number" step={item.step} min={item.min} max={item.max} inputMode="decimal"
            value={draft !== null ? draft : value}
            onChange={(event) => {
                set_draft(event.target.value)
                if (event.target.value.trim() !== "" && isFinite(Number(event.target.value))) set_setting(item.key, Number(event.target.value))
            }}
            onBlur={() => set_draft(null)}
            onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur() }}
            aria-label={item.label}
            className="h-6 w-[4.5rem] px-1 text-center bg-transparent border border-cyan-800 text-cyan-100"
        />
    )
}

function SettingRow({ item, value }) {
    const changed = value !== DEFAULTS[item.key]
    return (
        <div className="flex items-center gap-1.5 min-h-6" title={`${item.hint} (default ${String(item.def)}${item.type === "number" ? `, ${item.min} to ${item.max}` : ""})`}>
            <span className="flex-1 min-w-0 truncate" style={{ color: changed ? "#a5f3fc" : undefined }}>{item.label}</span>
            {item.type === "bool"
                ? <input type="checkbox" checked={value} onChange={(event) => set_setting(item.key, event.target.checked)} className="accent-cyan-400" aria-label={item.label} />
                : <NumberField item={item} value={value} />}
            <button type="button" className="w-4 text-center cursor-pointer text-cyan-500 hover:text-cyan-100" style={{ visibility: changed ? "visible" : "hidden" }} onClick={() => set_setting(item.key, item.def)} aria-label={`reset ${item.label}`} title="back to the default">↺</button>
        </div>
    )
}

function SettingsPanel() {
    const values = useSettings()
    const { nudge_ms, nudge } = useBeat()
    const [open, set_open] = useState({ effects: true })
    const [note, set_note] = useState("")
    const [paste, set_paste] = useState(null) // null = closed, else the text typed in the box
    const say = (text) => { set_note(text); setTimeout(() => set_note(""), 2500) }
    const changed_total = SCHEMA.filter((item) => values[item.key] !== item.def).length
    return (
        <div className={`${panel} w-80 max-w-[calc(100vw-1rem)] p-2 overflow-y-auto`} style={{ maxHeight: "calc(100vh - 12rem)" }} data-music-ui>
            <Title onClose={() => toggle_panel("settings")}>settings{changed_total ? ` · ${changed_total} changed` : ""}</Title>
            <div className="flex flex-wrap gap-1 mb-2">
                {Object.keys(PRESETS).map((name) => <button key={name} type="button" className={small} onClick={() => { apply_preset(name); say(`preset ${name}`) }}>{name}</button>)}
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
                <CopyButton label="copy settings" make={() => export_settings()} />
                <button type="button" className={`${small} ${paste !== null ? lit : ""}`} onClick={() => set_paste(paste === null ? "" : null)}>paste settings</button>
                <button type="button" className={small} onClick={() => { reset_settings(); say("everything back to default") }}>reset all</button>
            </div>
            {paste !== null && (
                <div className="mb-2 space-y-1">
                    <textarea value={paste} onChange={(event) => set_paste(event.target.value)} rows={4} placeholder="paste copied settings here" className="w-full p-1 bg-transparent border border-cyan-800 text-cyan-100 text-[10px]" aria-label="paste settings" />
                    <button type="button" className={small} onClick={() => { const count = import_settings(paste); if (count < 0) say("that is not a settings text"); else { say(`${count} values taken`); set_paste(null) } }}>apply</button>
                </div>
            )}
            {note && <div className="mb-2 text-cyan-400">{note}</div>}
            <div className="space-y-1.5">
                {GROUPS.map((group) => {
                    const items = SCHEMA.filter((item) => item.group === group.id)
                    const changed = items.filter((item) => values[item.key] !== item.def).length
                    return (
                        <div key={group.id} className="border border-cyan-900">
                            <button type="button" className="w-full flex items-center justify-between px-2 h-7 cursor-pointer hover:bg-cyan-950 text-cyan-300" onClick={() => set_open({ ...open, [group.id]: !open[group.id] })} aria-expanded={!!open[group.id]}>
                                <span>{group.title}{changed ? ` · ${changed} changed` : ""}</span><span>{open[group.id] ? "▲" : "▼"}</span>
                            </button>
                            {open[group.id] && (
                                <div className="px-2 pb-2 space-y-1">
                                    <div className="text-cyan-600 leading-snug pb-1">{group.note}</div>
                                    {group.id === "tempo" && (
                                        <div className="flex items-center gap-1.5 min-h-6" title="moves where the pulse falls, in ms (the [ and ] keys do the same, 10 ms at a time)">
                                            <span className="flex-1 min-w-0 truncate">pulse nudge (ms)</span>
                                            <input type="number" step="1" value={nudge_ms} onChange={(event) => { const next = Number(event.target.value); if (isFinite(next)) nudge(Math.max(-500, Math.min(500, next)) - nudge_ms) }} aria-label="pulse nudge in milliseconds" className="h-6 w-[4.5rem] px-1 text-center bg-transparent border border-cyan-800 text-cyan-100" />
                                            <span className="w-4" />
                                        </div>
                                    )}
                                    {items.map((item) => <SettingRow key={item.key} item={item} value={values[item.key]} />)}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// manual beat: one button per effect, and a bar for the thick laser
function PadPanel() {
    const [thick, set_thick] = useState(false)
    const [width, set_width] = useState(60)
    const pad = `${small} h-9 flex-1`
    return (
        <div className={`${panel} w-60 max-w-[calc(100vw-1rem)] p-2`} data-music-ui>
            <Title onClose={() => toggle_panel("pad")}>manual beat</Title>
            <div className="space-y-2">
                <div className="flex gap-1.5">
                    <button type="button" className={pad}>kick</button>
                    <button type="button" className={pad}>snare</button>
                    <button type="button" className={pad}>hat</button>
                </div>
                <button type="button" className={`${pad} w-full`}>thin lasers</button>
                <div className="flex items-center gap-1.5">
                    <button type="button" className={`${pad} ${thick ? lit : ""}`} onClick={() => set_thick(!thick)}>thick laser</button>
                    <input type="range" min="0" max="100" value={width} onChange={(event) => set_width(Number(event.target.value))} className="flex-[1.4] min-w-0 accent-cyan-400" aria-label="thick laser: size and speed" />
                </div>
                <button type="button" className={`${pad} w-full`}>drop</button>
            </div>
        </div>
    )
}

// from the "sm" breakpoint up there is room for the data panel on the right side; on a phone everything stacks on the left
const WIDE = "(min-width: 640px)"
function useWide() {
    return useSyncExternalStore(
        (notify) => {
            const query = window.matchMedia(WIDE)
            query.addEventListener("change", notify)
            return () => query.removeEventListener("change", notify)
        },
        () => window.matchMedia(WIDE).matches,
        () => false,
    )
}

export default function VizUi() {
    const { data, settings, pad } = useVizUi()
    const [menu, set_menu] = useState(false)
    const wide = useWide()
    return (
        <>
            {/* top left: faint gear, its menu and the two panels it turns on */}
            <div className="absolute top-2 left-2 z-40 flex flex-col items-start gap-2 max-h-[calc(100%-1rem)] overflow-y-auto" data-music-ui>
                <div className="flex items-start gap-1">
                    <button
                        type="button" aria-label="visualizer tools" aria-expanded={menu} title="visualizer tools"
                        onClick={() => set_menu(!menu)}
                        className="h-9 w-9 flex items-center justify-center text-[22px] leading-none text-cyan-300 cursor-pointer transition-opacity"
                        style={{ opacity: menu ? 0.9 : 0.3 }}
                    >
                        ⚙
                    </button>
                    {menu && (
                        <div className="flex gap-1">
                            <button type="button" className={`${box} h-9 px-3 text-[15px] cursor-pointer ${data ? lit : ""}`} onClick={() => toggle_panel("data")} aria-pressed={data}>data</button>
                            <button type="button" className={`${box} h-9 px-3 text-[15px] cursor-pointer ${settings ? lit : ""}`} onClick={() => toggle_panel("settings")} aria-pressed={settings}>settings</button>
                        </div>
                    )}
                </div>
                {data && !wide && <DataPanel />}
                {settings && <SettingsPanel />}
            </div>
            {/* top right (wide screens): the data panel, scrolls by itself and leaves room for the manual beat pad when that is open */}
            {data && wide && (
                <div className="absolute top-2 right-2 z-40 overflow-y-auto" style={{ maxHeight: pad ? "calc(100% - 15.5rem)" : "calc(100% - 1rem)" }} data-music-ui>
                    <DataPanel />
                </div>
            )}
            {/* bottom right: the manual beat pad (the "pad" button in the player opens it) */}
            {pad && (
                <div className="absolute bottom-3 right-2 z-40" data-music-ui>
                    <PadPanel />
                </div>
            )}
        </>
    )
}

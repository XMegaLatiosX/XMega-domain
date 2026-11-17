import Screen from "../components/screen"
import Header from "../components/header"
import NavUpperBar from "../components/navupperbar"
import Sidebar from "../components/sidebar"
import optimus_balling from "../assets/images/optimus-balling.gif"
import { PERF_NAMES, set_perf, usePerf } from "../music/perf"
import { SCHEMA, PRESETS, useSettings, set_setting, reset_settings, apply_preset } from "../music/settings"

const ITEM = Object.fromEntries(SCHEMA.map((item) => [item.key, item]))

// What this page shows is the same data as the tuning panel on the home page (music/settings.js), so a change here
// is a change there. Only the few that make sense for a visitor are listed; the panel has every value.
// range: the slider's own limits (the multipliers go up to 50 in the panel, which is too coarse for a slider)
const RANGE = { multiplier: [0, 3, 0.1] }

function Card({ title, note, children }) {
    return (
        <section className="border-2 border-cyan-900 bg-gray-950/80 p-4">
            <h3 className="pixel-font text-xl text-cyan-300">{title}</h3>
            {note && <p className="text-xs text-cyan-700 mt-0.5 mb-3">{note}</p>}
            <div className="space-y-3 mt-3">{children}</div>
        </section>
    )
}

function Choice({ options, value, onChange }) {
    return (
        <div className="flex gap-1.5 flex-wrap">
            {options.map(([key, label]) => (
                <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)}
                    className={`h-9 px-4 border-2 text-sm cursor-pointer transition-colors ${value === key ? "border-cyan-400 bg-cyan-400/20 text-cyan-100" : "border-cyan-900 text-cyan-600 hover:border-cyan-600 hover:text-cyan-300"}`}>{label}</button>
            ))}
        </div>
    )
}

function Toggle({ label, hint, checked, onChange }) {
    return (
        <label className="flex items-start gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 w-4 h-4 accent-cyan-400" />
            <span>
                <span className="block text-sm text-cyan-100">{label}</span>
                {hint && <span className="block text-xs text-cyan-700">{hint}</span>}
            </span>
        </label>
    )
}

function Setting({ k, values, label, range }) {
    const item = ITEM[k]
    if (!item) return null
    if (item.type === "bool") return <Toggle label={label || item.label} hint={item.hint} checked={values[k]} onChange={(on) => set_setting(k, on)} />
    const [min, max, step] = range || (item.max > 5 && item.step <= 0.1 ? RANGE.multiplier : [item.min, item.max, item.step])
    return (
        <label className="block">
            <span className="flex justify-between text-sm text-cyan-100"><span>{label || item.label}</span><span className="text-cyan-400 tabular-nums">{Number(values[k].toFixed(2))}</span></span>
            <input type="range" min={min} max={max} step={step} value={Math.min(max, values[k])} onChange={(event) => set_setting(k, Number(event.target.value))} className="w-full accent-cyan-400" />
            <span className="block text-xs text-cyan-700 leading-snug">{item.hint}</span>
        </label>
    )
}

function Settings() {
    const values = useSettings()
    const { level, rhythm } = usePerf()
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="w-screen h-[calc(100vh-6.5rem)] overflow-auto pt-2">
                <div className="w-full max-w-3xl mx-auto px-3 pt-6 pb-24">
                    <h1 className="pixel-font text-3xl text-cyan-300">settings</h1>
                    <p className="text-sm text-cyan-700 mb-5">saved in this browser. the home page gear has every value, these are the main ones.</p>

                    <div className="space-y-4">
                        <Card title="performance" note="how much your device is asked to do">
                            <Choice options={PERF_NAMES.map((name, index) => [index, name])} value={level} onChange={(index) => set_perf({ level: index })} />
                            <Toggle label="rhythm reactions" hint="off: nothing on the site moves to the beat" checked={rhythm} onChange={(on) => set_perf({ rhythm: on })} />
                            <p className="text-xs text-cyan-700">low turns off the screen glow, background flash, edge bars and laser streaks.</p>
                        </Card>

                        <Card title="style" note="a ready-made set of strengths (it keeps your performance choice)">
                            <Choice options={Object.keys(PRESETS).map((name) => [name, name])} value={null} onChange={apply_preset} />
                        </Card>

                        <Card title="the whole site" note="how every page moves to the beat. 0 turns it off">
                            <Setting k="site_logo" values={values} />
                            <Setting k="site_bg" values={values} />
                            <Setting k="site_flash" values={values} />
                            <Setting k="site_edges" values={values} />
                        </Card>

                        <Card title="home page" note="the logo, the wall of images and the effects around them">
                            <Setting k="fx_logo" values={values} />
                            <Setting k="fx_pixels" values={values} />
                            <Setting k="fx_thin" values={values} />
                            <Setting k="fx_drop" values={values} />
                            <Setting k="show_logo" values={values} />
                            <Setting k="show_wall" values={values} />
                            <Setting k="show_title" values={values} />
                            <Setting k="show_pixels" values={values} />
                        </Card>

                        <Card title="open space" note="in a drop the images shrink and spread apart">
                            <Setting k="hold_zoom" values={values} range={[0, 0.5, 0.01]} label="how much they shrink" />
                            <Setting k="hold_bars" values={values} range={[1, 32, 1]} label="lasts at least (bars)" />
                            <Setting k="hold_bars_max" values={values} range={[1, 32, 1]} label="lasts at most (bars)" />
                        </Card>

                        <Card title="comfort" note="for people sensitive to flashing">
                            <Setting k="flash_per_s" values={values} range={[0, 10, 1]} label="max flashes per second (0 = no limit)" />
                            <Setting k="flash_power" values={values} range={[0, 3, 0.1]} />
                        </Card>

                        <button type="button" onClick={reset_settings} className="h-10 px-5 border-2 border-cyan-900 text-cyan-500 hover:border-cyan-400 hover:text-cyan-200 cursor-pointer transition-colors">reset all values</button>

                        <hr className="border-cyan-900 my-6" />

                        <div className="flex flex-col items-center gap-4">
                            <div className="flex gap-3 justify-center">
                                <input className="w-5" type="checkbox"/>
                                <span className="font-medium ">be happy</span>
                            </div>
                            <img className="max-h-50" src={optimus_balling}></img>
                        </div>
                    </div>
                </div>
            </main>
        </Screen>
    )
}
export default Settings

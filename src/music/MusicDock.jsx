import { useLocation } from "react-router-dom"
import { useState } from "react"
import SearchBox from "./SearchBox"
import ProgressBar from "./ProgressBar"
import Marquee from "../components/marquee"
import PlayerBars from "./PlayerBars"
import BeatControls from "./BeatControls"
import { useMusic } from "./useMusic"

function NoteIcon() {
    return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true" style={{ imageRendering: "pixelated" }}>
            <path d="M9 3h12v3H12v11a4 4 0 1 1-3-3.87V3z" />
        </svg>
    )
}

function VolumeIcon({ level }) {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" style={{ imageRendering: "pixelated" }}>
            <path d="M3 9h4l5-4v14l-5-4H3z" />
            {level > 0 && <path d="M15 9h2v6h-2z" />}
            {level > 40 && <path d="M18 6h2v12h-2z" />}
            {level === 0 && <path d="M15 9l6 6m0-6l-6 6" stroke="currentColor" strokeWidth="2" fill="none" />}
        </svg>
    )
}

function ControlButton({ label, onClick, children }) {
    return (
        <button
            type="button" onClick={onClick} aria-label={label}
            className="size-9 flex items-center justify-center border border-cyan-700 text-cyan-300 hover:bg-cyan-950 cursor-pointer"
        >
            {children}
        </button>
    )
}

// Lives on every page. The button is always there; the search bar and the player
// only show while the button is on. On the home page the search bar is the big one
// above the logo, so the dock does not draw a second one.
export default function MusicDock() {
    const { pathname } = useLocation()
    const { dock_open, set_dock_open, playing, title, link, started, toggle, next, prev, volume, set_volume, autoplay, set_autoplay } = useMusic()
    const [before_mute, set_before_mute] = useState(80)
    const on_home = pathname === "/"
    // Everything stays mounted and slides/fades instead of popping in and out.
    const motion = `transition duration-200 ease-out ${dock_open ? "opacity-100 translate-y-0 visible" : "opacity-0 translate-y-4 invisible pointer-events-none"}`

    return (
        <>
            <button
                type="button"
                onClick={() => set_dock_open(!dock_open)}
                aria-label={dock_open ? "hide music controls" : "show music controls"}
                aria-pressed={dock_open}
                data-music-ui
                className={`fixed bottom-4 right-4 z-[70] size-12 flex items-center justify-center rounded-sm border-2 bg-gray-950 text-cyan-400 cursor-pointer ${dock_open ? "border-cyan-300" : "border-cyan-700"} site-logo-beat`}
            >
                <NoteIcon />
            </button>

            <div inert={!dock_open} className={`fixed bottom-4 left-4 right-[4.5rem] sm:left-auto sm:w-[26rem] z-[70] ${on_home ? "hidden" : ""} ${motion}`}>
                <SearchBox />
            </div>

            <div data-music-ui inert={!dock_open} className={`fixed left-4 bottom-[4.5rem] right-4 sm:right-auto sm:bottom-4 sm:w-80 h-28 z-[70] isolate overflow-hidden border-2 border-cyan-700 bg-gray-950/95 rounded-sm p-2 flex flex-col gap-2 ${motion}`}>
                <PlayerBars playing={playing} />
                <div className="flex items-center gap-2 min-h-5">
                    <Marquee className="flex-1 min-w-0 text-sm text-cyan-200" title={title}>
                        {!started ? "nothing playing yet" : link ? (
                            <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline">{title || "loading..."} ↗</a>
                        ) : (title || "loading...")}
                    </Marquee>
                    <BeatControls />
                </div>
                <ProgressBar />
                <div className="flex items-center gap-1.5">
                    <ControlButton label="previous" onClick={prev}>⏮</ControlButton>
                    <ControlButton label={playing ? "pause" : "play"} onClick={toggle}>{playing ? "⏸" : "▶"}</ControlButton>
                    <ControlButton label="next" onClick={next}>⏭</ControlButton>
                    <ControlButton label={autoplay ? "autoplay on: a similar song plays when this one ends (uses the YouTube search quota). Click to turn off" : "autoplay off. Click to turn on"} onClick={() => set_autoplay(!autoplay)}><span className={autoplay ? "text-cyan-200" : "text-cyan-800 line-through"}>∞</span></ControlButton>
                    <button
                        type="button" aria-label={volume === 0 ? "unmute" : "mute"}
                        onClick={() => {
                            if (volume > 0) { set_before_mute(volume); set_volume(0) } else set_volume(before_mute || 80)
                        }}
                        className="size-9 flex items-center justify-center text-cyan-300 hover:text-cyan-100 cursor-pointer"
                    >
                        <VolumeIcon level={volume} />
                    </button>
                    <input
                        type="range" min="0" max="100" value={volume}
                        onChange={(e) => set_volume(Number(e.target.value))}
                        aria-label="volume"
                        className="flex-1 min-w-0 accent-cyan-400"
                    />
                </div>
            </div>
        </>
    )
}

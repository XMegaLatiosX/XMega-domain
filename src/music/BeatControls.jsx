import { useBeat } from "./useBeat"

// Small row at the top of the player: what the beat is following, plus "sync" and "tap".
export default function BeatControls() {
    const { mode, bpm, silent, message, nudge_ms, start_sync, stop_sync, tap, nudge } = useBeat()

    const following = mode === "locked" || mode === "tap"
    const label =
        mode === "asking" ? "..." :
        mode === "listening" ? (silent ? "no sound" : "listening") :
        following ? `${Math.round(bpm)}` : "144"
    const hint =
        message ||
        (mode === "locked" ? "The pulse follows this tab's sound. Click to go back to 144." :
        mode === "tap" ? "Following your taps. Click to go back to 144." :
        mode === "listening" ? (silent ? "Nothing audible in this tab yet. Start a song." : "Listening for the beat...") :
        "Idle beat, 144 BPM")

    const small = "h-5 px-1.5 text-[11px] leading-none border border-cyan-800 text-cyan-300 hover:bg-cyan-950 cursor-pointer whitespace-nowrap"

    return (
        <div className="flex items-center gap-1 shrink-0" data-music-ui>
            {mode === "locked" && (
                <>
                    <button type="button" className={small} onClick={() => nudge(-10)} aria-label="pulse 10 milliseconds earlier" title={`Pulse earlier (now ${nudge_ms > 0 ? "+" : ""}${nudge_ms} ms)`}>‹</button>
                    <button type="button" className={small} onClick={() => nudge(10)} aria-label="pulse 10 milliseconds later" title={`Pulse later (now ${nudge_ms > 0 ? "+" : ""}${nudge_ms} ms)`}>›</button>
                </>
            )}
            <button
                type="button" onClick={following || mode === "listening" ? stop_sync : undefined}
                className={`${small} ${following ? "bg-cyan-950 text-cyan-100" : "opacity-70 cursor-default"}`}
                title={hint} aria-label={hint}
            >
                {label}
            </button>
            <button type="button" className={small} onClick={tap} title="Tap the beat with the music (at least 3 taps)">tap</button>
            <button type="button" className={small} onClick={start_sync} disabled={mode === "asking"} title="Share this tab's sound so the site can find the beat (Chrome/Edge on a computer)">sync</button>
        </div>
    )
}

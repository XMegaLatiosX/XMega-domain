import { useEffect } from "react"
import { S, subscribe_settings } from "../music/settings"

// The beat on every page, kept quiet: a faint glow that breathes at the edge of the screen, a row of pixels along the bottom
// and a bar on each side. All of it is CSS animation on the one site clock (--beat, see music/BeatProvider.jsx), so it costs
// almost nothing, and it only shows while a tempo is set. The header logo uses the same clock (.site-logo-beat in index.css).
// Strengths come from the "whole site" settings; the performance level "low" and "rhythm off" hide it (see music/perf.js).
export default function SiteBeat() {
    useEffect(() => {
        const root = document.documentElement
        const write = () => {
            root.style.setProperty("--site-logo", String(S.site_logo))
            root.style.setProperty("--site-flash", String(S.site_flash))
            root.style.setProperty("--site-edges", String(S.site_edges))
            root.style.setProperty("--site-bg", String(S.site_bg))
        }
        write()
        const stop = subscribe_settings(write)
        return () => {
            stop()
            for (const name of ["--site-logo", "--site-flash", "--site-edges", "--site-bg"]) root.style.removeProperty(name)
        }
    }, [])
    return (
        <div className="site-beat" aria-hidden="true">
            <div className="site-fill" />
            <div className="site-flash" />
            <div className="site-bar site-bar-l" />
            <div className="site-bar site-bar-r" />
        </div>
    )
}

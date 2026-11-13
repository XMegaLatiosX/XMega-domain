import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { MusicContext } from "./context"
import { parseInput } from "./parse"
import { resolveSoundCloudShort, searchYouTube, spotifyTitle } from "./search"
import { loadScript } from "./loadScript"

// Both players stay mounted for the whole session, so the music keeps going when the visitor
// changes page. They are only faded/slid out of view (never display:none), and the box is
// at least 200x200 because that is the minimum YouTube requires for its player.
const BOX = "fixed left-4 right-4 sm:right-auto sm:w-80 h-[200px] z-[70] bottom-[12.25rem] sm:bottom-[8.5rem] border-2 border-cyan-700 bg-black overflow-hidden transition duration-200 ease-out [&>div]:size-full"
const IN = "opacity-100 translate-y-0"
const OUT = "opacity-0 translate-y-4 pointer-events-none"

export default function MusicProvider({ children }) {
    const yt_host = useRef(null)
    const yt_promise = useRef(null)
    const yt_player_ref = useRef(null)
    const sc_frame = useRef(null)
    const sc_promise = useRef(null)
    const sc_loaded = useRef(Promise.resolve())
    const active = useRef(null) // "yt" | "sc"
    const queue_ref = useRef([])
    const index_ref = useRef(-1)
    const volume_ref = useRef(80)
    const handlers = useRef({})

    const [playing, set_playing] = useState(false)
    const [title, set_title] = useState("")
    const [loading, set_loading] = useState(false)
    const [message, set_message] = useState("")
    const [started, set_started] = useState(false)
    const [dock_open, set_dock_open] = useState(false)
    const [volume, set_volume_state] = useState(80)
    const [queue_size, set_queue_size] = useState(0)
    const [source, set_source] = useState(null) // "yt" | "sc" | null
    const [link, set_link] = useState("")
    const sc_progress = useRef({ pos: 0, dur: 0 })

    // Controls close whenever the visitor changes page (music keeps playing).
    const { pathname } = useLocation()
    const [last_path, set_last_path] = useState(pathname)
    if (pathname !== last_path) {
        set_last_path(pathname)
        set_dock_open(false)
    }

    // ---------- YouTube ----------
    const get_yt = useCallback(() => {
        if (!yt_promise.current) {
            yt_promise.current = new Promise((resolve, reject) => {
                const create = () => {
                    const mount = document.createElement("div")
                    yt_host.current.appendChild(mount)
                    const player = new window.YT.Player(mount, {
                        width: 200, height: 200,
                        playerVars: { playsinline: 1, controls: 0, rel: 0, origin: window.location.origin },
                        events: {
                            onReady: () => {
                                yt_player_ref.current = player
                                const frame = player.getIframe()
                                frame.style.width = "100%"
                                frame.style.height = "100%"
                                resolve(player)
                            },
                            onStateChange: (e) => handlers.current.yt_state?.(e, player),
                            onError: () => handlers.current.yt_error?.(),
                        },
                    })
                }
                if (window.YT?.Player) return create()
                const previous = window.onYouTubeIframeAPIReady
                window.onYouTubeIframeAPIReady = () => { previous?.(); create() }
                loadScript("https://www.youtube.com/iframe_api").catch((err) => {
                    yt_promise.current = null
                    reject(err)
                })
            })
        }
        return yt_promise.current
    }, [])

    // ---------- SoundCloud ----------
    const get_sc = useCallback(() => {
        if (!sc_promise.current) {
            // wait for the iframe to finish loading before talking to it (avoids postMessage warnings)
            sc_promise.current = Promise.all([loadScript("https://w.soundcloud.com/player/api.js"), sc_loaded.current])
                .then(() => {
                    const widget = window.SC.Widget(sc_frame.current)
                    const refresh_title = () => widget.getCurrentSound((s) => {
                        if (s?.title) set_title(s.title)
                        if (s?.permalink_url) set_link(s.permalink_url)
                    })
                    widget.bind(window.SC.Widget.Events.PLAY, () => { set_playing(true); refresh_title() })
                    widget.bind(window.SC.Widget.Events.PAUSE, () => set_playing(false))
                    widget.bind(window.SC.Widget.Events.PLAY_PROGRESS, (e) => {
                        const pos = e.currentPosition / 1000
                        sc_progress.current = { pos, dur: e.relativePosition > 0 ? pos / e.relativePosition : 0 }
                    })
                    widget.bind(window.SC.Widget.Events.FINISH, () => handlers.current.sc_finish?.())
                    return widget
                })
                .catch((err) => { sc_promise.current = null; throw err })
        }
        return sc_promise.current
    }, [])

    // ---------- queue ----------
    const stop_other = useCallback(async (keep) => {
        try {
            if (keep !== "yt" && yt_promise.current) (await yt_promise.current).pauseVideo()
            if (keep !== "sc" && sc_promise.current) (await sc_promise.current).pause()
        } catch { /* the other player may not be ready, nothing to stop */ }
    }, [])

    const play_item = useCallback(async (item) => {
        await stop_other(item.source)
        active.current = item.source
        set_source(item.source)
        set_title(item.title || "")
        set_link(item.source === "yt" && item.id ? `https://www.youtube.com/watch?v=${item.id}` : item.url || "")
        sc_progress.current = { pos: 0, dur: 0 }

        if (item.source === "yt") {
            const player = await get_yt()
            player.setVolume(volume_ref.current)
            if (item.list && !item.id) player.loadPlaylist({ list: item.list, listType: "playlist" })
            else if (item.list) player.loadPlaylist({ list: item.list, listType: "playlist", index: 0 })
            else player.loadVideoById(item.id)
        } else {
            // the widget iframe needs a src once, after that we only call load()
            const first_time = !sc_promise.current
            if (first_time) {
                sc_loaded.current = new Promise((resolve) => sc_frame.current.addEventListener("load", resolve, { once: true }))
                sc_frame.current.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(item.url)}&auto_play=true&visual=true`
            }
            const widget = await get_sc()
            widget.setVolume(volume_ref.current)
            if (!first_time) widget.load(item.url, { auto_play: true })
        }
    }, [get_yt, get_sc, stop_other])

    const go_to = useCallback((i) => {
        const item = queue_ref.current[i]
        if (!item) { set_playing(false); return }
        index_ref.current = i
        play_item(item).catch((err) => set_message(err.message))
    }, [play_item])

    // ---------- public actions ----------
    const play_input = useCallback(async (text) => {
        set_message("")
        const parsed = parseInput(text)
        if (!parsed) return
        set_loading(true)
        try {
            let items = []
            if (parsed.type === "youtube") {
                items = [{ source: "yt", id: parsed.videoId, list: parsed.playlistId, title: "" }]
            } else if (parsed.type === "soundcloud") {
                const resolved = parsed.short ? await resolveSoundCloudShort(parsed.url) : { url: parsed.url, title: "" }
                items = [{ source: "sc", url: resolved.url, title: resolved.title }]
            } else if (parsed.type === "spotify") {
                if (parsed.kind !== "track") throw new Error("For Spotify, paste a track link (or type the name).")
                items = await searchYouTube(await spotifyTitle(parsed.url))
            } else {
                items = await searchYouTube(parsed.query)
            }
            if (!items.length) throw new Error("Nothing found. Try another name or a link.")

            queue_ref.current = items
            set_queue_size(items.length)
            set_started(true)
            set_dock_open(true) // a new song brings the player (and its video) into view
            go_to(0)
        } catch (err) {
            set_message(err.message)
        } finally {
            set_loading(false)
        }
    }, [go_to])

    const toggle = useCallback(async () => {
        try {
            if (active.current === "yt") {
                const p = await get_yt()
                p.getPlayerState() === 1 ? p.pauseVideo() : p.playVideo()
            } else if (active.current === "sc") {
                (await get_sc()).toggle()
            }
        } catch (err) { set_message(err.message) }
    }, [get_yt, get_sc])

    const next = useCallback(async () => {
        try {
            if (active.current === "yt") {
                const p = await get_yt()
                const list = p.getPlaylist?.()
                if (list && p.getPlaylistIndex() < list.length - 1) return p.nextVideo()
            } else if (active.current === "sc") {
                const w = await get_sc()
                const sounds = await new Promise((r) => w.getSounds(r))
                const index = await new Promise((r) => w.getCurrentSoundIndex(r))
                if (sounds.length > 1 && index < sounds.length - 1) return w.next()
            }
            go_to(index_ref.current + 1)
        } catch (err) { set_message(err.message) }
    }, [get_yt, get_sc, go_to])

    const prev = useCallback(async () => {
        try {
            if (active.current === "yt") {
                const p = await get_yt()
                const list = p.getPlaylist?.()
                if (list && p.getPlaylistIndex() > 0) return p.previousVideo()
                if (p.getCurrentTime() > 4) return p.seekTo(0)
            } else if (active.current === "sc") {
                const w = await get_sc()
                const index = await new Promise((r) => w.getCurrentSoundIndex(r))
                if (index > 0) return w.prev()
            }
            go_to(Math.max(0, index_ref.current - 1))
        } catch (err) { set_message(err.message) }
    }, [get_yt, get_sc, go_to])

    // Read synchronously by the progress bar (no React state, so no re-render every tick).
    const get_progress = useCallback(() => {
        if (active.current === "yt") {
            const p = yt_player_ref.current
            if (p?.getCurrentTime) return { pos: p.getCurrentTime(), dur: p.getDuration() }
        }
        if (active.current === "sc") return sc_progress.current
        return { pos: 0, dur: 0 }
    }, [])

    const seek = useCallback(async (fraction) => {
        try {
            if (active.current === "yt") {
                const p = await get_yt()
                p.seekTo(fraction * p.getDuration(), true)
            } else if (active.current === "sc") {
                const w = await get_sc()
                w.getDuration((d) => w.seekTo(fraction * d))
            }
        } catch (err) { set_message(err.message) }
    }, [get_yt, get_sc])

    const set_volume = useCallback(async (value) => {
        volume_ref.current = value
        set_volume_state(value)
        try {
            if (yt_promise.current) (await yt_promise.current).setVolume(value)
            if (sc_promise.current) (await sc_promise.current).setVolume(value)
        } catch { /* player not ready yet; the stored volume is applied on the next play */ }
    }, [])

    // While the controls are open, clicking or focusing anything outside the music UI closes them.
    // (Clicks inside the YouTube/SoundCloud iframes never reach this page, so they keep it open.)
    useEffect(() => {
        if (!dock_open) return
        const outside = (e) => !(e.target instanceof Element && e.target.closest("[data-music-ui]"))
        const on_pointer = (e) => { if (outside(e)) set_dock_open(false) }
        const on_focus = (e) => { if (outside(e)) set_dock_open(false) }
        document.addEventListener("pointerdown", on_pointer, true)
        document.addEventListener("focusin", on_focus)
        return () => {
            document.removeEventListener("pointerdown", on_pointer, true)
            document.removeEventListener("focusin", on_focus)
        }
    }, [dock_open])

    // ---------- player events (refreshed after every render so they see fresh state) ----------
    useEffect(() => {
        handlers.current.yt_state = (e, player) => {
            if (e.data === 1) {
                set_playing(true)
                const data = player.getVideoData?.()
                if (data?.title) set_title(data.title)
                if (data?.video_id) set_link(`https://www.youtube.com/watch?v=${data.video_id}`)
            } else if (e.data === 2) {
                set_playing(false)
            } else if (e.data === 0) {
                const list = player.getPlaylist?.()
                const playlist_has_more = list && player.getPlaylistIndex() < list.length - 1
                if (!playlist_has_more) go_to(index_ref.current + 1)
            }
        }
        handlers.current.yt_error = () => {
            set_message("That video can't be played here. Skipping.")
            go_to(index_ref.current + 1)
        }
        handlers.current.sc_finish = async () => {
            const item = queue_ref.current[index_ref.current]
            // SoundCloud sets play their own next track; only advance our queue for single tracks
            if (item && !/\/sets\//.test(item.url || "")) go_to(index_ref.current + 1)
        }
    })

    const value = useMemo(() => ({
        playing, title, link, loading, message, started, dock_open, volume, queue_size,
        set_dock_open, set_message, play_input, toggle, next, prev, set_volume, get_progress, seek,
    }), [playing, title, link, loading, message, started, dock_open, volume, queue_size, play_input, toggle, next, prev, set_volume, get_progress, seek])

    // The video/artwork slides in above the player while the controls are open.
    const yt_visible = dock_open && source === "yt"
    const sc_visible = dock_open && source === "sc"

    return (
        <MusicContext.Provider value={value}>
            {children}
            <div ref={yt_host} data-music-ui className={`${BOX} ${yt_visible ? IN : OUT}`} aria-hidden={!yt_visible} />
            <iframe
                ref={sc_frame}
                data-music-ui
                title="soundcloud player"
                allow="autoplay; encrypted-media"
                className={`${BOX} ${sc_visible ? IN : OUT}`}
                style={{ border: 0 }}
                aria-hidden={!sc_visible}
            />
        </MusicContext.Provider>
    )
}

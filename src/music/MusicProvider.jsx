import { clean_title, next_similar } from "./similar"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { MusicContext } from "./context"
import { parseInput } from "./parse"
import { resolveSoundCloudShort, searchYouTube, spotifyTitle } from "./search"
import { loadScript } from "./loadScript"
import { useBeat } from "./useBeat"

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
    const active = useRef(null) // "yt" | "sc" | "file"
    const audio_ref = useRef(null) // the <audio> for uploaded files, made the first time one is played
    const queue_ref = useRef([])
    const played_ref = useRef(new Set()) // songs already heard through autoplay in this session
    const title_ref = useRef("")
    const finding_ref = useRef(false)
    const [autoplay, set_autoplay_state] = useState(() => { try { return localStorage.getItem("xm_autoplay") !== "0" } catch { return true } }) // on unless turned off
    const autoplay_ref = useRef(autoplay)
    const set_autoplay = useCallback((on) => { autoplay_ref.current = on; set_autoplay_state(on); try { localStorage.setItem("xm_autoplay", on ? "1" : "0") } catch { /* not remembered */ } }, [])
    const go_ref = useRef(null) // go_to, for the autoplay callback that runs after it
        const index_ref = useRef(-1)
    const volume_ref = useRef(80)
    const handlers = useRef({})
    const beat = useBeat()
    const beat_ref = useRef(beat) // always the latest, so the callbacks below can stay stable
    useEffect(() => { beat_ref.current = beat })

    const [playing, set_playing] = useState(false)
    const [title, set_title] = useState("")
    const [loading, set_loading] = useState(false)
    const [message, set_message] = useState("")
    const [started, set_started] = useState(false)
    const [dock_open, set_dock_open] = useState(false)
    const [volume, set_volume_state] = useState(80)
    const [queue_size, set_queue_size] = useState(0)
    const [source, set_source] = useState(null) // "yt" | "sc" | "file" | null
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

    // ---------- uploaded files ----------
    const get_audio = useCallback(() => {
        if (!audio_ref.current) {
            const audio = new Audio()
            audio.preload = "auto"
            audio.addEventListener("play", () => set_playing(true))
            audio.addEventListener("pause", () => set_playing(false))
            audio.addEventListener("ended", () => handlers.current.file_end?.())
            audio.addEventListener("error", () => handlers.current.file_error?.())
            audio_ref.current = audio
        }
        return audio_ref.current
    }, [])

    // ---------- queue ----------
    const stop_other = useCallback(async (keep) => {
        try {
            if (keep !== "yt" && yt_promise.current) (await yt_promise.current).pauseVideo()
            if (keep !== "sc" && sc_promise.current) (await sc_promise.current).pause()
            if (keep !== "file" && audio_ref.current) audio_ref.current.pause()
        } catch { /* the other player may not be ready, nothing to stop */ }
    }, [])

    const play_item = useCallback(async (item) => {
        beat_ref.current.track_changed() // a new song: the beat is listened for again
        await stop_other(item.source)
        active.current = item.source
        set_source(item.source)
        set_title(item.title || "")
        set_link(item.source === "file" ? "" : item.source === "yt" && item.id ? `https://www.youtube.com/watch?v=${item.id}` : item.url || "")
        sc_progress.current = { pos: 0, dur: 0 }

        if (item.source === "file") {
            const audio = get_audio()
            audio.src = item.url
            audio.volume = volume_ref.current / 100
            await audio.play()
        } else if (item.source === "yt") {
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
    }, [get_yt, get_sc, get_audio, stop_other])

    useEffect(() => { title_ref.current = title }, [title])

    const go_to = useCallback((i) => {
        const item = queue_ref.current[i]
        if (!item) {
            // The queue ended: look for a song to follow, so the music does not stop.
            //  1. a similar song from Last.fm, found on YouTube; 2. when Last.fm does not know the song (typical for your own music,
            //  or SoundCloud titles), YouTube is searched with the song's own title and the first result that is not that song plays.
            if (autoplay_ref.current && !finding_ref.current && title_ref.current) {
                finding_ref.current = true
                set_loading(true)
                const current = title_ref.current
                const norm = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, "")
                const same_song = (candidate) => norm(candidate.title).includes(norm(clean_title(current))) || norm(clean_title(candidate.title)) === norm(clean_title(current))
                const fresh = (candidate) => !played_ref.current.has(`yt:${candidate.id}`)
                ;(async () => {
                    let chosen = null
                    try {
                        const found = await next_similar(current, played_ref.current)
                        if (found) {
                            played_ref.current.add(`${found.artist} - ${found.name}`.toLowerCase())
                            chosen = (await searchYouTube(`${found.artist} ${found.name}`)).find(fresh) || null
                        }
                    } catch { /* Last.fm did not answer: the title search below still works */ }
                    if (!chosen) {
                        const results = await searchYouTube(clean_title(current))
                        chosen = results.find((candidate) => fresh(candidate) && !same_song(candidate)) || results.find(fresh) || null
                    }
                    if (!chosen) { set_playing(false); set_message("autoplay: nothing found to play next"); return }
                    played_ref.current.add(`yt:${chosen.id}`)
                    queue_ref.current = [...queue_ref.current, chosen]
                    set_queue_size(queue_ref.current.length)
                    go_ref.current(queue_ref.current.length - 1)
                })()
                    .catch(() => { set_playing(false); set_message("autoplay: the search did not answer (YouTube key or daily limit?)") })
                    .finally(() => { finding_ref.current = false; set_loading(false) })
                return
            }
            set_playing(false)
            return
        }
        index_ref.current = i
        play_item(item).catch((err) => set_message(err.message))
    }, [play_item])
    useEffect(() => { go_ref.current = go_to }, [go_to])

    // ---------- public actions ----------
    const play_input = useCallback(async (text, given_title = "") => {
        set_message("")
        const parsed = parseInput(text)
        if (!parsed) return
        beat_ref.current.ask_once() // still inside the click/Enter that started this: the first time, ask to hear the tab
        set_loading(true)
        try {
            let items = []
            if (parsed.type === "youtube") {
                items = [{ source: "yt", id: parsed.videoId, list: parsed.playlistId, title: "" }]
            } else if (parsed.type === "audio") {
                const name = decodeURIComponent(parsed.url.split("/").pop() || "").replace(/\.[a-z0-9]+$/i, "").replace(/^[0-9a-f-]{36}-/, "")
                items = [{ source: "file", url: parsed.url, title: given_title || name }]
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

            played_ref.current = new Set()
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
            } else if (active.current === "file") {
                const audio = get_audio()
                if (audio.paused) await audio.play(); else audio.pause()
            }
        } catch (err) { set_message(err.message) }
    }, [get_yt, get_sc, get_audio])

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
        if (active.current === "file" && audio_ref.current) return { pos: audio_ref.current.currentTime, dur: Number.isFinite(audio_ref.current.duration) ? audio_ref.current.duration : 0 }
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
            } else if (active.current === "file" && audio_ref.current && Number.isFinite(audio_ref.current.duration)) {
                audio_ref.current.currentTime = fraction * audio_ref.current.duration
            }
        } catch (err) { set_message(err.message) }
    }, [get_yt, get_sc])

    const set_volume = useCallback(async (value) => {
        volume_ref.current = value
        set_volume_state(value)
        if (audio_ref.current) audio_ref.current.volume = value / 100
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
        handlers.current.file_end = () => go_to(index_ref.current + 1)
        handlers.current.file_error = () => {
            set_message("That file can't be played. Skipping.")
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
        autoplay, set_autoplay,
        set_dock_open, set_message, play_input, toggle, next, prev, set_volume, get_progress, seek,
    }), [playing, title, link, loading, message, started, dock_open, volume, queue_size, autoplay, set_autoplay, play_input, toggle, next, prev, set_volume, get_progress, seek])

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

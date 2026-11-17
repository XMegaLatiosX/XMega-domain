// Turns whatever the visitor typed into something the player knows how to open.
// Pure functions (no React, no network) so they are easy to test.

const YT_ID = /^[A-Za-z0-9_-]{11}$/

function to_url(text) {
    try {
        return new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
    } catch {
        return null
    }
}

export function parseInput(raw) {
    const text = (raw || "").trim()
    if (!text) return null

    // only treat it as a link when it looks like one (no spaces, has a dot)
    const looks_like_link = !/\s/.test(text) && /\./.test(text)
    const url = looks_like_link ? to_url(text) : null

    if (url) {
        const host = url.hostname.replace(/^www\.|^m\.|^music\./, "")

        // a direct audio file (the ones uploaded on the music page live in the site's storage)
        if (/\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba)$/i.test(url.pathname)) return { type: "audio", url: url.href }

        if (host === "youtu.be") {
            const id = url.pathname.slice(1)
            if (YT_ID.test(id)) return { type: "youtube", videoId: id, playlistId: url.searchParams.get("list") }
        }

        if (host === "youtube.com") {
            const list = url.searchParams.get("list")
            const v = url.searchParams.get("v")
            if (v && YT_ID.test(v)) return { type: "youtube", videoId: v, playlistId: list }
            const path_id = url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/)
            if (path_id) return { type: "youtube", videoId: path_id[1], playlistId: null }
            if (url.pathname === "/playlist" && list) return { type: "youtube", videoId: null, playlistId: list }
        }

        // "Copy link" in the app gives on.soundcloud.com/xxxx (a short link that has to be
        // resolved first); "Share" gives the full link, often with tracking parameters we drop.
        if (host === "on.soundcloud.com") {
            return { type: "soundcloud", url: url.href, short: true }
        }
        if (host === "soundcloud.com") {
            return { type: "soundcloud", url: url.origin + url.pathname, short: false }
        }

        if (host === "open.spotify.com") {
            const m = url.pathname.match(/\/(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]+)/)
            if (m) return { type: "spotify", kind: m[1], url: `https://open.spotify.com/${m[1]}/${m[2]}` }
        }
    }

    // anything else is treated as a song name to search
    return { type: "search", query: text }
}

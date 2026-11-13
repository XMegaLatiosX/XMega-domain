// Finds playable results by name (YouTube Data API) and reads Spotify links.
// The YouTube key lives in .env as VITE_YT_API_KEY. Restrict it by HTTP referrer in Google Cloud.

const YT_KEY = import.meta.env.VITE_YT_API_KEY

function decode_entities(text) {
    return new DOMParser().parseFromString(text, "text/html").documentElement.textContent
}

function cache_get(key) {
    try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
function cache_set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable, ignore */ }
}

export async function searchYouTube(query) {
    if (!YT_KEY) {
        throw new Error("Searching by name needs a YouTube API key. Paste a link for now.")
    }

    const cache_key = `yt-search:${query.toLowerCase()}`
    const cached = cache_get(cache_key)
    if (cached) return cached

    const url = "https://www.googleapis.com/youtube/v3/search"
        + `?part=snippet&type=video&videoEmbeddable=true&maxResults=5&q=${encodeURIComponent(query)}&key=${YT_KEY}`
    const res = await fetch(url)
    if (!res.ok) throw new Error("Search is unavailable right now (daily limit or key problem). Paste a link instead.")

    const data = await res.json()
    const items = (data.items || [])
        .filter((item) => item.id?.videoId)
        .map((item) => ({ source: "yt", id: item.id.videoId, title: decode_entities(item.snippet.title) }))

    if (items.length) cache_set(cache_key, items)
    return items
}

export async function spotifyTitle(url) {
    try {
        const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)
        if (!res.ok) throw new Error("bad status")
        const data = await res.json()
        if (!data.title) throw new Error("no title")
        return data.title
    } catch {
        throw new Error("Could not read that Spotify link. Type the song name instead.")
    }
}

// Short links (on.soundcloud.com/...) are not understood by the player. SoundCloud's oEmbed
// endpoint turns a link into the player address of the track, so we ask it for the real URL.
export async function resolveSoundCloudShort(url) {
    try {
        const res = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`)
        if (!res.ok) throw new Error("bad status")
        const data = await res.json()
        const src = data.html?.match(/src="([^"]+)"/)?.[1]
        const track_url = src && new URL(src.replace(/&amp;/g, "&")).searchParams.get("url")
        if (!track_url) throw new Error("no url")
        return { url: track_url, title: data.title || "" }
    } catch {
        throw new Error("Could not open that short SoundCloud link. Use Share > Copy link on the track page, or paste the full link.")
    }
}

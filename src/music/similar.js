// "Song after song": when the queue ends, finds a similar track with Last.fm (free key in .env as VITE_LASTFM_KEY)
// and the provider then looks it up on YouTube. Last.fm only gives names, never audio.
const KEY = import.meta.env.VITE_LASTFM_KEY
export const similar_ready = !!KEY

async function lastfm(params) {
    const query = new URLSearchParams({ ...params, api_key: KEY, format: "json" })
    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${query}`)
    if (!res.ok) throw new Error("lastfm")
    const data = await res.json()
    if (data.error) throw new Error("lastfm")
    return data
}

// "Artist - Song (Official Video) [HD] ft. X" -> "Artist - Song"
export function clean_title(title) {
    return String(title || "")
        .replace(/[([{][^)\]}]*[)\]}]/g, " ")
        .replace(/\b(official|video|audio|lyrics?|hd|4k|music video|visualizer)\b/gi, " ")
        .replace(/\b(ft|feat)\.?\s.*$/i, " ")
        .replace(/\s+/g, " ")
        .trim()
}

const pick = (list, played) => {
    const fresh = list.slice(0, 12).filter((t) => !played.has(`${t.artist} - ${t.name}`.toLowerCase()))
    return fresh.length ? fresh[Math.floor(Math.random() * fresh.length)] : null
}

// seed: the title of what is playing. played: Set of "artist - song" (lowercase) already heard in this session.
// Returns { artist, name } or null.
export async function next_similar(seed, played) {
    if (!KEY) return null
    const text = clean_title(seed)
    if (!text) return null
    const found = await lastfm({ method: "track.search", track: text, limit: "1" })
    const base = found.results?.trackmatches?.track?.[0]
    if (!base) return null
    const norm = (t) => ({ artist: typeof t.artist === "string" ? t.artist : t.artist?.name, name: t.name })
    const start = norm(base)
    played.add(`${start.artist} - ${start.name}`.toLowerCase())
    const sim = await lastfm({ method: "track.getSimilar", artist: start.artist, track: start.name, autocorrect: "1", limit: "20" })
    const tracks = (sim.similartracks?.track || []).map(norm)
    const chosen = pick(tracks, played)
    if (chosen) return chosen
    // no similar songs for this one: go through similar artists and take one of their top songs
    const artists = await lastfm({ method: "artist.getSimilar", artist: start.artist, autocorrect: "1", limit: "10" })
    const names = (artists.similarartists?.artist || []).map((a) => a.name)
    if (!names.length) return null
    const top = await lastfm({ method: "artist.getTopTracks", artist: names[Math.floor(Math.random() * names.length)], limit: "5" })
    return pick((top.toptracks?.track || []).map(norm), played)
}

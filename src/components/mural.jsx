import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { load_entries, post_entry, post_entry_as_account, account_info, visitor_color, MAX_BODY, NICK_MIN, NICK_MAX } from "../lib/mural"
import { color_for, is_color } from "../lib/nick-color"

// The guestbook of the mural page: write a nickname and a message and they stay here, newest first. Only people who write are kept.
// Logged-in visitors write with their profile nickname and colour; the others type a nickname (remembered in this browser, the same
// one the live chat uses). A later step: show the profile picture next to the nickname when the person is logged in (here and in the chat).
const NICK_KEY = "xm_nick"
const ERRORS = { anon_off: "writing is not available right now", too_fast: "you wrote a moment ago, wait a minute", failed: "could not send, try again" }
const read = (key) => { try { return localStorage.getItem(key) } catch { return null } }
const write = (key, value) => { try { localStorage.setItem(key, value) } catch { /* not remembered */ } }
const color_of = (entry) => (is_color(entry.color) ? entry.color : color_for(entry.nick))
const when = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

export default function Mural() {
    const [entries, set_entries] = useState([])
    const [total, set_total] = useState(0)
    const [loading, set_loading] = useState(true)
    const [offline, set_offline] = useState(false)
    const [account, set_account] = useState(null)
    const [nick, set_nick] = useState(() => read(NICK_KEY) || "")
    const [colour] = useState(visitor_color)
    const [text, set_text] = useState("")
    const [error, set_error] = useState("")
    const [sending, set_sending] = useState(false)
    const [done, set_done] = useState(false)
    const [fresh, set_fresh] = useState(null) // the entry just written: it arrives with a glow

    const merge = (list, rows) => [...list, ...rows.filter((row) => !list.some((item) => item.id === row.id))]

    useEffect(() => {
        let alive = true
        load_entries(0).then(({ rows, total: all }) => { if (alive) { set_entries(rows); set_total(all); set_loading(false) } }).catch(() => { if (alive) { set_offline(true); set_loading(false) } })
        return () => { alive = false }
    }, [])

    useEffect(() => {
        let alive = true
        const refresh = () => account_info().then((info) => { if (alive) set_account(info) }).catch(() => {})
        refresh()
        const { data: listener } = supabase.auth.onAuthStateChange(() => { setTimeout(refresh, 0) })
        return () => { alive = false; listener.subscription.unsubscribe() }
    }, [])

    async function more() {
        set_loading(true)
        try {
            const { rows, total: all } = await load_entries(entries.length)
            set_entries((list) => merge(list, rows))
            set_total(all)
        } catch { set_error("could not load more") }
        set_loading(false)
    }

    async function submit(event) {
        event.preventDefault()
        const body = text.trim()
        const chosen = (account ? account.nick : nick).trim().slice(0, NICK_MAX)
        if (sending) return
        if (chosen.length < NICK_MIN) { set_error(`nickname: ${NICK_MIN} to ${NICK_MAX} characters`); return }
        if (!body) { set_error("write something first"); return }
        set_sending(true)
        set_error("")
        try {
            const entry = account ? await post_entry_as_account(account, body) : await post_entry(chosen, colour, body)
            if (!account) write(NICK_KEY, chosen)
            set_entries((list) => [entry, ...list.filter((item) => item.id !== entry.id)])
            set_total((count) => count + 1)
            set_text("")
            set_done(true)
            set_fresh(entry.id)
        } catch (failure) {
            set_error(ERRORS[failure.message] || ERRORS.failed)
        }
        set_sending(false)
    }

    const my_nick = account ? account.nick : nick
    const serif = { fontFamily: "Georgia, 'Times New Roman', serif" }
    // pixel corner ornaments of the frame
    const corner = "absolute w-3 h-3 bg-cyan-300 shadow-[0_0_8px_rgb(34_211_238/0.8)]"
    return (
        <div className="w-full max-w-3xl mx-auto px-3 pt-8 pb-24">
            {/* the frame */}
            <section className="relative border-4 border-cyan-700 bg-black p-1.5 shadow-[0_0_40px_rgb(34_211_238/0.18)]">
                <span className={`${corner} -top-2 -left-2`} /><span className={`${corner} -top-2 -right-2`} />
                <span className={`${corner} -bottom-2 -left-2`} /><span className={`${corner} -bottom-2 -right-2`} />
                <div className="relative border-2 border-cyan-900 px-4 sm:px-8 pt-10 pb-6">
                    <h1 className="absolute -top-5 left-1/2 -translate-x-1/2 px-5 bg-black pixel-font text-3xl text-cyan-300 [text-shadow:0_0_14px_rgb(34_211_238/0.7)] whitespace-nowrap">◆ mural ◆</h1>
                    {offline && <p className="text-center text-sm text-cyan-600 italic" style={serif}>the mural is offline</p>}

                    <ol className="mt-2 max-h-[min(30rem,52vh)] overflow-y-auto pr-2 space-y-7">
                        {entries.map((entry) => (
                            <li key={entry.id} className={`relative text-center ${fresh === entry.id ? "mural-new" : ""}`}>
                                <div className="flex items-center gap-3 mb-3 text-cyan-800" aria-hidden="true">
                                    <span className="h-px flex-1 bg-gradient-to-r from-transparent to-cyan-800" />
                                    <span className="text-[10px]">◆</span>
                                    <span className="h-px flex-1 bg-gradient-to-l from-transparent to-cyan-800" />
                                </div>
                                <p className="nick-glow pixel-font text-2xl break-words" style={{ color: color_of(entry) }}>{entry.nick}</p>
                                <p className="mt-2 text-lg leading-relaxed text-cyan-50 whitespace-pre-wrap break-words px-2" style={serif}>{entry.body}</p>
                                <p className="mt-2 text-[11px] text-cyan-800">{when(entry.created_at)}</p>
                            </li>
                        ))}
                        {!loading && !offline && entries.length === 0 && <li className="text-center text-cyan-700 italic" style={serif}>the wall is empty. the first word is yours.</li>}
                        {entries.length > 0 && entries.length < total && (
                            <li className="text-center">
                                <button type="button" onClick={more} disabled={loading} className="h-9 px-5 border border-cyan-800 text-cyan-500 hover:border-cyan-400 hover:text-cyan-200 cursor-pointer disabled:opacity-50 text-sm">{loading ? "loading..." : `older words`}</button>
                            </li>
                        )}
                    </ol>
                </div>
            </section>

            {/* the signature: a message, then your name under it */}
            <form onSubmit={submit} onKeyDown={(event) => event.stopPropagation()} className="relative mt-10 mx-auto max-w-xl border border-cyan-900 bg-black px-4 py-3 shadow-[0_0_24px_rgb(34_211_238/0.08)]">
                <p className="text-center text-sm text-cyan-600 italic mb-2" style={serif}>leave a word. it stays on the wall.</p>
                <textarea value={text} onChange={(event) => { set_text(event.target.value); set_done(false) }} maxLength={MAX_BODY} rows={3}
                    placeholder="what do you want to say?" aria-label="message" style={serif}
                    className="w-full resize-none bg-black/60 border-2 border-cyan-900 focus:border-cyan-400 outline-none text-base text-cyan-50 italic leading-snug placeholder:text-cyan-800 px-3 py-2" />
                <div className="mt-2 flex items-center gap-3">
                    {account
                        ? <span className="nick-glow pixel-font text-base flex-1 min-w-0 truncate" style={{ color: account.color }}>{account.nick}</span>
                        : <input value={nick} onChange={(event) => set_nick(event.target.value)} maxLength={NICK_MAX} placeholder="your name" aria-label="nickname"
                            className="nick-glow pixel-font text-base flex-1 min-w-0 h-9 bg-black/60 border-2 border-cyan-900 focus:border-cyan-400 outline-none placeholder:text-cyan-800 px-3" style={{ color: colour }} />}
                    <span className="text-[11px] text-cyan-800 tabular-nums shrink-0">{text.length}/{MAX_BODY}</span>
                    <button type="submit" disabled={sending} className="h-9 shrink-0 px-4 border-2 border-cyan-500 bg-cyan-950/70 text-cyan-100 hover:bg-cyan-900 hover:shadow-[0_0_14px_rgb(34_211_238/0.45)] disabled:opacity-50 cursor-pointer transition-all pixel-font text-sm">{sending ? "signing..." : "sign the wall"}</button>
                </div>
                {(done || error) && (
                    <p className="mt-2 text-xs text-center">
                        {done && <span className="text-cyan-300">it is on the wall. thank you, {my_nick || "friend"}.</span>}
                        {error && <span className="text-amber-300">{error}</span>}
                    </p>
                )}
            </form>
        </div>
    )
}

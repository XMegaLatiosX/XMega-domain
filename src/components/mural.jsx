import { useEffect, useRef, useState } from "react"
import { supabase } from "../lib/supabase"
import { load_recent, subscribe_messages, post_message, post_as_account, account_info, visitor_color, keep_recent, MAX_BODY, NICK_MIN, NICK_MAX, COOLDOWN_MS } from "../lib/mural"
import { color_for, is_color } from "../lib/nick-color"

// The Mural: a small live wall on the home page, laid out like a game chat ("Nick: message", every nick in its own colour).
//   wide screens: a panel on the right, vertically centered, see-through, and it can be folded into the bubble
//   phones: only the bubble (the last message in one line) at the bottom centre; touching it opens the wall over the page
// The nickname sits inside the text box, in front of the placeholder. Someone logged in posts with their profile nickname and
// colour (changed on the profile); a visitor picks a nickname the first time they press send and gets a random colour.
// One message every 10 seconds.
const SHOWN = 5
const OPEN_KEY = "xm_mural_open"
const NICK_KEY = "xm_nick"
const SENT_KEY = "xm_mural_sent" // this visitor has posted at least once
const PRANK_KEY = "xm_mural_prank" // the dodge below already happened (it happens only once)
const ERRORS = { anon_off: "posting is not available right now", too_fast: "wait a few seconds between messages", failed: "could not send, try again" }

const read = (key) => { try { return localStorage.getItem(key) } catch { return null } }
const write = (key, value) => { try { localStorage.setItem(key, value) } catch { /* not remembered */ } }
const color_of = (message) => (is_color(message.color) ? message.color : color_for(message.nick))

function useWideScreen() {
    const [wide, set_wide] = useState(() => window.matchMedia("(min-width: 640px)").matches)
    useEffect(() => {
        const query = window.matchMedia("(min-width: 640px)")
        const change = () => set_wide(query.matches)
        query.addEventListener("change", change)
        return () => query.removeEventListener("change", change)
    }, [])
    return wide
}

export default function Mural({ shifted = false }) {
    const wide = useWideScreen()
    const [open, set_open] = useState(() => { const saved = read(OPEN_KEY); return saved === null ? window.matchMedia("(min-width: 640px)").matches : saved === "1" })
    const [messages, set_messages] = useState([])
    const [text, set_text] = useState("")
    const [nick, set_nick] = useState(() => read(NICK_KEY) || "")
    const [colour] = useState(visitor_color)
    const [asking, set_asking] = useState(false)
    const [account, set_account] = useState(null) // { nick, color } of the logged-in profile, if there is one
    const [nick_draft, set_nick_draft] = useState("")
    const [error, set_error] = useState("")
    const [sending, set_sending] = useState(false)
    const [wait_until, set_wait_until] = useState(0)
    const [now, set_now] = useState(() => Date.now())
    const list_ref = useRef(null)
    // A small joke, once per visitor: after their first message, the next time they go for the text box the Mural dodges up,
    // and the time after that it dodges back down. Then it behaves normally for good (saved in this browser).
    const prank = useRef(read(PRANK_KEY) === "1" ? 2 : 0) // 0 = not yet, 1 = dodged up, 2 = over
    const [dodged, set_dodged] = useState(false)

    useEffect(() => {
        let alive = true
        load_recent().then((rows) => { if (alive) set_messages((current) => rows.reduce(keep_recent, current)) }).catch(() => { if (alive) set_error("the mural is offline") })
        const stop = subscribe_messages((row) => set_messages((current) => keep_recent(current, row)))
        return () => { alive = false; stop() }
    }, [])

    useEffect(() => {
        let alive = true
        const refresh = () => account_info().then((info) => { if (alive) set_account(info) }).catch(() => {})
        refresh()
        const { data: listener } = supabase.auth.onAuthStateChange(() => { setTimeout(refresh, 0) }) // not inside the callback itself: the client can lock up
        return () => { alive = false; listener.subscription.unsubscribe() }
    }, [])

    useEffect(() => {
        const id = setInterval(() => set_now(Date.now()), 1000)
        return () => clearInterval(id)
    }, [])

    useEffect(() => {
        if (list_ref.current) list_ref.current.scrollTop = list_ref.current.scrollHeight
    }, [messages, open])

    const toggle = () => { set_open(!open); write(OPEN_KEY, open ? "0" : "1") }
    const waiting = Math.max(0, Math.ceil((wait_until - now) / 1000))
    const my_nick = account ? account.nick : nick
    const my_color = account ? account.color : colour

    async function send(chosen_nick) {
        const body = text.trim()
        if (!body || sending) return
        set_sending(true)
        set_error("")
        try {
            if (account) await post_as_account(account, body)
            else await post_message(chosen_nick, colour, body)
            set_text("")
            set_wait_until(Date.now() + COOLDOWN_MS)
            if (prank.current === 0) write(SENT_KEY, "1")
        } catch (failure) {
            set_error(ERRORS[failure.message] || ERRORS.failed)
        }
        set_sending(false)
    }

    function submit(event) {
        event.preventDefault()
        if (!text.trim() || waiting) return
        if (account) { send(account.nick); return } // logged in: the profile nickname is used
        if (!nick) { set_asking(true); return } // no nickname yet: ask for it right under the box, then send
        send(nick)
    }

    function confirm_nick(event) {
        event.preventDefault()
        const chosen = nick_draft.trim().slice(0, NICK_MAX)
        if (chosen.length < NICK_MIN) { set_error(`nickname: ${NICK_MIN} to ${NICK_MAX} characters`); return }
        set_nick(chosen)
        write(NICK_KEY, chosen)
        set_asking(false)
        set_error("")
        send(chosen)
    }

    const shown = messages.slice(-SHOWN)
    const last = messages[messages.length - 1]
    const joke_on = () => prank.current < 2 && read(SENT_KEY) === "1"
    function hold(event) { if (joke_on()) event.preventDefault() } // no focus on press either
    function dodge(event) {
        if (!joke_on()) return
        event.preventDefault() // the click does not reach the box this time
        event.currentTarget.querySelector("input")?.blur()
        if (prank.current === 0) { prank.current = 1; set_dodged(true) }
        else { prank.current = 2; set_dodged(false); write(PRANK_KEY, "1") }
    }
    const stop_keys = (event) => event.stopPropagation() // typing here is not for the site's shortcuts

    const bubble = (
        <button type="button" onClick={toggle} aria-label="open the Mural" data-music-ui
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 h-9 max-w-[min(20rem,calc(100vw-9rem))] px-3 flex items-center gap-2 border border-cyan-800 bg-black/70 backdrop-blur-sm text-cyan-200 pixel-font text-[11px] cursor-pointer hover:bg-cyan-950">
            <span className="text-cyan-400">Mural</span>
            {last ? <span className="truncate"><span style={{ color: color_of(last) }}>{last.nick}</span><span className="text-cyan-100/80">: {last.body}</span></span> : <span className="truncate text-cyan-100/80">say something</span>}
        </button>
    )

    const panel = (
        <div data-music-ui onKeyDown={stop_keys} onKeyUp={stop_keys}
            className={`${wide ? "absolute top-1/2 z-30 w-72 transition-[left,transform] duration-500" : "absolute left-2 right-2 bottom-16 z-[80] transition-transform duration-500"} border border-cyan-800 bg-black/70 backdrop-blur-sm text-cyan-200 pixel-font text-[11px] leading-snug`}
            style={wide
                ? { left: `calc(75% - ${shifted ? "10rem" : "0px"})`, transform: `translate(-50%, ${dodged ? "calc(-50% - 9rem)" : "-50%"})` } // centred on 75% of the width: the middle of the right half
                : { transform: dodged ? "translateY(-7rem)" : undefined }}>
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-cyan-900">
                <span className="text-cyan-400">Mural</span>
                <button type="button" onClick={toggle} aria-label="close the mural" className="h-6 w-6 flex items-center justify-center text-cyan-300 hover:bg-cyan-950 cursor-pointer"><svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2" shapeRendering="crispEdges"><path d="M1 1l10 10M11 1L1 11" /></svg></button>
            </div>
            <div ref={list_ref} className="px-2 py-1.5 space-y-0.5 overflow-y-auto" style={{ maxHeight: "11rem", minHeight: "3rem" }}>
                {shown.length === 0 && <p className="text-cyan-600">{error === "the mural is offline" ? error : "nothing here yet: be the first"}</p>}
                {shown.map((message) => (
                    <p key={message.id} className="break-words">
                        <span style={{ color: color_of(message) }}>{message.nick}</span><span className="text-cyan-100">: {message.body}</span>
                    </p>
                ))}
            </div>
            <form onSubmit={submit} className="p-2 border-t border-cyan-900 space-y-1.5">
                <div className="flex gap-1">
                    <label onMouseDownCapture={hold} onClickCapture={dodge} className="flex-1 min-w-0 h-7 flex items-center bg-black/60 border border-cyan-800 focus-within:border-cyan-500 cursor-text">
                        {my_nick && (account
                            ? <span className="pl-2 shrink-0 max-w-[40%] truncate" style={{ color: my_color }}>{my_nick}:</span>
                            : <button type="button" title="change nickname" onClick={(event) => { event.preventDefault(); set_nick_draft(nick); set_asking(true) }} className="pl-2 shrink-0 max-w-[40%] truncate cursor-pointer" style={{ color: my_color }}>{my_nick}:</button>)}
                        <input value={text} onChange={(event) => set_text(event.target.value.slice(0, MAX_BODY))} maxLength={MAX_BODY} placeholder="leave a message" aria-label="message"
                            className="flex-1 min-w-0 h-full px-1.5 bg-transparent text-cyan-100 placeholder:text-cyan-800 outline-none text-[16px] sm:text-[12px]" />
                    </label>
                    <button type="submit" disabled={!text.trim() || sending || waiting > 0}
                        className="h-7 px-2 border border-cyan-800 text-cyan-300 hover:bg-cyan-950 cursor-pointer disabled:opacity-40 disabled:cursor-default">{waiting > 0 ? `${waiting}s` : "send"}</button>
                </div>
                {error && error !== "the mural is offline" && <p className="text-amber-300">{error}</p>}
            </form>
            {asking && !account && (
                <form onSubmit={confirm_nick} className="px-2 pb-2 -mt-1 space-y-1.5">
                    <p className="text-cyan-300">pick a nickname to post ({NICK_MIN} to {NICK_MAX} characters)</p>
                    <div className="flex gap-1">
                        <input autoFocus value={nick_draft} onChange={(event) => set_nick_draft(event.target.value.slice(0, NICK_MAX))} placeholder="nickname" aria-label="nickname"
                            className="flex-1 min-w-0 h-7 px-2 bg-black/60 border border-cyan-800 text-cyan-100 outline-none focus:border-cyan-500 text-[16px] sm:text-[12px]" />
                        <button type="submit" className="h-7 px-2 border border-cyan-500 bg-cyan-950 text-cyan-100 cursor-pointer">ok</button>
                        <button type="button" onClick={() => set_asking(false)} className="h-7 px-2 border border-cyan-800 text-cyan-300 cursor-pointer">x</button>
                    </div>
                </form>
            )}
        </div>
    )

    // on a phone the open wall comes with a backdrop: touching outside closes it
    return (
        <>
            {(!open || !wide) && bubble}
            {open && !wide && <div className="absolute inset-0 z-[75]" data-music-ui onClick={toggle} />}
            {open && panel}
        </>
    )
}

import { supabase } from "./supabase"
import { client, ensure_session, send_error } from "./anon-client"

// The live chat on the home page (table chat_messages, see supabase/mural-split.sql). It is a short-lived talk, not the mural page.
export { account_info, visitor_color, NICK_MIN, NICK_MAX } from "./anon-client"
export const MAX_BODY = 140
export const COOLDOWN_MS = 10000
const KEPT = 50 // how many the page keeps in memory; the screen shows the last few
const TABLE = "chat_messages"

export async function load_recent() {
    let { data, error } = await client.from(TABLE).select("id,nick,color,body,created_at").order("created_at", { ascending: false }).limit(KEPT)
    if (error) { // supabase/colors.sql was not run yet: the colour column does not exist, so read without it
        ;({ data, error } = await client.from(TABLE).select("id,nick,body,created_at").order("created_at", { ascending: false }).limit(KEPT))
    }
    if (error) throw error
    return data.reverse()
}

// calls on_row for each new message, live; returns the function that stops it
export function subscribe_messages(on_row) {
    const channel = client.channel("chat").on("postgres_changes", { event: "INSERT", schema: "public", table: TABLE }, (payload) => on_row(payload.new)).subscribe()
    return () => { client.removeChannel(channel) }
}

export async function post_message(nick, color, body) {
    await ensure_session()
    let { error } = await client.from(TABLE).insert({ nick, color, body })
    if (error && /color/i.test(error.message)) ({ error } = await client.from(TABLE).insert({ nick, body })) // colors.sql not run yet
    if (error) throw send_error(error)
}

export async function post_as_account(info, body) {
    let { error } = await supabase.from(TABLE).insert({ nick: info.nick, color: info.color, body })
    if (error && /color/i.test(error.message)) ({ error } = await supabase.from(TABLE).insert({ nick: info.nick, body })) // colors.sql not run yet
    if (error) throw send_error(error)
}

export function keep_recent(list, row) {
    if (list.some((item) => item.id === row.id)) return list
    return [...list, row].slice(-KEPT)
}

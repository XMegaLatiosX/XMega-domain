import { supabase } from "./supabase"
import { client, ensure_session, send_error } from "./anon-client"

// The mural page: a guestbook that keeps everyone who came by and wrote something (table guestbook, see supabase/mural-split.sql).
// It is apart from the live chat on the home page (lib/chat.js): nothing written there is kept here and the other way round.
export { account_info, visitor_color, NICK_MIN, NICK_MAX } from "./anon-client"
export const MAX_BODY = 400
export const PAGE = 30
const TABLE = "guestbook"

// newest first; `from` is how many are already on the screen. Also says how many there are in all.
export async function load_entries(from = 0) {
    const { data, error, count } = await client.from(TABLE).select("id,nick,color,body,created_at", { count: "exact" }).order("created_at", { ascending: false }).range(from, from + PAGE - 1)
    if (error) throw error
    return { rows: data, total: count ?? data.length }
}

export async function post_entry(nick, color, body) {
    await ensure_session()
    const { data, error } = await client.from(TABLE).insert({ nick, color, body }).select("id,nick,color,body,created_at").single()
    if (error) throw send_error(error)
    return data
}

export async function post_entry_as_account(info, body) {
    const { data, error } = await supabase.from(TABLE).insert({ nick: info.nick, color: info.color, body }).select("id,nick,color,body,created_at").single()
    if (error) throw send_error(error)
    return data
}

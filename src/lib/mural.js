import { createClient } from "@supabase/supabase-js"
import { supabase } from "./supabase"
import { color_for, random_color, is_color } from "./nick-color"

// The mural gets its own Supabase client with its own session storage. The visitors who post here are anonymous
// sessions, and with the site's main client they would look "logged in" to the header, blog, gallery and projects.
// This reuses the same project address and public key as lib/supabase.js (they are public by design).
const url = "https://fwldimnufoblhdsflkrm.supabase.co"
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3bGRpbW51Zm9ibGhkc2Zsa3JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzMzNTMsImV4cCI6MjA5MTE0OTM1M30.vEhlWZEXZfQs0tESkQKu7QUSQueNu7JDaQ2D0BwDzrg"
const client = createClient(url, key, { auth: { storageKey: "xm-mural-auth", autoRefreshToken: true, persistSession: true } })

export const MAX_BODY = 140
export const NICK_MIN = 2
export const NICK_MAX = 20
export const COOLDOWN_MS = 10000
const KEPT = 50 // how many the page keeps in memory; the screen shows the last few

export async function load_recent() {
    let { data, error } = await client.from("mural_messages").select("id,nick,color,body,created_at").order("created_at", { ascending: false }).limit(KEPT)
    if (error) { // supabase/colors.sql was not run yet: the colour column does not exist, so read without it
        ;({ data, error } = await client.from("mural_messages").select("id,nick,body,created_at").order("created_at", { ascending: false }).limit(KEPT))
    }
    if (error) throw error
    return data.reverse()
}

// calls on_row for each new message, live; returns the function that stops it
export function subscribe_messages(on_row) {
    const channel = client.channel("mural").on("postgres_changes", { event: "INSERT", schema: "public", table: "mural_messages" }, (payload) => on_row(payload.new)).subscribe()
    return () => { client.removeChannel(channel) }
}

// posts as an anonymous visitor: the session is made the first time someone posts
export async function post_message(nick, color, body) {
    const { data } = await client.auth.getSession()
    if (!data.session) {
        const { error } = await client.auth.signInAnonymously()
        if (error) throw new Error("anon_off")
    }
    let { error } = await client.from("mural_messages").insert({ nick, color, body })
    if (error && /color/i.test(error.message)) ({ error } = await client.from("mural_messages").insert({ nick, body })) // colors.sql not run yet
    if (error) throw new Error(/too fast/i.test(error.message) ? "too_fast" : "failed")
}

export function keep_recent(list, row) {
    if (list.some((item) => item.id === row.id)) return list
    return [...list, row].slice(-KEPT)
}

// Someone logged in to the site (the main client) posts with their account, their profile nickname and their nick colour:
// nothing to ask. Without a colour chosen on the profile one is made from the user id, so it stays the same.
export async function account_info() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) return null
    let { data: profile, error } = await supabase.from("profiles").select("nickname, nick_color").eq("id", data.user.id).single()
    if (error) ({ data: profile } = await supabase.from("profiles").select("nickname").eq("id", data.user.id).single()) // colors.sql not run yet
    if (!profile?.nickname) return null
    return { nick: profile.nickname, color: is_color(profile.nick_color) ? profile.nick_color : color_for(data.user.id) }
}

export async function post_as_account(info, body) {
    let { error } = await supabase.from("mural_messages").insert({ nick: info.nick, color: info.color, body })
    if (error && /color/i.test(error.message)) ({ error } = await supabase.from("mural_messages").insert({ nick: info.nick, body })) // colors.sql not run yet
    if (error) throw new Error(/too fast/i.test(error.message) ? "too_fast" : "failed")
}

// A visitor without an account gets a random colour the first time and keeps it in this browser.
export function visitor_color() {
    try {
        const saved = localStorage.getItem("xm_nick_color")
        if (is_color(saved)) return saved
        const made = random_color()
        localStorage.setItem("xm_nick_color", made)
        return made
    } catch {
        return random_color()
    }
}

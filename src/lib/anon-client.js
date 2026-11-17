import { createClient } from "@supabase/supabase-js"
import { supabase } from "./supabase"
import { color_for, random_color, is_color } from "./nick-color"

// Visitors who write on the live chat or on the mural are anonymous sessions. They get their own Supabase client with its own
// session storage: with the site's main client they would look "logged in" to the header, blog, gallery and projects.
// This reuses the same project address and public key as lib/supabase.js (they are public by design).
const url = "https://fwldimnufoblhdsflkrm.supabase.co"
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3bGRpbW51Zm9ibGhkc2Zsa3JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzMzNTMsImV4cCI6MjA5MTE0OTM1M30.vEhlWZEXZfQs0tESkQKu7QUSQueNu7JDaQ2D0BwDzrg"
export const client = createClient(url, key, { auth: { storageKey: "xm-mural-auth", autoRefreshToken: true, persistSession: true } })

export const NICK_MIN = 2
export const NICK_MAX = 20

// the anonymous session is made the first time someone writes
export async function ensure_session() {
    const { data } = await client.auth.getSession()
    if (data.session) return
    const { error } = await client.auth.signInAnonymously()
    if (error) throw new Error("anon_off")
}

// Someone logged in to the site (the main client) writes with their account, their profile nickname and their nick colour:
// nothing to ask. Without a colour chosen on the profile one is made from the user id, so it stays the same.
export async function account_info() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) return null
    let { data: profile, error } = await supabase.from("profiles").select("nickname, nick_color").eq("id", data.user.id).single()
    if (error) ({ data: profile } = await supabase.from("profiles").select("nickname").eq("id", data.user.id).single()) // colors.sql not run yet
    if (!profile?.nickname) return null
    return { nick: profile.nickname, color: is_color(profile.nick_color) ? profile.nick_color : color_for(data.user.id) }
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

export const send_error = (error) => new Error(/too fast/i.test(error.message) ? "too_fast" : "failed")

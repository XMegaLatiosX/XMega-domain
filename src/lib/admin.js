import { useEffect, useState } from "react"
import { supabase } from "./supabase"

// true when the logged-in account is the admin (app_metadata.is_admin, the same flag the blog, projects and music pages use).
// The buttons it shows only work because supabase/moderation.sql lets that flag delete rows; for anyone else the database refuses.
export function useIsAdmin() {
    const [admin, set_admin] = useState(false)
    useEffect(() => {
        let alive = true
        supabase.auth.getUser().then(({ data }) => { if (alive) set_admin(!!data.user?.app_metadata?.is_admin) })
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setTimeout(() => { if (alive) set_admin(!!session?.user?.app_metadata?.is_admin) }, 0) })
        return () => { alive = false; listener.subscription.unsubscribe() }
    }, [])
    return admin
}

export async function delete_row(table, id) {
    const { error, count } = await supabase.from(table).delete({ count: "exact" }).eq("id", id)
    if (error) throw error
    if (!count) throw new Error("nothing was deleted (is supabase/moderation.sql run, and are you the admin?)")
}

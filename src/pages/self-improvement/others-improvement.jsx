import { useNavigate, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import Screen from "../../components/screen"
import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Sidebar from "../../components/sidebar"
import SearchBar from "../../components/search-bar"
import star_icon from "../../assets/images/star_icon.png"
import { supabase } from "../../lib/supabase"
import SkillCard from "./skill-card"

// The public skills of one person, found by nickname (/self-improvement/<nickname>).
function Others_improvement() {
    const navigate = useNavigate()
    const { nickname } = useParams()

    const [search_results, set_search_results] = useState(null)
    const [state, set_state] = useState({ for: null, nickname: null, status: "loading", skills: [] }) // status: loading | ready | missing | error

    useEffect(() => {
        let cancelled = false
        async function load() {
            const { data: owner, error } = await supabase.from("profiles").select("*").eq("nickname_lower", nickname.toLowerCase()).maybeSingle()
            if (cancelled) return
            if (error) {
                console.error(error)
                set_state({ for: nickname, nickname, status: "error", skills: [] })
                return
            }
            if (!owner) {
                set_state({ for: nickname, nickname, status: "missing", skills: [] })
                return
            }
            const { data, error: skills_error } = await supabase.from("skills").select("*, traits(*)").eq("user_id", owner.id).eq("is_public", true).order("created_at", { ascending: true })
            if (cancelled) return
            if (skills_error) {
                console.error(skills_error)
                set_state({ for: nickname, nickname, status: "error", skills: [] })
                return
            }
            set_state({ for: nickname, nickname: owner.nickname || nickname, status: "ready", skills: data })
        }
        load()
        return () => { cancelled = true }
    }, [nickname])

    const loading = state.for !== nickname

    async function display_skills(input_value) {
        const { data, error } = await supabase.rpc("search_users", { search_term: input_value })
        if (error) {
            console.error(error)
            return
        }
        set_search_results(data)
    }

    return (
        <Screen>
            <Header />
            <NavUpperBar />
            <Sidebar />
            <main className="relative w-screen h-[calc(100vh-7rem)] overflow-auto pt-20 sm:pt-16">
                <div className="absolute right-4 top-4">
                    <SearchBar placeholder={"Search others improvement..."} onSearch={(value) => navigate("/self-improvement/" + value)} onChanged={display_skills} results={search_results} onInteract={(value) => navigate("/self-improvement/" + value)} />
                </div>

                <div className="flex flex-col gap-8 items-center px-4 pb-24">
                    <div className="flex flex-row items-center w-full justify-center gap-4 pt-4">
                        <img src={star_icon} alt="" className="h-14 sm:h-20" />
                        <span className="pixel-font text-4xl sm:text-6xl text-cyan-400 text-center break-all">{nickname}</span>
                    </div>

                    <div className="w-full max-w-3xl flex flex-col gap-6">
                        {loading && <span className="text-center text-cyan-700">loading…</span>}
                        {!loading && state.status === "missing" && <span className="text-center text-cyan-700">nobody called “{nickname}” here.</span>}
                        {!loading && state.status === "error" && <span className="text-center text-red-400">could not load these skills, try again in a moment.</span>}
                        {!loading && state.status === "ready" && state.skills.length === 0 && <span className="text-center text-cyan-700">no public skills yet.</span>}
                        {!loading && state.status === "ready" && state.skills.map((skill) => <SkillCard key={skill.id} skill={skill} />)}
                    </div>
                </div>
            </main>
        </Screen>
    )
}
export default Others_improvement

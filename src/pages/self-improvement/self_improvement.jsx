import { useCallback, useEffect, useState } from "react"
import { v4 } from "uuid"
import { useNavigate } from "react-router-dom"
import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/screen"
import Sidebar from "../../components/sidebar"
import SearchBar from "../../components/search-bar"
import { supabase } from "../../lib/supabase"
import SkillCard, { RatingBar } from "./skill-card"

// Uploads one picture of a skill (thumbnail / current / target) and returns its public link.
// Without a new file it returns the link the skill already has, so saving never turns a picture into a temporary preview link.
async function upload_picture(user_id, skill_id, name, file, existing) {
    if (!file) return existing ?? null
    const extension = file.name.split(".").pop()
    const path = `${user_id}/${skill_id}/${name}.${extension}`
    const { error } = await supabase.storage.from("skills").upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from("skills").getPublicUrl(path)
    return `${data.publicUrl}?v=${Date.now()}` // same path on every upload, so the version keeps browsers from showing the old picture
}

const new_trait = () => ({ id: v4(), name: "", description: "", self_rating: 50 })

function RatingSlider({ value, on_change }) {
    return (
        <div className="flex flex-col gap-1">
            <RatingBar value={value} small />
            <input type="range" min="0" max="100" step="5" value={value} onChange={(event) => on_change(Number(event.target.value))} className="w-full accent-cyan-400 cursor-pointer" aria-label="rating" />
        </div>
    )
}

function PictureInput({ label, preview, on_pick }) {
    return (
        <label className="relative flex flex-col items-center gap-1 cursor-pointer text-[11px] text-cyan-600 hover:text-cyan-300 text-center">
            <span className="relative flex items-center justify-center w-14 h-14 border-2 border-dashed border-cyan-800 bg-gray-950 overflow-hidden">
                {preview ? <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <span className="text-2xl text-cyan-800">+</span>}
            </span>
            {label}
            <input type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files[0]; if (file) on_pick(file) }} />
        </label>
    )
}

// Create (skill = null) or edit a skill. Traits are plain state of this form, nothing is saved until "save".
function SkillEditor({ user, skill, on_saved, on_cancel }) {
    const [name, set_name] = useState(skill?.name || "")
    const [description, set_description] = useState(skill?.description || "")
    const [is_public, set_is_public] = useState(skill?.is_public ?? true)
    const [rating, set_rating] = useState(skill?.self_rating ?? 50)
    const [traits, set_traits] = useState(skill?.traits?.length ? skill.traits.map((trait) => ({ ...trait })) : [new_trait()])
    const [removed, set_removed] = useState([]) // ids of saved traits to delete when saving
    const [files, set_files] = useState({ thumbnail: null, current: null, target: null })
    const [previews, set_previews] = useState({ thumbnail: skill?.icon || null, current: skill?.current_level || null, target: skill?.target_level || null })
    const [status, set_status] = useState({ saving: false, error: "" })

    function pick(kind, file) {
        set_files((old) => ({ ...old, [kind]: file }))
        set_previews((old) => ({ ...old, [kind]: URL.createObjectURL(file) }))
    }
    const edit_trait = (id, changes) => set_traits((old) => old.map((trait) => (trait.id === id ? { ...trait, ...changes } : trait)))
    function remove_trait(id) {
        if (skill?.traits?.some((trait) => trait.id === id)) set_removed((old) => [...old, id])
        set_traits((old) => old.filter((trait) => trait.id !== id))
    }

    async function save(event) {
        event.preventDefault()
        if (!name.trim()) return set_status({ saving: false, error: "give the skill a name first." })
        set_status({ saving: true, error: "" })
        try {
            const id = skill?.id ?? v4()
            const icon = await upload_picture(user.id, id, "thumbnail", files.thumbnail, skill?.icon)
            const current_level = await upload_picture(user.id, id, "current", files.current, skill?.current_level)
            const target_level = await upload_picture(user.id, id, "target", files.target, skill?.target_level)
            const row = { id, user_id: user.id, icon, name: name.trim(), description, self_rating: rating, avarage_rating: rating, current_level, target_level, is_public }
            const { error } = skill
                ? await supabase.from("skills").update(row).eq("id", id)
                : await supabase.from("skills").insert([row])
            if (error) throw error

            if (removed.length) {
                const { error: delete_error } = await supabase.from("traits").delete().in("id", removed)
                if (delete_error) throw delete_error
            }
            const valid = traits.filter((trait) => trait.name.trim() || trait.description.trim())
            if (valid.length) {
                const { error: trait_error } = await supabase.from("traits").upsert(valid.map((trait) => ({ id: trait.id, skill_id: id, name: trait.name, description: trait.description, self_rating: trait.self_rating })))
                if (trait_error) throw trait_error
            }
            set_status({ saving: false, error: "" })
            on_saved()
        } catch (error) {
            console.error(error)
            set_status({ saving: false, error: `could not save: ${error.message || "unknown error"}` })
        }
    }

    const field = "w-full bg-gray-950 border border-cyan-800 focus:border-cyan-400 outline-none px-2 py-1.5 text-cyan-50"
    return (
        <form onSubmit={save} className="border-2 border-cyan-500 bg-gray-950 p-4 sm:p-5 flex flex-col gap-4">
            <h3 className="pixel-font text-xl text-cyan-300">{skill ? "edit skill" : "new skill"}</h3>

            <div className="flex flex-wrap items-end gap-3">
                <PictureInput label="icon" preview={previews.thumbnail} on_pick={(file) => pick("thumbnail", file)} />
                <input value={name} onChange={(event) => set_name(event.target.value)} className={`${field} grow min-w-40 text-xl`} placeholder="skill name, ex: Pixel art" maxLength={80} />
                <label className="flex items-center gap-2 text-sm text-cyan-200 cursor-pointer select-none pb-2">
                    <input type="checkbox" checked={is_public} onChange={(event) => set_is_public(event.target.checked)} className="accent-cyan-400 w-4 h-4" />
                    public
                </label>
            </div>

            <textarea value={description} onChange={(event) => set_description(event.target.value)} className={`${field} min-h-24`} placeholder="what is this skill, and what does getting better at it mean?" />

            <div className="flex items-end gap-3">
                <PictureInput label="where I am" preview={previews.current} on_pick={(file) => pick("current", file)} />
                <div className="grow"><RatingSlider value={rating} on_change={set_rating} /></div>
                <PictureInput label="where I want to be" preview={previews.target} on_pick={(file) => pick("target", file)} />
            </div>

            <div className="flex flex-col gap-3 border-t border-cyan-900 pt-4">
                <span className="text-sm text-cyan-600">traits: the parts this skill is made of, each with its own rating</span>
                {traits.map((trait) => (
                    <div key={trait.id} className="flex flex-col gap-2 border border-cyan-900 bg-gray-900/60 p-3">
                        <div className="flex gap-2">
                            <input value={trait.name} onChange={(event) => edit_trait(trait.id, { name: event.target.value })} className={field} placeholder="name, ex: Perspective" maxLength={60} />
                            <button type="button" onClick={() => remove_trait(trait.id)} className="px-3 border border-red-800 text-red-400 hover:bg-red-950 cursor-pointer" aria-label="remove trait">×</button>
                        </div>
                        <input value={trait.description} onChange={(event) => edit_trait(trait.id, { description: event.target.value })} className={field} placeholder="description, ex: how well do I convey depth?" />
                        <RatingSlider value={trait.self_rating ?? 50} on_change={(value) => edit_trait(trait.id, { self_rating: value })} />
                    </div>
                ))}
                <button type="button" onClick={() => set_traits((old) => [...old, new_trait()])} className="self-start px-3 py-1.5 border-2 border-dashed border-cyan-800 text-cyan-500 hover:border-cyan-400 hover:text-cyan-300 cursor-pointer">+ add trait</button>
            </div>

            {status.error && <p className="text-red-400 text-sm" role="alert">{status.error}</p>}
            <div className="flex justify-end gap-3">
                <button type="button" onClick={on_cancel} className="px-4 py-2 border border-cyan-800 text-cyan-500 hover:text-cyan-300 cursor-pointer">cancel</button>
                <button type="submit" disabled={status.saving} className="px-5 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-bold cursor-pointer">{status.saving ? "saving…" : "save"}</button>
            </div>
        </form>
    )
}

function OwnerButton({ onClick, danger, children }) {
    return <button type="button" onClick={onClick} className={`px-2 h-7 text-xs border cursor-pointer ${danger ? "border-red-800 text-red-400 hover:bg-red-950" : "border-cyan-800 text-cyan-400 hover:bg-cyan-950"}`}>{children}</button>
}

function Self_improvement() {
    const navigate = useNavigate()
    const [search_results, set_search_results] = useState(null)
    const [user, set_user] = useState(null)
    const [skills, set_skills] = useState(null)
    const [editing, set_editing] = useState(null) // a skill id, "new" or null
    const [sure_to_delete, set_sure_to_delete] = useState(null)
    const [load_error, set_load_error] = useState(false)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => set_user(data.user))
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => set_user(session?.user ?? null))
        return () => listener.subscription.unsubscribe()
    }, [])

    const load = useCallback(async () => {
        if (!user) return
        const { data, error } = await supabase.from("skills").select("*, traits(*)").eq("user_id", user.id).order("created_at", { ascending: true })
        if (error) {
            console.error(error)
            set_load_error(true)
            return
        }
        set_load_error(false)
        set_skills(data.map((skill) => ({ ...skill, traits: [...(skill.traits || [])].sort((a, b) => (a.created_at || "").localeCompare(b.created_at || "")) })))
    }, [user])
    useEffect(() => { load() }, [load])

    async function delete_skill(id) {
        if (sure_to_delete !== id) return set_sure_to_delete(id) // the first click only asks
        const { error } = await supabase.from("skills").delete().eq("id", id)
        if (error) {
            console.error(error)
            return
        }
        set_sure_to_delete(null)
        set_skills((old) => old.filter((skill) => skill.id !== id))
    }
    async function saved() {
        set_editing(null)
        await load()
    }
    async function display_users(input_value) {
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
                    <SearchBar placeholder={"Search others improvement..."} onSearch={(value) => navigate("/self-improvement/" + value)} onChanged={display_users} results={search_results} onInteract={(value) => navigate("/self-improvement/" + value)} />
                </div>

                <div className="w-full flex flex-col items-center px-3 pb-24">
                    <h1 className="pixel-font text-4xl sm:text-6xl text-cyan-400 text-center">Skill tracker</h1>
                    <p className="mt-2 mb-8 text-cyan-700 text-center">rate where you are, pick where you want to be, and watch it move</p>

                    <div className="w-full max-w-3xl flex flex-col gap-6">
                        {!user && <p className="text-center text-cyan-600">create an account (top right of the header) to track your own skills, or look at mine: <button className="text-cyan-300 underline cursor-pointer" onClick={() => navigate("/self-improvement/xmega latiosx")}>XMega skills</button></p>}
                        {user && load_error && <p className="text-center text-red-400">could not load your skills, try again in a moment.</p>}
                        {user && skills === null && !load_error && <p className="text-center text-cyan-700">loading…</p>}
                        {user && skills?.length === 0 && editing !== "new" && (
                            <p className="text-center text-cyan-600">no skills yet, create one below. For an example, look at <button className="text-cyan-300 underline cursor-pointer" onClick={() => navigate("/self-improvement/xmega latiosx")}>XMega skills</button>.</p>
                        )}

                        {skills?.map((skill) => editing === skill.id
                            ? <SkillEditor key={skill.id} user={user} skill={skill} on_saved={saved} on_cancel={() => set_editing(null)} />
                            : (
                                <SkillCard key={skill.id} skill={skill}>
                                    <OwnerButton onClick={() => set_editing(skill.id)}>edit</OwnerButton>
                                    <OwnerButton danger onClick={() => delete_skill(skill.id)}>{sure_to_delete === skill.id ? "sure?" : "delete"}</OwnerButton>
                                </SkillCard>
                            ))}

                        {user && (editing === "new"
                            ? <SkillEditor user={user} skill={null} on_saved={saved} on_cancel={() => set_editing(null)} />
                            : <button type="button" onClick={() => set_editing("new")} className="py-4 border-2 border-dashed border-cyan-800 text-cyan-500 hover:border-cyan-400 hover:text-cyan-300 pixel-font text-lg cursor-pointer">+ new skill</button>)}
                    </div>
                </div>
            </main>
        </Screen>
    )
}

export default Self_improvement

import { Link } from "react-router-dom"
import AdminFab from "../../components/admin-fab"
import { StatusBadge } from "../../components/content-blocks"
import { PROJECT_THUMBS } from "../../components/project-thumbs"
import { supabase } from "../../lib/supabase"
import { useEffect, useState } from "react"

import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/screen"
import Sidebar from "../../components/sidebar"


// first picture inside the html of the embeds and texts (uploaded with the embed button)
function first_embedded_image(blocks) {
    for (const block of blocks) {
        if (block.type !== "embed" && block.type !== "text") continue
        const found = /<img[^>]+src=["']([^"']+)["']/i.exec(block.value || "")
        if (found) return found[1]
    }
    return null
}

// The cover is the thumbnail, else one set in project-thumbs.jsx, else the first image of the project, else a picture inside an embed, else a big letter on a dark tile.
function ProjectCard({ title, description, last_update, status, url, content, thumbnail }) {
    const last_update_date = last_update ? last_update.split("T")[0] : ""
    const blocks = content || []
    const cover = thumbnail || PROJECT_THUMBS[url.split("/").pop()] || blocks.find((block) => block.type === "image")?.value || first_embedded_image(blocks)
    const count = (type) => blocks.filter((block) => block.type === type).length
    const parts = [["image", "images"], ["video", "videos"], ["audio", "audio"], ["embed", "embeds"]].map(([type, name]) => (count(type) ? `${count(type)} ${name}` : "")).filter(Boolean)
    return (
        <Link to={url} className="group flex flex-col border-2 border-cyan-900 bg-gray-950 hover:border-cyan-400 transition-colors overflow-hidden">
            <div className="relative aspect-video bg-gradient-to-br from-cyan-950 to-gray-950 overflow-hidden">
                {cover
                    ? <img src={cover} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition duration-300" />
                    : <span className="absolute inset-0 flex items-center justify-center pixel-font text-6xl text-cyan-800">{(title || "?").trim().charAt(0).toUpperCase()}</span>}
                <StatusBadge status={status} className="absolute top-2 left-2" />
            </div>
            <div className="flex flex-col gap-1.5 p-3">
                <h3 className="pixel-font text-lg text-cyan-300">{title}</h3>
                <p className="text-sm text-cyan-100/70 line-clamp-3">{description}</p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-xs text-cyan-700">
                    <span>{last_update_date && `updated ${last_update_date}`}</span>
                    <span>{parts.join(" · ")}</span>
                </div>
            </div>
        </Link>
    )
}

function Projects() {
    const [projects, set_projects] = useState([])
    const [user, set_user] = useState(null)
    const [loading, set_loading] = useState(true)
    useEffect(() => {
        async function load_projects(params) {
            const {data, error} = await supabase
            .from("projects")
            .select("*")
            .order("created_at", { ascending: false})
            if (error) {
                console.error(error);
                return
            }
            set_projects(data)
        }load_projects()
        
        set_loading(false)

        async function getUser() {
            const { data } = await supabase.auth.getUser()
            set_user(data.user)
        }getUser()

        const { data: listener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                set_user(session?.user ?? null)
            }
        )
        return () => {listener.subscription.unsubscribe()}

    }, [])

    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="relative w-screen h-[calc(100vh-6.5rem)] overflow-auto pt-2 px-2">
                <div className="w-full flex justify-center pt-6 pb-24 px-1">
                    <div className="w-full max-w-6xl">
                    <h1 className="pixel-font text-3xl text-cyan-300">projects</h1>
                    <p className="text-sm text-cyan-700 mb-5">what I am building, and how far along it is</p>
                    {
                        (projects.length === 0 && !loading) && <span className="text-cyan-700">ops, looks like there is no projects being made yet D:</span>
                    }
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {
                        projects.map(project => {
                            return <ProjectCard 
                            key={project.id}
                            title={project.title}
                            description={project.description}
                            status={project.status}
                            last_update={project.last_update}
                            url={`/projects/${project.url_title}`}
                            content={project.content}
                            thumbnail={project.thumbnail}
                            />
                        })
                    }
                    </div>
                    </div>
                </div>
                {user?.app_metadata?.is_admin ? <AdminFab to="/projects/add_project/" label="new project" /> : null}

                
            </main>
        </Screen>

    )
}

export default Projects

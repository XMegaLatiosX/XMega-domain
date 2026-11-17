import { Link, useParams } from "react-router-dom"
import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/screen"
import Sidebar from "../../components/sidebar"


import { useEffect, useState } from "react"
import AdminFab from "../../components/admin-fab"
import { ContentBlocks, StatusBadge } from "../../components/content-blocks"
import { supabase } from "../../lib/supabase"

function Project() {
    const { project_url_title } = useParams()
    const [project, set_project] = useState(null)
    const [loading, set_Loading] = useState(true)
    const [user, set_user] = useState(null)
    
    useEffect(() => {
        async function getUser(params) {
            const {data} = await supabase.auth.getUser()
            set_user(data.user)
        }
        getUser()
    }, [])
    
    useEffect(() => {

        async function load_project() {
            const { data, error } = await supabase
            .from("projects")
            .select("*")
            .eq("url_title", project_url_title)
            .single()

            if (error) {
                console.error(error)
                set_Loading(false)
                return
            }

            set_project(data)
            set_Loading(false)
        }
        load_project()
    }, [project_url_title])
    
    if (loading) return <Screen></Screen>
    if (!project) return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="w-screen h-[calc(100vh-6.5rem)] overflow-auto px-3 pt-8">
                <div className="max-w-4xl mx-auto">
                    <Link to="/projects" className="text-sm text-cyan-600 hover:text-cyan-300">← projects</Link>
                    <p className="mt-6 text-cyan-700">project not found.</p>
                </div>
            </main>
        </Screen>
    )
    const last_update_date = project.last_update ? project.last_update.split('T')[0] : ""
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="w-screen h-[calc(100vh-6.5rem)] overflow-auto px-3">
                <div className="w-full max-w-4xl mx-auto pt-6 pb-28">
                    <Link to="/projects" className="text-sm text-cyan-600 hover:text-cyan-300">← projects</Link>
                    <div className="mt-3 border-2 border-cyan-900 bg-gray-950 p-4 sm:p-6">
                        <h1 className="pixel-font text-3xl sm:text-4xl text-cyan-300">{project.title}</h1>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            <StatusBadge status={project.status} />
                            {last_update_date && <span className="text-xs text-cyan-700">last update: {last_update_date}</span>}
                        </div>
                        {project.description && <p className="mt-4 text-lg text-cyan-100/80 border-l-4 border-cyan-700 pl-3">{project.description}</p>}
                        <hr className="my-6 border-cyan-900" />
                        <ContentBlocks blocks={project.content} />
                    </div>
                </div>
                {user?.app_metadata?.is_admin ? <AdminFab to={`/projects/add_project/${project.id}`} icon="✎" label="edit project" /> : null}
            </main>
        </Screen>
    )

}
export default Project

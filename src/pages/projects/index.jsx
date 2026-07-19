import { Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { useEffect, useState } from "react"

import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/screen"
import Sidebar from "../../components/sidebar"


function ProjectCard({title, description, last_update, status, url}) {
    const last_update_date = last_update ? last_update.split('T')[0] : ""
    const status_colors = {
        planning: "bg-cyan-700 border-cyan-500 text-cyan-300",
        active: "bg-blue-700 border-blue-500 text-blue-300",
        paused: "bg-yellow-700 border-yellow-500 text-yellow-300",
        completed: "bg-green-700 border-green-500 text-green-300",
        suspended: "bg-red-700 border-red-500 text-red-300",
    }
    return (
        <Link to={url} className="rounded-3xl bg-gray-900 px-4 pt-3 pb-2 mb-6 border border-gray-600 flex-col">

            <div className="flex justify-between items-center">
                <h3 className="font-bold text-cyan-400 text-xl">{title}</h3>

                <div className="flex flex-col justify-center items-center">
                    <span className="font-extralight font-mono text-xs italic text-gray-500">last update: {last_update_date}</span>

                    <div className="flex justify-between w-full items-center">
                        <span className="font-bold text-sm italic text-gray-500 pb-0.5">status:</span>
                        <span className={`select-none w-24 text-center rounded-2xl border-2 pb-0.5 items-center flex justify-center text-xs font-semibold
                            ${status_colors[status]
                            }`}>{status}</span>
                    </div>
                    

                </div>
            </div>

            <hr className="w-full text-gray-600 my-3"></hr>
            <p className="text-gray-600">{description}</p>


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
            <main className="relative w-screen h-[calc(100vh-7rem)] overflow-auto pt-2 px-2">
                <div className="w-full flex justify-center py-8">
                    <div className="flex flex-col grow max-w-200">
                    {
                        (projects.length === 0 && !loading) && <span>ops, looks like there is no projects being made yet D:</span>
                    }
                    {
                        projects.map(project => {
                            return <ProjectCard 
                            key={project.id}
                            title={project.title}
                            description={project.description}
                            status={project.status}
                            last_update={project.last_update}
                            url={`/projects/${project.url_title}`}
                            />
                        })
                    }
                    </div>
                </div>
                {user?.app_metadata?.is_admin? <Link className="fixed right-8 bottom-4" to={(`/projects/add_project/`)} > <button className="w-12 h-12"> + </button> </Link>: null}

                
            </main>
        </Screen>

    )
}

export default Projects

import { Link, Navigate, useParams } from "react-router-dom"
import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/screen"
import Sidebar from "../../components/sidebar"


import { useEffect, useState } from "react"
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
    // if (!project) return <Navigate to="/404" replace />
    const last_update_date = project.last_update ? project.last_update.split('T')[0] : ""
    const status_colors = {
        planning: "bg-cyan-700 border-cyan-500 text-cyan-300",
        active: "bg-blue-700 border-blue-500 text-blue-300",
        paused: "bg-yellow-700 border-yellow-500 text-yellow-300",
        completed: "bg-green-700 border-green-500 text-green-300",
        suspended: "bg-red-700 border-red-500 text-red-300",
    }
    const status_name = {
        planning: "Planning",
        active: "In Progress",
        paused: "Paused",
        completed: "Completed",
        suspended: "Suspended",
    }
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="w-screen h-[calc(100vh-7rem)] overflow-auto pt-2">
                <div className="w-full flex justify-center py-8">
                    <div className="bg-gray-900 py-4 px-[2%] max-w-10/12 w-full flex-col flex items-center rounded-sm">
                        <h1 className="text-cyan-600 font-bold text-3xl w-3/4 text-center">{project.title}</h1>
                        <span></span>
                        <div className="flex h-8 items-center justify-center gap-2 mt-4 mb-2 relative float-right">
                            <span className="font-extralight font-mono text-xs italic text-gray-500">last update: {last_update_date}</span>
                            <div className="flex justify-between w-full items-center">
                                <span className="font-bold text-sm italic text-gray-500 pb-0.5"></span>
                                <span className={`select-none w-24 text-center rounded-2xl border-2 pb-0.5 items-center flex justify-center text-xs font-semibold
                                    ${status_colors[project.status]
                                    }`}>{status_name[project.status]}</span>
                            </div>
                        </div>
                        <hr className="w-full h-1 mt-4 mb-8 text-gray-600"></hr>

                        {
                            project.content.map((module, index) => {
                                const components = {
                                    // "break": <hr className="w-full h-1 mt-4 mb-8 text-gray-600"></hr>,
                                    "text": <p className="text-center font-bold" key={index} dangerouslySetInnerHTML={{__html: module.value}}></p>,
                                    "embed": <p className="text-center font-bold" key={index}  dangerouslySetInnerHTML={{__html: module.value}}></p>,
                                    "image": <img key={index} src={module.value}></img>,
                                    "video": <video key={index} src={module.value} controls></video>,
                                    "audio": <audio key={index} src={module.value} controls></audio>

                                }
                                return components[module.type] || null
                            })
                        }
                        <hr className="w-full h-1 my-8 text-gray-600"></hr>
                    </div>

                </div>
                {user?.app_metadata?.is_admin? <Link className="fixed right-8 bottom-4" to={(`/projects/add_project/${project.id}`)} > <button className="w-12 h-12"> + </button> </Link>: null}
            </main>
        </Screen>
    )
    
}
export default Project
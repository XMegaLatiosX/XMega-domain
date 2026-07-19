import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/screen"
import Sidebar from "../../components/sidebar"


import { useEffect, useState } from "react"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { v4 } from "uuid"


function Content_input_div({id, content_value, on_delete, on_change}) {
    const [ selected_type, set_selected_type ] = useState(content_value.type? content_value.type :"text")
    const [ image, set_image ] = useState(content_value.type === "image"? content_value.value:null)
    const [ audio, set_audio ] = useState(content_value.type === "audio"? content_value.value:null)
    const [ video, set_video ] = useState(content_value.type === "video"? content_value.value:null)
    const [ embed, set_embed ] = useState(content_value.type === "embed"? content_value.value:null)
    
    useEffect(() => {
        console.log("CONTEUDO Q CHEGOU:", content_value);
        set_selected_type(content_value.type)
    }, [content_value.type, content_value.value])

    const update_content = (value, type) => {
        if (type === "text") {
            on_change(value, type)
            return
        }

        if (type === "embed") {
            set_embed(value)
            on_change(value, type)
            return
        }


        const file = value.target.files[0]
        if (!file) return
        const url = URL.createObjectURL(file)

        switch(type){
            case "image":
                set_image(url)
                break

            case "audio":
                set_audio(url)
                break

            case "video":
                set_video(url)
                break
        }

        on_change(file, type)

    }
    
    function Render_content() {
        switch (selected_type) {
            case "text":
                return <textarea id={id} value={content_value.value} onChange={(e) => update_content(e.target.value, "text")} className="p-0.5 pl-2 max-h-64 min-h-64 w-full bg-gray-950 border border-cyan-600 mb-16 rounded-sm" placeholder="Content"/>
                
            case "image":
                return (
                    <div className="relative min-w-64 w-fit max-w-full min-h-64">
                        <input type="file" id={id} onChange={(e) => update_content(e, "image")} className={`absolute h-64 w-full border rounded-sm bg-gray-950 border-cyan-600 ${image? "opacity-0" : "opacity-100"}`}/>
                        <img src={image} className={`h-full rounded-sm`}/>
                    </div>
                )
                
            case "audio":
                return (
                    <div className="relative min-w-64 w-fit max-w-full z-50 flex flex-col">
                        <input id={id} type="file" accept="audio/*" onChange={(e) => update_content(e, "audio")} className={` border rounded-sm bg-gray-950 border-cyan-600 z-10`}/>
                        <audio src={audio} className={` rounded-sm`} controls></audio>
                    </div>
                )
                
            case "video":
                return (
                    <div className="relative min-w-64 w-fit max-w-full min-h-64 flex flex-col">
                        <input id={id} type="file" accept="video/*" onChange={(e) => update_content(e, "video")} className={`h-64 w-full border rounded-sm bg-gray-950 border-cyan-600 `}/>
                        <video src={video} className={`h-full rounded-sm `} controls></video>
                    </div>
                )
                
            case "embed":
                return (
                    <div className="relative min-w-64 w-fit max-w-full min-h-64 flex">
                        <textarea placeholder="Embed code..." id={id} onChange={(e) => update_content(e.target.value, "embed")} value={embed} className="p-0.5 pl-2 max-h-64 min-h-64 min-w-64 bg-gray-950 border border-cyan-600 rounded-sm" placeholder="Content"/>
                            <p className="scale-75 max-w-12 relative bottom-8"  dangerouslySetInnerHTML={{__html: embed}}></p>
                    </div>
                )
        }
    }
    return (
        <div name={id} className="relative flex flex-row mb-12 w-full h-64">
            <select name="content_type" className="p-0.5 pl-2 bg-gray-950 border border-cyan-600 rounded-sm max-h-7.5 mr-2" value={selected_type} onChange={(e) => set_selected_type(e.target.value)}>
                <option value="text">text</option>
                <option value="image">img</option>
                <option value="audio">audio</option>
                <option value="video">video</option>
                <option value="embed">embed_content</option>
            </select>
            {Render_content()}
            <a onClick={() => on_delete(id)} className="absolute flex justify-center items-center right-0 w-8 h-8 bg-amber-950 border border-b-amber-950 border-l-amber-950 border-t border-r hover:border-l-[rgb(83,91,243)] hover:border-b-[rgb(83,91,243)] hover:text-amber-50 rounded-bl-sm rounded-tr-sm transition-all duration-300">X</a>
            
        </div>
    )
}





function AddProject() {
    const { project_id: old_project_id } = useParams()
    const [title, set_title] = useState("")
    const [description, set_description] = useState("")
    const [status, set_status] = useState("")
    const [content_list, set_content_list] = useState([])

    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    const navigate = useNavigate()
    
    useEffect(() => {
        async function getUser() {
            
            const { data } = await supabase.auth.getUser()
            setUser(data.user)
            setLoading(false)
        }
        getUser()
    }, [])
    useEffect(() => {
        const { data: listener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setUser(session?.user ?? null)
            }
        )
            
        
        return () => {listener.subscription.unsubscribe()}
    }, [])


    if (!loading && !user?.app_metadata?.is_admin) return <Navigate to="/projects"/>

    useEffect(() => {
        async function load_post() {
            console.log("existing project, id: ", old_project_id);

            const {data: project_data, error} = await supabase
            .from("projects")
            .select("*")
            .eq("id", old_project_id)
            .single()
            
            if (error) {
                console.error(error);
                return
            }
            
            if (!project_data) return
            set_status(project_data.status)
            set_title(project_data.title)
            set_description(project_data.description)
            const loaded_content = project_data.content.map((c, value) => ({
                id: crypto.randomUUID(), ...c
            }))
            set_content_list(loaded_content)

        }
        
    
        if(old_project_id) load_post() 
        else add_content_block()
    }, [])

    async function handle_submit(e) {
        e.preventDefault()

        const editing = !!old_project_id
        const project_id = old_project_id ?? v4()
        
        
        let formated_content = []

        // read every content, passing just type and value, if its an image, upload to bucket and set bucket publicurl as value
        for (const c of content_list) {

            if (c.type != "text" && c.type != "embed") {
                console.log(c.type);
                
                const input = document.getElementById(c.id)
                const file = input.files[0]
                const ext = file.name.split('.').pop()
                if (!input.files?.length)  continue
                if (input.files.length > 0) {
                    const file_path = `${project_id}/${c.id}.${ext}`

                    const {error: media_upload_error} = await supabase.storage
                    .from("project_media")
                    .upload(file_path, file, {upsert: true})

                    if (media_upload_error) {
                        // define error reacion here
                        console.log("content upload error down here: ");
                        console.error(media_upload_error);
                        continue
                    }

                    const {data} = supabase.storage
                    .from("project_media")
                    .getPublicUrl(file_path)

                    c.value = data.publicUrl
                }
            }
            formated_content.push({type: c.type, value:c.value})
        }

        console.log("content to be posted: ", formated_content);


        const description_input = description
        const title_input = title
        const url_title = title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/['"!?.,\/\\#$%\^&\*;:{}=\-_`~()]/g, '')
            .trim()
            .replace(/\s+/g, '-');



        if (editing) {
            const {data, error: project_submit_error} = await supabase
            .from("projects")
            .update([
                {
                    id: old_project_id,
                    title: title_input,
                    url_title: url_title,
                    description: description_input,
                    status: status,
                    content: formated_content
                }
            ])
            .eq("id", old_project_id)
            if (project_submit_error) {
                console.error(project_submit_error);
                return
            }
            const { data: projects, error } = await supabase
            .from('projects')
            .select('*')
            .eq("id", old_project_id)
            
            console.log("| id: ", old_project_id)
            console.log("| url_title: ", url_title)
            console.log("| title: ", title_input)
            console.log("| description: ", description_input)
            console.log("| content: ", formated_content)
            
            console.log(projects);
            
            

        }else {
            const {data, error: project_submit_error} = await supabase
            .from("projects")
            .insert([
                {
                    id: project_id,
                    title: title_input,
                    url_title: url_title,
                    description: description_input,
                    status: status,
                    content: formated_content
                }
            ])
            if (project_submit_error) {
                console.error(project_submit_error);
                return
            }
            

        }
        
        console.log("Project added!")
        
        async function delete_post_files() {
            const {data: files, error} = await supabase.storage
            .from("project_media")
            .list(project_id)
            if (error) {
                console.error(error);
                return
            }
            if (!files.length) return

            const used_files_id = new Set ([
                ...content_list.filter(c => c.type !== "text" && c.type !== "embed")
                .map(c=> `${c.id}`)
            ])
            console.log("deletação:");
            
            console.log(files);
            console.log(used_files_id);
            
            await supabase.storage
            .from("project_media")
            .remove(
                files.filter(file => {
                    const id = file.name.split(".")[0];
                    return !used_files_id.has(id);
                })
                .map(file => `${project_id}/${file.name}`)
            )
        }
        await delete_post_files()

        navigate("/projects")
        return
    }
    
    function add_content_block() {
        const new_block = {id: Date.now(), type: "text", value: ""}
        set_content_list([...content_list, new_block])
    }
    function update_content_block(id, new_value, type) {
    set_content_list(content_list.map(c => c.id === id ? {...c, type: type, value: new_value} : c, ))
    
    console.log("content: ", content_list)
    console.log("contento: ", JSON.stringify(content_list))
    }
    function remove_content_block(remove_id) {
        set_content_list(content_list.filter(c => c.id !== remove_id))
        if(content_list.length === 0 ) add_content_block()
    }
    async function delete_project() {
        await supabase.storage
        .from("project_media").remove(
            ((await supabase.storage
                .from("project_media")
                .list(old_project_id)
            ).data.map(file => `${old_project_id}/${file.name}`))
        )
        await supabase.from("projects")
        .delete()
        .eq("id", old_project_id)
        navigate("/projects")
    }

    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="relative w-screen h-[calc(100vh-7rem)] overflow-auto pt-2 px-2">
                <div className="w-full flex justify-center p-2 sm:p-8 h-9/10 sm:h-full">

                    <form className="relative w-full max-w-250 bg-gray-900 rounded-lg flex flex-col px-8 py-4 overflow-auto" onSubmit={handle_submit}>
                        <h1 className="font-bold text-4xl text-cyan-600 mb-8">Add project</h1>
                        <div className="flex flex-row justify-around gap-4">
                            <input type="text" id="title_input" className="p-0.5 pl-2 w-full bg-gray-950 border border-cyan-600 mb-4 rounded-sm" placeholder="Title" value={title} onChange={(e) => set_title(e.target.value)}/>
                            <select name="project_status" className="p-0.5 pl-2 bg-gray-950 border border-cyan-600 rounded-sm max-h-7.5 mr-2" value={status} onChange={(e) => set_status(e.target.value)}>
                                <option value="planning">planning</option>
                                <option value="active">active</option>
                                <option value="paused">paused</option>
                                <option value="completed">completed</option>
                                <option value="suspended">suspended</option>
                            </select>
                        </div>

                        <textarea type="text" id="description_input" className="p-0.5 pl-2 min-h-32 bg-gray-950 border border-cyan-600 mb-4 rounded-sm" placeholder="Description" value={description} onChange={(e) => set_description(e.target.value)}/>

                        {
                            content_list.map((content) => {
                                return <Content_input_div id={content.id} key={content.id} on_delete={remove_content_block} content_value={content} on_change={(val, type) => update_content_block(content.id, val, type)}></Content_input_div>
                            })
                        }


                        <a onClick={add_content_block} className="h-12 w-12 rounded-md font-bold text-3xl flex justify-center items-center pb-1.5 select-none text-cyan-600 bg-gray-950 border border-transparent hover:border-[rgb(83,91,243)] transition-all duration-300">+</a>

                        <button type="submit" className="fixed bottom-12 right-4 bg-gray-950 sm:bottom-14 sm:right-16 border-2 h-8 w-32 p-1 rounded-md border-cyan-950  hover:border-[rgb(83,91,243)] "><span className="w-full h-full select-none text-md flex items-center justify-center text-cyan-600 font-semibold">{true? "Save Project" : "Add Project"}</span></button>
                        <button type="button" onClick={delete_project} className="absolute top-4  bg-red-600 sm:right-16 border h-8 w-32 p-1 rounded-md border-cyan-950  hover:border-red-400 "><span className="w-full h-full select-none text-md flex items-center justify-center text-red-300 font-semibold">Delete project</span></button>
                    </form>
                
                </div>                
            </main>
        </Screen>

    )
    
}
export default AddProject
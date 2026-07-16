import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/screen"
import Sidebar from "../../components/sidebar"

import { Navigate, useNavigate, useParams } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import { supabase } from "../../lib/supabase"
import { v4 } from "uuid"


import star_icon from "../../assets/images/star_icon.png"

function Content_input_div({id, content_value, on_delete, on_change}) {
    const [ selected_type, set_selected_type ] = useState(content_value.type? content_value.type :"text")
    const [ image, set_image ] = useState(content_value.type === "image"? content_value.value:null)
    const [ audio, set_audio ] = useState(content_value.type === "audio"? content_value.value:null)
    const [ video, set_video ] = useState(content_value.type === "video"? content_value.value:null)
    const [ embed, set_embed ] = useState(content_value.type === "embed"? content_value.value:null)
    
    useEffect(() => {
        console.log("CONTEUDO Q CHEGOU:", content_value);
        set_selected_type(content_value.type)
        // if(content_value.type === "image") set_image(content_value.value)
        // if(content_value.type === "audio") set_audio(content_value.value)
        // if(content_value.type === "video") set_video(content_value.value)
        // if(content_value.type === "embed") set_embed(content_value.value)
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
                        <input type="file" id={id} onChange={(e) => update_content(e, "image")} className={`absolute h-64 w-full border rounded-sm bg-gray-950 border-cyan-600 ${image? "opacity-0" : "opacity-100"}`} placeholder="thumbnail: /media/pixelarts/altar contest.png"/>
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
                            {/* YouTube
                            Twitch
                            Spotify
                            SoundCloud
                            itch.io
                            Google Maps
                            if (url.endsWith(".png")) {
                                // imagem
                            } 
                            if (url.includes("twitch.tv/?")) {
                                // imagem
                                https://player.twitch.tv/?channel=xmegalatiosx&parent=localhost
                            }

                            if (url.includes("youtube")) {
                                // vídeo
                            }

                            if (url.includes("youtu.be")) {
                                // vídeo
                            }

                            if (url.includes("soundcloud")) {
                                // player
                            } */}
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


function CreatePost() {
    const { post_id: old_post_id } = useParams()
    console.log(old_post_id);
    
    
    const [icon_img, set_icon_img] = useState(null)
    const [thumbnail_img, set_thumbnail_img] = useState(null)
    const [name, set_name] = useState("")
    const [title, set_title] = useState("")
    const [summary, set_summary] = useState("")


    const [content_list, set_content_list] = useState([])
    
    const navigate = useNavigate()
    
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
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
    
    useEffect(() => {
        async function load_post() {
            console.log("tem post, id: ", old_post_id);

            const {data: post_data, error} = await supabase
            .from("blog_posts")
            .select("*")
            .eq("id", old_post_id)
            .single()
            
            if (error) {
                console.error(error);
                return
            }
            
            if (!post_data) return
            
            set_icon_img(post_data.icon)
            set_thumbnail_img(post_data.thumbnail)
            set_name(post_data.slug)
            set_title(post_data.title)
            set_summary(post_data.summary)
            const loaded_content = post_data.content.map((c, value) => ({
                id: crypto.randomUUID(), ...c
            }))
            set_content_list(loaded_content)

        }
        
    
        if(old_post_id) load_post() 
        else add_content_block()
    }, [])


    if (!loading && !user?.app_metadata?.is_admin) return <Navigate to="/blog"/>



    async function handle_submit(e) {
        e.preventDefault()

        const editing = !!old_post_id
        const post_id = old_post_id ?? v4()
        
        
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
                    const file_path = `${post_id}/${c.id}.${ext}`

                    const {error: media_upload_error} = await supabase.storage
                    .from("blog_media")
                    .upload(file_path, file, {upsert: true})

                    if (media_upload_error) {
                        // define error reacion here
                        console.log("content upload error down here: ");
                        console.error(media_upload_error);
                        continue
                    }

                    const {data} = supabase.storage
                    .from("blog_media")
                    .getPublicUrl(file_path)

                    c.value = data.publicUrl
                }
            }
            formated_content.push({type: c.type, value:c.value})
        }

        console.log("content to be posted: ", formated_content);



        var thumbnail_public_url
        if (document.getElementById('thumbnail_input').files[0]) {
            const thumbnail_file = document.getElementById('thumbnail_input').files[0]
            const thumbnail_ext = thumbnail_file.name.split('.').pop()
            const thumbnail_file_path = `${post_id}/thumbnail.${thumbnail_ext}`
            const {error: thumbnail_upload_error} = await supabase.storage
            .from("blog_media")
            .upload(thumbnail_file_path, thumbnail_file, {upsert: true})

            if (thumbnail_upload_error) {
                console.log("thumbnail upload error down here: ");
                console.error(thumbnail_upload_error);
            }

            const {data: thumbnail_data_url} = supabase.storage
            .from("blog_media")
            .getPublicUrl(thumbnail_file_path)

            thumbnail_public_url = thumbnail_data_url.publicUrl
        }else if (thumbnail_img) thumbnail_public_url = thumbnail_img

        var icon_public_url = star_icon
        if (document.getElementById('icon_input').files[0]) {
            const icon_file = document.getElementById('icon_input').files[0]
            const icon_ext = icon_file.name.split('.').pop()
            const icon_file_path = `${post_id}/icon.${icon_ext}`
            const {error: icon_upload_error} = await supabase.storage
            .from("blog_media")
            .upload(icon_file_path, icon_file, {upsert: true})
    
            if (icon_upload_error) {
                console.log("icon upload error down here: ");
                console.error(icon_upload_error);
            }

            const {data: icon_data_url} = supabase.storage
            .from("blog_media")
            .getPublicUrl(icon_file_path)

            icon_public_url = icon_data_url.publicUrl
        }else if(icon_img) icon_public_url = icon_img



        const description_input = summary
        const title_input = title
        const name_input = name
        const url_name = name_input
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/['"!?.,\/\\#$%\^&\*;:{}=\-_`~()]/g, '')
            .trim()
            .replace(/\s+/g, '-');



        if (editing) {
            const {data, error: post_submit_error} = await supabase
            .from("blog_posts")
            .update([
                {
                    id: old_post_id,
                    slug: name_input,
                    url_slug: url_name,
                    title: title_input,
                    icon: icon_public_url,
                    thumbnail: thumbnail_public_url,
                    summary: description_input,
                    content: formated_content,
                }
            ])
            .eq("id", old_post_id)
            if (post_submit_error) {
                console.error(post_submit_error);
                return
            }
            const { data: posts, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq("id", old_post_id)
            
            console.log("| id: ", old_post_id)
            console.log("| slug: ", name_input)
            console.log("| url_slug: ", url_name)
            console.log("| title: ", title_input)
            console.log("| icon: ", icon_public_url)
            console.log("| thumbnail: ", thumbnail_public_url)
            console.log("| summary: ", description_input)
            console.log("| content: ", formated_content)
            
            console.log(posts);
            
            

        }else {
            const {data, error: post_submit_error} = await supabase
            .from("blog_posts")
            .insert([
                {
                    id: post_id,
                    slug: name_input,
                    url_slug: url_name,
                    title: title_input,
                    icon: icon_public_url,
                    thumbnail: thumbnail_public_url,
                    summary: description_input,
                    content: formated_content
                }
            ])
            if (post_submit_error) {
                console.error(post_submit_error);
                return
            }
            

        }
        
        console.log("Post criado!")
        
        async function delete_post_files() {
            const {data: files, error} = await supabase.storage
            .from("blog_media")
            .list(post_id)
            if (error) {
                console.error(error);
                return
            }
            if (!files.length) return

            const used_files_id = new Set ([
                ...(icon_public_url? ["icon"]: []),
                ...(thumbnail_public_url? ["thumbnail"]: []),
                ...content_list.filter(c => c.type !== "text" && c.type !== "embed")
                .map(c=> `${c.id}`)
            ])
            console.log("deletação:");
            
            console.log(files);
            console.log(used_files_id);
            
            await supabase.storage
            .from("blog_media")
            .remove(
                files.filter(file => {
                    const id = file.name.split(".")[0];
                    return !used_files_id.has(id);
                })
                .map(file => `${post_id}/${file.name}`)
            )
        }
        await delete_post_files()

        // navigate("/blog")
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

    function change_icon_img(e) {
        const file = e.target.files[0]
        if(file){
            const temporary_url = URL.createObjectURL(file)
            set_icon_img(temporary_url)
        }
        // sett icon here 
    }
    function change_thumbnail_img(e) {
        const file = e.target.files[0]
        if(file){
            const temporary_url = URL.createObjectURL(file)
            set_thumbnail_img(temporary_url)
        }
        // sett icon here 
    }
    async function delete_post() {
        await supabase.storage
        .from("blog_media").remove(
            ((await supabase.storage
                .from("blog_media")
                .list(old_post_id)
            ).data.map(file => `${old_post_id}/${file.name}`))
        )
        await supabase.from("blog_posts")
        .delete()
        .eq("id", old_post_id)
        navigate("/blog")
    }
    function remove_icon() {
        document.getElementById('icon_input').value = null
        set_icon_img(null)
    }
    function remove_thumbnail() {
        document.getElementById('thumbnail_input').value = null
        set_thumbnail_img(null)
    }
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="w-screen h-[calc(100vh-7rem)] overflow-auto pt-2">
                <div className="w-full flex justify-center p-2 sm:p-8 h-9/10 sm:h-full">

                    <form className="relative w-full max-w-250 bg-gray-900 rounded-lg flex flex-col px-8 py-4 overflow-auto" onSubmit={handle_submit}>
                        <h1 className="font-bold text-4xl text-cyan-600 mb-8">create post</h1>
                        <div className="flex flex-row justify-around gap-4">
                            {icon_img && <button type="button" onClick={remove_icon} className="flex justify-center items-center right-0 w-8 h-8 bg-amber-950 border border-b-amber-950 border-l-amber-950 border-t border-r hover:border-l-[rgb(83,91,243)] hover:border-b-[rgb(83,91,243)] hover:text-amber-50 rounded-bl-sm rounded-tr-sm transition-all duration-300">X</button>}

                            <div className="relative flex justify-center items-center h-7.5 w-7.5 border rounded-sm border-cyan-600 bg-gray-950 hover:border-cyan-900 transition-all duration-300">
                                <span className="absolute text-lg -translate-y-0.5">+</span>
                                <img src={icon_img} className={`absolute h-full w-full rounded-sm ${icon_img ? "opacity-100" : "opacity-0"}`}/>
                                <input type="file" id="icon_input" className="p-0.5 pl-2 w-7.5 bg-gray-950 border border-cyan-600 mb-4 rounded-sm opacity-0" onChange={change_icon_img}/>
                            </div>

                            <input type="text" id="name_input" className="p-0.5 pl-2 w-full bg-gray-950 border border-cyan-600 mb-4 rounded-sm" placeholder="Name" value={name} onChange={(e) => set_name(e.target.value)}/>
                            <input type="text" id="title_input" className="p-0.5 pl-2 w-full bg-gray-950 border border-cyan-600 mb-4 rounded-sm" placeholder="Title" value={title} onChange={(e) => set_title(e.target.value)}/>

                        </div>

                        <div className="relative flex max-w-full min-w-64 w-fit min-h-64 mb-4">
                            <img src={thumbnail_img} className="h-full  rounded-sm"/>
                            <input type="file" id="thumbnail_input" className={`absolute h-64 w-full rounded-sm bg-gray-950 border border-cyan-600 ${thumbnail_img? "opacity-0" : "opacity-100"}`} onChange={change_thumbnail_img}/>
                            {thumbnail_img && <button type="button" onClick={remove_thumbnail} className="absolute flex justify-center items-center right-0 w-8 h-8 bg-amber-950 border border-b-amber-950 border-l-amber-950 border-t border-r hover:border-l-[rgb(83,91,243)] hover:border-b-[rgb(83,91,243)] hover:text-amber-50 rounded-bl-sm rounded-tr-sm transition-all duration-300">X</button>}
                        </div>

                        <textarea type="text" id="description_input" className="p-0.5 pl-2 min-h-32 bg-gray-950 border border-cyan-600 mb-4 rounded-sm" placeholder="summary" value={summary} onChange={(e) => set_summary(e.target.value)}/>

                        {
                            content_list.map((content) => {
                                return <Content_input_div id={content.id} key={content.id} on_delete={remove_content_block} content_value={content} on_change={(val, type) => update_content_block(content.id, val, type)}></Content_input_div>
                            })
                        }


                        <a onClick={add_content_block} className="h-12 w-12 rounded-md font-bold text-3xl flex justify-center items-center pb-1.5 select-none text-cyan-600 bg-gray-950 border border-transparent hover:border-[rgb(83,91,243)] transition-all duration-300">+</a>

                        <button type="submit" className="fixed bottom-12 right-4 bg-gray-950 sm:bottom-14 sm:right-16 border-2 h-8 w-32 p-1 rounded-md border-cyan-950  hover:border-[rgb(83,91,243)] "><span className="w-full h-full select-none text-md flex items-center justify-center text-cyan-600 font-semibold">{old_post_id? "Save Post" : "Create Post"}</span></button>
                        <button type="button" onClick={delete_post} className="absolute top-4  bg-red-600 sm:right-16 border h-8 w-32 p-1 rounded-md border-cyan-950  hover:border-red-400 "><span className="w-full h-full select-none text-md flex items-center justify-center text-red-300 font-semibold">Delete Post</span></button>
                    </form>

                </div>
            </main>
        </Screen>
    )
}
export default CreatePost
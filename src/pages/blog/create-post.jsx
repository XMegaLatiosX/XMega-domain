import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/screen"
import Sidebar from "../../components/sidebar"

import { Navigate, useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import { supabase } from "../../lib/supabase"
import { v4 } from "uuid"



function Content_input_div({id, on_delete, on_change}) {
    const [ select_value, set_select_value ] = useState("text")
    const [ image, set_image ] = useState(null)
    

    const change_image = (e) => {
        const file = e.target.files[0]
        if(file) {
            const temporary_url = URL.createObjectURL(file)
            set_image(temporary_url)
            on_change(temporary_url, "img")
        }
    }

    return (
        <div name={id} className="relative flex flex-row mb-4 w-full h-64">
            <select name="content_type" className="p-0.5 pl-2 bg-gray-950 border border-cyan-600 rounded-sm max-h-7.5 mr-2" onChange={(e) => set_select_value(e.target.value)}>
                <option value="text">text</option>
                <option value="image">img</option>
            </select>

            <textarea onChange={(e) => on_change(e.target.value, "text")} className={`p-0.5 pl-2 max-h-64 min-h-64 w-full bg-gray-950 border border-cyan-600 mb-16 rounded-sm ${select_value === "text" ? "block" : "hidden"}`} placeholder="Content"/>
            <div className={`relative min-w-64 w-fit max-w-full min-h-64 ${select_value === "image" ? "block" : "hidden"}`}>
                <input type="file" id={id} onChange={change_image} className={`absolute h-64 w-full border rounded-sm bg-gray-950 border-cyan-600 ${image? "opacity-0" : "opacity-100"}`} placeholder="thumbnail: /media/pixelarts/altar contest.png"/>
                <img src={image} className={`h-full rounded-sm`}/>
            </div>
            <a onClick={() => on_delete(id)} className="absolute flex justify-center items-center right-0 w-8 h-8 bg-amber-950 border border-b-amber-950 border-l-amber-950 border-t border-r hover:border-l-[rgb(83,91,243)] hover:border-b-[rgb(83,91,243)] hover:text-amber-50 rounded-bl-sm rounded-tr-sm transition-all duration-300">X</a>
            
        </div>
    )
}


function CreatePost() {

    const [icon_img, set_icon_img] = useState(null)
    const [thumbnail_img, set_thumbnail_img] = useState(null)


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
    
    useEffect(() => {if(content_list.length === 0 ) add_content_block()}, [])
        
        useEffect(() => {
            const { data: listener } = supabase.auth.onAuthStateChange(
                (event, session) => {
                    setUser(session?.user ?? null)
                }
            )
            
        
        return () => {listener.subscription.unsubscribe()}
    }, [])
    
    if (!user?.app_metadata?.is_admin) return <Navigate to="/blog"/>



    async function handle_submit(e) {
        e.preventDefault()

        const post_id = v4()
        let formated_content = []

        // read every content, passing just type and value, if its an image, upload to bucket and set bucket publicurl as value
        for (const c of content_list) {
            if (c.type !== "text") {
                const input = document.getElementById(c.id)

                if (input.files.length === 0) continue

                const file = input.files[0]
                const ext = file.name.split('.').pop()
                const file_path = `${post_id}/${c.id}.${ext}`

                const {error: img_upload_error} = await supabase.storage
                .from("blog_posts_images")
                .upload(file_path, file, {upsert: true})

                if (img_upload_error) {
                    // define error reacion here
                    console.log("content upload error down here: ");
                    console.error(img_upload_error);
                    continue
                }

                const {data} = supabase.storage
                .from("blog_posts_images")
                .getPublicUrl(file_path)

                c.value = data.publicUrl
            }
            formated_content.push({type: c.type, value:c.value})
        }
        console.log("result: ", formated_content);


        const thumbnail_file = document.getElementById('thumbnail_input').files[0]
        const thumbnail_ext = thumbnail_file.name.split('.').pop()
        const thumbnail_file_path = `${post_id}/thumbnail.${thumbnail_ext}`
        const {error: thumbnail_upload_error} = await supabase.storage
        .from("blog_posts_images")
        .upload(thumbnail_file_path, thumbnail_file, {upsert: true})

        if (thumbnail_upload_error) {
            console.log("thumbnail upload error down here: ");
            console.error(thumbnail_upload_error);
        }

        const {data: thumbnail_data_url} = supabase.storage
        .from("blog_posts_images")
        .getPublicUrl(thumbnail_file_path)

        const thumbnail_public_url = thumbnail_data_url.publicUrl


        const icon_file = document.getElementById('icon_input').files[0]
        const icon_ext = icon_file.name.split('.').pop()
        const icon_file_path = `${post_id}/icon.${icon_ext}`
        const {error: icon_upload_error} = await supabase.storage
        .from("blog_posts_images")
        .upload(icon_file_path, icon_file, {upsert: true})

        if (icon_upload_error) {
            console.log("icon upload error down here: ");
            console.error(icon_upload_error);
        }

        const {data: icon_data_url} = supabase.storage
        .from("blog_posts_images")
        .getPublicUrl(icon_file_path)

        const icon_public_url = icon_data_url.publicUrl

        const description_input = document.getElementById('description_input').value
        const title_input = document.getElementById('title_input').value
        const name_input = document.getElementById('name_input').value
        const url_name = name_input
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/['"!?.,\/\\#$%\^&\*;:{}=\-_`~()]/g, '')
            .trim()
            .replace(/\s+/g, '-');




        const {data, error} = await supabase
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
        if (error) {
            console.error(error);
            return
        }
        console.log("Post criado!")

        navigate("/blog")
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

                            <div className="relative flex justify-center items-center h-7.5 w-7.5 border rounded-sm border-cyan-600 bg-gray-950 hover:border-cyan-900 transition-all duration-300">
                                <span className="absolute text-lg -translate-y-0.5">+</span>
                                <img src={icon_img} className="absolute h-full w-full rounded-sm"/>
                                <input type="file" id="icon_input" className="p-0.5 pl-2 w-7.5 bg-gray-950 border border-cyan-600 mb-4 rounded-sm opacity-0" onChange={change_icon_img}/>
                            </div>

                            <input type="text" id="name_input" className="p-0.5 pl-2 w-full bg-gray-950 border border-cyan-600 mb-4 rounded-sm" placeholder="Name"/>
                            <input type="text" id="title_input" className="p-0.5 pl-2 w-full bg-gray-950 border border-cyan-600 mb-4 rounded-sm" placeholder="Title"/>

                        </div>

                        <div className="relative flex max-w-full min-w-64 w-fit min-h-64 mb-4">
                            <img src={thumbnail_img} className="h-full  rounded-sm"/>
                            <input type="file" id="thumbnail_input" className={`absolute h-64 w-full rounded-sm bg-gray-950 border border-cyan-600 ${thumbnail_img? "opacity-0" : "opacity-100"}`} onChange={change_thumbnail_img}/>
                        </div>

                        <textarea type="text" id="description_input" className="p-0.5 pl-2 min-h-32 bg-gray-950 border border-cyan-600 mb-4 rounded-sm" placeholder="summary"/>

                        {
                            content_list.map((content) => {
                                return <Content_input_div id={content.id} key={content.id} on_delete={remove_content_block} on_change={(val, type) => update_content_block(content.id, val, type)}></Content_input_div>
                            })
                        }


                        <a onClick={add_content_block} className="h-12 w-12 rounded-md font-bold text-3xl flex justify-center items-center pb-1.5 select-none text-cyan-600 bg-gray-950 border border-transparent hover:border-[rgb(83,91,243)] transition-all duration-300">+</a>

                        <button type="submit" className="fixed bottom-12 right-4 bg-gray-950 sm:bottom-14 sm:right-16 border-2 h-8 w-32 p-0 rounded-md border-cyan-950  hover:border-[rgb(83,91,243)] "><span className="w-full h-full select-none text-md flex items-center justify-center text-cyan-600">Create Post</span></button>
                    </form>

                </div>
            </main>
        </Screen>
    )
}
export default CreatePost
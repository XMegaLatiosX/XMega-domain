import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/screen"
import Sidebar from "../../components/sidebar"
import { supabase } from "../../lib/supabase"
import { Navigate } from "react-router-dom"

import { useEffect, useState } from "react"



function CreatePost() {
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

    if (loading) return <span>Loading...</span>
    if (!user) return <Navigate to="/"/>

    const [slug, set_slug] = useState("")
    const [title, set_title] = useState("")
    const [icon, set_icon] = useState("")
    const [thumbnail, set_thumbnail] = useState("")
    const [summary, set_summary] = useState("")
    const [content, set_content] = useState("")
    

    function handle_slug(slug_input) {
        return slug_input.toLowerCase.replaceAll(" ", "-").replace(/[^\w-]+/g, "")
    }
    "a".json
    async function handle_submit(e) {
        e.preventDefault()

        
        let parsedContent
        try {
            parsedContent = JSON.parse(content)
        }catch (err) {
            alert("JSON inválido no content")
            return
        }

        const { error } = await supabase
        .from("blog_posts")
        .insert([
            {
                slug: slug || handle_slug(slug),
                title,
                icon,
                thumbnail,
                summary,
                content: parsedContent
            }
        ])
        if (error){
            console.error(error)
            return
        }
        console.log("Post criado!")
    }

    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="w-screen h-[calc(100vh-7rem)] overflow-auto pt-2">
                <div className="w-full flex justify-center py-8">
                    <div className="bg-gray-900 py-4 px-[2%] max-w-200 flex-col flex items-center">

                        <form onSubmit={handle_submit}>
                            <input type="text" placeholder="Name" value={slug} onChange={(e) => set_slug(e.target.value)}/>
                            <input type="text" placeholder="Title" value={title} onChange={(e) => set_title(e.target.value)}/>

                            <input type="text" placeholder="icon" value={icon} onChange={(e) => set_icon(e.target.value)}/>

                            <input type="text" placeholder="thumbnail" value={thumbnail} onChange={(e) => set_thumbnail(e.target.value)}/>

                            <input type="text" placeholder="summary" value={summary} onChange={(e) => set_summary(e.target.value)}/>

                            <textarea placeholder="Content" value={content} onChange={(e) => set_content(e.target.value)}/>

                            <button type="submit">Create</button>
                        </form>

                    </div>
                </div>
            </main>
        </Screen>
    )
}
export default CreatePost
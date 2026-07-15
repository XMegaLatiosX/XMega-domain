import { Link, Navigate, useParams } from "react-router-dom"
import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/screen"
import Sidebar from "../../components/sidebar"


import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

function Blog_post() {
    const { url_slug } = useParams()
    const [post, setPost] = useState(null)
    const [loading, setLoading] = useState(true)
    const [user, set_user] = useState(null)
    
    useEffect(() => {
        async function getUser(params) {
            const {data} = await supabase.auth.getUser()
            set_user(data.user)
        }
        getUser()
    }, [])
    
    useEffect(() => {

        async function fetchPost() {
            const { data, error } = await supabase
            .from("blog_posts")
            .select("*")
            .eq("url_slug", url_slug)
            .single()

            if (error) {
                console.error(error)
                setLoading(false)
                return
            }

            setPost(data)
            setLoading(false)
        }
        fetchPost()
    }, [url_slug])
    
    if (loading) return <Screen></Screen>
    if (!post) return <Navigate to="/404" replace />
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="w-screen h-[calc(100vh-7rem)] overflow-auto pt-2">
                <div className="w-full flex justify-center py-8">
                    <div className="bg-gray-900 py-4 px-[2%] max-w-200 flex-col flex items-center">
                        <h1 className="text-white text-md w-3/4 text-center">{post.url_slug}</h1>
                        <div className="flex h-8 items-center justify-center gap-2 mt-4 mb-2">
                            <img className="h-8" src={post.icon || "/media/images/star_icon.png"}></img>
                            <h2 className="font-mono font-bold italic text-sm">#{post.title}</h2>
                            <span className="text-md"> — </span>
                            <span className="text-sm">{post.created_at ? post.created_at.split('T')[0] : ""}</span>
                        </div>
                        {post.thumbnail && (<img src={post.thumbnail}></img>)}

                        {
                            post.content.map((module, index) => {
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
                        <hr className="w-full h-1 mt-4 mb-8 text-gray-600"></hr>
                    </div>

                </div>
                {user?.app_metadata?.is_admin? <Link className="fixed right-8 bottom-4" to={(`/blog/create-post/`+ post.id)} > <button className="p-2 border border-cyan-600 rounded-md"> Edit post </button> </Link>: null}
            </main>
        </Screen>
    )
}
export default Blog_post
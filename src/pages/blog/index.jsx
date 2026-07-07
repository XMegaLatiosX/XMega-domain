import { Link } from "react-router-dom"
import { useEffect, useState } from "react"
import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/screen"
import Sidebar from "../../components/sidebar"


import { supabase } from "../../lib/supabase"



function Post({ icon, thumbnail, title, slug, summary, date, to}) {
    const clean_date = date ? date.split('T')[0] : ""
    return (
        <Link to={to} className="max-w-200 w-full flex flex-col border-y border-gray-700 px-2 pb-12 justify-center">
            <div className="relative w-full h-14 items-center flex pl-2">
                <img className="h-8" src={icon || "/media/images/star_icon.png"}></img>
                <div className="flex flex-row gap-2 px-2 h-full items-center">
                    <h3 className="font-mono font-bold italic text-md">#{slug}</h3>
                    <span className="text-md"> — </span>
                    <h3 className="text-gray-600 font-bold text-md">{title}</h3>
                </div>
                <span className="absolute right-0 bottom-0 text-xs">{clean_date}</span>
            </div>
            {thumbnail && (<img className="shadow-sm shadow-cyan-600 mb-3" src={thumbnail}></img>)}
            <p className="mb-6">{summary}</p>
        </Link>
    )
}


function Blog() {
    const [posts, set_posts] = useState([])

    const [user, set_user] = useState(null)
    useEffect(() => {
        async function fetchPosts() {
            const { data, error } = await supabase
            .from("blog_posts")
            .select("*")
            .order("created_at", { ascending: false})

            if (error) {
                console.error(error)
                return
            }

            set_posts(data)
        }
        fetchPosts()
        
        const { data: listener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                set_user(session?.user ?? null)
            }
        )

        
        return () => {listener.subscription.unsubscribe()}
    }, [])

    useEffect(() => {
        async function getUser() {
            const { data } = await supabase.auth.getUser()
            set_user(data.user)
        }
        getUser()
    }, [])
        

    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="w-screen h-[calc(100vh-7rem)] overflow-auto pt-2">
                <div className="w-full justify-items-center items-center flex-col">
                    {posts.length === 0 && (<p>ops, looks like there is no posts yet D=</p>)}
                    {
                        posts.map(post => {
                            return <Post 
                            key={post.id} 
                            icon={post.icon} 
                            thumbnail={post.thumbnail} 
                            slug={post.slug} 
                            title={post.title} 
                            summary={post.summary} 
                            date={post.created_at} 
                            to={`/blog/${post.url_slug}`}/>
                        })
                    }
                </div>
                {user?.app_metadata?.is_admin? <Link className="fixed right-8 bottom-4" to={(`/blog/create-post`)} > <button className="w-12 h-12"> + </button> </Link>: null}
            </main>
        </Screen>

    )
}

export default Blog
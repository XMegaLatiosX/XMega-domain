import { Navigate, replace, useParams } from "react-router-dom"
import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/Screen"
import Sidebar from "../../components/sidebar"
import posts from "/src/data/blog_posts.json"

function Blog_post() {
    const { post_name } = useParams()
    const current_post = posts.find(post => (post.name == post_name));
    console.log(current_post.thumbnail)
    // if(!current_post) Navigate({to:"/404"})
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="w-screen h-[calc(100vh-7rem)] overflow-auto pt-2">
                <div className="w-full flex justify-center py-8">
                    <div className="bg-gray-900 py-4 px-[2%] max-w-200 flex-col flex items-center">
                        <h1 className="text-white text-md w-3/4 text-center">{current_post.name}</h1>
                        <div className="flex h-8 items-center justify-center gap-2 mt-4 mb-2">
                            <img className="h-8" src={current_post.icon}></img>
                            <h2 className="font-mono font-bold italic text-sm">#{current_post.title}</h2>
                            <span className="text-md"> — </span>
                            <span className="text-sm">{current_post.date.split('T')[0]}</span>
                        </div>
                        {
                        current_post.thumbnail != "" ? <img src={current_post.thumbnail}></img> : null}
                        {
                        current_post.content.map(module => {
                            const components = {
                                "break": <hr className="w-full h-1 mt-4 mb-8 text-gray-600"></hr>,
                                "text": <p className="text-center font-bold" key={module.id}>{module.value}</p>,
                                "img": <img key={module.id} src={module.value}></img>,
                                "video": <video src={module.value}></video>

                            }
                            return components[module.type] || null
                        })
                        }
                        {current_post.call_to_action != "" ? <button className="min-w-2/4 max-w-100 mt-8">{current_post.call_to_action}</button> : null}
                        <hr className="w-full h-1 mt-4 mb-8 text-gray-600"></hr>
                    </div>

                </div>
            </main>
        </Screen>
    )
}
export default Blog_post
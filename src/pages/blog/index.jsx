import { Link } from "react-router-dom"
import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/Screen"
import Sidebar from "../../components/sidebar"
import posts from "/src/data/blog_posts.json"

function Post({ icon, thumbnail, title, name, summary, date, btn_name, to}) {
    const clean_date = date.split('T')[0]
    return (
        <Link to={to} className="max-w-200 flex flex-col border-y border-gray-700 px-2 pb-12 justify-center">
            <div className="relative w-full h-14 items-center flex pl-2">
                <img className="h-8" src={icon}></img>
                <div className="flex flex-row gap-2 px-2 h-full items-center">
                    <h3 className="font-mono font-bold italic text-md">#{title}</h3>
                    <span className="text-md"> — </span>
                    <h3 className="text-gray-600 font-bold text-md">{name}</h3>
                </div>
                <span className="absolute right-0 bottom-0 text-xs">{clean_date}</span>
            </div>
            {thumbnail == "" ? null : <img className="shadow-md shadow-gray-500 mb-3" src={thumbnail}></img>}
            <p className="mb-6">{summary}</p>
            {btn_name == "" ? null : <button className="min-w-2/4 max-w-100 self-center">{btn_name}</button> }
        </Link>
        //2° design
        // <Link to={to} className="max-w-200 flex flex-col border-y border-gray-700 px-2 pb-12 justify-center">
        //     <div className="relative w-full h-12 items-center flex pl-2">
        //         <img className="h-8" src={icon}></img>
        //         <div className="flex flex-row gap-2 px-2 h-full items-center">
        //             <h3 className="font-mono font-bold italic text-md">#{title}</h3>
        //             <span className="text-md"> — </span>
        //             <h3 className="text-gray-600 font-bold text-md">{name}</h3>
        //         </div>
        //         <span className="absolute right-2 top-2 text-sm">{date}</span>
        //     </div>
        //     {thumbnail == "" ? null : <img className="shadow-md shadow-gray-500 mb-3" src={thumbnail}></img>}
        //     <p className="mb-6">{summary}</p>
        //     {btn_name == "" ? null : <button className="min-w-2/4 max-w-100 self-center">{btn_name}</button> }
        // </Link>
    )
}


function Blog() {
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="w-screen h-[calc(100vh-7rem)] overflow-auto pt-2">
                <div className="w-full justify-items-center items-center flex-col">
                    {
                        posts.map(post => {
                            return <Post key={post.id} icon={post.icon} thumbnail={post.thumbnail} title={post.title} name={post.name} summary={post.summary} date={post.date} btn_name={post.call_to_action} to={`/blog/${post.name}`}/>
                        })
                    }
                </div>
            </main>
        </Screen>

    )
}

export default Blog
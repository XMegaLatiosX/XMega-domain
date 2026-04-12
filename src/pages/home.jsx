import Screen from '../components/screen'
import Header from '../components/header' 
import NavUpperBar from '../components/navupperbar'
import Sidebar from '../components/sidebar'
import star_icon from "../assets/images/star_icon.png"

import { supabase } from '../lib/supabase'

export default function Home() {
    return (
        <Screen>
            <Header></Header>
            <NavUpperBar></NavUpperBar>
            <Sidebar></Sidebar>
            <main className="relative w-screen h-[calc(100vh-7rem)] overflow-hidden">
                
                <div className="flex w-full absolute top-[calc(50vh-10rem)] sm:top-[calc(50vh-4rem)] -translate-y-1/2 items-center justify-center">
                    
                    <img src={star_icon} className="pixel-art w-1/2 sm:w-1/3 translate-y-2"/>
                    <h1 className="main-logo">XMega LatiosX</h1>
                    
                </div>
                
                <div id="twitch_embed">
                </div>
            </main>
        </Screen>
    )
}

async function testConnection() {
    const { data, error } = await supabase.from('blog_posts').select('*')
    if (error) {
        console.error("ERRO: ", error)
    } else {
        console.log("sucesso!: ", data)
    }
}
testConnection()
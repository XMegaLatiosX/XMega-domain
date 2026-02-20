import Screen from '../components/screen'
import Header from '../components/header' 
import NavUpperBar from '../components/navupperbar'
import Sidebar from '../components/sidebar'
import star_icon from "../assets/images/star_icon.png"

export default function Home() {
    return (
        <Screen>
            <Header></Header>
            <NavUpperBar></NavUpperBar>
            <Sidebar></Sidebar>
            <main className="relative w-screen h-[calc(100vh-7rem)] overflow-hidden">
                
                <div className="flex w-full absolute top-[calc(50vh-7rem)] -translate-y-1/2 items-center justify-center">
                    
                    <h1 className="absolute text-[3.5rem] font-bold outline-indigo-400 ">XMegaLatiosX</h1>
                    <img src={star_icon} className="pixel-art w-7/12"/>
                    
                </div>
                
                
                <div id="twitch_embed">
                </div>
            </main>
        </Screen>
    )
}
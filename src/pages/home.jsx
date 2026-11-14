import Screen from '../components/screen'
import Header from '../components/header' 
import NavUpperBar from '../components/navupperbar'
import Sidebar from '../components/sidebar'
import star_icon from "../assets/images/star_icon.png"
import star_icon_gif from "../assets/images/starof_circle.gif"

import { supabase } from '../lib/supabase'
import HomeSearch from '../music/HomeSearch'

import BackgroundWall from '../components/background-wall'
import ReactionsLayer, { BackBeams } from '../components/reactions-layer'
import TapAnywhere from '../components/tap-anywhere'

export default function Home() {
    return (
        <Screen>
            <Header></Header>
            <NavUpperBar></NavUpperBar>
            <Sidebar></Sidebar>
            <main className="relative w-screen h-[calc(100vh-7rem)] overflow-hidden">
                {/* the wall is its own layer covering the whole main area (inside the logo container below it was pushed up on small screens) */}
                {/* thin lasers: drawn before the wall, so they shine from behind the images */}
                <BackBeams></BackBeams>
                <BackgroundWall></BackgroundWall>
                {/* reacts to the drums: lines, lasers and changes in the wall (see the file for the list of looks) */}
                <ReactionsLayer></ReactionsLayer>

                {/* on a touch screen, tapping the page to the beat sets the tempo */}
                <TapAnywhere></TapAnywhere>
                <HomeSearch></HomeSearch>
                
                <div className="flex w-full absolute h-full top-[calc(50vh-10rem)] sm:top-[calc(50vh-4.1rem)] -translate-y-1/2 items-center justify-center">
                    <div className="beat-rings" aria-hidden="true"></div>
                    <img src={star_icon_gif} className=" select-none pixel_logo_gif"/>
                    <h1 className="main-logo">XMega LatiosX</h1>
                    
                </div>
                
                <div id="twitch_embed">
                </div>
            </main>
        </Screen>
    )
}
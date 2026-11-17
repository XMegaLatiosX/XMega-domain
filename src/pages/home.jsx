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
import LogoBars from '../components/logo-bars'
import TapAnywhere from '../components/tap-anywhere'
import VizUi from '../components/viz-ui'
import Chat from '../components/chat'
import { useVizUi } from '../music/viz-ui'

export default function Home() {
    const { data, pad } = useVizUi() // the chat steps aside when the data panel or the pad is open on the right
    return (
        <Screen>
            <Header></Header>
            <NavUpperBar floating></NavUpperBar>
            <Sidebar></Sidebar>
            <main className="home-main relative w-screen h-[calc(100vh-6.5rem)] lg:h-[calc(100vh-4rem)] overflow-hidden">
                {/* the world: everything that is drawn behind the tools. The open-space mode (--zoom-items) shrinks the wall images and the logo inside it; nothing is ever scaled as a whole, so the page always fills the screen */}
                <div id="viz-world" className="absolute inset-0">
                    {/* the wall is its own layer covering the whole main area (inside the logo container below it was pushed up on small screens) */}
                    {/* thin lasers: drawn before the wall, so they shine from behind the images */}
                    <BackBeams></BackBeams>
                    <BackgroundWall></BackgroundWall>
                    {/* reacts to the drums: lines, lasers and changes in the wall (see the file for the list of looks) */}
                    <ReactionsLayer></ReactionsLayer>

                    <div className="logo-stage flex w-full absolute h-full top-1/2 sm:top-[calc(50vh-4.1rem)] -translate-y-1/2 items-center justify-center">
                        <LogoBars></LogoBars>
                        <div className="beat-rings" aria-hidden="true"></div>
                        <img src={star_icon_gif} className=" select-none pixel_logo_gif"/>
                        <h1 className="main-logo">XMega LatiosX</h1>
                    </div>
                </div>

                {/* on a touch screen, tapping the page to the beat sets the tempo */}
                <TapAnywhere></TapAnywhere>
                {/* faint gear (top left): data and settings panels, and the manual beat pad */}
                <VizUi></VizUi>
                {/* live wall: last messages from visitors (needs supabase/mural-split.sql run once) */}
                <Chat shifted={data || pad}></Chat>
                <HomeSearch></HomeSearch>

                <div id="twitch_embed">
                </div>
            </main>
        </Screen>
    )
}
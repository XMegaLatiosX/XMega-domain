import Screen from '../components/screen'
import Header from '../components/header' 
import NavUpperBar from '../components/navupperbar'
import Sidebar from '../components/sidebar'
import star_icon from "../assets/images/star_icon.png"
import star_icon_gif from "../assets/images/starof_circle.gif"

import { supabase } from '../lib/supabase'

import img1 from "../assets/images/scroll images/BMTA main screen.webp"
import img2 from "../assets/images/scroll images/bmtacode.webp"
import img3 from "../assets/images/scroll images/concept.png"
import img4 from "../assets/images/scroll images/curriculum.webp"
import img5 from "../assets/images/scroll images/dead mileage.webp"
import img6 from "../assets/images/scroll images/fl studio.webp"
import img7 from "../assets/images/scroll images/gallery.webp"
import img8 from "../assets/images/scroll images/instagram.webp"
import img9 from "../assets/images/scroll images/login screen code.webp"
import img10 from "../assets/images/scroll images/others skills.webp"
import img11 from "../assets/images/scroll images/pixel arts.webp"
import img12 from "../assets/images/scroll images/register screen.webp"
import img13 from "../assets/images/scroll images/screen rec.webp"
import img14 from "../assets/images/scroll images/skill track.webp"
import img15 from "../assets/images/scroll images/tower defense.webp"
import img16 from "../assets/images/scroll images/404.webp"
import img17 from "../assets/images/scroll images/blog.webp"

const scroll_images = [img1, img2, img3, img4, img5, img6, img7, img8, img9, img10, img11, img12, img13, img14, img15, img16, img17]

function Scroll_images() {
        
    return (
        <div className="background-images">
            {Array.from({ length: 30 }).map((_, i) => {
                const image = scroll_images[Math.floor(Math.random() * scroll_images.length)]

                return (
                    <img
                        key={i}
                        src={image}
                        className="floating-image"
                        style={{
                            left: `${Math.random() * 120 - 50}%`,
                            bottom: `${Math.random() * 120 - 128}%`,
                            animationDelay: `${Math.random() * 32}s`,
                            animationDuration: `90s`,
                            transform: `scale(${0.5 + Math.random()}) rotate(${Math.random()*360}deg)`
                        }}
                    />
                )
            })}
        </div>
    )
}
export default function Home() {
    return (
        <Screen>
            <Header></Header>
            <NavUpperBar></NavUpperBar>
            <Sidebar></Sidebar>
            <main className="relative w-screen h-[calc(100vh-7rem)] overflow-hidden">
                
                <div className="flex w-full absolute h-full top-[calc(50vh-10rem)] sm:top-[calc(50vh-4.1rem)] -translate-y-1/2 items-center justify-center">
                    <Scroll_images></Scroll_images>
                    <img src={star_icon_gif} className=" select-none pixel_logo_gif"/>
                    <h1 className="main-logo">XMega LatiosX</h1>
                    
                </div>
                
                <div id="twitch_embed">
                </div>
            </main>
        </Screen>
    )
}
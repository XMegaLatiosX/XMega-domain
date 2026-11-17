import Screen from '../components/screen'
import Header from '../components/header' 
import NavUpperBar from '../components/navupperbar'
import Sidebar from '../components/sidebar'
import { useEffect, useRef } from 'react'
import { on_hit } from '../music/reactor'

function About() {
    // "As ME." hits with the kick: a quick jump in size and a flash that settles back
    const me = useRef(null)
    useEffect(() => {
        return on_hit((kind, strength) => {
            if (kind !== "kick" || !me.current || document.documentElement.classList.contains("rhythm-off")) return
            const grow = 1 + 0.22 * Math.min(1, strength)
            me.current.animate(
                [{ transform: `scale(${grow})`, filter: "brightness(2) drop-shadow(0 0 10px #22d3ee)" }, { transform: "scale(1)", filter: "brightness(1)" }],
                { duration: 260, easing: "cubic-bezier(0.2, 0.9, 0.3, 1)" },
            )
        })
    }, [])
    return (
        <Screen>
            <Header></Header>
            <NavUpperBar></NavUpperBar>
            <Sidebar></Sidebar>
            <main className="w-screen h-[calc(100vh-6.5rem)] overflow-auto p-2">
                <div className="relative flex flex-col justify-center items-center pt-[25vh] text-center">
                    <h1 className="font-extrabold text-cyan-400 text-4xl lg:text-7xl [text-shadow:0_0_1px_currentColor]">
                        This website is a lie.
                    </h1>
                    <p className="text-cyan-700 max-w-200 text-center text-lg font-semibold">
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        But so is the world around us
                        <br/>
                        <br/>
                        The people will never believe in what you can until you do.
                        <br/>
                        <br/>
                        in fact, the majority will try to stop you
                        <br/>
                        <br/>
                        not out of malice, usually its because they cant see how you see,
                        so they advise you to stop or change, not knowing you can go past your limitations.
                        <br/>
                        this way you will never change for them
                        <br/>
                        but by following this pattern, you will never grow in what you want to
                        <br/>
                        <br/>
                        I put too much pressure on myself,
                        <br/>
                        and that's a good sign, it means I know I got potential!
                        <br/>
                        It can easily be crushing sometimes, however, it pushes me forward as long as I do my best
                        <br/>
                        <br/>
                        even then, moving forward hurts, even more when you need any kind of support
                        <br/>
                        <span className='hidden'>
                            <br/>
                            <br/>
                            feels like im alone in everything
                            <br/>
                            <br/>
                        </span>
                        this pain don't come just from criticism
                        <br/>
                        <br/>
                        it also comes from the lack of care
                        <br/>
                        <br/>
                        or <span className='text-amber-900'>lack of interest</span> 
                        <br/>
                        <br/>
                        almost no one will act, try or even think about helping you to make it better for yourself.
                        <br/>
                        <span className='hidden font-bold text-amber-900'>
                            <br/>
                            <br/>
                            for me nobody did
                            <br/>
                            <br/>
                        </span>
                        so you feel neglected, in the wrong for even having your interests, bringing you closer to giving up on your dreams...
                        <br/>
                        <br/>
                        once ive seen this happening i started to hide what i do from everyone, isolating myself 
                        <br/>
                        trying to stop people from interfering on my goals making it harder for me
                        <br/>
                        <br/>
                        but what is the purpose of creating art if nobody will ever see?
                        <br/>
                        what is going to be the point of doing anything at all?...
                        <br/>
                        <span className='hidden font-bold text-amber-900'>
                            <br/>
                            <br/>
                            i dont really know at this point...
                            <br/>
                            <br/>
                        </span>
                        <br/>
                        I can't accept just living.
                        <br/>
                        <br/>
                        I must create something.
                        <br/>
                        <br/>
                        I needed a commitment.
                        <br/>
                        <br/>
                        <br/>
                        I tried to make social media accounts to post my creations, although I can't handle the algorithm.
                        <br/>
                        Then i got an idea: a place where i could bring together everything i do without worrying about numbers on social media
                        <br/>
                        a place where i could not only challenge myself but also have a public commitment and better yet track my skills
                        <br/>
                        <br/>
                        <br/>
                        So this website isn't only an opportunity for me, neither just a portfolio, 
                        <br/>
                        <br/>
                        It's my excuse to create.
                        <br/>
                        <br/>
                        and most importantly
                        <br/>
                        <br/>
                        it's my path to become better in every single thing I do.
                        <br/>
                        <br/>
                        <br/>
                        Surely, I learned and made a lot that may help me making a living out of what i love,
                        <br/>
                        but the whole purpose of that is to see what I can pull out.
                        <br/>
                        To prove myself how far can i go!
                        <br/>
                        <br/>
                        <br/>
                        Not only as a dev...
                        <br/>
                        <br/>
                        <br/>
                        but also as a dancer, 
                        <br/>
                        <br/>
                        <br/>
                        As an artist, 
                        <br/>
                        <br/>
                        <br/>
                        As a player, 
                        <br/>
                        <br/>
                        <br/>
                        As a cook... 
                        <br/>
                        <br/>
                        <br/>
                        As an person... 
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <span ref={me} className='pixel-font font-bold text-cyan-500 text-3xl inline-block'>
                            As ME.
                        </span> 
                            {/* ME
                            MEGA LATIO
                            XMEGALATIOSX
                            MEGA
                            MEGA LATIOS
                            MEGALATIOS
                            LATIO
                            MEGALATIO
                            LATIOS
                            XMEGALATIOSX
                            (alternating) */}
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        {/* Post credits */}
                        thinking like that i decided to make the tools to track my progress public for you to use too!
                        <br/>
                        i hope you find something cool or useful here, something that you like
                        <br/>
                        <br/>
                        (you can always suggest something new to the site in the discord im creating, hopefully this is going to be a good place for you)
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        me and you
                        <br/>
                        <br/>
                        <span className='font-extrabold text-cyan-400 [text-shadow:0_0_1px_currentColor]'>WE CAN CREATE GREAT THINGS!</span>
                        <br/>
                        <br/>
                    
                    </p>
                    <span className=' pixel-font absolute bottom-0 right-4 text-gray-500'>- XMega LatiosX</span>
                </div>
            </main>
        </Screen>
    )
}
export default About
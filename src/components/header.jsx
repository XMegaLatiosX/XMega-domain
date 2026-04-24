import side_bar_icon from "../assets/images/side-bar-icon.png"
import star_icon from "../assets/images/star_icon.png"
import user_icon from "../assets/images/user_icon.png"
import soundwaveplaceholder from "../assets/images/soundwaveplaceholder.png"

import { supabase } from "../lib/supabase"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"




function toggle_side_bar() {
    const sidebar_div = document.getElementById('sidebar_div');
    sidebar_div.classList.toggle('open');
}

function resizeImage(file) {
    return new Promise((resolve) => {
        const img = new Image()
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        img.onload = () => {
            const MAX = 512

            let width = img.width
            let height = img.height

            if (width > height) {
                if (width > MAX) {
                    height *= MAX / width
                    width = MAX
                }
            } else {
                if (height > MAX) {
                    width *= MAX / height
                    height = MAX
                }
            }

            canvas.width = width
            canvas.height = height

            ctx.drawImage(img, 0, 0, width, height)

            canvas.toBlob(resolve, "image/webp", 0.8)
        }

        img.src = URL.createObjectURL(file)
    })
}

function Header() {

    const [user, set_user] = useState(null)
    const [profile, set_profile] = useState(null)
    const [pfp, set_pfp] = useState("")
    const [nickname, set_nickname] = useState("")
    const [email, set_email] = useState("")
    const [password, set_password] = useState("")
    const [in_login_div, set_in_login_div] = useState(true)
    
    // set user if already logged in session
    useEffect(() => {
        async function init() {
            const { data } = await supabase.auth.getUser()
            set_user(data.user)
        }
        init()

        const { data: listener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                set_user(session?.user ?? null)
            }
        )

        
        return () => {listener.subscription.unsubscribe()}
    }, [])

    // get user pfp
    useEffect(() => {
        if (!user) return

        async function fetch_profile() {
            const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single()

            if (error) {
                console.error(error);
                return
            }
            
            set_profile(data)
        }
        fetch_profile()
        
    }, [user])
    
    
    // function to get if im live on twitch or not
    // async function isLive() {
    //     const res = await fetch("/data/twitch.json")
    //     const live_data = await res.json()

    //     if(live_data.live) {
    //         document.getElementById('is_live_display').innerHTML = `${live_data.viewer_count} - 🔴Live`
    //     }
    //     else document.getElementById('is_live_display').innerHTML = ""
    // }
    // isLive();
    // const interval = setInterval(isLive, 25000)
    // return () => clearInterval(interval)


    // login func
    async function login(e) {
        e.preventDefault()

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        if (error) {
            console.log("ERROR LOGGING IN")
            console.error(error)
            return
        }
        console.log('successfull login')
    }    
    

    // account creation function
    async function create_account(e) {
        e.preventDefault()

        const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("nickname", nickname)
        .maybeSingle()
        if (existing) {
            console.log("nickname already in use")
            return
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password
        })
        
        if (error) {
            console.log("account NOT created")
            console.error(error)
            return
        }


        const { error: profile_error } = await supabase
        .from("profiles")
        .insert({
            id: data.user.id,
            nickname
        })

        if (profile_error) {
            console.log('nickname didnt work')
            return
        }

        console.log("account created succesfully!")
        
    }

    //logoff 
    async function logout() {
        const { data, error } = await supabase.auth.signOut()
        if (error) {
            console.error(error)
            return
        }
        set_profile(null)
        console.log("logged out");
        
    }

    //do i really need to explain this?
    async function set_profile_picture(e) {
        const file = e.target.files[0]

        if(!file) return

        if (!file.type.startsWith("image/")) {
            console.log("not a image")
            return
        }
        if (file.size > 2 * 1024 * 1024) {
            console.log("too big bruh")
            return
        }

        const { data: userData } = await supabase.auth.getUser()
        const user = userData.user
        if (!user) {
            console.log("not logged in")
            return
        }
        // HERE, BITCH
        const ext = file.name.split('.').pop()
        const file_path = `${user.id}/pfp.${ext}`



        const { error: upload_error } = await supabase.storage
        .from("profile_pictures")
        .upload(file_path, file, {upsert: true})
        if(upload_error) {
            console.error(upload_error);
            
            console.log("upload error O_o");
            return
        }
        const {data} = supabase.storage
        .from("profile_pictures")
        .getPublicUrl(file_path)

        const public_url = data.publicUrl

        const { error: insert_pfp_error } = await supabase
        .from("profiles")
        .update({profile_picture: public_url})
        .eq("id", user.id)

        if (insert_pfp_error) {
            console.error(insert_pfp_error);
            return
        }
        console.log("pfp updated 👍👍");
        
    }
    

    // open/close the div 
    function toggle_user_div() {
        const acc_div = document.getElementById("account_div")
        const is_closed = window.getComputedStyle(acc_div).height === "144px" ? false : true
        
        acc_div.style.height = is_closed ? "144px" : "0px"
        acc_div.style.width = is_closed ? "256px" : "128px"
        acc_div.style.opacity = is_closed ? "1" : "0"
        acc_div.style.pointerEvents = is_closed ? "auto" : "none"
        
    }
    
    
    return (
        <header className="relative top-0 w-screen h-16 bg-black flex justify-between items-center px-2">
            <div className="h-full flex justify-between space-x-1 items-center gap-2">
                <a className="border-none" onClick={toggle_side_bar}>
                    <img className="pixel-art h-10 w-10" src={side_bar_icon} />
                </a>
                <Link to="/" className="h-full flex items-center justify-center">
                    <img className="absolute h-7/12" src={star_icon} />
                    <h2 className="font-bold text-cyan-300 font-mono font-stretch-condensed z-20 text-shadow-2xs text-shadow-black">XMega</h2>
                </Link>
            </div>

            <img className="pixel-art absolute left-1/2 -translate-x-1/2 h-2/3 max-w-3/8" src={soundwaveplaceholder}/>

            <div className="flex flex-row">
                <div className="h-full w-16 flex items-center">
                    <a id="is_live_display" target="_blank" href="https://www.twitch.tv/xmegalatiosx"></a>
                </div>

                <a onClick={toggle_user_div}>
                    <img className="pixel-art h-10 w-10 rounded-full" src={profile?.profile_picture || user_icon}/>
                </a>
            </div>





            {/* login/create acc div */}
            <div id="account_div" className="h-0 w-0 absolute pb-2 bg-gray-950 border-cyan-600 border-2 right-2 top-18 rounded-lg opacity-0 transition-all duration-300 z-50 overflow-hidden">
                {
                user ?
                    <div className="flex flex-row justify-around items-center h-full px-2">
                        <div className="relative w-24 h-24">
                            <div className="absolute bg-white w-24 h-24 flex justify-center opacity-0 hover:opacity-50 transition-all duration-300">
                                <span className="text-black">Change profile <br/> picture</span>
                            </div>
                            <input type="file" accept="image/*" onChange={set_profile_picture} className="absolute w-full h-full opacity-0"/>
                            <img src={profile?.profile_picture || user_icon} className="w-24 h-24" />
                        </div>
                        <h3 className="font-bold text-2xl text-cyan-50">{profile?.nickname}</h3>
                    </div>
                    :
                    <div className={`w-[200%] flex flex-row transition-all h-full duration-300 ${in_login_div ? "translate-x-0" : "-translate-x-1/2"}`}>

                        <form id="login_form" onSubmit={login} className="relative flex flex-col items-center w-1/2 h-full justify-evenly">
                            <input className="pl-2 w-11/12 border border-cyan-500 rounded-sm" type="email" placeholder="email" value={email} onChange={(e) => set_email(e.target.value)}/>
                            <input className="pl-2 w-11/12 border border-cyan-500 rounded-sm" type="password" placeholder="Password" value={password} onChange={(e) => set_password(e.target.value)}/>

                            <button type="submit" className="border-2 border-cyan-950 h-8 w-32 bg-cyan-950 rounded-md text-xl text-cyan-600 flex items-center justify-center select-none hover:border-[rgb(83,91,243)] ">Login</button>
                        </form>
                        
                        
                        <form id="signup_form" onSubmit={create_account} className="flex flex-col items-center w-1/2 h-full justify-evenly">
                            <input className="pl-2 w-11/12 border border-cyan-500 rounded-sm" type="text" placeholder="nickname" value={nickname} onChange={(e) => set_nickname(e.target.value)}/>
                            
                            <input className="pl-2 w-11/12 border border-cyan-500 rounded-sm" type="email" placeholder="email" value={email} onChange={(e) => set_email(e.target.value)}/>

                            <input className="pl-2 w-11/12 border border-cyan-500 rounded-sm" type="password" placeholder="Password" value={password} onChange={(e) => set_password(e.target.value)}/>

                            <button type="submit" className="border-2 border-cyan-950 h-8 w-32 bg-cyan-950 rounded-md text-xl text-cyan-600 flex items-center justify-center select-none hover:border-[rgb(83,91,243)] ">Sign Up</button>
                        </form>
                        
                    </div>
                }

                {user ?
                    <a onClick={logout} className="text-xs absolute bottom-1 right-2">Logout</a>
                :
                    <a onClick={() => set_in_login_div(!in_login_div)} className={`text-xs absolute bottom-1 transition-all duration-350 ${in_login_div ? "left-[55%]" : "left-[5%]"}`}>{in_login_div ? "Create account ➔" : "⬅ Login"}</a>
                }
            </div>

        </header>
    )
}
export default Header
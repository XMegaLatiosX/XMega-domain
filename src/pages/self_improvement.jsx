import { useEffect, useRef, useState } from "react"
import Header from "../components/header"
import NavUpperBar from "../components/navupperbar"
import Screen from "../components/screen"
import Sidebar from "../components/sidebar"
import { supabase } from "../lib/supabase"
import star_icon from "../assets/images/star_icon.png";

function Skill({}) {
    return (
        <div className="rounded-3xl bg-gray-900 p-4 mb-6 border border-gray-600">

            <h3 className="font-bold text-cyan-400 text-xl"></h3>
            <p className="text-gray-600"></p>

            <div className="px-4 h-4 my-2">
                <span className="font-extralight font-mono text-xs italic text-gray-500 float-left"></span>
                <span className="font-extralight font-mono text-xs italic text-gray-500 float-right"></span>
            </div>

            <hr className="w-full text-gray-600 mb-3"></hr>

            <div className="select-none w-12/12 h-12 rounded-2xl border-2 border-gray-500 items-center flex relative">
                <span className="w-full text-center absolute text-cyan-400"></span>
                <div className="rounded-l-xl bg-green-700 h-full"></div>
            </div>

        </div>)
}
function set_image_display(e) {
    const file = e
    if (file) {
        const temporary_url = URL.createObjectURL(file)
        return temporary_url
    }
}

function Trait({id, on_delete, on_change, name, description, rating}) {
    const [trait_name, set_trait_name] = useState(name || "")
    const [trait_description, set_trait_description] = useState(description || "")
    const [trait_rating, set_trait_rating] = useState(rating || 10)
    
    useEffect(() => {
        on_change(trait_name, trait_description, trait_rating)
    }, [trait_name, trait_description, trait_rating])

    return (
        <div className="relative flex flex-col bg-gray-800 p-3 pb-10">
            <button onClick={() => on_delete(id)} className="whitespace-nowrap absolute flex justify-center items-center right-0 top-0 px-2 min-w-8 h-7 bg-red-800 hover:bg-red-900 rounded-bl-sm text-red-300 hover:text-red-500 font-bold transition-all duration-300">remove trait X</button>
            
            <span>name:</span>
            <input type="text" value={trait_name} onChange={(e) => set_trait_name(e.target.value)} className="input_text" placeholder="ex: Perspective"/>

            <span>description:</span>
            <textarea value={trait_description} onChange={(e) => set_trait_description(e.target.value)} className="input_text min-h-16" placeholder="ex: How well do I convey a sense of depth?"></textarea>
            
            <span className="w-full text-center">self rating:</span>
            <div className="relative h-8 w-200 max-w-full">
                <div className="absolute w-full h-full items-center justify-around flex">
                    <span className="text-white font-bold text-xl">{trait_rating / 10 + "/10"}</span>
                </div>
                
                <input type="range" onChange={(e) => set_trait_rating(e.target.value)} id="skill_self_grade" min="0" max="100" value={trait_rating}
                style={{backgroundImage: `linear-gradient(to right, green ${trait_rating - 1}%, lime ${trait_rating - 1}%, lime ${trait_rating}%, #030712 ${trait_rating * 1.025}%)`}}
                    className="border w-full h-7.5 rounded-2xl  border-cyan-600 cursor-pointer appearance-none
                    [&::-webkit-slider-thumb]:opacity-10 [&::-webkit-slider-thumb]:max-w-full [&::-webkit-slider-thumb]:w-20"
                />
            </div>
            <hr className="text-gray-600 mt-10"/>
        </div>
    )
}

function Form({user, skill_id, thumbnail, name, is_public, description, target, current, rating, skill_traits}) {
    const [inpt_thumbnail, set_inpt_thumbnail] = useState(thumbnail || null)
    const [inpt_public, set_inpt_public] = useState(is_public || false)

    const [inpt_name, set_inpt_name] = useState(name || "")
    const [inpt_description, set_inpt_description] = useState(description || "")
    
    const [skill_rating, set_skill_rating] = useState(rating || 50)
    const [inpt_current, set_inpt_current] = useState(current || null)
    const [inpt_target, set_inpt_target] = useState(target || null)
    


    const [traits, set_traits] = useState(skill_traits ?? [])




    const [skill_thumbnail_display, set_skill_thumbnail_display] = useState(thumbnail || null)
    const [current_level_display, set_current_level_display] = useState(current || null)
    const [target_level_display, set_target_level_display] = useState(target || null)

    
    async function handle_submit(e) {
        e.preventDefault()
        if (skill_id) {
            update_skill(key)
            return
        }
        if (!user) {
            console.error("no account found, create an account on the top right of the header")
            return
        }
        
        const new_skill_id = crypto.randomUUID()
        async function insert_skill() {
            let thumbnail_public_url = null
            let target_public_url = null
            let current_public_url = null
    
            async function get_public_urls() {
                if (inpt_thumbnail) {
                    const thumbnail_file = inpt_thumbnail
                    const thumbnail_ext = thumbnail_file.name.split('.').pop()
                    const thumbnail_file_path = `${user.id}/${new_skill_id}/thumbnail.${thumbnail_ext}`
                    const {error: thumbnail_upload_error} = await supabase.storage
                    .from("skills")
                    .upload(thumbnail_file_path, thumbnail_file, {upsert: true})
                    if (thumbnail_upload_error) {
                        console.error(thumbnail_upload_error);
                        return
                    }
                    const {data: thumbnail_data_url} = await supabase.storage
                    .from("skills")
                    .getPublicUrl(thumbnail_file_path)
                    thumbnail_public_url = thumbnail_data_url.publicUrl
                }
                
                
        
                if (inpt_target) {
                    const target_file = inpt_target
                    const target_ext = target_file.name.split('.').pop()
                    const target_file_path = `${user.id}/${new_skill_id}/target.${target_ext}`
                    const {error: target_upload_error} = await supabase.storage
                    .from("skills")
                    .upload(target_file_path, target_file, {upsert: true})
                    if (target_upload_error) {
                        console.error(target_upload_error);
                        return
                    }
                    const {data: target_data_url} = await supabase.storage
                    .from("skills")
                    .getPublicUrl(target_file_path)
                    target_public_url = target_data_url.publicUrl
                }
                
        
                if (inpt_current) {
                    const current_file = inpt_current
                    const current_ext = current_file.name.split('.').pop()
                    const current_file_path = `${user.id}/${new_skill_id}/current.${current_ext}`
                    const {error: current_upload_error} = await supabase.storage
                    .from("skills")
                    .upload(current_file_path, current_file, {upsert: true})
                    if (current_upload_error) {
                        console.error(current_upload_error);
                        return
                    }
                    const {data: current_data_url} = await supabase.storage
                    .from("skills")
                    .getPublicUrl(current_file_path)
                    current_public_url = current_data_url.publicUrl
                }
            }await get_public_urls()
            
            const {data, error} = await supabase
            .from("skills")
            .insert([{
                id: new_skill_id,
                user_id: user.id,
                icon: thumbnail_public_url,
                name: inpt_name,
                description: inpt_description,
                self_rating: skill_rating,
                avarage_rating: skill_rating,
                target_level: target_public_url,
                current_level: current_public_url,
                is_public: inpt_public
            }])
            if (error) {
                console.error(error)
                return
            }
            console.log("skill created");
            
        }await insert_skill()
        
        async function insert_traits() {
            for (const trait of traits) {
                const {data, error} = await supabase
                .from("traits")
                .insert([{
                    id: trait.id,
                    skill_id: new_skill_id,
                    name: trait.name,
                    description: trait.description,
                    self_rating: trait.rating
                }])
                if (error) {
                    console.error(error);
                    return
                }
                console.log("trait ", trait.name, " added.");
                
                
            }
        }await insert_traits()
        
    }
    async function update_skill() {
    }
    if (traits.length == 0) add_trait_block()



    function add_trait_block() {
        const new_trait = {id: crypto.randomUUID(), name: '', description: '', rating: 10}
        set_traits([...traits, new_trait])
    }
    function remove_trait_block(id) {
        set_traits(traits.filter(trait => trait.id !== id))
        if (traits.length == 0) add_trait_block()
    }
    function update_trait_block(id, name, desc, rating) {
        set_traits(traits.map(trait => trait.id === id ? {...trait, name: name, description: desc, rating: rating} : trait))
    }

    return (
        <div className="flex border border-cyan-600 rounded-md bg-gray-900 mb-16">
            <form className="p-4 flex flex-col w-full">

                <div className="flex w-full gap-4">
                    <div className="input_icon_div">
                        <img className="input_icon_display" src={skill_thumbnail_display}></img>
                        <input type="file" className="input_icon" onChange={(e) => {set_skill_thumbnail_display(set_image_display(e.target.files[0])), set_inpt_thumbnail(e.target.files[0])}}/>
                    </div>

                    <input type="text" value={inpt_name} onChange={(e) => set_inpt_name(e.target.value)} className="input_text min-h-7.5 w-full" placeholder="skill name:"/>

                    <div className="relative flex gap-2 h-full">
                        <span className="text-md font-semibold whitespace-nowrap text-center">turn public?</span>
                        <label className="relative inline-block w-16 h-7.5">
                            <input type="checkbox" value={inpt_public} checked={inpt_public} onChange={(e) => set_inpt_public(e.target.value)} className="peer w-0 h-0 opacity-0"/>
                            <span className="
                                ring-1 ring-cyan-600 bg-red-950
                                absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-2xl
                                peer-checked:bg-lime-600
                                after:content-[''] after:absolute
                                after:bg-red-600 after:rounded-2xl after:h-7.5 after:w-7.5
                                after:transition-all
                                peer-checked:after:translate-x-8.5
                                peer-checked:after:bg-lime-400
                                transition-all
                            "></span>
                        </label>
                    </div>
                </div>

                <textarea value={inpt_description} onChange={(e) => set_inpt_description(e.target.value)} className="input_text min-h-32" placeholder="skill description:"></textarea>
                <div className="relative flex flex-row w-200 max-w-full">

                    <div className="relative w-full h-full justify-between gap-2 px-1 flex">
                        <div className="input_icon_div">
                            <img className="input_icon_display" src={current_level_display}></img>
                            <input type="file" className="input_icon" onChange={(e) => {set_current_level_display(set_image_display(e.target.files[0])), set_inpt_current(e.target.files[0])}}/>
                        </div>


                        <div className="relative h-8 w-200 max-w-full">
                            <div className="absolute w-full h-full items-center justify-around flex">
                                <span className="text-white font-bold text-xl">{skill_rating / 10 + "/10"}</span>
                            </div>
                            {/* avarage ranting
                            self rating */}
                            <input type="range" id="skill_self_grade" min="0" max="100" value={skill_rating} onChange={(e) => set_skill_rating(e.target.value)}
                            style={{backgroundImage: `linear-gradient(to right, green ${skill_rating - 1}%, lime ${skill_rating - 1}%, lime ${skill_rating}%, #030712 ${skill_rating * 1.025}%)`}}
                                className="border w-full h-7.5 rounded-2xl  border-cyan-600 cursor-pointer appearance-none
                                [&::-webkit-slider-thumb]:opacity-0 [&::-webkit-slider-thumb]:max-w-full [&::-webkit-slider-thumb]:w-20"
                            />
                        </div>

                        <div className="input_icon_div">
                            <img className="input_icon_display right-0" src={target_level_display}></img>
                            <input type="file" className="input_icon" onChange={(e) => {set_target_level_display(set_image_display(e.target.files[0])), inpt_target(e.target.files[0])}}/>
                        </div>
                    </div>
                    
                </div>


                <hr className="h-1 w-full text-cyan-600 my-3"/>


                <div>
                    <span>traits:</span>
                    <div>
                        {traits.map((trait) => {
                            console.log(trait.name);
                            
                            return <Trait id={trait.id} key={trait.id} name={trait.name} description={trait.description} rating={trait.self_rating} on_delete={remove_trait_block} on_change={(name, desc, rating) => update_trait_block(trait.id, name, desc, rating)}></Trait>
                        })}

                        <a onClick={add_trait_block} className="whitespace-nowrap flex justify-center items-center select-none rounded-md font-bold h-12 right-8 bottom-4 mt-4 text-xl pb-1.5 bg-gray-950 border border-transparent hover:border-[rgb(83,91,243)] transition-all duration-300">add trait</a>
                    </div>
                </div>

                <div className="relative h-16">
                    <button type="submit" className="absolute whitespace-nowrap flex justify-center items-center select-none rounded-md h-12 right-0 bottom-0 px-2 text-xl border-2 border-transparent bg-green-700 hover:border-[rgb(83,91,243)] transition-all duration-300 text-green-300 font-bold">Save skill</button>
                </div>
            </form>
        </div>
    )
}





function Self_improvement() {
    const [user, set_user] = useState(null)
    const [skills, set_skills] = useState(null)
    useEffect(()=> {
        async function get_user() {
            const {data} = await supabase.auth.getUser()
            set_user(data.user)
        }
        get_user()
        
        const {data: listener} = supabase.auth.onAuthStateChange(
            (event, session) => {set_user(session?.user ?? null)}
        )
        return () => listener.subscription.unsubscribe()
    }, [])

    useEffect(() => {
        async function get_skills() {
            console.log(user);
            
            const {data, error} = await supabase
            .from("skills")
            .select("*, traits(*)")
            .eq("user_id", user?.id)
            .order("created_at", {ascending: true})
    
            if (error) {
                console.error(error);
                return
            }
    
            set_skills(data)
        }
        if(user) get_skills()
    }, [user])

    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="relative w-screen h-[calc(100vh-7rem)] overflow-auto pt-2">
                <div className="w-full flex justify-center py-8">
                    <div className="flex flex-col grow max-w-200">
                        {
                            skills?.length > 0? 
                                skills.map(skill => {
                                    return <Form user={user} key={skill.id} skill_id={skill.id} thumbnail={skill.icon} name={skill.name} is_public={skill.is_public} description={skill.description} target={skill.target_level} current={skill.current_level} rating={skill.self_rating} skill_traits={skill.traits}></Form>
                                })
                            :
                                <span>skill issues</span>
                        }
                        {user? <Form user={user}></Form> : <span>NO ACCOUNT</span>}
                    </div>
                </div>

                
            </main>
        </Screen>

    )
}

export default Self_improvement
import { useParams } from "react-router-dom"
import Screen from "../../components/screen";
import Header from "../../components/header";
import NavUpperBar from "../../components/navupperbar";
import Sidebar from "../../components/sidebar";
import star_icon from "../../assets/images/star_icon.png";
import { supabase } from "../../lib/supabase";
import { useEffect, useState } from "react";


async function get_user_skills(owner) {
    const {data, error} = await supabase
    .from("skills")
    .select("*")
    .eq("user_id", owner.id)
    .eq("is_public", true)

    if (error) {
        console.error(error);
        return
    }
    console.log("got the skills", data);
    return data   
}

function Skill({id, thumbnail, name, description, current, target, rating}) {

    const [traits, set_traits] = useState([])

    useEffect(() => {
        async function get_traits() {
            const {data, error} = await supabase
            .from("traits")
            .select("*")
            .eq("skill_id", id)
    
            if (error) {
                console.error(error);
                return
            }
            set_traits(data)
        }get_traits()
    }, [])

    return (
        <div className="p-8 flex flex-col items-center w-full bg-gray-900 mb-12 border border-cyan-600 rounded-2xl text-cyan-500">
            {thumbnail ? <img src={thumbnail} className="h-16" /> : null}
            <span className="text-4xl font-bold pixel-font">{name}</span>
            <span className="m-4 text-lg">{description}</span>
            <div className="flex flex-row items-center gap-2">

                <img src={current} className={`w-16 h-16 ${current? "": "opacity-0"}`}/>

                <div className="relative h-8 w-175 max-w-full">
                    <div className="absolute w-full h-full items-center justify-around flex">
                        <span className="text-white font-bold text-xl">{rating / 10 + "/10"}</span>
                    </div>
                    <input type="range" defaultValue={rating}
                    style={{backgroundImage: `linear-gradient(to right, green ${rating - 1}%, #00c950 ${rating - 1}%, #00c950 ${rating}%, #030712 ${rating * 1.025}%)`}}
                        className="border w-full h-7.5 rounded-2xl  border-cyan-600  appearance-none
                        [&::-webkit-slider-thumb]:opacity-0 [&::-webkit-slider-thumb]:max-w-full [&::-webkit-slider-thumb]:w-20"
                    />
                </div>

                <img src={target} className={`w-16 h-16 ${target? "": "opacity-0"}`}/>

            </div>


            <hr className="my-8"/>
            {traits.length > 0 ? <span>traits:</span> : null}
            {traits.map(trait => {
                return <Traits key={trait.id} name={trait.name} description={trait.description} rating={trait.self_rating}></Traits>
            })
            }
        </div>
    )
}

function Traits({name, description, rating}) {
    return(
        <div className="bg-gray-800 p-4 flex flex-col items-center w-full pb-6">
            <span className="font-bold text-2xl">{name}</span>
            <span className="m-4 text-md">{description}</span>
            <div className="relative h-8 w-200 max-w-full">
                <div className="absolute w-full h-full items-center justify-around flex">
                    <span className="text-white font-bold text-xl">{rating / 10 + "/10"}</span>
                </div>
                <input type="range" defaultValue={rating}
                style={{backgroundImage: `linear-gradient(to right, green ${rating - 1}%, #00c950 ${rating - 1}%, #00c950 ${rating}%, #030712 ${rating * 1.025}%)`}}
                    className="border w-full h-7.5 rounded-2xl  border-cyan-600  appearance-none
                    [&::-webkit-slider-thumb]:opacity-0 [&::-webkit-slider-thumb]:max-w-full [&::-webkit-slider-thumb]:w-20"
                />
            </div>
            <hr className="mt-6 w-full text-gray-500" />
        </div>
    )
}

function Others_improvement() {
    const {nickname} = useParams()

    var [owner, set_owner] = useState(null)
    var [skills, set_skills] = useState([])

    useEffect(() => {
        async function get_owner() {
            const {data, error} = await supabase
            .from("profiles")
            .select("*")
            .eq("nickname_lower", nickname)
            .single()
    
            if (error) {
                console.error(error);
                return
            }
    
            set_owner(data)
            set_skills(await get_user_skills(data))
            
        }get_owner()

    }, [])



    console.log(skills);
    
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="relative w-screen h-[calc(100vh-7rem)] overflow-auto pt-16">
                <div className="h-full flex flex-col gap-16 items-center">
                    <div className="flex flex-row h-32 items-center w-full justify-center gap-4">
                        <img src={star_icon} className="h-full"/>
                        <span className="pixel-font text-7xl text-cyan-500 text-center">{nickname}</span>
                    </div>

                    <div className="w-full max-w-200 flex flex-col">
                        {
                            skills.map((skill) => {
                                return <Skill key={skill.id} id={skill.id} thumbnail={skill.icon} name={skill.name} description={skill.description} current={skill.current_level} target={skill.target_level} rating={skill.self_rating}></Skill>
                            })
                        }
                    </div>
                </div>
            </main>
        </Screen>
    )
}
export default Others_improvement
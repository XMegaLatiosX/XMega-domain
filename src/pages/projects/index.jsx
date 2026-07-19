import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Screen from "../../components/screen"
import Sidebar from "../../components/sidebar"

function Projects() {
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="relative w-screen h-[calc(100vh-7rem)] overflow-auto pt-2 px-2">
                <div className="w-full flex justify-center py-8">
                    <div className="flex flex-col grow max-w-200">

                    </div>
                </div>

                
            </main>
        </Screen>

    )
}

export default Projects


//     var goals = [
//     {
//         "name": "Finish this site",
//         "description": "Complete every first goal to this site for now",
//         "date": "2026-02-18",
//         "deadline": "2026-03-31",
//         "percentage": "15"
//     },
//     {
//         "name": "Set up the discord server",
//         "description": "Finish making a good quality server",
//         "date": "2026-03-05",
//         "deadline": "2026-03-12",
//         "percentage": "5"
//     }
// ]

//                         {{
//                             goals.map(goal => {
//                                 function get_date(date) {
//                                     return (""+ date.replace('-', '/').replace('-', '/'))
//                                 }
//                                 const set_style = {
//                                     borderTopRightRadius: (goal.percentage > 95 ? '.75' : '0')+'rem',
//                                     borderBottomRightRadius: (goal.percentage > 95 ? '.75' : '0')+'rem',
//                                     width: goal.percentage+'%'
//                                 }
                                
//                                 return <div key={goal.name} className="rounded-3xl bg-gray-900 px-4 pt-3 pb-2 mb-6 border border-gray-600">

//                                     <h3 className="font-bold text-cyan-400 text-xl">{goal.name}</h3>
//                                     <p className="text-gray-600">{goal.description}</p>

//                                     <div className="px-4 h-4 my-2">
//                                         <span className="font-extralight font-mono text-xs italic text-gray-500 float-left">{get_date(goal.date)}</span>
//                                         <span className="font-extralight font-mono text-xs italic text-gray-500 float-right">{get_date(goal.deadline)}</span>
//                                     </div>

//                                     <hr className="w-full text-gray-600 mb-1"></hr>

//                                     <div className="select-none w-12/12 h-12 rounded-2xl border-2 border-gray-500 items-center flex relative">
//                                         <span className="w-full text-center absolute text-cyan-400">{goal.percentage + "%"}</span>
//                                         <div style={set_style} className="rounded-l-xl bg-green-700 h-full"></div>
//                                     </div>

//                                 </div>
//                         })} }
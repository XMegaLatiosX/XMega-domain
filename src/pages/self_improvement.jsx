import Header from "../components/header"
import NavUpperBar from "../components/navupperbar"
import Screen from "../components/screen"
import Sidebar from "../components/sidebar"

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
                <div  className="rounded-l-xl bg-green-700 h-full"></div>
            </div>

        </div>)
}



function Self_improvement() {
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="relative w-screen h-[calc(100vh-7rem)] overflow-auto pt-2">
                <div className="w-full flex justify-center py-8">
                    i wanna end it all
                    <div className="flex flex-col grow max-w-200">
                        <Skill/>
                        {

                        }

                    </div>
                </div>

                
            </main>
        </Screen>

    )
}

export default Self_improvement



// skill
// {
//      id:
//      user_id:
//      icon:
//      name:
//      description:
//      avarage_rating:
//      self_rating:
//      target_example: url
//      current_example: url
//      created_at:
//      last_update:
//      {
//       traits
//      }
// }

// traits:
// {
//     id:
//     skill_id:
//     name:
//     description:
//     rating:
// }
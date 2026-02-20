import Header from "../components/header"
import NavUpperBar from "../components/navupperbar"
import Screen from "../components/Screen"
import Sidebar from "../components/sidebar"
import goals from "/src/data/goals.json"

function Progress() {
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="relative w-screen h-[calc(100vh-7rem)] overflow-auto pt-2">
                <div className="w-full flex justify-center py-8">
                    <div className="flex flex-col grow max-w-200">
                        {
                            goals.map(goal => {
                                function get_date(date) {
                                    return (""+ date.replace('-', '/').replace('-', '/'))
                                }
                                const set_style = {
                                    borderTopRightRadius: (goal.percentage > 95 ? '.75' : '0')+'rem',
                                    borderBottomRightRadius: (goal.percentage > 95 ? '.75' : '0')+'rem',
                                    width: goal.percentage+'%'
                                }
                                
                                return <div key={goal.name} className="rounded-3xl bg-gray-900 p-4 mb-6 border border-gray-600">

                                    <h3 className="font-bold text-cyan-400 text-xl">{goal.name}</h3>
                                    <p className="text-gray-600">{goal.description}</p>

                                    <div className="px-4 h-4 my-2">
                                        <span className="font-extralight font-mono text-xs italic text-gray-500 float-left">{get_date(goal.date)}</span>
                                        <span className="font-extralight font-mono text-xs italic text-gray-500 float-right">{get_date(goal.deadline)}</span>
                                    </div>

                                    <hr className="w-full text-gray-600 mb-3"></hr>

                                    <div className="select-none w-12/12 h-12 rounded-2xl border-2 border-gray-500 items-center flex relative">
                                        <span className="w-full text-center absolute text-cyan-400">{goal.percentage + "%"}</span>
                                        <div style={set_style} className="rounded-l-xl bg-green-700 h-full"></div>
                                    </div>

                                </div>
                        })}

                    </div>
                </div>

                
            </main>
        </Screen>

    )
}

export default Progress
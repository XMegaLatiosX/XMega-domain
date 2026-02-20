import Screen from "../components/screen"
import Header from "../components/header"
import NavUpperBar from "../components/navupperbar"
import Sidebar from "../components/sidebar"
import optimus_balling from "../assets/images/optimus-balling.gif"

function Settings() {
    
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="w-screen h-[calc(100vh-7rem)] overflow-auto pt-2">
                <div className="w-full flex justify-center px-4 pt-6">
                    <div className="max-w-150 min-h-[70vh] py-6 px-4 bg-gray-900 rounded-xl grow shadow-cyan-900 shadow justify-items-center" >
                        <h2 className="font-bold text-cyan-600 text-3xl">Settings</h2>
                        <hr className="w-full text-gray-600 my-3"/>
                        <div className="flex justify-items-center flex-col gap-y-4">
                            <div  className="flex gap-3 justify-center">
                                <input className="w-5" type="checkbox"/>
                                <span className="font-medium ">be happy</span>
                            </div>
                            <div  className="w-full justify-center">
                                <img className="max-h-50" src={optimus_balling}></img>
                            </div>
                        </div>
                    </div>
                </div>

            </main>
        </Screen>

    )
}
export default Settings
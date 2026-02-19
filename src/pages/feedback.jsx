import Screen from "../components/Screen"
import Header from "../components/header"
import NavUpperBar from "../components/navupperbar"
import Sidebar from "../components/sidebar"

function Feedback() {
    
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="w-screen h-[calc(100vh-7rem)] overflow-auto pt-2">
                <div className="w-full flex justify-center px-4 pt-6">
                    <div className="max-w-150 min-h-[70vh] py-6 px-4 bg-gray-900 rounded-xl grow shadow-cyan-900 shadow justify-items-center" >
                    <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSfZDQMxMEjC9BdKI-uSBisRYu-w1N3wKu9aZirxOFS0li5Q3g/viewform?usp=publish-editor" className="rounded-md w-lg h-140"></iframe>
                    </div>
                </div>

            </main>
        </Screen>

    )
}
export default Feedback
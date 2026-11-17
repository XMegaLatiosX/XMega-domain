import Screen from "../components/screen"
import Header from "../components/header"
import NavUpperBar from "../components/navupperbar"
import Sidebar from "../components/sidebar"
import Mural from "../components/mural"

// The guestbook page (/mural). It is not linked from the menus on purpose: the address is given to whoever should leave a message.
function MuralPage() {
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="mural-page w-screen h-[calc(100vh-6.5rem)] overflow-auto pt-2">
                <Mural/>
            </main>
        </Screen>
    )
}
export default MuralPage

import Screen from '../components/Screen'
import Header from '../components/header' 
import NavUpperBar from '../components/navupperbar'
import Sidebar from '../components/sidebar'

export default function Home() {
    return (
        <Screen>
            <Header></Header>
            <NavUpperBar></NavUpperBar>
            <Sidebar></Sidebar>
        </Screen>
    )
}
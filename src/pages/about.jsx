import Screen from '../components/Screen'
import Header from '../components/header' 
import NavUpperBar from '../components/navupperbar'
import Sidebar from '../components/sidebar'

function About() {
    return (
        <Screen>
            <Header></Header>
            <NavUpperBar></NavUpperBar>
            <Sidebar></Sidebar>
            <main class="w-screen h-[calc(100vh-7rem)] overflow-auto p-2">
                <p class="text-cyan-700">
                    This website is a lie. <br />
                    It's an excuse to create and show. <br />
                    Surely I learned a lot and discovered new things in the way, but the whole purpose of that was to experiment what I can pull out, not only as a dev,
                    <br /> <br />
                    but also as a dancer, <br /> <br />
                    
                    as an artist, <br /> <br />
                    
                    as a player, <br /> <br />
                    
                    as a cooker... <br /> <br />
                    
                    As an person... <br /> <br />
                    <br /> <br />
                    As ME. <br />
                    <br /> <br /> <br />
                    This website is'nt only an opportunity, It's my path to become better in every single thing I do that I can show for everyone.
                    I put too much pressure on myself, I believe doind that helps me relief since its a better way to reinforce my progress to my self, better than simple notes
                    videos, animations, whole presentations adn etc  <br /> <br />

                    i hope you find something cool here, something that you like <br /> <br />

                    you can aways sugest something new to the site in the discord im going to create, hopefully this is going to be a good place for you guys 


                    
                
                </p>
            </main>
        </Screen>
    )
}
export default About
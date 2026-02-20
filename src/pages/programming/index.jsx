import Screen from "../../components/screen"
import Header from "../../components/header"
import NavUpperBar from "../../components/navupperbar"
import Sidebar from "../../components/sidebar"

function Programming() {
    
    return (
        <Screen>
            <Header/>
            <NavUpperBar/>
            <Sidebar/>
            <main className="overflow-x-hidden w-screen h-[calc(100vh-7rem)] overflow-auto pt-2">
                <div className="w-full flex justify-center px-4 pt-6">
                    <div className="flex flex-col py-6 px-4 bg-gray-900 rounded-xl grow shadow-cyan-900 shadow justify-items-center items-center" >
                        <h2 className="font-bold text-cyan-600 text-3xl">Thats all for now xd</h2>
                        <br />
                        <h2 className="font-bold text-cyan-600 text-3xl">p1: W A S D - SPACE <br/> p2: ↑ ↓ ← → - ENTER</h2>

                        <div className="overflow-hidden aspect-video w-full max-w-291.5 justify-center flex items-center">
                            <iframe src="https://xmegalatiosx.github.io/1v1-Fighting-game/" className="origin-top  w-300  h-155 sm:w-screen  sm:h-screen not-sm:scale-[.3]"></iframe>
                        </div>
                    {/* coloca o embed de todos os seus projetos em escala menor se possivel, e faz igual na galeria q vc pode clicar an seta e mudar pros lados
                     cada jogo com um titulo e uma descrição tipo "joga com velocidade 10" ou "WASD e setas pra andar/atacar"  h-[609px] */}

                    </div>
                </div>

            </main>
        </Screen>

    )
}
export default Programming
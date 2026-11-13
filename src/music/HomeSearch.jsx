import SearchBox from "./SearchBox"
import { useMusic } from "./useMusic"

// The big search bar above the logo. Once something plays it shrinks to the top edge.
export default function HomeSearch() {
    const { started } = useMusic()

    return (
        <div data-music-ui className={`absolute left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ${started ? "top-2 w-[min(22rem,90vw)] opacity-80 hover:opacity-100" : "top-[6%] w-[min(40rem,92vw)]"}`}>
            {!started && (
                <p className="pixel-font text-center text-cyan-400 text-xl mb-2" style={{ WebkitTextStroke: "4px black", paintOrder: "stroke fill" }}>
                    what are you listening to?
                </p>
            )}
            <SearchBox big={!started} />
        </div>
    )
}

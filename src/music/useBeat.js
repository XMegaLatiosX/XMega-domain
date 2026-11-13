import { useContext } from "react"
import { BeatContext } from "./beat-context"

export function useBeat() {
    const value = useContext(BeatContext)
    if (!value) throw new Error("useBeat must be used inside <BeatProvider>")
    return value
}

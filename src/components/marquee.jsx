import { useEffect, useRef, useState } from "react"

// Text on one line that fits its box. When it is too long it slides left to show the end, waits, and slides back (see .marquee-run in index.css).
// Give the box its width with className (ex: "max-w-[40%]"). Recomputed when the text or the box changes size.
export default function Marquee({ children, className = "", title }) {
    const box = useRef(null)
    const text = useRef(null)
    const [shift, set_shift] = useState(0)
    useEffect(() => {
        const measure = () => {
            if (!box.current || !text.current) return
            set_shift(Math.max(0, Math.ceil(text.current.scrollWidth - box.current.clientWidth)))
        }
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(box.current)
        observer.observe(text.current)
        return () => observer.disconnect()
    }, [children])
    const run = shift > 2 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    return (
        <span ref={box} title={title} className={`block overflow-hidden whitespace-nowrap ${className}`}>
            <span ref={text} className={`inline-block ${run ? "marquee-run" : ""}`} style={run ? { "--shift": `-${shift}px`, "--dur": `${Math.max(4, shift / 25 + 3)}s` } : undefined}>{children}</span>
        </span>
    )
}

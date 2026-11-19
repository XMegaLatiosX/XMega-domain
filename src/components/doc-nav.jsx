import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

// A wiki-style contents list, made by itself from the headings of the content blocks:
// every <h2 id="..."> is a section, and every element with data-toc-part and an id ("<div id='x' data-toc-part>Part name</div>")
// is a group title. A page without those ids has no contents list.

export function extract_toc(blocks) {
    const html = (blocks || []).filter(b => b.type === "text" || b.type === "embed").map(b => b.value || "").join("\n")
    if (!html) return []
    const doc = new DOMParser().parseFromString(html, "text/html")
    return [...doc.querySelectorAll("[data-toc-part][id], h2[id]")].map(el => ({
        id: el.id,
        label: el.textContent.replace(/\s+/g, " ").trim(),
        part: el.hasAttribute("data-toc-part"),
    }))
}

function scroll_parent(el) {
    let p = el.parentElement
    while (p) {
        const o = getComputedStyle(p).overflowY
        if (o === "auto" || o === "scroll") return p
        p = p.parentElement
    }
    return null
}

// the same smooth scroll as the portfolio, unless the visitor asked their system for less motion
export function scroll_to(id) {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
}

// shared by the side list, the list on phones and the arrow: which section is being read, and how to go to one smoothly
export function useDocNav(items) {
    const navigate = useNavigate()
    const [active, set_active] = useState("")
    const [scrolled, set_scrolled] = useState(false)
    const scroller = useRef(null)
    const key = items.map(i => i.id).join("|")

    useEffect(() => {
        if (!items.length) return
        const first = document.getElementById(items[0].id)
        const parent = first ? scroll_parent(first) : null
        scroller.current = parent
        if (!parent) return
        let frame = 0
        const update = () => {
            frame = 0
            const top = parent.getBoundingClientRect().top
            let current = items[0].id
            for (const item of items) {
                const el = document.getElementById(item.id)
                if (!el) continue
                if (el.getBoundingClientRect().top - top <= 120) current = item.id
                else break
            }
            // at the very end the last short sections would never reach the top
            if (parent.scrollTop + parent.clientHeight >= parent.scrollHeight - 4) current = items[items.length - 1].id
            set_active(current)
            set_scrolled(parent.scrollTop > 500)
        }
        const on_scroll = () => { if (!frame) frame = requestAnimationFrame(update) }
        update()
        parent.addEventListener("scroll", on_scroll, { passive: true })
        window.addEventListener("resize", on_scroll)
        return () => {
            parent.removeEventListener("scroll", on_scroll)
            window.removeEventListener("resize", on_scroll)
            if (frame) cancelAnimationFrame(frame)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])

    // going to a section is a change of the address (#id), and the page scrolls to it smoothly by itself (see project.jsx), so the address can be shared
    const go = (id) => {
        // the same section twice in a row does not change the address, so scroll straight to it
        if (window.location.hash === `#${id}`) scroll_to(id)
        else navigate({ hash: `#${id}` }, { replace: true })
    }
    const to_top = () => scroller.current?.scrollTo({ top: 0, behavior: "smooth" })
    return { active, scrolled, go, to_top }
}

function Items({ items, active, go, after_go }) {
    return (
        <ul className="flex flex-col">
            {items.map(item => item.part ? (
                <li key={item.id} className="mt-3 first:mt-0">
                    <a href={`#${item.id}`} data-id={item.id} onClick={(e) => { e.preventDefault(); go(item.id); after_go?.() }}
                        className={`block pixel-font text-[10px] uppercase tracking-wide py-1 no-underline ${active === item.id ? "text-cyan-300" : "text-cyan-600 hover:text-cyan-300"}`}>{item.label}</a>
                </li>
            ) : (
                <li key={item.id}>
                    <a href={`#${item.id}`} data-id={item.id} onClick={(e) => { e.preventDefault(); go(item.id); after_go?.() }}
                        className={`block text-sm leading-snug py-1 pl-2 border-l-2 no-underline transition-colors ${active === item.id ? "border-cyan-300 bg-cyan-950 text-cyan-200" : "border-cyan-900 text-cyan-100/70 hover:text-cyan-200 hover:border-cyan-600"}`}>{item.label}</a>
                </li>
            ))}
        </ul>
    )
}

// desktop: stays beside the page while it scrolls
export function DocSidebar({ items, active, go, to_top }) {
    const nav = useRef(null)
    useEffect(() => {
        // keep the section being read inside the list's own scroll, without moving the page
        const box = nav.current
        const link = box?.querySelector(`[data-id="${CSS.escape(active)}"]`)
        if (!box || !link) return
        const top = link.offsetTop, bottom = top + link.offsetHeight
        if (top < box.scrollTop || bottom > box.scrollTop + box.clientHeight) box.scrollTop = top - box.clientHeight / 2
    }, [active])
    return (
        <nav ref={nav} aria-label="contents" className="hidden lg:block sticky top-4 self-start w-60 shrink-0 max-h-[calc(100vh-16rem)] overflow-auto border-2 border-cyan-900 bg-gray-950 p-3">
            <p className="pixel-font text-xs text-cyan-300 mb-3">contents</p>
            <Items items={items} active={active} go={go} />
            <button type="button" onClick={to_top} className="mt-4 w-full text-xs text-cyan-600 hover:text-cyan-300 text-left cursor-pointer">&uarr; back to top</button>
        </nav>
    )
}

// phones: a list that opens at the top of the page
export function DocContentsMobile({ items, active, go }) {
    const [open, set_open] = useState(false)
    return (
        <div className="lg:hidden mb-5 border-2 border-cyan-900 bg-gray-950">
            <button type="button" onClick={() => set_open(o => !o)} aria-expanded={open}
                className="w-full flex items-center justify-between px-3 py-2 pixel-font text-xs text-cyan-300 cursor-pointer">
                <span>contents</span><span>{open ? "−" : "+"}</span>
            </button>
            {open && <div className="px-3 pb-3 max-h-[60vh] overflow-auto"><Items items={items} active={active} go={go} after_go={() => set_open(false)} /></div>}
        </div>
    )
}

// phones: a round button at the bottom that takes the page back to the top (where the contents are)
export function ScrollTopButton({ visible, to_top }) {
    return (
        <button type="button" onClick={to_top} aria-label="back to the top" tabIndex={visible ? 0 : -1}
            className={`lg:hidden fixed bottom-5 right-4 z-30 w-11 h-11 flex items-center justify-center text-xl border-2 border-cyan-500 bg-gray-950 text-cyan-300 cursor-pointer transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
            &uarr;
        </button>
    )
}

export function useToc(blocks) {
    return useMemo(() => extract_toc(blocks), [blocks])
}

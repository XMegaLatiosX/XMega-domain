// Renders a list of content blocks ({type, value}) the way the blog and projects store them:
// text and embed hold HTML, image / video / audio hold a link.
// look of the HTML inside text and embed blocks (headings, lists, tables...): Tailwind resets them to plain, so they are styled here
const PROSE = "text-cyan-50/90 leading-relaxed [&_a]:text-cyan-300 [&_a]:underline [&_b]:text-cyan-200 [&_p]:mb-3 [&_h2]:pixel-font [&_h2]:text-2xl [&_h2]:text-cyan-300 [&_h2]:border-b [&_h2]:border-cyan-900 [&_h2]:pb-1 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-cyan-200 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_td]:border [&_td]:border-cyan-900 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-cyan-800 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:text-cyan-300 [&_table]:w-full [&_table]:border-collapse [&_table]:mb-3 [&_code]:bg-cyan-950 [&_code]:px-1 [&_blockquote]:border-l-4 [&_blockquote]:border-cyan-700 [&_blockquote]:pl-3 [&_blockquote]:text-cyan-100/70 [&_img]:max-w-full [&_video]:max-w-full [&_figcaption]:text-xs [&_figcaption]:text-cyan-600 [&_figcaption]:mt-1"

export function ContentBlocks({ blocks }) {
    return (
        <div className="w-full flex flex-col gap-5 text-left">
            {(blocks || []).map((block, index) => {
                switch (block.type) {
                    case "text":
                        return <div key={index} className={PROSE} dangerouslySetInnerHTML={{ __html: block.value }} />
                    case "embed":
                        return <div key={index} className={`w-full flow-root ${PROSE} [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:border [&_iframe]:border-cyan-900`} dangerouslySetInnerHTML={{ __html: block.value }} />
                    case "image":
                        return <img key={index} src={block.value} alt="" loading="lazy" className="w-full border border-cyan-900" />
                    case "video":
                        return <video key={index} src={block.value} controls className="w-full border border-cyan-900 bg-black" />
                    case "audio":
                        return <audio key={index} src={block.value} controls className="w-full" />
                    default:
                        return null
                }
            })}
        </div>
    )
}

// the look of each status, shared by the list and the project page
export const STATUS = {
    planning: { name: "Planning", classes: "border-cyan-500 bg-cyan-950 text-cyan-300" },
    active: { name: "In progress", classes: "border-sky-400 bg-sky-950 text-sky-300" },
    paused: { name: "Paused", classes: "border-amber-500 bg-amber-950 text-amber-300" },
    completed: { name: "Completed", classes: "border-green-500 bg-green-950 text-green-300" },
    suspended: { name: "Suspended", classes: "border-red-500 bg-red-950 text-red-300" },
}

export function StatusBadge({ status, className = "" }) {
    const look = STATUS[status] || STATUS.planning
    return <span className={`select-none inline-flex items-center h-6 px-2 border-2 pixel-font text-[11px] ${look.classes} ${className}`}>{look.name}</span>
}

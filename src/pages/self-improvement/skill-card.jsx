// Pieces shared by the skill tracker (your own skills) and the page of someone else's skills.

// 0-100 rating drawn as ten pixel blocks. The colour goes from red (low) to cyan (high).
export function RatingBar({ value, small = false }) {
    const rating = Math.max(0, Math.min(100, Number(value) || 0))
    const filled = rating / 10
    const color = "bg-cyan-400" // always cyan: nobody should read a low number as "bad", many people are just starting
    return (
        <div className="flex items-center gap-2 w-full" role="img" aria-label={`${rating / 10} out of 10`}>
            <div className={`flex gap-[3px] grow ${small ? "h-3" : "h-5"}`}>
                {Array.from({ length: 10 }, (_, index) => {
                    const part = Math.max(0, Math.min(1, filled - index)) // a block can be partly filled (7.5 → half of the 8th)
                    return (
                        <div key={index} className="relative grow bg-gray-950 border border-cyan-900 overflow-hidden">
                            <div className={`absolute inset-y-0 left-0 ${color}`} style={{ width: `${part * 100}%` }} />
                        </div>
                    )
                })}
            </div>
            <span className={`pixel-font text-cyan-300 tabular-nums text-right ${small ? "text-xs w-10" : "text-base w-12"}`}>{rating / 10}/10</span>
        </div>
    )
}

// children: the buttons shown in the top right corner (edit / delete), only for the owner
export default function SkillCard({ skill, children }) {
    const traits = skill.traits || []
    return (
        <article className="border-2 border-cyan-900 bg-gray-950 p-4 sm:p-5">
            <header className="flex items-start gap-3">
                {skill.icon
                    ? <img src={skill.icon} alt="" className="w-14 h-14 object-cover border-2 border-cyan-700 shrink-0" />
                    : <div className="w-14 h-14 border-2 border-cyan-900 bg-cyan-950 flex items-center justify-center pixel-font text-2xl text-cyan-700 shrink-0">{(skill.name || "?").charAt(0).toUpperCase()}</div>}
                <div className="min-w-0 grow">
                    <h3 className="pixel-font text-2xl text-cyan-300 break-words">{skill.name || "untitled skill"}</h3>
                    {skill.is_public === false && <span className="inline-block mt-1 px-1.5 border border-yellow-600 text-yellow-400 text-[11px] pixel-font">private</span>}
                </div>
                {children && <div className="flex gap-2 shrink-0">{children}</div>}
            </header>

            {skill.description && <p className="mt-3 text-cyan-100/80 whitespace-pre-line">{skill.description}</p>}

            <div className="mt-4 flex items-center gap-3">
                {skill.current_level ? <img src={skill.current_level} alt="where I am" title="where I am" className="w-12 h-12 object-cover border border-cyan-800 shrink-0" /> : null}
                <RatingBar value={skill.self_rating} />
                {skill.target_level ? <img src={skill.target_level} alt="where I want to be" title="where I want to be" className="w-12 h-12 object-cover border border-cyan-800 shrink-0" /> : null}
            </div>

            {traits.length > 0 && (
                <div className="mt-5 flex flex-col gap-3 border-t border-cyan-900 pt-4">
                    {traits.map((trait) => (
                        <div key={trait.id}>
                            <div className="flex flex-wrap items-baseline gap-x-3">
                                <span className="font-bold text-cyan-200">{trait.name}</span>
                                {trait.description && <span className="text-sm text-cyan-100/60">{trait.description}</span>}
                            </div>
                            <RatingBar value={trait.self_rating} small />
                        </div>
                    ))}
                </div>
            )}
        </article>
    )
}

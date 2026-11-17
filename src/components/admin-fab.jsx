import { Link } from "react-router-dom"

// The one look for every admin action button (add / edit / delete) on the blog, projects and gallery pages.
// Fixed at the bottom right, above the music button. Several on one page stack upwards: slot 0 is the lowest.
//   <AdminFab to="/blog/create-post" label="new post" />            a link
//   <AdminFab onClick={...} label="add media" slot={0} />            an action
//   <AdminFab onClick={...} icon="✕" label="delete" danger />       a destructive one (red)
// The label shows next to the icon on wide screens; on a phone only the icon shows (the label stays as the tooltip).
export default function AdminFab({ to, onClick, label, icon = "+", slot = 0, danger = false }) {
    const look = danger ? "border-red-500 bg-red-950 text-red-200 hover:bg-red-900" : "border-cyan-500 bg-gray-950 text-cyan-200 hover:bg-cyan-950"
    const classes = `fixed right-4 z-[60] h-12 min-w-12 px-3 flex items-center justify-center gap-2 border-2 pixel-font text-sm select-none cursor-pointer transition-colors shadow-[0_0_12px_rgba(0,0,0,0.6)] ${look}`
    const style = { bottom: `${5 + slot * 3.75}rem` }
    const content = (
        <>
            <span className="text-2xl leading-none">{icon}</span>
            {label && <span className="hidden sm:inline">{label}</span>}
        </>
    )
    if (to) return <Link to={to} className={classes} style={style} aria-label={label} title={label}>{content}</Link>
    return <button type="button" onClick={onClick} className={classes} style={style} aria-label={label} title={label}>{content}</button>
}

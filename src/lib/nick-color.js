// A colour for every nickname. Readable on the dark site: fixed saturation and lightness, only the hue changes.
// color_for(seed) always gives the same colour for the same seed (a user id or a nickname); random_color() is for visitors without an account.
function hsl_to_hex(h, s, l) {
    s /= 100
    l /= 100
    const k = (n) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return "#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("")
}

export function color_for(seed) {
    let hash = 0
    for (const ch of String(seed)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
    return hsl_to_hex(hash % 360, 70, 68)
}

export function random_color() {
    return hsl_to_hex(Math.floor(Math.random() * 360), 70, 68)
}

export const is_color = (value) => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)

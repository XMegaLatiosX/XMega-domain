const loading = {}

// Loads an external script once and resolves when it is ready.
export function loadScript(src) {
    if (loading[src]) return loading[src]
    loading[src] = new Promise((resolve, reject) => {
        const el = document.createElement("script")
        el.src = src
        el.async = true
        el.onload = resolve
        el.onerror = () => {
            delete loading[src]
            reject(new Error("Could not load the player. Check your connection or ad blocker."))
        }
        document.head.appendChild(el)
    })
    return loading[src]
}

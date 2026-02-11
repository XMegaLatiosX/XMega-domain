import fs from "fs"
import path from "path"

const dir = path.resolve("/media/pixelarts")
const outputFile = path.resolve("src/data/pixelarts.json")


const files = fs.readdirSync(dir, {withFileTypes: true})
const pieces = files.map(piece => {
    const fullPath = path.join(dir,piece.name)
    const stats = fs.statSync(fullPath)
    return {
        name: piece.name,
        size: stats.size,
        created: stats.birthtime,
        src: '/media/pixelarts/${piece.name}'
    }
})

fs.writeFileSync(outputFile, JSON.stringify(pieces, null, 2))

console.log('pixelarts.json generated with success')
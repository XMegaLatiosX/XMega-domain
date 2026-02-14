import fs from "fs"
import path from "path"

const mediaRoot = path.resolve("public/media");
const outputFile = path.resolve("src/data/medias.json");


function generateGallery() {
  const categories = fs.readdirSync(mediaRoot, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const gallery = [];

  categories.forEach(category => {
    const categoryPath = path.join(mediaRoot, category);

    const files = fs.readdirSync(categoryPath, { withFileTypes: true })
      .filter(file => file.isFile())
      .filter(file => /\.(png|jpg|jpeg|webp|gif)$/i.test(file.name));

    files.forEach(file => {
      const fullPath = path.join(categoryPath, file.name);
      const stats = fs.statSync(fullPath);

      gallery.push({
        category,
        name: file.name,
        path: `/media/${category}/${file.name}`,
        size: stats.size,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime
      });
    });
  });

  fs.writeFileSync(outputFile, JSON.stringify(gallery, null, 2));

  console.log("gallery.json generated with success.");
}

generateGallery();

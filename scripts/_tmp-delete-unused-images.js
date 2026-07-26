const fs = require("fs");
const path = require("path");

const report = JSON.parse(
  fs.readFileSync(path.join(__dirname, "_tmp-unused-images-report.json"), "utf8")
);
const IMAGE_DIR = path.join(__dirname, "..", "assets", "local-images");

const extraOrphans = [
  "Dragon.jpeg",
  "Hobbit_map.png",
  "Separator3.png",
  "The_end.jpeg",
  "Trolls.jpeg",
  "dreadful_drop.jpeg",
  "map.jpeg",
  "ravine_3.jpeg",
  "ravine_4.jpeg",
  "separator4.png",
  "separator5.png",
  "trolls_stone.jpeg",
  "yellowtunnell.jpeg",
];

const toDelete = [
  ...report.delete.map((d) => d.file),
  ...extraOrphans,
];

let removed = 0;
let bytes = 0;
const missing = [];
for (const name of toDelete) {
  const full = path.join(IMAGE_DIR, name);
  if (!fs.existsSync(full)) {
    missing.push(name);
    continue;
  }
  bytes += fs.statSync(full).size;
  fs.unlinkSync(full);
  removed += 1;
}

console.log(JSON.stringify({
  removed,
  missing,
  freedMB: +(bytes / 1024 / 1024).toFixed(2),
}, null, 2));

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const IMAGE_DIR = path.join(ROOT, "assets", "local-images");
const OUTPUT_JS = path.join(ROOT, "assets", "image-manifest.js");
const IMAGE_EXTENSIONS = new Set(["png", "jpeg", "jpg", "webp", "gif"]);

/** Legacy JPEG filenames mapped to room ids (Mirkwood chapter onward + common mismatches). */
const LEGACY_FILE_TO_ROOM = {
  "Mirkwood.jpeg": "gate_to_mirkwood",
  "forest_road_1.jpeg": "forest_road",
  "forest_road_2.jpeg": "forest_road_2",
  "bewitched.jpeg": "bewitched_gloomy_place",
  "west_bank.jpeg": "west_bank",
  "east_bank.jpeg": "east_bank",
  "green_forest.jpeg": "green_forest",
  "spider_place.jpeg": "place_of_black_spiders",
  "tangled_trees.jpeg": "forest_of_tangled_smothering_trees",
  "deep_bog.jpeg": "deep_bog",
  "elvish_clearing.jpeg": "elvish_clearing",
  "elvenkings.jpeg": "elvenkings_halls",
  "elvenkings.png": "elvenkings_halls",
  "yellowcave.jpeg": "dark_dungeon",
  "Cellar.jpeg": "cellar",
  "long_lake.jpeg": "long_lake",
  "Wooden_town.jpeg": "wooden_town",
  "strong_river.jpeg": "strong_river",
  "bleak_barren.jpeg": "bleak_barren_land",
  "ruins_of_Dale.jpeg": "ruins_of_the_town_of_dale",
  "ravenhill.jpeg": "stoe_of_ravenhill",
  "steep_bay.jpeg": "little_steep_bay",
  "front_gate.jpeg": "front_gate",
  "lower_halls.jpeg": "lower_halls",
  "smooth_straight.jpeg": "smooth_straight_passage",
  "empty_place.jpeg": "empty_place",
  "lonely_mountain.jpeg": "lonely_mountain",
  "Gate_Lonely_Mountain.jpeg": "front_gate",
};

function fileStem(filename = "") {
  const base = path.basename(String(filename));
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot).toLowerCase() : base.toLowerCase();
}

function listImageFiles() {
  if (!fs.existsSync(IMAGE_DIR)) return [];
  return fs.readdirSync(IMAGE_DIR).filter((name) => {
    const ext = name.split(".").pop()?.toLowerCase();
    return IMAGE_EXTENSIONS.has(ext);
  });
}

function pickNewest(filenames, filesByName) {
  let best = null;
  let bestMtime = -1;
  for (const name of filenames) {
    const entry = filesByName.get(name);
    if (!entry) continue;
    if (entry.mtimeMs > bestMtime) {
      bestMtime = entry.mtimeMs;
      best = name;
    }
  }
  return best;
}

function bootManifestSource() {
  const { bootGame } = require("./headless-boot");
  bootGame();
  if (typeof global.__IMAGE_MANIFEST_SOURCE__ !== "function") {
    throw new Error("game.js did not export __IMAGE_MANIFEST_SOURCE__");
  }
  return global.__IMAGE_MANIFEST_SOURCE__();
}

function collectConfiguredImages(source) {
  const configured = new Set();
  for (const image of Object.values(source.roomImages || {})) {
    if (image) configured.add(image);
  }
  for (const rules of Object.values(source.contextualRules || {})) {
    for (const rule of rules || []) {
      if (rule?.image) configured.add(rule.image);
    }
  }
  for (const image of Object.values(source.endgameAliases || {})) {
    if (image) configured.add(image);
  }
  for (const image of Object.values(source.temporaryAliases || {})) {
    if (image) configured.add(image);
  }
  return configured;
}

function roomCandidates(roomId, configuredImage, allFiles) {
  const candidates = new Set();
  if (configuredImage) candidates.add(configuredImage);
  for (const file of allFiles) {
    const stem = fileStem(file);
    if (stem === String(roomId).toLowerCase()) candidates.add(file);
    if (LEGACY_FILE_TO_ROOM[file] === roomId) candidates.add(file);
  }
  return candidates;
}

function buildManifest(source) {
  const allFiles = listImageFiles();
  const filesByName = new Map(allFiles.map((name) => [name, { mtimeMs: fs.statSync(path.join(IMAGE_DIR, name)).mtimeMs }]));

  const rooms = {};
  for (const [roomId, configuredImage] of Object.entries(source.roomImages || {})) {
    const candidates = roomCandidates(roomId, configuredImage, allFiles);
    const newest = pickNewest([...candidates], filesByName);
    if (newest) rooms[roomId] = newest;
  }

  const stems = {};
  for (const configured of collectConfiguredImages(source)) {
    const stem = fileStem(configured);
    const candidates = allFiles.filter((file) => fileStem(file) === stem);
    const newest = pickNewest(candidates, filesByName);
    if (newest) stems[stem] = newest;
  }

  return {
    generatedAt: new Date().toISOString(),
    imageDir: "assets/local-images/",
    rooms,
    stems,
  };
}

function writeManifest(manifest) {
  const body = `window.IMAGE_MANIFEST = ${JSON.stringify(manifest, null, 2)};\n`;
  fs.writeFileSync(OUTPUT_JS, body, "utf8");
}

function main() {
  const source = bootManifestSource();
  const manifest = buildManifest(source);
  writeManifest(manifest);
  const roomUpdates = Object.entries(manifest.rooms).filter(([roomId, file]) => source.roomImages[roomId] && source.roomImages[roomId] !== file);
  console.log(`Wrote ${OUTPUT_JS}`);
  console.log(`Rooms: ${Object.keys(manifest.rooms).length}, stems: ${Object.keys(manifest.stems).length}`);
  if (roomUpdates.length) {
    console.log("Room picks differing from configured filename:");
    for (const [roomId, file] of roomUpdates.slice(0, 20)) {
      console.log(`  ${roomId}: ${source.roomImages[roomId]} -> ${file}`);
    }
    if (roomUpdates.length > 20) console.log(`  ... and ${roomUpdates.length - 20} more`);
  }
}

try {
  main();
} catch (error) {
  console.error(`Image manifest generation failed: ${error.message}`);
  process.exit(1);
}

const fs = require("fs");
const path = require("path");
const { bootGame } = require("./headless-boot");

bootGame();
const source = global.__IMAGE_MANIFEST_SOURCE__();
const ROOT = path.join(__dirname, "..");
const IMAGE_DIR = path.join(ROOT, "assets", "local-images");
const IMAGE_EXTENSIONS = new Set(["png", "jpeg", "jpg", "webp", "gif"]);

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

const DOC_LEGACY_REPLACED = {
  "Dreary.jpeg": "dreary",
  "hidden_path.jpeg": "hidden_path",
  "misty_mountain.jpeg": "misty_mountain",
  "narrow_path_1.jpeg": "narrow_path_1",
  "narrow_path_2.jpeg": "narrow_path_2",
  "narrow_path_3.jpeg": "narrow_path_3",
  "narrow_path_4.jpeg": "narrow_path_4",
  "narrow_path_5.jpeg": "narrow_path_5",
  "steep_path_1.jpeg": "steep_path_6",
  "steep_path_2.jpeg": "steep_path_7",
  "steep_path_3.jpeg": "steep_path_8",
  "deep_misty_1.jpeg": "deep_misty_valley_1",
  "deep_misty_2.jpeg": "deep_misty_valley_2",
  "narrow_path_6.jpeg": "narrow_path_6",
  "narrow_path_7.jpeg": "narrow_path_7",
  "narrow_path_8.jpeg": "narrow_path_8",
  "narrow_path_9.jpeg": "narrow_path_9",
  "narrow_path_10.jpeg": "narrow_path_10",
  "ravine_1.jpeg": "narrow_place",
  "large_dry_cave.jpeg": "large_dry_cave",
  "goblins_dungeon.jpeg": "goblins_dungeon",
  "dark_winding.jpeg": "dark_winding_passage",
  "big_cavern.jpeg": "big_cavern",
  "dark_stuffy_1.jpeg": "dark_stuffy_passage_1",
  "dark_stuffy_2.jpeg": "dark_stuffy_passage_2",
  "dark_stuffy_3.jpeg": "dark_stuffy_passage_3",
  "dark_stuffy_4.jpeg": "dark_stuffy_passage_4",
  "inside_goblins_gate.jpeg": "inside_goblins_gate",
  "dark_stuffy_5.jpeg": "dark_stuffy_passage_5",
  "dark_stuffy_6.jpeg": "dark_stuffy_passage_6",
  "dark_stuffy_7.jpeg": "dark_stuffy_passage_7",
  "dark_stuffy_8.jpeg": "dark_stuffy_passage_8",
  "dark_stuffy_9.jpeg": "dark_stuffy_passage_9",
  "dark_stuffy_10.jpeg": "dark_stuffy_passage_10",
  "dark_stuffy_11.jpeg": "dark_stuffy_passage_11",
  "dark_stuffy_12.jpeg": "dark_stuffy_passage_12",
  "dark_stuffy_13.jpeg": "dark_stuffy_passage_13",
  "dark_deep_lake.jpeg": "deep_dark_lake",
  "dark_stuffy_14.jpeg": "dark_stuffy_passage_14",
  "dark_stuffy_15.jpeg": "dark_stuffy_passage_15",
  "ravine_2.jpeg": "narrow_dangerous_path",
  "goblins_gate.jpeg": "outside_goblins_gate",
  "great_river.jpeg": "great_river",
  "mountains.jpeg": "mountains",
  "forest_river.jpeg": "forest_river",
  "forest.jpeg": "forest",
  "waterfall.jpeg": "waterfall",
  "running_river.jpeg": "running_river",
  "Beorns.jpeg": "beorns_house",
  "Rivendell.jpeg": "rivendell",
  "trolls_cave.jpeg": "trolls_cave",
  "treeless_opening.jpeg": "treeless_opening",
  "treeless_opening_open_ground.jpeg": "treeless_opening",
};

const allFiles = fs.readdirSync(IMAGE_DIR).filter((name) => {
  const ext = name.split(".").pop()?.toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
});

function stem(filename = "") {
  const base = path.basename(String(filename));
  const dot = base.lastIndexOf(".");
  return (dot > 0 ? base.slice(0, dot) : base).toLowerCase();
}

const referenced = new Set();
function addRef(img) {
  if (!img) return;
  referenced.add(path.basename(String(img)));
}

for (const img of Object.values(source.roomImages || {})) addRef(img);
for (const rules of Object.values(source.contextualRules || {})) {
  for (const rule of rules || []) addRef(rule?.image);
}
for (const img of Object.values(source.endgameAliases || {})) addRef(img);
for (const img of Object.values(source.temporaryAliases || {})) addRef(img);

// Runtime references only (exclude docs/reports/transcripts).
const runtimeFiles = [
  path.join(ROOT, "game.js"),
  path.join(ROOT, "index.html"),
  path.join(ROOT, "assets", "game-data.js"),
  path.join(ROOT, "assets", "map-layout-data.js"),
  ...fs.readdirSync(ROOT).filter((n) => n.endsWith(".css")).map((n) => path.join(ROOT, n)),
  ...fs.readdirSync(path.join(ROOT, "assets")).filter((n) => /\.(js|css)$/i.test(n)).map((n) => path.join(ROOT, "assets", n)),
];

for (const file of runtimeFiles) {
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(/["'`]([A-Za-z0-9_ ./-]+\.(?:png|jpeg|jpg|webp|gif))["'`]/gi)) {
    addRef(match[1]);
  }
}

const code = fs.readFileSync(path.join(ROOT, "assets", "image-manifest.js"), "utf8");
const manifest = Function("window", `${code}; return window.IMAGE_MANIFEST;`)({});
const picked = new Set([
  ...Object.values(manifest.rooms || {}),
  ...Object.values(manifest.stems || {}),
]);
for (const file of picked) addRef(file);

const referencedLower = new Set([...referenced].map((s) => s.toLowerCase()));
const deleteCandidates = [];
const keepUncertain = [];

for (const file of allFiles) {
  if (picked.has(file) || referencedLower.has(file.toLowerCase())) continue;

  const s = stem(file);
  const roomFromLegacy = LEGACY_FILE_TO_ROOM[file] || DOC_LEGACY_REPLACED[file];
  if (roomFromLegacy && manifest.rooms[roomFromLegacy] && manifest.rooms[roomFromLegacy] !== file) {
    deleteCandidates.push({ file, reason: `replaced by ${manifest.rooms[roomFromLegacy]}` });
    continue;
  }

  // Contextual stem variants superseded by PNG picks in stems map
  if ([...picked].some((p) => stem(p) === s)) {
    deleteCandidates.push({ file, reason: "superseded same stem" });
    continue;
  }

  if (/^_tmp_/i.test(file) || /_old\./i.test(file) || /old\.(png|jpeg|jpg)$/i.test(file)) {
    deleteCandidates.push({ file, reason: "temp/old artifact" });
    continue;
  }

  if (/^unexpected_party_/i.test(file) || /^Gandalf_glimpse_bag_end_start\.png$/i.test(file)) {
    deleteCandidates.push({ file, reason: "old bag-end art" });
    continue;
  }

  // Duplicate numbered variants with no runtime refs
  if (/^(Beorns1|hobbit_hole1)\./i.test(file)) {
    deleteCandidates.push({ file, reason: "unused duplicate variant" });
    continue;
  }

  keepUncertain.push(file);
}

function bytes(files) {
  return files.reduce((sum, name) => sum + fs.statSync(path.join(IMAGE_DIR, name)).size, 0);
}

const toDelete = deleteCandidates.map((c) => c.file).sort();
const report = {
  deleteCount: toDelete.length,
  deleteMB: +(bytes(toDelete) / 1024 / 1024).toFixed(2),
  delete: deleteCandidates.sort((a, b) => a.file.localeCompare(b.file)),
  uncertain: keepUncertain.sort(),
  uncertainMB: +(bytes(keepUncertain) / 1024 / 1024).toFixed(2),
};

fs.writeFileSync(path.join(__dirname, "_tmp-unused-images-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  deleteCount: report.deleteCount,
  deleteMB: report.deleteMB,
  uncertainCount: report.uncertain.length,
  uncertainMB: report.uncertainMB,
  uncertain: report.uncertain,
}, null, 2));
console.log("---DELETE---");
for (const c of report.delete) console.log(`${c.file}  (${c.reason})`);

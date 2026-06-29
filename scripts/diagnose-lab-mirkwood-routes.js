/**
 * One-off diagnostic. Run: node scripts/diagnose-lab-mirkwood-routes.js
 */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

process.chdir(path.join(__dirname, "..", "scripts"));

const outputLines = [];

function makeElement(id = "") {
  const listeners = new Map();
  return {
    id, value: "", textContent: "", innerHTML: "", className: "", children: [], dataset: {},
    disabled: false, hidden: false, scrollLeft: 0, scrollTop: 0,
    style: { setProperty() {}, removeProperty() {}, getPropertyValue() { return ""; } },
    attributes: {}, classList: { add() {}, remove() {}, contains() { return false; } },
    append(child) {
      this.children.push(child);
      if (this.id === "output" && child.textContent) outputLines.push(child.textContent);
    },
    replaceChildren() { this.children = []; if (this.id === "output") outputLines.length = 0; },
    addEventListener(type, listener) { const l = listeners.get(type) || []; l.push(listener); listeners.set(type, l); },
    removeEventListener(type, listener) { const l = listeners.get(type) || []; listeners.set(type, l.filter((e) => e !== listener)); },
    dispatchEvent(event = {}) { for (const listener of listeners.get(event.type) || []) listener(event); return true; },
    click() { this.dispatchEvent({ type: "click", currentTarget: this, target: this }); },
    removeAttribute(name) { delete this.attributes[name]; },
    getAttribute(name) { return this.attributes[name] || ""; },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() {}, closest() { return makeElement("scene"); }, contains() { return false; },
    querySelector() { return null; },
    getBoundingClientRect() { return { width: 800, height: 500 }; },
    get clientWidth() { return 800; }, get clientHeight() { return 500; },
    play() { return Promise.resolve(); }, pause() {}, load() {}, remove() {},
    get offsetHeight() { return 1; },
    set src(value) { this.attributes.src = value; }, get src() { return this.attributes.src || ""; },
  };
}

function bootGame() {
  const elements = new Map();
  for (const id of [
    "output", "command-input", "command-form", "autoplay-stop", "game-shell", "room-image",
    "image-reveal", "image-reveal-outline", "image-reveal-fill", "scene-map-overlay",
    "scene-map-back", "scene-map-title", "scene-map-subtitle", "scene-map-zoom-out",
    "scene-map-zoom-reset", "scene-map-zoom-in", "scene-map-scroll", "scene-map-canvas",
    "scene-map-image", "scene-compass", "scene-compass-rose", "scene-compass-vertical",
    "scene-compass-north", "scene-compass-north-east", "scene-compass-east",
    "scene-compass-south-east", "scene-compass-south", "scene-compass-south-west",
    "scene-compass-west", "scene-compass-north-west", "scene-compass-up", "scene-compass-down",
    "music-player", "inventory-list", "inventory-status", "exits-list", "people-list",
    "layout-switch", "layout-divider", "layout-mode-1", "layout-mode-2", "save-panel",
    "save-panel-backdrop", "save-panel-close", "save-panel-title", "save-panel-latest-autosave",
    "save-panel-autosave-list", "mobile-scene-handle",
  ]) elements.set(id, makeElement(id));

  global.window = global;
  global.location = { protocol: "file:" };
  global.window.location = global.location;
  const documentListeners = new Map();
  global.document = {
    getElementById: (id) => elements.get(id) || makeElement(id),
    createElement: () => makeElement(),
    addEventListener(type, listener) {
      const list = documentListeners.get(type) || []; list.push(listener); documentListeners.set(type, list);
    },
    removeEventListener(type, listener) {
      const list = documentListeners.get(type) || [];
      documentListeners.set(type, list.filter((entry) => entry !== listener));
    },
    body: makeElement("body"), documentElement: makeElement("html"), fonts: { ready: Promise.resolve() },
  };
  global.localStorage = {
    _m: new Map(),
    getItem(k) { return this._m.get(k) ?? null; },
    setItem(k, v) { this._m.set(k, String(v)); },
    removeItem(k) { this._m.delete(k); },
    key(i) { return [...this._m.keys()][i] || null; },
    get length() { return this._m.size; },
  };
  global.SpeechSynthesisUtterance = function SpeechSynthesisUtterance() {};
  global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; }, addEventListener() {} };
  global.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 0);
  global.cancelAnimationFrame = clearTimeout;
  const root = path.join(__dirname, "..");
  vm.runInThisContext(fs.readFileSync(path.join(root, "assets/game-data.js"), "utf8"));
  vm.runInThisContext(fs.readFileSync(path.join(root, "assets/map-layout-data.js"), "utf8"));
  vm.runInThisContext(fs.readFileSync(path.join(root, "game.js"), "utf8"));
  return global.hobbitGame;
}

function makeSeededRandom(seed) {
  let value = (Number(seed) >>> 0) || 1;
  return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 0x100000000; };
}

const FOREST_SCRIPT = [
  "open curtain", "open cupboard", "examine cupboard", "take meal", "eat meal",
  "north", "east", "south", "south east",
  "east", "east", "north", "east", "north", "east",
  "help dwarves", "north",
];

function normalize(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function visitedRoomIdList(g) {
  const visited = g.visitedRooms;
  if (visited instanceof Set) return [...visited];
  return [];
}

function mirkwoodUsedRiverCrossing(g) {
  return visitedRoomIdList(g).some((r) => ["west_bank", "east_bank", "bewitched_gloomy_place"].includes(r));
}

function mirkwoodCommittedForestRoadPath(g) {
  return visitedRoomIdList(g).some((r) => ["forest_road", "mirkwood_forest_path"].includes(r));
}

function mirkwoodForestWalkActive(g) {
  return mirkwoodCommittedForestRoadPath(g)
    && !g.flags?.mirkwoodjourneycomplete
    && !["elvish_clearing", "elvenkings_halls", "cellar", "wooden_town", "long_lake"].includes(g.currentRoom || "");
}

function mirkwoodMainTrailAdvanceCommand(g) {
  const steps = {
    forest_road: "south east",
    mirkwood_forest_path: "east",
    mirkwood_dark_glade: "east",
    mirkwood_enchanted_stream: "north",
    mirkwood_fallen_tree_crossing: "east",
    mirkwood_spider_grove: "north",
    mirkwood_ruined_clearing: "east",
  };
  if (g.currentRoom === "place_of_black_spiders" && g.flags?.mirkwooddwarvesfreed) return "north";
  return steps[g.currentRoom] || "";
}

function forestRoadAllowsAutoplay(g, command) {
  const normalized = normalize(command);
  if (!normalized) return false;
  if (g.currentRoom === "beorns_house") {
    if ((g.player?.strength || 0) < 6) return true;
    if (/^(open|take|eat|examine)/.test(normalized)) return true;
    if (normalized === "east" && !mirkwoodCommittedForestRoadPath(g)) return true;
    if (normalized === "north") return true;
    return false;
  }
  if (["beorn_great_hall", "beorn_stable", "beorn_garden", "beorn_animal_yard"].includes(g.currentRoom || "")) return true;
  if (g.currentRoom === "great_river" && normalized === "east") return true;
  if (mirkwoodForestWalkActive(g)) {
    if (["follow lights", "drink stream"].includes(normalized)) return false;
    if (/rope|boat|across river/.test(normalized)) return false;
    if (g.currentRoom === "gate_to_mirkwood" && normalized === "east") return false;
    if (["west_bank", "east_bank", "green_forest", "bewitched_gloomy_place"].includes(g.currentRoom || "")) return false;
  }
  if (g.currentRoom === "gate_to_mirkwood" && normalized === "east" && !mirkwoodCommittedForestRoadPath(g)) return false;
  if (["mirkwood_spider_grove", "place_of_black_spiders"].includes(g.currentRoom || "")) return true;
  if (/^elven|^cellar|^wooden_town|^long_lake|^laketown/.test(g.currentRoom || "")) return true;
  if (g.flags?.mirkwoodjourneycomplete) return true;
  if (["elvish_clearing", "elvenkings_halls", "cellar", "wooden_town", "long_lake"].includes(g.currentRoom || "")) return true;
  return false;
}

function mirkwoodForestRoadRouteCandidates(g) {
  if (mirkwoodUsedRiverCrossing(g) || g.currentRoom === "west_bank") return [];
  const candidates = [];
  if (g.currentRoom === "gate_to_mirkwood" && !mirkwoodCommittedForestRoadPath(g)) {
    candidates.push("south");
  }
  if (["beorns_house", "great_river"].includes(g.currentRoom || "")) {
    const towardGate = g.autoplayRouteCommandTo?.("gate_to_mirkwood");
    if (towardGate) candidates.push(towardGate);
  }
  if (["mirkwood_spider_grove", "place_of_black_spiders"].includes(g.currentRoom || "") && !g.flags?.mirkwooddwarvesfreed) {
    candidates.push("help dwarves");
  }
  const trailCommand = mirkwoodMainTrailAdvanceCommand(g);
  if (trailCommand && (mirkwoodCommittedForestRoadPath(g) || g.currentRoom === "forest_road")) {
    candidates.push(trailCommand);
  }
  return candidates;
}

function selectForestRoadCommand(g) {
  const forestCandidates = mirkwoodForestRoadRouteCandidates(g);
  if (forestCandidates.length) return forestCandidates[0];
  const autopilot = g.nextAutoplayCommand();
  if (autopilot && forestRoadAllowsAutoplay(g, autopilot)) return autopilot;
  if (g.flags?.mirkwoodjourneycomplete || ["elvish_clearing", "elvenkings_halls", "cellar"].includes(g.currentRoom || "")) {
    if (autopilot) return autopilot;
  }
  return null;
}

function runForestRoadStrategy(game, seed, limit = 220) {
  const o = Math.random; Math.random = makeSeededRandom(seed);
  const cmds = [];
  try {
    game.restartGame(); game.storySeed = seed; game.execute("jump beorn");
    for (let i = 0; i < limit; i += 1) {
      const c = selectForestRoadCommand(game);
      if (!c) break;
      cmds.push(c); game.execute(c);
      if (game.endgame || game.currentRoom === "wooden_town") break;
    }
    return {
      seed, room: game.currentRoom, endgame: game.endgame, steps: cmds.length,
      west: game.visitedRooms.has("west_bank"), forest: game.visitedRooms.has("mirkwood_forest_path"),
      tail: cmds.slice(-8), stallRoom: game.currentRoom,
    };
  } finally { Math.random = o; }
}

function classify(game, events = []) {
  const rooms = [...game.visitedRooms];
  const viaRiverBoat = events.includes("river") || (rooms.includes("west_bank") && rooms.includes("east_bank"));
  const viaForest = events.includes("forest") || rooms.includes("mirkwood_forest_path");
  const forestExit = viaForest && rooms.includes("place_of_black_spiders") && !rooms.includes("east_bank");
  if (forestExit) return "forest_road";
  if (viaRiverBoat || rooms.includes("west_bank")) return "river_crossing";
  return "other";
}

function runIdealForest(game, seed) {
  const o = Math.random; Math.random = makeSeededRandom(seed);
  try {
    game.restartGame(); game.storySeed = seed; game.execute("jump beorn");
    for (const c of FOREST_SCRIPT) { game.execute(c); if (game.endgame) break; }
    return {
      seed, room: game.currentRoom, endgame: game.endgame,
      corridor: classify(game, ["forest"]),
      rooms: [...game.visitedRooms].filter((r) => /mirkwood|forest|west|east_bank|green|elvish/.test(r)),
    };
  } finally { Math.random = o; }
}

function runOptimal(game, seed, limit = 220) {
  const o = Math.random; Math.random = makeSeededRandom(seed);
  const cmds = [];
  try {
    game.restartGame(); game.storySeed = seed; game.execute("jump beorn");
    for (let i = 0; i < limit; i += 1) {
      const c = game.nextAutoplayCommand(); if (!c) break;
      cmds.push(c); game.execute(c);
      if (game.endgame || game.currentRoom === "wooden_town") break;
    }
    return {
      seed, room: game.currentRoom, endgame: game.endgame, steps: cmds.length,
      corridor: classify(game, cmds.some((c) => /boat|rope|across river/.test(c)) ? ["river"] : []),
      west: game.visitedRooms.has("west_bank"), forest: game.visitedRooms.has("mirkwood_forest_path"),
      tail: cmds.slice(-6),
    };
  } finally { Math.random = o; }
}

const game = bootGame();
console.log("=== Scripted forest-road path (engine only) ===");
for (const seed of [1, 2, 4]) console.log(runIdealForest(game, seed));

console.log("\n=== Game optimal autoplay from jump beorn (seeds 1-12) ===");
const optimal = [];
for (let seed = 1; seed <= 12; seed += 1) optimal.push(runOptimal(game, seed));
const ok = optimal.filter((r) => r.room === "wooden_town" && !r.endgame);
console.log(`Reached wooden_town: ${ok.length}/12`);
console.log(`With west_bank: ${optimal.filter((r) => r.west).length}/12`);
console.log(`With mirkwood_forest_path: ${optimal.filter((r) => r.forest).length}/12`);
for (const r of optimal) {
  console.log(`seed ${r.seed}: room=${r.room} steps=${r.steps} corridor=${r.corridor} west=${r.west} forest=${r.forest}`);
}

console.log("\n=== Forest road -> Elven halls -> barrels -> Lake-town (game engine) ===");
function runForestToLaketown(game, seed) {
  const o = Math.random; Math.random = makeSeededRandom(seed);
  const cmds = [];
  const log = (c) => { cmds.push(c); game.execute(c); };
  const FOREST_TO_CLEARING = [
    "open curtain", "open cupboard", "examine cupboard", "take meal", "eat meal",
    "north", "east", "south", "south east",
    "east", "east", "north", "east", "north", "east",
    "help dwarves", "break web with sword", "north",
  ];
  try {
    game.restartGame(); game.storySeed = seed; game.execute("jump beorn");
    for (const c of FOREST_TO_CLEARING) {
      if (game.endgame) break;
      log(c);
    }
    const afterForest = {
      room: game.currentRoom,
      forestPath: game.visitedRooms.has("mirkwood_forest_path"),
      westBank: game.visitedRooms.has("west_bank"),
      dwarvesFreed: Boolean(game.flags?.mirkwooddwarvesfreed),
    };
    if (game.currentRoom === "elvish_clearing" && !game.endgame) {
      log("north east");
    }
    const afterHalls = { room: game.currentRoom, inHalls: game.currentRoom === "elvenkings_halls" };
    let autoplaySteps = 0;
    while (!game.endgame && game.currentRoom !== "wooden_town" && autoplaySteps < 100) {
      const c = game.nextAutoplayCommand();
      if (!c) break;
      log(c);
      autoplaySteps += 1;
    }
    return {
      seed,
      afterForest,
      afterHalls,
      finalRoom: game.currentRoom,
      endgame: game.endgame,
      westBank: game.visitedRooms.has("west_bank"),
      forestPath: game.visitedRooms.has("mirkwood_forest_path"),
      elvenHalls: game.visitedRooms.has("elvenkings_halls"),
      cellar: game.visitedRooms.has("cellar"),
      longLake: game.visitedRooms.has("long_lake"),
      barrelThrown: Boolean(game.flags?.barrelthrown),
      tail: cmds.slice(-10),
      totalSteps: cmds.length,
    };
  } finally { Math.random = o; }
}

for (const seed of [1, 2, 4]) {
  console.log(runForestToLaketown(game, seed));
}

const forestRoad = [];
for (let seed = 1; seed <= 12; seed += 1) forestRoad.push(runForestRoadStrategy(game, seed));
const forestOk = forestRoad.filter((r) => r.room === "wooden_town" && !r.endgame);
console.log(`Reached wooden_town: ${forestOk.length}/12`);
console.log(`With west_bank: ${forestRoad.filter((r) => r.west).length}/12`);
console.log(`With mirkwood_forest_path: ${forestRoad.filter((r) => r.forest).length}/12`);
for (const r of forestRoad) {
  console.log(`seed ${r.seed}: room=${r.room} steps=${r.steps} west=${r.west} forest=${r.forest} tail=${r.tail.join(" | ")}`);
}

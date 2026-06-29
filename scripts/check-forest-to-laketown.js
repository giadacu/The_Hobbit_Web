const fs = require("fs");
const vm = require("vm");
const path = require("path");

function makeElement(id = "") {
  return {
    id, value: "", textContent: "", children: [], dataset: {}, disabled: false, hidden: false,
    style: { setProperty() {}, removeProperty() {}, getPropertyValue() { return ""; } },
    attributes: {}, classList: { add() {}, remove() {}, contains() { return false; } },
    append() {}, replaceChildren() {}, addEventListener() {}, removeEventListener() {},
    dispatchEvent() { return true; }, removeAttribute(n) { delete this.attributes[n]; },
    getAttribute(n) { return this.attributes[n] || ""; }, setAttribute(n, v) { this.attributes[n] = v; },
    focus() {}, closest() { return makeElement(); }, contains() { return false; }, querySelector() { return null; },
    getBoundingClientRect() { return { width: 800, height: 500 }; },
    get clientWidth() { return 800; }, get clientHeight() { return 500; },
    play() { return Promise.resolve(); }, pause() {}, load() {}, remove() {}, get offsetHeight() { return 1; },
    set src(v) { this.attributes.src = v; }, get src() { return this.attributes.src || ""; },
  };
}

function bootGame() {
  const root = path.join(__dirname, "..");
  const elements = new Map();
  for (const id of ["output", "command-input", "command-form", "autoplay-stop", "game-shell", "room-image",
    "image-reveal", "image-reveal-outline", "image-reveal-fill", "scene-map-overlay", "scene-map-back",
    "scene-map-title", "scene-map-subtitle", "scene-map-zoom-out", "scene-map-zoom-reset", "scene-map-zoom-in",
    "scene-map-scroll", "scene-map-canvas", "scene-map-image", "scene-compass", "scene-compass-rose",
    "scene-compass-vertical", "scene-compass-north", "scene-compass-north-east", "scene-compass-east",
    "scene-compass-south-east", "scene-compass-south", "scene-compass-south-west", "scene-compass-west",
    "scene-compass-north-west", "scene-compass-up", "scene-compass-down", "music-player", "inventory-list",
    "inventory-status", "exits-list", "people-list", "layout-switch", "layout-divider", "layout-mode-1",
    "layout-mode-2", "save-panel", "save-panel-backdrop", "save-panel-close", "save-panel-title",
    "save-panel-latest-autosave", "save-panel-autosave-list", "mobile-scene-handle"]) {
    elements.set(id, makeElement(id));
  }
  global.window = global;
  global.location = { protocol: "file:" };
  global.window.location = global.location;
  global.document = {
    getElementById: (id) => elements.get(id) || makeElement(id),
    createElement: () => makeElement(),
    addEventListener() {}, removeEventListener() {},
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
  vm.runInThisContext(fs.readFileSync(path.join(root, "assets/game-data.js"), "utf8"));
  vm.runInThisContext(fs.readFileSync(path.join(root, "assets/map-layout-data.js"), "utf8"));
  vm.runInThisContext(fs.readFileSync(path.join(root, "game.js"), "utf8"));
  return global.hobbitGame;
}

function makeSeededRandom(seed) {
  let value = (Number(seed) >>> 0) || 1;
  return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 0x100000000; };
}

const FOREST_TO_CLEARING = [
  "open curtain", "open cupboard", "examine cupboard", "take meal", "eat meal",
  "north", "east", "south", "south east",
  "east", "east", "north", "east", "north", "east",
  "help dwarves", "break web with sword", "north",
];

function runForestToLaketown(game, seed) {
  const o = Math.random; Math.random = makeSeededRandom(seed);
  const cmds = [];
  try {
    game.restartGame(); game.storySeed = seed; game.execute("jump beorn");
    for (const c of FOREST_TO_CLEARING) {
      if (game.endgame) break;
      cmds.push(c); game.execute(c);
    }
    const checkpoint = {
      room: game.currentRoom,
      forestPath: game.visitedRooms.has("mirkwood_forest_path"),
      westBank: game.visitedRooms.has("west_bank"),
      greenForest: game.visitedRooms.has("green_forest"),
      dwarvesFreed: Boolean(game.flags?.mirkwooddwarvesfreed),
    };
    if (game.currentRoom === "elvish_clearing" && !game.endgame) {
      cmds.push("north east"); game.execute("north east");
    }
    const hallsCheckpoint = {
      room: game.currentRoom,
      elvenHalls: game.visitedRooms.has("elvenkings_halls"),
    };
    let autoplaySteps = 0;
    while (!game.endgame && game.currentRoom !== "wooden_town" && autoplaySteps < 100) {
      const c = game.nextAutoplayCommand();
      if (!c) break;
      cmds.push(c); game.execute(c);
      autoplaySteps += 1;
    }
    return {
      seed,
      checkpoint,
      hallsCheckpoint,
      finalRoom: game.currentRoom,
      success: game.currentRoom === "wooden_town" && !game.endgame,
      westBank: game.visitedRooms.has("west_bank"),
      forestPath: game.visitedRooms.has("mirkwood_forest_path"),
      elvenHalls: game.visitedRooms.has("elvenkings_halls"),
      cellar: game.visitedRooms.has("cellar"),
      longLake: game.visitedRooms.has("long_lake"),
      barrelThrown: Boolean(game.flags?.barrelthrown),
      tail: cmds.slice(-12),
      totalSteps: cmds.length,
    };
  } finally { Math.random = o; }
}

const game = bootGame();
for (const seed of [1, 2, 4, 7, 11]) {
  console.log(JSON.stringify(runForestToLaketown(game, seed), null, 2));
}

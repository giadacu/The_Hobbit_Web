const fs = require("fs");
const vm = require("vm");
const path = require("path");

const outputLines = [];

function makeElement(id = "") {
  return {
    id,
    value: "",
    textContent: "",
    innerHTML: "",
    children: [],
    dataset: {},
    disabled: false,
    hidden: false,
    style: {
      setProperty() {},
      removeProperty() {},
      getPropertyValue() { return ""; },
    },
    attributes: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    append(child) {
      this.children.push(child);
      if (this.id === "output" && child.textContent) outputLines.push(child.textContent);
    },
    replaceChildren() {
      this.children = [];
      if (this.id === "output") outputLines.length = 0;
    },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
    removeAttribute(name) { delete this.attributes[name]; },
    getAttribute(name) { return this.attributes[name] || ""; },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() {},
    closest() { return makeElement("scene"); },
    contains() { return false; },
    querySelector() { return null; },
    getBoundingClientRect() { return { width: 800, height: 500 }; },
    get clientWidth() { return 800; },
    get clientHeight() { return 500; },
    play() { return Promise.resolve(); },
    pause() {},
    load() {},
    remove() {},
    get offsetHeight() { return 1; },
    set src(value) { this.attributes.src = value; },
    get src() { return this.attributes.src || ""; },
  };
}

function enableFastHeadlessMode() {
  const realSetTimeout = global.setTimeout.bind(global);
  const realClearTimeout = global.clearTimeout.bind(global);
  const realSetInterval = global.setInterval?.bind(global);
  const pending = new Set();

  global.setTimeout = (fn, delay = 0, ...args) => {
    const id = realSetTimeout(() => {
      pending.delete(id);
      fn(...args);
    }, 0);
    pending.add(id);
    return id;
  };

  global.clearTimeout = (id) => {
    pending.delete(id);
    realClearTimeout(id);
  };

  if (realSetInterval) {
    global.setInterval = (fn, delay = 0, ...args) => global.setTimeout(fn, 0, ...args);
  }

  global.requestAnimationFrame = (fn) => global.setTimeout(() => fn(Date.now()), 0);
  global.cancelAnimationFrame = global.clearTimeout;

  return () => {
    for (const id of pending) realClearTimeout(id);
    pending.clear();
  };
}

function bootGame() {
  enableFastHeadlessMode();

  const root = path.join(__dirname, "..");
  const elements = new Map();
  for (const id of [
    "output", "command-input", "command-form", "autoplay-stop", "game-shell", "room-image",
    "image-reveal", "image-reveal-outline", "image-reveal-fill", "scene-map-overlay", "scene-map-back",
    "scene-map-title", "scene-map-subtitle", "scene-map-zoom-out", "scene-map-zoom-reset", "scene-map-zoom-in",
    "scene-map-scroll", "scene-map-canvas", "scene-map-image", "scene-compass", "scene-compass-rose",
    "scene-compass-vertical", "scene-compass-north", "scene-compass-north-east", "scene-compass-east",
    "scene-compass-south-east", "scene-compass-south", "scene-compass-south-west", "scene-compass-west",
    "scene-compass-north-west", "scene-compass-up", "scene-compass-down", "music-player", "inventory-list",
    "inventory-status", "exits-list", "people-list", "layout-switch", "layout-divider", "layout-mode-1",
    "layout-mode-2", "save-panel", "save-panel-backdrop", "save-panel-close", "save-panel-title",
    "save-panel-latest-autosave", "save-panel-autosave-list", "mobile-scene-handle",
  ]) {
    elements.set(id, makeElement(id));
  }

  global.window = global;
  global.location = { protocol: "file:" };
  global.window.location = global.location;
  global.document = {
    getElementById: (id) => elements.get(id) || makeElement(id),
    createElement: () => makeElement(),
    addEventListener() {},
    removeEventListener() {},
    body: makeElement("body"),
    documentElement: makeElement("html"),
    fonts: { ready: Promise.resolve() },
  };
  global.localStorage = {
    _m: new Map(),
    getItem(key) { return this._m.get(key) ?? null; },
    setItem(key, value) { this._m.set(key, String(value)); },
    removeItem(key) { this._m.delete(key); },
    key(index) { return [...this._m.keys()][index] || null; },
    get length() { return this._m.size; },
  };
  global.SpeechSynthesisUtterance = function SpeechSynthesisUtterance() {};
  global.speechSynthesis = {
    speak() {},
    cancel() {},
    getVoices() { return []; },
    addEventListener() {},
  };

  vm.runInThisContext(fs.readFileSync(path.join(root, "assets/game-data.js"), "utf8"));
  vm.runInThisContext(fs.readFileSync(path.join(root, "assets/map-layout-data.js"), "utf8"));
  vm.runInThisContext(fs.readFileSync(path.join(root, "game.js"), "utf8"));

  const game = global.hobbitGame;
  game.idleWaitMs = 0;
  game.voiceEnabled = false;
  return game;
}

function makeSeededRandom(seed) {
  let value = (Number(seed) >>> 0) || 1;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function withSeed(seed, fn) {
  const original = Math.random;
  Math.random = makeSeededRandom(seed);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function execStep(game, command, transcript) {
  const beforeLength = outputLines.length;
  game.execute(command);
  const lines = outputLines.slice(beforeLength);
  transcript.push({ command, room: game.currentRoom, lines });
  return lines;
}

module.exports = {
  bootGame,
  enableFastHeadlessMode,
  outputLines,
  makeSeededRandom,
  withSeed,
  execStep,
};

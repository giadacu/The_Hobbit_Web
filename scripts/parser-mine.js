const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const CORPUS_PATH = path.join(__dirname, "parser-corpus.json");
const REGRESSIONS_PATH = path.join(__dirname, "parser-regressions.json");

function makeElement(id = "") {
  return {
    id,
    value: "",
    textContent: "",
    className: "",
    children: [],
    style: {
      setProperty() {},
      removeProperty() {},
      getPropertyValue() { return ""; },
    },
    attributes: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    append(child) { this.children.push(child); },
    replaceChildren() { this.children = []; },
    addEventListener() {},
    removeEventListener() {},
    removeAttribute(name) { delete this.attributes[name]; },
    getAttribute(name) { return this.attributes[name] || ""; },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() {},
    closest() { return makeElement("scene"); },
    contains() { return false; },
    getBoundingClientRect() { return { width: 800, height: 500 }; },
    play() { return Promise.resolve(); },
    pause() {},
    load() {},
    get offsetHeight() { return 1; },
    set src(value) { this.attributes.src = value; },
    get src() { return this.attributes.src || ""; },
  };
}

function bootSplitter() {
  const elements = new Map();
  for (const id of [
    "output",
    "command-input",
    "command-form",
    "game-shell",
    "room-image",
    "image-reveal",
    "image-reveal-outline",
    "image-reveal-fill",
    "scene-map-overlay",
    "scene-map-image",
    "scene-compass",
    "scene-compass-rose",
    "scene-compass-vertical",
    "scene-compass-north",
    "scene-compass-north-east",
    "scene-compass-east",
    "scene-compass-south-east",
    "scene-compass-south",
    "scene-compass-south-west",
    "scene-compass-west",
    "scene-compass-north-west",
    "scene-compass-up",
    "scene-compass-down",
    "music-player",
    "inventory-list",
    "exits-list",
    "people-list",
    "layout-switch",
    "layout-divider",
    "layout-mode-1",
    "layout-mode-2",
  ]) {
    elements.set(id, makeElement(id));
  }

  global.window = global;
  global.document = {
    getElementById: (id) => elements.get(id) || makeElement(id),
    createElement: () => makeElement(),
    addEventListener() {},
    removeEventListener() {},
    body: makeElement("body"),
    documentElement: makeElement("html"),
    fonts: { ready: Promise.resolve() },
  };
  const storage = new Map();
  global.localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(String(key), String(value)); },
    removeItem(key) { storage.delete(String(key)); },
    key(index) { return [...storage.keys()][index] || null; },
    get length() { return storage.size; },
  };
  global.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 0);
  global.cancelAnimationFrame = clearTimeout;

  vm.runInThisContext(fs.readFileSync(path.join(ROOT, "assets/game-data.js"), "utf8"));
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, "game.js"), "utf8"));
  return window.hobbitGame.splitter.constructor;
}

function loadJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeInput(input = "") {
  return String(input).trim().replace(/\s+/g, " ").toLowerCase();
}

function safeName(text = "") {
  return String(text).replace(/\s+/g, " ").trim();
}

function clusterKey(commands = []) {
  return commands.join(" | ");
}

function buildRegressionCases(corpusCommands, Splitter) {
  return corpusCommands.map((entry, index) => {
    const input = typeof entry === "string" ? entry : entry.input;
    const tags = Array.isArray(entry?.tags) ? entry.tags : [];
    const splitter = new Splitter(window.HOBBIT_DATA);
    const expected = splitter.split(input);
    return {
      name: `corpus ${String(index + 1).padStart(3, "0")}: ${safeName(input)}`,
      input,
      expected,
      tags,
      source: "parser-corpus",
    };
  });
}

function summarizeClusters(cases) {
  const clusters = new Map();
  for (const testCase of cases) {
    const key = clusterKey(testCase.expected);
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(testCase.input);
  }
  return [...clusters.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([key, inputs]) => ({ key, inputs }));
}

function writeRegressions(cases, existing = {}) {
  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      generator: "scripts/parser-mine.js",
      splitterCaseCount: cases.length,
    },
    splitterCases: cases,
    gameCases: Array.isArray(existing.gameCases) ? existing.gameCases : [],
  };
  fs.writeFileSync(REGRESSIONS_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

function main() {
  const args = new Set(process.argv.slice(2));
  const shouldSync = args.has("--sync");
  const corpus = loadJson(CORPUS_PATH, { commands: [] });
  const existingRegressions = loadJson(REGRESSIONS_PATH, { splitterCases: [], gameCases: [] });
  const commands = Array.isArray(corpus.commands) ? corpus.commands.filter((entry) => (typeof entry === "string" ? entry : entry?.input)) : [];

  const duplicates = new Map();
  for (const entry of commands) {
    const input = typeof entry === "string" ? entry : entry.input;
    const key = normalizeInput(input);
    duplicates.set(key, (duplicates.get(key) || 0) + 1);
  }
  const duplicateInputs = [...duplicates.entries()].filter(([, count]) => count > 1).map(([input]) => input);

  const Splitter = bootSplitter();
  const cases = buildRegressionCases(commands, Splitter);
  const clusters = summarizeClusters(cases);

  if (shouldSync) writeRegressions(cases, existingRegressions);

  console.log(`Corpus commands: ${commands.length}`);
  console.log(`Duplicate inputs: ${duplicateInputs.length}`);
  console.log(`Generated splitter regressions: ${cases.length}`);
  if (shouldSync) console.log(`Wrote ${path.relative(ROOT, REGRESSIONS_PATH)}`);

  console.log("\nTop clusters:");
  for (const cluster of clusters.slice(0, 12)) {
    console.log(`- ${cluster.key} (${cluster.inputs.length})`);
    console.log(`  ${cluster.inputs.join(" | ")}`);
  }

  if (duplicateInputs.length) {
    console.log("\nDuplicate commands:");
    for (const input of duplicateInputs) console.log(`- ${input}`);
  }
}

main();

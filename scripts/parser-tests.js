const fs = require("fs");
const vm = require("vm");

const outputLines = [];
const AUTOPLAY_VICTORY_LINE = "Congratulations. You have killed Smaug and found the treasure - a real thief.";

function parseCliOptions(argv = []) {
  const options = {
    autoplayBatchCount: 0,
    autoplayBatchOnly: false,
    autoplayBatchSeedStart: 1,
    autoplayBatchStepLimit: 500,
    autoplayBatchStrict: false,
    autoplayShowVictories: false,
    autoplayTraceSeeds: new Set(),
    autoplayTraceLimit: 80,
  };
  for (const arg of argv) {
    if (arg === "--autoplay-batch-only") {
      options.autoplayBatchOnly = true;
      continue;
    }
    if (arg === "--autoplay-batch-strict") {
      options.autoplayBatchStrict = true;
      continue;
    }
    if (arg === "--autoplay-show-victories") {
      options.autoplayShowVictories = true;
      continue;
    }
    if (arg.startsWith("--autoplay-batch=")) {
      options.autoplayBatchCount = Math.max(0, Number.parseInt(arg.split("=")[1], 10) || 0);
      continue;
    }
    if (arg.startsWith("--autoplay-seed-start=")) {
      options.autoplayBatchSeedStart = Number.parseInt(arg.split("=")[1], 10) || options.autoplayBatchSeedStart;
      continue;
    }
    if (arg.startsWith("--autoplay-step-limit=")) {
      options.autoplayBatchStepLimit = Math.max(1, Number.parseInt(arg.split("=")[1], 10) || options.autoplayBatchStepLimit);
      continue;
    }
    if (arg.startsWith("--autoplay-trace-seeds=")) {
      const seeds = arg.split("=")[1]
        .split(",")
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value > 0);
      options.autoplayTraceSeeds = new Set(seeds);
      continue;
    }
    if (arg.startsWith("--autoplay-trace-limit=")) {
      options.autoplayTraceLimit = Math.max(1, Number.parseInt(arg.split("=")[1], 10) || options.autoplayTraceLimit);
    }
  }
  return options;
}

function makeSeededRandom(seed) {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function makeElement(id = "") {
  const listeners = new Map();
  return {
    id,
    value: "",
    textContent: "",
    innerHTML: "",
    className: "",
    children: [],
    dataset: {},
    disabled: false,
    hidden: false,
    scrollLeft: 0,
    scrollTop: 0,
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
    addEventListener(type, listener) {
      const list = listeners.get(type) || [];
      list.push(listener);
      listeners.set(type, list);
    },
    removeEventListener(type, listener) {
      const list = listeners.get(type) || [];
      listeners.set(type, list.filter((entry) => entry !== listener));
    },
    dispatchEvent(event = {}) {
      const type = event.type;
      if (!type) return true;
      const list = listeners.get(type) || [];
      for (const listener of list) listener(event);
      return !event.defaultPrevented;
    },
    click() {
      this.dispatchEvent({
        type: "click",
        currentTarget: this,
        target: this,
        preventDefault() { this.defaultPrevented = true; },
        defaultPrevented: false,
      });
    },
    removeAttribute(name) { delete this.attributes[name]; },
    getAttribute(name) { return this.attributes[name] || ""; },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() {},
    closest() { return makeElement("scene"); },
    contains() { return false; },
    querySelector(selector) {
      if (selector === ".scene-map-current-indicator" && this.innerHTML.includes("scene-map-current-indicator")) {
        if (!this._sceneMapCurrentIndicator) this._sceneMapCurrentIndicator = makeElement("scene-map-current-indicator");
        return this._sceneMapCurrentIndicator;
      }
      return null;
    },
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

function dispatchDocumentEvent(type, event = {}) {
  const listeners = global.document?._listeners?.[type] || [];
  for (const listener of listeners) listener(event);
}

function bootGame() {
  const elements = new Map();
  for (const id of [
    "output",
    "command-input",
    "command-form",
    "autoplay-stop",
    "game-shell",
    "room-image",
    "image-reveal",
    "image-reveal-outline",
    "image-reveal-fill",
    "scene-map-overlay",
    "scene-map-back",
    "scene-map-title",
    "scene-map-subtitle",
    "scene-map-zoom-out",
    "scene-map-zoom-reset",
    "scene-map-zoom-in",
    "scene-map-scroll",
    "scene-map-canvas",
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
    "inventory-status",
    "exits-list",
    "people-list",
    "layout-switch",
    "layout-divider",
    "layout-mode-1",
    "layout-mode-2",
    "save-panel",
    "save-panel-backdrop",
    "save-panel-close",
    "save-panel-title",
    "save-panel-latest-autosave",
    "save-panel-autosave-list",
    "mobile-scene-handle",
  ]) {
    elements.set(id, makeElement(id));
  }

  global.window = global;
  global.location = { protocol: "file:" };
  global.window.location = global.location;
  const documentListeners = new Map();
  global.document = {
    getElementById: (id) => elements.get(id) || makeElement(id),
    createElement: () => makeElement(),
    addEventListener(type, listener) {
      const list = documentListeners.get(type) || [];
      list.push(listener);
      documentListeners.set(type, list);
    },
    removeEventListener(type, listener) {
      const list = documentListeners.get(type) || [];
      documentListeners.set(type, list.filter((entry) => entry !== listener));
    },
    body: makeElement("body"),
    documentElement: makeElement("html"),
    fonts: { ready: Promise.resolve() },
    _listeners: Object.create(null),
  };
  Object.defineProperty(global.document, "_listeners", {
    value: new Proxy({}, {
      get(_, prop) {
        return documentListeners.get(prop) || [];
      },
    }),
    configurable: true,
  });
  const storage = new Map();
  global.localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(String(key), String(value)); },
    removeItem(key) { storage.delete(String(key)); },
    key(index) { return [...storage.keys()][index] || null; },
    get length() { return storage.size; },
  };
  const speechVoices = [
    { name: "Test English", lang: "en-GB", default: true, voiceURI: "test-en-gb" },
    { name: "Test Italian", lang: "it-IT", default: false, voiceURI: "test-it-it" },
  ];
  global.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text = "") {
    this.text = String(text);
    this.voice = null;
    this.lang = "";
    this.rate = 1;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
  };
  global.window.SpeechSynthesisUtterance = global.SpeechSynthesisUtterance;
  global.window.speechSynthesis = {
    _listeners: new Map(),
    _spoken: [],
    _voices: speechVoices,
    speak(utterance) {
      this._spoken.push({
        text: utterance?.text || "",
        voice: utterance?.voice?.name || "",
        lang: utterance?.lang || "",
        rate: utterance?.rate || 1,
      });
      utterance?.onstart?.();
      utterance?.onend?.();
    },
    cancel() {},
    getVoices() { return this._voices.slice(); },
    addEventListener(type, listener) {
      const list = this._listeners.get(type) || [];
      list.push(listener);
      this._listeners.set(type, list);
    },
  };
  global.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 0);
  global.cancelAnimationFrame = clearTimeout;

  vm.runInThisContext(fs.readFileSync("assets/game-data.js", "utf8"));
  vm.runInThisContext(fs.readFileSync("assets/map-layout-data.js", "utf8"));
  vm.runInThisContext(fs.readFileSync("game.js", "utf8"));
  return window.hobbitGame.splitter.constructor;
}

function sameArray(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function runCase(Splitter, testCase) {
  const splitter = new Splitter(window.HOBBIT_DATA);
  const actual = [];
  for (const input of testCase.inputs || [testCase.input]) {
    actual.push(...splitter.split(input));
  }
  return { ...testCase, actual, ok: sameArray(actual, testCase.expected) };
}

function runDialogueCase(testCase) {
  outputLines.length = 0;
  window.hobbitGame.execute(testCase.input);
  const actual = outputLines.at(-1) || "";
  return { ...testCase, actual, ok: actual === testCase.expected };
}

function runGameCase(testCase) {
  const originalRandom = Math.random;
  window.hobbitGame.restartGame();
  Math.random = () => 0.99;
  try {
    outputLines.length = 0;
    if (typeof testCase.setup === "function") testCase.setup(window.hobbitGame);
    if (testCase.clearOutputAfterSetup) outputLines.length = 0;
    if (typeof testCase.drive === "function") {
      testCase.drive(window.hobbitGame);
    } else {
      for (const input of testCase.inputs) {
        window.hobbitGame.execute(input);
      }
    }
  } finally {
    Math.random = originalRandom;
  }
  const actual = outputLines.slice();
  const includesExpected = testCase.expectedIncluded.every((pattern) => actual.some((line) => lineMatches(line, pattern)));
  const excludesForbidden = (testCase.notExpectedIncluded || []).every((pattern) => !actual.some((line) => lineMatches(line, pattern)));
  const ok = includesExpected && excludesForbidden;
  return { ...testCase, actual, expected: testCase.expectedIncluded, ok };
}

function prepareAutoplaySeededRun(game, seed) {
  game.restartGame();
  game.storySeed = Number(seed) || 1;
  game.gollumState = game.createGollumState();
  game.flags.smaugstate = "sleeping";
  outputLines.length = 0;
}

function autoplayBatchOutcome({ game, issued, stepLimit }) {
  const output = outputLines.slice();
  const summary = output.join("\n");
  const tail = output.slice(-8).join("\n");
  const lastCommand = issued.at(-1) || "";
  if (summary.includes(AUTOPLAY_VICTORY_LINE)) {
    return { code: "victory", detail: `victory in ${issued.length} step(s)`, lastLine: output.at(-1) || "" };
  }
  if (game.endgame) {
    if (!game.flags.dragondefeated && ["lower_halls", "front_gate", "lonely_mountain", "stoe_of_ravenhill"].includes(game.currentRoom)) {
      return { code: "death_smaug", detail: "fatal endgame triggered in Erebor before the dragon was defeated", lastLine: output.at(-1) || "" };
    }
    if (game.currentRoom === "deep_dark_lake" || /Gollum/i.test(tail)) {
      return { code: "death_gollum", detail: "fatal endgame triggered around Gollum encounter", lastLine: output.at(-1) || "" };
    }
    return { code: "death_other", detail: "fatal endgame triggered outside the expected autoplay win path", lastLine: output.at(-1) || "" };
  }
  if (game.currentRoom === "deep_dark_lake" || issued.slice(-6).every((command) => ["ask gollum a riddle", "wear ring", "north"].includes(command))) {
    return { code: "stuck_gollum", detail: `step limit ${stepLimit} reached in ${game.currentRoom} after "${lastCommand}"`, lastLine: output.at(-1) || "" };
  }
  if (["lower_halls", "front_gate", "lonely_mountain", "stoe_of_ravenhill"].includes(game.currentRoom) && !game.flags.dragondefeated) {
    return { code: "stuck_smaug", detail: `step limit ${stepLimit} reached in Erebor before dragon defeat after "${lastCommand}"`, lastLine: output.at(-1) || "" };
  }
  return { code: "step_limit", detail: `step limit ${stepLimit} reached in ${game.currentRoom} after "${lastCommand}"`, lastLine: output.at(-1) || "" };
}

function runAutoplaySeedBatch(options = {}) {
  const {
    count = 20,
    seedStart = 1,
    stepLimit = 500,
    traceSeeds = new Set(),
    traceLimit = 80,
  } = options;
  const game = window.hobbitGame;
  const originalRandom = Math.random;
  const runs = [];
  try {
    for (let offset = 0; offset < count; offset += 1) {
      const seed = seedStart + offset;
      Math.random = makeSeededRandom(seed);
      prepareAutoplaySeededRun(game, seed);
      const issued = [];
      for (let step = 0; step < stepLimit && !game.endgame; step += 1) {
        const command = game.nextAutoplayCommand();
        if (!command) break;
        issued.push(command);
        game.execute(command);
      }
      const outcome = autoplayBatchOutcome({ game, issued, stepLimit });
      runs.push({
        seed,
        steps: issued.length,
        room: game.currentRoom,
        dragonDefeated: Boolean(game.flags.dragondefeated),
        endgame: Boolean(game.endgame),
        lastCommand: issued.at(-1) || "",
        outcome,
        trace: traceSeeds.has(seed) ? issued.slice(0, traceLimit) : null,
        traceTruncated: traceSeeds.has(seed) && issued.length > traceLimit,
        outputTail: traceSeeds.has(seed) ? outputLines.slice(-8) : null,
      });
    }
  } finally {
    Math.random = originalRandom;
    outputLines.length = 0;
  }

  const counts = new Map();
  for (const run of runs) {
    counts.set(run.outcome.code, (counts.get(run.outcome.code) || 0) + 1);
  }
  return { runs, counts };
}

function printAutoplayBatchReport(report, options = {}) {
  const {
    count = report.runs.length,
    seedStart = 1,
    stepLimit = 500,
    showVictories = false,
    traceSeeds = new Set(),
  } = options;
  console.log(`\nAUTOPLAY BATCH REPORT (${count} seed(s), seeds ${seedStart}-${seedStart + count - 1}, step limit ${stepLimit})`);
  const sortedCounts = [...report.counts.entries()].sort((left, right) => left[0].localeCompare(right[0]));
  for (const [code, amount] of sortedCounts) {
    console.log(`  ${code}: ${amount}`);
  }
  if (showVictories) {
    const victories = report.runs
      .filter((run) => run.outcome.code === "victory")
      .sort((left, right) => left.steps - right.steps || left.seed - right.seed);
    if (!victories.length) {
      console.log("  No winning seeds found.");
    } else {
      console.log("  Winning seeds:");
      for (const run of victories) {
        console.log(`    seed ${run.seed}: ${run.outcome.detail}; room=${run.room}; last="${run.lastCommand}"`);
      }
    }
  }
  const failures = report.runs.filter((run) => run.outcome.code !== "victory");
  if (!failures.length) {
    console.log("  No failing seeds found.");
  } else {
    console.log("  Failing seeds:");
    for (const run of failures) {
      console.log(`    seed ${run.seed}: ${run.outcome.code} (${run.outcome.detail}); steps=${run.steps}; room=${run.room}; dragonDefeated=${run.dragonDefeated ? "yes" : "no"}; last="${run.lastCommand}"; output="${run.outcome.lastLine || ""}"`);
    }
  }
  const tracedRuns = report.runs.filter((run) => traceSeeds.has(run.seed));
  if (!tracedRuns.length) return;
  console.log("  Traces:");
  for (const run of tracedRuns) {
    const commands = run.trace?.length ? run.trace.join(" -> ") : "(no commands captured)";
    const tail = run.outputTail?.length ? run.outputTail.join(" | ") : "(no output)";
    console.log(`    seed ${run.seed}: ${run.outcome.code}; commands=${commands}${run.traceTruncated ? " -> ..." : ""}`);
    console.log(`      output=${tail}`);
  }
}

function lineMatches(line, pattern) {
  if (pattern instanceof RegExp) return pattern.test(line);
  return line.includes(pattern);
}

function loadExternalRegressionCases() {
  const fallback = { splitterCases: [], gameCases: [] };
  const filePath = "scripts/parser-regressions.json";
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return {
      splitterCases: Array.isArray(payload.splitterCases) ? payload.splitterCases : [],
      gameCases: Array.isArray(payload.gameCases) ? payload.gameCases : [],
    };
  } catch (error) {
    console.warn(`Could not load ${filePath}: ${error.message}`);
    return fallback;
  }
}

function placeCharacterWithPlayer(game, characterId) {
  game.characters[characterId].position = game.player.position;
}

function giveItemToCharacter(game, itemId, characterId = "gandalf") {
  const item = game.items[itemId];
  if (!item) throw new Error(`Unknown item: ${itemId}`);
  game.detachItem(item.id);
  item.location = { type: "character", id: characterId };
  const inventory = game.characters[characterId].inventory;
  if (!inventory.includes(item.id)) inventory.push(item.id);
}

function movePlayerTo(game, roomId) {
  game.currentRoom = roomId;
  game.player.position = roomId;
  game.visitedRooms.add(roomId);
}

function addHostileTestCharacter(game, id = "test_goblin", overrides = {}) {
  const roomId = overrides.position || game.player.position;
  game.characters[id] = {
    id,
    name: overrides.name || "goblin",
    position: roomId,
    visible: true,
    friendly: false,
    strength: overrides.strength ?? 1,
    inventory: [],
    worn: [],
    attackFlag: 0,
    hasMetPlayer: true,
    justEntered: false,
    noticeable: true,
    wearingRing: false,
    ringTimer: 0,
    insideContainer: null,
    carriedBy: null,
    movementMode: "never",
  };
  return game.characters[id];
}

const cases = [
  {
    name: "object manipulation",
    input: "Pick up the red box.",
    expected: ["take red box"],
  },
  {
    name: "placement on object",
    input: "Put the book on the table.",
    expected: ["leave book on table"],
  },
  {
    name: "spatial placement keeps phrase",
    input: "Place the pen next to the notebook.",
    expected: ["place pen next to notebook"],
  },
  {
    name: "transfer to person",
    input: "Give the key to Thorin.",
    expected: ["give key to thorin"],
  },
  {
    name: "hand me",
    input: "Hand me the screwdriver.",
    expected: ["hand me screwdriver"],
  },
  {
    name: "polite command",
    input: "Could you bring me a glass of water?",
    expected: ["bring me glass of water"],
  },
  {
    name: "have person do action",
    input: "Have Bard shoot the dragon.",
    expected: ["ask bard to shoot dragon"],
  },
  {
    name: "say to person to act",
    input: "Say to Bard to shoot the dragon.",
    expected: ["ask bard to shoot dragon"],
  },
  {
    name: "vocative modal delegated action",
    input: "Bard, can you shoot the dragon?",
    expected: ["ask bard to shoot dragon"],
  },
  {
    name: "vocative modal with filler phrase",
    input: "Gandalf, could you take a look at the map?",
    expected: ["ask gandalf to look at map"],
  },
  {
    name: "vocative have a look phrase",
    input: "Gandalf, have a look at the map.",
    expected: ["ask gandalf to look at map"],
  },
  {
    name: "vocative would you mind phrase",
    input: "Gandalf, would you mind following me?",
    expected: ["ask gandalf to follow me"],
  },
  {
    name: "show person item natural order",
    input: "Could you show Gandalf the map?",
    expected: ["show map to gandalf"],
  },
  {
    name: "give me item back natural order",
    input: "Gandalf, can you give me the map back?",
    expected: ["ask gandalf to give map to me"],
  },
  {
    name: "delegated trailing for me is dropped",
    input: "Gandalf, could you open the round green door for me?",
    expected: ["ask gandalf to open round green door"],
  },
  {
    name: "bard loose the arrow phrasing",
    input: "Bard, loose the arrow!",
    expected: ["ask bard to take shot"],
  },
  {
    name: "ask about topic",
    input: "Ask Thorin about the treasure.",
    expected: ["ask thorin about treasure"],
  },
  {
    name: "tell person to act",
    input: "Tell Thorin to unlock the door.",
    expected: ["ask thorin to unlock door"],
  },
  {
    name: "vocative",
    input: "Gandalf, follow me.",
    expected: ["ask gandalf to follow me"],
  },
  {
    name: "third-person Bilbo command",
    input: "Bilbo gives the Arkenstone to Bard.",
    expected: ["give arkenstone to bard"],
  },
  {
    name: "multi-step direct",
    input: "Take the sword, attack the goblin, and then follow Gandalf.",
    expected: ["take sword", "kill goblin", "follow gandalf"],
  },
  {
    name: "multi-step with pronoun",
    input: "Get the key from Balin and give it to Thorin.",
    expected: ["get key from balin", "give key to thorin"],
  },
  {
    name: "delegated chain remains delegated",
    input: "Tell Bombur to take the treasure and bring it here.",
    expected: ["ask bombur to take treasure and bring it here"],
  },
  {
    name: "delegated pronoun remains inside delegation",
    input: "Ask Elrond to read the map and explain it.",
    expected: ["ask elrond to read map and explain it"],
  },
  {
    name: "nested command request",
    input: "Ask Gandalf to tell Thorin to follow me.",
    expected: ["ask gandalf to tell thorin to follow me"],
  },
  {
    name: "indirect speech treated as topic",
    input: "Tell Thorin that Gandalf wants to leave.",
    expected: ["ask thorin that gandalf wants to leave"],
  },
  {
    name: "question to character treated as topic",
    input: "Ask Gandalf if he knows where Gollum is.",
    expected: ["ask gandalf if he knows where gollum is"],
  },
  {
    name: "context pronouns across inputs",
    inputs: ["Take the sword.", "Give it to Thorin.", "Tell him to wait."],
    expected: ["take sword", "give sword to thorin", "ask thorin to wait"],
  },
  {
    name: "open and inspect pronoun",
    inputs: ["Open the chest.", "Look inside it."],
    expected: ["open chest", "look inside chest"],
  },
  {
    name: "give then ask pronoun",
    input: "Give the key to Thorin and ask him to unlock the door.",
    expected: ["give key to thorin", "ask thorin to unlock door"],
  },
  {
    name: "delegated while clause kept together",
    input: "Ask Balin to guard the entrance while I search the cave.",
    expected: ["ask balin to guard entrance while i search cave"],
  },
  {
    name: "follow into and act",
    input: "Follow Gandalf into the tunnel and light the lantern.",
    expected: ["follow gandalf into tunnel", "light lantern"],
  },
  {
    name: "take a look filler phrase",
    input: "Take a look at the chest.",
    expected: ["look at chest"],
  },
  {
    name: "take a look through filler phrase",
    input: "Tell Thorin to take a look through the window.",
    expected: ["ask thorin to look through window"],
  },
  {
    name: "open up filler phrase",
    input: "Open up the chest.",
    expected: ["open chest"],
  },
  {
    name: "head direction alias",
    input: "Head north.",
    expected: ["north"],
  },
  {
    name: "head back inside alias",
    input: "Head back inside.",
    expected: ["back inside"],
  },
  {
    name: "get in alias",
    input: "Get in.",
    expected: ["go inside"],
  },
  {
    name: "get inside alias",
    input: "Get inside.",
    expected: ["go inside"],
  },
  {
    name: "get outside alias",
    input: "Get outside.",
    expected: ["go outside"],
  },
  {
    name: "come out alias",
    input: "Come out.",
    expected: ["go outside"],
  },
  {
    name: "go in alias",
    input: "Go in.",
    expected: ["go inside"],
  },
  {
    name: "walk out alias",
    input: "Walk out.",
    expected: ["go outside"],
  },
  {
    name: "move on alias",
    input: "Move on.",
    expected: ["go forward"],
  },
  {
    name: "press on alias",
    input: "Press on.",
    expected: ["go forward"],
  },
  {
    name: "ignore storm alias",
    input: "Ignore storm.",
    expected: ["go forward"],
  },
  {
    name: "lead ponies forward alias",
    input: "Lead ponies forward.",
    expected: ["go forward"],
  },
  {
    name: "climb pass alias",
    input: "Climb pass.",
    expected: ["climb pass"],
  },
  {
    name: "head inside alias",
    input: "Head inside.",
    expected: ["go inside"],
  },
  {
    name: "natural leave intent maps to going out",
    input: "I want to leave.",
    expected: ["go out"],
  },
  {
    name: "id like to go outside maps to going out",
    input: "I'd like to go outside.",
    expected: ["go outside"],
  },
  {
    name: "let me out maps to going out",
    input: "Let me out.",
    expected: ["go out"],
  },
  {
    name: "can i leave maps to going out",
    input: "Can I leave?",
    expected: ["go out"],
  },
  {
    name: "can i get out of here maps to exits",
    input: "Can I get out of here?",
    expected: ["exits"],
  },
  {
    name: "i think ill go north maps to movement",
    input: "I think I'll go north.",
    expected: ["go north"],
  },
  {
    name: "lets open chest maps to direct command",
    input: "Let's open the chest.",
    expected: ["open chest"],
  },
  {
    name: "travel north alias",
    input: "Travel north.",
    expected: ["go north"],
  },
  {
    name: "go to the north alias",
    input: "Go to the north.",
    expected: ["go north"],
  },
  {
    name: "proceed northward alias",
    input: "Proceed northward.",
    expected: ["go north"],
  },
  {
    name: "collect maps to take",
    input: "Collect the sword.",
    expected: ["take sword"],
  },
  {
    name: "carry stays actionable",
    input: "Carry the sword.",
    expected: ["carry sword"],
  },
  {
    name: "snag maps to take",
    input: "Snag the sword.",
    expected: ["take sword"],
  },
  {
    name: "study maps to examine",
    input: "Study the sword.",
    expected: ["examine sword"],
  },
  {
    name: "look closely at maps to examine",
    input: "Look closely at the sword.",
    expected: ["examine sword"],
  },
  {
    name: "talk to character about topic maps to ask about",
    input: "Talk to Gandalf about treasure.",
    expected: ["ask gandalf about treasure"],
  },
  {
    name: "pick back up filler phrase",
    input: "Pick the key back up.",
    expected: ["take key"],
  },
  {
    name: "steal from and return",
    input: "Steal the cup from Smaug and return to the dwarves.",
    expected: ["steal cup from smaug", "return to dwarves"],
  },
  {
    name: "tell about then follow pronoun",
    input: "Tell Bard about the secret door and follow him.",
    expected: ["ask bard about secret door", "follow bard"],
  },
  {
    name: "give back to person",
    input: "Give the map back to Gandalf.",
    expected: ["give map to gandalf"],
  },
  {
    name: "give then tell pronoun",
    input: "Give the Arkenstone to Bard and tell him to negotiate with Thorin.",
    expected: ["give arkenstone to bard", "ask bard to negotiate with thorin"],
  },
  {
    name: "give pronouns keep object and recipient",
    inputs: ["Give the key to Thorin.", "Hand it to him."],
    expected: ["give key to thorin", "hand key to thorin"],
  },
  {
    name: "mend object",
    input: "Mend the map.",
    expected: ["mend map"],
  },
  {
    name: "repair object",
    input: "Repair the map.",
    expected: ["repair map"],
  },
  {
    name: "write on object",
    input: "Write on the parchment.",
    expected: ["write on parchment"],
  },
  {
    name: "lie on object",
    input: "Lie on the settee.",
    expected: ["lie on settee"],
  },
  {
    name: "pick garden object",
    input: "Pick a rose.",
    expected: ["pick rose"],
  },
  {
    name: "water garden object",
    input: "Water the rose bush.",
    expected: ["water rose bush"],
  },
  {
    name: "trim with tool",
    input: "Trim the rose bush with the pruner.",
    expected: ["trim rose bush with pruner"],
  },
  {
    name: "dig with tool",
    input: "Dig with the spade.",
    expected: ["dig with spade"],
  },
  {
    name: "plant seeds",
    input: "Plant seeds.",
    expected: ["plant seeds"],
  },
  {
    name: "rake leaves",
    input: "Rake leaves.",
    expected: ["rake leaves"],
  },
];

const originalListCases = [
  ["Pick up the red box.", ["take red box"]],
  ["Put the book on the table.", ["leave book on table"]],
  ["Move the chair closer to the window.", ["move chair closer to window"]],
  ["Take the cup from the shelf.", ["take cup from shelf"]],
  ["Open the drawer.", ["open drawer"]],
  ["Close the door.", ["close door"]],
  ["Lift the package carefully.", ["lift package"]],
  ["Drop the keys into the basket.", ["leave keys into basket"]],
  ["Turn the bottle upside down.", ["turn bottle upside down"]],
  ["Place the pen next to the notebook.", ["place pen next to notebook"]],
  ["Give the ball to John.", ["give ball to john"]],
  ["Hand me the screwdriver.", ["hand me screwdriver"]],
  ["Pass the salt to Sarah.", ["pass salt to sarah"]],
  ["Bring the documents to the manager.", ["bring documents to manager"]],
  ["Send the package to the warehouse.", ["send package to warehouse"]],
  ["Return the book to Mary.", ["return book to mary"]],
  ["Deliver the letter to the receptionist.", ["deliver letter to receptionist"]],
  ["Take this folder to my office.", ["take folder to office"]],
  ["Leave the box at the front desk.", ["leave box at front desk"]],
  ["Carry the groceries into the kitchen.", ["carry groceries into kitchen"]],
  ["Ask John to open the window.", ["ask john to open window"]],
  ["Tell Sarah to call me.", ["ask sarah to call me"]],
  ["Ask the technician to check the machine.", ["ask technician to check machine"]],
  ["Tell everyone to sit down.", ["ask everyone to sit down"]],
  ["Ask Mike to move the car.", ["ask mike to move car"]],
  ["Tell the team to start the meeting.", ["ask team to start meeting"]],
  ["Ask Anna to bring some coffee.", ["ask anna to bring coffee"]],
  ["Tell the driver to wait outside.", ["ask driver to wait outside"]],
  ["Ask Peter to send the report.", ["ask peter to send report"]],
  ["Tell the assistant to print the document.", ["ask assistant to print document"]],
  ["Pick up the book and place it on the desk.", ["take book", "place book on desk"]],
  ["Open the box and remove the contents.", ["open box", "remove contents"]],
  ["Take the keys, unlock the door, and enter the room.", ["take keys", "unlock door", "go room"]],
  ["Find the folder and give it to Susan.", ["find folder", "give folder to susan"]],
  ["Turn off the light and close the door.", ["close light", "close door"]],
  ["Get the package from the office and bring it here.", ["get package from office", "bring package here"]],
  ["Wash the cup and put it back on the shelf.", ["wash cup", "leave cup back on shelf"]],
  ["Open the cabinet, take the file, and hand it to me.", ["open cabinet", "take file", "hand file to me"]],
  ["Pick up the phone and call John.", ["take phone", "call john"]],
  ["Find the missing tool and return it to the toolbox.", ["find missing tool", "return tool to toolbox"]],
  ["Put the box under the table.", ["leave box under table"]],
  ["Move the chair behind the desk.", ["move chair behind desk"]],
  ["Place the lamp between the two chairs.", ["place lamp between two chairs"]],
  ["Set the package near the entrance.", ["set package near entrance"]],
  ["Put the notebook inside the drawer.", ["leave notebook inside drawer"]],
  ["Move the cart to the left of the machine.", ["move cart to left of machine"]],
  ["Place the bottle in front of the monitor.", ["place bottle in front of monitor"]],
  ["Put the suitcase beside the bed.", ["leave suitcase beside bed"]],
  ["Move the pallet to the back of the warehouse.", ["move pallet to back of warehouse"]],
  ["Store the boxes on the top shelf.", ["store boxes on top shelf"]],
  ["Talk to Thorin.", ["talk to thorin"]],
  ["Ask Thorin about the treasure.", ["ask thorin about treasure"]],
  ["Give the key to Thorin.", ["give key to thorin"]],
  ["Follow Thorin.", ["follow thorin"]],
  ["Tell Thorin to wait here.", ["ask thorin to wait here"]],
  ["Tell Thorin to unlock the door.", ["ask thorin to unlock door"]],
  ["Ask Balin for advice.", ["ask balin for advice"]],
  ["Give the map to Balin.", ["give map to balin"]],
  ["Tell Dwalin to attack the goblin.", ["ask dwalin to attack goblin"]],
  ["Wake Bombur.", ["wake bombur"]],
  ["Tell Bombur to follow me.", ["ask bombur to follow me"]],
  ["Ask Fili to carry the treasure.", ["ask fili to carry treasure"]],
  ["Ask Kili to climb the tree.", ["ask kili to climb tree"]],
  ["Give the rope to Oin.", ["give rope to oin"]],
  ["Tell Gloin to guard the entrance.", ["ask gloin to guard entrance"]],
  ["Ask Bifur to search the cave.", ["ask bifur to search cave"]],
  ["Tell Bofur to open the chest.", ["ask bofur to open chest"]],
  ["Ask Nori about the tunnel.", ["ask nori about tunnel"]],
  ["Tell Dori to help Bilbo.", ["ask dori to help bilbo"]],
  ["Ask Ori to read the map.", ["ask ori to read map"]],
  ["Talk to Gandalf.", ["talk to gandalf"]],
  ["Ask Gandalf where to go.", ["ask gandalf where to go"]],
  ["Gandalf, where is Thorin?", ["ask gandalf where is thorin"]],
  ["Tell Gandalf look for Thorin.", ["ask gandalf to look for thorin"]],
  ["Tell Gandalf, look for Thorin.", ["ask gandalf to look for thorin"]],
  ["Show the map to Gandalf.", ["show map to gandalf"]],
  ["Give the key to Gandalf.", ["give key to gandalf"]],
  ["Ask Gandalf to light the way.", ["ask gandalf to light way"]],
  ["Tell Gandalf to attack the goblin.", ["ask gandalf to attack goblin"]],
  ["Follow Gandalf.", ["follow gandalf"]],
  ["Ask Gandalf about the dragon.", ["ask gandalf about dragon"]],
  ["Tell Gandalf to wait outside.", ["ask gandalf to wait outside"]],
  ["Ask Gandalf whether the path is safe.", ["ask gandalf whether path is safe"]],
  ["Talk to Gollum.", ["talk to gollum"]],
  ["Ask Gollum a riddle.", ["ask gollum riddle"]],
  ["Answer Gollum's riddle.", ["answer gollum's riddle"]],
  ["Follow Gollum.", ["follow gollum"]],
  ["Show the ring to Gollum.", ["show ring to gollum"]],
  ["Give the fish to Gollum.", ["give fish to gollum"]],
  ["Hide from Gollum.", ["hide from gollum"]],
  ["Sneak past Gollum.", ["sneak past gollum"]],
  ["Ask Gollum where the exit is.", ["ask gollum where exit is"]],
  ["Escape from Gollum.", ["escape from gollum"]],
  ["Talk to Elrond.", ["talk to elrond"]],
  ["Show the map to Elrond.", ["show map to elrond"]],
  ["Ask Elrond to read the moon letters.", ["ask elrond to read moon letters"]],
  ["Follow Elrond.", ["follow elrond"]],
  ["Give the sword to Elrond.", ["give sword to elrond"]],
  ["Ask the elves for food.", ["ask elves for food"]],
  ["Tell the elves about the dragon.", ["ask elves about dragon"]],
  ["Ask Elrond about the secret door.", ["ask elrond about secret door"]],
  ["Thank Elrond.", ["thank elrond"]],
  ["Ask Elrond where Rivendell is.", ["ask elrond where rivendell is"]],
  ["Talk to Beorn.", ["talk to beorn"]],
  ["Ask Beorn for shelter.", ["ask beorn for shelter"]],
  ["Ask Beorn about Mirkwood.", ["ask beorn about mirkwood"]],
  ["Give honey to Beorn.", ["give honey to beorn"]],
  ["Follow Beorn.", ["follow beorn"]],
  ["Tell Beorn about the goblins.", ["ask beorn about goblins"]],
  ["Ask Beorn for food.", ["ask beorn for food"]],
  ["Ask Beorn to help the dwarves.", ["ask beorn to help dwarves"]],
  ["Show the map to Beorn.", ["show map to beorn"]],
  ["Thank Beorn for his hospitality.", ["thank beorn for his hospitality"]],
  ["Talk to Smaug.", ["talk to smaug"]],
  ["Ask Smaug about the treasure.", ["ask smaug about treasure"]],
  ["Flatter Smaug.", ["flatter smaug"]],
  ["Insult Smaug.", ["insult smaug"]],
  ["Sneak past Smaug.", ["sneak past smaug"]],
  ["Steal a cup from Smaug.", ["steal cup from smaug"]],
  ["Show the Arkenstone to Smaug.", ["show arkenstone to smaug"]],
  ["Hide from Smaug.", ["hide from smaug"]],
  ["Attack Smaug with the sword.", ["kill smaug with sword"]],
  ["Run away from Smaug.", ["run away from smaug"]],
  ["Talk to Bard.", ["talk to bard"]],
  ["Give the Arkenstone to Bard.", ["give arkenstone to bard"]],
  ["Ask Bard for help.", ["ask bard for help"]],
  ["Follow Bard.", ["follow bard"]],
  ["Tell Bard about Smaug.", ["ask bard about smaug"]],
  ["Show Bard the secret map.", ["show secret map to bard"]],
  ["Ask Bard to negotiate with Thorin.", ["ask bard to negotiate with thorin"]],
  ["Give Bard the treasure.", ["give treasure to bard"]],
  ["Thank Bard.", ["thank bard"]],
  ["Ask Bard about Lake-town.", ["ask bard about lake-town"]],
  ["Ask Gandalf to tell Thorin to follow me.", ["ask gandalf to tell thorin to follow me"]],
  ["Give the key to Thorin and ask him to unlock the door.", ["give key to thorin", "ask thorin to unlock door"]],
  ["Tell Bombur to take the treasure and bring it here.", ["ask bombur to take treasure and bring it here"]],
  ["Ask Balin to guard the entrance while I search the cave.", ["ask balin to guard entrance while i search cave"]],
  ["Follow Gandalf into the tunnel and light the lantern.", ["follow gandalf into tunnel", "light lantern"]],
  ["Steal the cup from Smaug and return to the dwarves.", ["steal cup from smaug", "return to dwarves"]],
  ["Ask Elrond to read the map and explain it.", ["ask elrond to read map and explain it"]],
  ["Tell Bard about the secret door and follow him.", ["ask bard about secret door", "follow bard"]],
  ["Ask Gollum where the exit is and then run away.", ["ask gollum where exit is", "run away"]],
  ["Give the Arkenstone to Bard and tell him to negotiate with Thorin.", ["give arkenstone to bard", "ask bard to negotiate with thorin"]],
  ["Gandalf, follow me.", ["ask gandalf to follow me"]],
  ["Tell Gandalf to seek Thorin.", ["ask gandalf to find thorin"]],
  ["Tell Gandalf to locate Thorin.", ["ask gandalf to find thorin"]],
  ["Tell Gandalf to track Thorin.", ["ask gandalf to find thorin"]],
  ["Tell Gandalf to go and find Thorin.", ["ask gandalf to find thorin"]],
  ["Tell Gandalf to look around for Thorin.", ["ask gandalf to look for thorin"]],
  ["Thorin, unlock the door.", ["ask thorin to unlock door"]],
  ["Bilbo gives the Arkenstone to Bard.", ["give arkenstone to bard"]],
  ["Tell Thorin that Gandalf wants to leave.", ["ask thorin that gandalf wants to leave"]],
  ["Ask Gandalf if he knows where Gollum is.", ["ask gandalf if he knows where gollum is"]],
  ["Get the key from Balin and give it to Thorin.", ["get key from balin", "give key to thorin"]],
  ["Take the sword, attack the goblin, and then follow Gandalf.", ["take sword", "kill goblin", "follow gandalf"]],
];

cases.push(...originalListCases.map(([input, expected], index) => ({
  name: `original list ${String(index + 1).padStart(3, "0")}`,
  input,
  expected,
})));

const compoundDelegationRecipients = [
  "Gandalf",
  "Thorin",
  "Bard",
  "Beorn",
  "Balin",
  "Dori",
  "Nori",
  "Ori",
  "Bombur",
  "Bofur",
];

const compoundDelegationTemplates = [
  {
    label: "give map read",
    input: (name) => `Give the map to ${name} and ask him to read it.`,
    expected: (name) => [`give map to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to read it`],
  },
  {
    label: "give key unlock",
    input: (name) => `Give the key to ${name} and ask him to unlock the door.`,
    expected: (name) => [`give key to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to unlock door`],
  },
  {
    label: "show map explain",
    input: (name) => `Show the map to ${name} and ask him to explain it.`,
    expected: (name) => [`show map to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to explain it`],
  },
  {
    label: "hand lantern light",
    input: (name) => `Hand the lantern to ${name} and tell him to light it.`,
    expected: (name) => [`hand lantern to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to light it`],
  },
  {
    label: "pass rope carry",
    input: (name) => `Pass the rope to ${name} and ask him to carry it.`,
    expected: (name) => [`pass rope to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to carry it`],
  },
  {
    label: "deliver note keep",
    input: (name) => `Deliver the note to ${name} and ask him to keep it safe.`,
    expected: (name) => [`deliver note to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to keep it safe`],
  },
  {
    label: "bring sword examine",
    input: (name) => `Bring the sword to ${name} and ask him to examine it.`,
    expected: (name) => [`bring sword to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to examine it`],
  },
  {
    label: "send book aloud",
    input: (name) => `Send the book to ${name} and ask him to read it aloud.`,
    expected: (name) => [`send book to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to read it aloud`],
  },
  {
    label: "return pipe later",
    input: (name) => `Return the pipe to ${name} and ask him to smoke it later.`,
    expected: (name) => [`return pipe to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to smoke it later`],
  },
  {
    label: "give rope follow",
    input: (name) => `Give the rope to ${name} and tell him to follow me.`,
    expected: (name) => [`give rope to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to follow me`],
  },
];

cases.push(...compoundDelegationRecipients.flatMap((name) => compoundDelegationTemplates.map((template) => ({
  name: `compound delegation ${name.toLowerCase()} ${template.label}`,
  input: template.input(name),
  expected: template.expected(name),
}))));

const freshComplexRecipients = ["Elrond", "Dwalin", "Fili", "Kili", "Oin", "Gloin", "Bifur", "Innkeeper", "Gandalf", "Thorin"];
const freshComplexTemplates = [
  {
    label: "show lantern place table",
    input: (name) => `Show the lantern to ${name} and ask him to place it on the table.`,
    expected: (name) => [`show lantern to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to place it on table`],
  },
  {
    label: "give parchment write",
    input: (name) => `Give the parchment to ${name} and ask him to write on it.`,
    expected: (name) => [`give parchment to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to write on it`],
  },
  {
    label: "hand seed cakes eat",
    input: (name) => `Hand the seed cakes to ${name} and tell him to eat them.`,
    expected: (name) => [`hand seed cakes to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to eat them`],
  },
  {
    label: "pass wine drink",
    input: (name) => `Pass the wine to ${name} and ask him to drink it.`,
    expected: (name) => [`pass wine to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to drink it`],
  },
  {
    label: "send rope tie roots",
    input: (name) => `Send the rope to ${name} and ask him to tie it to the roots.`,
    expected: (name) => [`send rope to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to tie it to roots`],
  },
  {
    label: "bring broken map mend",
    input: (name) => `Bring the broken map to ${name} and ask him to mend it.`,
    expected: (name) => [`bring broken map to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to mend it`],
  },
  {
    label: "deliver inkwell open",
    input: (name) => `Deliver the dark glass inkwell to ${name} and ask him to open it.`,
    expected: (name) => [`deliver dark glass inkwell to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to open it`],
  },
  {
    label: "return key put drawer",
    input: (name) => `Return the key to ${name} and ask him to put it in the little drawer.`,
    expected: (name) => [`return key to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to put it in little drawer`],
  },
  {
    label: "show rose smell",
    input: (name) => `Show the rose to ${name} and ask him to smell it.`,
    expected: (name) => [`show rose to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to smell it`],
  },
  {
    label: "give pipe store chest",
    input: (name) => `Give the pipe to ${name} and ask him to store it in the chest.`,
    expected: (name) => [`give pipe to ${name.toLowerCase()}`, `ask ${name.toLowerCase()} to store it in chest`],
  },
];

cases.push(...freshComplexRecipients.flatMap((name) => freshComplexTemplates.map((template) => ({
  name: `fresh complex ${name.toLowerCase()} ${template.label}`,
  input: template.input(name),
  expected: template.expected(name),
}))));

const dialogueCases = [
  ["BILBO: Gandalf, are you certain this is the right path?", "Gandalf says 'It is the safest path available to us.'"],
  ["BILBO: Thorin, what lies beyond those hills?", "Thorin says 'The road to our homeland, if fortune favors us.'"],
  ["BILBO: Thorin, should we make camp here?", "Thorin says 'Not yet. We must put more distance behind us.'"],
  ["BILBO: Gandalf, do you expect trouble tonight?", "Gandalf says 'Trouble often arrives when it is least expected.'"],
  ["BILBO: Elrond, can you read these markings?", "Elrond says 'Yes, but their meaning is hidden to most eyes.'"],
  ["BILBO: Elrond, what does the map reveal?", "Elrond says 'A secret entrance and a narrow chance of success.'"],
  ["BILBO: Beorn, may we stay the night?", "Beorn says 'You may, provided you cause no mischief.'"],
  ["BILBO: Beorn, what dangers await in Mirkwood?", "Beorn says 'Many, and few travelers return unchanged.'"],
  ["BILBO: Bard, do you trust Thorin?", "Bard says 'I trust his courage more than his judgment.'"],
  ["THORIN: Bilbo, have you seen the Arkenstone?", "Bilbo says 'Not since we entered the mountain.'"],
  ["THORIN: Gandalf, why have you returned?", "Gandalf says 'Because events are moving faster than expected.'"],
  ["THORIN: Elrond, can you help us?", "Elrond says 'Advice I can offer; victory you must earn.'"],
  ["THORIN: Beorn, will you aid our cause?", "Beorn says 'If your cause is just, perhaps.'"],
  ["THORIN: Bard, what do the people want?", "Bard says 'Fair treatment and a share of what was promised.'"],
  ["GANDALF: Bilbo, what did you discover?", "Bilbo says 'A passage leading deeper underground.'"],
  ["GANDALF: Thorin, are your companions ready?", "Thorin says 'Ready or not, we must proceed.'"],
  ["GANDALF: Elrond, what do you make of this sign?", "Elrond says 'It warns of old powers at work.'"],
  ["GANDALF: Beorn, have enemies crossed your lands?", "Beorn says 'More than usual, and that concerns me.'"],
  ["GANDALF: Bard, can peace still be achieved?", "Bard says 'Only if pride yields to reason.'"],
  ["ELROND: Bilbo, what troubles you?", "Bilbo says 'The feeling that we are being watched.'"],
  ["ELROND: Thorin, what do you seek above all?", "Thorin says 'My kingdom restored.'"],
  ["ELROND: Gandalf, why choose a hobbit?", "Gandalf says 'Because others overlook what hobbits can do.'"],
  ["ELROND: Beorn, what news do you bring?", "Beorn says 'Wolves and goblins have been seen together.'"],
  ["ELROND: Bard, what is your greatest concern?", "Bard says 'The safety of my people.'"],
  ["BEORN: Bilbo, can you handle a pony?", "Bilbo says 'Better than I can handle a dragon.'"],
  ["BEORN: Thorin, how long will your quest take?", "Thorin says 'Longer than I would like.'"],
  ["BEORN: Gandalf, what is your plan?", "Gandalf says 'To stay one step ahead of disaster.'"],
  ["BEORN: Elrond, do you trust these travelers?", "Elrond says 'Enough to offer them shelter.'"],
  ["BEORN: Bard, have you faced Smaug?", "Bard says 'Only from a distance.'"],
  ["BARD: Bilbo, what did you see inside?", "Bilbo says 'Treasure beyond counting.'"],
  ["BARD: Thorin, will you honor your word?", "Thorin says 'I intend to.'"],
  ["BARD: Gandalf, what happens next?", "Gandalf says 'That depends on choices made today.'"],
  ["BARD: Elrond, would you have acted differently?", "Elrond says 'Wisdom is easier after the fact.'"],
  ["BARD: Beorn, will you stand with us?", "Beorn says 'Against tyranny, yes.'"],
  ["BILBO: Thorin, listen to reason.", "Thorin says 'Reason is difficult when one's heart is burdened.'"],
  ["THORIN: Bilbo, why are you hesitant?", "Bilbo says 'Because courage and caution are both necessary.'"],
  ["GANDALF: Bilbo, do you regret coming?", "Bilbo says 'Often, but never completely.'"],
  ["ELROND: Bilbo, what have you learned?", "Bilbo says 'That small people can influence great events.'"],
  ["BEORN: Bilbo, are you hungry?", "Bilbo says 'That is rarely a difficult question.'"],
  ["BARD: Bilbo, whom do you support?", "Bilbo says 'Whoever seeks a fair outcome.'"],
  ["THORIN: Gandalf, can we trust Bard?", "Gandalf says 'Trust must be built, not assumed.'"],
  ["GANDALF: Thorin, what matters most now?", "Thorin says 'Preventing our hard-won victory from becoming a disaster.'"],
  ["ELROND: Thorin, what do you fear?", "Thorin says 'Losing what I fought to reclaim.'"],
  ["BEORN: Gandalf, are we too late?", "Gandalf says 'Not yet.'"],
  ["BARD: Thorin, is there room for compromise?", "Thorin says 'There may be, though I do not welcome it.'"],
  ["BILBO: Gandalf, what should I do?", "Gandalf says 'The next right thing.'"],
  ["THORIN: Bilbo, will you stand with us?", "Bilbo says 'I will stand for what is right.'"],
  ["GANDALF: Bilbo, are you ready?", "Bilbo says 'As ready as I am likely to be.'"],
  ["BARD: Bilbo, what kind of hero are you?", "Bilbo says 'The reluctant kind.'"],
  ["ELROND: Gandalf, do you still believe in him?", "Gandalf says 'More than ever.'"],
  ["Gandalf, are you certain this is the right path?", "Gandalf says 'It is the safest path available to us.'"],
];

const gameCases = [
  {
    name: "help gives beginner-friendly onboarding",
    inputs: ["help"],
    expectedIncluded: [
      'Try simple commands such as "look", "exits", "inventory", "take map from Gandalf", or "open door".',
      'For guidance, type "tips". To see recognized verbs, type "commands" or "verbs". Safe moments are marked automatically; type "load" to open them.',
    ],
    notExpectedIncluded: ["Please specify your action and the object."],
  },
  {
    name: "where am i maps to location",
    inputs: ["where am i"],
    expectedIncluded: ["You are now in Hobbit Hole."],
    notExpectedIncluded: ["Questions are not supported as commands yet."],
  },
  {
    name: "what can i do maps to help",
    inputs: ["what can i do"],
    expectedIncluded: [
      'Try simple commands such as "look", "exits", "inventory", "take map from Gandalf", or "open door".',
    ],
    notExpectedIncluded: ["Questions are not supported as commands yet."],
  },
  {
    name: "held item guidance suggests next command",
    inputs: ["take map"],
    expectedIncluded: [
      "Gandalf is carrying the curious map.",
      'Try "ask Gandalf for curious map" or "take curious map from Gandalf".',
    ],
  },
  {
    name: "what am i carrying maps to inventory",
    inputs: ["what am i carrying"],
    expectedIncluded: ["You are carrying: nothing. Overall it is no burden at all."],
    notExpectedIncluded: ["Questions are not supported as commands yet."],
  },
  {
    name: "whats in here maps to look",
    inputs: ["what's in here"],
    expectedIncluded: ["You are in Bilbo's round front hall"],
    notExpectedIncluded: ["Questions are not supported as commands yet."],
  },
  {
    name: "where should i go maps to exits",
    inputs: ["where should i go"],
    expectedIncluded: ["From here, east leads to Bilbo's garden, west to the parlour, south to the dining room, and northeast to the study."],
    notExpectedIncluded: ["Questions are not supported as commands yet."],
  },
  {
    name: "talk defaults to sole visible character",
    inputs: ["talk"],
    expectedIncluded: ["Gandalf listens intently, expecting your words."],
    notExpectedIncluded: ["You speak, but only silence meets your words."],
  },
  {
    name: "can i talk to someone defaults to sole visible character",
    inputs: ["can i talk to someone"],
    expectedIncluded: ["Gandalf listens intently, expecting your words."],
    notExpectedIncluded: ["You speak, but only silence meets your words."],
  },
  {
    name: "ask about topic defaults to sole visible character",
    inputs: ["ask about the treasure"],
    expectedIncluded: ["Gandalf considers treasure, but gives no clear answer."],
    notExpectedIncluded: ["Use: ask [character] for [item], or ask [character] to [command]."],
  },
  {
    name: "can you help me defaults to visible guide",
    inputs: ["can you help me"],
    expectedIncluded: ["Gandalf says 'Begin with what lies before you. Look about, mind the exits, and do not hesitate to ask for the map when you are ready.'"],
    notExpectedIncluded: ['Try simple commands such as "look", "exits", "inventory", "take map from Gandalf", or "open door".'],
  },
  {
    name: "look alias l works",
    inputs: ["l"],
    expectedIncluded: ["You are in Bilbo's round front hall"],
    notExpectedIncluded: ["Please specify your action and the object."],
  },
  {
    name: "examine alias x works",
    inputs: ["x door"],
    expectedIncluded: ["You see the round green door. It is closed."],
    notExpectedIncluded: ["I'm not sure how to do that."],
  },
  {
    name: "go forward gives directional guidance",
    inputs: ["go forward"],
    expectedIncluded: [
      "You'll need to choose a direction from the exits available here.",
      "From here, east leads to Bilbo's garden, west to the parlour, south to the dining room, and northeast to the study.",
    ],
    notExpectedIncluded: ['That direction is not recognized. Type "go <direction>" or "go through <door name>".'],
  },
  {
    name: "drop everything is friendly when inventory is empty",
    inputs: ["drop everything"],
    expectedIncluded: ["You are not carrying anything to leave."],
    notExpectedIncluded: ["You don't have the everything."],
  },
  {
    name: "profanity outburst is rebuked by visible guide",
    inputs: ["fuck this"],
    expectedIncluded: ["Gandalf raises an eyebrow. 'Steady on, Bilbo. Plain words will serve you better than that.'"],
    notExpectedIncluded: ["I'm not sure how to do that."],
  },
  {
    name: "profanity filler does not block a valid command",
    inputs: ["open the fucking door"],
    expectedIncluded: ["You open the round green door."],
    notExpectedIncluded: ["I'm not sure how to do that."],
  },
  {
    name: "narrator rebukes profanity when no one is around",
    inputs: ["vaffanculo"],
    setup(game) {
      movePlayerTo(game, "lane_beneath_hill");
      for (const character of Object.values(game.characters)) {
        if (character.id !== game.player.id) character.position = "rivendell";
      }
    },
    clearOutputAfterSetup: true,
    expectedIncluded: ["Your outburst echoes uselessly. A clearer command would serve you better."],
    notExpectedIncluded: ["I'm not sure how to do that."],
  },
  {
    name: "modern look question maps to room description",
    inputs: ["what do i see"],
    expectedIncluded: ["You are in Bilbo's round front hall"],
    notExpectedIncluded: ["Questions are not supported as commands yet."],
  },
  {
    name: "move east is treated as movement",
    inputs: ["move east", "location"],
    expectedIncluded: ["You are now in Hobbit Hole."],
    notExpectedIncluded: ["You cannot find the east to move."],
  },
  {
    name: "continue walking reuses forward guidance",
    inputs: ["continue walking"],
    expectedIncluded: [
      "You'll need to choose a direction from the exits available here.",
      "From here, east leads to Bilbo's garden, west to the parlour, south to the dining room, and northeast to the study.",
    ],
    notExpectedIncluded: ["I'm not sure how to do that."],
  },
  {
    name: "ask for directions maps to exits",
    inputs: ["ask for directions"],
    expectedIncluded: ["From here, east leads to Bilbo's garden, west to the parlour, south to the dining room, and northeast to the study."],
    notExpectedIncluded: ["Use: ask [character] for [item], or ask [character] to [command]."],
  },
  {
    name: "hint aliases to tips",
    inputs: ["hint"],
    expectedIncluded: ["The carpet appears to be concealing something."],
    notExpectedIncluded: ["I'm not sure how to do that."],
  },
  {
    name: "health question maps to status",
    inputs: ["check my health"],
    expectedIncluded: ["Strength: 5. You are badly worn down. Overall it is no burden at all."],
    notExpectedIncluded: ["Questions are not supported as commands yet."],
  },
  {
    name: "inv aliases to inventory",
    inputs: ["inv"],
    expectedIncluded: ["You are carrying: nothing. Overall it is no burden at all."],
    notExpectedIncluded: ["Please specify your action and the object."],
  },
  {
    name: "show controls maps to help",
    inputs: ["show controls"],
    expectedIncluded: ['Try simple commands such as "look", "exits", "inventory", "take map from Gandalf", or "open door".'],
    notExpectedIncluded: ["I'm not sure how to do that."],
  },
  {
    name: "autosave command uses autosave system response",
    inputs: ["autosave"],
    expectedIncluded: ["No safe moment has been marked for your return."],
    notExpectedIncluded: ['No saved game named "autosave" was found.'],
  },
  {
    name: "undo command gives friendly unsupported message",
    inputs: ["undo"],
    expectedIncluded: ["Undo is not available here. If you need safety, use 'load' to open your safe moments."],
    notExpectedIncluded: ["Please specify your action and the object."],
  },
  {
    name: "save command explains autosave-only flow",
    drive(game) {
      game.execute("save");
      game.print(`Save panel: ${game.savePanelState?.open ? "open" : "closed"}`);
    },
    expectedIncluded: [
      "Safe moments are marked automatically after dangerous scenes.",
      "Type 'load' to choose one.",
      "Save panel: closed",
    ],
    notExpectedIncluded: [
      "Named saves are no longer used.",
    ],
  },
  {
    name: "speak with gandalf maps to talk",
    inputs: ["speak with gandalf"],
    expectedIncluded: ["Gandalf listens intently, expecting your words."],
    notExpectedIncluded: ["You speak, but only silence meets your words."],
  },
  {
    name: "speak to him uses remembered pronoun target",
    inputs: ["talk to gandalf", "speak to him"],
    expectedIncluded: ["Gandalf listens intently, expecting your words."],
    notExpectedIncluded: ["You speak, but only silence meets your words."],
  },
  {
    name: "talk to previously encountered absent character remembers them",
    setup(game) {
      game.visiblePeopleInRoom();
      game.characters.gandalf.position = "rivendell";
    },
    clearOutputAfterSetup: true,
    inputs: ["talk to gandalf"],
    expectedIncluded: ["Gandalf is not here just now."],
    notExpectedIncluded: ["You speak, but only silence meets your words.", "There is no one named gandalf here."],
  },
  {
    name: "ask previously encountered absent character remembers them",
    setup(game) {
      game.visiblePeopleInRoom();
      game.characters.gandalf.position = "rivendell";
    },
    clearOutputAfterSetup: true,
    inputs: ["ask gandalf for help"],
    expectedIncluded: ["Gandalf is not here just now."],
    notExpectedIncluded: ["You speak, but only silence meets your words.", "There is no one named gandalf here."],
  },
  {
    name: "follow previously encountered absent character remembers them",
    setup(game) {
      game.visiblePeopleInRoom();
      game.characters.gandalf.position = "rivendell";
    },
    clearOutputAfterSetup: true,
    inputs: ["follow gandalf"],
    expectedIncluded: ["Gandalf is not here just now."],
    notExpectedIncluded: ["There is no one named gandalf here to follow."],
  },
  {
    name: "ask gandalf for help gives onboarding advice",
    inputs: ["ask gandalf for help"],
    expectedIncluded: [
      "Gandalf says 'Begin with what lies before you. Look about, mind the exits, and do not hesitate to ask for the map when you are ready.'",
    ],
    notExpectedIncluded: ["Gandalf does not have the help."],
  },
  {
    name: "leave house maps to going outside",
    inputs: ["leave house", "location"],
    expectedIncluded: ["You are now in Bilbo's garden."],
    notExpectedIncluded: ["You don't have the house."],
  },
  {
    name: "go outside opens the front door when needed",
    inputs: ["go outside", "location"],
    expectedIncluded: ["You open the round green door.", "You are now in Bilbo's garden."],
    notExpectedIncluded: ["The round green door is closed."],
  },
  {
    name: "get out maps to going outside",
    inputs: ["get out", "location"],
    expectedIncluded: ["You open the round green door.", "You are now in Bilbo's garden."],
    notExpectedIncluded: ["I don't see that here.", "The round green door is closed."],
  },
  {
    name: "get out quickly still maps to going outside",
    inputs: ["get out quickly", "location"],
    expectedIncluded: ["You open the round green door.", "You are now in Bilbo's garden."],
    notExpectedIncluded: ["I don't see that here.", "The round green door is closed."],
  },
  {
    name: "get in maps to going inside",
    inputs: ["go outside", "get in", "location"],
    expectedIncluded: ["You are now in Hobbit Hole."],
    notExpectedIncluded: ["I don't see that here.", "You don't have the in."],
  },
  {
    name: "come out maps to going outside",
    inputs: ["come out", "location"],
    expectedIncluded: ["You open the round green door.", "You are now in Bilbo's garden."],
    notExpectedIncluded: ["I don't see that here."],
  },
  {
    name: "head out maps to going outside",
    inputs: ["head out", "location"],
    expectedIncluded: ["You open the round green door.", "You are now in Bilbo's garden."],
    notExpectedIncluded: ["I don't see that here."],
  },
  {
    name: "leave alone maps to going outside",
    inputs: ["leave", "location"],
    expectedIncluded: ["You open the round green door.", "You are now in Bilbo's garden."],
    notExpectedIncluded: ["Please specify your action and the object."],
  },
  {
    name: "enter alone maps to going inside from the garden",
    inputs: ["go outside", "enter", "location"],
    expectedIncluded: ["You are now in Hobbit Hole."],
    notExpectedIncluded: ["Please specify your action and the object."],
  },
  {
    name: "natural leave intent maps to going outside in game",
    inputs: ["i want to leave", "location"],
    expectedIncluded: ["You are now in Bilbo's garden."],
    notExpectedIncluded: ["Please specify your action and the object."],
  },
  {
    name: "id like to go outside works in game",
    inputs: ["i'd like to go outside", "location"],
    expectedIncluded: ["You are now in Bilbo's garden."],
    notExpectedIncluded: ["I'm not sure how to do that."],
  },
  {
    name: "let me out works in game",
    inputs: ["let me out", "location"],
    expectedIncluded: ["You are now in Bilbo's garden."],
    notExpectedIncluded: ["I'm not sure how to do that."],
  },
  {
    name: "show inventory maps to inventory",
    inputs: ["show inventory"],
    expectedIncluded: ["You are carrying: nothing. Overall it is no burden at all."],
    notExpectedIncluded: ["Please specify your action and the object."],
  },
  {
    name: "good morning maps to hello",
    inputs: ["good morning"],
    expectedIncluded: ["Gandalf says hello to you."],
    notExpectedIncluded: ["I'm not sure how to do that."],
  },
  {
    name: "say hello to gandalf greets the named character",
    setup(game) {
      placeCharacterWithPlayer(game, "gandalf");
      placeCharacterWithPlayer(game, "thorin");
    },
    inputs: ["say hello to gandalf"],
    expectedIncluded: ["Gandalf says hello to you."],
    notExpectedIncluded: ["You speak, but only silence meets your words.", "Thorin says hello to you."],
  },
  {
    name: "say hi to gandalf also greets the named character",
    setup(game) {
      placeCharacterWithPlayer(game, "gandalf");
      placeCharacterWithPlayer(game, "thorin");
    },
    inputs: ["say hi to gandalf"],
    expectedIncluded: ["Gandalf says hello to you."],
    notExpectedIncluded: ["You speak, but only silence meets your words.", "Thorin says hello to you."],
  },
  {
    name: "say hello to elrond greets only elrond",
    setup(game) {
      movePlayerTo(game, "rivendell");
      placeCharacterWithPlayer(game, "gandalf");
      placeCharacterWithPlayer(game, "elrond");
    },
    inputs: ["say hello to elrond"],
    expectedIncluded: ["Elrond says hello to you."],
    notExpectedIncluded: ["You speak, but only silence meets your words.", "Gandalf says hello to you."],
  },
  {
    name: "killed enemy leaves a body in the room description",
    setup(game) {
      addHostileTestCharacter(game);
    },
    inputs: ["kill goblin", "look"],
    expectedIncluded: ["The body of the goblin lies here."],
    notExpectedIncluded: ["The goblin is here."],
  },
  {
    name: "enemy lines in room descriptions use danger styling",
    setup(game) {
      movePlayerTo(game, "bilbos_garden");
      addHostileTestCharacter(game);
    },
    drive(game) {
      const outputElement = document.getElementById("output");
      outputElement.replaceChildren();
      game.execute("look");
      const liveLine = outputElement.children.find((line) => line.textContent.includes("goblin is here."));
      const liveDanger = liveLine?.className.includes("danger") ? "yes" : "no";

      game.execute("kill goblin");
      outputElement.replaceChildren();
      game.execute("look");
      const corpseLine = outputElement.children.find((line) => line.textContent === "The body of the goblin lies here.");
      const deadDanger = corpseLine?.className.includes("danger") ? "yes" : "no";
      game.print(`Live enemy line danger: ${liveDanger}`);
      game.print(`Dead enemy line danger: ${deadDanger}`);
    },
    expectedIncluded: [
      "Live enemy line danger: yes",
      "Dead enemy line danger: yes",
    ],
  },
  {
    name: "hostile arrival notices use danger styling",
    setup(game) {
      movePlayerTo(game, "bilbos_garden");
      addHostileTestCharacter(game, "test_warg", { name: "vicious warg", position: "pantry", strength: 6 });
    },
    drive(game) {
      const outputElement = document.getElementById("output");
      const originalSetTimeout = global.setTimeout;
      try {
        global.setTimeout = (fn) => {
          fn();
          return 0;
        };
        outputElement.replaceChildren();
        game.moveCharacter(game.characters.test_warg, game.currentRoom, "west");
        const arrivalLine = outputElement.children.find((line) => line.textContent.includes("vicious warg enters."));
        game.print(`Hostile arrival line danger: ${arrivalLine?.className.includes("danger") ? "yes" : "no"}`);
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    },
    expectedIncluded: [
      "Hostile arrival line danger: yes",
    ],
  },
  {
    name: "dead enemy can be examined by name",
    setup(game) {
      addHostileTestCharacter(game);
    },
    inputs: ["kill goblin", "examine goblin"],
    expectedIncluded: ["You see the body of the goblin lying where the struggle ended"],
    notExpectedIncluded: ["There is no one named goblin here."],
  },
  {
    name: "dead enemy can be examined as a body",
    setup(game) {
      addHostileTestCharacter(game);
    },
    inputs: ["kill goblin", "examine body"],
    expectedIncluded: ["You see the body of the goblin lying where the struggle ended"],
    notExpectedIncluded: ["I don't see that here."],
  },
  {
    name: "enemy body survives a short offstage absence",
    setup(game) {
      addHostileTestCharacter(game);
    },
    drive(game) {
      game.execute("kill goblin");
      game.execute("go outside");
      for (let index = 0; index < 9; index += 1) game.execute("wait");
      outputLines.length = 0;
      game.execute("go inside");
    },
    expectedIncluded: ["The body of the goblin lies here."],
    notExpectedIncluded: ["The goblin is here."],
  },
  {
    name: "enemy body disappears after more than ten offstage turns",
    setup(game) {
      addHostileTestCharacter(game);
    },
    drive(game) {
      game.execute("kill goblin");
      game.execute("go outside");
      for (let index = 0; index < 10; index += 1) game.execute("wait");
      outputLines.length = 0;
      game.execute("go inside");
    },
    expectedIncluded: ["You are in Bilbo's round front hall"],
    notExpectedIncluded: ["The body of the goblin lies here.", "The goblin is here."],
  },
  {
    name: "say hello to all greets the visible group",
    setup(game) {
      placeCharacterWithPlayer(game, "gandalf");
      placeCharacterWithPlayer(game, "thorin");
    },
    inputs: ["say hello to all"],
    expectedIncluded: ["Gandalf and Thorin answer your greeting."],
    notExpectedIncluded: ["You speak, but only silence meets your words.", "Thorin says hello to you."],
  },
  {
    name: "say hi to everyone also greets the visible group",
    setup(game) {
      placeCharacterWithPlayer(game, "gandalf");
      placeCharacterWithPlayer(game, "thorin");
    },
    inputs: ["say hi to everyone"],
    expectedIncluded: ["Gandalf and Thorin answer your greeting."],
    notExpectedIncluded: ["You speak, but only silence meets your words.", "Thorin says hello to you."],
  },
  {
    name: "plain hello to a group uses a collective response",
    setup(game) {
      placeCharacterWithPlayer(game, "gandalf");
      placeCharacterWithPlayer(game, "thorin");
    },
    inputs: ["hello"],
    expectedIncluded: ["Gandalf and Thorin answer your greeting."],
    notExpectedIncluded: ["Thorin says hello to you."],
  },
  {
    name: "talk to him defaults to visible character",
    inputs: ["talk to him"],
    expectedIncluded: ["Gandalf listens intently, expecting your words."],
    notExpectedIncluded: ["I don't know who \"him\" refers to."],
  },
  {
    name: "follow him defaults to visible character",
    inputs: ["follow him"],
    expectedIncluded: ["You follow Gandalf as closely as you can."],
    notExpectedIncluded: ["I don't know who \"him\" refers to."],
  },
  {
    name: "bare open asks for an object",
    inputs: ["open"],
    expectedIncluded: ["Open what?"],
    notExpectedIncluded: ["Please specify your action and the object."],
  },
  {
    name: "bare close asks for an object",
    inputs: ["close"],
    expectedIncluded: ["Close what?"],
    notExpectedIncluded: ["Please specify your action and the object."],
  },
  {
    name: "bare unlock asks for an object",
    inputs: ["unlock"],
    expectedIncluded: ["Unlock what?"],
    notExpectedIncluded: ["Please specify your action and the object."],
  },
  {
    name: "bare read asks for an object",
    inputs: ["read"],
    expectedIncluded: ["Read what?"],
    notExpectedIncluded: ["Please specify your action and the object."],
  },
  {
    name: "bare climb asks where",
    inputs: ["climb"],
    expectedIncluded: ["Climb where?"],
    notExpectedIncluded: ["Please specify your action and the object."],
  },
  {
    name: "unresolved object pronoun asks what it means",
    inputs: ["take it"],
    expectedIncluded: ['What do you mean by "it"?'],
    notExpectedIncluded: ["I don't see that here."],
  },
  {
    name: "unresolved object pronoun in open asks what it means",
    inputs: ["open it"],
    expectedIncluded: ['What do you mean by "it"?'],
    notExpectedIncluded: ["I don't see that here."],
  },
  {
    name: "unresolved object pronoun in give asks what it means",
    inputs: ["give it to gandalf"],
    expectedIncluded: ['What do you mean by "it"?'],
    notExpectedIncluded: ["You do not have it."],
  },
  {
    name: "resolved object pronoun still works after context",
    inputs: ["take map from gandalf", "open it"],
    expectedIncluded: [
      "You take the curious map from Gandalf.",
      "You unfold the curious map. You see a map with strange markings.",
    ],
    notExpectedIncluded: ['What do you mean by "it"?'],
  },
  {
    name: "talk to gandalf about treasure works naturally",
    inputs: ["talk to gandalf about treasure"],
    expectedIncluded: ["Gandalf considers treasure, but gives no clear answer."],
    notExpectedIncluded: ["Gandalf listens intently, expecting your words."],
  },
  {
    name: "look around remains a room command",
    inputs: ["look around"],
    expectedIncluded: ["You are in Bilbo's round front hall"],
    notExpectedIncluded: ["Please specify your action and the object."],
  },
  {
    name: "wait remains a supported single-word command",
    inputs: ["wait"],
    expectedIncluded: ["You wait."],
    notExpectedIncluded: ["Please specify your action and the object."],
  },
  {
    name: "sleep remains a supported single-word command",
    inputs: ["sleep"],
    expectedIncluded: ["You sleep for a while, but dreams do not move the adventure on."],
    notExpectedIncluded: ["Please specify your action and the object."],
  },
  {
    name: "run away remains a supported natural command",
    inputs: ["run away"],
    expectedIncluded: ["You run away, but nothing happens."],
    notExpectedIncluded: ["Please specify your action and the object."],
  },
  {
    name: "ask where is keeps the full question",
    inputs: ["ask gandalf where is thorin"],
    expectedIncluded: ["Gandalf considers where thorin is, but gives no clear answer."],
  },
  {
    name: "ask where to go stays a conversation topic",
    inputs: ["ask gandalf where to go"],
    expectedIncluded: ["Gandalf considers where to go, but gives no clear answer."],
  },
  {
    name: "follow-up where question uses last conversation context",
    inputs: ["ask gandalf where is thorin", "where is he?"],
    expectedIncluded: ["Gandalf considers where thorin is, but gives no clear answer."],
  },
  {
    name: "vocative where question becomes ask",
    inputs: ["gandalf, where is thorin?"],
    expectedIncluded: ["Gandalf considers where thorin is, but gives no clear answer."],
  },
  {
    name: "ask for known character becomes location question",
    inputs: ["ask gandalf for thorin"],
    expectedIncluded: ["Gandalf considers where thorin is, but gives no clear answer."],
  },
  {
    name: "delegated look for stays delegated",
    inputs: ["tell gandalf to look for thorin"],
    expectedIncluded: ["There is no one named Thorin here."],
    notExpectedIncluded: ["There is no one named gandalf to look here."],
  },
  {
    name: "delegated look for without to is normalized",
    inputs: ["tell gandalf look for thorin"],
    expectedIncluded: ["There is no one named Thorin here."],
    notExpectedIncluded: ["There is no one named gandalf look here."],
  },
  {
    name: "delegated look for with comma is normalized",
    inputs: ["tell gandalf, look for thorin"],
    expectedIncluded: ["There is no one named Thorin here."],
    notExpectedIncluded: ["Use: ask [character] for [item], or ask [character] to [command]."],
  },
  {
    name: "delegated seek is treated as find",
    inputs: ["tell gandalf to seek thorin"],
    expectedIncluded: ["There is no one named Thorin here."],
    notExpectedIncluded: ["I'm not sure how to do that."],
  },
  {
    name: "delegated locate is treated as find",
    inputs: ["tell gandalf to locate thorin"],
    expectedIncluded: ["There is no one named Thorin here."],
    notExpectedIncluded: ["I'm not sure how to do that."],
  },
  {
    name: "delegated track is treated as find",
    inputs: ["tell gandalf to track thorin"],
    expectedIncluded: ["There is no one named Thorin here."],
    notExpectedIncluded: ["I'm not sure how to do that."],
  },
  {
    name: "delegated go and find collapses to find",
    inputs: ["tell gandalf to go and find thorin"],
    expectedIncluded: ["There is no one named Thorin here."],
    notExpectedIncluded: ["Please specify your action and the object. For example, type 'open door' or 'climb into tree'."],
  },
  {
    name: "delegated look around for drops filler",
    inputs: ["tell gandalf to look around for thorin"],
    expectedIncluded: ["There is no one named Thorin here."],
    notExpectedIncluded: ["Gandalf finds nothing special about the for thorin."],
  },
  {
    name: "delegated look for scoped character keeps subject",
    inputs: ["tell gandalf to look for thorin in the forest"],
    expectedIncluded: ["There is no one named Thorin here."],
  },
  {
    name: "look for character examines the character",
    inputs: ["look for thorin"],
    expectedIncluded: ["There is no one named Thorin here."],
  },
  {
    name: "ask pronoun for held item resolves visible holder",
    inputs: ["get map", "ask him for the map"],
    expectedIncluded: ["Gandalf is carrying the curious map.", "Gandalf gives you the curious map."],
    notExpectedIncluded: ["There is no one named him here.", "There is no one named map here."],
  },
  {
    name: "broken map cannot be read as intact",
    inputs: ["ask gandalf for the map", "break map", "read map"],
    expectedIncluded: ["You try to read the broken curious map, but its markings are torn into useless fragments."],
  },
  {
    name: "broken map examination mentions damage",
    inputs: ["ask gandalf for the map", "break map", "examine map"],
    expectedIncluded: ["You see the broken remains of the curious map. Its markings are torn into useless fragments."],
  },
  {
    name: "open map unfolds readable map",
    inputs: ["ask gandalf for the map", "open map"],
    expectedIncluded: ["You unfold the curious map. You see a map with strange markings."],
  },
  {
    name: "close map folds unfolded map",
    inputs: ["ask gandalf for the map", "open map", "close map"],
    expectedIncluded: ["You fold the curious map."],
  },
  {
    name: "close folded map says already folded",
    inputs: ["ask gandalf for the map", "close map"],
    expectedIncluded: ["The curious map is already folded."],
  },
  {
    name: "open broken map notices fragments",
    inputs: ["ask gandalf for the map", "break map", "open map"],
    expectedIncluded: ["You try to unfold the broken curious map, but it only separates into useless fragments."],
  },
  {
    name: "close broken map notices fragments",
    inputs: ["ask gandalf for the map", "break map", "close map"],
    expectedIncluded: ["The broken curious map cannot be folded neatly."],
  },
  {
    name: "mended map can be read again",
    inputs: ["ask gandalf for the map", "break map", "mend map", "read map"],
    expectedIncluded: [
      "You carefully piece the curious map back together. It is readable again, though the joins are still visible.",
      "You read the carefully mended curious map. You see a map with strange markings, its torn lines pieced back together.",
    ],
  },
  {
    name: "mended map examination mentions repair",
    inputs: ["ask gandalf for the map", "break map", "repair map", "examine map"],
    expectedIncluded: ["You see a carefully mended map with strange markings. The torn lines have been pieced back together, though the joins are still visible."],
  },
  {
    name: "open mended map mentions repair",
    inputs: ["ask gandalf for the map", "break map", "mend map", "open map"],
    expectedIncluded: ["You carefully unfold the mended curious map. The strange markings are readable again, though the joins are still visible."],
  },
  {
    name: "close mended map mentions repair",
    inputs: ["ask gandalf for the map", "break map", "mend map", "open map", "close map"],
    expectedIncluded: ["You carefully fold the mended curious map, keeping the repaired joins aligned."],
  },
  {
    name: "new command clears unresolved clarification",
    inputs: ["open books", "look under carpet"],
    expectedIncluded: ["Under the carpet there is a small key."],
  },
  {
    name: "delegated movement does not describe npc destination",
    inputs: ["tell gandalf to open the door and go east"],
    expectedIncluded: ["Gandalf opens the round green door.", "Gandalf goes east."],
    notExpectedIncluded: ["You are in a beautiful garden, amidst verdant foliage and blossoms bright."],
  },
  {
    name: "delegated follow me sets follower message",
    inputs: ["tell gandalf to follow me"],
    expectedIncluded: ["Gandalf follows you as closely as possible."],
    notExpectedIncluded: ["You follow You as closely as you can."],
  },
  {
    name: "friendly npc can soften a literal wait order",
    inputs: ["tell gandalf to wait until dawn"],
    expectedIncluded: [
      "Gandalf says 'I will wait a while, but not forever.'",
      "Gandalf waits.",
    ],
  },
  {
    name: "friendly npc can refuse to give up a protected item",
    inputs: ["tell gandalf to give the map to me"],
    expectedIncluded: ["Gandalf says 'I think the curious map is safer in my hands for now.'"],
    notExpectedIncluded: ["Gandalf gives you the curious map."],
  },
  {
    name: "friendly npc can change mind progressively about map",
    inputs: [
      "tell gandalf to give the map to me",
      "tell gandalf to give the map to me",
      "tell gandalf to give the map to me",
    ],
    expectedIncluded: [
      "Gandalf says 'I think the curious map is safer in my hands for now.'",
      "Gandalf says 'You may have it soon, but let me keep it a little longer.'",
      "Gandalf sighs and says 'Very well. Take it, and use it wisely.'",
      "Gandalf gives the curious map to you.",
    ],
  },
  {
    name: "say to delegated movement keeps npc actor",
    inputs: ["say to gandalf to open the door and go east"],
    expectedIncluded: ["Gandalf opens the round green door.", "Gandalf goes east."],
    notExpectedIncluded: ["You are in a beautiful garden, amidst verdant foliage and blossoms bright."],
  },
  {
    name: "vocative modal order to thorin works naturally",
    setup(game) {
      game.currentRoom = "green_dragon_inn";
      game.player.position = "green_dragon_inn";
      placeCharacterWithPlayer(game, "thorin");
    },
    inputs: ["Thorin, could you take a look through the window?"],
    expectedIncluded: [
      "Thorin stretches to reach the window.",
      "He peers through the window, his eyes narrowing, but it's too dark to see anything.",
    ],
    notExpectedIncluded: ["I don't see that here."],
  },
  {
    name: "thorin is re-anchored to the inn for the pony scene",
    setup(game) {
      game.currentRoom = "green_dragon_inn";
      game.player.position = "green_dragon_inn";
      game.characters.thorin.position = "bag_end_parlour";
      game.companionDirector.sync();
    },
    inputs: ["Thorin, could you take a look through the window?"],
    expectedIncluded: [
      "Thorin stretches to reach the window.",
      "He peers through the window, his eyes narrowing, but it's too dark to see anything.",
    ],
    notExpectedIncluded: [
      "There is no one named Thorin here.",
      "There is no one named thorin here.",
    ],
  },
  {
    name: "green dragon pony preparation now lands in readable stages",
    drive(game) {
      game.execute("jump green_dragon");
      game.doors.porta_green_dragon_inn_green_dragon_inn_outside.open = true;
      game.flags.lanternon = true;
      game.items.low_branch.visible = true;
      placeCharacterWithPlayer(game, "thorin");
      game.execute("ask thorin to look through window");
      game.print(`Pony visible after window: ${game.items.calm_pony.visible ? "yes" : "no"}`);
      game.execute("south");
      game.print(`Pony visible after immediate exit: ${game.items.calm_pony.visible ? "yes" : "no"}`);
      game.execute("climb on branch");
      game.print(`Pony visible after a beat: ${game.items.calm_pony.visible ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to Green Dragon Inn.",
      "There is a pony there after all.",
      "Pony visible after window: no",
      "Pony visible after immediate exit: no",
      "Better give the innfolk another moment",
      "A hostler leads a calm pony beneath the oak",
      "Pony visible after a beat: yes",
    ],
  },
  {
    name: "green dragon companions no longer stay frozen in one room",
    drive(game) {
      game.execute("jump green_dragon");
      const ambientIds = new Set(game.unexpectedParty.roster.map((entry) => entry.id).filter((id) => id !== "thorin"));
      const roomRoster = (roomId) => Object.values(game.characters)
        .filter((character) => ambientIds.has(character.id) && character.position === roomId)
        .map((character) => character.id)
        .sort();
      const beforeInn = roomRoster("green_dragon_inn");
      const beforeOutside = roomRoster("green_dragon_inn_outside");
      const beforeSignature = `${beforeInn.join(",")}|${beforeOutside.join(",")}`;
      game.print(`Green Dragon inn has company: ${beforeInn.length > 0 ? "yes" : "no"}`);
      game.print(`Green Dragon yard has company: ${beforeOutside.length > 0 ? "yes" : "no"}`);
      game.execute("wait");
      const afterInn = roomRoster("green_dragon_inn");
      const afterOutside = roomRoster("green_dragon_inn_outside");
      const afterSignature = `${afterInn.join(",")}|${afterOutside.join(",")}`;
      game.print(`Green Dragon roster changed: ${beforeSignature !== afterSignature ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to Green Dragon Inn.",
      "Green Dragon inn has company: yes",
      "Green Dragon yard has company: yes",
      "Green Dragon roster changed: yes",
    ],
  },
  {
    name: "green dragon inn now includes patrons and an innkeeper",
    drive(game) {
      game.execute("jump green_dragon");
      game.execute("look");
      game.execute("ask innkeeper about ale");
    },
    expectedIncluded: [
      "Jumped to Green Dragon Inn.",
      "innkeeper is here.",
      "pipe-smoking farmer is here.",
      "travelling tinker is here.",
      "The innkeeper says 'The ale is sound",
    ],
  },
  {
    name: "vocative trailing for me still performs delegated action",
    inputs: ["Gandalf, could you open the round green door for me?"],
    expectedIncluded: ["Gandalf opens the round green door."],
    notExpectedIncluded: ["I don't see that here."],
  },
  {
    name: "vocative modal order to bard can slay dragon",
    setup(game) {
      game.currentRoom = "stoe_of_ravenhill";
      game.player.position = "stoe_of_ravenhill";
      placeCharacterWithPlayer(game, "bard");
      game.characters.bard.movementMode = "follow";
      game.flags.bardreadiedarrow = true;
      game.flags.smaug_weakspot_known = true;
      game.flags.dragondefeated = false;
      game.characters.red_golden_dragon.position = "lower_halls";
      game.characters.red_golden_dragon.visible = true;
    },
    inputs: ["Bard, can you shoot the dragon?"],
    expectedIncluded: ["Bard draws his bow, sets the strong arrow to the string, and shoots. Far away, the dragon falls from the sky."],
    notExpectedIncluded: ["I'm not sure how to do that.", "The red golden dragon attacks you."],
  },
  {
    name: "bard understands take the shot phrasing",
    setup(game) {
      game.currentRoom = "stoe_of_ravenhill";
      game.player.position = "stoe_of_ravenhill";
      placeCharacterWithPlayer(game, "bard");
      game.characters.bard.movementMode = "follow";
      game.flags.bardreadiedarrow = true;
      game.flags.smaug_weakspot_known = true;
      game.flags.dragondefeated = false;
      game.characters.red_golden_dragon.position = "lower_halls";
      game.characters.red_golden_dragon.visible = true;
    },
    inputs: ["Bard, can you take the shot?"],
    expectedIncluded: ["Bard draws his bow, sets the strong arrow to the string, and shoots. Far away, the dragon falls from the sky."],
    notExpectedIncluded: ["I'm not sure how to do that.", "I don't see that here."],
  },
  {
    name: "bard understands loose the arrow phrasing",
    setup(game) {
      game.currentRoom = "stoe_of_ravenhill";
      game.player.position = "stoe_of_ravenhill";
      placeCharacterWithPlayer(game, "bard");
      game.characters.bard.movementMode = "follow";
      game.flags.bardreadiedarrow = true;
      game.flags.smaug_weakspot_known = true;
      game.flags.dragondefeated = false;
      game.characters.red_golden_dragon.position = "lower_halls";
      game.characters.red_golden_dragon.visible = true;
    },
    inputs: ["Bard, loose the arrow!"],
    expectedIncluded: ["Bard draws his bow, sets the strong arrow to the string, and shoots. Far away, the dragon falls from the sky."],
    notExpectedIncluded: ["I'm not sure how to do that.", "I don't see that here."],
  },
  {
    name: "bard understands fire at dragon phrasing",
    setup(game) {
      game.currentRoom = "stoe_of_ravenhill";
      game.player.position = "stoe_of_ravenhill";
      placeCharacterWithPlayer(game, "bard");
      game.characters.bard.movementMode = "follow";
      game.flags.bardreadiedarrow = true;
      game.flags.smaug_weakspot_known = true;
      game.flags.dragondefeated = false;
      game.characters.red_golden_dragon.position = "lower_halls";
      game.characters.red_golden_dragon.visible = true;
    },
    inputs: ["Ask Bard to fire at the dragon."],
    expectedIncluded: ["Bard draws his bow, sets the strong arrow to the string, and shoots. Far away, the dragon falls from the sky."],
    notExpectedIncluded: ["I'm not sure how to do that."],
  },
  {
    name: "delegated modal grammar stays natural",
    setup(game) {
      game.currentRoom = "bilbos_garden";
      game.player.position = "bilbos_garden";
      placeCharacterWithPlayer(game, "gandalf");
    },
    inputs: ["Gandalf, can you trim the rose bush with the pruner?"],
    expectedIncluded: ["Gandalf would need something sharp to trim the rose bush."],
    notExpectedIncluded: ["Gandalf woulds need something sharp to trim the rose bush."],
  },
  {
    name: "following gandalf uses loose follow behavior across rooms",
    inputs: ["tell gandalf to follow me", "open the door", "go outside"],
    expectedIncluded: [
      "Gandalf follows you as closely as possible.",
      "You are in the front garden before Bag End, where clipped borders, herbs, and bright flowers soften the green slope. A neat path leads to the famous round door, and the air smells of soil, roses, and well-watered earth in the Hill. To the west there is the round green door. The round green door is open. You see: a weathered, moss-covered stone bench perfect for quiet contemplation, an ancient sun dial casting shadows to mark the hours, a vibrant, fragrant rose bush attracting bees and brightening the garden, a shallow bird bath inviting feathered friends to splash and drink, a fragrant herbs patch thriving in the sunlight, a small garden shed for storing tools and gardening supplies.",
    ],
  },
  {
    name: "go outside alias uses visible exit",
    inputs: ["open the door", "go outside", "location"],
    expectedIncluded: ["You are now in Bilbo's garden."],
  },
  {
    name: "go back inside alias returns indoors",
    inputs: ["open the door", "go outside", "go back inside", "location"],
    expectedIncluded: ["You are now in Hobbit Hole."],
  },
  {
    name: "delegated special action keeps npc subject",
    inputs: ["ask gandalf to open the door and lift the carpet"],
    expectedIncluded: [
      "Gandalf opens the round green door.",
      "Gandalf lifts the carpet.",
      "Under the carpet there is a small key.",
    ],
    notExpectedIncluded: ["You lift the carpet."],
  },
  {
    name: "delegated break keeps npc subject",
    setup(game) {
      placeCharacterWithPlayer(game, "gandalf");
      game.items.heavy_wooden_chest.location = { type: "room", id: game.player.position };
      game.items.heavy_wooden_chest.visible = true;
      game.items.heavy_wooden_chest.broken = false;
    },
    inputs: ["ask gandalf to break the chest"],
    expectedIncluded: ["Gandalf strikes the heavy wooden chest. The heavy wooden chest resists the attempt to break it."],
    notExpectedIncluded: ["You strike the heavy wooden chest. The heavy wooden chest resists the attempt to break it."],
  },
  {
    name: "delegated reporting actions keep npc subject",
    setup(game) {
      placeCharacterWithPlayer(game, "gandalf");
    },
    inputs: ["ask gandalf to location", "ask gandalf to inventory", "ask gandalf to smell air"],
    expectedIncluded: [
      "Gandalf is now in Hobbit Hole.",
      "Gandalf is carrying: a map with strange markings. Overall it is a light load.",
      "Gandalf smells the air, but notices nothing useful.",
    ],
    notExpectedIncluded: [
      "You are now in Hobbit Hole.",
      "You are carrying: a map with strange markings. Overall it is a light load.",
      "You smell the air, but notice nothing useful.",
      "Carry weight:",
      /\(\d+\)/,
    ],
  },
  {
    name: "go to visited room uses narrative travel text",
    drive(game) {
      game.currentRoom = "bag_end_guest_room";
      game.player.position = "bag_end_guest_room";
      game.visitedRooms.add("bag_end_pantry");
      game.execute("go to pantry");
      game.execute("location");
    },
    expectedIncluded: [
      "The road to the pantry is known to you, and before long you arrive there again.",
      "You are now in the pantry.",
    ],
  },
  {
    name: "go to unvisited room uses cleaned room name",
    inputs: ["go to guest room"],
    expectedIncluded: [
      "You have not yet been to the guest room, so you cannot go there directly.",
    ],
    notExpectedIncluded: [
      "bag_end_guest_room",
      "Guest_room",
    ],
  },
  {
    name: "delegated utility item actions keep npc subject",
    setup(game) {
      placeCharacterWithPlayer(game, "gandalf");
    },
    inputs: ["ask gandalf to open map", "ask gandalf to close map", "ask gandalf to light lamp", "ask gandalf to open inkwell", "ask gandalf to close inkwell"],
    expectedIncluded: [
      "Gandalf unfolds the curious map. Gandalf sees a map with strange markings.",
      "Gandalf folds the curious map.",
      "Gandalf lights the elegant lamp. Its engraved metal catches the warm glow.",
      "Gandalf unstoppers the dark glass inkwell.",
      "Gandalf stoppers the dark glass inkwell.",
    ],
    notExpectedIncluded: [
      "You unfold the curious map. You see a map with strange markings.",
      "You fold the curious map.",
      "You light the elegant lamp. Its engraved metal catches the warm glow.",
      "You unstopper the dark glass inkwell.",
      "You stopper the dark glass inkwell.",
    ],
  },
  {
    name: "delegated read owned item avoids repeated possession phrasing",
    setup(game) {
      placeCharacterWithPlayer(game, "gandalf");
    },
    inputs: ["ask gandalf to read the map"],
    expectedIncluded: [
      "Gandalf examines the curious map and sees a map with strange markings.",
    ],
    notExpectedIncluded: [
      "in Gandalf's possession",
      "Gandalf examines the curious map in Gandalf's possession.",
    ],
  },
  {
    name: "give then ask elrond to read it keeps map context",
    drive(game) {
      game.execute("jump rivendell");
      game.execute("give map to elrond and ask him to read it");
    },
    expectedIncluded: [
      "You give the curious map to Elrond.",
      "Elrond studies the curious map and says 'Its lines are patient. So should be the one who seeks them.'",
      "Elrond examines the curious map.",
    ],
    notExpectedIncluded: [
      "I don't see that here.",
    ],
  },
  {
    name: "delegated bare cook and eat no longer require explicit object",
    setup(game) {
      placeCharacterWithPlayer(game, "gandalf");
    },
    inputs: ["ask gandalf to cook", "ask gandalf to eat"],
    expectedIncluded: [
      "Gandalf cooks, but nothing happens.",
      "Gandalf has nothing suitable to eat.",
    ],
    notExpectedIncluded: [
      "Please specify your action and the object. For example, type 'open door' or 'climb into tree'.",
    ],
  },
  {
    name: "unexpected party starts with only gandalf in bilbos home",
    drive(game) {
      const visible = game.visiblePeopleInRoom()
        .filter((character) => character.id !== "you")
        .map((character) => character.name)
        .join(", ");
      game.print(`Party start: ${visible || "none"}`);
    },
    expectedIncluded: ["Party start: Gandalf"],
    notExpectedIncluded: ["Party start: Gandalf, Dwalin"],
  },
  {
    name: "unexpected party first dwarf arrives in small atmospheric steps",
    drive(game) {
      const controller = game.unexpectedParty;
      for (let index = 0; index < 4; index += 1) {
        controller.state.cooldown = 0;
        controller.advanceTurn();
      }
    },
    expectedIncluded: [
      /(knock|rat-tat).*round green door/i,
      /(blue-hooded dwarf|Dwalin).*(step|door|path|gate)/i,
      /Dwalin.*(ducks inside|enters|inside|introduce)/i,
    ],
    notExpectedIncluded: ["Thorin"],
  },
  {
    name: "garden arrival messages stay outside-facing",
    drive(game) {
      const controller = game.unexpectedParty;
      game.currentRoom = "bilbos_garden";
      game.player.position = "bilbos_garden";
      controller.state.cooldown = 0;
      controller.advanceTurn();
    },
    expectedIncluded: [/round green door/],
    notExpectedIncluded: ["behind you", "From inside Bag End comes the sound of a knock"],
  },
  {
    name: "balin garden entry stays outside-facing",
    drive(game) {
      const controller = game.unexpectedParty;
      game.currentRoom = "bilbos_garden";
      game.player.position = "bilbos_garden";
      controller.ensureCharacters();
      controller.state.arrivalIndex = 1;
      controller.state.arrived = ["unexpected_party_dwalin"];
      controller.state.currentArrival = { dwarfId: "unexpected_party_balin", stage: 2 };
      controller.state.cooldown = 0;
      controller.advanceTurn();
    },
    expectedIncluded: ["Balin bows his head beneath the round green door and passes inside with easy courtesy."],
    notExpectedIncluded: ["Balin enters with an easy bow, polite in manner and quietly observant of the whole room at once."],
  },
  {
    name: "remaining dwarves can arrive in pairs",
    drive(game) {
      const controller = game.unexpectedParty;
      controller.ensureCharacters();
      controller.state.arrivalIndex = 2;
      controller.state.arrived = ["unexpected_party_dwalin", "unexpected_party_balin"];
      controller.state.currentArrival = null;
      controller.state.cooldown = 0;
      controller.advanceTurn();
      controller.state.cooldown = 0;
      controller.advanceTurn();
    },
    expectedIncluded: [
      /Fili and Kili/,
      /(arrives together|come in together|duck through the round green door together)/i,
    ],
    notExpectedIncluded: ["Thorin"],
  },
  {
    name: "paired dwarf arrivals are not interrupted by ambient beats",
    drive(game) {
      const controller = game.unexpectedParty;
      let guard = 0;
      while (controller.state.arrivalIndex < controller.roster.length && guard < 20) {
        controller.state.cooldown = 0;
        controller.advanceTurn();
        guard += 1;
      }
    },
    expectedIncluded: [
      "Another pair arrives together: Fili and Kili stand at the round green door almost shoulder to shoulder.",
      "Fili and Kili come in together, shedding travel-cloaks and adding at once to the cheerful disorder of Bag End.",
      "Another pair arrives together: Dori and Nori stand at the round green door almost shoulder to shoulder.",
      "Dori and Nori come in together, shedding travel-cloaks and adding at once to the cheerful disorder of Bag End.",
    ],
    notExpectedIncluded: [
      "Plates disappear almost as soon as they are set down, and the pantry is beginning to look heroically overmatched.",
      "Ori wanders off toward the study.",
    ],
  },
  {
    name: "thorin arrives last and turns supper into a quest",
    drive(game) {
      const controller = game.unexpectedParty;
      let guard = 0;
      let thorinTurn = null;
      while (!controller.state.questBriefingDone && guard < 80) {
        controller.state.cooldown = 0;
        controller.advanceTurn();
        guard += 1;
        if (thorinTurn === null && controller.state.thorinArrived) thorinTurn = guard;
      }
      game.print(`Thorin pacing ok: ${thorinTurn !== null && thorinTurn <= 30 ? "yes" : "no"}`);
      game.print(`Quest briefing done: ${controller.state.questBriefingDone ? "yes" : "no"}`);
    },
    expectedIncluded: [
      /Thorin Oakenshield|Thorin says/,
      /Erebor/,
      /Smaug/,
      /secret ways|Mountain again|win our road/,
      /burglar/,
      "Thorin pacing ok: yes",
      "Quest briefing done: yes",
    ],
  },
  {
    name: "the road east stays closed until thorins briefing is done",
    drive(game) {
      game.currentRoom = "bilbos_garden";
      game.player.position = "bilbos_garden";
      game.execute("east");
    },
    expectedIncluded: ['Gandalf lifts a hand. "Not yet, Bilbo. There is more company yet to come."'],
    notExpectedIncluded: ["You are outside the Green Dragon Inn"],
  },
  {
    name: "repeated attempt to leave before briefing feels socially awkward",
    drive(game) {
      game.currentRoom = "bilbos_garden";
      game.player.position = "bilbos_garden";
      game.execute("east");
      game.execute("east");
    },
    expectedIncluded: ["You make as if to slip away, but Gandalf's look makes it plain that he expects you to stay."],
  },
  {
    name: "trying to leave after thorin arrives points back to the briefing",
    drive(game) {
      const controller = game.unexpectedParty;
      let guard = 0;
      while (!controller.state.thorinArrived && guard < 80) {
        controller.state.cooldown = 0;
        controller.advanceTurn();
        guard += 1;
      }
      game.currentRoom = "bilbos_garden";
      game.player.position = "bilbos_garden";
      game.execute("east");
      game.execute("east");
    },
    expectedIncluded: ["You reach toward the way out, then stop. Leaving now would look very like fleeing the room."],
  },
  {
    name: "the road east opens after thorins briefing",
    drive(game) {
      const controller = game.unexpectedParty;
      let guard = 0;
      while (!controller.state.questBriefingDone && guard < 80) {
        controller.state.cooldown = 0;
        controller.advanceTurn();
        guard += 1;
      }
      game.currentRoom = "bilbos_garden";
      game.player.position = "bilbos_garden";
      game.execute("east");
      game.execute("location");
    },
    expectedIncluded: ["You are now in the Lane beneath the Hill."],
    notExpectedIncluded: ['Gandalf lifts a hand. "Not yet, Bilbo. There is more company yet to come."'],
  },
  {
    name: "shire road to the green dragon passes through the new intermediate rooms",
    drive(game) {
      const controller = game.unexpectedParty;
      let guard = 0;
      while (!controller.state.questBriefingDone && guard < 80) {
        controller.state.cooldown = 0;
        controller.advanceTurn();
        guard += 1;
      }
      game.currentRoom = "bilbos_garden";
      game.player.position = "bilbos_garden";
      game.execute("east");
      game.execute("location");
      game.execute("east");
      game.execute("location");
      game.execute("east");
      game.execute("location");
      game.execute("east");
      game.execute("location");
    },
    expectedIncluded: [
      "You are now in the Lane beneath the Hill.",
      "You are now in the Party Field.",
      "You are now in Bywater Bridge.",
      "You are now outside the Green Dragon Inn.",
    ],
  },
  {
    name: "lane beneath the hill feels inhabited and examinable",
    drive(game) {
      const controller = game.unexpectedParty;
      let guard = 0;
      while (!controller.state.questBriefingDone && guard < 80) {
        controller.state.cooldown = 0;
        controller.advanceTurn();
        guard += 1;
      }
      game.currentRoom = "lane_beneath_hill";
      game.player.position = "lane_beneath_hill";
      placeCharacterWithPlayer(game, "lane_hobbit");
      game.describeRoom({ full: true });
      game.execute("examine robin");
      game.execute("ask passing hobbit about bread");
    },
    expectedIncluded: [
      "A robin sings from a hawthorn bush",
      "a small red-breasted robin with the self-possession of a bird convinced the lane belongs to it",
      "The passing hobbit says 'You can smell the baking all along the lane when the ovens are honest. Best kind of village clock I know.'",
    ],
  },
  {
    name: "generic ambient npc speech keeps a definite article",
    drive(game) {
      game.currentRoom = "party_field";
      game.player.position = "party_field";
      placeCharacterWithPlayer(game, "party_hobbit");
      game.turnCount = 0;
      game.maybeAmbientCharacterSpeech(game.characters.party_hobbit);
    },
    expectedIncluded: [
      /The hobbit decorator says '(If this weather holds, we shall have lanterns up by supper-time and no trouble at all\.|Mind the ribbons there; they behave like cats when a breeze gets among them\.)'/,
    ],
  },
  {
    name: "shire atmospheric events add pastoral life",
    drive(game) {
      game.currentRoom = "party_field";
      game.player.position = "party_field";
      for (let turn = 0; turn < 50; turn += 1) {
        game.turnCount = turn;
        delete game.flags.atmosphere_shire_party_field_cooldown;
        const before = outputLines.length;
        game.maybeAtmosphericEvent();
        if (outputLines.length > before) break;
      }
    },
    expectedIncluded: [
      /(Children's laughter skips across the grass|Somebody shakes out a length of bunting|A little breeze stirs the lanterns and awning-cloth)/,
    ],
  },
  {
    name: "bag end house atmosphere does not imply dwarves before arrival",
    drive(game) {
      game.currentRoom = "hobbit_hole";
      game.player.position = "hobbit_hole";
      for (let turn = 0; turn < 40; turn += 1) {
        game.turnCount = turn;
        delete game.flags.atmosphere_bag_end_house_cooldown;
        const before = outputLines.length;
        game.maybeAtmosphericEvent();
        if (outputLines.length > before) break;
      }
    },
    expectedIncluded: ["From the kitchen comes the warm homely sound of cutlery, cupboard doors, and something sizzling in butter."],
    notExpectedIncluded: [
      "A fragment of dwarven song rolls along the round passages before fading into murmured conversation.",
      "Somewhere deeper in Bag End, crockery rattles, a kettle begins to sing, and dwarf laughter answers it.",
    ],
  },
  {
    name: "unexpected party opening the door updates traversal state",
    drive(game) {
      const controller = game.unexpectedParty;
      controller.state.cooldown = 0;
      controller.advanceTurn();
      controller.state.cooldown = 0;
      controller.advanceTurn();
      game.execute("e");
      game.print(`Door traversal room: ${game.currentRoom}`);
    },
    expectedIncluded: [
      /(blue-hooded dwarf|Dwalin).*(step|door|path|gate)/i,
      "Door traversal room: bilbos_garden",
    ],
    notExpectedIncluded: ["The round green door is closed."],
  },
  {
    name: "unexpected party dwarves stay inside bag end and garden",
    drive(game) {
      const controller = game.unexpectedParty;
      while (controller.state.arrivalIndex < controller.roster.length || controller.state.currentArrival || !controller.state.fullHouseAnnounced) {
        controller.state.cooldown = 0;
        controller.advanceTurn();
      }
      for (let index = 0; index < 12; index += 1) {
        controller.state.cooldown = 0;
        controller.advanceTurn();
      }
      const escaped = controller.arrivedDwarves()
        .filter((character) => character.position && ![
          "hobbit_hole",
          "bilbos_garden",
          "bag_end_parlour",
          "bag_end_study",
          "bag_end_dining_room",
          "bag_end_pantry",
          "bag_end_kitchen",
          "bag_end_guest_room",
          "bag_end_cellar_room",
        ].includes(character.position))
        .map((character) => character.name);
      game.print(escaped.length ? `Escaped dwarves: ${escaped.join(", ")}` : "Unexpected Party dwarves remain within Bag End.");
    },
    expectedIncluded: [
      /(crowded with dwarves|Bag End is full at last|every seat seems taken)/,
      "Unexpected Party dwarves remain within Bag End.",
    ],
    notExpectedIncluded: ["Escaped dwarves:"],
  },
  {
    name: "delegated container transfers work for npc",
    setup(game) {
      placeCharacterWithPlayer(game, "gandalf");
      game.items.ornate_box.location = { type: "room", id: game.player.position };
      game.items.ornate_box.visible = true;
      game.items.ornate_box.open = true;
      game.items.heavy_wooden_chest.location = { type: "room", id: game.player.position };
      game.items.heavy_wooden_chest.visible = true;
      game.items.heavy_wooden_chest.open = true;
      game.items.heavy_wooden_chest.locked = false;
      giveItemToCharacter(game, "small_key", "gandalf");
    },
    inputs: [
      "Gandalf, put the small key in the ornate box",
      "Gandalf, take the small key out of the ornate box",
      "Gandalf, put it in the chest",
      "Gandalf, take it out of the chest",
    ],
    expectedIncluded: [
      "Gandalf puts the small key in the ornate box.",
      "Gandalf takes the small key from the ornate box.",
      "Gandalf puts the small key in the heavy wooden chest.",
      "Gandalf takes the small key from the heavy wooden chest.",
    ],
    notExpectedIncluded: [
      "I don't see that here.",
      "Gandalf dons't have the it.",
    ],
  },
  {
    name: "delegated held item grammar stays correct when player has object",
    setup(game) {
      placeCharacterWithPlayer(game, "gandalf");
      game.items.small_key.location = { type: "character", id: game.player.id };
      if (!game.player.inventory.includes("small_key")) game.player.inventory.push("small_key");
    },
    inputs: ["Gandalf, drop the small key"],
    expectedIncluded: ["You are carrying the small key."],
    notExpectedIncluded: ["You is carrying the small key."],
  },
  {
    name: "delegated missing item grammar keeps contractions correct",
    setup(game) {
      placeCharacterWithPlayer(game, "gandalf");
    },
    inputs: ["Gandalf, drop the small key"],
    expectedIncluded: ["Gandalf doesn't have the small key."],
    notExpectedIncluded: ["Gandalf dons't have the small key."],
  },
  {
    name: "delegated npc can give item to another npc",
    setup(game) {
      placeCharacterWithPlayer(game, "gandalf");
      placeCharacterWithPlayer(game, "thorin");
      giveItemToCharacter(game, "small_key", "gandalf");
    },
    inputs: ["Gandalf, give the small key to Thorin", "Thorin, give it to me"],
    expectedIncluded: [
      "Gandalf gives the small key to Thorin.",
      "Thorin gives the small key to you.",
    ],
    notExpectedIncluded: [
      "There is no one named thorin here.",
      "Gandalf does not have the small key.",
    ],
  },
  {
    name: "delegated npc transfer pronouns keep recipient character",
    setup(game) {
      placeCharacterWithPlayer(game, "gandalf");
      placeCharacterWithPlayer(game, "thorin");
      giveItemToCharacter(game, "small_key", "gandalf");
    },
    inputs: [
      "Gandalf, give the small key to Thorin",
      "Gandalf, take the small key from Thorin",
      "Gandalf, hand it to him",
    ],
    expectedIncluded: [
      "Gandalf gives the small key to Thorin.",
      "Gandalf takes the small key from Thorin.",
      "Gandalf gives the small key to Thorin.",
    ],
    notExpectedIncluded: [
      "There is no one named key here.",
      "Thorin gives you the small key.",
    ],
  },
  {
    name: "delegated npc transfer chain can move item between companions",
    setup(game) {
      placeCharacterWithPlayer(game, "gandalf");
      placeCharacterWithPlayer(game, "thorin");
      placeCharacterWithPlayer(game, "bard");
      giveItemToCharacter(game, "small_key", "thorin");
    },
    inputs: ["Gandalf, take the small key from Thorin and give it to Bard"],
    expectedIncluded: [
      "Gandalf takes the small key from Thorin.",
      "Gandalf gives the small key to Bard.",
    ],
    notExpectedIncluded: [
      "Thorin gives you the small key.",
      "There is no one named key here.",
      "Gandalf does not have the small key.",
    ],
  },
  {
    name: "delegated wear remove and garden actions keep npc subject",
    setup(game) {
      game.currentRoom = "bilbos_garden";
      game.player.position = "bilbos_garden";
      placeCharacterWithPlayer(game, "gandalf");
      ["golden_ring", "watering_can", "seed_packet", "garden_spade", "sharp_pruner", "rake"].forEach((itemId) => giveItemToCharacter(game, itemId));
      game.flags.wateringcanfull = true;
    },
    inputs: [
      "ask gandalf to wear golden ring",
      "ask gandalf to remove golden ring",
      "ask gandalf to water rose bush",
      "ask gandalf to plant seeds",
      "ask gandalf to trim rose bush with pruner",
      "ask gandalf to rake garden",
      "ask gandalf to dig garden",
    ],
    expectedIncluded: [
      /Gandalf (?:wears the golden ring and becomes unnoticeable\.|slips the golden ring on and fades from notice\.|draws the golden ring onto .* finger and passes from sight\.)/,
      /Gandalf (?:removes the golden ring and becomes noticeable again\.|slips the golden ring off and returns to sight\.|tugs the golden ring free and becomes visible once more\.)/,
      "Gandalf waters the rose bush. The leaves look fresher.",
      "Gandalf plants a few seeds in a soft patch of earth. They will need time and care.",
      "Gandalf trims the rose bush carefully. It looks a little neater.",
      "Gandalf rakes the garden path into a tidier state.",
      "Gandalf digs carefully with the garden spade, but uncovers nothing unexpected.",
    ],
    notExpectedIncluded: [
      "You wear the golden ring and become unnoticeable.",
      "You remove the golden ring and become noticeable again.",
      "You water the rose bush. The leaves look fresher.",
      "You plant a few seeds in a soft patch of earth. They will need time and care.",
      "You trim the rose bush carefully. It looks a little neater.",
      "You rake the garden path into a tidier state.",
      "You dig carefully with the garden spade, but uncover nothing unexpected.",
    ],
  },
  {
    name: "garden companion narrative stays outdoors",
    setup(game) {
      game.currentRoom = "bilbos_garden";
      game.player.position = "bilbos_garden";
      placeCharacterWithPlayer(game, "thorin");
    },
    drive(game) {
      game.describeRoom({ full: true });
    },
    expectedIncluded: ["Thorin"],
    notExpectedIncluded: [
      "keeps one eye on the kitchen",
      "stands near the window, watching the dark beyond the glass",
    ],
  },
  {
    name: "garden companion narrative avoids repeated poses",
    setup(game) {
      game.currentRoom = "bilbos_garden";
      game.player.position = "bilbos_garden";
      placeCharacterWithPlayer(game, "unexpected_party_gloin");
      placeCharacterWithPlayer(game, "unexpected_party_bifur");
    },
    drive(game) {
      game.print(game.companionDirector.roomCompanionNarrative("bilbos_garden"));
    },
    expectedIncluded: [
      "Gloin",
      "Bifur",
    ],
    notExpectedIncluded: [
      "Gloin stands among the flowers with the air of a guest surprised by so much gardening. Bifur stands among the flowers with the air of a guest surprised by so much gardening.",
    ],
  },
  {
    name: "delegated push climb social and combine actions keep npc subject",
    setup(game) {
      placeCharacterWithPlayer(game, "gandalf");
      placeCharacterWithPlayer(game, "thorin");
      game.items.heavy_wooden_chest.location = { type: "room", id: game.player.position };
      game.items.heavy_wooden_chest.visible = true;
      game.items.heavy_wooden_chest.open = true;
      game.items.heavy_wooden_chest.locked = false;
      ["golden_ring", "small_key"].forEach((itemId) => giveItemToCharacter(game, itemId));
      game.data.combinations["golden ring+small key"] = { nome: "odd trinket", descrizione: "an odd trinket", peso: 1 };
    },
    inputs: [
      "ask gandalf to push inkwell",
      "ask gandalf to climb into chest",
      "ask gandalf to climb out",
      "ask gandalf to thank thorin",
      "ask gandalf to combine golden ring with small key",
    ],
    expectedIncluded: [
      "Gandalf pushes the dark glass inkwell.",
      "Gandalf climbs into the heavy wooden chest.",
      "Gandalf climbs out of the heavy wooden chest.",
      "Gandalf thanks Thorin.",
      "Gandalf combines the golden ring with the small key, making the odd trinket.",
    ],
    notExpectedIncluded: [
      "You push the dark glass inkwell.",
      "You climb into the heavy wooden chest.",
      "You climb out of the heavy wooden chest.",
      "You thank Thorin.",
      "You combine the golden ring with the small key, making the odd trinket.",
    ],
  },
  {
    name: "troll clearing hidden dialogue includes troll exchange",
    setup(game) {
      game.currentRoom = "trolls_clearing";
      game.player.position = "trolls_clearing";
      game.visitedTrollsClearing = false;
      game.checkSpecialSituations();
    },
    inputs: [],
    expectedIncluded: [
      "You crouch low behind a mossy boulder, heart pounding, as the trolls argue by the flickering campfire in the moonlit clearing.",
      "one of the trolls has already caught a dwarf",
      "What shall us do with him?",
      "Roast him!",
      "He wouldn't make above a mouthful.",
      "P'raps there are more like him round about.",
    ],
  },
  {
    name: "transformed trolls drop visible large key",
    setup(game) {
      game.currentRoom = "trolls_clearing";
      game.player.position = "trolls_clearing";
      game.transformTrolls();
    },
    drive(game) {
      game.execute("take large key");
    },
    expectedIncluded: ["You take the large key."],
    notExpectedIncluded: ["I don't see that here."],
  },
  {
    name: "returning to petrified trolls recovers large key from stale state",
    setup(game) {
      game.currentRoom = "trolls_clearing";
      game.player.position = "trolls_clearing";
      game.trollsTransformed = true;
      game.trollsDefeated = true;
      game.visitedTrollsClearing = true;
      game.characters.hideous_troll.visible = false;
      game.characters.vicious_troll.visible = false;
      game.items.the_large_key.location = { type: "character", id: "hideous_troll" };
      game.characters.hideous_troll.inventory = ["the_large_key"];
    },
    inputs: ["look", "take large key"],
    expectedIncluded: [
      "Near the feet of one stone troll lies a large key, dropped in the last confusion before dawn.",
      "You take the large key.",
    ],
    notExpectedIncluded: ["I don't see that here."],
  },
  {
    name: "troll key narrative disappears after taking the key",
    setup(game) {
      game.currentRoom = "trolls_clearing";
      game.player.position = "trolls_clearing";
      game.transformTrolls();
    },
    drive(game) {
      game.execute("look");
      game.execute("take large key");
      game.execute("look");
      const keyHintCount = outputLines.filter((line) => line.includes("Near the feet of one stone troll lies a large key")).length;
      game.print(`Troll key hint count: ${keyHintCount}`);
    },
    expectedIncluded: [
      "You take the large key.",
      "Troll key hint count: 1",
    ],
  },
  {
    name: "carefully taking large key works while trolls are alive",
    setup(game) {
      game.currentRoom = "trolls_clearing";
      game.player.position = "trolls_clearing";
      game.visitedTrollsClearing = true;
    },
    drive(game) {
      game.execute("carefully take large key and south west");
      if (!game.player.inventory.includes("the_large_key")) throw new Error("Expected player to take the large key.");
      if (game.endgame) throw new Error("Expected player to escape after taking the large key carefully.");
    },
    expectedIncluded: [
      "You carefully approach the troll, eyes fixed on the gleaming key.",
      "He nearly notices you, then shifts his great bulk, grumbling to himself.",
      "You take the large key.",
      "Keeping low and clutching the stolen key, you slip away from the trolls' clearing into the gloomy empty land beyond.",
    ],
    notExpectedIncluded: ["The hideous troll eats you. You are dead."],
  },
  {
    name: "carefully stealing large key alone does not trigger immediate troll death",
    setup(game) {
      game.currentRoom = "trolls_clearing";
      game.player.position = "trolls_clearing";
      game.visitedTrollsClearing = true;
    },
    drive(game) {
      game.execute("carefully steal key");
      if (!game.player.inventory.includes("the_large_key")) throw new Error("Expected player to steal the large key.");
      if (game.endgame) throw new Error("Expected the careful theft to avoid immediate death.");
    },
    expectedIncluded: [
      "You carefully approach the troll, eyes fixed on the gleaming key.",
      "You take the large key.",
    ],
    notExpectedIncluded: [
      "Hideous troll attacks you.",
      "lays you low.",
    ],
  },
  {
    name: "player can carry sword and rope together",
    setup(game) {
      game.player.strength = 5;
      game.currentRoom = "trolls_cave";
      game.player.position = "trolls_cave";
      game.flags.lanternon = true;
      game.flags.lanternturns = 6;
      game.items.majestic_sword.location = { type: "room", id: game.player.position };
      game.items.majestic_sword.visible = true;
      game.items.sturdy_rope.location = { type: "room", id: game.player.position };
      game.items.sturdy_rope.visible = true;
    },
    inputs: ["take sword", "take rope", "inventory"],
    expectedIncluded: [
      "You take the majestic sword.",
      "You take the sturdy rope.",
      "You are carrying: a majestic sword, ancient and luminous, a sturdy rope. Overall it is a manageable load.",
    ],
    notExpectedIncluded: [
      "Carry weight:",
      /\(\d+\)/,
    ],
  },
  {
    name: "inventory list strips trailing punctuation from item descriptions",
    setup(game) {
      game.player.inventory = ["curious_map", "curious_key", "smoking_pipe", "brass_lantern", "the_large_key"];
      game.player.worn = [];
      for (const itemId of game.player.inventory) {
        game.items[itemId].location = { type: "character", id: game.player.id };
      }
    },
    inputs: ["inventory"],
    expectedIncluded: [
      "You are carrying: a map with strange markings, a curious key with a strange shape, a curved wooden pipe with a long stem and bowl, a brass lantern with metal handle, wick, and oil, a large key.",
    ],
    notExpectedIncluded: [
      "oil., a large key",
    ],
  },
  {
    name: "stop alone halts autoplay when it is running",
    drive(game) {
      game.execute("autoplay fast");
      game.print(`Autoplay after start: ${game.autoplayRunning ? "yes" : "no"}`);
      game.execute("stop");
      game.print(`Autoplay after stop: ${game.autoplayRunning ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Autoplay fast started. Type 'stop' to stop it.",
      "Autoplay after start: yes",
      "Autoplay stopped.",
      "Autoplay after stop: no",
    ],
  },
  {
    name: "escape halts autoplay when it is running",
    drive(game) {
      game.execute("autoplay fast");
      game.print(`Autoplay after start: ${game.autoplayRunning ? "yes" : "no"}`);
      let prevented = false;
      dispatchDocumentEvent("keydown", {
        key: "Escape",
        preventDefault() { prevented = true; },
      });
      game.print(`Escape prevented default: ${prevented ? "yes" : "no"}`);
      game.print(`Autoplay after escape: ${game.autoplayRunning ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Autoplay fast started. Type 'stop' to stop it.",
      "Autoplay after start: yes",
      "Autoplay stopped.",
      "Escape prevented default: yes",
      "Autoplay after escape: no",
    ],
  },
  {
    name: "autoplay stop button halts autoplay when clicked",
    drive(game) {
      const stopButton = document.getElementById("autoplay-stop");
      game.execute("autoplay fast");
      game.print(`Autoplay stop button visible after start: ${stopButton.hidden ? "no" : "yes"}`);
      stopButton.click();
      game.print(`Autoplay after stop button: ${game.autoplayRunning ? "yes" : "no"}`);
      game.print(`Autoplay stop button visible after click: ${stopButton.hidden ? "no" : "yes"}`);
    },
    expectedIncluded: [
      "Autoplay fast started. Type 'stop' to stop it.",
      "Autoplay stop button visible after start: yes",
      "Autoplay stopped.",
      "Autoplay after stop button: no",
      "Autoplay stop button visible after click: no",
    ],
  },
  {
    name: "autoplay wins without weight drops",
    drive(game) {
      const originalRandom = Math.random;
      const issued = [];
      const seeded = makeSeededRandom(1);
      Math.random = () => seeded();
      try {
        for (let step = 0; step < 500 && !game.endgame; step += 1) {
          const command = game.nextAutoplayCommand();
          if (!command) throw new Error(`Autoplay stopped unexpectedly at step ${step} in ${game.currentRoom}.`);
          issued.push(command);
          if (command.startsWith("drop ")) throw new Error(`Autoplay should not need weight drops, but issued: ${command}`);
          game.execute(command);
        }
      } finally {
        Math.random = originalRandom;
      }
      if (!game.endgame) throw new Error("Expected autoplay to finish the adventure.");
      if (!outputLines.some((line) => line.startsWith("Congratulations. You have killed Smaug and found the treasure - a real thief."))) {
        throw new Error(`Expected autoplay victory message. Commands: ${issued.slice(-12).join(" | ")}`);
      }
    },
    expectedIncluded: [
      "Congratulations. You have killed Smaug and found the treasure - a real thief.",
      /So the tale is brought to its close\. You have mastered \d+\.\d+% of this adventure\./,
      "Type 'restart' to begin the tale again.",
    ],
    notExpectedIncluded: ["You leave the", "You drop the"],
  },
  {
    name: "waiting after thorins farewell begins the homeward journey chapter",
    drive(game) {
      movePlayerTo(game, "stoe_of_ravenhill");
      game.flags.dragondefeated = true;
      game.flags.erebor_standoff_started = true;
      game.flags.battle_won = true;
      game.flags.thorin_fallen = true;
      game.flags.thorin_reconciled = true;
      game.execute("wait");
      game.print(`Homeward journey started: ${game.flags.homeward_journey_started ? "yes" : "no"}`);
      game.print(`Homeward room: ${game.currentRoom}`);
      game.print(`Homeward autosave: ${game.autosaveMeta?.label || "none"}`);
    },
    expectedIncluded: [
      "After Thorin's farewell, the road turns west at last. Long miles pass, the seasons soften, and the Mountain falls away behind memory into tale.",
      "In time you come again beneath your own Hill, only to find home less patient than you had imagined. Word has run ahead of you in the Shire more quickly than you have.",
      "Homeward journey started: yes",
      "Homeward room: lane_beneath_hill",
      "Homeward autosave: after returning at last to the Hill",
    ],
  },
  {
    name: "returning to hobbit hole reveals bag end nearly lost",
    drive(game) {
      movePlayerTo(game, "hobbit_hole");
      game.flags.homeward_journey_started = true;
      game.flags.final_return_started = true;
      game.checkSpecialSituations();
      game.print(`Bag End auction seen: ${game.flags.bag_end_auction_seen ? "yes" : "no"}`);
      game.print(`Epilogue started: ${game.flags.epilogue_started ? "yes" : "no"}`);
      game.print(`Bag End auction autosave: ${game.autosaveMeta?.label || "none"}`);
    },
    expectedIncluded: [
      "The sight within stops you short: labels, bundles, and inquisitive hands have plainly been at work in Bag End, as though its master were safely dead and his goods fit for division.",
      "You have returned just in time to save your house from being lost piecemeal, though its peace and order have been badly shaken by the attempt.",
      "Bag End auction seen: yes",
      "Epilogue started: yes",
      "Bag End auction autosave: after finding Bag End nearly lost",
    ],
  },
  {
    name: "putting treasure in chest after the return home starts the final quiet stretch instead of immediate victory",
    drive(game) {
      movePlayerTo(game, "hobbit_hole");
      giveItemToCharacter(game, "treasure", game.player.id);
      game.flags.dragondefeated = true;
      game.flags.mapread = true;
      game.flags.homeward_journey_started = true;
      game.flags.final_return_started = true;
      game.flags.bag_end_auction_seen = true;
      game.flags.epilogue_started = true;
      const dragon = Object.values(game.characters).find((character) => /dragon/i.test(character.name));
      if (dragon) dragon.visible = false;
      game.items.heavy_wooden_chest.locked = false;
      game.items.heavy_wooden_chest.open = true;
      game.execute("put treasure in chest");
      game.print(`Dragon arc complete: ${game.flags.dragon_arc_complete ? "yes" : "no"}`);
      game.print(`Endgame after chest: ${game.endgame ? "yes" : "no"}`);
      game.print(`Treasure-home autosave: ${game.autosaveMeta?.label || "none"}`);
    },
    expectedIncluded: [
      "You settle the treasure safely into the heavy wooden chest. At last it is home, yet the tale does not feel wholly ended.",
      "Dragon arc complete: yes",
      "Endgame after chest: no",
      "Treasure-home autosave: after bringing the treasure home",
    ],
    notExpectedIncluded: ["Congratulations. You have killed Smaug and found the treasure - a real thief."],
  },
  {
    name: "waiting at bag end after storing the treasure still resolves the provisional ending",
    drive(game) {
      movePlayerTo(game, "hobbit_hole");
      giveItemToCharacter(game, "treasure", game.player.id);
      game.flags.dragondefeated = true;
      game.flags.mapread = true;
      game.flags.homeward_journey_started = true;
      game.flags.final_return_started = true;
      game.flags.bag_end_auction_seen = true;
      game.flags.epilogue_started = true;
      const dragon = Object.values(game.characters).find((character) => /dragon/i.test(character.name));
      if (dragon) dragon.visible = false;
      game.items.heavy_wooden_chest.locked = false;
      game.items.heavy_wooden_chest.open = true;
      game.execute("put treasure in chest");
      game.execute("wait");
      game.print(`Endgame after homecoming wait: ${game.endgame ? "yes" : "no"}`);
      game.print(`Epilogue complete: ${game.flags.epilogue_complete ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "At length there comes a comfortable knock at Bag End, and before long Gandalf is seated by the fire with Balin beside him.",
      "They look from Bilbo to the chest and back again, and for a while the talk is of roads, losses, wonders, and the queer shape a well-ended tale may take.",
      "Congratulations. You have killed Smaug and found the treasure - a real thief.",
      "Endgame after homecoming wait: yes",
      "Epilogue complete: yes",
    ],
  },
  {
    name: "autoplay takes rope during same trolls cave visit as sword",
    drive(game) {
      game.restartGame();
      game.visitedRooms.add("dreary");
      game.player.position = "trolls_cave";
      game.currentRoom = "trolls_cave";
      game.visitedTrollsClearing = true;
      game.trollsTransformed = true;
      game.flags.dragondefeated = false;
      game.flags.lanternon = true;
      game.flags.lanternturns = 6;
      game.flags.seenpony = true;
      game.player.inventory = ["small_key", "firestone", "sturdy_key", "brass_lantern", "the_large_key", "majestic_sword"];
      const command = game.nextAutoplayCommand();
      if (command !== "take rope") {
        throw new Error(`Expected autoplay to take rope immediately after sword in trolls cave, got: ${command}`);
      }
      game.execute(command);
    },
    expectedIncluded: ["You take the sturdy rope."],
  },
  {
    name: "autoplay does not relight lantern when not needed",
    drive(game) {
      game.player.inventory.push("brass_lantern");
      game.flags.lanternon = false;
      game.flags.lanternturns = 0;
      const command = game.nextAutoplayCommand();
      if (command === "light lantern") {
        throw new Error("Autoplay should not relight the lantern in a safe bright room.");
      }
      game.print(`Autoplay bright-room command: ${command}`);
    },
    expectedIncluded: [/Autoplay bright-room command: .+/],
    notExpectedIncluded: ["Autoplay bright-room command: light lantern"],
  },
  {
    name: "autoplay relights lantern in trolls cave when needed",
    drive(game) {
      game.player.inventory = ["small_key", "firestone", "sturdy_key", "brass_lantern", "the_large_key"];
      game.currentRoom = "trolls_cave";
      game.player.position = "trolls_cave";
      game.visitedTrollsClearing = true;
      game.trollsTransformed = true;
      game.flags.dragondefeated = false;
      game.flags.lanternon = false;
      game.flags.lanternturns = 0;
      const command = game.nextAutoplayCommand();
      if (command !== "light lantern") {
        throw new Error(`Expected autoplay to relight the lantern in trolls cave, got: ${command}`);
      }
      game.print(`Autoplay dark-room command: ${command}`);
    },
    expectedIncluded: ["Autoplay dark-room command: light lantern"],
  },
  {
    name: "ornate box starts in guest trunk instead of top drawer",
    inputs: ["open top drawer", "examine top drawer", "go west", "go south", "open guest trunk", "examine guest trunk"],
    expectedIncluded: [
      "You see the top drawer; inside is a neatly folded linen sheet.",
      "You see a sturdy trunk placed at the foot of the guest bed; inside are a folded quilt smelling faintly of lavender and cupboard freshness, a small, ornate box.",
    ],
    notExpectedIncluded: [
      "You see the top drawer; inside is a neatly folded linen sheet, a small, ornate box.",
    ],
  },
  {
    name: "clarified object is remembered for later ambiguous reference",
    drive(game) {
      game.execute("open drawer");
      game.execute("top");
      game.execute("examine drawer");
      const clarificationCount = outputLines.filter((line) => line.includes("Do you mean") && line.includes("drawer")).length;
      game.print(`Drawer clarification count: ${clarificationCount}`);
    },
    expectedIncluded: [
      "You open the top drawer.",
      "You see the top drawer; inside is a neatly folded linen sheet.",
      "Drawer clarification count: 1",
    ],
  },
  {
    name: "hall little drawer participates in drawer clarification",
    drive(game) {
      game.execute("open drawer");
      game.execute("discreet little drawer");
    },
    expectedIncluded: [
      "Do you mean the top drawer, the middle drawer, the bottom drawer, or the discreet little drawer?",
      "You open the discreet little drawer.",
    ],
  },
  {
    name: "explicit specific object updates remembered ambiguous reference",
    drive(game) {
      game.execute("open drawer");
      game.execute("top");
      game.execute("open bottom drawer");
      game.execute("close drawer");
    },
    expectedIncluded: [
      "You open the top drawer.",
      "You open the bottom drawer.",
      "You close the bottom drawer.",
    ],
    notExpectedIncluded: [
      "You close the top drawer.",
    ],
  },
  {
    name: "remembered ambiguous reference expires after several turns",
    drive(game) {
      game.execute("open drawer");
      game.execute("top");
      game.execute("look");
      game.execute("inventory");
      game.execute("wait");
      game.execute("wait");
      game.execute("wait");
      game.execute("examine drawer");
      const clarificationCount = outputLines.filter((line) => line.includes("Do you mean") && line.includes("drawer")).length;
      game.print(`Drawer clarification count after expiry: ${clarificationCount}`);
    },
    expectedIncluded: [
      "You open the top drawer.",
      "Drawer clarification count after expiry: 2",
    ],
  },
  {
    name: "remembered ambiguous reference still works before expiry",
    drive(game) {
      game.execute("open drawer");
      game.execute("top");
      game.execute("look");
      game.execute("inventory");
      game.execute("close drawer");
      const clarificationCount = outputLines.filter((line) => line.includes("Do you mean") && line.includes("drawer")).length;
      game.print(`Drawer clarification count before expiry: ${clarificationCount}`);
    },
    expectedIncluded: [
      "You open the top drawer.",
      "You close the top drawer.",
      "Drawer clarification count before expiry: 1",
    ],
  },
  {
    name: "remembered ambiguous reference survives autosave restore",
    drive(game) {
      game.execute("open drawer");
      game.execute("top");
      game.recordAutosave("clarification memory", { key: "test:clarification-memory", force: true });
      game.execute("open bottom drawer");
      game.execute("autosave");
      game.execute("close drawer");
      const clarificationCount = outputLines.filter((line) => line.includes("Do you mean") && line.includes("drawer")).length;
      game.print(`Drawer clarification count across autosave restore: ${clarificationCount}`);
    },
    expectedIncluded: [
      "Game loaded.",
      "You close the top drawer.",
      "Drawer clarification count across autosave restore: 0",
    ],
  },
  {
    name: "remembered drawer reference does not affect key clarification",
    drive(game) {
      game.execute("open drawer");
      game.execute("top");
      game.execute("open bottom drawer");
      game.execute("take key from bottom drawer");
      game.execute("brass");
    },
    expectedIncluded: [
      "Do you mean the delicate key, the sturdy key, or the brass key?",
      "You take the brass key from the bottom drawer.",
    ],
  },
  {
    name: "put in ambiguous drawer clarifies destination drawer",
    drive(game) {
      game.execute("open top drawer");
      game.execute("open bottom drawer");
      game.execute("take brass key");
      game.clarifiedReferences = {};
      game.execute("put brass key in drawer");
      game.execute("top");
    },
    expectedIncluded: [
      "Do you mean the top drawer, the middle drawer, the bottom drawer, or the discreet little drawer?",
      "You put the brass key in the top drawer.",
    ],
  },
  {
    name: "bag end hall descriptions react after the quest begins",
    drive(game) {
      game.unexpectedParty.state.arrived = game.unexpectedParty.roster.map((entry) => entry.id);
      game.unexpectedParty.state.arrivalIndex = game.unexpectedParty.roster.length;
      game.unexpectedParty.state.currentArrival = null;
      game.unexpectedParty.state.thorinArrived = true;
      game.unexpectedParty.state.questBriefingDone = true;
      game.unexpectedParty.reconcileCharacters();
      game.companionDirector.sync();
      game.print(`Hall pegs after briefing: ${game.describeItemShort(game.items.hall_coat_pegs)}`);
      game.print(`Gandalf after briefing: ${game.companionDirector.companionPose(game.characters.gandalf, "hobbit_hole", 0)}`);
    },
    expectedIncluded: [
      "Hall pegs after briefing: a regiment of polished pegs standing tidy once more now that the dwarf-cloaks have gone abroad",
      "Gandalf after briefing: keeps the curious map close at hand, watching you over the edge of his pipe-smoke",
    ],
    notExpectedIncluded: [
      "threatened by an oncoming invasion",
      "has claimed a chair and half the available table-space",
    ],
  },
  {
    name: "companion narrative does not duplicate companion presence line",
    drive(game) {
      game.describeRoom({ full: true });
    },
    expectedIncluded: [
      "Gandalf waits by the round green door as though measuring the evening by expected knocks.",
      "Gandalf is carrying a curious map.",
    ],
    notExpectedIncluded: [
      "Gandalf is here.",
    ],
  },
  {
    name: "companion overflow is named instead of repeated as flat presence lines",
    drive(game) {
      game.execute("jump rivendell");
      ["thorin", "unexpected_party_balin", "unexpected_party_dwalin", "unexpected_party_fili", "gandalf"].forEach((id) => placeCharacterWithPlayer(game, id));
      game.execute("look");
    },
    expectedIncluded: [
      /Gandalf.*(nearby as well|linger a little apart|close at hand|wait a little apart)/,
      "Elrond is here.",
    ],
    notExpectedIncluded: [
      "Others of the company are nearby as well.",
      "Gandalf is here.",
    ],
  },
  {
    name: "exits command uses narrative room names",
    drive(game) {
      game.currentRoom = "bag_end_guest_room";
      game.execute("exits");
    },
    expectedIncluded: [
      "From here, north leads to the parlour.",
    ],
    notExpectedIncluded: [
      "From here:",
      "Hobbit_hole",
      "bag_end_parlour",
    ],
  },
  {
    name: "natural exits phrasing maps to exits command",
    drive(game) {
      game.currentRoom = "bag_end_guest_room";
      game.execute("show me the available exits");
    },
    expectedIncluded: [
      "From here, north leads to the parlour.",
    ],
  },
  {
    name: "guest room image updates when the guest trunk is opened",
    drive(game) {
      game.currentRoom = "bag_end_guest_room";
      game.player.position = "bag_end_guest_room";
      const beforeImage = game.contextualRoomImage(game.room());
      game.execute("open guest trunk");
      const afterImage = game.contextualRoomImage(game.room());
      game.print(`Guest room closed trunk image: ${beforeImage === "bag_end_guest_room.jpeg" ? "yes" : "no"}`);
      game.print(`Guest room open trunk image: ${afterImage === "bag_end_guest_room_open_trunk.png" ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You open the guest trunk.",
      "Guest room closed trunk image: yes",
      "Guest room open trunk image: yes",
    ],
  },
  {
    name: "hobbit hole image supports chest door and combined open states",
    drive(game) {
      game.currentRoom = "hobbit_hole";
      game.player.position = "hobbit_hole";
      const chest = game.items.heavy_wooden_chest;
      const doorFound = game.findDoor("round green door");
      if (!chest || !doorFound?.door) throw new Error("Expected hobbit-hole chest and round green door to exist.");
      const frontDoor = doorFound.door;

      game.print(`Hobbit hole base image: ${game.contextualRoomImage(game.room())}`);
      chest.open = true;
      game.print(`Hobbit hole open chest image: ${game.contextualRoomImage(game.room())}`);
      game.detachItem("treasure");
      chest.contents.push("treasure");
      game.items.treasure.location = { type: "item", id: "heavy_wooden_chest" };
      game.print(`Hobbit hole open chest with treasure image: ${game.contextualRoomImage(game.room())}`);
      frontDoor.open = true;
      frontDoor.locked = false;
      game.print(`Hobbit hole open door chest and treasure image: ${game.contextualRoomImage(game.room())}`);
      chest.contents = chest.contents.filter((id) => id !== "treasure");
      game.items.treasure.location = null;
      game.print(`Hobbit hole open door and chest image: ${game.contextualRoomImage(game.room())}`);
      chest.open = false;
      game.print(`Hobbit hole open door image: ${game.contextualRoomImage(game.room())}`);
    },
    expectedIncluded: [
      "Hobbit hole base image: hobbit_hole.jpeg",
      "Hobbit hole open chest image: hobbit_hole_open_chest.png",
      "Hobbit hole open chest with treasure image: hobbit_hole_open_door_open_chest_with_treasure.png",
      "Hobbit hole open door chest and treasure image: hobbit_hole_open_door_open_chest_with_treasure.png",
      "Hobbit hole open door and chest image: hobbit_hole_open_door_open_chest.png",
      "Hobbit hole open door image: hobbit_hole_open_door.png",
    ],
  },
  {
    name: "map command shows the game map overlay",
    setup(game) {
      movePlayerTo(game, "bilbos_garden");
    },
    drive(game) {
      const overlay = document.getElementById("scene-map-overlay");
      const title = document.getElementById("scene-map-title");
      const canvas = document.getElementById("scene-map-canvas");
      const image = document.getElementById("scene-map-image");
      game.execute("map");
      const visible = Object.prototype.hasOwnProperty.call(overlay.attributes, "hidden") ? "no" : "yes";
      const src = image.getAttribute("src") || "";
      game.print(`Map title after open: ${title.textContent}`);
      game.print(`Map overlay visible: ${visible}`);
      game.print(`Map image loaded: ${src.startsWith("data:image/svg+xml") ? "yes" : "no"}`);
      game.print(`Map has clickable regions: ${canvas.innerHTML.includes("data-map-open-region") ? "yes" : "no"}`);
      game.execute("exits");
      const visibleAfter = Object.prototype.hasOwnProperty.call(overlay.attributes, "hidden") ? "no" : "yes";
      game.print(`Map overlay stays visible after exits: ${visibleAfter}`);
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "Map title after open: Explored Map",
      "Map overlay visible: yes",
      "Map image loaded: yes",
      "Map has clickable regions: yes",
      "Map overlay stays visible after exits: yes",
    ],
  },
  {
    name: "map stays open and updates while new locations are discovered",
    drive(game) {
      const overlay = document.getElementById("scene-map-overlay");
      const title = document.getElementById("scene-map-title");
      const image = document.getElementById("scene-map-image");
      game.execute("map");
      const beforeSrc = image.getAttribute("src") || "";
      game.execute("jump beorn");
      const afterSrc = image.getAttribute("src") || "";
      const visibleAfterJump = Object.prototype.hasOwnProperty.call(overlay.attributes, "hidden") ? "no" : "yes";
      game.print(`Map visible after jump: ${visibleAfterJump}`);
      game.print(`Map image updated after jump: ${beforeSrc !== afterSrc ? "yes" : "no"}`);
      game.print(`Map title tracks current scope: ${title.textContent === "Beorn's House" ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "Map visible after jump: yes",
      "Map image updated after jump: yes",
      "Map title tracks current scope: yes",
    ],
  },
  {
    name: "map shows current room exits on the active node",
    drive(game) {
      const image = document.getElementById("scene-map-image");
      game.execute("jump beorn");
      game.execute("map");
      const decodedMapImage = decodeURIComponent(image.getAttribute("src") || "");
      game.print(`Current node shows north exit marker: ${decodedMapImage.includes('data-node-exit=\"north\"') && decodedMapImage.includes('data-node-exit-label=\"N\"') ? "yes" : "no"}`);
      game.print(`Current node shows east exit marker: ${decodedMapImage.includes('data-node-exit=\"east\"') && decodedMapImage.includes('data-node-exit-label=\"E\"') ? "yes" : "no"}`);
      game.print(`Current node shows southwest exit marker: ${decodedMapImage.includes('data-node-exit=\"south west\"') && decodedMapImage.includes('data-node-exit-label=\"SW\"') ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "Current node shows north exit marker: yes",
      "Current node shows east exit marker: yes",
      "Current node shows southwest exit marker: yes",
    ],
  },
  {
    name: "map animates the current node frame during local movement",
    drive(game) {
      const title = document.getElementById("scene-map-title");
      game.execute("jump beorn");
      game.execute("map");
      game.execute("east");
      const animation = game.sceneMapTravelAnimation || {};
      game.print(`Map movement animation active: ${animation.active === true ? "yes" : "no"}`);
      game.print(`Map movement animation source tracked: ${animation.fromRoom === "beorns_house" ? "yes" : "no"}`);
      game.print(`Map movement animation target tracked: ${animation.toRoom === "beorn_great_hall" ? "yes" : "no"}`);
      game.print(`Map title stays on local scope: ${title.textContent === "Beorn's House" ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "Map movement animation active: yes",
      "Map movement animation source tracked: yes",
      "Map movement animation target tracked: yes",
      "Map title stays on local scope: yes",
    ],
  },
  {
    name: "map delays local drilldown until entry animation completes",
    drive(game) {
      const title = document.getElementById("scene-map-title");
      const originalSetTimeout = global.setTimeout;
      const delayedTimers = [];
      global.setTimeout = (fn, delay = 0, ...args) => {
        if (Number(delay) > 100) {
          delayedTimers.push(() => fn(...args));
          return delayedTimers.length;
        }
        return originalSetTimeout(fn, delay, ...args);
      };
      try {
        game.execute("jump beorn");
        game.execute("south west");
        game.execute("map");
        game.execute("east");
        const animation = game.sceneMapTravelAnimation || {};
        game.print(`Map entry animation active: ${animation.active === true ? "yes" : "no"}`);
        game.print(`Map entry animation holds world scope first: ${title.textContent === "Explored Map" ? "yes" : "no"}`);
        game.print(`Map entry animation plans local drilldown: ${animation.finalScope === "beorn" ? "yes" : "no"}`);
        while (delayedTimers.length) {
          const finishAnimation = delayedTimers.shift();
          if (typeof finishAnimation === "function") finishAnimation();
        }
        game.print(`Map opens local scope after animation: ${title.textContent === "Beorn's House" ? "yes" : "no"}`);
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "Map entry animation active: yes",
      "Map entry animation holds world scope first: yes",
      "Map entry animation plans local drilldown: yes",
      "Map opens local scope after animation: yes",
    ],
  },
  {
    name: "map keeps scroll steady when the full destination indicator stays visible",
    drive(game) {
      const scroll = document.getElementById("scene-map-scroll");
      game.execute("jump beorn");
      game.execute("south west");
      game.execute("map");
      game.sceneMapZoom = 1;
      game.sceneMapScope = "world";
      game.sceneMapAutoFollow = false;
      game.sceneMapManualScope = true;
      game.currentRoom = "beorns_house";
      game.player.position = "beorns_house";
      game.layout.renderSceneMap();
      const state = game.sceneMapRenderCache?.state || null;
      const targetState = state
        ? {
            ...state,
            zoom: 1,
            width: Number(state.baseWidth) || Number(state.width) || 0,
            height: Number(state.baseHeight) || Number(state.height) || 0,
          }
        : null;
      const targetBox = game.layout.sceneMapScaledIndicatorBoxForRoom(targetState, "beorns_house");
      const maxScrollLeft = Math.max(0, (Number(targetState?.width) || 0) - (Number(scroll.clientWidth) || 800));
      const maxScrollTop = Math.max(0, (Number(targetState?.height) || 0) - (Number(scroll.clientHeight) || 500));
      scroll.scrollLeft = targetBox ? Math.max(0, Math.min(maxScrollLeft, Math.round(targetBox.left - 120))) : 0;
      scroll.scrollTop = targetBox ? Math.max(0, Math.min(maxScrollTop, Math.round(targetBox.top - 120))) : 0;
      const beforeLeft = Number(scroll.scrollLeft) || 0;
      const beforeTop = Number(scroll.scrollTop) || 0;
      game.layout.ensureSceneMapRoomVisible(targetState);
      game.print(`Map keeps horizontal scroll when full destination indicator is already visible: ${Number(scroll.scrollLeft) === beforeLeft ? "yes" : "no"}`);
      game.print(`Map keeps vertical scroll when full destination indicator is already visible: ${Number(scroll.scrollTop) === beforeTop ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "Map keeps horizontal scroll when full destination indicator is already visible: yes",
      "Map keeps vertical scroll when full destination indicator is already visible: yes",
    ],
  },
  {
    name: "map nudges scroll when destination falls outside viewport",
    drive(game) {
      const title = document.getElementById("scene-map-title");
      const scroll = document.getElementById("scene-map-scroll");
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = (fn, delay = 0, ...args) => (Number(delay) > 100
        ? 1
        : originalSetTimeout(fn, delay, ...args));
      try {
        game.execute("jump beorn");
        game.execute("south west");
        game.execute("map");
        game.sceneMapZoom = 1;
        game.layout.renderSceneMap();
        const state = game.sceneMapRenderCache?.state;
        const currentX = Number(state?.editorMeta?.nodeCenters?.["room:narrow_dangerous_path"]?.x) || 0;
        const targetX = Number(state?.editorMeta?.nodeCenters?.["region:beorn"]?.x) || 0;
        const viewportWidth = Number(scroll.clientWidth) || 800;
        const beforeLeft = Math.max(0, Math.round(currentX - viewportWidth + 60));
        scroll.scrollLeft = beforeLeft;
        const fullCenterLeft = Math.max(0, Math.round(targetX - (viewportWidth / 2)));
        game.execute("east");
        const afterLeft = Number(scroll.scrollLeft) || 0;
        game.print(`Map keeps shared scope during offscreen move: ${title.textContent === "Explored Map" ? "yes" : "no"}`);
        game.print(`Map scroll shifts when destination is outside viewport: ${afterLeft > beforeLeft ? "yes" : "no"}`);
        game.print(`Map scroll shift is gentler than full recenter: ${afterLeft < fullCenterLeft ? "yes" : "no"}`);
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "Map keeps shared scope during offscreen move: yes",
      "Map scroll shifts when destination is outside viewport: yes",
      "Map scroll shift is gentler than full recenter: yes",
    ],
  },
  {
    name: "map rescues current location when restored viewport leaves it offscreen",
    drive(game) {
      const scroll = document.getElementById("scene-map-scroll");
      game.execute("jump beorn");
      game.execute("south west");
      game.execute("map");
      game.sceneMapZoom = 1;
      game.layout.renderSceneMap();
      game.sceneMapViewportAnchor = {
        scope: game.sceneMapScope || "world",
        mapX: 0,
        mapY: 0,
        offsetX: 0,
        offsetY: 0,
      };
      scroll.scrollLeft = 0;
      scroll.scrollTop = 0;
      game.layout.renderSceneMap();
      game.print(`Map rescues horizontal visibility after stale viewport restore: ${Number(scroll.scrollLeft) > 0 ? "yes" : "no"}`);
      game.print(`Map rescues vertical visibility after stale viewport restore: ${Number(scroll.scrollTop) > 0 ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "Map rescues horizontal visibility after stale viewport restore: yes",
      "Map rescues vertical visibility after stale viewport restore: yes",
    ],
  },
  {
    name: "map drilldown opens from the source node before panning to center",
    drive(game) {
      const title = document.getElementById("scene-map-title");
      const scroll = document.getElementById("scene-map-scroll");
      const originalSetTimeout = global.setTimeout;
      const originalRequestAnimationFrame = global.requestAnimationFrame;
      const originalCancelAnimationFrame = global.cancelAnimationFrame;
      const originalDateNow = Date.now;
      const originalQueueScopeTransition = game.layout.queueSceneMapScopeTransition.bind(game.layout);
      const delayedTimers = [];
      const rafQueue = [];
      let now = 1000;
      let capturedTransition = null;
      global.setTimeout = (fn, delay = 0, ...args) => {
        if (Number(delay) > 100) {
          delayedTimers.push(() => fn(...args));
          return delayedTimers.length;
        }
        return originalSetTimeout(fn, delay, ...args);
      };
      global.requestAnimationFrame = (fn) => {
        rafQueue.push(fn);
        return rafQueue.length;
      };
      global.cancelAnimationFrame = () => {};
      Date.now = () => now;
      game.layout.queueSceneMapScopeTransition = (...args) => {
        const result = originalQueueScopeTransition(...args);
        if (game.sceneMapScopeTransition) capturedTransition = { ...game.sceneMapScopeTransition };
        return result;
      };
      try {
        game.execute("jump beorn");
        game.execute("south west");
        game.execute("map");
        game.execute("east");
        while (rafQueue.length) {
          const frame = rafQueue.shift();
          now += 16;
          frame(now);
        }
        while (delayedTimers.length) {
          const finishAnimation = delayedTimers.shift();
          if (typeof finishAnimation === "function") finishAnimation();
        }
        const immediateLeft = Number(scroll.scrollLeft) || 0;
        const immediateTop = Number(scroll.scrollTop) || 0;
        const localMapState = game.sceneMapLayoutState || null;
        const localBox = game.layout.sceneMapScaledIndicatorBoxForRoom(localMapState);
        const viewportWidth = Number(scroll.clientWidth) || 800;
        const viewportHeight = Number(scroll.clientHeight) || 500;
        const localCenterX = localBox ? localBox.left + (localBox.width / 2) : null;
        const localCenterY = localBox ? localBox.top + (localBox.height / 2) : null;
        const expectedLeft = (capturedTransition && localCenterX !== null)
          ? Math.max(0, Math.min(
              Math.round(localCenterX - capturedTransition.offsetX),
              Math.max(0, (Number(localMapState?.width) || 0) - viewportWidth),
            ))
          : null;
        const expectedTop = (capturedTransition && localCenterY !== null)
          ? Math.max(0, Math.min(
              Math.round(localCenterY - capturedTransition.offsetY),
              Math.max(0, (Number(localMapState?.height) || 0) - viewportHeight),
            ))
          : null;
        game.print(`Map drilldown opens local scope immediately after frame move: ${title.textContent === "Beorn's House" ? "yes" : "no"}`);
        game.print(`Map drilldown restores the captured horizontal anchor before any extra pan: ${expectedLeft !== null && immediateLeft === expectedLeft ? "yes" : "no"}`);
        game.print(`Map drilldown restores the captured vertical anchor before any extra pan: ${expectedTop !== null && immediateTop === expectedTop ? "yes" : "no"}`);
        while (rafQueue.length) {
          const frame = rafQueue.shift();
          now += 80;
          frame(now);
        }
        const settledLeft = Number(scroll.scrollLeft) || 0;
        const settledTop = Number(scroll.scrollTop) || 0;
        const settledMapState = game.sceneMapLayoutState || null;
        const settledBox = game.layout.sceneMapScaledIndicatorBoxForRoom(settledMapState);
        const settledRight = settledBox ? settledBox.left + settledBox.width - settledLeft : null;
        const settledBottom = settledBox ? settledBox.top + settledBox.height - settledTop : null;
        game.print(`Map drilldown only pans further when needed: ${settledLeft >= immediateLeft || settledTop !== immediateTop ? "yes" : "no"}`);
        game.print(`Map drilldown keeps the full indicator box on screen after settling: ${settledBox && settledBox.left >= settledLeft && settledBox.top >= settledTop && settledRight <= viewportWidth && settledBottom <= viewportHeight ? "yes" : "no"}`);
        game.print(`Map drilldown stays in local scope after pan: ${title.textContent === "Beorn's House" ? "yes" : "no"}`);
      } finally {
        global.setTimeout = originalSetTimeout;
        global.requestAnimationFrame = originalRequestAnimationFrame;
        global.cancelAnimationFrame = originalCancelAnimationFrame;
        Date.now = originalDateNow;
        game.layout.queueSceneMapScopeTransition = originalQueueScopeTransition;
      }
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "Map drilldown opens local scope immediately after frame move: yes",
      "Map drilldown restores the captured horizontal anchor before any extra pan: yes",
      "Map drilldown restores the captured vertical anchor before any extra pan: yes",
      "Map drilldown only pans further when needed: yes",
      "Map drilldown keeps the full indicator box on screen after settling: yes",
      "Map drilldown stays in local scope after pan: yes",
    ],
  },
  {
    name: "map back can reopen parent scope from the child position",
    drive(game) {
      const title = document.getElementById("scene-map-title");
      const scroll = document.getElementById("scene-map-scroll");
      const originalRequestAnimationFrame = global.requestAnimationFrame;
      const originalCancelAnimationFrame = global.cancelAnimationFrame;
      const originalDateNow = Date.now;
      const originalQueueScopeTransition = game.layout.queueSceneMapScopeTransition.bind(game.layout);
      const rafQueue = [];
      let now = 2000;
      let capturedTransition = null;
      global.requestAnimationFrame = (fn) => {
        rafQueue.push(fn);
        return rafQueue.length;
      };
      global.cancelAnimationFrame = () => {};
      Date.now = () => now;
      game.layout.queueSceneMapScopeTransition = (...args) => {
        const result = originalQueueScopeTransition(...args);
        if (game.sceneMapScopeTransition) capturedTransition = { ...game.sceneMapScopeTransition };
        return result;
      };
      try {
        game.execute("jump smaug");
        game.execute("map");
        game.layout.openSceneMapScope("elven_halls");
        game.layout.openSceneMapScope("long_lake");
        game.layout.sceneMapBack();
        const immediateLeft = Number(scroll.scrollLeft) || 0;
        const immediateTop = Number(scroll.scrollTop) || 0;
        const parentMapState = game.sceneMapLayoutState || null;
        const parentBox = game.layout.sceneMapScaledIndicatorBoxForRoom(parentMapState);
        const viewportWidth = Number(scroll.clientWidth) || 800;
        const viewportHeight = Number(scroll.clientHeight) || 500;
        const parentCenterX = parentBox ? parentBox.left + (parentBox.width / 2) : null;
        const parentCenterY = parentBox ? parentBox.top + (parentBox.height / 2) : null;
        const expectedLeft = (capturedTransition && parentCenterX !== null)
          ? Math.max(0, Math.min(
              Math.round(parentCenterX - capturedTransition.offsetX),
              Math.max(0, (Number(parentMapState?.width) || 0) - viewportWidth),
            ))
          : null;
        const expectedTop = (capturedTransition && parentCenterY !== null)
          ? Math.max(0, Math.min(
              Math.round(parentCenterY - capturedTransition.offsetY),
              Math.max(0, (Number(parentMapState?.height) || 0) - viewportHeight),
            ))
          : null;
        game.print(`Map back opens parent scope immediately: ${title.textContent === "Elvenking's Halls" ? "yes" : "no"}`);
        game.print(`Map back restores the captured horizontal anchor before any extra pan: ${expectedLeft !== null && immediateLeft === expectedLeft ? "yes" : "no"}`);
        game.print(`Map back restores the captured vertical anchor before any extra pan: ${expectedTop !== null && immediateTop === expectedTop ? "yes" : "no"}`);
        while (rafQueue.length) {
          const frame = rafQueue.shift();
          now += 80;
          frame(now);
        }
        const settledLeft = Number(scroll.scrollLeft) || 0;
        const settledTop = Number(scroll.scrollTop) || 0;
        const settledMapState = game.sceneMapLayoutState || null;
        const settledBox = game.layout.sceneMapScaledIndicatorBoxForRoom(settledMapState);
        const settledRight = settledBox ? settledBox.left + settledBox.width - settledLeft : null;
        const settledBottom = settledBox ? settledBox.top + settledBox.height - settledTop : null;
        game.print(`Map back stays valid whether pan is needed or not: ${settledLeft >= 0 && settledTop >= 0 ? "yes" : "no"}`);
        game.print(`Map back keeps the full indicator box on screen after settling: ${settledBox && settledBox.left >= settledLeft && settledBox.top >= settledTop && settledRight <= viewportWidth && settledBottom <= viewportHeight ? "yes" : "no"}`);
        game.print(`Map back stays on parent scope after pan: ${title.textContent === "Elvenking's Halls" ? "yes" : "no"}`);
      } finally {
        global.requestAnimationFrame = originalRequestAnimationFrame;
        global.cancelAnimationFrame = originalCancelAnimationFrame;
        Date.now = originalDateNow;
        game.layout.queueSceneMapScopeTransition = originalQueueScopeTransition;
      }
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "Map back opens parent scope immediately: yes",
      "Map back restores the captured horizontal anchor before any extra pan: yes",
      "Map back restores the captured vertical anchor before any extra pan: yes",
      "Map back stays valid whether pan is needed or not: yes",
      "Map back keeps the full indicator box on screen after settling: yes",
      "Map back stays on parent scope after pan: yes",
    ],
  },
  {
    name: "map supports zoom and local region drilldown",
    drive(game) {
      const title = document.getElementById("scene-map-title");
      const subtitle = document.getElementById("scene-map-subtitle");
      const zoomReset = document.getElementById("scene-map-zoom-reset");
      const backButton = document.getElementById("scene-map-back");
      const canvas = document.getElementById("scene-map-canvas");
      const image = document.getElementById("scene-map-image");
      game.execute("jump beorn");
      game.execute("map");
      game.layout.sceneMapBack();
      const beforeZoomSrc = image.getAttribute("src") || "";
      const decodedMapImage = decodeURIComponent(beforeZoomSrc);
      game.print(`World map has green dragon drilldown: ${canvas.innerHTML.includes('data-map-open-region="green_dragon"') ? "yes" : "no"}`);
      game.print(`World map shows Green Dragon outside node: ${decodedMapImage.includes('data-node-label=\"outside the Green Dragon Inn\"') ? "yes" : "no"}`);
      game.print(`World map shows Green Dragon inn node: ${decodedMapImage.includes('data-node-label=\"Green Dragon Inn\"') ? "yes" : "no"}`);
      game.print(`World map has beorn region: ${canvas.innerHTML.includes('data-map-open-region="beorn"') ? "yes" : "no"}`);
      game.print(`World map has rivendell region: ${canvas.innerHTML.includes('data-map-open-region="rivendell"') ? "yes" : "no"}`);
      game.print(`World map has tunnel access: ${canvas.innerHTML.includes('data-map-open-region="goblin_tunnels"') ? "yes" : "no"}`);
      game.print(`World map shows Hidden Valley Path node: ${decodedMapImage.includes('data-node-label=\"Hidden Valley Path\"') ? "yes" : "no"}`);
      game.print(`World map shows Dry Cave: ${decodedMapImage.includes("Dry Cave") ? "yes" : "no"}`);
      game.print(`World map shows Goblin Tunnels node: ${decodedMapImage.includes('data-node-label=\"Goblin Tunnels\"') ? "yes" : "no"}`);
      game.print(`World map shows Goblin Tunnels connector badge: ${decodedMapImage.includes(">U/D<") ? "yes" : "no"}`);
      game.print(`World map hides tunnel internals: ${decodedMapImage.includes("Deep Dark Lake") || decodedMapImage.includes("Tunnel 14") ? "no" : "yes"}`);
      game.print(`Back visible in world map: ${backButton.hidden ? "no" : "yes"}`);
      game.print(`Back enabled in world map: ${backButton.disabled ? "no" : "yes"}`);
      game.layout.adjustSceneMapZoom(0.1);
      game.print(`Zoom label after zoom in: ${zoomReset.textContent}`);
      game.print(`Map image reused after zoom: ${(image.getAttribute("src") || "") === beforeZoomSrc ? "yes" : "no"}`);
      game.layout.openSceneMapScope("goblin_tunnels");
      const tunnelMapImage = decodeURIComponent(image.getAttribute("src") || "");
      game.print(`Local map title: ${title.textContent}`);
      game.print(`Local map subtitle: ${subtitle.textContent}`);
      game.print(`Tunnel map shows Deep Dark Lake: ${tunnelMapImage.includes("Deep") && tunnelMapImage.includes("Dark") && tunnelMapImage.includes("Lake") ? "yes" : "no"}`);
      game.print(`Tunnel map shows a tunnel node: ${tunnelMapImage.includes("Tunnel 14") ? "yes" : "no"}`);
      game.print(`Back visible in local map: ${backButton.hidden ? "no" : "yes"}`);
      game.print(`Back enabled in local map: ${backButton.disabled ? "no" : "yes"}`);
      game.layout.sceneMapBack();
      game.print(`World map title after back: ${title.textContent}`);
      game.layout.resetSceneMapZoom();
      game.print(`Zoom label after reset: ${zoomReset.textContent}`);
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "World map has green dragon drilldown: no",
      "World map shows Green Dragon outside node: yes",
      "World map shows Green Dragon inn node: yes",
      "World map has beorn region: yes",
      "World map has rivendell region: yes",
      "World map has tunnel access: yes",
      "World map shows Hidden Valley Path node: yes",
      "World map shows Dry Cave: yes",
      "World map shows Goblin Tunnels node: yes",
      "World map shows Goblin Tunnels connector badge: yes",
      "World map hides tunnel internals: yes",
      "Back visible in world map: yes",
      "Back enabled in world map: yes",
      "Zoom label after zoom in: 70%",
      "Map image reused after zoom: yes",
      "Local map title: Goblin Tunnels",
      "Local map subtitle: Local map",
      "Tunnel map shows Deep Dark Lake: yes",
      "Tunnel map shows a tunnel node: yes",
      "Back visible in local map: yes",
      "Back enabled in local map: yes",
      "World map title after back: Explored Map",
      "Zoom label after reset: 60%",
    ],
  },
  {
    name: "misty mountains local map keeps full layout bounds while hiding unvisited rooms",
    setup(game) {
      movePlayerTo(game, "misty_mountain");
    },
    drive(game) {
      const image = document.getElementById("scene-map-image");
      game.execute("map");
      const localMapImage = decodeURIComponent(image.getAttribute("src") || "");
      const state = game.sceneMapRenderCache?.state || null;
      game.print(`Misty Mountains map hides Narrow Ledge before visit: ${localMapImage.includes("Narrow Ledge") ? "no" : "yes"}`);
      game.print(`Misty Mountains map hides Storm Shelter before visit: ${localMapImage.includes("Storm Shelter") ? "no" : "yes"}`);
      game.print(`Misty Mountains map uses editor box width: ${Number(state?.editorMeta?.boxWidth) === 112 ? "yes" : "no"}`);
      game.print(`Misty Mountains map uses editor box height: ${Number(state?.editorMeta?.boxHeight) === 106 ? "yes" : "no"}`);
      game.print(`Misty Mountains map keeps full-width layout bounds: ${(Number(state?.baseWidth) || 0) > 1500 ? "yes" : "no"}`);
      game.print(`Misty Mountains map keeps full-height layout bounds: ${(Number(state?.baseHeight) || 0) > 1200 ? "yes" : "no"}`);
      game.print(`Misty Mountains current node stays left of layout center: ${Number(state?.currentRoomCenterBase?.x) < ((Number(state?.baseWidth) || 0) * 0.45) ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "Misty Mountains map hides Narrow Ledge before visit: yes",
      "Misty Mountains map hides Storm Shelter before visit: yes",
      "Misty Mountains map uses editor box width: yes",
      "Misty Mountains map uses editor box height: yes",
      "Misty Mountains map keeps full-width layout bounds: yes",
      "Misty Mountains map keeps full-height layout bounds: yes",
      "Misty Mountains current node stays left of layout center: yes",
    ],
  },
  {
    name: "one-way level connector uses the editor lane override id format",
    setup(game) {
      movePlayerTo(game, "deep_misty_valley_2");
      game.visitedRooms.add("narrow_path_6");
    },
    drive(game) {
      const image = document.getElementById("scene-map-image");
      game.execute("map");
      const localMapImage = decodeURIComponent(image.getAttribute("src") || "");
      const polylineCount = [...localMapImage.matchAll(/<polyline points=\"([^\"]+)\"/g)].length;
      const lineCount = [...localMapImage.matchAll(/<line x1=\"([^\"]+)\" y1=\"([^\"]+)\" x2=\"([^\"]+)\" y2=\"([^\"]+)\"/g)].length;
      game.print(`Deep Misty connector keeps waypoint polyline: ${polylineCount >= 1 ? "yes" : "no"}`);
      game.print(`Deep Misty connector avoids fallback straight line: ${lineCount === 0 ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "Deep Misty connector keeps waypoint polyline: yes",
      "Deep Misty connector avoids fallback straight line: yes",
    ],
  },
  {
    name: "map rises back to world scope when the room leaves the local region and delays re-drilldown on re-entry",
    drive(game) {
      const title = document.getElementById("scene-map-title");
      game.execute("map");
      game.print(`Initial local title: ${title.textContent}`);
      game.execute("open door");
      game.execute("east");
      game.print(`Title after leaving local region: ${title.textContent}`);
      game.execute("west");
      game.print(`Title immediately after re-entering local region: ${title.textContent}`);
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "Initial local title: Bilbo's Home",
      "Title after leaving local region: Explored Map",
      "Title immediately after re-entering local region: Explored Map",
    ],
  },
  {
    name: "map opens directly to the current nested local scope and still allows manual parent browsing",
    setup(game) {
      movePlayerTo(game, "lower_halls");
      game.visitedRooms.add("cellar");
      game.visitedRooms.add("front_gate");
    },
    drive(game) {
      const title = document.getElementById("scene-map-title");
      game.execute("map");
      game.print(`Initial nested local title: ${title.textContent}`);
      game.layout.openSceneMapScope("elven_halls");
      game.print(`Manual parent title: ${title.textContent}`);
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "Initial nested local title: Erebor",
      "Manual parent title: Elvenking's Halls",
    ],
  },
  {
    name: "map zoom also responds to wheel and touchpad-style pinch events",
    drive(game) {
      const zoomReset = document.getElementById("scene-map-zoom-reset");
      let prevented = false;
      game.execute("map");
      game.layout.handleSceneMapWheel({
        deltaY: -120,
        ctrlKey: true,
        clientX: 280,
        clientY: 220,
        preventDefault() { prevented = true; },
      });
      game.print(`Wheel zoom label: ${zoomReset.textContent}`);
      game.print(`Wheel zoom prevented default: ${prevented ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "Wheel zoom label: 70%",
      "Wheel zoom prevented default: yes",
    ],
  },
  {
    name: "map back rises to world overview before closing it",
    drive(game) {
      const overlay = document.getElementById("scene-map-overlay");
      const image = document.getElementById("room-image");
      const title = document.getElementById("scene-map-title");
      const beforeMapSrc = image.getAttribute("src") || "";
      game.execute("map");
      game.layout.sceneMapBack();
      game.print(`Title after first back: ${title.textContent}`);
      game.print(`World map still visible after first back: ${Object.prototype.hasOwnProperty.call(overlay.attributes, "hidden") ? "no" : "yes"}`);
      game.layout.sceneMapBack();
      const hiddenAfterSecondBack = Object.prototype.hasOwnProperty.call(overlay.attributes, "hidden") ? "yes" : "no";
      game.print(`World map hidden after second back: ${hiddenAfterSecondBack}`);
      game.print(`Room image restored after second back: ${(image.getAttribute("src") || "") === beforeMapSrc ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "Title after first back: Explored Map",
      "World map still visible after first back: yes",
      "World map hidden after second back: yes",
      "Room image restored after second back: yes",
    ],
  },
  {
    name: "map supports nested local scope navigation from erebor back to world",
    drive(game) {
      const title = document.getElementById("scene-map-title");
      const subtitle = document.getElementById("scene-map-subtitle");
      const backButton = document.getElementById("scene-map-back");
      const canvas = document.getElementById("scene-map-canvas");
      const image = document.getElementById("scene-map-image");
      game.execute("jump smaug");
      game.execute("map");
      const ereborMapImage = decodeURIComponent(image.getAttribute("src") || "");
      game.print(`Initial nested title: ${title.textContent}`);
      game.print(`Initial nested subtitle: ${subtitle.textContent}`);
      game.print(`Erebor map hides Long Lake detail: ${ereborMapImage.includes("Long Lake") ? "no" : "yes"}`);
      game.layout.sceneMapBack();
      const longLakeMapImage = decodeURIComponent(image.getAttribute("src") || "");
      game.print(`Title after one back: ${title.textContent}`);
      game.print(`Long Lake subtitle: ${subtitle.textContent}`);
      game.print(`Long Lake shows Front Gate host room: ${longLakeMapImage.includes("Front Gate") ? "yes" : "no"}`);
      game.print(`Long Lake hides Lower Halls detail: ${longLakeMapImage.includes("Lower Halls") ? "no" : "yes"}`);
      game.print(`Back visible in nested local map: ${backButton.hidden ? "no" : "yes"}`);
      game.layout.sceneMapBack();
      game.print(`Title after second back: ${title.textContent}`);
      game.print(`Elven halls has long lake portal: ${canvas.innerHTML.includes('data-map-open-region="long_lake"') ? "yes" : "no"}`);
      game.layout.sceneMapBack();
      game.print(`Title after third back: ${title.textContent}`);
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "Initial nested title: Erebor",
      "Initial nested subtitle: Local map",
      "Erebor map hides Long Lake detail: yes",
      "Title after one back: Long Lake",
      "Long Lake subtitle: Local map",
      "Long Lake shows Front Gate host room: no",
      "Long Lake hides Lower Halls detail: yes",
      "Back visible in nested local map: yes",
      "Title after second back: Elvenking's Halls",
      "Elven halls has long lake portal: yes",
      "Title after third back: Explored Map",
    ],
  },
  {
    name: "complete map shows every room without altering visited progress",
    drive(game) {
      const overlay = document.getElementById("scene-map-overlay");
      const title = document.getElementById("scene-map-title");
      const canvas = document.getElementById("scene-map-canvas");
      const image = document.getElementById("scene-map-image");
      const scroll = document.getElementById("scene-map-scroll");
      const visitedBefore = game.visitedRooms.size;
      game.execute("complete map");
      const visible = Object.prototype.hasOwnProperty.call(overlay.attributes, "hidden") ? "no" : "yes";
      const worldMapImage = decodeURIComponent(image.getAttribute("src") || "");
      game.print(`Complete map overlay visible: ${visible}`);
      game.print(`Complete map opens away from far left: ${Number(scroll.scrollLeft) > 0 ? "yes" : "no"}`);
      game.print(`Complete map has Elven halls region: ${canvas.innerHTML.includes('data-map-open-region="elven_halls"') ? "yes" : "no"}`);
      game.print(`Complete map world view hides Lower Halls detail: ${worldMapImage.includes("Lower Halls") ? "no" : "yes"}`);
      game.layout.openSceneMapScope("long_lake");
      const longLakeMapImage = decodeURIComponent(image.getAttribute("src") || "");
      game.print(`Complete map long lake title: ${title.textContent}`);
      game.print(`Complete map long lake shows Erebor portal: ${longLakeMapImage.includes("Erebor") ? "yes" : "no"}`);
      game.print(`Complete map long lake hides Lower Halls detail: ${longLakeMapImage.includes("Lower Halls") ? "no" : "yes"}`);
      game.print(`Complete map long lake shows Front Gate: ${longLakeMapImage.includes("Front Gate") ? "yes" : "no"}`);
      game.print(`Visited rooms unchanged: ${game.visitedRooms.size === visitedBefore ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You unfurl a complete test map of Wilderland, with every known place marked upon it.",
      "Complete map overlay visible: yes",
      "Complete map opens away from far left: yes",
      "Complete map has Elven halls region: yes",
      "Complete map world view hides Lower Halls detail: yes",
      "Complete map long lake title: Long Lake",
      "Complete map long lake shows Erebor portal: yes",
      "Complete map long lake hides Lower Halls detail: yes",
      "Complete map long lake shows Front Gate: yes",
      "Visited rooms unchanged: yes",
    ],
  },
  {
    name: "jump command lists available checkpoints",
    drive(game) {
      game.execute("jumps");
    },
    expectedIncluded: [
      'Jump checkpoints: type "jump <name>".',
      "green: On the road outside the inn",
      "inn: After Bag End",
      "cave: After looting the trolls' cave",
      "smaug: In Erebor with Bard present",
    ],
  },
  {
    name: "jump before green dragon applies a coherent pre-inn state",
    drive(game) {
      game.execute("jump before_green_dragon");
      game.print(`Jump room: ${game.currentRoom}`);
      game.print(`Has map: ${game.findInInventory("curious map") ? "yes" : "no"}`);
      game.print(`Has key: ${game.findInInventory("curious key") ? "yes" : "no"}`);
      game.print(`Has pipe: ${game.findInInventory("smoking pipe") ? "yes" : "no"}`);
      game.print(`Pony sequence started: ${game.flags.seenpony ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to Before Green Dragon.",
      "Jump room: green_dragon_inn_outside",
      "Has map: yes",
      "Has key: yes",
      "Has pipe: yes",
      "Pony sequence started: no",
    ],
  },
  {
    name: "jump green dragon applies a coherent inn milestone state",
    drive(game) {
      game.execute("jump green_dragon");
      game.print(`Jump room: ${game.currentRoom}`);
      game.print(`Has map: ${game.findInInventory("curious map") ? "yes" : "no"}`);
      game.print(`Has pipe: ${game.findInInventory("smoking pipe") ? "yes" : "no"}`);
      game.print(`Pony sequence started: ${game.flags.seenpony ? "yes" : "no"}`);
      game.print(`Autoplay next at inn: ${game.nextAutoplayCommand()}`);
    },
    expectedIncluded: [
      "Jumped to Green Dragon Inn.",
      "Jump room: green_dragon_inn",
      "Has map: yes",
      "Has pipe: yes",
      "Pony sequence started: no",
      "Autoplay next at inn: open weathered oak door",
    ],
  },
  {
    name: "green dragon outside and inside stay connected for relative travel",
    drive(game) {
      game.execute("jump green_dragon");
      game.execute("go outside");
      game.print(`Room after outside: ${game.currentRoom}`);
      game.execute("go inside");
      game.print(`Room after inside: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "Jumped to Green Dragon Inn.",
      "Room after outside: green_dragon_inn_outside",
      "Room after inside: green_dragon_inn",
    ],
    notExpectedIncluded: [
      "You are already inside.",
      "You can't go that way.",
    ],
  },
  {
    name: "jump after trolls cave applies a coherent post-loot state",
    drive(game) {
      game.execute("jump after_trolls_cave");
      game.print(`Jump room: ${game.currentRoom}`);
      game.print(`Has sword: ${game.findInInventory("majestic sword") ? "yes" : "no"}`);
      game.print(`Has rope: ${game.findInInventory("sturdy rope") ? "yes" : "no"}`);
      game.print(`Has large key: ${game.findInInventory("large key") ? "yes" : "no"}`);
      game.print(`Trolls transformed: ${game.trollsTransformed ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to After Trolls Cave.",
      "Jump room: trollshaws_road",
      "Has sword: yes",
      "Has rope: yes",
      "Has large key: no",
      "Trolls transformed: yes",
    ],
  },
  {
    name: "critical rope cannot be given away in rivendell before later travel needs",
    drive(game) {
      game.execute("jump rivendell");
      game.execute("give rope to elrond");
      game.print(`Has rope after refusal: ${game.findInInventory("sturdy rope") ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Elrond smiles faintly and says 'Keep the rope.",
      "Has rope after refusal: yes",
    ],
    notExpectedIncluded: [
      "You give the sturdy rope to Elrond.",
    ],
  },
  {
    name: "critical rope cannot be dropped before reaching beorn",
    drive(game) {
      game.execute("jump rivendell");
      game.execute("drop rope");
      game.print(`Has rope after early drop refusal: ${game.findInInventory("sturdy rope") ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Until the road has safely carried you as far as Beorn",
      "Has rope after early drop refusal: yes",
    ],
    notExpectedIncluded: [
      "You leave the sturdy rope.",
    ],
  },
  {
    name: "rope can be dropped after reaching beorn",
    drive(game) {
      game.execute("jump beorn");
      game.execute("drop rope");
      game.print(`Has rope after beorn drop: ${game.findInInventory("sturdy rope") ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You leave the sturdy rope.",
      "Has rope after beorn drop: no",
    ],
  },
  {
    name: "jump rivendell lets autoplay continue from elronds counsel instead of backtracking west",
    drive(game) {
      game.execute("jump rivendell");
      game.print(`Autoplay next from Rivendell: ${game.nextAutoplayCommand()}`);
    },
    expectedIncluded: [
      "Jumped to Rivendell.",
      "Autoplay next from Rivendell: talk to elrond",
    ],
    notExpectedIncluded: [
      "Autoplay next from Rivendell: west",
    ],
  },
  {
    name: "jump rivendell applies a coherent milestone state",
    drive(game) {
      game.execute("jump rivendell");
      game.print(`Jump room: ${game.currentRoom}`);
      game.print(`Has map: ${game.findInInventory("curious map") ? "yes" : "no"}`);
      game.print(`Has key: ${game.findInInventory("curious key") ? "yes" : "no"}`);
      game.print(`Has rope: ${game.findInInventory("sturdy rope") ? "yes" : "no"}`);
      game.print(`Has firestone: ${game.findInInventory("firestone") ? "yes" : "no"}`);
      game.print(`Has large key: ${game.findInInventory("large key") ? "yes" : "no"}`);
      game.print(`Has sword: ${game.findInInventory("majestic sword") ? "yes" : "no"}`);
      game.print(`Trolls transformed: ${game.trollsTransformed ? "yes" : "no"}`);
      game.print(`Rivendell ready: ${game.rivendellPreparationsComplete() ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to Rivendell.",
      "Jump room: rivendell",
      "Has map: yes",
      "Has key: yes",
      "Has rope: yes",
      "Has firestone: yes",
      "Has large key: no",
      "Has sword: yes",
      "Trolls transformed: yes",
      "Rivendell ready: no",
    ],
  },
  {
    name: "rivendell blocks eastward departure until elronds counsel is complete",
    drive(game) {
      game.execute("jump rivendell");
      game.execute("east");
      game.print(`Room after blocked departure: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "Jumped to Rivendell.",
      "The road continues eastward, but the company seems strangely reluctant to depart.",
      "Room after blocked departure: rivendell",
    ],
  },
  {
    name: "elrond conversation can naturally complete rivendell preparations",
    drive(game) {
      game.execute("jump rivendell");
      game.execute("talk to elrond");
      game.execute("ask elrond about journey");
      game.print(`Rivendell ready after counsel: ${game.rivendellPreparationsComplete() ? "yes" : "no"}`);
      game.execute("east");
      game.print(`Room after counsel departure: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "After hearing you out, Elrond's gaze lingers on the weathered things the company has carried so far.",
      "As the talk deepens, Elrond's attention settles at last on the old tokens of the quest.",
      "When he speaks again, it is only to mark a narrow western door",
      "Rivendell ready after counsel: yes",
      "Room after counsel departure: misty_mountain",
    ],
    notExpectedIncluded: [
      "You need Elrond",
      "You cannot go that way",
    ],
  },
  {
    name: "rivendell departure also requires bilbo to carry the curious map",
    drive(game) {
      game.execute("jump rivendell");
      game.execute("talk to elrond");
      game.execute("ask elrond about journey");
      game.execute("give map to elrond");
      game.execute("east");
      game.print(`Room after mapless departure attempt: ${game.currentRoom}`);
      game.execute("take map from elrond");
      game.execute("east");
      game.print(`Room after recovered-map departure: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "You give the curious map to Elrond.",
      "The road east is open at last, yet Bilbo hesitates. The curious map ought to travel with him, not remain behind in Rivendell.",
      "Room after mapless departure attempt: rivendell",
      "You take the curious map from Elrond.",
      "Room after recovered-map departure: misty_mountain",
    ],
  },
  {
    name: "jump trolls preserves offscreen dawn progression after leaving the clearing",
    drive(game) {
      game.execute("jump trolls");
      game.execute("east");
      game.execute("south west");
      game.execute("wait");
      game.execute("wait");
      game.execute("wait");
      game.print(`Trolls transformed after waits: ${game.trollsTransformed ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to Troll Approach.",
      "Day dawns.",
      "Trolls transformed after waits: yes",
    ],
  },
  {
    name: "ordinary turns do not advance troll dawn unless the key was stolen",
    drive(game) {
      game.execute("jump trolls");
      game.execute("east");
      game.execute("south west");
      game.execute("look");
      game.execute("inventory");
      game.execute("exits");
      game.print(`Trolls transformed after ordinary turns without theft: ${game.trollsTransformed ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to Troll Approach.",
      "Trolls transformed after ordinary turns without theft: no",
    ],
    notExpectedIncluded: [
      "Day dawns.",
    ],
  },
  {
    name: "informational commands do not advance troll dawn after stealing the key and leaving",
    drive(game) {
      game.execute("jump trolls");
      game.execute("east");
      game.execute("carefully take large key and south west");
      game.execute("look");
      game.execute("inventory");
      game.execute("exits");
      game.print(`Trolls transformed after ordinary turns with theft: ${game.trollsTransformed ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to Troll Approach.",
      "You take the large key.",
      "Trolls transformed after ordinary turns with theft: no",
    ],
    notExpectedIncluded: [
      "Day dawns.",
    ],
  },
  {
    name: "waiting still advances troll dawn after stealing the key and leaving",
    drive(game) {
      game.execute("jump trolls");
      game.execute("east");
      game.execute("carefully take large key and south west");
      game.execute("wait");
      game.execute("wait");
      game.execute("wait");
      game.print(`Trolls transformed after waits with theft: ${game.trollsTransformed ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to Troll Approach.",
      "You take the large key.",
      "Day dawns.",
      "Trolls transformed after waits with theft: yes",
    ],
  },
  {
    name: "jump trolls lands one move before the opening troll argument",
    drive(game) {
      game.execute("jump trolls");
      game.execute("east");
    },
    expectedIncluded: [
      "Jumped to Troll Approach.",
      "You crouch low behind a mossy boulder, heart pounding, as the trolls argue by the flickering campfire in the moonlit clearing.",
      "What shall us do with him?",
      "Roast him!",
    ],
  },
  {
    name: "jump trolls allows one orienting command before bilbo is in immediate danger",
    drive(game) {
      game.execute("jump trolls");
      game.execute("east");
      game.execute("look");
      game.print(`Endgame after first look: ${game.endgame ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to Troll Approach.",
      "You are in the trolls' clearing.",
      "Endgame after first look: no",
    ],
    notExpectedIncluded: [
      "The hideous troll stoops, snatches you up before you can slip away",
      "Hideous troll attacks you.",
    ],
  },
  {
    name: "troll key fatal branch maps to the stealing death image",
    drive(game) {
      game.print(`Troll key death image: ${game.specialActions.specialActionFatalImage({ location: "Trolls clearing", verb: "take", obj1: "*large key", destination: "endgame" }) || "none"}`);
    },
    expectedIncluded: [
      "Troll key death image: troll_catches_bilbo_stealing_key_death.png",
    ],
  },
  {
    name: "attacking a live troll shows the desperate troll death image",
    drive(game) {
      game.execute("jump trolls");
      game.execute("east");
      game.execute("kill troll");
      game.print(`Troll attack death image: ${game.temporaryImage?.file || "none"}`);
    },
    expectedIncluded: [
      "Troll attack death image: bilbo_troll_desperate_attack_death.png",
    ],
  },
  {
    name: "jump gollum applies a coherent pre-riddle state",
    drive(game) {
      game.execute("jump gollum");
      game.print(`Jump room: ${game.currentRoom}`);
      game.print(`Rivendell ready: ${game.rivendellPreparationsComplete() ? "yes" : "no"}`);
      game.print(`Has ring: ${game.findInInventory("golden ring") ? "yes" : "no"}`);
      game.print(`Gollum here: ${game.characters.gollum?.position === game.currentRoom ? "yes" : "no"}`);
      game.print(`Autoplay next at lake: ${game.nextAutoplayCommand()}`);
    },
    expectedIncluded: [
      "Jumped to Deep Dark Lake.",
      "Jump room: deep_dark_lake",
      "Rivendell ready: yes",
      "Has ring: no",
      "Gollum here: yes",
      "Autoplay next at lake: light lantern",
    ],
  },
  {
    name: "deep dark lake entrance makes separation from the company explicit",
    setup(game) {
      game.currentRoom = "dark_stuffy_passage_13";
      game.player.position = "dark_stuffy_passage_13";
    },
    drive(game) {
      game.execute("south");
    },
    expectedIncluded: [
      "No answering voice of Gandalf or the dwarves reaches you here. Blind passages and black water have cut you off from the company.",
    ],
  },
  {
    name: "jump beorn applies a coherent arrival state",
    drive(game) {
      game.execute("jump beorn");
      game.print(`Jump room: ${game.currentRoom}`);
      game.print(`Has ring: ${game.findInInventory("golden ring") ? "yes" : "no"}`);
      game.print(`Eagles rescued: ${game.flags.eagles_rescued_company ? "yes" : "no"}`);
      game.print(`Beorn dinner seen: ${game.flags.beorn_dinner_seen ? "yes" : "no"}`);
      game.print(`Beorn here: ${game.characters.beorn?.position === game.currentRoom ? "yes" : "no"}`);
      game.print(`Strength at Beorn: ${game.player.strength}`);
      game.print(`Visited Green Dragon Inn: ${game.visitedRooms.has("green_dragon_inn") ? "yes" : "no"}`);
      game.print(`Visited Hidden Path: ${game.visitedRooms.has("hidden_path") ? "yes" : "no"}`);
      game.print(`Visited Trolls Cave: ${game.visitedRooms.has("trolls_cave") ? "yes" : "no"}`);
      game.print(`Visited Dry Cave: ${game.visitedRooms.has("large_dry_cave") ? "yes" : "no"}`);
      game.print(`Visited Deep Dark Lake: ${game.visitedRooms.has("deep_dark_lake") ? "yes" : "no"}`);
      game.print(`Visited Goblins Gate Outside: ${game.visitedRooms.has("outside_goblins_gate") ? "yes" : "no"}`);
      game.print(`Visited Great River: ${game.visitedRooms.has("great_river") ? "yes" : "no"}`);
      game.print(`Autoplay next at Beorn: ${game.nextAutoplayCommand()}`);
    },
    expectedIncluded: [
      "Jumped to Beorn's House.",
      "Jump room: beorns_house",
      "Has ring: yes",
      "Eagles rescued: yes",
      "Beorn dinner seen: yes",
      "Beorn here: yes",
      "Strength at Beorn: 5",
      "Visited Green Dragon Inn: yes",
      "Visited Hidden Path: yes",
      "Visited Trolls Cave: yes",
      "Visited Dry Cave: yes",
      "Visited Deep Dark Lake: yes",
      "Visited Goblins Gate Outside: yes",
      "Visited Great River: yes",
      "Autoplay next at Beorn: open curtain",
    ],
  },
  {
    name: "beorn arrival now stages the uncanny hospitality scene",
    drive(game) {
      game.execute("jump beorn");
      game.print(`Beorn dinner seen: ${game.flags.beorn_dinner_seen ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "great dogs pad in on their hind legs with trays",
      "the board is soon spread with bread, honey, cream, and a prodigious supper",
      "Beorn dinner seen: yes",
    ],
  },
  {
    name: "outside goblins gate now leads east into the treeless opening",
    setup(game) {
      game.currentRoom = "outside_goblins_gate";
      game.player.position = "outside_goblins_gate";
    },
    drive(game) {
      game.execute("east");
      game.print(`Room after gate exit: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "Room after gate exit: treeless_opening",
    ],
  },
  {
    name: "going east from outside goblins gate can trigger the warg escape in normal play",
    setup(game) {
      game.currentRoom = "outside_goblins_gate";
      game.player.position = "outside_goblins_gate";
      game.gollumState = game.createGollumState();
      game.gollumState.met = true;
      game.gollumState.pocketQuestionAsked = true;
      game.gollumState.escaped = true;
    },
    drive(game) {
      game.execute("east");
      game.print(`Warg escape started: ${game.flags.warg_escape_started ? "yes" : "no"}`);
      game.print(`Current room after trigger: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "Bursting out from the goblin gate at last, you find Gandalf and the dwarves hard pressed in the open below the mountain.",
      "Warg escape started: yes",
      "Current room after trigger: treeless_opening",
    ],
  },
  {
    name: "reaching the open ground after gollum starts the warg escape scene",
    setup(game) {
      game.currentRoom = "treeless_opening";
      game.player.position = "treeless_opening";
      game.gollumState = game.createGollumState();
      game.gollumState.met = true;
      game.gollumState.pocketQuestionAsked = true;
      game.gollumState.escaped = true;
    },
    drive(game) {
      game.checkSpecialSituations();
      game.print(`Warg escape started: ${game.flags.warg_escape_started ? "yes" : "no"}`);
      game.print(`Gandalf here: ${game.characters.gandalf?.position === game.currentRoom ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Bursting out from the goblin gate at last, you find Gandalf and the dwarves hard pressed in the open below the mountain.",
      "Warg escape started: yes",
      "Gandalf here: yes",
    ],
  },
  {
    name: "climbing into the pines and waiting brings the eagles to the great river",
    setup(game) {
      game.currentRoom = "treeless_opening";
      game.player.position = "treeless_opening";
      game.gollumState = game.createGollumState();
      game.gollumState.met = true;
      game.gollumState.pocketQuestionAsked = true;
      game.gollumState.escaped = true;
      game.beginWargEscape();
    },
    drive(game) {
      game.execute("climb tree");
      game.execute("wait");
      game.print(`Eagles rescue autosave: ${game.autosaveMeta?.label || "none"}`);
      game.print(`Eagles rescued: ${game.flags.eagles_rescued_company ? "yes" : "no"}`);
      game.print(`Room after rescue: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "With wolves already sweeping the clearing, you scramble up among the pines as Gandalf and the dwarves do the same.",
      "Eagles stoop from above the mountain, seize the company out of smoke and branches, and bear you far from the goblins' fury.",
      "Eagles rescue autosave: after the eagles' rescue",
      "Eagles rescued: yes",
      "Room after rescue: great_river",
    ],
  },
  {
    name: "waiting in the open during the warg escape is fatal",
    setup(game) {
      game.currentRoom = "treeless_opening";
      game.player.position = "treeless_opening";
      game.gollumState = game.createGollumState();
      game.gollumState.met = true;
      game.gollumState.pocketQuestionAsked = true;
      game.gollumState.escaped = true;
      game.beginWargEscape();
    },
    drive(game) {
      game.execute("wait");
      game.print(`Endgame after open wait: ${game.endgame ? "yes" : "no"}`);
      game.print(`Warg death image: ${game.temporaryImage?.file || "none"}`);
    },
    expectedIncluded: [
      "You wait in the open for one instant too long.",
      "The wargs rush in before the trees can be reached, and the night under the mountain ends in teeth and trampling.",
      "Endgame after open wait: yes",
      "Warg death image: warg_kills_bilbo_death.png",
    ],
  },
  {
    name: "autoplay carries the warg escape through eagles to beorn",
    setup(game) {
      game.debugCompleteUnexpectedParty();
      game.debugMarkPonyProgress();
      game.debugMarkTrollRoadProgress();
      game.debugMarkMountainProgress();
      game.debugMarkGoblinTunnelProgress();
      game.debugMarkGoblinEscapeProgress();
      game.transformTrolls();
      game.flags.mapread = true;
      game.flags.rivendell_preparations_complete = true;
      game.flags.rivendellropesecured = true;
      game.debugGiveJourneyCheckpointLoadout({ ring: true });
      game.currentRoom = "treeless_opening";
      game.player.position = "treeless_opening";
      game.gollumState = game.createGollumState();
      game.gollumState.met = true;
      game.gollumState.pocketQuestionAsked = true;
      game.gollumState.escaped = true;
      game.beginWargEscape();
    },
    drive(game) {
      const issued = [];
      for (let step = 0; step < 20 && game.currentRoom !== "beorns_house" && !game.endgame; step += 1) {
        const command = game.nextAutoplayCommand();
        if (!command) throw new Error(`Autoplay stopped unexpectedly at step ${step} in ${game.currentRoom}.`);
        issued.push(command);
        game.execute(command);
      }
      if (game.currentRoom !== "beorns_house") {
        throw new Error(`Autoplay did not reach Beorn's house. Commands: ${issued.join(" | ")}`);
      }
      game.print(`Autoplay used tree climb: ${issued.includes("climb tree") ? "yes" : "no"}`);
      game.print(`Autoplay used eagle wait: ${issued.includes("wait") ? "yes" : "no"}`);
      game.print(`Autoplay Beorn arrival room: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "Autoplay used tree climb: yes",
      "Autoplay used eagle wait: yes",
      "Autoplay Beorn arrival room: beorns_house",
    ],
  },
  {
    name: "beorn and mirkwood connectors follow the manual-map structure",
    drive(game) {
      game.execute("jump beorn");
      const beornExits = game.roomConnections().map((connection) => `${connection.direction}:${connection.to}`).sort().join(" | ");
      game.print(`Beorn exits: ${beornExits}`);
      game.execute("north");
      const riverExits = game.roomConnections().map((connection) => `${connection.direction}:${connection.to}`).sort().join(" | ");
      game.print(`Great River exits: ${riverExits}`);
      game.execute("east");
      game.print(`Gate room after river crossing: ${game.currentRoom}`);
      game.execute("south");
      game.print(`Forest approach room: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "Beorn exits: east:beorn_great_hall | north:great_river | south west:narrow_dangerous_path",
      "Great River exits: east:gate_to_mirkwood | south:beorns_house",
      "Gate room after river crossing: gate_to_mirkwood",
      "Forest approach room: forest_road",
    ],
    notExpectedIncluded: [
      "north east:gate_to_mirkwood",
      "north west:gate_to_mirkwood",
      "south:forest_road",
      "south west:misty_mountain",
    ],
  },
  {
    name: "green dragon companion narrative never emits a broken sentence for thorin",
    drive(game) {
      game.execute("jump green_dragon");
      game.execute("look");
    },
    expectedIncluded: [
      "Thorin",
    ],
    notExpectedIncluded: [
      "Thorin  .",
    ],
  },
  {
    name: "stone trolls do not mark a pre-battle autosave",
    drive(game) {
      game.execute("jump rivendell");
      game.execute("west");
      game.execute("west");
      game.execute("north west");
      game.print(`Stone trolls autosave: ${game.autosaveMeta?.label || "none"}`);
    },
    expectedIncluded: [
      "Jumped to Rivendell.",
      "Morning has reduced menace to silence; the stone trolls keep their quarrel forever without coming any nearer.",
      "Stone trolls autosave: none",
    ],
    notExpectedIncluded: [
      "Game saved.",
    ],
  },
  {
    name: "surviving the trolls marks a post-danger autosave",
    drive(game) {
      game.execute("jump trolls");
      game.execute("east");
      outputLines.length = 0;
      game.execute("carefully take large key and south west");
      game.execute("wait");
      game.execute("wait");
      game.execute("wait");
      game.print(`Troll survival autosave: ${game.autosaveMeta?.label || "none"}`);
    },
    expectedIncluded: [
      "Day dawns.",
      "Troll survival autosave: after outlasting the trolls",
    ],
  },
  {
    name: "post-troll road to rivendell requires bilbo to carry a blade",
    drive(game) {
      game.execute("jump trolls");
      game.execute("east");
      game.transformTrolls();
      game.execute("south east");
      game.print(`Road room after block: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "Jumped to Troll Approach.",
      "The Trollshaws are no place for you to go unarmed.",
      "Road room after block: trolls_clearing",
    ],
  },
  {
    name: "live trolls block the open road toward rivendell without killing bilbo",
    drive(game) {
      game.execute("jump trolls");
      game.execute("east");
      game.execute("south east");
      game.print(`Road room with live trolls: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "Jumped to Troll Approach.",
      "The road toward Rivendell lies bare in the trolls' firelight.",
      "Road room with live trolls: trolls_clearing",
    ],
    notExpectedIncluded: [
      "The tale ends here.",
      "You have died",
      "Game over",
    ],
  },
  {
    name: "live trolls treat east as a safe rivendellward attempt",
    drive(game) {
      game.execute("jump trolls");
      game.execute("east");
      game.execute("east");
      game.print(`Endgame after eastward attempt: ${game.endgame ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to Troll Approach.",
      "The road toward Rivendell lies bare in the trolls' firelight.",
      "Endgame after eastward attempt: no",
    ],
    notExpectedIncluded: [
      "You see no exit in that direction.",
      "Hideous troll attacks you.",
    ],
  },
  {
    name: "repeated rivendellward attempts in the troll clearing do not themselves get bilbo killed",
    drive(game) {
      game.execute("jump trolls");
      game.execute("east");
      game.execute("east");
      game.execute("south east");
      game.execute("east");
      game.print(`Endgame after repeated rivendellward attempts: ${game.endgame ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "The road toward Rivendell lies bare in the trolls' firelight.",
      "You steal a glance toward the eastern road",
      "Endgame after repeated rivendellward attempts: no",
    ],
    notExpectedIncluded: [
      "Hideous troll attacks you.",
    ],
  },
  {
    name: "hidden valley descent can be secured to the roots",
    setup(game) {
      game.debugCompleteUnexpectedParty();
      game.debugMarkPonyProgress();
      game.transformTrolls();
      game.debugGiveStandardLoadout({ map: true, key: true, pipe: true, lantern: true, sword: true, rope: true });
      game.currentRoom = "hidden_valley_path";
      game.player.position = "hidden_valley_path";
    },
    drive(game) {
      game.execute("east");
      game.execute("tie rope to roots");
      game.execute("east");
      game.print(`Descent room after roots: ${game.currentRoom}`);
      game.print(`Rope kept after descent: ${game.findInInventory("sturdy rope") ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "The path falls away too sharply to trust by balance alone.",
      "You fasten the sturdy rope twice around the pine roots",
      "Once all are down, the line is worked loose and taken up again",
      "Descent room after roots: rivendell",
      "Rope kept after descent: yes",
    ],
  },
  {
    name: "returning to the hidden valley path after descent keeps rope fiction coherent",
    setup(game) {
      game.debugCompleteUnexpectedParty();
      game.debugMarkPonyProgress();
      game.transformTrolls();
      game.debugGiveStandardLoadout({ map: true, key: true, pipe: true, lantern: true, sword: true, rope: true });
      game.currentRoom = "hidden_valley_path";
      game.player.position = "hidden_valley_path";
      placeCharacterWithPlayer(game, "thorin");
    },
    drive(game) {
      game.execute("ask thorin to brace rope");
      game.execute("east");
      game.execute("west");
      game.execute("tie rope to roots");
    },
    expectedIncluded: [
      "At your word, Thorin plants boots on the rock",
      "Once all are down, the line is worked loose and taken up again",
      "You have already proved out the descent here; with the way known, the company could rig the rope again in moments if needed.",
    ],
    notExpectedIncluded: [
      "The rope is already made fast for the descent.",
    ],
  },
  {
    name: "companions can brace the rope for the hidden valley descent",
    setup(game) {
      game.debugCompleteUnexpectedParty();
      game.debugMarkPonyProgress();
      game.transformTrolls();
      game.debugGiveStandardLoadout({ map: true, key: true, pipe: true, lantern: true, sword: true, rope: true });
      game.currentRoom = "hidden_valley_path";
      game.player.position = "hidden_valley_path";
      placeCharacterWithPlayer(game, "thorin");
    },
    drive(game) {
      game.execute("ask thorin to brace rope");
      game.execute("east");
      game.print(`Descent room after companion brace: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "At your word, Thorin plants",
      "Descent room after companion brace: rivendell",
    ],
  },
  {
    name: "hidden valley climb down uses the rope gate and then the descent",
    setup(game) {
      game.debugCompleteUnexpectedParty();
      game.debugMarkPonyProgress();
      game.transformTrolls();
      game.debugGiveStandardLoadout({ map: true, key: true, pipe: true, lantern: true, sword: true, rope: true });
      game.currentRoom = "hidden_valley_path";
      game.player.position = "hidden_valley_path";
    },
    drive(game) {
      game.execute("climb down");
      game.execute("tie rope to spike");
      game.execute("climb down");
      game.print(`Descent room after climb down: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "The path falls away too sharply to trust by balance alone.",
      "You hitch the sturdy rope around the old iron spike",
      "With the rope taking the worst of the drop",
      "Descent room after climb down: rivendell",
    ],
    notExpectedIncluded: [
      "You try to climb down, but nothing special happens.",
    ],
  },
  {
    name: "layout 2 compass follows visible exits and hides in darkness",
    drive(game) {
      game.setLayoutMode("2");
      game.execute("jump rivendell");
      const compass = document.getElementById("scene-compass");
      const east = document.getElementById("scene-compass-east").getAttribute("data-active") || "false";
      const west = document.getElementById("scene-compass-west").getAttribute("data-active") || "false";
      const north = document.getElementById("scene-compass-north").getAttribute("data-active") || "false";
      const visible = Object.prototype.hasOwnProperty.call(compass.attributes, "hidden") ? "no" : "yes";
      game.print(`Compass Rivendell: east=${east} west=${west} north=${north} visible=${visible}`);
      game.currentRoom = "deep_dark_lake";
      game.player.position = "deep_dark_lake";
      game.render();
      const hiddenInDark = Object.prototype.hasOwnProperty.call(compass.attributes, "hidden") ? "yes" : "no";
      game.print(`Compass dark hidden: ${hiddenInDark}`);
    },
    expectedIncluded: [
      "Compass Rivendell: east=true west=true north=true visible=yes",
      "Compass dark hidden: yes",
    ],
  },
  {
    name: "layout fallback without matchMedia keeps desktop width in layout 2",
    drive(game) {
      const originalMatchMedia = window.matchMedia;
      const originalInnerWidth = window.innerWidth;
      try {
        delete window.matchMedia;
        window.innerWidth = 1200;
        game.setLayoutMode("2");
        game.render();
        game.print(`Fallback desktop layout: effective=${game.layoutMode} preferred=${game.layoutModePreference} body=${document.body.getAttribute("data-layout") || "none"}`);
      } finally {
        if (originalMatchMedia === undefined) delete window.matchMedia;
        else window.matchMedia = originalMatchMedia;
        if (originalInnerWidth === undefined) delete window.innerWidth;
        else window.innerWidth = originalInnerWidth;
      }
    },
    expectedIncluded: [
      "Fallback desktop layout: effective=2 preferred=2 body=2",
    ],
  },
  {
    name: "layout fallback without matchMedia forces mobile width to layout 1",
    drive(game) {
      const originalMatchMedia = window.matchMedia;
      const originalInnerWidth = window.innerWidth;
      try {
        delete window.matchMedia;
        window.innerWidth = 600;
        game.setLayoutMode("2");
        game.render();
        game.print(`Fallback mobile layout: effective=${game.layoutMode} preferred=${game.layoutModePreference} body=${document.body.getAttribute("data-layout") || "none"}`);
      } finally {
        if (originalMatchMedia === undefined) delete window.matchMedia;
        else window.matchMedia = originalMatchMedia;
        if (originalInnerWidth === undefined) delete window.innerWidth;
        else window.innerWidth = originalInnerWidth;
      }
    },
    expectedIncluded: [
      "Fallback mobile layout: effective=1 preferred=2 body=1",
    ],
  },
  {
    name: "front gate is atmospheric while the western wall becomes the real entrance",
    drive(game) {
      game.execute("jump front_gate");
      game.execute("look at rock face");
      game.execute("north east");
      game.print(`Western wall room: ${game.currentRoom}`);
      game.execute("read map");
      game.execute("wait");
      game.execute("wait");
      game.execute("unlock secret door with curious key");
      game.execute("open secret door");
      game.execute("east");
      game.print(`Room after hidden door entry: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "Jumped to Front Gate.",
      "The enormous gate stands silent and inaccessible. No obvious way lies through.",
      "Western wall room: erebor_hidden_door",
      "Elrond's words come back to you: a narrow western door, and the season and light by which it may be found.",
      "Comparing the weathered markings with the stern wall before you, you know at last that this is indeed the right place.",
      "What looked like barren rock resolves at last into a secret door.",
      "You unlock the secret door with the curious key.",
      "You open the secret door.",
      "Room after hidden door entry: erebor_watch_chamber",
    ],
    notExpectedIncluded: [
      "Room after hidden door entry: lower_halls",
    ],
  },
  {
    name: "hidden door requires reading the map and two deliberate waits",
    drive(game) {
      game.execute("jump front_gate");
      game.execute("north east");
      game.execute("wait");
      game.execute("unlock secret door with curious key");
      game.execute("read map");
      game.execute("look at wall");
      game.execute("wait");
      game.execute("unlock secret door with curious key");
      game.execute("wait");
      game.execute("unlock secret door with curious key");
    },
    expectedIncluded: [
      "You wait by the western wall, but without consulting the map you cannot yet be sure this is the place Elrond meant.",
      "I don't see that here.",
      "Elrond's words come back to you: a narrow western door, and the season and light by which it may be found.",
      "You wait in stillness while the day thins westward, watching the stone for the change Elrond foretold.",
      "As the light slants across the western stone, a narrow line answers it. What looked like barren rock resolves at last into a secret door.",
      "You unlock the secret door with the curious key.",
    ],
  },
  {
    name: "little steep bay no longer bypasses the hidden door into erebor",
    drive(game) {
      game.currentRoom = "little_steep_bay";
      game.player.position = "little_steep_bay";
      game.execute("east");
      game.print(`Bay room after blocked east: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "You see no exit in that direction.",
      "Bay room after blocked east: little_steep_bay",
    ],
    notExpectedIncluded: [
      "You find yourself in a smooth, straight passage.",
    ],
  },
  {
    name: "jump rivendell still leaves room to take beorns meal",
    drive(game) {
      game.execute("jump rivendell");
      for (let step = 0; step < 400 && game.currentRoom !== "beorns_house" && !game.endgame; step += 1) {
        const command = game.nextAutoplayCommand();
        if (!command) throw new Error(`Expected a route to Beorn, but autoplay stopped in ${game.currentRoom}.`);
        game.execute(command);
      }
      if (game.currentRoom !== "beorns_house") throw new Error(`Expected to reach Beorn's House, got ${game.currentRoom}.`);
      game.print(`Weight at Beorn: ${game.currentCarryWeight()}/${game.carryCapacity()}`);
      game.execute("open curtain");
      game.execute("open cupboard");
      game.execute("take meal");
      game.print(`Has meal at Beorn: ${game.findInInventory("meal") ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to Rivendell.",
      "Weight at Beorn: 41/52",
      "You take the meal from the cupboard.",
      "Has meal at Beorn: yes",
    ],
    notExpectedIncluded: [
      "The meal would be too much to carry",
      "You drop the",
    ],
  },
  {
    name: "autoplay takes beorns meal directly when weight still allows it",
    drive(game) {
      game.execute("jump rivendell");
      for (let step = 0; step < 400 && game.currentRoom !== "beorns_house" && !game.endgame; step += 1) {
        const command = game.nextAutoplayCommand();
        if (!command) throw new Error(`Expected a route to Beorn, but autoplay stopped in ${game.currentRoom}.`);
        game.execute(command);
      }
      game.debugGivePlayerItem("large key");
      game.execute("open curtain");
      game.execute("open cupboard");
      game.execute("examine cupboard");
      game.flags.autoplayexaminedcupboard = true;
      const command = game.nextAutoplayCommand();
      game.print(`Autoplay next at Beorn while overloaded: ${command}`);
    },
    expectedIncluded: [
      "Autoplay next at Beorn while overloaded: take meal",
    ],
  },
  {
    name: "jump mirkwood applies a coherent post-beorn travel state",
    drive(game) {
      game.execute("jump mirkwood");
      game.print(`Jump room: ${game.currentRoom}`);
      game.print(`Has ring: ${game.findInInventory("golden ring") ? "yes" : "no"}`);
      game.print(`Strength after Beorn: ${game.player.strength}`);
      game.print(`Autoplay next in Mirkwood: ${game.nextAutoplayCommand()}`);
    },
    expectedIncluded: [
      "Jumped to Mirkwood.",
      "Jump room: mirkwood_forest_path",
      "Has ring: yes",
      "Strength after Beorn: 6",
      /Autoplay next in Mirkwood: (?:east|north west)/,
    ],
  },
  {
    name: "high lostness can bend a Mirkwood exit once and create deja vu",
    drive(game) {
      game.execute("jump mirkwood");
      game.flags.mirkwoodjourneyactive = true;
      game.setMirkwoodLostness(2);
      game.execute("east");
      game.execute("north");
      game.print(`After first north: ${game.currentRoom}`);
      game.execute("east");
      game.execute("north");
      game.print(`After second north: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "You have the uneasy feeling that you have already been this way.",
      "After first north: mirkwood_forest_path",
      "After second north: mirkwood_deer_trail",
    ],
  },
  {
    name: "spider-road safe moments stay single and non-spoilery",
    setup(game) {
      game.flags.dragondefeated = true;
      game.currentRoom = "waterfall";
      game.player.position = "waterfall";
      game.visitedRooms = new Set(["waterfall", "forest_road_2", "forest_road"]);
    },
    drive(game) {
      const firstStart = outputLines.length;
      game.execute("west");
      const firstSafeLines = outputLines.slice(firstStart).filter((line) => line.includes("Game saved."));
      game.print(`First spider crossing safe moments shown: ${firstSafeLines.length}`);
      game.print(`First spider crossing label: ${game.autosaveMeta?.label || "none"}`);
      const secondStart = outputLines.length;
      game.execute("wait");
      game.execute("wait");
      game.execute("west");
      const secondSafeLines = outputLines.slice(secondStart).filter((line) => line.includes("Game saved."));
      game.print(`Second spider crossing safe moments shown: ${secondSafeLines.length}`);
      game.print(`Second spider crossing label: ${game.autosaveMeta?.label || "none"}`);
    },
    expectedIncluded: [
      "First spider crossing safe moments shown: 1",
      "First spider crossing label: along the forest road",
      "Second spider crossing safe moments shown: 1",
      "Second spider crossing label: deeper along the forest road",
    ],
    notExpectedIncluded: [
      "before the spider ambush near",
      "before crossing the spider-haunted road",
      "before the second spider-haunted crossing",
    ],
  },
  {
    name: "jump laketown applies a coherent bard rendezvous state",
    drive(game) {
      game.execute("jump laketown");
      game.print(`Jump room: ${game.currentRoom}`);
      game.print(`Bard here: ${game.characters.bard?.position === game.currentRoom ? "yes" : "no"}`);
      game.print(`Thorin in town: ${game.characters.thorin?.position === "wooden_town" ? "yes" : "no"}`);
      game.print(`Master in town square: ${game.characters.master?.position === "laketown_town_square" ? "yes" : "no"}`);
      game.print(`Lake-town barrel arrival seen: ${game.flags.laketown_barrel_arrival_seen ? "yes" : "no"}`);
      const ambientIds = game.unexpectedParty.roster.map((entry) => entry.id);
      const townCount = ambientIds.filter((id) => ["wooden_town", "laketown_town_square", "laketown_marketplace", "laketown_bridges", "laketown_docks", "laketown_warehouses"].includes(game.characters[id]?.position)).length;
      game.print(`Ambient dwarves in town: ${townCount}`);
      game.print(`Strength after Beorn: ${game.player.strength}`);
      game.print(`Autoplay next in Lake-town: ${game.nextAutoplayCommand()}`);
    },
    expectedIncluded: [
      "Jumped to Lake-town.",
      "Jump room: wooden_town",
      "Bard here: yes",
      "Thorin in town: yes",
      "Master in town square: yes",
      "Lake-town barrel arrival seen: yes",
      "Ambient dwarves in town: 12",
      "Strength after Beorn: 6",
      "Autoplay next in Lake-town: ask bard to follow me",
    ],
  },
  {
    name: "thorin in lake-town acknowledges the town, the master, bard, and the mountain",
    setup(game) {
      movePlayerTo(game, "wooden_town");
      game.flags.laketown_barrel_arrival_seen = true;
      game.debugSetCharacterRoom("thorin", "wooden_town", { visible: true, movementMode: "never" });
    },
    inputs: [
      "talk to thorin",
      "ask thorin about town",
      "ask thorin about master",
      "ask thorin about bard",
      "ask thorin about dragon",
    ],
    expectedIncluded: [
      "Thorin says 'These lake-folk have given us roof and breathing-space, and I do not forget it. Yet every hour spent here is only a pause with the Mountain still before us.'",
      "Thorin says 'It is a strange city, half ship and half marketplace, yet there is hard usefulness in it. A people who can build thus upon dark water are not to be dismissed as soft.'",
      "Thorin says 'The Master hears profit rustling even in trouble. That may serve a town well enough, provided bolder men are near when profit proves dangerous company.'",
      "Thorin says 'Bard has the look of one who sees farther than most and says less than he knows. I would rather have such a man beside a dragon than a hall full of flatterers.'",
      "Thorin says 'Smaug is near enough to trouble every plank in this town, and nearer still to my thought. Lake-town may shelter us for a night, but it cannot end our business.'",
    ],
  },
  {
    name: "the master of lake-town has a distinct political voice",
    drive(game) {
      game.execute("jump laketown");
      game.execute("north west");
      game.execute("talk to master");
      game.execute("ask master about bard");
      game.print(`Master met: ${game.flags.laketown_master_met ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "The Master smooths his robe and says 'Lake-town prospers when sober heads govern it. Excitement is a poor substitute for order, and heroics poorer still when trade must go on.'",
      "The Master smiles thinly and says 'Bard is useful in rough weather and with a bow in his hand, but towns are not governed by grim warnings alone. A people must be steadied as well as stirred.'",
      "Master met: yes",
    ],
  },
  {
    name: "hearing bard after the master marks the support split in lake-town",
    drive(game) {
      game.execute("jump laketown");
      game.execute("north west");
      game.execute("ask master about lake-town");
      game.execute("south east");
      game.execute("ask bard about town");
      game.print(`Lake-town support split: ${game.flags.laketown_support_split ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "The Master spreads his hands and says 'Lake-town lives by traffic, timber, and prudent management. If the Mountain yields profit again, wise men must see that the town benefits from it rather than merely boasting of brave speeches after the fact.'",
      "Bard says 'The Master thinks first of order, speeches, and what may be made to prosper afterward. I think of burned roofs, hungry folk, and what the Mountain has already cost the town before anyone speaks of profit from it.'",
      "Lake-town support split: yes",
    ],
  },
  {
    name: "cellar down without a barrel ends in a fatal river plunge",
    setup(game) {
      movePlayerTo(game, "cellar");
    },
    drive(game) {
      game.execute("open trap door");
      game.execute("down");
      game.print(`Cellar death choice: ${game.pendingEndgameChoice || "none"}`);
      game.print(`Cellar autosave room: ${game.autosaveMeta?.roomId || "none"}`);
      game.print(`Cellar death image: ${game.temporaryImage?.file || "none"}`);
    },
    expectedIncluded: [
      "Game saved.",
      "The current catches you like an iron hand and sweeps you away under the halls before you can master yourself.",
      "Cellar death choice: death",
      "Cellar autosave room: cellar",
      "Cellar death image: bilbo_falls_from_trap_door_river_death.png",
      "Type 'load' to open your safe moments in cellar, or 'restart' to begin the tale again.",
    ],
  },
  {
    name: "cellar barrel throw and jump reaches long lake",
    setup(game) {
      movePlayerTo(game, "cellar");
      game.checkSpecialSituations();
      game.flags.mirkwooddwarvesfreed = true;
    },
    drive(game) {
      game.execute("wait");
      game.execute('say to thorin "enter barrels"');
      game.execute("wait");
      game.execute("open trap door");
      game.execute("wait");
      game.execute('say to thorin "throw barrels through trap door"');
      game.execute("wait");
      game.execute("throw barrel through the large trap door");
      game.execute("jump onto barrel");
      game.print(`Cellar barrel room: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "The butler turns away toward the stair with a muttered complaint, leaving the trap door and the nearest casks unwatched for a precious moment.",
      "the worst labor is not your own barrel at all, but the dwarves'.",
      "together you send the dwarves' barrels one by one through the open trap door",
      "You wrestle an empty barrel to the opening and heave it through.",
      "If you mean to trust yourself to it, you must follow at once.",
      "You seize your moment, spring through the open trap door, and come down half upon the barrel and half into the freezing black rush beneath the halls.",
      "At last the racing black water widens, the low roof of branches breaks apart above you, and Long Lake opens ahead in cold daylight like a deliverance almost too sudden to trust.",
      "Cellar barrel room: long_lake",
    ],
  },
  {
    name: "cellar barrel jump shows river artwork until the next command",
    setup(game) {
      movePlayerTo(game, "cellar");
      game.checkSpecialSituations();
      game.flags.mirkwooddwarvesfreed = true;
    },
    drive(game) {
      game.execute("wait");
      game.execute('say to thorin "enter barrels"');
      game.execute("wait");
      game.execute("open trap door");
      game.execute("wait");
      game.execute('say to thorin "throw barrels through trap door"');
      game.execute("wait");
      game.execute("throw barrel through the large trap door");
      game.execute("jump onto barrel");
      game.print(`Cellar barrel temporary image: ${game.temporaryImage?.file || "none"}`);
      game.execute("look");
      game.print(`Cellar barrel temporary image after next command: ${game.temporaryImage?.file || "none"}`);
      game.print(`Cellar barrel room after next command: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "Cellar barrel temporary image: elvenkings_river_barrel.png",
      "Cellar barrel temporary image after next command: none",
      "Cellar barrel room after next command: long_lake",
    ],
  },
  {
    name: "arkenstone vault now lives in lower halls instead of trolls cave",
    drive(game) {
      const vaultLocation = game.items.gilded_vault?.location || null;
      const stoneLocation = game.items.arkenstone?.location || null;
      game.print(`Gilded vault room: ${vaultLocation?.type === "room" ? vaultLocation.id : "none"}`);
      game.print(`Arkenstone container: ${stoneLocation?.type === "item" ? stoneLocation.id : "none"}`);
    },
    expectedIncluded: [
      "Gilded vault room: lower_halls",
      "Arkenstone container: gilded_vault",
    ],
    notExpectedIncluded: [
      "Gilded vault room: trolls_cave",
    ],
  },
  {
    name: "looking around the opened gilded vault reveals the arkenstone as a distinct discovery",
    drive(game) {
      movePlayerTo(game, "lower_halls");
      game.items.gilded_vault.locked = false;
      game.items.gilded_vault.open = true;
      const dragon = Object.values(game.characters).find((character) => /dragon/i.test(character.name));
      if (dragon) dragon.visible = false;
      game.execute("look");
      game.print(`Arkenstone seen: ${game.flags.arkenstone_seen ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Within the opened hoard, one great pale jewel catches the least light and masters it, burning with a cold fire of its own.",
      "It is plainly no common treasure-piece, but some chief wonder of the Mountain long remembered and long desired.",
      "Arkenstone seen: yes",
    ],
  },
  {
    name: "taking the arkenstone identifies it and marks it taken",
    drive(game) {
      movePlayerTo(game, "lower_halls");
      game.items.gilded_vault.locked = false;
      game.items.gilded_vault.open = true;
      const dragon = Object.values(game.characters).find((character) => /dragon/i.test(character.name));
      if (dragon) dragon.visible = false;
      game.execute("take arkenstone");
      game.print(`Arkenstone identified: ${game.arkenstoneIdentified() ? "yes" : "no"}`);
      game.print(`Arkenstone taken flag: ${game.flags.arkenstone_taken ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You take the arkenstone from the gilded vault.",
      "Even Bilbo can guess what no dwarf of Thorin's house could mistake: this is the Arkenstone, the Heart of the Mountain.",
      "Arkenstone identified: yes",
      "Arkenstone taken flag: yes",
    ],
  },
  {
    name: "autoplay prepares the barrel escape before leaving the cellar",
    setup(game) {
      game.execute("jump laketown");
      movePlayerTo(game, "cellar");
      game.checkSpecialSituations();
      game.flags.barrel_company_prepared = false;
      game.flags.barrel_company_launched = false;
      game.flags.barrelthrown = false;
      game.flags.laketown_barrel_arrival_seen = false;
      game.flags.laketown_barrel_arrival_pending = false;
    },
    drive(game) {
      const commands = [];
      for (let step = 0; step < 9; step += 1) {
        const command = game.nextAutoplayCommand();
        if (!command) throw new Error(`Expected autoplay command in cellar at step ${step}.`);
        commands.push(command);
        game.execute(command);
      }
      game.print(`Cellar autoplay path: ${commands.join(" -> ")}`);
      game.print(`Cellar autoplay room: ${game.currentRoom}`);
    },
    expectedIncluded: [
      'Cellar autoplay path: wait -> ask thorin to enter barrels -> wait -> open trap door -> wait -> ask thorin to throw barrels through trap door -> wait -> throw barrel through trap door -> jump onto barrel',
      "Cellar autoplay room: long_lake",
    ],
  },
  {
    name: "cellar barrel throw and jump can be chained in one command",
    setup(game) {
      movePlayerTo(game, "cellar");
      game.checkSpecialSituations();
      game.flags.mirkwooddwarvesfreed = true;
    },
    drive(game) {
      game.execute("wait");
      game.execute('say to thorin "enter barrels"');
      game.execute("wait");
      game.execute("open trap door");
      game.execute("wait");
      game.execute('say to thorin "throw barrels through trap door"');
      game.execute("wait");
      game.execute("throw barrel through the large trap door and jump onto barrel");
      game.print(`Cellar chained barrel room: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "If you mean to trust yourself to it, you must follow at once.",
      "You seize your moment, spring through the open trap door, and come down half upon the barrel and half into the freezing black rush beneath the halls.",
      "Cellar chained barrel room: long_lake",
    ],
  },
  {
    name: "cellar butler window narration follows the barrel escape phase",
    setup(game) {
      movePlayerTo(game, "cellar");
      game.flags.cellar_feast_scene_seen = true;
      game.flags.mirkwooddwarvesfreed = true;
      game.debugSetCharacterRoom("butler", "cellar", { visible: true, movementMode: "never" });
    },
    drive(game) {
      game.primeCellarButlerStealth();
      game.flags.cellar_butler_window_open = false;
      game.flags.barrel_company_prepared = true;
      game.primeCellarButlerStealth();
      game.flags.cellar_butler_window_open = false;
      game.flags.barrel_company_launched = true;
      game.primeCellarButlerStealth();
      game.flags.cellar_butler_window_open = false;
      game.flags.barrelthrown = true;
      game.primeCellarButlerStealth();
    },
    expectedIncluded: [
      "The butler turns away toward the stair with a muttered complaint, leaving the trap door and the nearest casks unwatched for a precious moment.",
      "The butler turns away toward the stair with a muttered complaint, leaving the trap door and the packed barrels unwatched for a precious moment.",
      "The butler turns away toward the stair with a muttered complaint, leaving the open trap door and Bilbo's last empty barrel unwatched for a precious moment.",
      "The butler turns away toward the stair with a muttered complaint, leaving the open trap door unwatched for one precious moment.",
    ],
  },
  {
    name: "cellar now waits for bilbos order before stowing dwarves into barrels",
    setup(game) {
      movePlayerTo(game, "cellar");
      game.checkSpecialSituations();
      game.flags.mirkwooddwarvesfreed = true;
    },
    drive(game) {
      game.checkSpecialSituations();
      game.execute("wait");
      game.execute('say to thorin "enter barrels"');
      game.print(`Barrel company prepared: ${game.flags.barrel_company_prepared ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "The dwarves crowd close among the casks, plainly waiting for Bilbo's word before any of them agrees to be packed into a barrel.",
      "Thorin gives the word at last, and the worst labor is not your own barrel at all, but the dwarves'.",
      "the whole desperate escape has become a matter not of one barrel, but of a miserable little fleet",
      "Barrel company prepared: yes",
    ],
  },
  {
    name: "ask dwarves to jump in the cellar maps to the barrel-loading order",
    setup(game) {
      movePlayerTo(game, "cellar");
      game.checkSpecialSituations();
      game.flags.mirkwooddwarvesfreed = true;
    },
    drive(game) {
      game.execute("wait");
      game.execute("ask dwarves to jump");
      game.print(`Barrel company prepared after jump order: ${game.flags.barrel_company_prepared ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "The butler turns away toward the stair with a muttered complaint, leaving the trap door and the nearest casks unwatched for a precious moment.",
      "Thorin gives the word at last, and the worst labor is not your own barrel at all, but the dwarves'.",
      "Barrel company prepared after jump order: yes",
    ],
    notExpectedIncluded: [
      'Jump checkpoints: type "jump <name>".',
    ],
  },
  {
    name: "cellar barrel-work must wait for the butlers brief lapses",
    setup(game) {
      movePlayerTo(game, "cellar");
      game.checkSpecialSituations();
      game.flags.mirkwooddwarvesfreed = true;
    },
    drive(game) {
      game.execute("open trap door");
      game.execute("open trap door");
      game.print(`Trap door open after window: ${game.doors.porta_cellar_long_lake?.open ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You begin to open the large trap door, but the butler is not turned nearly far enough for such work.",
      "You are hustled back into the Elvenking's prison and shut up once more behind the red door.",
      "Trap door open after window: no",
    ],
  },
  {
    name: "cellar capture keeps dwarves packed if bilbo is caught after loading them",
    setup(game) {
      movePlayerTo(game, "cellar");
      game.flags.cellar_feast_scene_seen = true;
      game.flags.mirkwooddwarvesfreed = true;
      game.flags.barrel_company_prepared = true;
      game.flags.cellar_butler_window_open = false;
      game.flags.cellar_butler_next_window_turn = 2;
      game.debugSetCharacterRoom("butler", "cellar", { visible: true, movementMode: "never" });
    },
    drive(game) {
      game.execute("open trap door");
      game.print(`Capture room after packed-barrel mistake: ${game.currentRoom}`);
      game.print(`Packed dwarves preserved: ${game.flags.barrel_company_prepared ? "yes" : "no"}`);
      game.print(`Launched dwarves preserved: ${game.flags.barrel_company_launched ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "a muffled dwarvish thump from one of the packed barrels betrays the whole desperate scheme.",
      "Capture room after packed-barrel mistake: dark_dungeon",
      "Packed dwarves preserved: yes",
      "Launched dwarves preserved: no",
    ],
  },
  {
    name: "cellar capture after bilbos barrel was thrown restores a retry state",
    setup(game) {
      movePlayerTo(game, "cellar");
      game.flags.cellar_feast_scene_seen = true;
      game.flags.mirkwooddwarvesfreed = true;
      game.flags.barrel_company_prepared = true;
      game.flags.barrel_company_launched = true;
      game.flags.barrelthrown = true;
      game.flags.cellar_barrel_immediate_jump_turn = -1;
      game.flags.cellar_butler_window_open = false;
      game.flags.cellar_butler_next_window_turn = 2;
      game.doors.porta_cellar_long_lake.open = true;
      game.items.barrel.location = { type: "room", id: "long_lake" };
      game.items.barrel.visible = false;
      game.debugSetCharacterRoom("butler", "cellar", { visible: true, movementMode: "never" });
    },
    drive(game) {
      game.execute("jump onto barrel");
      const barrelLocation = game.items.barrel.location;
      game.print(`Capture room after missed barrel jump: ${game.currentRoom}`);
      game.print(`Dwarf fleet already away: ${game.flags.barrel_company_launched ? "yes" : "no"}`);
      game.print(`Company afloat preserved: ${game.flags.barrel_company_afloat ? "yes" : "no"}`);
      game.print(`Bilbo barrel thrown flag after capture: ${game.flags.barrelthrown ? "yes" : "no"}`);
      game.print(`Bilbo barrel reset room: ${barrelLocation?.type === "room" ? barrelLocation.id : "none"}`);
      game.print(`Trap door reset closed: ${game.doors.porta_cellar_long_lake.open ? "no" : "yes"}`);
    },
    expectedIncluded: [
      "The elves come running too late for the dwarves already bobbing away beneath the halls, but not too late for Bilbo.",
      "Capture room after missed barrel jump: dark_dungeon",
      "Dwarf fleet already away: yes",
      "Company afloat preserved: yes",
      "Bilbo barrel thrown flag after capture: no",
      "Bilbo barrel reset room: cellar",
      "Trap door reset closed: yes",
    ],
  },
  {
    name: "barrel escape can carry the sense of the whole company onto the long lake",
    setup(game) {
      movePlayerTo(game, "cellar");
      game.flags.cellar_feast_scene_seen = true;
      game.flags.mirkwooddwarvesfreed = true;
      game.flags.barrel_company_prepared = true;
      game.flags.barrel_company_launched = true;
      game.doors.porta_cellar_long_lake.open = true;
      game.flags.cellar_butler_window_open = true;
      game.debugSetCharacterRoom("butler", "cellar", { visible: true, movementMode: "never" });
    },
    drive(game) {
      game.execute("throw barrel through the large trap door");
      game.flags.cellar_butler_window_open = true;
      game.execute("jump onto barrel");
      game.print(`Barrel company afloat: ${game.flags.barrel_company_afloat ? "yes" : "no"}`);
      game.print(`Long Lake company desc: ${game.contextualRoomDescription(game.rooms.long_lake)}`);
    },
    expectedIncluded: [
      "Barrel company afloat: yes",
      "Long Lake company desc: You are on the Long Lake, cold and broad under an exposed sky, with more than one barrel still bobbing nearby in miserable fellowship.",
      "outraged dwarf-mutterings of companions who have escaped the Elvenking's halls",
    ],
  },
  {
    name: "barrel escape into lake-town now stages a human landing scene in wooden town",
    setup(game) {
      movePlayerTo(game, "cellar");
      game.flags.cellar_feast_scene_seen = true;
      game.flags.mirkwooddwarvesfreed = true;
      game.flags.barrel_company_prepared = true;
      game.flags.barrel_company_launched = true;
      game.doors.porta_cellar_long_lake.open = true;
      game.flags.cellar_butler_window_open = true;
      game.debugSetCharacterRoom("butler", "cellar", { visible: true, movementMode: "never" });
    },
    drive(game) {
      game.execute("throw barrel through the large trap door");
      game.flags.cellar_butler_window_open = true;
      game.execute("jump onto barrel");
      game.execute("east");
      game.print(`Lake-town arrival seen: ${game.flags.laketown_barrel_arrival_seen ? "yes" : "no"}`);
      game.print(`Lake-town arrival pending: ${game.flags.laketown_barrel_arrival_pending ? "yes" : "no"}`);
      game.print(`Barrel company afloat after arrival: ${game.flags.barrel_company_afloat ? "yes" : "no"}`);
      game.print(`Wooden Town arrival desc: ${game.contextualRoomDescription(game.rooms.wooden_town)}`);
    },
    expectedIncluded: [
      "Cold hands haul you in from the lake-side landing at last, more like driftwood than travelers.",
      "Soon other barrels are being hooked in and broken open amid spluttering outrage, and the dwarves come out of them one after another stiff, bruised, furious, and indisputably alive.",
      "Bard is among the first to look on you without foolishness.",
      "Lake-town arrival seen: yes",
      "Lake-town arrival pending: no",
      "Barrel company afloat after arrival: no",
      "Wooden Town arrival desc: You are in Lake-town, where wet planks, boat-ropes, and curious faces surround the long labor of a town built upon dark water.",
    ],
  },
  {
    name: "autoplay avoids the cellar trap door shortcut when no barrel remains",
    setup(game) {
      game.execute("jump laketown");
      movePlayerTo(game, "cellar");
      game.flags.dragondefeated = true;
      game.doors.porta_cellar_long_lake.open = true;
      game.flags.barrelthrown = false;
      game.flags.barrel_company_prepared = true;
      game.flags.barrel_company_launched = true;
      const barrel = game.findKnownItem("barrel");
      if (barrel) {
        game.detachItem(barrel.id);
        barrel.location = null;
        barrel.visible = false;
      }
      const treasure = game.findKnownItem("treasure");
      if (treasure) {
        game.detachItem(treasure.id);
        treasure.location = { type: "character", id: game.player.id };
        if (!game.player.inventory.includes(treasure.id)) game.player.inventory.push(treasure.id);
      }
    },
    drive(game) {
      const command = game.nextAutoplayCommand();
      game.print(`Cellar no-barrel autoplay command: ${command || "none"}`);
      const path = game.autoplayPathTo("hobbit_hole") || [];
      game.print(`Cellar no-barrel first leg: ${path[0] ? `${path[0].from}:${path[0].direction}->${path[0].to}` : "none"}`);
    },
    expectedIncluded: [
      "Cellar no-barrel autoplay command: north",
      "Cellar no-barrel first leg: cellar:north->elvenkings_halls",
    ],
    notExpectedIncluded: [
      "Cellar no-barrel autoplay command: throw barrel through trap door",
      "Cellar no-barrel first leg: cellar:down->strong_river",
    ],
  },
  {
    name: "autoplay investigates smaug before ordering the dragon shot",
    setup(game) {
      game.execute("jump smaug");
      game.currentRoom = "lower_halls";
      game.player.position = "lower_halls";
      game.flags.dragondefeated = false;
      game.flags.bardreadiedarrow = true;
      game.characters.bard.position = "erebor_treasure_approach";
      game.characters.bard.carriedBy = null;
      game.characters.bard.movementMode = "follow";
      const dragon = game.findKnownCharacter("dragon") || game.findKnownCharacter("smaug");
      if (!dragon) throw new Error("Expected dragon character in Smaug autoplay regression setup.");
      dragon.position = "lower_halls";
      dragon.visible = true;
    },
    drive(game) {
      const command = game.nextAutoplayCommand();
      game.print(`Lower halls absent-bard autoplay command: ${command || "none"}`);
    },
    expectedIncluded: [
      "Lower halls absent-bard autoplay command: wear ring",
    ],
    notExpectedIncluded: [
      "Lower halls absent-bard autoplay command: say to bard \"shoot dragon\"",
    ],
  },
  {
    name: "natural assist verbs map to bard carry without shoulder wording",
    setup(game) {
      game.execute("jump laketown");
      game.currentRoom = "strong_river";
      game.player.position = "strong_river";
      game.characters.bard.position = "strong_river";
      game.characters.bard.visible = true;
      game.characters.bard.carriedBy = null;
      game.characters.bard.followingPlayer = false;
    },
    drive(game) {
      game.execute("help bard up");
      game.print(`Help carry bard: ${game.characters.bard.carriedBy === game.player.id ? "yes" : "no"}`);
      game.characters.bard.carriedBy = null;
      game.characters.bard.position = game.currentRoom;
      game.execute("give bard a hand");
      game.print(`Hand carry bard: ${game.characters.bard.carriedBy === game.player.id ? "yes" : "no"}`);
      game.characters.bard.carriedBy = null;
      game.characters.bard.position = game.currentRoom;
      game.execute("boost bard up");
      game.print(`Boost carry bard: ${game.characters.bard.carriedBy === game.player.id ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You draw Bard close, ready to give him a hand over the rougher ground ahead.",
      "Help carry bard: yes",
      "Hand carry bard: yes",
      "Boost carry bard: yes",
    ],
    notExpectedIncluded: [
      "You pick up Bard.",
    ],
  },
  {
    name: "carrying thorin uses grounded assistance wording",
    setup(game) {
      game.execute("jump front_gate");
      game.characters.thorin.position = "front_gate";
      game.characters.thorin.visible = true;
      game.characters.thorin.carriedBy = null;
      game.characters.thorin.followingPlayer = false;
    },
    drive(game) {
      game.execute("carry thorin");
      game.print(`Thorin carried: ${game.characters.thorin.carriedBy === game.player.id ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You move beside Thorin, ready to steady him over the rougher ground ahead.",
      "Thorin carried: yes",
    ],
    notExpectedIncluded: [
      "You pick up Thorin.",
    ],
  },
  {
    name: "bard released after vertical travel stays in the destination room for autoplay",
    setup(game) {
      game.execute("jump laketown");
      game.flags.dragondefeated = false;
      game.flags.bardreadiedarrow = true;
      game.currentRoom = "strong_river";
      game.player.position = "strong_river";
      game.characters.bard.position = "strong_river";
      game.characters.bard.carriedBy = game.player.id;
      game.characters.bard.movementMode = "on_first_meet";
      game.characters.bard.followingPlayer = false;
    },
    drive(game) {
      game.execute("up");
      game.print(`Bard climb room: ${game.currentRoom}`);
      game.print(`Bard room after climb: ${game.characters.bard.position}`);
      game.print(`Bard follow after climb: ${game.characters.bard.followingPlayer ? "yes" : "no"}`);
      game.print(`Next autoplay after bard climb: ${game.nextAutoplayCommand() || "none"}`);
    },
    expectedIncluded: [
      "You give Bard a firm hand up, and once he has the higher ground he follows close behind.",
      "Bard climb room: bleak_barren_land",
      "Bard room after climb: bleak_barren_land",
      "Bard follow after climb: yes",
      "Next autoplay after bard climb: north",
    ],
    notExpectedIncluded: [
      "Bard climbs down from your shoulders and follows you.",
      "Bard room after climb: strong_river",
      "Next autoplay after bard climb: down",
    ],
  },
  {
    name: "jump front gate applies a coherent mountain approach state",
    drive(game) {
      game.execute("jump front_gate");
      game.print(`Jump room: ${game.currentRoom}`);
      game.print(`Bard here: ${game.characters.bard?.position === game.currentRoom ? "yes" : "no"}`);
      game.print(`Secret door revealed: ${game.flags.secretdoorsun ? "yes" : "no"}`);
      game.print(`Strength after Beorn: ${game.player.strength}`);
      game.print(`Autoplay next at Front Gate: ${game.nextAutoplayCommand()}`);
    },
    expectedIncluded: [
      "Jumped to Front Gate.",
      "Jump room: front_gate",
      "Bard here: yes",
      "Secret door revealed: no",
      "Strength after Beorn: 6",
      "Autoplay next at Front Gate: ask bard to follow me",
    ],
  },
  {
    name: "jump smaug sets up the dragon endgame",
    drive(game) {
      game.execute("jump smaug");
      const bard = Object.values(game.characters).find((character) => /bard/i.test(character.name));
      game.print(`Jump room: ${game.currentRoom}`);
      game.print(`Bard here: ${bard?.position === game.currentRoom ? "yes" : "no"}`);
      game.print(`Arrow with Bard: ${bard?.inventory?.some((itemId) => /arrow/i.test(game.items[itemId]?.name || "")) ? "yes" : "no"}`);
      game.print(`Dragon alive: ${game.liveDragon() ? "yes" : "no"}`);
      game.print(`Strength after Beorn: ${game.player.strength}`);
      game.print(`Autoplay next with Smaug: ${game.nextAutoplayCommand()}`);
    },
    expectedIncluded: [
      "Jumped to Smaug.",
      "Jump room: lower_halls",
      "Bard here: yes",
      "Arrow with Bard: yes",
      "Dragon alive: yes",
      "Strength after Beorn: 6",
      "Autoplay next with Smaug: wear ring",
    ],
  },
  {
    name: "bard stays put until bilbo asks him to follow",
    drive(game) {
      game.execute("jump laketown");
      game.execute("south east");
      game.print(`Player room after leaving Bard: ${game.currentRoom}`);
      game.print(`Bard followed unasked: ${game.characters.bard.position === game.currentRoom ? "yes" : "no"}`);
      game.execute("north west");
      game.execute("ask bard to follow me");
      game.execute("south east");
      game.print(`Bard followed after request: ${game.characters.bard.position === game.currentRoom ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Player room after leaving Bard: laketown_docks",
      "Bard followed unasked: no",
      "Bard follows you as closely as possible.",
      "Bard followed after request: yes",
    ],
  },
  {
    name: "post-smaug exterior arrival starts the erebor standoff state",
    drive(game) {
      game.execute("jump smaug");
      game.flags.bardreadiedarrow = true;
      game.flags.smaug_weakspot_known = true;
      game.currentRoom = "stoe_of_ravenhill";
      game.player.position = "stoe_of_ravenhill";
      game.characters.bard.carriedBy = game.player.id;
      game.characters.bard.position = "stoe_of_ravenhill";
      game.characters.bard.followingPlayer = false;
      game.characters.bard.movementMode = "follow";
      game.execute('say to bard "shoot dragon"');
      game.execute("east");
      game.print(`Erebor standoff started: ${game.flags.erebor_standoff_started ? "yes" : "no"}`);
      game.print(`Bard camp active: ${game.flags.bard_camp_active ? "yes" : "no"}`);
      game.print(`Thorin inside Erebor: ${game.flags.thorin_inside_erebor ? "yes" : "no"}`);
      game.print(`Bard room after standoff: ${game.characters.bard.position}`);
      game.print(`Gandalf room after standoff: ${game.characters.gandalf.position}`);
      game.print(`Thorin room after standoff: ${game.characters.thorin.position}`);
      game.print(`Standoff autosave: ${game.autosaveMeta?.label || "none"}`);
    },
    expectedIncluded: [
      "By the time you come again beneath the Gate, men from the Lake have gathered among the ruins of Dale and made a wary camp there.",
      "Thorin has gone within Erebor with the dwarves, while Bard and Gandalf remain without, watching the Mountain as though Smaug's fall had cleared the way for a different danger.",
      "Erebor standoff started: yes",
      "Bard camp active: yes",
      "Thorin inside Erebor: yes",
      "Bard room after standoff: ruins_of_the_town_of_dale",
      "Gandalf room after standoff: ruins_of_the_town_of_dale",
      "Thorin room after standoff: erebor_great_hall",
      "Standoff autosave: after the camps gather beneath Erebor",
    ],
  },
  {
    name: "asking smaug about treasure reveals the weak spot",
    drive(game) {
      game.execute("jump smaug");
      game.execute("ask smaug about treasure");
      game.print(`Weak spot known: ${game.flags.smaug_weakspot_known ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Smaug says 'My armour is like tenfold shields, my teeth are swords, my claws are spears, and this wealth is mine by fire and fear.' As the dragon rolls and gloats among the treasure, you catch sight of one small bare place in the jeweled mail of his left breast.",
      "Weak spot known: yes",
    ],
  },
  {
    name: "bard refuses the dragon shot before the weak spot is known",
    drive(game) {
      game.execute("jump smaug");
      game.flags.bardreadiedarrow = true;
      game.execute('say to bard "shoot dragon"');
      game.print(`Dragon alive after blind shot: ${game.liveDragon() ? "yes" : "no"}`);
      game.print(`Dragon defeated after blind shot: ${game.flags.dragondefeated ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Bard steadies the bow, then lowers it again. 'Not yet,' he says. 'Against such a beast a blind shot is only waste. We need his weakness, not courage alone.'",
      "Dragon alive after blind shot: yes",
      "Dragon defeated after blind shot: no",
    ],
  },
  {
    name: "bard shoots once the weak spot is known and the thrush message is sent",
    drive(game) {
      game.execute("jump smaug");
      game.flags.bardreadiedarrow = true;
      game.flags.smaug_weakspot_known = true;
      game.flags.thrush_message_sent = false;
      game.execute('say to bard "shoot dragon"');
      game.print(`Bard ready at Ravenhill: ${game.flags.bard_ready_at_ravenhill ? "yes" : "no"}`);
      game.print(`Black arrow committed: ${game.flags.black_arrow_committed ? "yes" : "no"}`);
      game.print(`Dragon alive after true shot: ${game.liveDragon() ? "yes" : "no"}`);
      game.print(`Dragon defeated after true shot: ${game.flags.dragondefeated ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Bard studies the Mountain and shakes his head. 'Not from here,' he says. 'Ravenhill commands the Mountain's shoulder and the road to the Lake together. There the dragon must show himself clean against the sky, and there the black arrow may fly true.'",
      "Bard ready at Ravenhill: no",
      "Black arrow committed: no",
      "Dragon alive after true shot: yes",
      "Dragon defeated after true shot: no",
    ],
  },
  {
    name: "bard shoots from Ravenhill once the weak spot is known",
    drive(game) {
      game.execute("jump smaug");
      game.flags.bardreadiedarrow = true;
      game.flags.smaug_weakspot_known = true;
      game.flags.thrush_message_sent = false;
      game.currentRoom = "stoe_of_ravenhill";
      game.player.position = "stoe_of_ravenhill";
      game.characters.bard.carriedBy = game.player.id;
      game.characters.bard.position = "stoe_of_ravenhill";
      game.characters.bard.followingPlayer = false;
      game.characters.bard.movementMode = "follow";
      game.execute('say to bard "shoot dragon"');
      game.print(`Thrush message sent: ${game.flags.thrush_message_sent ? "yes" : "no"}`);
      game.print(`Bard ready at Ravenhill: ${game.flags.bard_ready_at_ravenhill ? "yes" : "no"}`);
      game.print(`Black arrow committed: ${game.flags.black_arrow_committed ? "yes" : "no"}`);
      game.print(`Dragon alive after true shot: ${game.liveDragon() ? "yes" : "no"}`);
      game.print(`Dragon defeated after true shot: ${game.flags.dragondefeated ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Bard steps onto the old stone of Ravenhill and measures the sky above the Mountain. 'Here,' he says softly. 'From this height he must break clear before he stoops on the Lake. If ever there was a place for the last shot, it is this one.'",
      "A thrush flutters down nearby and chatters urgently, and between bird-sign and Bilbo's word the truth becomes plain: there is a bare patch in Smaug's left breast.",
      "Bard hears, nods once, and his whole attention narrows to that one chance.",
      "Bard draws his bow, sets the strong arrow to the string, and shoots. Far away, the dragon falls from the sky.",
      "Thrush message sent: yes",
      "Bard ready at Ravenhill: yes",
      "Black arrow committed: yes",
      "Dragon alive after true shot: no",
      "Dragon defeated after true shot: yes",
    ],
  },
  {
    name: "ravenhill look and bard dialogue explain the dragon shot",
    drive(game) {
      game.execute("jump smaug");
      game.flags.bardreadiedarrow = true;
      game.flags.smaug_weakspot_known = true;
      game.currentRoom = "stoe_of_ravenhill";
      game.player.position = "stoe_of_ravenhill";
      game.characters.bard.carriedBy = game.player.id;
      game.characters.bard.position = "stoe_of_ravenhill";
      game.characters.bard.followingPlayer = false;
      game.characters.bard.movementMode = "follow";
      game.execute("look");
      game.execute("look at sky");
      game.execute("ask bard about ravenhill");
      game.execute("ask bard about dragon");
    },
    expectedIncluded: [
      "You are on Ravenhill above the desolation, where the Mountain's western shoulder, the ruined lands below, and the line of Long Lake all lie open together.",
      "From Ravenhill the Mountain's western shoulder, the desolation, and the long water below lie open in one sweep.",
      "Bard says 'From Ravenhill the Mountain's shoulder and the road to the Lake lie in one line. If Smaug stoops on the town, he must first break clear here, and that is the clean mark a bowman needs.'",
      "Bard says 'Watch the Mountain's shoulder. If Smaug comes for the Lake, he will have to clear it before he stoops, and for a few heartbeats he will be plain against the sky.'",
    ],
  },
  {
    name: "autoplay seeks smaugs weak spot before ordering the dragon shot",
    drive(game) {
      game.execute("jump smaug");
      game.flags.bardreadiedarrow = true;
      game.characters.bard.carriedBy = game.player.id;
      game.characters.bard.position = game.currentRoom;
      game.characters.bard.followingPlayer = false;
      game.characters.bard.movementMode = "follow";
      game.print(`Autoplay before weak-spot knowledge: ${game.nextAutoplayCommand()}`);
    },
    expectedIncluded: [
      "Autoplay before weak-spot knowledge: wear ring",
    ],
    notExpectedIncluded: [
      "Autoplay before weak-spot knowledge: say to bard \"shoot dragon\"",
    ],
  },
  {
    name: "autoplay retreats to Ravenhill once the weak spot is known",
    drive(game) {
      game.execute("jump smaug");
      game.flags.bardreadiedarrow = true;
      game.flags.smaug_weakspot_known = true;
      game.characters.bard.carriedBy = game.player.id;
      game.characters.bard.position = game.currentRoom;
      game.characters.bard.followingPlayer = false;
      game.characters.bard.movementMode = "follow";
      game.print(`Autoplay after weak-spot knowledge: ${game.nextAutoplayCommand()}`);
    },
    expectedIncluded: [
      "Autoplay after weak-spot knowledge: up",
    ],
    notExpectedIncluded: [
      "Autoplay after weak-spot knowledge: say to bard \"shoot dragon\"",
    ],
  },
  {
    name: "autoplay leaves the mountain to trigger the exterior standoff after smaug",
    drive(game) {
      game.execute("jump smaug");
      game.flags.dragondefeated = true;
      const dragon = Object.values(game.characters).find((character) => /dragon/i.test(character.name));
      if (dragon) dragon.visible = false;
      game.currentRoom = "stoe_of_ravenhill";
      game.player.position = "stoe_of_ravenhill";
      game.print(`Autoplay after dragon at Ravenhill: ${game.nextAutoplayCommand()}`);
    },
    expectedIncluded: [
      "Autoplay after dragon at Ravenhill: east",
    ],
  },
  {
    name: "autoplay orders the dragon shot once Ravenhill is reached",
    drive(game) {
      game.execute("jump smaug");
      game.flags.bardreadiedarrow = true;
      game.flags.smaug_weakspot_known = true;
      game.currentRoom = "stoe_of_ravenhill";
      game.player.position = "stoe_of_ravenhill";
      game.characters.bard.carriedBy = game.player.id;
      game.characters.bard.position = "stoe_of_ravenhill";
      game.characters.bard.followingPlayer = false;
      game.characters.bard.movementMode = "follow";
      game.print(`Autoplay at Ravenhill: ${game.nextAutoplayCommand()}`);
    },
    expectedIncluded: [
      "Autoplay at Ravenhill: say to bard \"shoot dragon\"",
    ],
  },
  {
    name: "smaug activity description stays in the dragon room",
    drive(game) {
      game.execute("jump smaug");
      game.currentRoom = "erebor_treasure_approach";
      game.player.position = "erebor_treasure_approach";
      game.print(`Treasure approach Smaug activity: ${game.roomAtmosphericNarrative() || "none"}`);
      game.currentRoom = "lower_halls";
      game.player.position = "lower_halls";
      game.print(`Lower halls Smaug activity: ${game.roomAtmosphericNarrative() || "none"}`);
    },
    expectedIncluded: [
      "Jumped to Smaug.",
      "Treasure approach Smaug activity: none",
      "Lower halls Smaug activity: Smaug",
    ],
  },
  {
    name: "idle advance behaves like wait when input is empty",
    drive(game) {
      const beforeTurn = game.turnCount;
      game.executeIdleWait();
      game.print(`Turn delta after idle wait: ${game.turnCount - beforeTurn}`);
    },
    expectedIncluded: [
      "Time passes...",
      "You wait.",
      "Turn delta after idle wait: 1",
    ],
  },
  {
    name: "idle advance is suspended while the player is typing",
    drive(game) {
      document.getElementById("command-input").value = "open dr";
      const beforeTurn = game.turnCount;
      game.executeIdleWait();
      game.print(`Turn delta while typing: ${game.turnCount - beforeTurn}`);
      document.getElementById("command-input").value = "";
    },
    expectedIncluded: [
      "Turn delta while typing: 0",
    ],
    notExpectedIncluded: [
      "You wait.",
    ],
  },
  {
    name: "idle advance is suspended while the map is open",
    drive(game) {
      game.execute("map");
      const beforeTurn = game.turnCount;
      game.executeIdleWait();
      game.print(`Turn delta while map open: ${game.turnCount - beforeTurn}`);
    },
    expectedIncluded: [
      "You study the paths already traced across Wilderland.",
      "Turn delta while map open: 0",
    ],
    notExpectedIncluded: [
      "Time passes...",
      "You wait.",
    ],
  },
  {
    name: "contextual room descriptions react to transformed and post-dragon states",
    drive(game) {
      game.trollsTransformed = true;
      game.flags.dragondefeated = true;
      game.flags.erebor_standoff_started = true;
      game.flags.bard_camp_active = true;
      const dragon = Object.values(game.characters).find((character) => /dragon/i.test(character.name));
      if (dragon) dragon.visible = false;
      game.print(`Trolls clearing after dawn: ${game.contextualRoomDescription(game.rooms.trolls_clearing)}`);
      game.print(`Treasure approach after dragon: ${game.contextualRoomDescription(game.rooms.erebor_treasure_approach)}`);
      game.print(`Lower halls after dragon: ${game.contextualRoomDescription(game.rooms.lower_halls)}`);
      game.print(`Wooden Town after dragon: ${game.contextualRoomDescription(game.rooms.wooden_town)}`);
      game.print(`Front Gate during standoff: ${game.contextualRoomDescription(game.rooms.front_gate)}`);
      game.print(`Dale camp during standoff: ${game.contextualRoomDescription(game.rooms.ruins_of_the_town_of_dale)}`);
    },
    expectedIncluded: [
      "Trolls clearing after dawn: You are in the trolls' clearing. Dawn has ended the quarrel forever",
      "Treasure approach after dragon: Gold-dust still glitters in the cracks ahead, but the held-breath stillness has broken.",
      "Lower halls after dragon: You enter the lower halls of Erebor",
      "Wooden Town after dragon: You are in Lake-town, where hammers, shouted orders, and relieved exhaustion travel the plankways together",
      "Front Gate during standoff: You stand before the Front Gate of Erebor. The great doors now lie open to a kingdom reclaimed",
      "Dale camp during standoff: You stand among the ruins of Dale, where rough shelters, watch-fires, and hurried councils now occupy the broken streets.",
    ],
    notExpectedIncluded: [
      "occupied by something too mighty to disturb lightly",
    ],
  },
  {
    name: "contextual companion poses react in later chapters",
    drive(game) {
      game.flags.dragondefeated = true;
      const dragon = Object.values(game.characters).find((character) => /dragon/i.test(character.name));
      if (dragon) dragon.visible = false;
      game.unexpectedParty.state.thorinArrived = true;
      game.unexpectedParty.state.questBriefingDone = true;
      game.print(`Thorin in Bag End after briefing: ${game.companionDirector.companionPose(game.characters.thorin, "hobbit_hole", 0)}`);
      game.print(`Thorin in Erebor after dragon: ${game.companionDirector.companionPose(game.characters.thorin, "lower_halls", 0)}`);
      game.print(`Bard in Lake-town after dragon: ${game.companionDirector.companionPose(game.characters.bard, "wooden_town", 0)}`);
    },
    expectedIncluded: [
      "Thorin in Bag End after briefing: wears his impatience like armor, as though comfort itself were now an obstacle",
      "Thorin in Erebor after dragon: moves through the reclaimed halls with a hunger that has turned almost to reverence",
      "Bard in Lake-town after dragon: watches the rebuilding with the guarded relief of a man who knows survival is only the first labor",
    ],
  },
  {
    name: "companion pose regions avoid house or town phrasing in peripheral rooms",
    drive(game) {
      game.print(`Great River pose: ${game.companionDirector.companionPose(game.characters.thorin, "great_river", 0)}`);
      game.print(`Ravenhill pose: ${game.companionDirector.companionPose(game.characters.thorin, "stoe_of_ravenhill", 0)}`);
    },
    expectedIncluded: [
      "Great River pose:",
      "Ravenhill pose:",
    ],
    notExpectedIncluded: [
      "strength of the house",
      "sound of human trade and labor",
    ],
  },
  {
    name: "contextual companion comments react in later chapters",
    drive(game) {
      game.flags.dragondefeated = true;
      const dragon = Object.values(game.characters).find((character) => /dragon/i.test(character.name));
      if (dragon) dragon.visible = false;
      game.player.position = "lower_halls";
      game.currentRoom = "lower_halls";
      game.characters.bard.position = "lower_halls";
      game.flags.companion_comment_cooldown = 0;
      game.companionDirector.maybeComment();
    },
    expectedIncluded: [
      "Bard says 'A dead dragon leaves work behind him almost as large as the fear he kept alive.'",
    ],
  },
  {
    name: "put into ambiguous drawer clarifies carried item before destination",
    setup(game) {
      game.player.inventory = game.player.inventory.filter((id) => id !== "small_key");
      if (game.items.small_key) game.items.small_key.location = { type: "room", id: game.currentRoom };
    },
    drive(game) {
      game.execute("open top drawer");
      game.execute("open bottom drawer");
      game.execute("take brass key");
      game.execute("take sturdy key from bottom drawer");
      game.clarifiedReferences = {};
      game.execute("put key into drawer");
      game.execute("brass");
      game.execute("top");
    },
    expectedIncluded: [
      "Do you mean the brass key or the sturdy key?",
      "Do you mean the top drawer, the middle drawer, the bottom drawer, or the discreet little drawer?",
      "You put the brass key in the top drawer.",
    ],
    notExpectedIncluded: [
      "You put the sturdy key",
    ],
  },
  {
    name: "take from specific container updates remembered item and container references",
    drive(game) {
      game.execute("open top drawer");
      game.execute("open bottom drawer");
      game.execute("take brass key");
      game.execute("take sturdy key from bottom drawer");
      game.execute("drop key");
      game.execute("close drawer");
    },
    expectedIncluded: [
      "You take the brass key from the bottom drawer.",
      "You take the sturdy key from the bottom drawer.",
      "You leave the sturdy key.",
      "You close the bottom drawer.",
    ],
    notExpectedIncluded: [
      "You leave the brass key.",
      "You close the top drawer.",
    ],
  },
  {
    name: "take from container still clarifies ambiguous item",
    drive(game) {
      game.execute("open bottom drawer");
      game.execute("take key from bottom drawer");
      game.execute("sturdy");
    },
    expectedIncluded: [
      "Do you mean the delicate key, the sturdy key, or the brass key?",
      "You take the sturdy key from the bottom drawer.",
    ],
    notExpectedIncluded: [
      "small key",
    ],
  },
  {
    name: "unlock with wrong named key fails instead of auto-using the right one",
    drive(game) {
      game.execute("open bottom drawer");
      game.execute("take brass key");
      game.execute("open door");
      game.execute("go east");
      game.execute("unlock shed with brass key");
    },
    expectedIncluded: [
      "The brass key does not unlock the garden shed.",
    ],
    notExpectedIncluded: [
      "You unlock the shed with the sturdy key.",
    ],
  },
  {
    name: "locked heavy rock door requires explicit unlock before opening",
    setup(game) {
      game.currentRoom = "hidden_path";
      game.player.position = "hidden_path";
      if (!game.player.inventory.includes("the_large_key")) game.player.inventory.push("the_large_key");
      game.items.the_large_key.location = { type: "character", id: game.player.id };
      game.doors.porta_hidden_path_trolls_cave.open = false;
      game.doors.porta_hidden_path_trolls_cave.locked = true;
    },
    inputs: ["open door", "unlock door with large key", "open door"],
    expectedIncluded: [
      "The heavy rock door is locked.",
      "You unlock the heavy rock door with the large key.",
      "You open the heavy rock door.",
    ],
  },
  {
    name: "unlock with ambiguous key clarifies the key operand",
    setup(game) {
      game.player.inventory = game.player.inventory.filter((id) => id !== "small_key");
      if (game.items.small_key) game.items.small_key.location = { type: "room", id: game.currentRoom };
    },
    drive(game) {
      game.execute("open bottom drawer");
      game.execute("take sturdy key");
      game.execute("take brass key");
      game.execute("open door");
      game.execute("go east");
      game.execute("unlock shed with key");
      game.execute("sturdy");
    },
    expectedIncluded: [
      "Do you mean the sturdy key or the brass key?",
      "You unlock the garden shed with the sturdy key.",
    ],
  },
  {
    name: "combine with ambiguous secondary item clarifies the with operand",
    setup(game) {
      giveItemToCharacter(game, "golden_ring", game.player.id);
      giveItemToCharacter(game, "small_key", game.player.id);
      giveItemToCharacter(game, "brass_key", game.player.id);
      game.player.inventory = game.player.inventory.filter((id) => id !== "sturdy_key");
      if (game.items.sturdy_key) game.items.sturdy_key.location = { type: "room", id: game.currentRoom };
      game.data.combinations["golden ring+small key"] = { nome: "odd trinket", descrizione: "an odd trinket", peso: 1 };
    },
    drive(game) {
      game.execute("combine golden ring with key");
      game.execute("small");
    },
    expectedIncluded: [
      "Do you mean the small key or the brass key?",
      "You combine the golden ring with the small key, making the odd trinket.",
    ],
    notExpectedIncluded: [
      "Those objects do not combine into anything useful.",
    ],
  },
  {
    name: "arkenstone no longer combines with gold necklace",
    setup(game) {
      giveItemToCharacter(game, "arkenstone", game.player.id);
      giveItemToCharacter(game, "gold_necklace", game.player.id);
    },
    drive(game) {
      game.execute("combine arkenstone with gold necklace");
    },
    expectedIncluded: [
      "Those objects do not combine into anything useful.",
    ],
    notExpectedIncluded: [
      "You combine the arkenstone with the gold necklace",
      "regal necklace",
    ],
  },
  {
    name: "asking thorin about the arkenstone while bilbo keeps it hidden stays guarded",
    drive(game) {
      movePlayerTo(game, "front_gate");
      game.debugSetCharacterRoom("thorin", "front_gate", { visible: true, movementMode: "never" });
      giveItemToCharacter(game, "arkenstone", game.player.id);
      game.flags.arkenstone_seen = true;
      game.markArkenstoneIdentified();
      game.flags.arkenstone_taken = true;
      game.flags.arkenstone_hidden_from_thorin = true;
      game.execute("ask thorin about arkenstone");
    },
    expectedIncluded: [
      "Thorin says 'If the Arkenstone has indeed come to light again, then the heart of the Mountain is no lost memory only.'",
    ],
    notExpectedIncluded: [
      "Thorin's gaze fixes at once.",
    ],
  },
  {
    name: "showing the arkenstone to thorin reveals it openly",
    drive(game) {
      movePlayerTo(game, "front_gate");
      game.debugSetCharacterRoom("thorin", "front_gate", { visible: true, movementMode: "never" });
      giveItemToCharacter(game, "arkenstone", game.player.id);
      game.flags.arkenstone_seen = true;
      game.markArkenstoneIdentified();
      game.flags.arkenstone_taken = true;
      game.flags.arkenstone_hidden_from_thorin = true;
      game.execute("show arkenstone to thorin");
      game.print(`Hidden from Thorin: ${game.flags.arkenstone_hidden_from_thorin ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You show the arkenstone to Thorin.",
      "Thorin's gaze fixes at once. 'The Arkenstone,' he says softly. 'The Heart of the Mountain. No heir of my house could look on it lightly.'",
      "Hidden from Thorin: no",
    ],
  },
  {
    name: "showing the arkenstone to gandalf marks him as knowing while thorin remains uninformed",
    drive(game) {
      movePlayerTo(game, "front_gate");
      game.debugSetCharacterRoom("gandalf", "front_gate", { visible: true, movementMode: "never" });
      giveItemToCharacter(game, "arkenstone", game.player.id);
      game.flags.arkenstone_seen = true;
      game.markArkenstoneIdentified();
      game.flags.arkenstone_taken = true;
      game.flags.arkenstone_hidden_from_thorin = true;
      game.execute("show arkenstone to gandalf");
      game.print(`Gandalf knows Arkenstone: ${game.flags.gandalf_knows_arkenstone ? "yes" : "no"}`);
      game.print(`Hidden from Thorin after Gandalf: ${game.flags.arkenstone_hidden_from_thorin ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You show the arkenstone to Gandalf.",
      "Gandalf's eyes sharpen at once. 'So that is the Heart of the Mountain,' he murmurs. 'Keep your own counsel a little longer, Bilbo. Such a stone can move more than dwarves.'",
      "Gandalf knows Arkenstone: yes",
      "Hidden from Thorin after Gandalf: yes",
    ],
  },
  {
    name: "giving the arkenstone to bard marks the diplomatic handoff",
    drive(game) {
      movePlayerTo(game, "front_gate");
      game.debugSetCharacterRoom("bard", "front_gate", { visible: true, movementMode: "never" });
      giveItemToCharacter(game, "arkenstone", game.player.id);
      game.flags.arkenstone_seen = true;
      game.markArkenstoneIdentified();
      game.flags.arkenstone_taken = true;
      game.flags.arkenstone_hidden_from_thorin = true;
      game.execute("give arkenstone to bard");
      const bardHasStone = game.findCharacterItem(game.characters.bard, "arkenstone")?.item?.id === "arkenstone";
      game.print(`Arkenstone given to Bard: ${game.flags.arkenstone_given_to_bard ? "yes" : "no"}`);
      game.print(`Bard has Arkenstone: ${bardHasStone ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You give the arkenstone to Bard.",
      "Bard receives the Arkenstone without triumph. 'This may yet do what swords cannot,' he says quietly. 'If talk is still possible, this stone will weigh in it.'",
      "Arkenstone given to Bard: yes",
      "Bard has Arkenstone: yes",
    ],
  },
  {
    name: "asking bard about negotiation starts the standoff parley beat",
    drive(game) {
      movePlayerTo(game, "ruins_of_the_town_of_dale");
      game.flags.dragondefeated = true;
      game.flags.erebor_standoff_started = true;
      game.flags.bard_camp_active = true;
      game.flags.thorin_inside_erebor = true;
      game.debugSetCharacterRoom("bard", "ruins_of_the_town_of_dale", { visible: true, movementMode: "never" });
      game.execute("ask bard about negotiation");
      game.print(`Negotiation started: ${game.flags.negotiation_started ? "yes" : "no"}`);
      game.print(`Negotiation softened: ${game.flags.negotiation_softened_by_arkenstone ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Bard says 'Without some pledge or pressure greater than my word alone, Thorin will hear only one old claim set against another. We need more than indignation to begin this talk well.'",
      "Negotiation started: yes",
      "Negotiation softened: no",
    ],
  },
  {
    name: "asking thorin about negotiation stays hard before the arkenstone intervenes",
    drive(game) {
      movePlayerTo(game, "front_gate");
      game.flags.dragondefeated = true;
      game.flags.erebor_standoff_started = true;
      game.flags.bard_camp_active = true;
      game.flags.thorin_inside_erebor = true;
      game.debugSetCharacterRoom("thorin", "front_gate", { visible: true, movementMode: "never" });
      game.execute("ask thorin about negotiation");
      game.print(`Negotiation started: ${game.flags.negotiation_started ? "yes" : "no"}`);
      game.print(`Negotiation failed: ${game.flags.negotiation_failed ? "yes" : "no"}`);
      game.print(`Negotiation resolved: ${game.flags.negotiation_resolved ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Thorin says 'If Bard comes to my gate with demands, he shall hear my answer from the stone itself: what is mine is not to be haggled over in the hour of its recovery.'",
      "Negotiation started: yes",
      "Negotiation failed: yes",
      "Negotiation resolved: no",
    ],
  },
  {
    name: "showing the arkenstone to bard softens the negotiation and changes gandalfs reading of thorin",
    drive(game) {
      game.currentRoom = "front_gate";
      game.player.position = "front_gate";
      game.flags.dragondefeated = true;
      game.flags.erebor_standoff_started = true;
      game.flags.bard_camp_active = true;
      game.flags.thorin_inside_erebor = true;
      game.debugSetCharacterRoom("bard", "front_gate", { visible: true, movementMode: "never" });
      game.debugSetCharacterRoom("gandalf", "front_gate", { visible: true, movementMode: "never" });
      giveItemToCharacter(game, "arkenstone", game.player.id);
      game.flags.arkenstone_seen = true;
      game.markArkenstoneIdentified();
      game.flags.arkenstone_taken = true;
      game.flags.arkenstone_hidden_from_thorin = true;
      game.execute("show arkenstone to bard");
      game.debugSetCharacterRoom("gandalf", "front_gate", { visible: true, movementMode: "never" });
      game.execute("ask gandalf about thorin");
      game.print(`Negotiation softened: ${game.flags.negotiation_softened_by_arkenstone ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You show the arkenstone to Bard.",
      "Bard studies the white jewel in silence, then says 'A stone like that may weigh upon hearts more heavily than mail or iron.'",
      "Gandalf says 'Thorin is still proud enough, but pride is easier to reason with when the Arkenstone itself has entered the matter. He may yet hear more than his own grievance.'",
      "Negotiation softened: yes",
    ],
  },
  {
    name: "showing the arkenstone to bard changes thorins tone on negotiation",
    drive(game) {
      game.currentRoom = "front_gate";
      game.player.position = "front_gate";
      game.flags.dragondefeated = true;
      game.flags.erebor_standoff_started = true;
      game.flags.bard_camp_active = true;
      game.flags.thorin_inside_erebor = true;
      game.debugSetCharacterRoom("bard", "front_gate", { visible: true, movementMode: "never" });
      game.debugSetCharacterRoom("thorin", "front_gate", { visible: true, movementMode: "never" });
      giveItemToCharacter(game, "arkenstone", game.player.id);
      game.flags.arkenstone_seen = true;
      game.markArkenstoneIdentified();
      game.flags.arkenstone_taken = true;
      game.flags.arkenstone_hidden_from_thorin = true;
      game.execute("show arkenstone to bard");
      game.debugSetCharacterRoom("thorin", "front_gate", { visible: true, movementMode: "never" });
      game.execute("ask thorin about negotiation");
      game.print(`Negotiation failed: ${game.flags.negotiation_failed ? "yes" : "no"}`);
      game.print(`Negotiation resolved: ${game.flags.negotiation_resolved ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Thorin says 'I will not be schooled before my own gate; yet for the Arkenstone's sake, and for the honor of my word, I will hear what Bard asks before I answer him finally.'",
      "Negotiation failed: no",
      "Negotiation resolved: yes",
    ],
  },
  {
    name: "waiting twice after negotiation starts brings dain and his reinforcements",
    drive(game) {
      movePlayerTo(game, "ruins_of_the_town_of_dale");
      game.flags.dragondefeated = true;
      game.flags.erebor_standoff_started = true;
      game.flags.bard_camp_active = true;
      game.flags.thorin_inside_erebor = true;
      game.debugSetCharacterRoom("bard", "ruins_of_the_town_of_dale", { visible: true, movementMode: "never" });
      game.execute("ask bard about negotiation");
      game.execute("wait");
      game.execute("wait");
      game.print(`Dain arrived: ${game.flags.dain_arrived ? "yes" : "no"}`);
      game.print(`Dwarf reinforcements present: ${game.flags.dwarf_reinforcements_present ? "yes" : "no"}`);
      game.print(`Dain arrival autosave: ${game.autosaveMeta?.label || "none"}`);
    },
    expectedIncluded: [
      "Bard says 'Without some pledge or pressure greater than my word alone, Thorin will hear only one old claim set against another. We need more than indignation to begin this talk well.'",
      "Messengers come and go between the ruins and the northern watch, and more than one voice begins to speak uneasily of dwarf-standards on the march from the Iron Hills.",
      "A stir runs through the camp: mail-clad dwarves have come at last from the Iron Hills under Dain, and their coming is more fit for battle than for patient speech.",
      "Dain arrived: yes",
      "Dwarf reinforcements present: yes",
      "Dain arrival autosave: after Dain reaches Dale",
    ],
  },
  {
    name: "asking gandalf about dain after arrival frames the new danger",
    drive(game) {
      movePlayerTo(game, "ruins_of_the_town_of_dale");
      game.flags.dragondefeated = true;
      game.flags.erebor_standoff_started = true;
      game.flags.bard_camp_active = true;
      game.flags.thorin_inside_erebor = true;
      game.flags.negotiation_started = true;
      game.flags.dain_arrived = true;
      game.flags.dwarf_reinforcements_present = true;
      game.debugSetCharacterRoom("gandalf", "ruins_of_the_town_of_dale", { visible: true, movementMode: "never" });
      game.execute("ask gandalf about dain");
    },
    expectedIncluded: [
      "Gandalf says 'Dain has come swiftly from the Iron Hills, and he has not marched in mail so that this matter may remain a mere exchange of courtesies. Every axe beneath the Mountain makes peace narrower and battle easier.'",
    ],
  },
  {
    name: "asking thorin about negotiation after dain arrives hardens the standoff",
    drive(game) {
      movePlayerTo(game, "front_gate");
      game.flags.dragondefeated = true;
      game.flags.erebor_standoff_started = true;
      game.flags.bard_camp_active = true;
      game.flags.thorin_inside_erebor = true;
      game.flags.negotiation_started = true;
      game.flags.dain_arrived = true;
      game.flags.dwarf_reinforcements_present = true;
      game.debugSetCharacterRoom("thorin", "front_gate", { visible: true, movementMode: "never" });
      game.execute("ask thorin about negotiation");
      game.print(`Negotiation failed: ${game.flags.negotiation_failed ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Thorin says 'With Dain come axes enough that I need not bargain out of fear. If Bard seeks terms, he will learn that my patience is not surrender.'",
      "Negotiation failed: yes",
    ],
  },
  {
    name: "waiting after dain arrives begins the compact battle sequence",
    drive(game) {
      movePlayerTo(game, "ruins_of_the_town_of_dale");
      game.flags.dragondefeated = true;
      game.flags.erebor_standoff_started = true;
      game.flags.bard_camp_active = true;
      game.flags.thorin_inside_erebor = true;
      game.flags.negotiation_started = true;
      game.flags.dain_arrived = true;
      game.flags.dwarf_reinforcements_present = true;
      game.flags.battle_wait_armed = true;
      game.execute("wait");
      game.print(`Battle started: ${game.flags.battle_started ? "yes" : "no"}`);
      game.print(`Battle stage 1: ${game.flags.battle_stage_1 ? "yes" : "no"}`);
      game.print(`Battle autosave: ${game.autosaveMeta?.label || "none"}`);
    },
    expectedIncluded: [
      "Before any bargain can ripen, a black tide of goblins and wargs comes pouring out of the north. Horns answer horns, and the whole valley below Erebor turns in a moment from standoff to war.",
      "Gandalf's voice cuts through the uproar: 'Choose quickly, Bilbo. Follow me, stand with Thorin, help Bard, or retreat while retreat is still possible.'",
      "Battle started: yes",
      "Battle stage 1: yes",
      "Battle autosave: after the Battle of Five Armies begins",
    ],
  },
  {
    name: "following gandalf then helping bard wins the compact battle",
    drive(game) {
      movePlayerTo(game, "ruins_of_the_town_of_dale");
      game.flags.dragondefeated = true;
      game.flags.erebor_standoff_started = true;
      game.flags.bard_camp_active = true;
      game.flags.thorin_inside_erebor = true;
      game.flags.negotiation_started = true;
      game.flags.dain_arrived = true;
      game.flags.dwarf_reinforcements_present = true;
      game.beginBattleOfFiveArmies();
      game.execute("follow gandalf");
      game.print(`After Gandalf room: ${game.currentRoom}`);
      game.print(`Battle stage 2: ${game.flags.battle_stage_2 ? "yes" : "no"}`);
      game.execute("help bard");
      game.print(`Battle won: ${game.flags.battle_won ? "yes" : "no"}`);
      game.print(`Beorn battle aid seen: ${game.flags.beorn_battle_aid_seen ? "yes" : "no"}`);
      game.print(`Battle survival autosave: ${game.autosaveMeta?.label || "none"}`);
    },
    expectedIncluded: [
      "You race after Gandalf toward Ravenhill, where the whole field may be read in one dreadful glance.",
      "After Gandalf room: stoe_of_ravenhill",
      "Battle stage 2: yes",
      "You help Bard steady the battered line until the counterstroke goes in at the right moment, and from that moment the goblin host begins at last to buckle.",
      "Then the eagles are among the enemy in earnest, and with them comes Beorn in a wrath beyond reason, tearing into the goblin host until its last hard courage gives way.",
      "When the tumult clears, the goblins are broken and scattered. Erebor stands, but the cost of the day is written everywhere among the stones.",
      "Battle won: yes",
      "Beorn battle aid seen: yes",
      "Battle survival autosave: after surviving the Battle of Five Armies",
    ],
  },
  {
    name: "standing with thorin advances the compact battle to its second stage",
    drive(game) {
      movePlayerTo(game, "ruins_of_the_town_of_dale");
      game.flags.dragondefeated = true;
      game.flags.erebor_standoff_started = true;
      game.flags.bard_camp_active = true;
      game.flags.thorin_inside_erebor = true;
      game.flags.negotiation_started = true;
      game.flags.dain_arrived = true;
      game.flags.dwarf_reinforcements_present = true;
      game.beginBattleOfFiveArmies();
      game.execute("stand with thorin");
      game.print(`After Thorin room: ${game.currentRoom}`);
      game.print(`Battle stage 2 after Thorin: ${game.flags.battle_stage_2 ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You hurry to Thorin at the Gate, where dwarf-axes are already ringing against shield and stone.",
      "Thorin's mood is terrible and kingly together. 'Then stand fast,' he says. 'If Erebor is to be held indeed, it will be held in battle now.'",
      "After Thorin room: front_gate",
      "Battle stage 2 after Thorin: yes",
    ],
  },
  {
    name: "waiting after the battle leads bilbo to thorin on ravenhill",
    drive(game) {
      movePlayerTo(game, "ruins_of_the_town_of_dale");
      game.flags.dragondefeated = true;
      game.flags.erebor_standoff_started = true;
      game.flags.bard_camp_active = true;
      game.flags.thorin_inside_erebor = true;
      game.flags.negotiation_started = true;
      game.flags.dain_arrived = true;
      game.flags.dwarf_reinforcements_present = true;
      game.beginBattleOfFiveArmies();
      game.execute("follow gandalf");
      game.execute("help bard");
      game.execute("wait");
      game.print(`Thorin fallen: ${game.flags.thorin_fallen ? "yes" : "no"}`);
      game.print(`Aftermath room: ${game.currentRoom}`);
      game.print(`Beorn bore Thorin: ${game.flags.beorn_bore_thorin_seen ? "yes" : "no"}`);
      game.print(`Beorn at Ravenhill: ${game.characters.beorn?.position === "stoe_of_ravenhill" ? "yes" : "no"}`);
      game.print(`Thorin fall autosave: ${game.autosaveMeta?.label || "none"}`);
    },
    expectedIncluded: [
      "When the first hard business of victory is under way, word comes quietly that Thorin has been brought to Ravenhill, sorely wounded and asking for Bilbo.",
      "You go up among the broken stones and find Gandalf beside him. The fury of battle is gone from Thorin now, and there is little strength left to him.",
      "Beorn stands nearby, still grim from battle, and it is plain from the bearing of the dwarves that he was the one who bore Thorin wounded out of the ruin of the field.",
      "Thorin fallen: yes",
      "Aftermath room: stoe_of_ravenhill",
      "Beorn bore Thorin: yes",
      "Beorn at Ravenhill: yes",
      "Thorin fall autosave: after finding Thorin on Ravenhill",
    ],
  },
  {
    name: "beorn on ravenhill acknowledges bearing thorin from the field",
    drive(game) {
      movePlayerTo(game, "stoe_of_ravenhill");
      game.flags.dragondefeated = true;
      game.flags.erebor_standoff_started = true;
      game.flags.bard_camp_active = true;
      game.flags.thorin_inside_erebor = true;
      game.flags.battle_won = true;
      game.flags.thorin_fallen = true;
      game.flags.beorn_bore_thorin_seen = true;
      game.debugSetCharacterRoom("beorn", "stoe_of_ravenhill", { visible: true, movementMode: "never" });
      game.execute("ask beorn about thorin");
      game.execute("talk to beorn");
    },
    expectedIncluded: [
      "Beorn says 'He was no light burden to bear, nor would I have had him be one. A king should come out of battle as a king, even when battle has beaten him.'",
      "Beorn says 'He fought hard and fell hard. I brought him out when the crush was blackest; now let him spend his last strength in peace, if peace can still be given him.'",
    ],
  },
  {
    name: "talking to thorin on ravenhill resolves the reconciliation scene",
    drive(game) {
      movePlayerTo(game, "stoe_of_ravenhill");
      game.flags.dragondefeated = true;
      game.flags.erebor_standoff_started = true;
      game.flags.bard_camp_active = true;
      game.flags.thorin_inside_erebor = true;
      game.flags.battle_won = true;
      game.flags.thorin_fallen = true;
      game.debugSetCharacterRoom("thorin", "stoe_of_ravenhill", { visible: true, movementMode: "never" });
      game.debugSetCharacterRoom("gandalf", "stoe_of_ravenhill", { visible: true, movementMode: "never" });
      game.execute("talk to thorin");
      game.print(`Thorin reconciled: ${game.flags.thorin_reconciled ? "yes" : "no"}`);
      game.print(`Thorin farewell autosave: ${game.autosaveMeta?.label || "none"}`);
    },
    expectedIncluded: [
      "Thorin opens his eyes and says 'Farewell, good thief. There is more in you of good than you know: courage and wisdom, blended in measure. If more of us valued food and cheer and song above hoarded gold, it would be a merrier world.'",
      "Thorin reconciled: yes",
      "Thorin farewell autosave: after Thorin's farewell on Ravenhill",
    ],
  },
  {
    name: "thorins final reconciliation is not available before victory",
    drive(game) {
      movePlayerTo(game, "front_gate");
      game.flags.dragondefeated = true;
      game.flags.erebor_standoff_started = true;
      game.flags.bard_camp_active = true;
      game.flags.thorin_inside_erebor = true;
      game.flags.battle_started = true;
      game.flags.battle_stage_1 = true;
      game.debugSetCharacterRoom("thorin", "front_gate", { visible: true, movementMode: "never" });
      game.execute("talk to thorin");
      game.print(`Thorin reconciled before victory: ${game.flags.thorin_reconciled ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Thorin says 'Stand fast now, Master Baggins. There will be time enough for speech when the goblins are broken or we are.'",
      "Thorin reconciled before victory: no",
    ],
    notExpectedIncluded: [
      "Farewell, good thief.",
    ],
  },
  {
    name: "retreating once the battle starts is an early failure",
    drive(game) {
      movePlayerTo(game, "front_gate");
      game.flags.dragondefeated = true;
      game.flags.erebor_standoff_started = true;
      game.flags.bard_camp_active = true;
      game.flags.thorin_inside_erebor = true;
      game.flags.negotiation_started = true;
      game.flags.dain_arrived = true;
      game.flags.dwarf_reinforcements_present = true;
      game.beginBattleOfFiveArmies();
      game.execute("retreat");
      game.print(`Battle retreat endgame: ${game.endgame ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You turn from the field while there is still a gap to do it, but in the confusion of broken stone, fleeing men, and the first rush of goblins, retreat becomes rout. The battle sweeps over you before you can win clear.",
      "Battle retreat endgame: yes",
    ],
  },
  {
    name: "put in specific container updates remembered container reference",
    drive(game) {
      game.execute("open top drawer");
      game.execute("open bottom drawer");
      game.execute("take brass key");
      game.execute("put brass key in top drawer");
      game.execute("close drawer");
    },
    expectedIncluded: [
      "You put the brass key in the top drawer.",
      "You close the top drawer.",
    ],
    notExpectedIncluded: [
      "You close the bottom drawer.",
    ],
  },
  {
    name: "matcher does not accept arbitrary inner substrings",
    drive(game) {
      game.execute("open raw");
      game.execute("open bottom drawer");
      game.execute("take ass");
    },
    expectedIncluded: [
      "I don't see that here.",
    ],
    notExpectedIncluded: [
      "You take the brass key",
    ],
  },
  {
    name: "matcher still accepts useful compound suffixes",
    setup(game) {
      game.items.firestone.location = { type: "room", id: game.currentRoom };
      game.items.firestone.visible = true;
    },
    drive(game) {
      game.execute("take stone");
    },
    expectedIncluded: [
      "You take the firestone.",
    ],
  },
  {
    name: "autoplay retrieves ornate box from guest trunk",
    drive(game) {
      const issued = [];
      for (let step = 0; step < 20 && !game.autoplayHas("firestone"); step += 1) {
        const command = game.nextAutoplayCommand();
        if (!command) throw new Error(`Autoplay stopped unexpectedly at step ${step} in ${game.currentRoom}.`);
        issued.push(command);
        game.execute(command);
      }
      if (!game.autoplayHas("firestone")) {
        throw new Error(`Autoplay did not retrieve the firestone. Commands: ${issued.join(" | ")}`);
      }
      if (!issued.includes("open guest trunk")) {
        throw new Error(`Expected autoplay to open the guest trunk. Commands: ${issued.join(" | ")}`);
      }
      if (!issued.includes("take ornate box")) {
        throw new Error(`Expected autoplay to take the ornate box from the guest trunk. Commands: ${issued.join(" | ")}`);
      }
      game.print(`Autoplay firestone path: ${issued.join(" -> ")}`);
    },
    expectedIncluded: [/Autoplay firestone path: .+open guest trunk.+take ornate box.+take firestone/],
  },
  {
    name: "lamp can be lit and turned off",
    inputs: ["light lamp", "turn off lamp"],
    expectedIncluded: [
      "You light the elegant lamp. Its engraved metal catches the warm glow.",
      "You turn off the elegant lamp.",
    ],
  },
  {
    name: "turn on lamp is handled as lighting",
    inputs: ["turn on lamp"],
    expectedIncluded: ["You light the elegant lamp. Its engraved metal catches the warm glow."],
    notExpectedIncluded: ["The elegant lamp cannot be opened."],
  },
  {
    name: "trolls cave is dim without lantern",
    setup(game) {
      game.currentRoom = "trolls_cave";
      game.player.position = "trolls_cave";
      game.flags.lanternon = false;
      game.flags.lanternturns = 0;
    },
    drive(game) {
      game.execute("look");
      game.print(`Dim exits: ${game.roomConnections().length}`);
    },
    expectedIncluded: [
      "The cave lies in a murky penumbra. You can make out the larger shapes, but fine details are easily missed.",
      /Dim exits: [1-9]/,
    ],
  },
  {
    name: "lantern reveals arcane chest in trolls cave without careful adverb",
    setup(game) {
      game.currentRoom = "trolls_cave";
      game.player.position = "trolls_cave";
      game.player.inventory.push("brass_lantern");
      game.flags.lanternon = false;
      game.flags.lanternturns = 0;
      if (game.items.arcane_chest) game.items.arcane_chest.visible = false;
      game.flags.swordchest = false;
    },
    drive(game) {
      game.execute("light lantern");
      game.execute("examine discarded armor");
      game.print(`Arcane chest visible: ${game.items.arcane_chest.visible ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "In the lantern glow, something runed glints beneath the discarded armor: an arcane chest.",
      "Arcane chest visible: yes",
    ],
  },
  {
    name: "lighting lantern restores visibility in dark tunnels",
    setup(game) {
      game.currentRoom = "dark_stuffy_passage_13";
      game.player.position = "dark_stuffy_passage_13";
      game.player.inventory.push("brass_lantern");
      game.flags.lanternon = false;
      game.flags.lanternturns = 0;
    },
    drive(game) {
      game.execute("light lantern");
      if (game.roomConnections().length === 0) {
        throw new Error("Expected visible exits after lighting the lantern in a dark tunnel.");
      }
      game.print(`Lit tunnel exits: ${game.roomConnections().length}`);
    },
    expectedIncluded: [
      "You light the brass lantern. It gives off a steady glow for a while.",
      /Lit tunnel exits: [1-9]/,
    ],
  },
  {
    name: "moving in total darkness can reduce strength",
    setup(game) {
      game.currentRoom = "dark_stuffy_passage_13";
      game.player.position = "dark_stuffy_passage_13";
      game.player.strength = 6;
      game.storySeed = 1;
      game.flags.lanternon = false;
      game.flags.lanternturns = 0;
    },
    drive(game) {
      game.execute("south west");
      game.execute("north east");
      game.execute("south west");
      game.execute("north east");
      game.print(`Dark movement strength: ${game.player.strength}`);
    },
    expectedIncluded: [
      /Strength: [0-9]+./,
      /Dark movement strength: [0-5]/,
    ],
  },
  {
    name: "inkwell can be opened and closed",
    inputs: ["open inkwell", "close inkwell"],
    expectedIncluded: [
      "You unstopper the dark glass inkwell.",
      "You stopper the dark glass inkwell.",
    ],
  },
  {
    name: "write on parchment has contextual response",
    inputs: ["write on parchment"],
    expectedIncluded: ["You make a few uncertain marks on the parchment. They do not change the adventure, but at least the ink still flows."],
  },
  {
    name: "move settee grammar",
    inputs: ["move settee"],
    expectedIncluded: ["The plush settee is too heavy to be moved."],
  },
  {
    name: "lie on settee accepted",
    inputs: ["lie on settee"],
    expectedIncluded: ["You lie on the settee for a while."],
  },
  {
    name: "lie on absent settee rejected",
    inputs: ["open door", "go east", "lie on settee"],
    expectedIncluded: ["I don't see that here."],
  },
  {
    name: "pick rose has garden response",
    inputs: ["open door", "go east", "pick rose"],
    expectedIncluded: ["You pick a rose. It smells sweet, but it is too delicate to be useful."],
  },
  {
    name: "fill and water garden",
    inputs: [
      "open bottom drawer",
      "take sturdy key",
      "open door",
      "go east",
      "unlock shed with sturdy key",
      "open shed",
      "take watering can",
      "fill watering can",
      "water rose bush",
    ],
    expectedIncluded: [
      "You fill the watering can from the bird bath.",
      "You water the rose bush. The leaves look fresher.",
    ],
  },
  {
    name: "garden tools support natural actions",
    inputs: [
      "open bottom drawer",
      "take sturdy key",
      "take brass key",
      "open door",
      "go east",
      "unlock shed with sturdy key",
      "open shed",
      "unlock tool rack with brass key",
      "open tool rack",
      "take spade",
      "take rake",
      "take pruner",
      "dig garden",
      "rake leaves",
      "trim rose bush with pruner",
    ],
    expectedIncluded: [
      "You dig carefully with the garden spade, but uncover nothing unexpected.",
      "You rake the garden path into a tidier state.",
      "You trim the rose bush carefully. It looks a little neater.",
    ],
  },
  {
    name: "plant seeds in garden",
    inputs: [
      "open bottom drawer",
      "take sturdy key",
      "open door",
      "go east",
      "unlock shed with sturdy key",
      "open shed",
      "take seed packet",
      "plant seeds",
    ],
    expectedIncluded: ["You plant a few seeds in a soft patch of earth. They will need time and care."],
  },
  {
    name: "elrond offers map counsel in rivendell",
    setup(game) {
      game.currentRoom = "rivendell";
      game.player.position = "rivendell";
    },
    inputs: ["ask elrond about map"],
    expectedIncluded: ["Elrond says 'Such maps do not speak plainly to hasty eyes. Patience, and the right light, reveal more than force ever could.'"],
  },
  {
    name: "rivendell revelation shows thrors map until next command",
    setup(game) {
      movePlayerTo(game, "rivendell");
      game.debugGiveStandardLoadout({ map: true, sword: true, rope: true });
      game.debugSetCharacterRoom("elrond", "rivendell");
      game.flags.rivendell_preparations_complete = false;
      game.flags.mapread = false;
    },
    drive(game) {
      game.triggerRivendellPreparationRevelation();
      game.print(`Rivendell milestone autosave: ${game.autosaveMeta?.label || "none"}`);
      game.print(`Temporary image file active: ${game.temporaryImage?.file || "none"}`);
      game.execute("look");
      game.print(`Temporary image after next command: ${/Thrors_map\\.jpg/i.test(game.currentImageSrc) ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Elrond spreads the weathered parchment before the Company, and all draw close while the Lord of Rivendell studies the ancient markings.",
      "Rivendell milestone autosave: after Elrond reveals the way forward",
      "Temporary image file active: Thrors_map.jpg",
      "Temporary image after next command: no",
    ],
  },
  {
    name: "temporary image does not persist through restore",
    setup(game) {
      movePlayerTo(game, "rivendell");
      game.showTemporaryImage("thrors-map", { alt: "Thror's Map" });
    },
    drive(game) {
      const snapshot = game.storage.createSnapshot();
      game.storage.restoreSnapshot(snapshot);
      const roomImageEl = document.getElementById("room-image");
      game.print(`Temporary image flag after restore: ${game.temporaryImage ? "yes" : "no"}`);
      game.print(`Temporary image src after restore: ${/Thrors_map\\.jpg/i.test(roomImageEl.src) ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Temporary image flag after restore: no",
      "Temporary image src after restore: no",
    ],
  },
  {
    name: "beorn answers food request in his house",
    setup(game) {
      game.currentRoom = "beorns_house";
      game.player.position = "beorns_house";
    },
    inputs: ["ask beorn for food"],
    expectedIncluded: ["Beorn says 'There is food and a roof for honest guests. Help yourself, but do not mistake hospitality for weakness.'"],
  },
  {
    name: "beorn answers about his animals as disciplined household servants",
    setup(game) {
      game.currentRoom = "beorns_house";
      game.player.position = "beorns_house";
      game.flags.beorn_dinner_seen = true;
    },
    inputs: ["ask beorn about animals"],
    expectedIncluded: ["Beorn says 'My beasts know their work better than many men do. Treat them with courtesy, and you will find them more sensible company than most travelers.'"],
  },
  {
    name: "beorn great hall reflects the hospitality scene after arrival",
    drive(game) {
      game.execute("jump beorn");
      game.execute("east");
      game.print(`Beorn great hall after dinner: ${game.contextualRoomDescription(game.rooms.beorn_great_hall)}`);
    },
    expectedIncluded: [
      "Beorn great hall after dinner: You are in Beorn's great hall, where the long table still looks half ready for another enormous supper.",
      "The smell of honey, warm bread, and woodsmoke hangs pleasantly in the timbered air",
    ],
  },
  {
    name: "combat narration reflects swordplay and goblin cave atmosphere",
    setup(game) {
      movePlayerTo(game, "goblins_dungeon");
      addHostileTestCharacter(game, "test_goblin", { name: "nasty goblin", strength: 1 });
      giveItemToCharacter(game, "majestic_sword", game.player.id);
    },
    inputs: ["attack nasty goblin with majestic sword"],
    expectedIncluded: [
      /(blade|steel|sword)/i,
      "goblin",
      /(dark|drip|cavern|echo)/i,
    ],
  },
  {
    name: "combat narration for enemy attack reflects danger to bilbo",
    setup(game) {
      movePlayerTo(game, "goblins_dungeon");
      addHostileTestCharacter(game, "test_goblin", { name: "hideous goblin", strength: 12 });
    },
    drive(game) {
      game.attackCharacter(game.characters.test_goblin, game.player, null, { forced: true });
      game.print(`Combat death choice: ${game.pendingEndgameChoice || "none"}`);
      game.print(`Combat death image: ${game.temporaryImage?.file || "none"}`);
    },
    expectedIncluded: [
      /(you|your)/i,
      /(rush|strik|grapple|blow|guard)/i,
      "Combat death choice: death",
      "Combat death image: bilbo_goblins_around_him_death.png",
    ],
  },
  {
    name: "combat death against a spider uses the spider kill death image",
    setup(game) {
      movePlayerTo(game, "mirkwood_spider_grove");
      addHostileTestCharacter(game, "test_spider", { name: "great spider", strength: 12 });
    },
    drive(game) {
      game.attackCharacter(game.characters.test_spider, game.player, null, { forced: true });
      game.print(`Spider combat death image: ${game.temporaryImage?.file || "none"}`);
    },
    expectedIncluded: [
      "Spider combat death image: spider_kills_bilbo_death.png",
    ],
  },
  {
    name: "combat narration varies across repeated similar attacks",
    setup(game) {
      movePlayerTo(game, "goblins_dungeon");
      giveItemToCharacter(game, "majestic_sword", game.player.id);
    },
    drive(game) {
      addHostileTestCharacter(game, "test_goblin_one", { name: "mean goblin", strength: 1 });
      const firstStart = outputLines.length;
      game.execute("attack mean goblin with majestic sword");
      const first = outputLines.slice(firstStart).find((line) => /(falls|lies still|does not rise again|collapses)/i.test(line)) || "";

      addHostileTestCharacter(game, "test_goblin_two", { name: "vicious goblin", strength: 1 });
      const secondStart = outputLines.length;
      game.execute("attack vicious goblin with majestic sword");
      const second = outputLines.slice(secondStart).find((line) => /(falls|lies still|does not rise again|collapses)/i.test(line)) || "";

      game.print(`Combat lines differ: ${first !== second ? "yes" : "no"}`);
    },
    expectedIncluded: ["Combat lines differ: yes"],
  },
  {
    name: "hulking goblin ambush opener uses danger styling",
    setup(game) {
      movePlayerTo(game, "dark_stuffy_passage_14");
      placeCharacterWithPlayer(game, "thorin");
      placeCharacterWithPlayer(game, "gandalf");
    },
    drive(game) {
      const outputElement = document.getElementById("output");
      outputElement.replaceChildren();
      game.checkSpecialSituations();
      const openerLine = outputElement.children.find((line) => line.textContent === "A hulking goblin drops out of a crack above and crashes into the company before anyone can shout warning.");
      game.print(`Goblin ambush opener danger: ${openerLine?.className.includes("danger") ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Goblin ambush opener danger: yes",
    ],
  },
  {
    name: "event-driven hazard entries keep a single safe moment",
    setup(game) {
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key && key.startsWith("hobbit-web-save:")) localStorage.removeItem(key);
      }
      game.storage.refreshLatestAutosaveState();
      placeCharacterWithPlayer(game, "thorin");
      placeCharacterWithPlayer(game, "gandalf");
    },
    drive(game) {
      movePlayerTo(game, "dark_stuffy_passage_14");
      game.visitedRooms.delete("deep_dark_lake");
      const goblinStart = outputLines.length;
      game.maybeAutosaveForRoom(game.currentRoom);
      game.checkSpecialSituations();
      const goblinSafeLines = outputLines.slice(goblinStart).filter((line) => line.includes("Game saved."));
      game.print(`Goblin entry safe moments shown: ${goblinSafeLines.length}`);
      game.print(`Goblin entry label: ${game.autosaveMeta?.label || "none"}`);

      movePlayerTo(game, "deep_dark_lake");
      game.gollumState = game.createGollumState();
      const gollum = game.currentGollum();
      if (gollum) {
        gollum.visible = true;
        gollum.position = "deep_dark_lake";
      }
      const gollumStart = outputLines.length;
      game.maybeAutosaveForRoom(game.currentRoom);
      game.checkSpecialSituations();
      const gollumSafeLines = outputLines.slice(gollumStart).filter((line) => line.includes("Game saved."));
      game.print(`Gollum entry safe moments shown: ${gollumSafeLines.length}`);
      game.print(`Gollum entry label: ${game.autosaveMeta?.label || "none"}`);
    },
    expectedIncluded: [
      "Goblin entry safe moments shown: 1",
      "Goblin entry label: before the goblin ambush in the upper tunnels",
      "Gollum entry safe moments shown: 1",
      "Gollum entry label: before meeting Gollum",
    ],
  },
  {
    name: "tunnel ambush goblin requires bilbo and a companion to finish it",
    setup(game) {
      movePlayerTo(game, "dark_stuffy_passage_14");
      placeCharacterWithPlayer(game, "thorin");
      placeCharacterWithPlayer(game, "gandalf");
      giveItemToCharacter(game, "majestic_sword", game.player.id);
      giveItemToCharacter(game, "brass_lantern", game.player.id);
      game.flags.lanternon = true;
      game.flags.lanternturns = 20;
      game.checkSpecialSituations();
    },
    drive(game) {
      game.execute("attack hulking goblin with majestic sword");
      game.execute("ask gandalf to attack hulking goblin");
      game.execute("look");
      game.print(`Goblin ambush milestone autosave: ${game.autosaveMeta?.label || "none"}`);
    },
    expectedIncluded: [
      "Thorin goes down under it with a cry",
      "another of the company must strike now",
      /(Bilbo darts in again as Gandalf crashes into the brute from the flank|Gandalf strikes as Bilbo keeps the hulking goblin off balance|Bilbo's desperate stroke opens the moment Gandalf needs)/,
      /(drag it off Thorin|creature is hacked down before it can recover its grip on Thorin|is finished there in the tunnel dust)/,
      "The body of the hulking goblin lies here.",
      "Goblin ambush milestone autosave: after surviving the goblin ambush in the upper tunnels",
    ],
    notExpectedIncluded: [
      "as you crashes into the brute from the flank",
    ],
  },
  {
    name: "tunnel ambush goblin kills the company if bilbo delays too long",
    setup(game) {
      movePlayerTo(game, "dark_stuffy_passage_14");
      placeCharacterWithPlayer(game, "thorin");
      placeCharacterWithPlayer(game, "gandalf");
      giveItemToCharacter(game, "majestic_sword", game.player.id);
      game.checkSpecialSituations();
    },
    drive(game) {
      game.execute("look");
      game.execute("wait");
      game.execute("wait");
      game.execute("wait");
      game.print(`Goblin ambush endgame: ${game.pendingEndgameChoice || "none"}`);
      game.print(`Goblin ambush death image: ${game.temporaryImage?.file || "none"}`);
    },
    expectedIncluded: [
      "One more heartbeat of delay will be too late.",
      "Goblin ambush endgame: death",
      "Goblin ambush death image: hulking_goblin_attack_death.png",
    ],
  },
  {
    name: "autoplay handles tunnel ambush goblin with a companion order",
    setup(game) {
      movePlayerTo(game, "dark_stuffy_passage_14");
      placeCharacterWithPlayer(game, "thorin");
      placeCharacterWithPlayer(game, "gandalf");
      game.flags.seenpony = true;
      game.visitedRooms.add("dreary");
      game.visitedTrollsClearing = true;
      game.trollsTransformed = true;
      game.flags.mapread = true;
      game.flags.largekeyspent = true;
      giveItemToCharacter(game, "firestone", game.player.id);
      giveItemToCharacter(game, "sturdy_key", game.player.id);
      giveItemToCharacter(game, "brass_lantern", game.player.id);
      giveItemToCharacter(game, "majestic_sword", game.player.id);
      giveItemToCharacter(game, "sturdy_rope", game.player.id);
      game.checkSpecialSituations();
    },
    drive(game) {
      const issued = [];
      for (let step = 0; step < 4 && game.flags.goblintunnelambushactive && !game.endgame; step += 1) {
        const command = game.nextAutoplayCommand();
        if (!command) throw new Error(`Expected autoplay command during goblin ambush at step ${step}.`);
        issued.push(command);
        game.execute(command);
      }
      if (game.flags.goblintunnelambushactive) {
        throw new Error(`Autoplay failed to resolve goblin ambush. Commands: ${issued.join(" | ")}`);
      }
      game.execute("look");
      game.print(`Autoplay goblin ambush path: ${issued.join(" -> ")}`);
    },
    expectedIncluded: [
      "The body of the hulking goblin lies here.",
      "Autoplay goblin ambush path: light lantern -> kill hulking goblin with sword -> ask gandalf to attack hulking goblin",
    ],
  },
  {
    name: "dead warg examination and attack text use coherent singular grammar",
    setup(game) {
      movePlayerTo(game, "treeless_opening");
      addHostileTestCharacter(game, "test_warg", { name: "vicious warg", strength: 6 });
      game.characters.test_warg.visible = false;
      game.characters.test_warg.friendly = false;
    },
    drive(game) {
      game.examineCharacter(game.characters.test_warg);
      game.print(game.attackCharacter(game.player, game.characters.test_warg));
    },
    expectedIncluded: [
      "You examine the vicious warg. It is carrying nothing. It is wearing nothing. The vicious warg looks dangerous.",
      "You try to attack vicious warg, but vicious warg is already dead.",
    ],
    notExpectedIncluded: [
      "He is carrying nothing.",
      "They look dangerous.",
      "You tries to attack",
    ],
  },
  {
    name: "gollum riddle path grants escape with ring",
    setup(game) {
      game.currentRoom = "dark_stuffy_passage_13";
      game.player.position = "dark_stuffy_passage_13";
    },
    drive(game) {
      game.execute("south");
      game.execute("ask gollum a riddle");
      const firstRiddle = game.currentGollumRiddle();
      game.execute(`answer ${firstRiddle.answers[0]}`);
      const secondRiddle = game.currentGollumRiddle();
      game.execute(`answer ${secondRiddle.answers[0]}`);
      game.execute("say to gollum \"what's in my pocket\"");
      game.execute("wear ring");
      game.execute("north");
      game.execute("wait");
      game.print(`Gollum escape autosave: ${game.autosaveMeta?.label || "none"}`);
      game.print(`Ring flag after Gollum: ${game.flags.bilbo_has_ring ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Groping beside the water in the dark, your fingers close around a small cold ring. Almost without thinking, you slip it into your pocket.",
      "Gollum narrows his pale eyes. 'Baggins has answered. Now Baggins asks, yes. Ask it, precious, ask it.'",
      /You (?:wear the golden ring and become unnoticeable\.|slip the golden ring on and fade from notice\.|draw the golden ring onto your finger and pass from sight\.)/,
      /(?:Invisible under the ring, you slip past Gollum as he claws wildly about for his precious\.|Hidden by the ring, you edge past Gollum while he gropes and hisses for his precious\.|Unseen beneath the ring, you steal by Gollum while his hands scrabble desperately in the dark\.)/,
      /(?:Close behind, Gollum's scream tears through the black passages|The dark carries Gollum's grief too well here|Somewhere in the deep ways Gollum gives a choking wail|A wet shriek races the walls behind you)/,
      "Gollum escape autosave: after escaping Gollum",
      "Ring flag after Gollum: yes",
    ],
  },
  {
    name: "dry cave crack route can be reopened under goblin pressure",
    setup(game) {
      game.execute("jump beorn");
      game.currentRoom = "dark_stuffy_passage_5";
      game.player.position = "dark_stuffy_passage_5";
      game.characters.gollum.visible = false;
      giveItemToCharacter(game, "majestic_sword", game.player.id);
      Object.values(game.characters).forEach((character) => {
        if (character.id !== game.player.id && character.friendly === false) {
          character.visible = false;
          character.position = "deep_dark_lake";
          character.attackFlag = 0;
        }
      });
    },
    drive(game) {
      game.checkSpecialSituations();
      game.execute("listen");
      game.execute("search wall");
      game.execute("use sword on crack");
      game.execute("push stone");
      game.execute("squeeze through crack");
      game.print(`Dry cave escape room: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "The passage ends in blank stone where the crack ought to be.",
      "The goblin voices behind rise a little, no longer lost in the deep ways but wandering this way. There cannot be much time.",
      "And now beneath the voices comes another sound: the clink of gear and the quick patter of goblin feet drawing nearer.",
      "At once the tunnel behind breaks into sharp cries. They have heard something.",
      "From the passage behind a red flicker jumps upon the wall. Goblin light is coming.",
      "You turn sideways and slip through the narrow opening just as harsh voices break out close behind you.",
      "Dry cave escape room: large_dry_cave",
    ],
  },
  {
    name: "dawdling beneath dry cave lets the goblins catch bilbo",
    setup(game) {
      game.execute("jump beorn");
      game.currentRoom = "dark_stuffy_passage_5";
      game.player.position = "dark_stuffy_passage_5";
      game.characters.gollum.visible = false;
      giveItemToCharacter(game, "majestic_sword", game.player.id);
      Object.values(game.characters).forEach((character) => {
        if (character.id !== game.player.id && character.friendly === false) {
          character.visible = false;
          character.position = "deep_dark_lake";
          character.attackFlag = 0;
        }
      });
    },
    drive(game) {
      game.checkSpecialSituations();
      game.execute("listen");
      game.execute("search wall");
      game.execute("wait");
      game.execute("wait");
      game.print(`Dry cave goblin death: ${game.endgame ? "yes" : "no"}`);
      game.print(`Dry cave death image: ${game.temporaryImage?.file || "none"}`);
    },
    expectedIncluded: [
      "Too late.",
      "The goblins seize you in the dark before you can escape the tunnels.",
      "Dry cave goblin death: yes",
      "Dry cave death image: bilbo_goblins_around_him_death.png",
    ],
  },
  {
    name: "gollum stays anchored at deep dark lake during autonomous movement",
    setup(game) {
      game.currentRoom = "deep_dark_lake";
      game.player.position = "deep_dark_lake";
      game.checkSpecialSituations();
    },
    drive(game) {
      const startingRoom = game.characters.gollum?.position || "none";
      game.decideCharacterMovement(game.characters.gollum, { forceMove: true });
      game.print(`Gollum anchored: ${game.characters.gollum?.position === startingRoom ? "yes" : "no"}`);
      game.print(`Gollum room after forced move: ${game.characters.gollum?.position || "none"}`);
    },
    expectedIncluded: [
      "Gollum anchored: yes",
      "Gollum room after forced move: deep_dark_lake",
    ],
  },
  {
    name: "deep dark lake atmosphere does not imply gollum when he is elsewhere",
    setup(game) {
      game.currentRoom = "deep_dark_lake";
      game.player.position = "deep_dark_lake";
      game.gollumState = game.createGollumState();
      game.gollumState.met = true;
      game.characters.gollum.position = "dark_stuffy_passage_13";
      game.characters.gollum.visible = true;
    },
    drive(game) {
      let triggered = false;
      let line = "";
      for (let seed = 1; seed <= 400 && !triggered; seed += 1) {
        game.storySeed = seed;
        game.turnCount = 0;
        triggered = game.maybeAtmosphericEvent();
        if (triggered) line = outputLines.at(-1) || "";
      }
      game.print(`Lake atmosphere triggered without Gollum: ${triggered ? "yes" : "no"}`);
      game.print(`Gollum absent atmosphere line: ${line || "none"}`);
    },
    expectedIncluded: [
      "Lake atmosphere triggered without Gollum: yes",
      /Gollum absent atmosphere line: (?:A drip falls somewhere beyond sight, then another, and the dark seems to listen to the sound of its own water\.|Cold water laps once against the stones and then settles back into a silence too deep to trust\.|The cave answers itself in little echoes of dripping water, but nothing living shows upon the lake\.)/,
    ],
    notExpectedIncluded: [
      /Something paddles once upon the black lake and then is still again\./,
      /A faint wet muttering reaches you from the darkness and dies before the words can be made out\./,
      /Gollum crouches low in his little boat, paddling a slow circle just beyond the edge of sight as though measuring the dark between you\./,
    ],
  },
  {
    name: "gollum pursuit echoes change near the goblin gate and stop outside the tunnels",
    setup(game) {
      game.currentRoom = "outside_goblins_gate";
      game.player.position = "outside_goblins_gate";
      game.gollumState = game.encounters.createGollumState();
      game.gollumState.pocketQuestionAsked = true;
      game.gollumState.escaped = true;
      game.gollumState.pursuitEchoCooldown = 0;
    },
    drive(game) {
      const thresholdTriggered = game.advanceGollumPursuitEcho();
      game.print(`Threshold echo: ${thresholdTriggered ? "yes" : "no"}`);
      game.currentRoom = "narrow_dangerous_path";
      game.player.position = "narrow_dangerous_path";
      game.gollumState.pursuitEchoCooldown = 0;
      const outsideTriggered = game.advanceGollumPursuitEcho();
      game.print(`Outside echo: ${outsideTriggered ? "yes" : "no"}`);
    },
    expectedIncluded: [
      /(?:From the black behind the gate comes one last shriek of 'my precious,'|Even near the mouth of the tunnels, Gollum's voice finds you:|The mountain throws back a last torn cry from Gollum,|Behind the goblin gate his lament rises once more,)/,
      "Threshold echo: yes",
      "Outside echo: no",
    ],
  },
  {
    name: "gollum pursuit echoes reflect ring obsession and bilbo exhaustion",
    setup(game) {
      game.currentRoom = "dark_stuffy_passage_12";
      game.player.position = "dark_stuffy_passage_12";
      game.gollumState = game.encounters.createGollumState();
      game.gollumState.pocketQuestionAsked = true;
      game.gollumState.escaped = true;
      game.gollumState.pursuitEchoCooldown = 0;
      game.player.wearingRing = true;
      game.player.noticeable = false;
      game.player.strength = 4;
    },
    drive(game) {
      const triggered = game.advanceGollumPursuitEcho();
      game.print(`Stateful echo: ${triggered ? "yes" : "no"}`);
    },
    expectedIncluded: [
      /(?:Close behind, Gollum's scream tears through the black passages|The dark carries Gollum's grief too well here|Somewhere in the deep ways Gollum gives a choking wail|A wet shriek races the walls behind you)/,
      /(?:Invisible or no, each cry seems to find the very finger where the ring rests|There is something worse in the way he calls for his precious now|Whenever he screams for his precious, it seems aimed not at the tunnels generally)/,
      /(?:Your own breath comes back harsh and uneven|You are breathing too hard to feel truly hidden|Weariness is in your legs and throat alike now)/,
      "Stateful echo: yes",
    ],
  },
  {
    name: "calling for companions at the lake reveals bilbos isolation",
    setup(game) {
      game.currentRoom = "deep_dark_lake";
      game.player.position = "deep_dark_lake";
      game.checkSpecialSituations();
    },
    drive(game) {
      game.execute("ask gandalf for help");
      game.execute("talk to thorin");
    },
    expectedIncluded: [
      /(cut you off from the company|out of earshot|No companion hears you)/,
    ],
  },
  {
    name: "gollum accepts bare riddle answers without answer verb",
    setup(game) {
      game.currentRoom = "deep_dark_lake";
      game.player.position = "deep_dark_lake";
      game.checkSpecialSituations();
      game.gollumState.riddleIds = [2, 3];
      game.gollumState.currentRiddleIndex = 0;
    },
    inputs: [
      "ask gollum a riddle",
      "teeth",
      "egg",
    ],
    expectedIncluded: [
      "Gollum nods reluctantly. 'Right, precious. Right.' Gollum croons 'A box without hinges, key, or lid, yet golden treasure inside is hid. What is it, eh?'",
      "Gollum narrows his pale eyes. 'Baggins has answered. Now Baggins asks, yes. Ask it, precious, ask it.'",
    ],
    notExpectedIncluded: [
      "Please specify your action and the object.",
      "I'm not sure how to do that.",
    ],
  },
  {
    name: "wearing the ring does not let bilbo slip past before the pocket question",
    setup(game) {
      game.currentRoom = "deep_dark_lake";
      game.player.position = "deep_dark_lake";
      game.checkSpecialSituations();
    },
    drive(game) {
      game.execute("ask gollum a riddle");
      const firstRiddle = game.currentGollumRiddle();
      game.execute(`answer ${firstRiddle.answers[0]}`);
      const secondRiddle = game.currentGollumRiddle();
      game.execute(`answer ${secondRiddle.answers[0]}`);
      game.execute("wear ring");
      game.execute("north");
      game.print(`Blocked escape room: ${game.currentRoom}`);
    },
    expectedIncluded: [
      /(?:blocking the northern passage|bars the northern passage|crouches there before you can pass)/,
      /(?:Best ask something only Baggins can answer|Not all riddles are for the wide world|Ask your own riddle, Baggins|What does Baggins keep from us, then)/,
      "Blocked escape room: deep_dark_lake",
    ],
  },
  {
    name: "wearing ring does not trigger puzzled companion reactions",
    setup(game) {
      game.currentRoom = "dark_stuffy_passage_13";
      game.player.position = "dark_stuffy_passage_13";
      placeCharacterWithPlayer(game, "gandalf");
      placeCharacterWithPlayer(game, "thorin");
      placeCharacterWithPlayer(game, "unexpected_party_gloin");
      placeCharacterWithPlayer(game, "unexpected_party_bifur");
      giveItemToCharacter(game, "golden_ring", game.player.id);
    },
    inputs: ["wear ring"],
    expectedIncluded: [
      /You (?:wear the golden ring and become unnoticeable\.|slip the golden ring on and fade from notice\.|draw the golden ring onto your finger and pass from sight\.)/,
    ],
    notExpectedIncluded: [
      "Gandalf looks around, puzzled, unable to see who is there.",
      "Thorin looks around, puzzled, unable to see who is there.",
      "Gloin looks around, puzzled, unable to see who is there.",
      "Bifur looks around, puzzled, unable to see who is there.",
    ],
  },
  {
    name: "wood elf warning stays non-capturing in the clearing and uses guarded talk",
    setup(game) {
      movePlayerTo(game, "elvish_clearing");
      game.debugSetCharacterRoom("wood_elf", "elvish_clearing", { visible: true, movementMode: "never" });
      giveItemToCharacter(game, "golden_ring", game.player.id);
      game.flags.initiative_wood_elf_warning = false;
    },
    drive(game) {
      game.execute("wear ring");
      game.checkSpecialSituations();
      game.execute("remove ring");
      game.checkSpecialSituations();
      game.execute("talk to elf");
      game.print(`Wood elf clearing room: ${game.currentRoom}`);
    },
    expectedIncluded: [
      /You (?:wear the golden ring and become unnoticeable\.|slip the golden ring on and fade from notice\.|draw the golden ring onto your finger and pass from sight\.)/,
      "The wood elf looks around, puzzled, unable to see who is there.",
      "The wood elf cannot see you because you are wearing the ring.",
      /You (?:remove the golden ring and become noticeable again\.|slip the golden ring off and return to sight\.|tug the golden ring free and become visible once more\.)/,
      "The wood elf watches you closely and says 'This wood listens more kindly to honest footsteps than to hurried tongues.'",
      "The wood elf says 'Speak plainly, then. The trees have long ears, and I have little love for riddling strangers.'",
      "Wood elf clearing room: elvish_clearing",
    ],
    notExpectedIncluded: [
      "The wood elf captures you.",
      "The wood elf listens intently, expecting your words.",
    ],
  },
  {
    name: "wood elf ask responses stay specific instead of generic",
    setup(game) {
      movePlayerTo(game, "elvish_clearing");
      game.debugSetCharacterRoom("wood_elf", "elvish_clearing", { visible: true, movementMode: "never" });
      game.flags.initiative_wood_elf_warning = true;
    },
    inputs: [
      "ask elf about road",
      "ask elf about king",
      "ask elf about moon",
    ],
    expectedIncluded: [
      "The wood elf says 'Few roads stay true in this wood for those who do not belong to it.'",
      "The wood elf says 'Ask less of halls that are not yours, and you may keep out of their darker corners.'",
      "The wood elf says 'If you have business, speak it quickly. This is not a place for idle questions.'",
    ],
    notExpectedIncluded: [
      "The wood elf considers treasure, but gives no clear answer.",
    ],
  },
  {
    name: "wood elf capture escalates inside the elven halls",
    setup(game) {
      movePlayerTo(game, "elvenkings_halls");
      game.debugSetCharacterRoom("wood_elf", "elvenkings_halls", { visible: true, movementMode: "never" });
      game.flags.initiative_wood_elf_warning = true;
    },
    drive(game) {
      game.checkSpecialSituations();
      game.print(`Wood elf capture room: ${game.currentRoom}`);
      game.print(`Wood elf after capture: ${game.characters.wood_elf.position}`);
    },
    expectedIncluded: [
      "The wood elf's patience hardens. 'You have come far enough,' he says.",
      "You are led at last before the Elvenking, who questions you coolly about your name, your companions, and what business has brought such travelers through his wood.",
      "Bilbo keeps his own counsel.",
      "The wood elf captures you.",
      "Wood elf capture room: dark_dungeon",
      "Wood elf after capture: elven_guard_post",
    ],
    notExpectedIncluded: [
      "Wood elf after capture: beorns_house",
    ],
  },
  {
    name: "wood elf in the dungeon recalls the kings questioning",
    setup(game) {
      movePlayerTo(game, "dark_dungeon");
      game.flags.elvenking_prisoner_seen = true;
      game.debugSetCharacterRoom("wood_elf", "dark_dungeon", { visible: true, movementMode: "never" });
    },
    inputs: [
      "talk to elf",
      "ask elf about king",
      "ask elf about prison",
    ],
    expectedIncluded: [
      "The wood elf says 'The king asked for truth and got silence. Be grateful it was only darkness you earned by it.'",
      "The wood elf says 'The king asked you for honest answers and offered fair hearing for them. Since you kept your counsel, you may now keep the dungeon besides.'",
      "The wood elf says 'Your friends and your secrets have brought you no further than a locked door. If you mean to keep both, learn patience.'",
    ],
  },
  {
    name: "captured cellar bilbo can still wait for the red door to open",
    setup(game) {
      movePlayerTo(game, "cellar");
      game.flags.cellar_feast_scene_seen = true;
      game.flags.mirkwooddwarvesfreed = true;
      game.flags.cellar_butler_window_open = false;
      game.flags.cellar_butler_next_window_turn = 2;
      game.debugSetCharacterRoom("butler", "cellar", { visible: true, movementMode: "never" });
    },
    drive(game) {
      const originalRandom = Math.random;
      try {
        game.execute("open trap door");
        Math.random = () => 0.1;
        game.execute("wait");
      } finally {
        Math.random = originalRandom;
      }
      game.print(`Captured cellar red door open: ${game.doors.porta_dark_dungeon_cellar?.open ? "yes" : "no"}`);
      game.print(`Captured cellar room after wait: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "You are hustled back into the Elvenking's prison and shut up once more behind the red door.",
      "Someone opens the red door.",
      "Captured cellar red door open: yes",
      "Captured cellar room after wait: dark_dungeon",
    ],
  },
  {
    name: "elves chapter now keeps the dwarves visibly dispersed through the prison rooms before rescue",
    setup(game) {
      movePlayerTo(game, "dark_dungeon");
      game.flags.elvenking_prisoner_seen = true;
    },
    drive(game) {
      game.companionDirector.sync();
      const ambientIds = game.unexpectedParty.roster.map((entry) => entry.id);
      const prisonCount = ambientIds.filter((id) => ["dark_dungeon", "elven_prison_cells"].includes(game.characters[id]?.position)).length;
      game.print(`Prison dwarves placed: ${prisonCount}`);
      game.print(`Thorin prison room: ${game.characters.thorin?.position || "none"}`);
      game.print(`Prison cells desc: ${game.contextualRoomDescription(game.rooms.elven_prison_cells)}`);
    },
    expectedIncluded: [
      "Prison dwarves placed: 12",
      "Thorin prison room: elven_prison_cells",
      "Prison cells desc: You are among the prison cells beneath the Elvenking's halls, where stout timbers, lantern-light, and the smell of river-damp make captivity feel orderly rather than merciful.",
    ],
  },
  {
    name: "cellar arrival frames the feast-heavy barrel escape opportunity",
    setup(game) {
      movePlayerTo(game, "cellar");
    },
    drive(game) {
      game.checkSpecialSituations();
      game.print(`Cellar feast scene seen: ${game.flags.cellar_feast_scene_seen ? "yes" : "no"}`);
      game.print(`Cellar contextual desc: ${game.contextualRoomDescription(game.rooms.cellar)}`);
    },
    expectedIncluded: [
      "The king's feasting has told on the place below.",
      "Empty barrels stand ready by the running water, and the butler's vigilance has plainly been dulled by duty, fatigue, and a cup or two beyond strict necessity.",
      "Cellar feast scene seen: yes",
      "Cellar contextual desc: You are in the Elvenking's cellar, where great casks, damp stone, and the black rushing of the underground water gather under the halls.",
    ],
  },
  {
    name: "freed dwarves regroup in the cellar before the barrel escape",
    setup(game) {
      movePlayerTo(game, "cellar");
      game.flags.mirkwooddwarvesfreed = true;
      game.flags.barrel_company_prepared = true;
    },
    drive(game) {
      game.companionDirector.sync();
      const ambientIds = game.unexpectedParty.roster.map((entry) => entry.id);
      const cellarCount = ambientIds.filter((id) => game.characters[id]?.position === "cellar").length;
      game.print(`Cellar dwarves regrouped: ${cellarCount}`);
      game.print(`Thorin regroup room: ${game.characters.thorin?.position || "none"}`);
      game.print(`Regrouped cellar desc: ${game.contextualRoomDescription(game.rooms.cellar)}`);
    },
    expectedIncluded: [
      "Cellar dwarves regrouped: 12",
      "Thorin regroup room: cellar",
      "Regrouped cellar desc: You are in the Elvenking's cellar, where great casks, damp stone, and the black rushing of the underground water gather under the halls. The dwarves are stowed away in barrels at last",
    ],
  },
  {
    name: "bard in wooden town acknowledges the barrel-soaked arrival",
    setup(game) {
      movePlayerTo(game, "wooden_town");
      game.flags.laketown_barrel_arrival_seen = true;
      game.debugSetCharacterRoom("bard", "wooden_town", { visible: true, movementMode: "never" });
    },
    inputs: [
      "talk to bard",
      "ask bard about town",
      "ask bard about dwarves",
    ],
    expectedIncluded: [
      "Bard says 'You look as though the river has tried hard to keep you. Best get warm if you can, then tell what has driven dwarves and strangers out of the wood and down to our lake.'",
      "Bard says 'Lake-town takes strangers in when there is cause, but it asks questions while it does so. A town on the water learns thrift, memory, and caution all together.'",
      "Bard says 'Dwarves coming secretly out of the wood and over the water are not an ordinary matter. If the Mountain is stirring again, the town will feel it soon enough.'",
    ],
  },
  {
    name: "butler keeps a coherent guarded voice on talk and ask",
    setup(game) {
      movePlayerTo(game, "cellar");
      game.debugSetCharacterRoom("butler", "cellar", { visible: true, movementMode: "never" });
    },
    inputs: [
      "talk to butler",
      "ask butler about barrels",
      "ask butler about key",
      "ask butler about moon",
    ],
    expectedIncluded: [
      "The butler says 'If you must speak, be brief. Wine, keys, and quiet order all have their proper places here.'",
      "The butler says 'The barrels go where they are meant to go, and not one inch nearer mischief than duty requires.'",
      "The butler says 'Keys are trusted to steady hands. Doors are happier when they are used for their intended business.'",
      "The butler says 'I have no leisure for gossip. Ask, if you must, about something that belongs in a cellar.'",
    ],
    notExpectedIncluded: [
      "The butler glares at you, unimpressed.",
      "The butler considers moon, but gives no clear answer.",
    ],
  },
  {
    name: "butler in the cellar acknowledges feast, wine, and the barrel traffic",
    setup(game) {
      movePlayerTo(game, "cellar");
      game.flags.cellar_feast_scene_seen = true;
      game.debugSetCharacterRoom("butler", "cellar", { visible: true, movementMode: "never" });
    },
    inputs: [
      "talk to butler",
      "ask butler about wine",
      "ask butler about barrels",
    ],
    expectedIncluded: [
      "The butler steadies himself against a cask and says 'If you must speak, do it quietly. The wine has gone where it belongs, the feast is above us, and the barrels will be gone in due order when the stream is ready for them.'",
      "The butler blinks and says 'There is feasting in the king's house tonight, and the wine has been honored as wine should be. That is no business of yours, except not to get underfoot while honest servants finish theirs.'",
      "The butler says 'The barrels go downriver when they are emptied and marked for it. Tonight there are enough of them to keep a sober servant busy and a tired one from becoming any soberer.'",
    ],
  },
  {
    name: "jump action does not leak checkpoint error text into ordinary jumps",
    setup(game) {
      movePlayerTo(game, "front_gate");
    },
    inputs: ["jump onto barrel"],
    expectedIncluded: [
      "You jump onto barrel, but nothing happens.",
    ],
    notExpectedIncluded: [
      'Unknown jump target "onto barrel". Type "jumps" to see the available checkpoints.',
    ],
  },
  {
    name: "delegated jump does not leak checkpoint text",
    setup(game) {
      movePlayerTo(game, "green_dragon_inn");
      game.debugSetCharacterRoom("thorin", "green_dragon_inn", { visible: true, movementMode: "never" });
    },
    inputs: ["ask thorin to jump"],
    expectedIncluded: [
      "Thorin jumps, but nothing happens.",
    ],
    notExpectedIncluded: [
      'Jump checkpoints: type "jump <name>".',
      'Unknown jump target',
    ],
  },
  {
    name: "bard gets contextual front gate talk and ask responses",
    setup(game) {
      movePlayerTo(game, "front_gate");
      game.debugSetCharacterRoom("bard", "front_gate", { visible: true, movementMode: "never" });
    },
    inputs: [
      "talk to bard",
      "ask bard about dragon",
      "ask bard about arrow",
      "ask bard about town",
    ],
    expectedIncluded: [
      "Bard says 'A bowman does not waste words when the air already feels like the breath before a storm. When the moment comes, the shot must be true.'",
      "Bard says 'A dragon is not beaten by noise or bravery alone. When he comes within reach, one true opening must be enough.'",
      "Bard lays a hand on the black arrow and says 'A bowman lives by the shot he has not yet wasted. This one is kept for necessity, not display.'",
      "Bard says 'Lake-town has endured much from the Mountain already. Whatever happens here must answer not only to old claims, but to living folk as well.'",
    ],
    notExpectedIncluded: [
      "Bard listens intently, expecting your words.",
      "Bard considers dragon, but gives no clear answer.",
      "Bard considers arrow, but gives no clear answer.",
      "Bard considers town, but gives no clear answer.",
    ],
  },
  {
    name: "thorin gets contextual erebor threshold talk and ask responses",
    setup(game) {
      movePlayerTo(game, "front_gate");
      game.debugSetCharacterRoom("thorin", "front_gate", { visible: true, movementMode: "never" });
    },
    inputs: [
      "talk to thorin",
      "ask thorin about treasure",
      "ask thorin about dragon",
    ],
    expectedIncluded: [
      "Thorin says 'Every stone here remembers what was taken from us. Speak quickly, Master Baggins. I will not linger forever outside my father's halls.'",
      "Thorin says 'The treasure is not mere glitter to us. It is the memory of a kingdom, and the proof that Erebor may yet be ours again.'",
      "Thorin says 'Smaug is the shadow over every stone here. Yet even dragons may be brought to account in the end.'",
    ],
    notExpectedIncluded: [
      "Thorin listens intently, expecting your words.",
      "Thorin considers treasure, but gives no clear answer.",
      "Thorin considers dragon, but gives no clear answer.",
    ],
  },
  {
    name: "gandalf in rivendell answers about the map after elronds reading",
    setup(game) {
      movePlayerTo(game, "rivendell");
      game.debugSetCharacterRoom("gandalf", "rivendell", { visible: true, movementMode: "never" });
      game.flags.mapread = true;
      game.flags.rivendell_preparations_complete = true;
    },
    inputs: [
      "talk to gandalf",
      "ask gandalf about map",
      "ask gandalf about journey",
    ],
    expectedIncluded: [
      "Gandalf says 'Elrond has read what needed reading. The task now is not to admire wisdom, but to remember it when the road grows hard again.'",
      "Gandalf says 'The map has yielded what it would yield. Better now to remember Elrond's reading than to hope the parchment will grow plainer by staring at it.'",
      "Gandalf says 'The way east is plain enough in broad strokes. The difficulty, as ever, lies in walking it.'",
    ],
    notExpectedIncluded: [
      "Gandalf listens intently, expecting your words.",
      "Gandalf considers map, but gives no clear answer.",
    ],
  },
  {
    name: "beorn road is storm-blocked before ring",
    setup(game) {
      game.currentRoom = "narrow_place";
      game.player.position = "narrow_place";
      game.flags.bilbo_has_ring = false;
    },
    drive(game) {
      game.execute("go east");
      game.print(`Storm room: ${game.currentRoom}`);
    },
    expectedIncluded: [
      /(wind|weather|path|rocks|mountain|sleet|cloud)/i,
      /(Thorin|Balin|Dwalin|Gandalf|Bombur|Fili|Kili|Bifur) says/,
      "Storm room: narrow_place",
    ],
  },
  {
    name: "storm varies across repeated natural mountain pushes",
    setup(game) {
      game.currentRoom = "narrow_place";
      game.player.position = "narrow_place";
      game.flags.bilbo_has_ring = false;
    },
    drive(game) {
      const beforeFirst = outputLines.length;
      game.execute("press on");
      const first = outputLines.slice(beforeFirst).at(-1) || "";
      const beforeSecond = outputLines.length;
      game.execute("ignore storm");
      const second = outputLines.slice(beforeSecond).at(-1) || "";
      game.print(`Storm lines differ: ${first !== second ? "yes" : "no"}`);
      game.print(`Storm room after retry: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "Storm lines differ: yes",
      "Storm room after retry: narrow_place",
    ],
  },
  {
    name: "beorn road opens once bilbo has the ring",
    setup(game) {
      game.currentRoom = "great_river";
      game.player.position = "great_river";
      game.flags.bilbo_has_ring = true;
    },
    drive(game) {
      game.execute("lead ponies forward");
      game.print(`Beorn arrival autosave: ${game.autosaveMeta?.label || "none"}`);
      game.print(`Arrival room: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "Beorn arrival autosave: after reaching Beorn's house",
      "Arrival room: beorns_house",
      "The weather does not wholly clear, but the worst of its fury passes as you come down at last toward Beorn's lands, leaving only torn cloud and a bitter wind behind you on the heights.",
    ],
  },
  {
    name: "storm never returns after mountain arrival at beorn",
    setup(game) {
      game.currentRoom = "great_river";
      game.player.position = "great_river";
      game.flags.bilbo_has_ring = false;
      game.flags.beorn_mountain_arrival_complete = true;
    },
    drive(game) {
      game.execute("go south");
      game.print(`Post-arrival room: ${game.currentRoom}`);
    },
    expectedIncluded: ["Post-arrival room: beorns_house"],
    notExpectedIncluded: [/(Thorin|Balin|Dwalin|Gandalf|Bombur|Fili|Kili|Bifur) says/],
  },
  {
    name: "gollum does not attack gandalf while player is invisible",
    setup(game) {
      game.currentRoom = "deep_dark_lake";
      game.player.position = "deep_dark_lake";
      placeCharacterWithPlayer(game, "gandalf");
      game.checkSpecialSituations();
      game.gollumState.pocketQuestionAsked = true;
      game.gollumState.enraged = true;
      game.player.noticeable = false;
      game.player.wearingRing = true;
      game.characters.gollum.attackFlag = 2;
    },
    inputs: ["wait"],
    expectedIncluded: [],
    notExpectedIncluded: ["Gollum attacks Gandalf."],
  },
  {
    name: "gollum first wrong answer becomes an explicit final warning",
    setup(game) {
      game.currentRoom = "deep_dark_lake";
      game.player.position = "deep_dark_lake";
      game.checkSpecialSituations();
    },
    drive(game) {
      game.execute("ask gollum a riddle");
      game.execute("answer toaster");
      game.print(`Gollum warning endgame: ${game.endgame ? "yes" : "no"}`);
    },
    expectedIncluded: [
      /(?:Wrong once, Baggins\. Wrong once only\.|One more false answer, and the game is over for Baggins\.|No more mistakes now\.)/,
      "Gollum warning endgame: no",
    ],
  },
  {
    name: "ring expiring during gollums questioning kills bilbo",
    setup(game) {
      game.currentRoom = "deep_dark_lake";
      game.player.position = "deep_dark_lake";
      game.checkSpecialSituations();
    },
    drive(game) {
      game.execute("ask gollum a riddle");
      const firstRiddle = game.currentGollumRiddle();
      game.execute(`answer ${firstRiddle.answers[0]}`);
      const secondRiddle = game.currentGollumRiddle();
      game.execute(`answer ${secondRiddle.answers[0]}`);
      game.execute("wear ring");
      game.player.ringTimer = 1;
      game.execute("wait");
      game.print(`Ring expiry endgame: ${game.endgame ? "yes" : "no"}`);
      game.print(`Ring expiry death image: ${game.temporaryImage?.file || "none"}`);
    },
    expectedIncluded: [
      /The golden ring .*pocket\./,
      /Gollum .*?(triumph|dark|struggle|finger)/,
      "Ring expiry endgame: yes",
      "Ring expiry death image: gollum_ring_effect_ends_death.png",
    ],
  },
  {
    name: "gollum second wrong answer still kills through varied attack text",
    setup(game) {
      game.currentRoom = "deep_dark_lake";
      game.player.position = "deep_dark_lake";
      game.checkSpecialSituations();
    },
    drive(game) {
      game.execute("ask gollum a riddle");
      game.execute("answer toaster");
      game.execute("answer toaster");
      game.print(`Gollum death endgame: ${game.endgame ? "yes" : "no"}`);
    },
    expectedIncluded: [
      /Gollum .*?(dark|water|lake|stones)/,
      "Gollum death endgame: yes",
    ],
  },
  {
    name: "fatal gollum death offers autosave choice",
    setup(game) {
      game.currentRoom = "dark_stuffy_passage_13";
      game.player.position = "dark_stuffy_passage_13";
    },
    drive(game) {
      game.execute("south");
      game.execute("ask gollum a riddle");
      game.execute("answer toaster");
      game.execute("answer toaster");
      game.print(`Death choice: ${game.pendingEndgameChoice || "none"}`);
      game.print(`Autosave room: ${game.autosaveMeta?.roomId || "none"}`);
      game.print(`Gollum death image: ${game.temporaryImage?.file || "none"}`);
    },
    expectedIncluded: [
      /Gollum.*(Wrong|False|dark|water|stones)/,
      "Death choice: death",
      "Autosave room: deep_dark_lake",
      "Gollum death image: gollum_wrong_answer_to_riddle_death.png",
      "Type 'load' to open your safe moments in Deep Dark Lake, or 'restart' to begin the tale again.",
    ],
  },
  {
    name: "autosave command resumes from fatal checkpoint",
    setup(game) {
      game.currentRoom = "dark_stuffy_passage_13";
      game.player.position = "dark_stuffy_passage_13";
    },
    drive(game) {
      game.execute("south");
      game.execute("ask gollum a riddle");
      game.execute("answer toaster");
      game.execute("answer toaster");
      game.execute("autosave");
      game.print(`Resume room: ${game.currentRoom}`);
      game.print(`Resume endgame: ${game.endgame ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Game loaded.",
      "Resume room: deep_dark_lake",
      "Resume endgame: no",
    ],
  },
  {
    name: "load after troll death opens the safe moments panel",
    drive(game) {
      game.execute("jump trolls");
      game.execute("east");
      outputLines.length = 0;
      game.execute("take large key");
      game.execute("wait");
      game.execute("wait");
      game.execute("wait");
      game.execute("load");
      game.print(`Load panel: ${game.savePanelState?.open ? "open" : "closed"}`);
    },
    expectedIncluded: [
      "Load panel: open",
    ],
    notExpectedIncluded: [
      "Game loaded.",
    ],
  },
  {
    name: "restart command after death returns to the beginning",
    setup(game) {
      game.currentRoom = "dark_stuffy_passage_13";
      game.player.position = "dark_stuffy_passage_13";
    },
    drive(game) {
      game.execute("south");
      game.execute("ask gollum a riddle");
      game.execute("answer toaster");
      game.execute("restart");
      const hadPendingRestartConfirmation = Boolean(game.pendingRestartConfirmation);
      game.execute("yes");
      game.print(`Restart confirmation pending: ${hadPendingRestartConfirmation ? "yes" : "no"}`);
      game.print(`Restart room: ${game.currentRoom}`);
      game.print(`Restart endgame: ${game.endgame ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Restart confirmation pending: yes",
      "Restart room: hobbit_hole",
      "Restart endgame: no",
    ],
  },
  {
    name: "restart command can be cancelled during play",
    drive(game) {
      game.execute("south");
      game.execute("restart");
      game.print(`Restart cancellation pending: ${game.pendingRestartConfirmation ? "yes" : "no"}`);
      game.execute("no");
      game.print(`Restart cancelled room: ${game.currentRoom}`);
      game.print(`Restart cancelled endgame: ${game.endgame ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Restart cancellation pending: yes",
      "Restart cancelled.",
      "Restart cancelled room: bag_end_dining_room",
      "Restart cancelled endgame: no",
    ],
  },
  {
    name: "fatal river action creates an autosave on the west bank",
    setup(game) {
      game.currentRoom = "west_bank";
      game.player.position = "west_bank";
    },
    drive(game) {
      game.execute("jump into river");
      game.print(`River autosave room: ${game.autosaveMeta?.roomId || "none"}`);
      game.print(`River death choice: ${game.pendingEndgameChoice || "none"}`);
      game.print(`River death image: ${game.temporaryImage?.file || "none"}`);
    },
    expectedIncluded: [
      "River autosave room: west_bank",
      "River death choice: death",
      "River death image: bilbo_black_river_death.png",
      "Type 'load' to open your safe moments in West Bank, or 'restart' to begin the tale again.",
    ],
  },
  {
    name: "bare swim on the west bank uses the river special action instead of the standard fallback",
    setup(game) {
      game.currentRoom = "west_bank";
      game.player.position = "west_bank";
    },
    drive(game) {
      game.execute("swim");
      game.print(`Bare swim autosave room: ${game.autosaveMeta?.roomId || "none"}`);
      game.print(`Bare swim death choice: ${game.pendingEndgameChoice || "none"}`);
      game.print(`Bare swim death image: ${game.temporaryImage?.file || "none"}`);
    },
    expectedIncluded: [
      "You swim in the river.",
      "The river takes you at once, spinning you among the rocks before any hand can save you.",
      "Bare swim autosave room: west_bank",
      "Bare swim death choice: death",
      "Bare swim death image: bilbo_black_river_death.png",
    ],
    notExpectedIncluded: [
      "there is no safe water to swim here",
    ],
  },
  {
    name: "fatal river action keeps scripted narration inline",
    setup(game) {
      game.currentRoom = "west_bank";
      game.player.position = "west_bank";
    },
    drive(game) {
      game.execute("jump into river");
    },
    expectedIncluded: [
      "You jump into the river.",
      "The river takes you at once, spinning you among the rocks before any hand can save you.",
      /So ends this thread of the tale\. You have mastered \d+\.\d+% of this adventure\./,
      "Type 'load' to open your safe moments in West Bank, or 'restart' to begin the tale again.",
    ],
    notExpectedIncluded: [
      "The tale goes no farther from here.",
    ],
  },
  {
    name: "spider eyes death shows the dedicated spider death image",
    setup(game) {
      game.currentRoom = "forest_road_2";
      game.player.position = "forest_road_2";
      game.spiderEyesState = {
        active: true,
        room: "forest_road_2",
        waits: 2,
        safeDirections: ["west"],
        safeDestination: null,
      };
    },
    drive(game) {
      game.execute("wait");
      game.print(`Spider death image: ${game.temporaryImage?.file || "none"}`);
    },
    expectedIncluded: [
      "Spider death image: spider_stings_death.png",
    ],
  },
  {
    name: "smaug fatal speech branch maps to the lower halls death image",
    drive(game) {
      game.print(`Smaug death image: ${game.specialActions.specialActionFatalImage({ desc2: "Smaug grows weary of your voice. With a sudden roar he floods the chamber with fire, and all your brave words are ashes in a breath." }) || "none"}`);
    },
    expectedIncluded: [
      "Smaug death image: smaug_incinirates_bilbo_lower_halls_death.png",
    ],
  },
  {
    name: "disgusting goblin fatal speech branch maps to the pit death image",
    drive(game) {
      game.print(`Goblin pit death image: ${game.resolveFatalEndgameImage("The disgusting goblin recoils from your presence, hurls you into a black pit, and leaves your cries to the dark.") || "none"}`);
    },
    expectedIncluded: [
      "Goblin pit death image: goblin_bilbo_pit_death.png",
    ],
  },
  {
    name: "fatal dark-tunnel hazard uses the exhausted tunnels death image",
    setup(game) {
      game.currentRoom = "dark_stuffy_passage_1";
      game.player.position = "dark_stuffy_passage_1";
      game.player.strength = 1;
    },
    drive(game) {
      for (let seed = 1; seed <= 64 && !game.endgame; seed += 1) {
        game.storySeed = seed;
        game.turnCount = 0;
        game.pendingEndgameChoice = null;
        game.endgame = false;
        game.temporaryImage = null;
        game.applyDarkMovementHazard("dark_stuffy_passage_1", "east", "dark_stuffy_passage_2");
      }
      game.print(`Dark hazard endgame: ${game.endgame ? "yes" : "no"}`);
      game.print(`Dark hazard image: ${game.temporaryImage?.file || "none"}`);
    },
    expectedIncluded: [
      "Dark hazard endgame: yes",
      "Dark hazard image: exhausted_tunnels_death.png",
    ],
  },
  {
    name: "autosave without a marked safe moment reports clearly",
    drive(game) {
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key && key.startsWith("hobbit-web-save:")) localStorage.removeItem(key);
      }
      game.endgame = true;
      game.pendingEndgameChoice = "death";
      game.autosaveSnapshot = null;
      game.autosaveMeta = null;
      game.execute("autosave");
    },
    expectedIncluded: [
      "No safe moment has been marked for your return.",
    ],
    notExpectedIncluded: [
      "There is no autosave available.",
    ],
  },
  {
    name: "safe moment history keeps every autosave until quota pressure",
    drive(game) {
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key && key.startsWith("hobbit-web-save:")) localStorage.removeItem(key);
      }
      game.storage.refreshLatestAutosaveState();
      for (let index = 1; index <= 14; index += 1) {
        game.turnCount = index;
        game.recordAutosave(`checkpoint ${index}`, {
          key: `test:safe-history:${index}`,
          force: true,
        });
      }
      const autosaves = game.storage.autosaveEntries();
      game.print(`Safe moment history count: ${autosaves.length}`);
      game.print(`Latest safe moment label: ${autosaves[0]?.label || "none"}`);
      game.print(`Oldest safe moment label: ${autosaves[autosaves.length - 1]?.label || "none"}`);
    },
    expectedIncluded: [
      "Safe moment history count: 14",
      "Latest safe moment label: checkpoint 14",
      "Oldest safe moment label: checkpoint 1",
    ],
  },
  {
    name: "dead gollum no longer blocks or narrates slip past",
    setup(game) {
      game.currentRoom = "deep_dark_lake";
      game.player.position = "deep_dark_lake";
      game.checkSpecialSituations();
      game.gollumState.pocketQuestionAsked = true;
      game.gollumState.enraged = true;
      game.player.noticeable = false;
      game.player.wearingRing = true;
      game.characters.gollum.visible = false;
    },
    inputs: ["north"],
    expectedIncluded: [],
    notExpectedIncluded: [
      /(?:Invisible under the ring, you slip past Gollum as he claws wildly about for his precious\.|Hidden by the ring, you edge past Gollum while he gropes and hisses for his precious\.|Unseen beneath the ring, you steal by Gollum while his hands scrabble desperately in the dark\.)/,
    ],
  },
  {
    name: "missing exit reports no visible exit rather than unrecognized direction",
    setup(game) {
      game.currentRoom = "hobbit_hole";
      game.player.position = "hobbit_hole";
    },
    inputs: ["north"],
    expectedIncluded: ["You see no exit in that direction."],
    notExpectedIncluded: ['That direction is not recognized. Type "go <direction>" or "go through <door name>".'],
  },
  {
    name: "bag end expansion rooms are reachable",
    drive(game) {
      game.execute("west");
      game.execute("location");
      game.currentRoom = "hobbit_hole";
      game.player.position = "hobbit_hole";
      game.execute("south");
      game.execute("east");
      game.execute("examine seed cakes");
    },
    expectedIncluded: [
      "You are now in the parlour.",
      "You see a plate of fragrant seed-cakes, cut small enough to vanish at a dwarf's convenience.",
    ],
  },
  {
    name: "unexpected party dwarves can be spoken to",
    setup(game) {
      game.unexpectedParty.state.arrived = ["unexpected_party_balin"];
      game.unexpectedParty.state.arrivalIndex = 1;
      game.unexpectedParty.state.currentArrival = null;
      game.unexpectedParty.reconcileCharacters();
      game.characters.unexpected_party_balin.position = "hobbit_hole";
    },
    inputs: ["talk balin"],
    expectedIncluded: ["Balin smiles and says 'A warm welcome counts for much on the road, Master Baggins.'"],
  },
  {
    name: "smaug answers with stateful dialogue",
    setup(game) {
      game.currentRoom = "lower_halls";
      game.player.position = "lower_halls";
      game.flags.smaugstate = "curious";
    },
    inputs: ["talk smaug"],
    expectedIncluded: ["Smaug says 'A courteous little voice in my halls? Come nearer, and let us see what sort of thief has learned manners.'"],
  },
  {
    name: "voice on enables system narration for story output",
    setup(game) {
      game.restartGame();
      window.speechSynthesis._spoken.length = 0;
    },
    drive(game) {
      game.execute("voice on");
      window.speechSynthesis._spoken.length = 0;
      game.execute("look");
      game.flushNarrationBuffer();
      game.print(`Narration speech used: ${window.speechSynthesis._spoken.length > 0 ? "yes" : "no"}`, "system");
    },
    expectedIncluded: ["Narration speech used: yes"],
  },
  {
    name: "voice narration ducks music while speaking and restores it afterward",
    setup(game) {
      game.restartGame();
      game.voiceEnabled = true;
      game.audio.volume = 0.75;
    },
    drive(game) {
      const originalSpeak = window.speechSynthesis.speak;
      let activeUtterance = null;
      window.speechSynthesis.speak = (utterance) => {
        activeUtterance = utterance;
        utterance?.onstart?.();
      };
      try {
        game.speakNarrationText("A test line for narration ducking.", { force: true, interrupt: true });
        game.print(`Music ducked: ${game.audio.volume < 0.75 ? "yes" : "no"}`, "system");
        activeUtterance?.onend?.();
        game.print(`Music restored: ${game.audio.volume === 0.75 ? "yes" : "no"}`, "system");
      } finally {
        window.speechSynthesis.speak = originalSpeak;
      }
    },
    expectedIncluded: ["Music ducked: yes", "Music restored: yes"],
  },
  {
    name: "voice narration also speaks during autoplay",
    setup(game) {
      game.restartGame();
      game.voiceEnabled = true;
      game.autoplayRunning = true;
      window.speechSynthesis._spoken.length = 0;
    },
    drive(game) {
      game.execute("look");
      game.flushNarrationBuffer();
      game.print(`Autoplay narration speech used: ${window.speechSynthesis._spoken.length > 0 ? "yes" : "no"}`, "system");
      game.autoplayRunning = false;
    },
    expectedIncluded: ["Autoplay narration speech used: yes"],
  },
  {
    name: "voice narration keeps consecutive lines queued while first line is still speaking",
    setup(game) {
      game.restartGame();
      game.voiceEnabled = true;
      window.speechSynthesis._spoken.length = 0;
    },
    drive(game) {
      const originalSpeak = window.speechSynthesis.speak;
      const originalSchedulePlayback = game.scheduleVoicePlayback;
      const pending = [];
      game.scheduleVoicePlayback = (delay = 0) => {
        if (game.voiceActive || !game.voiceQueue.length) return;
        if (delay > 0) game.voicePlaybackTimer = null;
        game.playNextVoiceChunk();
      };
      window.speechSynthesis.speak = (utterance) => {
        window.speechSynthesis._spoken.push({
          text: utterance?.text || "",
          voice: utterance?.voice?.name || "",
          lang: utterance?.lang || "",
          rate: utterance?.rate || 1,
        });
        pending.push(utterance);
        utterance?.onstart?.();
      };
      try {
        game.speakNarrationText("Gandalf listens intently, expecting your words.", { force: true, interrupt: true });
        game.speakNarrationText("A second knock comes at the round green door, gentler than the first yet somehow more assured.");
        game.speakNarrationText("From the kitchen comes the warm homely sound of cutlery, cupboard doors, and something sizzling in butter.");
        pending.shift()?.onend?.();
        pending.shift()?.onend?.();
        pending.shift()?.onend?.();
        game.print(`Queued narration lines spoken: ${window.speechSynthesis._spoken.length}`, "system");
      } finally {
        game.scheduleVoicePlayback = originalSchedulePlayback;
        window.speechSynthesis.speak = originalSpeak;
      }
    },
    expectedIncluded: ["Queued narration lines spoken: 3"],
  },
  {
    name: "voice narration continues across chunked paragraph and later queued beats",
    setup(game) {
      game.restartGame();
      game.voiceEnabled = true;
      window.speechSynthesis._spoken.length = 0;
    },
    drive(game) {
      const originalSpeak = window.speechSynthesis.speak;
      const originalSchedulePlayback = game.scheduleVoicePlayback;
      const pending = [];
      game.scheduleVoicePlayback = (delay = 0) => {
        if (game.voiceActive || !game.voiceQueue.length) return;
        if (delay > 0) game.voicePlaybackTimer = null;
        game.playNextVoiceChunk();
      };
      window.speechSynthesis.speak = (utterance) => {
        window.speechSynthesis._spoken.push({
          text: utterance?.text || "",
          voice: utterance?.voice?.name || "",
          lang: utterance?.lang || "",
          rate: utterance?.rate || 1,
        });
        pending.push(utterance);
        utterance?.onstart?.();
      };
      try {
        game.speakNarrationText("This snug parlour is arranged for conversation rather than grandeur: deep chairs, a hearth laid ready, and several low tables already burdened with plates, cups, and evidence of hobbit forethought. Balin has claimed a chair and half the available table-space.", { force: true, interrupt: true });
        game.speakNarrationText("Another pair arrives together: Fili and Kili stand at the round green door almost shoulder to shoulder.");
        game.speakNarrationText("From the kitchen comes the warm homely sound of cutlery, cupboard doors, and something sizzling in butter.");
        while (pending.length) pending.shift()?.onend?.();
        game.print(`Chunked narration spoken: ${window.speechSynthesis._spoken.length >= 3 ? "yes" : "no"}`, "system");
      } finally {
        game.scheduleVoicePlayback = originalSchedulePlayback;
        window.speechSynthesis.speak = originalSpeak;
      }
    },
    expectedIncluded: ["Chunked narration spoken: yes"],
  },
  {
    name: "voice on stays pending instead of falling back when only non-english voices exist",
    setup(game) {
      game.restartGame();
      window.speechSynthesis._spoken.length = 0;
      window.speechSynthesis._voices = [
        { name: "Solo Italiano", lang: "it-IT", default: true, voiceURI: "solo-it" },
      ];
      game.refreshNarrationVoices();
    },
    drive(game) {
      game.execute("voice on");
      game.print(`English voice pending: ${game.voiceEnabled && !game.selectedVoice ? "yes" : "no"}`, "system");
      window.speechSynthesis._voices = [
        { name: "Test English", lang: "en-GB", default: true, voiceURI: "test-en-gb" },
        { name: "Test Italian", lang: "it-IT", default: false, voiceURI: "test-it-it" },
      ];
      game.refreshNarrationVoices();
    },
    expectedIncluded: ["English voice pending: yes"],
  },
  {
    name: "voice does not fall back to browser default when only italian voice is exposed",
    setup(game) {
      game.restartGame();
      game.voiceEnabled = true;
      window.speechSynthesis._spoken.length = 0;
      window.speechSynthesis._voices = [
        { name: "Solo Italiano", lang: "it-IT", default: true, voiceURI: "solo-it" },
      ];
      game.refreshNarrationVoices();
    },
    drive(game) {
      game.execute("look");
      game.flushNarrationBuffer();
      game.print(`Narration blocked without english voice: ${window.speechSynthesis._spoken.length === 0 ? "yes" : "no"}`, "system");
      window.speechSynthesis._voices = [
        { name: "Test English", lang: "en-GB", default: true, voiceURI: "test-en-gb" },
        { name: "Test Italian", lang: "it-IT", default: false, voiceURI: "test-it-it" },
      ];
      game.refreshNarrationVoices();
    },
    expectedIncluded: ["Narration blocked without english voice: yes"],
  },
  {
    name: "restart game resets voice and music to off",
    setup(game) {
      game.restartGame();
      game.voiceEnabled = true;
      game.musicEnabled = true;
      game.currentTrack = "Midnight Tale relaxed.mp3";
      game.audio.src = "assets/local-music/Midnight%20Tale%20relaxed.mp3";
    },
    drive(game) {
      game.restartGame();
      game.print(`Voice reset on restart: ${game.voiceEnabled ? "no" : "yes"}`, "system");
      game.print(`Music reset on restart: ${game.musicEnabled || game.currentTrack || game.audio.src ? "no" : "yes"}`, "system");
    },
    expectedIncluded: ["Voice reset on restart: yes", "Music reset on restart: yes"],
  },
];

const BEGINNER_FORBIDDEN_OUTPUTS = [
  "Please specify your action and the object.",
  "Questions are not supported as commands yet.",
  "Use: ask [character] for [item], or ask [character] to [command].",
  "I'm not sure how to do that.",
  "I am not sure I understood",
  'That direction is not recognized. Type "go <direction>" or "go through <door name>".',
  "I don't know how to get there from here.",
];

function beginnerCommandCase(contextName, setup, spec, index) {
  const command = typeof spec === "string" ? spec : spec.command;
  return {
    name: `beginner ${String(index + 1).padStart(3, "0")} ${contextName}: ${command}`,
    setup,
    clearOutputAfterSetup: true,
    inputs: [command],
    expectedIncluded: (typeof spec === "object" && spec.expectedIncluded) || [/.+/],
    notExpectedIncluded: [
      ...BEGINNER_FORBIDDEN_OUTPUTS,
      ...((typeof spec === "object" && spec.notExpectedIncluded) || []),
    ],
  };
}

const beginnerContexts = [
  {
    name: "bag end hall",
    setup(game) {
      game.restartGame();
    },
    commands: [
      "help",
      "what should i do",
      "look around",
      "where am i",
      "where can i go",
      "inventory",
      "talk to gandalf",
      "ask gandalf for help",
      "take map",
      "take map from gandalf",
      "open door",
      "go outside",
      { command: "leave house", notExpectedIncluded: ["You don't have the house."] },
      "look under carpet",
      "open chest",
      "open drawer",
      "take lamp",
      "turn on lamp",
      "read map",
      "save beginner-bagend",
    ],
  },
  {
    name: "bag end hall with key",
    setup(game) {
      game.restartGame();
      game.execute("look under carpet");
      game.execute("take key");
    },
    commands: [
      "inventory",
      "open chest",
      "look in chest",
      "open dresser",
      "open top drawer",
      "look in top drawer",
      "open little drawer",
      "look in little drawer",
      "take old book",
      "read old book",
      "take parchment",
      "write on parchment",
      "smell room",
      "listen",
      "go west",
      "go south",
      { command: "go northeast", notExpectedIncluded: ['That direction is not recognized. Type "go <direction>" or "go through <door name>".'] },
      "go outside",
      "go to garden",
      "look at lamp",
    ],
  },
  {
    name: "bilbos garden",
    setup(game) {
      game.restartGame();
      game.execute("go outside");
    },
    commands: [
      "look",
      "where can i go",
      "smell flowers",
      "smell herbs",
      "pick rose",
      "water herbs",
      "fill bird bath",
      "open shed",
      "look at shed",
      "dig garden",
      "plant seeds",
      "look at bench",
      "look at sun dial",
      "go inside",
      "go east",
      { command: "leave garden", notExpectedIncluded: ["You don't have the garden."] },
      "help",
      "wait",
      "inventory",
      "map",
    ],
  },
  {
    name: "pantry",
    setup(game) {
      game.restartGame();
      movePlayerTo(game, "bag_end_pantry");
    },
    commands: [
      "look",
      "where am i",
      "where can i go",
      "inventory",
      "take seed cakes",
      "eat seed cakes",
      "take cheese",
      "eat cheese",
      "look at shelves",
      "smell air",
      "listen",
      "search room",
      "go west",
      "go east",
      "go north",
      "help",
      "map",
      "wait",
      "take pickles",
      "take cold chicken",
    ],
  },
  {
    name: "green dragon inn",
    setup(game) {
      game.restartGame();
      game.execute("jump green_dragon");
    },
    commands: [
      "look",
      "where am i",
      "where can i go",
      "talk to innkeeper",
      "ask innkeeper for ale",
      "ask innkeeper for help",
      "talk to thorin",
      "ask thorin for help",
      "look through window",
      "open door",
      "go outside",
      { command: "leave inn", notExpectedIncluded: ["You don't have the inn."] },
      { command: "go back inside", expectedIncluded: [/.+/] },
      "talk to farmer",
      "talk to tinker",
      "inventory",
      "smell air",
      "listen",
      "save beginner-inn",
      "wait",
    ],
  },
  {
    name: "trolls clearing",
    setup(game) {
      game.restartGame();
      game.execute("jump trolls");
      game.execute("east");
    },
    commands: [
      "look",
      "where can i go",
      "look at trolls",
      "talk to trolls",
      "take key carefully",
      "take lantern",
      "turn on lantern",
      "go east",
      "go south east",
      "go west",
      "look around",
      "search clearing",
      "look at fire",
      "inventory",
      "wait",
      "help",
      "what should i do",
      "save beginner-trolls",
      "map",
      "listen",
    ],
  },
  {
    name: "rivendell",
    setup(game) {
      game.restartGame();
      game.execute("jump rivendell");
    },
    commands: [
      "look",
      "where am i",
      "where can i go",
      "talk to elrond",
      "ask elrond for help",
      "ask elrond about map",
      "show map to elrond",
      "read map",
      "go outside",
      "go east",
      "go west",
      "inventory",
      "look at waterfall",
      "smell air",
      "listen",
      "save beginner-rivendell",
      "wait",
      "talk to gandalf",
      "ask gandalf for help",
      "map",
    ],
  },
  {
    name: "beorn",
    setup(game) {
      game.restartGame();
      game.execute("jump beorn");
    },
    commands: [
      "look",
      "talk to beorn",
      "ask beorn for food",
      "ask beorn for help",
      "ask beorn about mirkwood",
      "inventory",
      "where can i go",
      "go outside",
      "go east",
      "go west",
      "look at table",
      "show map to beorn",
      "smell air",
      "listen",
      "wait",
      "help",
      "save beginner-beorn",
      "map",
      "where am i",
      "look around",
    ],
  },
  {
    name: "mirkwood",
    setup(game) {
      game.restartGame();
      game.execute("jump mirkwood");
    },
    commands: [
      "look",
      "where can i go",
      "listen",
      "smell air",
      "look at trees",
      "search path",
      "go north",
      "go south",
      "go east",
      "go west",
      "talk to gandalf",
      "ask gandalf for help",
      "wear ring",
      "take rope",
      "inventory",
      "map",
      "wait",
      "help",
      "save beginner-mirkwood",
      "where am i",
    ],
  },
  {
    name: "front gate",
    setup(game) {
      game.restartGame();
      game.execute("jump front_gate");
    },
    commands: [
      "look",
      "where am i",
      "where can i go",
      "read map",
      "open door",
      "unlock door with key",
      "go through door",
      "talk to bard",
      "ask bard for help",
      "ask bard about dragon",
      "give map to bard",
      "show map to bard",
      "inventory",
      "listen",
      "smell air",
      "wait",
      "help",
      "save beginner-frontgate",
      "map",
      "look at rock face",
    ],
  },
];

const beginnerCommandCases = beginnerContexts.flatMap((context, contextIndex) => {
  return context.commands.map((spec, commandIndex) => {
    return beginnerCommandCase(
      context.name,
      context.setup,
      spec,
      (contextIndex * 20) + commandIndex,
    );
  });
});

gameCases.push(...beginnerCommandCases);

const externalRegressions = loadExternalRegressionCases();
cases.push(...externalRegressions.splitterCases);
gameCases.push(...externalRegressions.gameCases);

const cliOptions = parseCliOptions(process.argv.slice(2));
const Splitter = bootGame();
let failed = [];
if (!cliOptions.autoplayBatchOnly) {
  const results = cases.map((testCase) => runCase(Splitter, testCase));
  const dialogueResults = dialogueCases.map(([input, expected], index) => runDialogueCase({
    name: `dialogue ${String(index + 1).padStart(3, "0")}`,
    input,
    expected,
  }));
  const gameResults = gameCases.map(runGameCase);
  const allResults = [...results, ...dialogueResults, ...gameResults];
  failed = allResults.filter((result) => !result.ok);

  for (const result of allResults) {
    const mark = result.ok ? "PASS" : "FAIL";
    console.log(`${mark} ${result.name}`);
    if (!result.ok) {
      console.log(`  expected: ${JSON.stringify(result.expected)}`);
      console.log(`  actual:   ${JSON.stringify(result.actual)}`);
    }
  }

  if (failed.length) {
    console.error(`\n${failed.length} parser test(s) failed.`);
    process.exit(1);
  }

  console.log(`\n${allResults.length} parser/dialogue tests passed.`);
}

if (cliOptions.autoplayBatchCount > 0) {
  const report = runAutoplaySeedBatch({
    count: cliOptions.autoplayBatchCount,
    seedStart: cliOptions.autoplayBatchSeedStart,
    stepLimit: cliOptions.autoplayBatchStepLimit,
    traceSeeds: cliOptions.autoplayTraceSeeds,
    traceLimit: cliOptions.autoplayTraceLimit,
  });
  printAutoplayBatchReport(report, {
    count: cliOptions.autoplayBatchCount,
    seedStart: cliOptions.autoplayBatchSeedStart,
    stepLimit: cliOptions.autoplayBatchStepLimit,
    showVictories: cliOptions.autoplayShowVictories,
    traceSeeds: cliOptions.autoplayTraceSeeds,
  });
  if (cliOptions.autoplayBatchStrict) {
    const failures = report.runs.filter((run) => run.outcome.code !== "victory");
    if (failures.length) {
      console.error(`\n${failures.length} autoplay batch run(s) failed.`);
      process.exit(1);
    }
  }
}

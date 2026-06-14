const fs = require("fs");
const vm = require("vm");

const outputLines = [];

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

function bootGame() {
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

  vm.runInThisContext(fs.readFileSync("assets/game-data.js", "utf8"));
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
      'For guidance, type "tips". To see recognized verbs, type "commands" or "verbs". To save, type "save name".',
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
    expectedIncluded: ["Undo is not available here. If you need safety, use 'save name' or 'load autosave'."],
    notExpectedIncluded: ["Please specify your action and the object."],
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
      game.currentRoom = "lower_halls";
      game.player.position = "lower_halls";
      placeCharacterWithPlayer(game, "bard");
      game.characters.bard.movementMode = "follow";
      game.flags.bardreadiedarrow = true;
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
      game.currentRoom = "lower_halls";
      game.player.position = "lower_halls";
      placeCharacterWithPlayer(game, "bard");
      game.characters.bard.movementMode = "follow";
      game.flags.bardreadiedarrow = true;
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
      game.currentRoom = "lower_halls";
      game.player.position = "lower_halls";
      placeCharacterWithPlayer(game, "bard");
      game.characters.bard.movementMode = "follow";
      game.flags.bardreadiedarrow = true;
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
      game.currentRoom = "lower_halls";
      game.player.position = "lower_halls";
      placeCharacterWithPlayer(game, "bard");
      game.characters.bard.movementMode = "follow";
      game.flags.bardreadiedarrow = true;
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
      "Gandalf wears the golden ring and becomes unnoticeable.",
      "Gandalf removes the golden ring and becomes noticeable again.",
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
    name: "autoplay wins without weight drops",
    drive(game) {
      const originalRandom = Math.random;
      const issued = [];
      Math.random = () => 0.99;
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
      "You see the top drawer; inside there is: a neatly folded linen sheet.",
      "You see a sturdy trunk placed at the foot of the guest bed; inside there is: a folded quilt smelling faintly of lavender and cupboard freshness, a small, ornate box.",
    ],
    notExpectedIncluded: [
      "You see the top drawer; inside there is: a neatly folded linen sheet, a small, ornate box.",
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
      "You see the top drawer; inside there is: a neatly folded linen sheet.",
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
    name: "remembered ambiguous reference survives save and load",
    drive(game) {
      game.execute("open drawer");
      game.execute("top");
      game.save("clarification-memory");
      game.execute("open bottom drawer");
      game.load("clarification-memory");
      game.execute("close drawer");
      const clarificationCount = outputLines.filter((line) => line.includes("Do you mean") && line.includes("drawer")).length;
      game.print(`Drawer clarification count across save load: ${clarificationCount}`);
    },
    expectedIncluded: [
      'Game "clarification-memory" loaded.',
      "You close the top drawer.",
      "Drawer clarification count across save load: 0",
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
      "He is carrying a curious map.",
    ],
    notExpectedIncluded: [
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
    name: "map command shows the game map overlay",
    drive(game) {
      const overlay = document.getElementById("scene-map-overlay");
      const image = document.getElementById("scene-map-image");
      game.execute("map");
      const visible = Object.prototype.hasOwnProperty.call(overlay.attributes, "hidden") ? "no" : "yes";
      const src = image.getAttribute("src") || "";
      game.print(`Map overlay visible: ${visible}`);
      game.print(`Map image loaded: ${src.includes("map.jpeg") ? "yes" : "no"}`);
      game.execute("exits");
      const hiddenAfter = Object.prototype.hasOwnProperty.call(overlay.attributes, "hidden") ? "yes" : "no";
      game.print(`Map overlay hidden after exits: ${hiddenAfter}`);
    },
    expectedIncluded: [
      "You study the map of Wilderland.",
      "Map overlay visible: yes",
      "Map image loaded: yes",
      "Map overlay hidden after exits: yes",
    ],
  },
  {
    name: "jump command lists available checkpoints",
    drive(game) {
      game.execute("jumps");
    },
    expectedIncluded: [
      "Jump checkpoints:",
      "before_green_dragon",
      "green_dragon",
      "after_trolls_cave",
      "smaug",
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
    name: "jump after trolls cave applies a coherent post-loot state",
    drive(game) {
      game.execute("jump after_trolls_cave");
      game.print(`Jump room: ${game.currentRoom}`);
      game.print(`Has sword: ${game.findInInventory("short strong dagger") ? "yes" : "no"}`);
      game.print(`Has rope: ${game.findInInventory("sturdy rope") ? "yes" : "no"}`);
      game.print(`Has large key: ${game.findInInventory("large key") ? "yes" : "no"}`);
      game.print(`Trolls transformed: ${game.trollsTransformed ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to After Trolls Cave.",
      "Jump room: trollshaws_road",
      "Has sword: yes",
      "Has rope: yes",
      "Has large key: yes",
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
    name: "jump rivendell applies a coherent milestone state",
    drive(game) {
      game.execute("jump rivendell");
      game.print(`Jump room: ${game.currentRoom}`);
      game.print(`Has map: ${game.findInInventory("curious map") ? "yes" : "no"}`);
      game.print(`Has key: ${game.findInInventory("curious key") ? "yes" : "no"}`);
      game.print(`Has rope: ${game.findInInventory("sturdy rope") ? "yes" : "no"}`);
      game.print(`Trolls transformed: ${game.trollsTransformed ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to Rivendell.",
      "Jump room: rivendell",
      "Has map: yes",
      "Has key: yes",
      "Has rope: yes",
      "Trolls transformed: yes",
    ],
  },
  {
    name: "jump trolls preserves offscreen dawn progression after leaving the clearing",
    drive(game) {
      game.execute("jump trolls");
      game.execute("south west");
      game.execute("wait");
      game.execute("wait");
      game.execute("wait");
      game.print(`Trolls transformed after waits: ${game.trollsTransformed ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to Trolls Clearing.",
      "Day dawns.",
      "Trolls transformed after waits: yes",
    ],
  },
  {
    name: "ordinary turns do not advance troll dawn unless the key was stolen",
    drive(game) {
      game.execute("jump trolls");
      game.execute("south west");
      game.execute("look");
      game.execute("inventory");
      game.execute("exits");
      game.print(`Trolls transformed after ordinary turns without theft: ${game.trollsTransformed ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to Trolls Clearing.",
      "Trolls transformed after ordinary turns without theft: no",
    ],
    notExpectedIncluded: [
      "Day dawns.",
    ],
  },
  {
    name: "ordinary turns advance troll dawn after stealing the key and leaving",
    drive(game) {
      game.execute("jump trolls");
      game.execute("carefully take large key and south west");
      game.execute("look");
      game.execute("inventory");
      game.execute("exits");
      game.print(`Trolls transformed after ordinary turns with theft: ${game.trollsTransformed ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to Trolls Clearing.",
      "You take the large key.",
      "Day dawns.",
      "Trolls transformed after ordinary turns with theft: yes",
    ],
  },
  {
    name: "jump trolls starts at the opening troll argument",
    drive(game) {
      game.execute("jump trolls");
    },
    expectedIncluded: [
      "Jumped to Trolls Clearing.",
      "You crouch low behind a mossy boulder, heart pounding, as the trolls argue by the flickering campfire in the moonlit clearing.",
      "What shall us do with him?",
      "Roast him!",
    ],
  },
  {
    name: "jump trolls allows one orienting command before bilbo is in immediate danger",
    drive(game) {
      game.execute("jump trolls");
      game.execute("look");
      game.print(`Endgame after first look: ${game.endgame ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to Trolls Clearing.",
      "You are in the trolls' clearing.",
      "Endgame after first look: no",
    ],
    notExpectedIncluded: [
      "The hideous troll stoops, snatches you up before you can slip away",
      "Hideous troll attacks you.",
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
      "A safe moment is marked here: before facing the trolls.",
    ],
  },
  {
    name: "post-troll road to rivendell requires bilbo to carry a blade",
    drive(game) {
      game.execute("jump trolls");
      game.transformTrolls();
      game.execute("south east");
      game.print(`Road room after block: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "Jumped to Trolls Clearing.",
      "The Trollshaws are no place for you to go unarmed.",
      "Road room after block: trolls_clearing",
    ],
  },
  {
    name: "live trolls block the open road toward rivendell without killing bilbo",
    drive(game) {
      game.execute("jump trolls");
      game.execute("south east");
      game.print(`Road room with live trolls: ${game.currentRoom}`);
    },
    expectedIncluded: [
      "Jumped to Trolls Clearing.",
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
      game.print(`Endgame after eastward attempt: ${game.endgame ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to Trolls Clearing.",
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
    name: "jump smaug sets up the dragon endgame",
    drive(game) {
      game.execute("jump smaug");
      const bard = Object.values(game.characters).find((character) => /bard/i.test(character.name));
      game.print(`Jump room: ${game.currentRoom}`);
      game.print(`Bard here: ${bard?.position === game.currentRoom ? "yes" : "no"}`);
      game.print(`Arrow with Bard: ${bard?.inventory?.some((itemId) => /arrow/i.test(game.items[itemId]?.name || "")) ? "yes" : "no"}`);
      game.print(`Dragon alive: ${game.liveDragon() ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Jumped to Smaug.",
      "Jump room: lower_halls",
      "Bard here: yes",
      "Arrow with Bard: yes",
      "Dragon alive: yes",
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
    name: "contextual room descriptions react to transformed and post-dragon states",
    drive(game) {
      game.trollsTransformed = true;
      game.flags.dragondefeated = true;
      const dragon = Object.values(game.characters).find((character) => /dragon/i.test(character.name));
      if (dragon) dragon.visible = false;
      game.print(`Trolls clearing after dawn: ${game.contextualRoomDescription(game.rooms.trolls_clearing)}`);
      game.print(`Treasure approach after dragon: ${game.contextualRoomDescription(game.rooms.erebor_treasure_approach)}`);
      game.print(`Lower halls after dragon: ${game.contextualRoomDescription(game.rooms.lower_halls)}`);
      game.print(`Wooden Town after dragon: ${game.contextualRoomDescription(game.rooms.wooden_town)}`);
    },
    expectedIncluded: [
      "Trolls clearing after dawn: You are in the trolls' clearing. Dawn has ended the quarrel forever",
      "Treasure approach after dragon: Gold-dust still glitters in the cracks ahead, but the held-breath stillness has broken.",
      "Lower halls after dragon: You enter the lower halls of Erebor",
      "Wooden Town after dragon: You are in Lake-town, where hammers, shouted orders, and relieved exhaustion travel the plankways together",
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
    name: "beorn answers food request in his house",
    setup(game) {
      game.currentRoom = "beorns_house";
      game.player.position = "beorns_house";
    },
    inputs: ["ask beorn for food"],
    expectedIncluded: ["Beorn says 'There is food and a roof for honest guests. Help yourself, but do not mistake hospitality for weakness.'"],
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
      game.execute("say to gollum \"what have i got in my pocket\"");
      game.execute("wear ring");
      game.execute("north");
    },
    expectedIncluded: [
      "Groping beside the water in the dark, your fingers close around a small cold ring. Almost without thinking, you slip it into your pocket.",
      "Gollum narrows his pale eyes. 'Baggins has answered. Now Baggins asks, yes. Ask it, precious, ask it.'",
      "You wear the golden ring and become unnoticeable.",
      "Invisible under the ring, you slip past Gollum as he claws wildly about for his precious.",
    ],
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
    name: "gollum wrong answers still kill through varied attack text",
    setup(game) {
      game.currentRoom = "deep_dark_lake";
      game.player.position = "deep_dark_lake";
      game.checkSpecialSituations();
    },
    drive(game) {
      game.execute("ask gollum a riddle");
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
      game.print(`Death choice: ${game.pendingEndgameChoice || "none"}`);
      game.print(`Autosave room: ${game.autosaveMeta?.roomId || "none"}`);
    },
    expectedIncluded: [
      /Gollum.*(Wrong|False|dark|water|stones)/,
      "Death choice: death",
      "Autosave room: deep_dark_lake",
      "Type 'load autosave' to return to the last safe moment in Deep Dark Lake, or 'restart' to begin the tale again.",
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
      game.execute("autosave");
      game.print(`Resume room: ${game.currentRoom}`);
      game.print(`Resume endgame: ${game.endgame ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "You take up the thread again: before meeting Gollum.",
      "Resume room: deep_dark_lake",
      "Resume endgame: no",
    ],
  },
  {
    name: "load autosave after troll death restores the troll scene opening",
    drive(game) {
      game.execute("jump trolls");
      outputLines.length = 0;
      game.execute("take large key");
      game.execute("wait");
      game.execute("wait");
      game.execute("wait");
      game.execute("load autosave");
    },
    expectedIncluded: [
      "You take up the thread again: before facing the trolls.",
      "You are in the trolls' clearing.",
      "You crouch low behind a mossy boulder, heart pounding, as the trolls argue by the flickering campfire in the moonlit clearing.",
      "What shall us do with him?",
      "Roast him!",
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
      game.print(`Restart room: ${game.currentRoom}`);
      game.print(`Restart endgame: ${game.endgame ? "yes" : "no"}`);
    },
    expectedIncluded: [
      "Restart room: hobbit_hole",
      "Restart endgame: no",
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
    },
    expectedIncluded: [
      "River autosave room: west_bank",
      "River death choice: death",
      "Type 'load autosave' to return to the last safe moment in West Bank, or 'restart' to begin the tale again.",
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
      "Type 'load autosave' to return to the last safe moment in West Bank, or 'restart' to begin the tale again.",
    ],
    notExpectedIncluded: [
      "The tale goes no farther from here.",
    ],
  },
  {
    name: "autosave without a marked safe moment reports clearly",
    drive(game) {
      game.endgame = true;
      game.pendingEndgameChoice = "death";
      game.autosaveSnapshot = null;
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
    notExpectedIncluded: ["Invisible under the ring, you slip past Gollum as he claws wildly about for his precious."],
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

const Splitter = bootGame();
const results = cases.map((testCase) => runCase(Splitter, testCase));
const dialogueResults = dialogueCases.map(([input, expected], index) => runDialogueCase({
  name: `dialogue ${String(index + 1).padStart(3, "0")}`,
  input,
  expected,
}));
const gameResults = gameCases.map(runGameCase);
const allResults = [...results, ...dialogueResults, ...gameResults];
const failed = allResults.filter((result) => !result.ok);

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

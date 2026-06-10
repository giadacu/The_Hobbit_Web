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
    style: {},
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
    removeAttribute(name) { delete this.attributes[name]; },
    getAttribute(name) { return this.attributes[name] || ""; },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() {},
    closest() { return makeElement("scene"); },
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
    "room-image",
    "image-reveal",
    "image-reveal-outline",
    "image-reveal-fill",
    "music-player",
    "inventory-list",
    "exits-list",
    "people-list",
  ]) {
    elements.set(id, makeElement(id));
  }

  global.window = global;
  global.document = {
    getElementById: (id) => elements.get(id) || makeElement(id),
    createElement: () => makeElement(),
    addEventListener() {},
    body: makeElement("body"),
    fonts: { ready: Promise.resolve() },
  };
  global.localStorage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {},
    key() { return null; },
    get length() { return 0; },
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
  const includesExpected = testCase.expectedIncluded.every((line) => actual.includes(line));
  const excludesForbidden = (testCase.notExpectedIncluded || []).every((line) => !actual.includes(line));
  const ok = includesExpected && excludesForbidden;
  return { ...testCase, actual, expected: testCase.expectedIncluded, ok };
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
      "Gandalf gives the curious map to You.",
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
      "You are in a beautiful garden, amidst verdant foliage and blossoms bright. The air is sweet with nature's breath. Paths wind through hidden nooks, where secrets lie in wait. A tranquil haven, where the heart finds peace and the spirit, adventure. To the west there is the round green door. The round green door is open. You see: a weathered, moss-covered stone bench perfect for quiet contemplation, an ancient sun dial casting shadows to mark the hours, a vibrant, fragrant rose bush attracting bees and brightening the garden, a shallow bird bath inviting feathered friends to splash and drink, a fragrant herbs patch thriving in the sunlight, a small garden shed for storing tools and gardening supplies.",
    ],
  },
  {
    name: "go outside alias uses visible exit",
    inputs: ["open the door", "go outside", "location"],
    expectedIncluded: ["You are currently in Bilbos garden."],
  },
  {
    name: "go back inside alias returns indoors",
    inputs: ["open the door", "go outside", "go back inside", "location"],
    expectedIncluded: ["You are currently in Hobbit hole."],
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
      "Gandalf is currently in Hobbit hole.",
      "Gandalf is carrying: a map with strange markings (5). Carry weight: 5/35.",
      "Gandalf smells the air, but notices nothing useful.",
    ],
    notExpectedIncluded: [
      "You are currently in Hobbit hole.",
      "You are carrying: a map with strange markings (5). Carry weight: 5/35.",
      "You smell the air, but notice nothing useful.",
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
      "There is a knock at the round green door.",
      "The round green door opens, and Dwalin can be glimpsed outside.",
      "Dwalin steps inside, brushing road dust from his cloak.",
    ],
    notExpectedIncluded: ["Thorin"],
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
      "The round green door opens, and Dwalin can be glimpsed outside.",
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
        .filter((character) => character.position && !["hobbit_hole", "bilbos_garden"].includes(character.position))
        .map((character) => character.name);
      game.print(escaped.length ? `Escaped dwarves: ${escaped.join(", ")}` : "Unexpected Party dwarves remain within Bag End.");
    },
    expectedIncluded: [
      "The house is now crowded with dwarves. Cloaks hang from nearly every peg. The smell of food fills the room.",
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
      "Thorin gives the small key to You.",
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
    ],
    notExpectedIncluded: ["The hideous troll eats you. You are dead."],
  },
  {
    name: "player can carry sword and rope together",
    setup(game) {
      game.player.strength = 5;
      game.currentRoom = "trolls_cave";
      game.player.position = "trolls_cave";
      game.items.majestic_sword.location = { type: "room", id: game.player.position };
      game.items.majestic_sword.visible = true;
      game.items.sturdy_rope.location = { type: "room", id: game.player.position };
      game.items.sturdy_rope.visible = true;
    },
    inputs: ["take sword", "take rope", "inventory"],
    expectedIncluded: [
      "You take the majestic sword.",
      "You take the sturdy rope.",
      "You are carrying: a majestic sword, ancient and luminous (12), a sturdy rope (8). Carry weight: 20/52.",
    ],
  },
  {
    name: "autoplay wins without weight drops",
    drive(game) {
      const originalRandom = Math.random;
      const issued = [];
      Math.random = () => 0.99;
      try {
        for (let step = 0; step < 250 && !game.endgame; step += 1) {
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
    expectedIncluded: ["Congratulations. You have killed Smaug and found the treasure - a real thief. You have mastered 48.81% of this adventure."],
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
    inputs: [
      "south",
      "ask gollum a riddle",
      "answer fish",
      "answer darkness",
      "say to gollum \"what have i got in my pocket\"",
      "wear ring",
      "north",
    ],
    expectedIncluded: [
      "Groping beside the water in the dark, your fingers close around a small cold ring. Almost without thinking, you slip it into your pocket.",
      "Gollum narrows his pale eyes. 'Baggins has answered. Now Baggins asks, yes. Ask it, precious, ask it.'",
      "You wear the golden ring and become unnoticeable.",
      "Invisible under the ring, you slip past Gollum as he claws wildly about for his precious.",
    ],
  },
];

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

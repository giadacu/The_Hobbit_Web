(() => {
  const DATA = window.HOBBIT_DATA;
  const IMAGE_ROOT = "assets/local-images/";
  const MUSIC_ROOT = "assets/local-music/";
  const ASSET_VERSION = "20260607-1630";
  const SAVE_PREFIX = "hobbit-web-save:";
  const LAYOUT_PREF_KEY = "hobbit-web-layout-mode";

  const $ = (id) => document.getElementById(id);
  const output = $("output");
  const input = $("command-input");
  const form = $("command-form");
  const gameShell = $("game-shell");
  const roomImage = $("room-image");
  const imageReveal = $("image-reveal");
  const imageRevealOutline = $("image-reveal-outline");
  const imageRevealFill = $("image-reveal-fill");
  const musicPlayer = $("music-player");
  const inventoryList = $("inventory-list");
  const inventoryStatus = $("inventory-status");
  const exitsList = $("exits-list");
  const peopleList = $("people-list");
  const layoutSwitch = $("layout-switch");
  const layoutDivider = $("layout-divider");
  const layoutMode1Button = $("layout-mode-1");
  const layoutMode2Button = $("layout-mode-2");
  const BASE_CARRY_CAPACITY = 5;
  const CARRY_CAPACITY_PER_STRENGTH = 3;
  const PLAYER_CARRY_BONUS = 32;
  const LANTERN_BURN_TURNS = 10;
  const LAYOUT_SWITCH_IDLE_MS = 1600;
  const LAYOUT_MOUSE_ACTIVITY_THRESHOLD = 28;
  const LAYOUT_SPLIT_PREF_KEY = "hobbit-web-layout-2-scene-width";
  const DEFAULT_LAYOUT_2_SCENE_WIDTH = 54;

  const commandsWithoutObject = new Set([
    "look", "wait", "inventory", "i", "save", "load", "quit", "verbs",
    "mysaves", "hello", "tips", "map", "location", "music", "autoplay",
    "jump", "sit", "stand", "sleep", "rest", "run", "wake", "crawl", "leap",
    "dive", "swim", "lie", "listen", "smell", "sniff", "search", "explore",
    "investigate", "examine", "inspect", "watch", "eavesdrop", "scout",
    "eat", "drink", "cook",
  ]);

  const EDIBLE_ITEMS = new Set([
    "food", "meal", "dinner", "lunch", "breakfast", "snack", "appetizer",
    "dessert", "brunch", "supper", "salad",
  ]);

  const DRINKABLE_ITEMS = new Set([
    "wine", "ale", "beer",
  ]);

  const NATURAL_VERBS = [
    "drink", "smell", "sniff", "touch", "feel", "knock", "watch", "eavesdrop",
    "scout", "patrol", "dig", "tell", "request", "place", "set", "store",
    "hand", "pass", "bring", "send", "return", "deliver", "move", "use",
    "lift", "turn", "hold", "catch", "find", "read", "answer", "thank",
    "flatter", "insult", "sneak", "escape", "follow", "show", "guard",
    "help", "explain", "negotiate", "print", "call", "wash", "check",
    "start", "refill", "inform", "review", "mend", "repair", "fix",
    "write", "lie", "pick", "trim", "fill", "water", "plant", "rake",
  ];

  const CANONICAL_DIALOGUES = [
    ["Bilbo", "Gandalf", "are you certain this is the right path", "It is the safest path available to us."],
    ["Bilbo", "Thorin", "what lies beyond those hills", "The road to our homeland, if fortune favors us."],
    ["Bilbo", "Thorin", "should we make camp here", "Not yet. We must put more distance behind us."],
    ["Bilbo", "Gandalf", "do you expect trouble tonight", "Trouble often arrives when it is least expected."],
    ["Bilbo", "Elrond", "can you read these markings", "Yes, but their meaning is hidden to most eyes."],
    ["Bilbo", "Elrond", "what does the map reveal", "A secret entrance and a narrow chance of success."],
    ["Bilbo", "Beorn", "may we stay the night", "You may, provided you cause no mischief."],
    ["Bilbo", "Beorn", "what dangers await in Mirkwood", "Many, and few travelers return unchanged."],
    ["Bilbo", "Bard", "do you trust Thorin", "I trust his courage more than his judgment."],
    ["Thorin", "Bilbo", "have you seen the Arkenstone", "Not since we entered the mountain."],
    ["Thorin", "Gandalf", "why have you returned", "Because events are moving faster than expected."],
    ["Thorin", "Elrond", "can you help us", "Advice I can offer; victory you must earn."],
    ["Thorin", "Beorn", "will you aid our cause", "If your cause is just, perhaps."],
    ["Thorin", "Bard", "what do the people want", "Fair treatment and a share of what was promised."],
    ["Gandalf", "Bilbo", "what did you discover", "A passage leading deeper underground."],
    ["Gandalf", "Thorin", "are your companions ready", "Ready or not, we must proceed."],
    ["Gandalf", "Elrond", "what do you make of this sign", "It warns of old powers at work."],
    ["Gandalf", "Beorn", "have enemies crossed your lands", "More than usual, and that concerns me."],
    ["Gandalf", "Bard", "can peace still be achieved", "Only if pride yields to reason."],
    ["Elrond", "Bilbo", "what troubles you", "The feeling that we are being watched."],
    ["Elrond", "Thorin", "what do you seek above all", "My kingdom restored."],
    ["Elrond", "Gandalf", "why choose a hobbit", "Because others overlook what hobbits can do."],
    ["Elrond", "Beorn", "what news do you bring", "Wolves and goblins have been seen together."],
    ["Elrond", "Bard", "what is your greatest concern", "The safety of my people."],
    ["Beorn", "Bilbo", "can you handle a pony", "Better than I can handle a dragon."],
    ["Beorn", "Thorin", "how long will your quest take", "Longer than I would like."],
    ["Beorn", "Gandalf", "what is your plan", "To stay one step ahead of disaster."],
    ["Beorn", "Elrond", "do you trust these travelers", "Enough to offer them shelter."],
    ["Beorn", "Bard", "have you faced Smaug", "Only from a distance."],
    ["Bard", "Bilbo", "what did you see inside", "Treasure beyond counting."],
    ["Bard", "Thorin", "will you honor your word", "I intend to."],
    ["Bard", "Gandalf", "what happens next", "That depends on choices made today."],
    ["Bard", "Elrond", "would you have acted differently", "Wisdom is easier after the fact."],
    ["Bard", "Beorn", "will you stand with us", "Against tyranny, yes."],
    ["Bilbo", "Thorin", "listen to reason", "Reason is difficult when one's heart is burdened."],
    ["Thorin", "Bilbo", "why are you hesitant", "Because courage and caution are both necessary."],
    ["Gandalf", "Bilbo", "do you regret coming", "Often, but never completely."],
    ["Elrond", "Bilbo", "what have you learned", "That small people can influence great events."],
    ["Beorn", "Bilbo", "are you hungry", "That is rarely a difficult question."],
    ["Bard", "Bilbo", "whom do you support", "Whoever seeks a fair outcome."],
    ["Thorin", "Gandalf", "can we trust Bard", "Trust must be built, not assumed."],
    ["Gandalf", "Thorin", "what matters most now", "Preventing our hard-won victory from becoming a disaster."],
    ["Elrond", "Thorin", "what do you fear", "Losing what I fought to reclaim."],
    ["Beorn", "Gandalf", "are we too late", "Not yet."],
    ["Bard", "Thorin", "is there room for compromise", "There may be, though I do not welcome it."],
    ["Bilbo", "Gandalf", "what should i do", "The next right thing."],
    ["Thorin", "Bilbo", "will you stand with us", "I will stand for what is right."],
    ["Gandalf", "Bilbo", "are you ready", "As ready as I am likely to be."],
    ["Bard", "Bilbo", "what kind of hero are you", "The reluctant kind."],
    ["Elrond", "Gandalf", "do you still believe in him", "More than ever."],
  ];

  const GANDALF_AMBIENT_LINES = {
    bag_end: [
      "Comfort is a fine hearth, Bilbo, but the world seldom knocks twice.",
      "There is more road beyond this door than most hobbits ever dream.",
    ],
    green_dragon: [
      "Ale loosens tongues, and loose tongues often run ahead of wisdom.",
      "Many tales begin in comfort and end in courage.",
    ],
    trolls: [
      "Stupidity leaves heavy footprints, and trolls are generous with both.",
      "Best keep your wits brighter than their fire ever was.",
    ],
    rivendell: [
      "In Rivendell even burdens grow lighter, though none are quite forgotten.",
      "Listen well here; wisdom often speaks more softly than pride.",
    ],
    mountains: [
      "The mountains do not hate us, but they care very little whether we live.",
      "Keep your footing and your courage. Both are easily lost on these heights.",
    ],
    goblins: [
      "Goblins love noise, darkness, and cruelty; let us offer them as little of ourselves as we can.",
      "There are deep places under stone where even brave hearts must tread carefully.",
    ],
    deep_lake: [
      "Still water in dark places is rarely as empty as it seems.",
      "Some riddles are older than swords, and far more dangerous.",
    ],
    beorn: [
      "Beorn's hospitality is a strong roof, but it is best not to test its beams.",
      "In this house, honesty is wiser than cleverness.",
    ],
    mirkwood_gate: [
      "The forest ahead is old, watchful, and not fond of strangers.",
      "If you leave the path in Mirkwood, do not expect the path to forgive you.",
    ],
    mirkwood: [
      "When the wood grows silent, pay closer attention, not less.",
      "Weariness is a cunning enemy in places where the trees all look alike.",
    ],
    spiders: [
      "There are hungers in this forest that do not sleep by day.",
      "Steel and fire are useful things, but steadiness is better still.",
    ],
    elves: [
      "In halls such as these, courtesy may open what force never could.",
      "Escape often comes disguised as inconvenience.",
    ],
    laketown: [
      "Water remembers roads that maps forget.",
      "Where trade prospers, so do rumor and fear.",
    ],
    dale: [
      "Stones remember what dragons would have men forget.",
      "A ruined town is a stern book, if one has the heart to read it.",
    ],
    front_gate: [
      "Doors made in wiser days seldom yield to haste.",
      "Stand ready. Great thresholds rarely open without cost.",
    ],
    mountain_halls: [
      "Gold may glitter in the dark, but so do the eyes of greed.",
      "Tread softly. Old kingdoms sleep lightly beneath the mountain.",
    ],
    lonely_mountain: [
      "There are victories that must be survived before they can be celebrated.",
      "The Mountain has waited long; it will not easily surrender its secrets.",
    ],
  };

  const ELROND_AMBIENT_LINES = [
    "These halls were made for song and counsel, not for hurried hearts.",
    "Often the small hand sets in motion what the great could never compel.",
    "In Rivendell, old things yield their meaning slowly, yet seldom in vain.",
  ];

  const BEORN_AMBIENT_LINES = [
    "Eat while food is before you, and speak plainly while peace still lasts.",
    "I like roads best when goblins are far from them and wargs farther still.",
    "The wild tells its tidings to those who have ears enough to heed them.",
  ];

  const GOLLUM_RIDDLE_POOL = [
    {
      question: "Gollum whispers 'Alive without breath, as cold as death; never thirsty, ever drinking. What is it, my precious?'",
      answers: ["fish", "a fish", "fishes"],
    },
    {
      question: "Gollum hisses 'It comes first on little cat feet, and swallows torchlight, stars, and moon. What is it, eh?'",
      answers: ["dark", "darkness", "the dark"],
    },
    {
      question: "Gollum murmurs 'Thirty white horses on a red hill. First they champ, then they stamp, then they stand still. What are they, precious?'",
      answers: ["teeth", "white teeth", "horses", "the teeth"],
    },
    {
      question: "Gollum croons 'A box without hinges, key, or lid, yet golden treasure inside is hid. What is it, eh?'",
      answers: ["egg", "an egg", "a egg"],
    },
    {
      question: "Gollum whispers 'Voiceless it cries, wingless flutters, toothless bites, mouthless mutters. What is it, my precious?'",
      answers: ["wind", "the wind"],
    },
  ];

  class CommandSplitter {
    constructor(data) {
      this.verbs = [...new Set([...(data.parser.verbs || []), ...NATURAL_VERBS])];
      this.directions = [
        "north", "south", "east", "west", "north east", "north west",
        "south east", "south west", "up", "down", "n", "s", "e", "w",
        "ne", "nw", "se", "sw", "u", "d",
      ];
      this.synonyms = {
        ...(data.parser.synonyms || {}),
        alzati: "stand",
        corri: "run",
        dormi: "sleep",
        nuota: "swim",
        riposa: "rest",
        salta: "jump",
        scala: "climb",
        siediti: "sit",
        sniff: "smell",
        smash: "break",
        seek: "find",
        locate: "find",
        track: "find",
        tell: "ask",
      };
      this.adverbs = (data.parser.adverbs || []).filter((adverb) => adverb !== "next");
      this.knownCharacterNames = Object.values(data.characters || {})
        .map((character) => normalize(character?.name))
        .filter((name) => name && name !== "you")
        .sort((a, b) => b.length - a.length);
      this.lastAdverb = null;
      this.lastObject = null;
      this.lastDirectObject = null;
      this.lastTargetObject = null;
    }

    split(text) {
      let command = text.trim().toLowerCase();
      command = normalizeNaturalCommand(command);
      command = normalizeVocativeCommand(command, this.verbs);
      command = normalizeDelegatedTellCommand(command, this.verbs);
      command = this.normalizeCharacterObjectOrder(command);
      command = command.replace(/\bthe\b\s*/gi, "").replace(/\ba\b\s*/gi, "");
      this.lastAdverb = null;
      for (const adverb of this.adverbs) {
        const re = new RegExp(`\\b${escapeRegExp(adverb)}\\b\\s*`, "gi");
        if (re.test(command)) {
          this.lastAdverb = adverb;
          command = command.replace(re, "");
        }
      }
      for (const [from, to] of Object.entries(this.synonyms)) {
        const re = new RegExp(`(^|(?:\\band\\b|\\bthen\\b|,)\\s+)${escapeRegExp(from)}\\b`, "gi");
        command = command.replace(re, (_match, prefix) => `${prefix}${to}`);
      }
      command = replaceCommandSeparators(command)
        .replace(/\band\s+and\b/gi, "and")
        .replace(/\s+/g, " ")
        .trim();

      const raw = splitCommandParts(command);
      const result = [];
      let lastVerb = null;
      for (const part of raw) {
        let words = part.split(/\s+/);
        const currentVerb = this.verbs.includes(words[0]) ? words[0] : lastVerb;
        const askToIndex = currentVerb === "ask" ? words.indexOf("to") : -1;
        words = words.map((word, wordIndex) => {
          if (askToIndex >= 0 && wordIndex > askToIndex) return word;
          if (["him", "her"].includes(word)) {
            if (["ask", "tell"].includes(currentVerb)) {
              return this.knownCharacterNames.includes(this.lastTargetObject) ? this.lastTargetObject : word;
            }
            if (this.lastTargetObject || this.lastDirectObject) return this.lastTargetObject || this.lastDirectObject;
          }
          if (["it", "one"].includes(word) && (this.lastDirectObject || this.lastTargetObject)) {
            const directVerbs = new Set(["take", "get", "retrieve", "wear", "remove", "eat", "drink", "catch", "borrow", "give", "show", "hand", "pass", "bring", "send", "return", "deliver", "put", "drop", "leave", "place", "set", "store", "hide", "open", "close", "throw", "combine"]);
            if (word === "one" || directVerbs.has(currentVerb)) return this.lastDirectObject || this.lastTargetObject;
            return this.lastTargetObject || this.lastDirectObject;
          }
          if (word === "them" && (this.lastObject || this.lastDirectObject || this.lastTargetObject)) {
            const targetVerbs = new Set(["help", "support", "frighten", "scare", "escort", "protect", "persuade"]);
            if (targetVerbs.has(currentVerb)) return this.lastTargetObject || this.lastDirectObject || this.lastObject;
            return this.lastObject || this.lastDirectObject || this.lastTargetObject;
          }
          return word;
        });
        let verb = words[0];
        let object = words.slice(1).join(" ");
        if (!this.verbs.includes(verb) && !this.directions.includes(part)) {
          object = words.join(" ");
          verb = lastVerb || "";
        }
        if (verb) {
          if (verb === "ask" && object.startsWith("for ") && this.lastObject) object = `${this.lastObject} ${object}`;
          if (verb === "shoot" && !object && this.lastObject) object = this.lastObject;
          lastVerb = verb;
          result.push(`${verb} ${object}`.trim());
        } else if (object) {
          result.push(object);
        }
        if (object) this.rememberObjects(verb, object);
      }
      return result.length ? result : [command];
    }

    normalizeCharacterObjectOrder(command) {
      const match = String(command || "").match(/^(show|give|hand|pass|bring|send|return|deliver)\s+(.+)$/);
      if (!match) return command;
      const verb = match[1];
      const rest = match[2].trim();
      if (!rest || /^(?:to|at|into|me\b|you\b)/.test(rest)) return command;
      for (const name of this.knownCharacterNames) {
        if (!rest.startsWith(`${name} `)) continue;
        const item = rest.slice(name.length).trim();
        if (!item) continue;
        return `${verb} ${item} to ${name}`;
      }
      return command;
    }

    rememberObjects(verb, object) {
      const words = object.split(/\s+/).filter(Boolean);
      const prepositions = new Set(["in", "on", "at", "to", "with", "for", "from", "into", "inside", "under", "behind", "beside", "near", "about", "where", "whether", "if", "that", "past", "out", "off"]);
      let direct = [];
      let target = [];
      for (let index = 0; index < words.length; index += 1) {
        if (prepositions.has(words[index])) {
          target = words.slice(index + 1);
          break;
        }
        direct.push(words[index]);
      }
      if (verb === "say" && words[0] === "to" && words.length > 1) {
        direct = words.slice(1);
        target = words.slice(1);
      }
      if (verb === "ask" && direct.length) {
        target = direct.slice(0, 1);
      }
      if (direct.length) this.lastDirectObject = direct.at(-1);
      this.lastTargetObject = target.length ? target.at(-1) : this.lastDirectObject;
      this.lastObject = this.lastTargetObject || this.lastDirectObject || words.at(-1) || this.lastObject;
    }
  }

  class UnexpectedPartyController {
    constructor(game) {
      this.game = game;
      this.partyRooms = new Set(["hobbit_hole", "bilbos_garden"]);
      this.roster = [
        { id: "unexpected_party_dwalin", name: "Dwalin" },
        { id: "unexpected_party_balin", name: "Balin" },
        { id: "unexpected_party_fili", name: "Fili" },
        { id: "unexpected_party_kili", name: "Kili" },
        { id: "unexpected_party_dori", name: "Dori" },
        { id: "unexpected_party_nori", name: "Nori" },
        { id: "unexpected_party_ori", name: "Ori" },
        { id: "unexpected_party_oin", name: "Oin" },
        { id: "unexpected_party_gloin", name: "Gloin" },
        { id: "unexpected_party_bifur", name: "Bifur" },
        { id: "unexpected_party_bofur", name: "Bofur" },
        { id: "unexpected_party_bombur", name: "Bombur" },
      ];
      this.reset();
    }

    reset(savedState = null) {
      this.ensureCharacters();
      const currentArrival = savedState?.currentArrival;
      const validArrival = currentArrival && this.roster.some((entry) => entry.id === currentArrival.dwarfId)
        ? {
          dwarfId: currentArrival.dwarfId,
          stage: Math.max(0, Math.min(3, Number(currentArrival.stage) || 0)),
        }
        : null;
      const arrived = Array.isArray(savedState?.arrived)
        ? savedState.arrived.filter((id) => this.roster.some((entry) => entry.id === id))
        : [];
      this.state = {
        enabled: savedState?.enabled !== false,
        turnCounter: Number(savedState?.turnCounter) || 0,
        cooldown: Number.isFinite(savedState?.cooldown) ? Math.max(0, savedState.cooldown) : 2,
        arrivalIndex: Number.isFinite(savedState?.arrivalIndex) ? Math.max(0, Math.min(this.roster.length, savedState.arrivalIndex)) : arrived.length,
        currentArrival: validArrival,
        arrived,
        fullHouseAnnounced: Boolean(savedState?.fullHouseAnnounced),
      };
      if (this.state.arrivalIndex < this.state.arrived.length) this.state.arrivalIndex = this.state.arrived.length;
      this.reconcileCharacters();
    }

    serialize() {
      return clone(this.state);
    }

    load(savedState = null) {
      this.reset(savedState);
    }

    ensureCharacters() {
      for (const dwarf of this.roster) {
        if (this.game.characters[dwarf.id]) continue;
        this.game.characters[dwarf.id] = {
          id: dwarf.id,
          name: dwarf.name,
          friendly: true,
          strength: 7,
          position: null,
          movementMode: "never",
          visible: true,
          inventory: [],
          worn: [],
          attackFlag: 0,
          hasMetPlayer: false,
          justEntered: false,
          noticeable: true,
          wearingRing: false,
          ringTimer: 0,
          insideContainer: null,
          carriedBy: null,
          ambientOnly: true,
          partyBound: true,
        };
      }
    }

    reconcileCharacters() {
      for (const dwarf of this.roster) {
        const character = this.game.characters[dwarf.id];
        if (!character) continue;
        character.ambientOnly = true;
        character.partyBound = true;
        character.friendly = true;
        character.visible = true;
        character.movementMode = "never";
        character.followingPlayer = false;
        character.justEntered = false;
        character.carriedBy = null;
        const currentStage = this.state.currentArrival?.dwarfId === dwarf.id ? this.state.currentArrival.stage : -1;
        if (this.state.arrived.includes(dwarf.id)) {
          if (!this.partyRooms.has(character.position)) character.position = "hobbit_hole";
        } else if (currentStage === 1) {
          character.position = "bilbos_garden";
        } else if (currentStage >= 2) {
          character.position = "hobbit_hole";
        } else {
          character.position = null;
        }
      }
    }

    isPartyRoom(roomId = this.game.currentRoom) {
      return this.partyRooms.has(roomId);
    }

    isAmbientDwarf(characterOrId) {
      const id = typeof characterOrId === "string" ? characterOrId : characterOrId?.id;
      return this.roster.some((entry) => entry.id === id);
    }

    blocksGreetingResponse(character) {
      return this.isAmbientDwarf(character);
    }

    blocksDirectInteraction(character, type = "talk") {
      if (!this.isAmbientDwarf(character)) return false;
      const messages = {
        talk: [
          `${character.name} gives you a polite nod, but keeps one ear on the gathering.`,
          `${character.name} seems more interested in settling in than in conversation just now.`,
          `${character.name} offers a brief smile and turns back to the bustle of Bag End.`,
        ],
        order: [
          `${character.name} is busy with the gathering and does not take up your instruction.`,
          `${character.name} seems intent on the party rather than on following orders.`,
          `${character.name} has clearly come for the gathering, not for errands.`,
        ],
        ask: [
          `${character.name} is in no mood for a long answer just now.`,
          `${character.name} only murmurs something about the gathering and leaves it there.`,
          `${character.name} appears too occupied to explain much.`,
        ],
        item: [
          `${character.name} keeps his travelling things close for now.`,
          `${character.name} gives his pack a protective pat and declines.`,
          `${character.name} looks as though he would rather keep hold of his belongings.`,
        ],
        gift: [
          `${character.name} waves the offer away and keeps his attention on the gathering.`,
          `${character.name} is too occupied to bother with gifts just now.`,
          `${character.name} gives the item only a passing glance.`,
        ],
      };
      const pool = messages[type] || messages.talk;
      this.game.print(this.pick(pool, hashString(`${character.id}:${type}:${this.state.turnCounter}`)));
      return true;
    }

    canAdvance() {
      return this.state.enabled && this.isPartyRoom(this.game.currentRoom);
    }

    advanceTurn() {
      if (!this.canAdvance()) return false;
      this.ensureCharacters();
      this.reconcileCharacters();
      this.state.turnCounter += 1;
      if (this.state.cooldown > 0) {
        this.state.cooldown -= 1;
        if (this.state.cooldown > 0) return false;
      }

      const event = this.nextEvent();
      if (!event) {
        this.state.cooldown = this.pickCooldown(4, 6);
        return false;
      }

      if (event.apply) event.apply();
      this.game.print(event.message);
      this.state.cooldown = event.cooldown ?? this.pickCooldown(3, 5);
      return true;
    }

    nextEvent() {
      if (this.state.arrivalIndex >= this.roster.length && !this.state.currentArrival && !this.state.fullHouseAnnounced) {
        return {
          message: this.pick([
            "The house is now crowded with dwarves. Cloaks hang from nearly every peg. The smell of food fills the room.",
            "Bag End is full at last: dwarf cloaks line the pegs, voices fill the rooms, and supper scents drift everywhere.",
            "At last every seat seems taken. Bag End hums with dwarf voices, dangling cloaks, and the promise of supper.",
          ], this.seededHash(`full-house:${this.state.turnCounter}`)),
          cooldown: 5,
          apply: () => {
            this.state.fullHouseAnnounced = true;
          },
        };
      }

      const preferAmbient = this.state.arrived.length > 0 && (this.state.turnCounter + this.state.arrived.length) % 4 === 0;
      if (preferAmbient) {
        const ambientFirst = this.nextAmbientEvent();
        if (ambientFirst) return ambientFirst;
      }

      const arrival = this.nextArrivalEvent();
      if (arrival) return arrival;
      return this.nextAmbientEvent();
    }

    nextArrivalEvent() {
      if (this.state.arrivalIndex >= this.roster.length && !this.state.currentArrival) return null;
      if (!this.state.currentArrival) {
        this.state.currentArrival = {
          dwarfId: this.roster[this.state.arrivalIndex].id,
          stage: 0,
        };
      }

      const dwarf = this.game.characters[this.state.currentArrival.dwarfId];
      if (!dwarf) return null;
      const profile = this.arrivalProfile(dwarf.id);

      if (this.state.currentArrival.stage === 0) {
        return {
          message: this.game.currentRoom === "bilbos_garden"
            ? this.pick(profile.knockGarden, this.seededHash(`${dwarf.id}:knock:garden:${this.state.turnCounter}`))
            : this.pick(profile.knockHall, this.seededHash(`${dwarf.id}:knock:hall:${this.state.turnCounter}`)),
          cooldown: this.pickCooldown(profile.knockCooldown[0], profile.knockCooldown[1]),
          apply: () => {
            this.state.currentArrival.stage = 1;
          },
        };
      }

      if (this.state.currentArrival.stage === 1) {
        return {
          message: this.game.currentRoom === "bilbos_garden"
            ? this.pick(profile.approachGarden.map((line) => line.replaceAll("{name}", dwarf.name)), this.seededHash(`${dwarf.id}:approach:garden:${this.state.turnCounter}`))
            : this.pick(profile.approachHall.map((line) => line.replaceAll("{name}", dwarf.name)), this.seededHash(`${dwarf.id}:approach:hall:${this.state.turnCounter}`)),
          cooldown: this.pickCooldown(profile.approachCooldown[0], profile.approachCooldown[1]),
          apply: () => {
            this.setPartyDoorOpen(true);
            dwarf.position = "bilbos_garden";
            this.state.currentArrival.stage = 2;
          },
        };
      }

      if (this.state.currentArrival.stage === 2) {
        return {
          message: this.game.currentRoom === "bilbos_garden"
            ? this.pick(profile.entryGarden.map((line) => line.replaceAll("{name}", dwarf.name)), this.seededHash(`${dwarf.id}:entry:garden:${this.state.turnCounter}`))
            : this.pick(profile.entryHall.map((line) => line.replaceAll("{name}", dwarf.name)), this.seededHash(`${dwarf.id}:entry:hall:${this.state.turnCounter}`)),
          cooldown: this.pickCooldown(profile.entryCooldown[0], profile.entryCooldown[1]),
          apply: () => {
            this.setPartyDoorOpen(true);
            dwarf.position = "hobbit_hole";
            this.state.currentArrival.stage = 3;
          },
        };
      }

      return {
        message: this.pick(profile.settle.map((line) => line.replaceAll("{name}", dwarf.name)), this.seededHash(`${dwarf.id}:settle:${this.state.turnCounter}`)),
        cooldown: this.pickCooldown(profile.settleCooldown[0], profile.settleCooldown[1]),
        apply: () => {
          dwarf.position = "hobbit_hole";
          if (!this.state.arrived.includes(dwarf.id)) this.state.arrived.push(dwarf.id);
          this.state.arrivalIndex = Math.min(this.roster.length, this.state.arrivalIndex + 1);
          this.state.currentArrival = null;
        },
      };
    }

    nextAmbientEvent() {
      const roomId = this.game.currentRoom;
      const visibleDwarves = this.arrivedDwarves().filter((character) => character.position === roomId);
      const options = [];

      if (roomId === "hobbit_hole" && visibleDwarves.length >= 3) {
        options.push({
          message: this.pick([
            "Several dwarves are discussing food.",
            "Somebody asks whether there is any beer.",
            "The room grows steadily more crowded.",
            "A discussion about travelling routes breaks out.",
            "A clutter of cloaks, boots, and low voices spreads through the room.",
          ], this.seededHash(`group:${this.state.turnCounter}:${visibleDwarves.length}`)),
          cooldown: this.pickCooldown(4, 6),
        });
      }

      if (visibleDwarves.length) {
        const dwarf = visibleDwarves[Math.abs(this.seededHash(`room:${this.state.turnCounter}`)) % visibleDwarves.length];
        const roomActions = roomId === "bilbos_garden"
          ? [
            `${dwarf.name} pauses among the flowers and breathes in the garden air.`,
            `${dwarf.name} looks over the garden with mild approval.`,
            `${dwarf.name} lingers a moment in the garden before turning back toward the house.`,
            `${dwarf.name} studies the vegetables with the gravity of a traveller judging a campsite.`,
          ]
          : [
            `${dwarf.name} settles more comfortably into his seat.`,
            `${dwarf.name} rises, stretches his legs, and looks about the room.`,
            `${dwarf.name} studies the comfortable furniture with interest.`,
            `${dwarf.name} glances toward the kitchen hopefully.`,
            `${dwarf.name} sniffs the air and seems encouraged by what he smells.`,
            `${dwarf.name} adjusts his cloak and claims a little more room by the hearth.`,
          ];
        options.push({
          message: this.pick(roomActions, this.seededHash(`${dwarf.id}:room:${this.state.turnCounter}`)),
          cooldown: this.pickCooldown(4, 6),
        });

        const speechLines = [
          "A little beer would suit me.",
          "Seed-cake would be most welcome.",
          "I am starving.",
          "The smell from the kitchen is encouraging.",
          "Someone should help our host.",
          "Interesting house.",
          "A hot drink would be welcome.",
          "I hope there is enough food for everyone.",
          "Apple tart would do nicely.",
          "One should never rush a meal.",
        ];
        if ((this.state.turnCounter + visibleDwarves.length) % 5 === 0) {
          options.push({
            message: `${dwarf.name} says '${this.pick(speechLines, this.seededHash(`${dwarf.id}:speech:${this.state.turnCounter}`))}'`,
            cooldown: this.pickCooldown(5, 7),
          });
        }
      }

      const movable = this.arrivedDwarves().filter((character) => character.id !== this.state.currentArrival?.dwarfId && this.partyRooms.has(character.position));
      if (movable.length) {
        const dwarf = movable[Math.abs(this.seededHash(`move:${this.state.turnCounter}`)) % movable.length];
        const toRoom = dwarf.position === "hobbit_hole" ? "bilbos_garden" : "hobbit_hole";
        options.push({
          message: this.movementMessage(dwarf, dwarf.position, toRoom),
          cooldown: this.pickCooldown(3, 5),
          apply: () => {
            this.setPartyDoorOpen(true);
            dwarf.position = toRoom;
          },
        });
      }

      if (this.game.characters.gandalf?.position === roomId && this.state.arrivalIndex < this.roster.length && this.state.turnCounter % 6 === 0) {
        options.push({
          message: `Gandalf says '${this.pick([
            "We are expecting company.",
            "You had better prepare for guests.",
            "Patience, Bilbo.",
            "The road will soon be calling.",
            "Best keep the kettle near at hand.",
          ], this.seededHash(`gandalf:${this.state.turnCounter}:${this.state.arrivalIndex}`))}'`,
          cooldown: this.pickCooldown(5, 7),
        });
      }

      if (roomId === "hobbit_hole" && this.state.arrived.length >= 8 && this.state.turnCounter % 7 === 0) {
        options.push({
          message: this.pick([
            "We should not keep our leader waiting.",
            "The meeting place is not far from here.",
            "Best not arrive late.",
            "Someone will be expecting us.",
            "Our chief values punctuality.",
            "There is business ahead once this hospitality is done.",
          ], this.seededHash(`hint:${this.state.turnCounter}:${this.state.arrived.length}`)),
          cooldown: this.pickCooldown(5, 7),
        });
      }

      const available = options.filter((option) => option && option.message);
      if (!available.length) return null;
      return available[Math.abs(this.seededHash(`ambient:${this.state.turnCounter}:${available.length}`)) % available.length];
    }

    movementMessage(dwarf, fromRoom, toRoom) {
      if (fromRoom === "hobbit_hole" && toRoom === "bilbos_garden") {
        return this.game.currentRoom === "hobbit_hole"
          ? `${dwarf.name} slips out into the garden for a moment.`
          : `${dwarf.name} comes out into the garden.`;
      }
      return this.game.currentRoom === "bilbos_garden"
        ? `${dwarf.name} goes back inside.`
        : `${dwarf.name} comes in again from the garden.`;
    }

    arrivedDwarves() {
      return this.state.arrived.map((id) => this.game.characters[id]).filter(Boolean);
    }

    partyDoor() {
      return this.game.doors?.porta_hobbit_hole_bilbos_garden || null;
    }

    setPartyDoorOpen(open) {
      const door = this.partyDoor();
      if (!door) return;
      door.open = Boolean(open);
    }

    arrivalProfile(dwarfId) {
      const profiles = [
        {
          knockHall: [
            "There is a knock at the round green door.",
            "A firm knock sounds at the round green door.",
          ],
          knockGarden: [
            "From inside Bag End comes the sound of a knock at the round green door.",
            "You hear a solid knock from the round green door behind you.",
          ],
          approachHall: [
            "The round green door opens, and {name} can be glimpsed outside.",
            "The round green door opens just enough to reveal {name} waiting on the step.",
          ],
          approachGarden: [
            "{name} comes through the garden gate and makes for the round green door.",
            "{name} crosses the garden path with steady, purposeful steps.",
          ],
          entryHall: [
            "{name} steps inside, brushing road dust from his cloak.",
            "{name} steps in from the step outside and looks round Bag End approvingly.",
          ],
          entryGarden: [
            "{name} ducks through the round green door and disappears inside.",
            "{name} stoops beneath the round green door and vanishes into Bag End.",
          ],
          settle: [
            "{name} hangs up his cloak and settles near the fire.",
            "{name} sets down his travelling gear and takes a comfortable place by the hearth.",
            "{name} eases himself in, warming his hands and looking round with approval.",
          ],
          knockCooldown: [2, 3],
          approachCooldown: [2, 3],
          entryCooldown: [1, 2],
          settleCooldown: [3, 5],
        },
        {
          knockHall: [
            "A brisk rat-tat sounds at the round green door.",
            "There comes a quick, businesslike knock at the round green door.",
          ],
          knockGarden: [
            "From the house comes a brisk rat-tat at the round green door.",
            "A quick knock rattles the round green door behind you.",
          ],
          approachHall: [
            "The round green door swings open, and {name} is already on the step as if impatient to be admitted.",
            "The round green door opens wide enough for a glimpse of {name}, boots planted squarely outside.",
          ],
          approachGarden: [
            "{name} strides through the gate and heads straight for the round green door.",
            "{name} enters the garden without hesitation and comes directly to the door.",
          ],
          entryHall: [
            "{name} comes in briskly, as though he has half-expected to find the room waiting for him.",
            "{name} steps smartly inside and gives the room one measuring glance.",
          ],
          entryGarden: [
            "{name} slips through the round green door with practised ease.",
            "{name} is through the door in a moment, cloak swinging behind him.",
          ],
          settle: [
            "{name} claims a place near the hearth and begins to look thoroughly at home.",
            "{name} sets down his pack, warms his hands, and seems satisfied with the arrangement.",
            "{name} makes himself comfortable with the air of a guest expecting many more to follow.",
          ],
          knockCooldown: [1, 2],
          approachCooldown: [1, 2],
          entryCooldown: [1, 2],
          settleCooldown: [2, 4],
        },
        {
          knockHall: [
            "A measured knock sounds at the round green door, followed by the faint scrape of boots on the step.",
            "There is a patient knock at the round green door.",
          ],
          knockGarden: [
            "From within comes a measured knock at the round green door, followed by the sound of someone waiting outside.",
            "You hear a patient knock from the round green door and the soft scrape of boots beyond it.",
          ],
          approachHall: [
            "The round green door opens, and {name} can be seen outside, looking in with calm interest.",
            "The round green door opens, framing {name} on the doorstep with travel-stained cloak and all.",
          ],
          approachGarden: [
            "{name} enters by the garden gate, taking a moment to glance round before approaching the door.",
            "{name} walks up the garden path at an unhurried pace toward the round green door.",
          ],
          entryHall: [
            "{name} enters with a courteous nod, bringing the smell of road and weather indoors.",
            "{name} steps inside carefully, as though unwilling to disturb the comfort of the place too suddenly.",
          ],
          entryGarden: [
            "{name} bows his head under the round door and passes inside.",
            "{name} disappears through the round green door after one last glance at the garden.",
          ],
          settle: [
            "{name} removes his travelling things, then settles with quiet appreciation near the fire.",
            "{name} finds himself a place by the hearth and looks as though he means to enjoy it properly.",
            "{name} stands warming himself for a moment before taking a comfortable seat.",
          ],
          knockCooldown: [2, 4],
          approachCooldown: [2, 3],
          entryCooldown: [1, 3],
          settleCooldown: [3, 5],
        },
      ];
      return profiles[Math.abs(this.seededHash(`arrival-profile:${dwarfId}`)) % profiles.length];
    }

    seededHash(key) {
      return hashString(`${this.game.storySeed || 0}:${key}`);
    }

    pick(list, seed) {
      if (!list.length) return "";
      return list[Math.abs(seed) % list.length];
    }

    pickCooldown(min, max) {
      const span = Math.max(0, max - min);
      return min + (span ? Math.abs(this.seededHash(`cooldown:${this.state.turnCounter}:${this.state.arrivalIndex}:${this.state.arrived.length}`)) % (span + 1) : 0);
    }
  }

  class HobbitGame {
    constructor(data) {
      this.data = data;
      this.splitter = new CommandSplitter(data);
      this.rooms = clone(data.rooms);
      this.items = clone(data.items);
      this.doors = clone(data.doors);
      this.characters = clone(data.characters);
      this.connections = this.normalizeConnections(clone(data.connections));
      this.currentRoom = data.startRoom;
      this.flags = {};
      this.endgame = false;
      this.visitedTrollsClearing = false;
      this.waitCounter = 0;
      this.secretDoorWaitCounter = 0;
      this.trollsTransformed = false;
      this.trollsDefeated = false;
      this.visitedRooms = new Set();
      this.tipsEnabled = false;
      this.tipIndex = 0;
      this.musicEnabled = false;
      this.currentTrack = null;
      this.audioErrorShown = false;
      this.pendingClarification = null;
      this.forcedChoice = null;
      this.commandIssuer = null;
      this.lastConversationCharacterId = null;
      this.lastReferencedCharacterId = null;
      this.delegatedSplitters = new Map();
      this.sharedDelegatedContext = { lastObject: null, lastDirectObject: null, lastTargetObject: null };
      this.autoplayRunning = false;
      this.autoplayTimer = null;
      this.autoplayTypingTimer = null;
      this.autoplayDelay = 450;
      this.autoplayMode = "normal";
      this.autoplayWaits = 0;
      this.autoplayRunId = 0;
      this.autoplayCapturedText = "";
      this.autoplayCapturingOutput = false;
      this.endgameRestartArmed = false;
      this.pendingEndgameChoice = null;
      this.arrivalNoticeTimers = [];
      this.spiderEyesState = null;
      this.gollumState = null;
      this.turnCount = 0;
      this.storyRunCount = 0;
      this.storySeed = 0;
      this.autosaveSnapshot = null;
      this.autosaveMeta = null;
      this.autosaveCounter = 0;
      this.imageRevealTimer = null;
      this.lastRevealedImage = "";
      this.audio = musicPlayer;
      this.audio.loop = true;
      this.audio.preload = "auto";
      this.audio.volume = 0.75;
      this.unexpectedParty = new UnexpectedPartyController(this);
      this.layoutSwitchHideTimer = null;
      this.layoutSwitchAutoHide = this.shouldAutoHideLayoutSwitch();
      this.layoutResizeCleanup = null;
      this.layoutMouseAnchor = null;
      this.layoutMode = this.loadLayoutModePreference();
      this.layout2SceneWidth = this.loadLayout2SceneWidthPreference();
      this.applyLayout2SceneWidth(this.layout2SceneWidth, { persist: false });
      this.applyLayoutMode(this.layoutMode);
      this.initializeLayoutSwitchVisibility();
      this.initializeLayoutDivider();
      this.initState();
      this.bind();
      this.describeRoom(true);
    }

    initState() {
      this.storySeed = this.nextStorySeed();
      for (const item of Object.values(this.items)) {
        item.location = null;
        item.contents = [];
        item.broken = false;
        item.mended = false;
      }
      for (const character of Object.values(this.characters)) {
        character.inventory = [];
        character.worn = [];
        character.visible = character.visible !== false;
        character.attackFlag = character.attackFlag || 0;
        character.hasMetPlayer = Boolean(character.hasMetPlayer);
        character.justEntered = false;
        character.noticeable = character.noticeable !== false;
        character.wearingRing = Boolean(character.wearingRing);
        character.ringTimer = character.ringTimer || 0;
        character.insideContainer = character.insideContainer || null;
        character.carriedBy = null;
      }
      this.normalizeCharacterMovementModes();
      for (const placement of this.data.placements) {
        if (this.items[placement.item]) this.items[placement.item].location = { type: "room", id: placement.room };
      }
      for (const link of this.data.containerContents) {
        if (this.items[link.item] && this.items[link.container]) {
          this.items[link.item].location = { type: "item", id: link.container };
          this.items[link.container].contents.push(link.item);
        }
      }
      for (const placement of this.data.characterPlacements) {
        if (this.characters[placement.character]) this.characters[placement.character].position = placement.room;
      }
      for (const inv of this.data.characterInventories) {
        if (this.items[inv.item] && this.characters[inv.character]) {
          this.items[inv.item].location = { type: "character", id: inv.character };
          this.characters[inv.character].inventory.push(inv.item);
        }
      }
      if (this.items.golden_ring?.location?.type === "room" && this.items.golden_ring.location.id === "deep_dark_lake") {
        this.items.golden_ring.visible = false;
      }
      this.player = this.characters[this.data.player] || Object.values(this.characters).find((c) => c.name === "You");
      this.currentRoom = this.player.position || this.data.startRoom;
      this.visitedRooms.add(this.currentRoom);
      this.spiderEyesState = null;
      this.gollumState = this.createGollumState();
      this.turnCount = 0;
      this.addZXFinaleState();
      this.unexpectedParty?.reset();
    }

    nextStorySeed() {
      this.storyRunCount = (Number(this.storyRunCount) || 0) + 1;
      const randomPart = Math.floor(Math.random() * 0x7fffffff);
      return hashString(`${Date.now()}:${this.storyRunCount}:${randomPart}`);
    }

    normalizeCharacterMovementModes() {
      const gandalf = this.characters?.gandalf;
      if (!gandalf) return;
      if (!gandalf.movementMode || gandalf.movementMode === "always") gandalf.movementMode = "follow";
    }

    createGollumState() {
      const riddleIds = this.selectGollumRiddleIds();
      return {
        met: false,
        contestStarted: false,
        awaitingAnswer: false,
        currentRiddleIndex: 0,
        riddleIds,
        awaitingPlayerRiddle: false,
        pocketQuestionAsked: false,
        enraged: false,
        escaped: false,
        revealStyle: Math.abs(hashString(`${this.storySeed}:gollum-reveal`)) % 4,
        deathStyle: Math.abs(hashString(`${this.storySeed}:gollum-death`)) % 4,
      };
    }

    restoreGollumState(savedState = null) {
      if (!savedState) return this.createGollumState();
      const base = this.createGollumState();
      const restored = { ...base, ...savedState };
      restored.currentRiddleIndex = Math.max(0, Number(restored.currentRiddleIndex) || 0);
      if (!Array.isArray(restored.riddleIds) || !restored.riddleIds.length) restored.riddleIds = base.riddleIds;
      restored.riddleIds = restored.riddleIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0 && value < GOLLUM_RIDDLE_POOL.length)
        .slice(0, 2);
      if (!restored.riddleIds.length) restored.riddleIds = base.riddleIds;
      if (restored.currentRiddleIndex >= restored.riddleIds.length) restored.currentRiddleIndex = restored.riddleIds.length - 1;
      restored.revealStyle = Number.isInteger(restored.revealStyle) ? restored.revealStyle : base.revealStyle;
      restored.deathStyle = Number.isInteger(restored.deathStyle) ? restored.deathStyle : base.deathStyle;
      return restored;
    }

    selectGollumRiddleIds() {
      const pool = GOLLUM_RIDDLE_POOL.map((_entry, index) => index);
      const chosen = [];
      while (pool.length && chosen.length < 2) {
        const pickIndex = Math.abs(hashString(`${this.storySeed}:gollum-riddle:${chosen.length}:${pool.length}`)) % pool.length;
        chosen.push(pool.splice(pickIndex, 1)[0]);
      }
      return chosen;
    }

    activeGollumRiddles(state = this.gollumState) {
      const ids = Array.isArray(state?.riddleIds) && state.riddleIds.length ? state.riddleIds : this.selectGollumRiddleIds();
      return ids.map((id) => GOLLUM_RIDDLE_POOL[id]).filter(Boolean);
    }

    currentGollumRiddle(state = this.gollumState) {
      const riddles = this.activeGollumRiddles(state);
      return riddles[state?.currentRiddleIndex || 0] || riddles[0] || null;
    }

    gollumRevealLines() {
      const styles = [
        [
          "A small boat glides out across the black water. In it crouches Gollum, pale eyes shining in the dark.",
          "Gollum whispers 'What is it, my precious? Lost, is it? Hungry, is it?'",
          "For the moment he seems more curious than murderous. Riddles may yet buy you time.",
        ],
        [
          "A wet scraping reaches you from the stones, and then Gollum unfolds himself from the darkness at the water's edge.",
          "His pale eyes blink once. 'Lost, is it? Lost and found by us, perhapses?' he whispers.",
          "He seems intent on studying you before deciding whether you are guest, game, or thief.",
        ],
        [
          "Something disturbs the black water. A narrow boat noses silently from the dark, and Gollum is suddenly there, peering at you over its side.",
          "Gollum rocks gently and murmurs 'A nasty little Baggins in the dark. Shall we talk, precious?'",
          "His hunger is plain, but so is his fascination. A riddle-game might hold him for a while.",
        ],
        [
          "You catch a flash of pale eyes before the rest of him emerges from shadow, one hand on a boat, the other on the slick stones.",
          "Gollum gives a thin smile. 'We knows a stranger when we smells one, yes. We talks first, perhaps.'",
          "He has not attacked yet. There is room, for the moment, for words and riddles.",
        ],
      ];
      return styles[this.gollumState?.revealStyle || 0] || styles[0];
    }

    gollumContestOpener() {
      const openers = [
        {
          first: "Gollum glides over the black water and whispers 'If Baggins answers true, then Baggins may ask. If not, we eats him, yes.'",
          repeat: "Gollum paddles nearer and whispers 'If Baggins answers true, then Baggins may ask. If not, we eats him, yes.'",
        },
        {
          first: "Gollum tilts his head and rasps 'Answer true, little Baggins, and then you may ask. Answer false, and we keeps you forever.'",
          repeat: "Gollum taps the boat with one claw. 'Again, yes. Answer true and ask. Answer false and feed us.'",
        },
        {
          first: "Gollum folds himself low in the boat. 'Riddles first, precious. True answers earn a question. False answers earn the dark.'",
          repeat: "Gollum circles closer. 'More riddles, yes. Truth buys time. Mistakes buy death.'",
        },
      ];
      const variant = openers[Math.abs(hashString(`${this.storySeed}:gollum-opener`)) % openers.length];
      return this.gollumState?.met ? variant.repeat : variant.first;
    }

    gollumWrongAnswerOutcome() {
      const outcomes = [
        {
          attack: "Gollum's pale eyes flare with hunger. 'Wrong, precious. Wrong!' He springs from the boat and falls on you in the dark.",
          ending: "Gollum catches you in the dark.",
        },
        {
          attack: "Gollum lets out a shrill cry of delight. 'Wrong! Wrong!' He darts low, knife-quick, and drags you down among the wet stones.",
          ending: "Gollum tears you down beside the black water.",
        },
        {
          attack: "With a hiss like tearing cloth, Gollum launches himself at your throat. The dark water splashes, cold hands close, and the cave spins.",
          ending: "Gollum strangles you in the dark.",
        },
        {
          attack: "Gollum shrieks 'False!' and comes at you in a frenzy of claws and teeth, driving you backward into the black water.",
          ending: "Gollum drags you under the dark lake.",
        },
      ];
      return outcomes[this.gollumState?.deathStyle || 0] || outcomes[0];
    }

    addZXFinaleState() {
      if (!this.items.spider_web_green_forest) {
        this.items.spider_web_green_forest = {
          id: "spider_web_green_forest",
          name: "spider web",
          description: "a thick spider web blocking the path",
          container: false,
          portable: false,
          weight: 20,
          strength: 5,
          visible: true,
          open: false,
          locked: false,
          requiredKey: null,
          weapon: false,
          noLid: false,
          wearable: false,
          worn: false,
          contents: [],
          broken: false,
          location: { type: "room", id: "green_forest" },
        };
      }
      if (!this.items.spider_web_black_spiders) {
        this.items.spider_web_black_spiders = {
          ...clone(this.items.spider_web_green_forest),
          id: "spider_web_black_spiders",
          location: { type: "room", id: "place_of_black_spiders" },
        };
      }
      if (!this.doors.secret_door_front_gate) {
        this.doors.secret_door_front_gate = {
          id: "secret_door_front_gate",
          name: "secret door",
          open: false,
          locked: true,
          requiredKey: "curious key",
          strength: 100,
        };
      }
      for (const connection of this.connections) {
        if ((connection.from === "front_gate" && connection.to === "lower_halls") || (connection.from === "lower_halls" && connection.to === "front_gate")) {
          connection.door = "secret_door_front_gate";
        }
      }
      if (!this.connections.some((connection) => connection.from === "green_dragon_inn_outside" && connection.direction === "east" && connection.to === "dreary")) {
        this.connections.push({
          from: "green_dragon_inn_outside",
          direction: "east",
          to: "dreary",
          door: null,
          distance: 3,
          requiredFlag: "ponypassageopen",
        });
      }
    }

    normalizeConnections(connections) {
      const merged = new Map();
      for (const connection of connections) {
        const key = `${connection.from}|${connection.direction}`;
        const existing = merged.get(key);
        merged.set(key, {
          ...connection,
          door: existing?.door || connection.door || null,
        });
      }
      return [...merged.values()];
    }

    bind() {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const command = input.value.trim();
        if (!command) {
          this.print("I am not sure I understood, can you please repeat?", "system");
          return;
        }
        input.value = "";
        this.print(`> ${command}`, "command");
        this.execute(command);
      });
      document.addEventListener("keydown", (event) => {
        if (!this.endgameRestartArmed) return;
        event.preventDefault();
        if (this.pendingEndgameChoice) {
          const key = normalize(event.key);
          if (["1", "a", "autosave", "resume", "continue"].includes(key)) {
            this.resumeFromAutosave();
            return;
          }
          if (["2", "r", "restart"].includes(key)) {
            this.restartGame();
            return;
          }
          return;
        }
        this.restartGame();
      });
      document.addEventListener("click", () => {
        if (!this.endgameRestartArmed) return;
        if (this.pendingEndgameChoice) return;
        this.restartGame();
      });
      roomImage.addEventListener("error", () => {
        const failedUrl = roomImage.src;
        roomImage.removeAttribute("src");
        this.print(`Image not loaded for ${this.room()?.name || "this room"}: ${failedUrl}`, "system");
      });
      this.audio.addEventListener("error", () => {
        if (!this.audioErrorShown) {
          this.audioErrorShown = true;
          this.musicEnabled = false;
          this.print(`Music file could not be loaded: ${this.audio.currentSrc || this.audio.src || this.currentTrack || "unknown track"}.`, "system");
        }
      });
      const bindLayoutButton = (button, mode) => {
        if (!button) return;
        button.addEventListener("click", () => this.setLayoutMode(mode));
      };
      bindLayoutButton(layoutMode1Button, "1");
      bindLayoutButton(layoutMode2Button, "2");
      if (this.layoutSwitchAutoHide && layoutSwitch) {
        document.addEventListener("mousemove", (event) => this.handleLayoutMouseActivity(event), { passive: true });
        document.addEventListener("mousedown", (event) => this.handleLayoutMouseDown(event), { passive: true });
        layoutSwitch.addEventListener("mouseenter", () => this.cancelLayoutSwitchHide());
        layoutSwitch.addEventListener("mouseleave", () => this.scheduleLayoutSwitchHide(900));
        layoutSwitch.addEventListener("focusin", () => {
          this.showLayoutSwitch();
          this.cancelLayoutSwitchHide();
        });
        layoutSwitch.addEventListener("focusout", () => this.scheduleLayoutSwitchHide(900));
        input?.addEventListener("focus", () => this.hideLayoutSwitch());
        input?.addEventListener("input", () => this.hideLayoutSwitch());
        document.addEventListener("keydown", () => {
          if (document.activeElement === input) this.hideLayoutSwitch();
        });
      }
      if (this.layoutSwitchAutoHide && layoutDivider) {
        layoutDivider.addEventListener("mouseenter", () => this.cancelLayoutSwitchHide());
        layoutDivider.addEventListener("mouseleave", () => this.scheduleLayoutSwitchHide(900));
      }
      if (typeof window.addEventListener === "function") {
        window.addEventListener("resize", () => this.applyLayout2SceneWidth(this.layout2SceneWidth, { persist: false }));
      }
    }

    execute(rawCommand) {
      const lower = rawCommand.toLowerCase();
      if (this.endgame) {
        const normalizedEndgame = normalize(lower);
        if (this.pendingEndgameChoice) {
          if (["autosave", "resume", "continue", "checkpoint", "load autosave"].includes(normalizedEndgame)) {
            this.resumeFromAutosave();
            return;
          }
          if (["restart", "start again", "from beginning", "beginning"].includes(normalizedEndgame)) {
            this.restartGame();
            return;
          }
          this.print(this.autosaveSnapshot
            ? "Type 'autosave' to resume from the last checkpoint or 'restart' to begin again."
            : "There is no autosave available. Type 'restart' to begin again.", "system");
          return;
        }
        if (normalizedEndgame === "restart") {
          this.restartGame();
          return;
        }
        this.print("The adventure has ended. Press any key or type 'restart' to begin again.", "system");
        return;
      }
      if (normalize(lower) === "stop autoplay") {
        this.stopAutoplay("Autoplay stopped.");
        this.render();
        return;
      }
      if (this.respondToCanonicalDialogue(rawCommand)) {
        this.render();
        return;
      }
      rawCommand = this.normalizeConversationalQuestion(rawCommand);
      const normalizedCommand = normalizeNaturalCommand(rawCommand.toLowerCase());
      if (this.isUnsupportedConditional(normalizedCommand)) {
        this.print("Conditional commands are not supported yet. Try the action when the condition is true.", "system");
        return;
      }
      if (this.isUnsupportedQuestion(normalizedCommand)) {
        this.print("Questions are not supported as commands yet. Try a direct command, such as 'ask Gandalf to examine map'.", "system");
        return;
      }
      if (this.pendingClarification && this.isClarificationAnswer(rawCommand)) {
        this.handleClarification(rawCommand);
        this.render();
        return;
      }
      this.pendingClarification = null;
      if (lower === "white") {
        document.documentElement.style.colorScheme = "light";
        document.body.style.filter = "invert(1) hue-rotate(180deg)";
        this.print("Changed to white background with black text.");
        return;
      }
      if (lower === "black") {
        document.body.style.filter = "";
        this.print("Changed to black background with white text.");
        return;
      }

      const commands = this.splitter.split(rawCommand);
      let forceNpcMovement = false;
      for (const command of commands) {
        if (normalize(command) === "wait") forceNpcMovement = true;
        const moved = this.processCommand(command);
        if (moved || this.pendingClarification) break;
      }
      if (!this.endgame && !this.pendingClarification) this.advanceCharacterTurn({ forceMove: forceNpcMovement });
      this.render();
    }

    processCommand(command, actor = this.player) {
      if (actor !== this.player) {
        return this.performAs(actor, () => this.processCommand(command));
      }

      if (this.handleSpiderEyesCommand(command)) return false;

      if (this.isDirection(command)) {
        return this.move(this.normalizeDirection(command));
      }

      if (command.startsWith("go ")) {
        return this.handleGo(command.slice(3).trim());
      }

      if (this.handleCharacterFirstCommand(command)) return false;

      if (this.isTalkCommand(command)) {
        this.handleTalk(command);
        return false;
      }

      const [verb, ...rest] = command.split(/\s+/);
      const object = rest.join(" ").trim();
      if (!verb) return false;

      if (this.player.insideContainer && !["look", "examine", "inspect", "climb"].includes(verb)) {
        const container = this.items[this.player.insideContainer];
        const name = container?.name || "container";
        this.print(this.player.name === "You" ? `You should climb out of the ${name} first.` : `${this.player.name} should climb out of the ${name} first.`);
        return false;
      }

      if (this.trySpecialAction(verb, object)) return false;

      if (!object && !commandsWithoutObject.has(verb)) {
        this.print("Please specify your action and the object. For example, type 'open door' or 'climb into tree'.");
        return false;
      }

      if (this.needsClarification(verb, object)) return false;

      const handlers = {
        take: () => this.take(object),
        get: () => this.take(object),
        leave: () => this.drop(object),
        drop: () => this.drop(object),
        put: () => this.drop(object),
        open: () => this.open(object),
        close: () => this.close(object),
        unlock: () => this.unlock(object),
        lock: () => this.lock(object),
        look: () => this.look(object),
        examine: () => this.examine(object),
        inspect: () => this.examine(object),
        search: () => this.examine(object),
        explore: () => this.examine(object),
        investigate: () => this.examine(object),
        listen: () => this.sense("listen", object),
        smell: () => this.sense("smell", object),
        sniff: () => this.sense("smell", object),
        watch: () => this.sense("watch", object),
        eavesdrop: () => this.sense("listen", object),
        scout: () => this.sense("search", object),
        touch: () => this.touch("touch", object),
        feel: () => this.touch("feel", object),
        knock: () => this.touch("knock", object),
        inventory: () => this.inventory(),
        i: () => this.inventory(),
        wait: () => this.wait(),
        hello: () => this.hello(),
        tips: () => this.tips(object),
        verbs: () => this.verbs(),
        mysaves: () => this.listSaves(),
        save: () => this.save(object),
        load: () => this.load(object),
        quit: () => this.quit(),
        map: () => this.showMap(),
        location: () => this.print(actorizeSecondPerson(this.player, `You are currently in ${this.room().name.replace(/_/g, " ")}.`)),
        music: () => this.handleMusicCommand(object),
        autoplay: () => this.autoplay(object),
        wear: () => this.wear(object),
        remove: () => this.remove(object),
        give: () => this.give(object),
        show: () => this.show(object),
        hand: () => this.give(object),
        pass: () => this.give(object),
        bring: () => this.give(object),
        send: () => this.give(object),
        return: () => this.give(object),
        deliver: () => this.give(object),
        ask: () => this.askFor(object),
        borrow: () => this.askFor(object),
        request: () => this.askFor(object),
        carry: () => this.take(object),
        hold: () => this.take(object),
        catch: () => this.take(object),
        follow: () => this.followCharacter(object),
        guard: () => this.physicalAction("guard", object),
        help: () => this.physicalAction("help", object),
        explain: () => this.physicalAction("explain", object),
        negotiate: () => this.physicalAction("negotiate", object),
        print: () => this.physicalAction("print", object),
        call: () => this.socialAction("call", object),
        wash: () => this.physicalAction("wash", object),
        check: () => this.examine(object),
        start: () => this.physicalAction("start", object),
        refill: () => this.physicalAction("refill", object),
        inform: () => this.socialAction("inform", object),
        review: () => this.examine(object),
        mend: () => this.mend(object),
        repair: () => this.mend(object),
        fix: () => this.mend(object),
        write: () => this.write(object),
        light: () => this.light(object),
        pick: () => this.pick(object),
        cut: () => this.cutTrim("cut", object),
        trim: () => this.cutTrim("trim", object),
        fill: () => this.fill(object),
        water: () => this.water(object),
        plant: () => this.plant(object),
        rake: () => this.rakeGarden(object),
        dig: () => this.dig(object),
        kill: () => this.attack(object),
        attack: () => this.attack(object),
        break: () => this.breakThing(object),
        push: () => this.pushPull("push", object),
        pull: () => this.pushPull("pull", object),
        move: () => this.pushPull("move", object),
        place: () => this.drop(object),
        set: () => this.drop(object),
        store: () => this.drop(object),
        lift: () => this.touch("lift", object),
        turn: () => this.touch("turn", object),
        use: () => this.touch("use", object),
        find: () => this.examine(object),
        read: () => this.read(object),
        answer: () => this.socialAction("answer", object),
        thank: () => this.socialAction("thank", object),
        flatter: () => this.socialAction("flatter", object),
        insult: () => this.socialAction("insult", object),
        hide: () => this.physicalAction("hide", object),
        sneak: () => this.physicalAction("sneak", object),
        escape: () => this.physicalAction("escape", object),
        throw: () => this.throwItem(object),
        climb: () => this.climb(object),
        eat: () => this.eat(object),
        drink: () => this.drink(object),
        jump: () => this.physicalAction("jump", object),
        sit: () => this.physicalAction("sit", object),
        lie: () => this.physicalAction("lie", object),
        stand: () => this.physicalAction("stand", object),
        sleep: () => this.physicalAction("sleep", object),
        rest: () => this.physicalAction("rest", object),
        run: () => this.physicalAction("run", object),
        wake: () => this.physicalAction("wake", object),
        crawl: () => this.physicalAction("crawl", object),
        leap: () => this.physicalAction("jump", object),
        dive: () => this.physicalAction("dive", object),
        swim: () => this.physicalAction("swim", object),
        ride: () => this.physicalAction("ride", object),
        cook: () => this.physicalAction("cook", object),
        combine: () => this.combine(object),
      };

      if (handlers[verb]) handlers[verb]();
      else this.unrecognized(command);
      return false;
    }

    performAs(character, action) {
      const originalPlayer = this.player;
      const originalRoom = this.currentRoom;
      const originalCommandIssuer = this.commandIssuer;
      this.player = character;
      this.currentRoom = character.position;
      this.commandIssuer = originalPlayer;
      const result = action();
      this.player = originalPlayer;
      this.currentRoom = originalPlayer.position || originalRoom;
      this.commandIssuer = originalCommandIssuer;
      return result;
    }

    isTalkCommand(command) {
      return /^(?:say|talk|speak|whisper|yell)\s+/.test(command);
    }

    handleCharacterFirstCommand(command) {
      const people = this.peopleInRoom()
        .filter((character) => character.id !== this.player.id && character.visible)
        .sort((a, b) => b.name.length - a.name.length);
      for (const character of people) {
        const name = normalize(character.name);
        if (command === name) {
          if (this.unexpectedParty?.blocksDirectInteraction(character, "talk")) return true;
          this.print(`${character.name} listens intently, expecting your words.`);
          return true;
        }
        if (!command.startsWith(`${name} `)) continue;
        const order = command.slice(name.length).trim().replace(/^to\s+/, "");
        if (!order) continue;
        if (character.friendly === false) {
          this.respondToTalk(character);
          return true;
        }
        if (this.unexpectedParty?.blocksDirectInteraction(character, "order")) return true;
        this.delegateCharacterOrder(character, order);
        return true;
      }
      return false;
    }

    isUnsupportedConditional(command) {
      return /^(if|when|before|after)\b/.test(command);
    }

    isUnsupportedQuestion(command) {
      return /^(who|where|what|why|how|did|does|do)\b/.test(command);
    }

    normalizeConversationalQuestion(rawCommand) {
      const text = String(rawCommand || "").trim();
      if (!text) return rawCommand;
      const normalized = normalizeNaturalCommand(text.toLowerCase());
      if (!/^(who|where|what|why|how)\b/.test(normalized)) return rawCommand;
      const listener = this.lastConversationCharacter();
      if (!listener) return rawCommand;

      let question = normalized;
      const referenced = this.lastReferencedCharacter();
      if (referenced) {
        question = question
          .replace(/\bhe\b/g, normalize(referenced.name))
          .replace(/\bhim\b/g, normalize(referenced.name))
          .replace(/\bshe\b/g, normalize(referenced.name))
          .replace(/\bher\b/g, normalize(referenced.name));
      }
      return `ask ${normalize(listener.name)} ${question}`;
    }

    respondToCanonicalDialogue(rawCommand) {
      const parsed = parseCanonicalDialogueInput(rawCommand);
      if (!parsed) return false;
      const response = canonicalDialogueResponse(parsed.speaker, parsed.addressee, parsed.line);
      if (!response) return false;
      this.print(`${displayDialogueName(parsed.addressee)} says '${response}'`);
      return true;
    }

    room() {
      return this.rooms[this.currentRoom];
    }

    roomLightMode(roomId = this.currentRoom) {
      if (!roomId) return "normal";
      if (roomId === "trolls_cave") return "dim";
      if (roomId === "dark_winding_passage" || roomId === "deep_dark_lake" || /^dark_stuffy_passage_\d+$/.test(roomId)) return "dark";
      return "normal";
    }

    roomNeedsLantern(roomId = this.currentRoom) {
      return this.roomLightMode(roomId) !== "normal";
    }

    hasActiveLantern() {
      return Boolean(this.flags.lanternon && this.lanternTurnsRemaining() > 0);
    }

    roomIsDim(roomId = this.currentRoom) {
      return this.roomLightMode(roomId) === "dim" && !this.hasActiveLantern();
    }

    roomIsDark(roomId = this.currentRoom) {
      return this.roomLightMode(roomId) === "dark" && !this.hasActiveLantern();
    }

    revealLanternDiscoveries(options = {}) {
      if (this.currentRoom !== "trolls_cave" || !this.hasActiveLantern()) return false;
      const chest = this.items.arcane_chest;
      if (!chest || chest.visible) return false;
      chest.visible = true;
      this.flags.swordchest = true;
      if (!options.silent) {
        this.print("In the lantern glow, something runed glints beneath the discarded armor: an arcane chest.");
      }
      return true;
    }

    roomConnections() {
      return this.connectionsFromVisible(this.currentRoom);
    }

    visiblePeopleInRoom() {
      if (this.roomIsDark()) return [];
      return this.peopleInRoom().filter((character) => !character.carriedBy);
    }

    connectionsFromVisible(roomId) {
      const seen = new Set();
      return this.connectionsFrom(roomId).filter((connection) => {
        if (!this.canSeeConnection(connection)) return false;
        const key = connection.direction;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    connectionsFrom(roomId) {
      return this.connections.filter((connection) => connection.from === roomId);
    }

    describeRoom(options = {}) {
      const config = typeof options === "boolean"
        ? { initial: options, full: options }
        : { initial: false, full: false, ...options };
      const room = this.room();
      if (!room) return;
      const wasVisited = this.visitedRooms.has(this.currentRoom);
      this.visitedRooms.add(this.currentRoom);
      this.revealLanternDiscoveries({ silent: true });
      if (this.roomIsDark()) {
        this.print("It is pitch dark here. You cannot see the room, its exits, or anything else. You can only feel your way and move by guesswork.");
        if (config.initial) {
          this.print('Type "tips" for a hint, "commands" or "verbs" for recognized words, "save name" to save.', "system");
        }
        this.render();
        return;
      }
      const showFullDetails = config.full || !wasVisited;
      const baseRoomText = showFullDetails ? room.description : this.firstSentence(room.description);
      const dimPrefix = this.roomIsDim() ? "The cave lies in a murky penumbra. You can make out the larger shapes, but fine details are easily missed." : "";
      const roomText = [dimPrefix, baseRoomText].filter(Boolean).join(" ");
      const doorText = this.roomConnections()
        .filter((c) => c.door && this.doors[c.door])
        .map((c) => `${this.directionLead(c.direction)} there is the ${this.doors[c.door].name}. The ${this.doors[c.door].name} is ${this.doors[c.door].open ? "open" : "closed"}.`)
        .join(" ");
      const objects = this.itemsInRoom(this.currentRoom).filter((item) => item.visible);
      const objectText = objects.length ? `You see: ${objects.map((item) => this.describeItemShort(item)).join(", ")}.` : "";
      const people = this.visiblePeopleInRoom().filter((p) => p.name !== "You" && p.visible);
      const arrivingPeople = people.filter((p) => p.justEntered);
      const peopleText = people.filter((p) => !p.justEntered).map((p) => this.characterPresence(p)).join(" ");
      const detailsText = showFullDetails
        ? [doorText, objectText, peopleText].filter(Boolean).join(" ")
        : peopleText;
      this.print([roomText, detailsText].filter(Boolean).join(" "));
      for (const person of arrivingPeople) {
        this.scheduleCharacterArrivalNotice(person);
        person.justEntered = false;
      }
      if (config.initial) {
        this.print('Type "tips" for a hint, "commands" or "verbs" for recognized words, "save name" to save.', "system");
      }
      this.render();
    }

    firstSentence(text = "") {
      const trimmed = String(text || "").trim();
      if (!trimmed) return "";
      const match = trimmed.match(/^.*?[.?!](?=\s|$)/);
      return match ? match[0].trim() : trimmed;
    }

    directionLead(direction = "") {
      const text = normalize(direction);
      if (text === "up") return "Above";
      if (text === "down") return "Below";
      return `To the ${direction}`;
    }

    scheduleCharacterArrivalNotice(character, delay = 650) {
      const roomId = character.position;
      const characterId = character.id;
      const timer = setTimeout(() => {
        this.arrivalNoticeTimers = this.arrivalNoticeTimers.filter((id) => id !== timer);
        const current = this.characters[characterId];
        if (!current || !current.visible || current.position !== this.currentRoom || current.position !== roomId) return;
        this.print(this.characterArrivalMessage(current));
      }, delay);
      this.arrivalNoticeTimers.push(timer);
    }

    clearArrivalNoticeTimers() {
      for (const timer of this.arrivalNoticeTimers) clearTimeout(timer);
      this.arrivalNoticeTimers = [];
    }

    render() {
      const room = this.room();
      const scene = roomImage.closest(".scene");
      if (this.roomIsDark()) {
        scene?.classList.remove("is-revealing");
        clearTimeout(this.imageRevealTimer);
        this.imageRevealTimer = null;
        roomImage.setAttribute("hidden", "hidden");
        roomImage.removeAttribute("src");
        roomImage.alt = "";
      } else if (room?.image) {
        roomImage.removeAttribute("hidden");
        const src = assetUrl(IMAGE_ROOT, room.image);
        const currentSrc = roomImage.getAttribute("src");
        if (currentSrc !== src) this.revealRoomImage(src);
        if (currentSrc !== src) roomImage.src = src;
        if (!currentSrc) this.revealRoomImage(src);
        roomImage.alt = room.name;
      } else {
        roomImage.setAttribute("hidden", "hidden");
        roomImage.removeAttribute("src");
        roomImage.alt = "";
      }
      fillList(inventoryList, this.player.inventory.map((id) => this.inventorySidebarLabel(this.items[id])).filter(Boolean), "nothing");
      if (inventoryStatus) inventoryStatus.textContent = `Weight ${this.currentCarryWeight()}/${this.carryCapacity()}`;
      fillList(exitsList, this.roomConnections().map((c) => c.direction), "none");
      fillList(peopleList, this.visiblePeopleInRoom().filter((p) => p.name !== "You" && p.visible).map((p) => p.name), "none");
    }

    revealRoomImage(src) {
      if (!imageReveal || !imageRevealOutline || !imageRevealFill || this.lastRevealedImage === src) return;
      this.lastRevealedImage = src;
      const scene = roomImage.closest(".scene");
      clearTimeout(this.imageRevealTimer);
      imageRevealOutline.src = src;
      imageRevealFill.src = src;
      scene.classList.remove("is-revealing");
      imageReveal.style.animation = "none";
      imageRevealOutline.style.animation = "none";
      imageRevealFill.style.animation = "none";
      imageReveal.offsetHeight;
      imageReveal.style.animation = "";
      imageRevealOutline.style.animation = "";
      imageRevealFill.style.animation = "";
      scene.classList.add("is-revealing");
      this.imageRevealTimer = setTimeout(() => this.finishImageReveal(scene), 3650);
    }

    finishImageReveal(scene) {
      clearTimeout(this.imageRevealTimer);
      this.imageRevealTimer = null;
      scene?.classList.remove("is-revealing");
    }

    loadLayoutModePreference() {
      const saved = String(localStorage.getItem(LAYOUT_PREF_KEY) || "").trim();
      return ["1", "2"].includes(saved) ? saved : "1";
    }

    loadLayout2SceneWidthPreference() {
      const saved = Number.parseFloat(localStorage.getItem(LAYOUT_SPLIT_PREF_KEY) || "");
      return Number.isFinite(saved) ? saved : DEFAULT_LAYOUT_2_SCENE_WIDTH;
    }

    shouldAutoHideLayoutSwitch() {
      if (!layoutSwitch || typeof window.matchMedia !== "function") return false;
      return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    }

    initializeLayoutSwitchVisibility() {
      if (!layoutSwitch) return;
      if (!this.layoutSwitchAutoHide) {
        layoutSwitch.classList.remove("layout-switch--auto-hide");
        layoutSwitch.classList.remove("is-visible");
        layoutDivider?.classList?.remove("layout-divider--auto-hide");
        layoutDivider?.classList?.remove("is-visible");
        return;
      }
      layoutSwitch.classList.add("layout-switch--auto-hide");
      layoutSwitch.classList.remove("is-visible");
      layoutDivider?.classList?.add("layout-divider--auto-hide");
      layoutDivider?.classList?.remove("is-visible");
    }

    showLayoutSwitch() {
      if (!this.layoutSwitchAutoHide) return;
      layoutSwitch?.classList?.add("is-visible");
      if (this.layoutMode === "2") layoutDivider?.classList?.add("is-visible");
    }

    hideLayoutSwitch() {
      if (!this.layoutSwitchAutoHide) return;
      this.cancelLayoutSwitchHide();
      layoutSwitch?.classList?.remove("is-visible");
      layoutDivider?.classList?.remove("is-visible");
    }

    cancelLayoutSwitchHide() {
      clearTimeout(this.layoutSwitchHideTimer);
      this.layoutSwitchHideTimer = null;
    }

    scheduleLayoutSwitchHide(delay = LAYOUT_SWITCH_IDLE_MS) {
      if (!this.layoutSwitchAutoHide || !layoutSwitch) return;
      this.cancelLayoutSwitchHide();
      this.layoutSwitchHideTimer = setTimeout(() => {
        if (document.activeElement === layoutSwitch || layoutSwitch.contains?.(document.activeElement)) return;
        this.hideLayoutSwitch();
      }, delay);
    }

    revealLayoutSwitch() {
      if (!this.layoutSwitchAutoHide || !layoutSwitch) return;
      this.showLayoutSwitch();
      this.scheduleLayoutSwitchHide();
    }

    handleLayoutMouseDown(event) {
      this.layoutMouseAnchor = { x: event?.clientX ?? 0, y: event?.clientY ?? 0 };
      this.revealLayoutSwitch();
    }

    handleLayoutMouseActivity(event) {
      if (!this.layoutSwitchAutoHide) return;
      const x = event?.clientX;
      const y = event?.clientY;
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        this.revealLayoutSwitch();
        return;
      }
      if (!this.layoutMouseAnchor) {
        this.layoutMouseAnchor = { x, y };
        return;
      }
      const dx = x - this.layoutMouseAnchor.x;
      const dy = y - this.layoutMouseAnchor.y;
      if (Math.hypot(dx, dy) < LAYOUT_MOUSE_ACTIVITY_THRESHOLD) return;
      this.layoutMouseAnchor = { x, y };
      this.revealLayoutSwitch();
    }

    layout2SceneBounds() {
      const shellWidth = gameShell?.getBoundingClientRect?.().width || window.innerWidth || 1280;
      const dividerWidth = layoutDivider?.getBoundingClientRect?.().width || 14;
      const minPanelWidth = shellWidth <= 860 ? 240 : 320;
      if (!shellWidth) {
        return { min: 36, max: 72 };
      }
      const min = Math.max(24, (minPanelWidth / shellWidth) * 100);
      const max = Math.min(76, 100 - (((minPanelWidth + dividerWidth) / shellWidth) * 100));
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
        return { min: 36, max: 72 };
      }
      return { min, max };
    }

    normalizeLayout2SceneWidth(value) {
      const numeric = Number.parseFloat(value);
      const { min, max } = this.layout2SceneBounds();
      const candidate = Number.isFinite(numeric) ? numeric : DEFAULT_LAYOUT_2_SCENE_WIDTH;
      return Math.min(max, Math.max(min, candidate));
    }

    applyLayout2SceneWidth(value, options = {}) {
      const normalized = this.normalizeLayout2SceneWidth(value);
      this.layout2SceneWidth = normalized;
      document.body?.style?.setProperty?.("--layout-2-scene-width", `${normalized}%`);
      document.documentElement?.style?.setProperty?.("--layout-2-scene-width", `${normalized}%`);
      if (options.persist !== false) localStorage.setItem(LAYOUT_SPLIT_PREF_KEY, String(normalized));
      return normalized;
    }

    updateLayout2SceneWidthFromPointer(clientX) {
      if (!gameShell?.getBoundingClientRect) return;
      const rect = gameShell.getBoundingClientRect();
      if (!rect.width) return;
      const percent = ((clientX - rect.left) / rect.width) * 100;
      this.applyLayout2SceneWidth(percent);
    }

    stopLayoutResize() {
      document.body?.classList?.remove("is-resizing-layout");
      if (typeof this.layoutResizeCleanup === "function") this.layoutResizeCleanup();
      this.layoutResizeCleanup = null;
      if (this.layoutSwitchAutoHide) this.scheduleLayoutSwitchHide(700);
    }

    initializeLayoutDivider() {
      if (!layoutDivider) return;
      layoutDivider.addEventListener("pointerdown", (event) => {
        if (this.layoutMode !== "2" || event.button !== 0) return;
        if (!gameShell?.getBoundingClientRect) return;
        event.preventDefault();
        this.stopLayoutResize();
        this.showLayoutSwitch();
        this.cancelLayoutSwitchHide();
        document.body?.classList?.add("is-resizing-layout");
        this.updateLayout2SceneWidthFromPointer(event.clientX);
        const move = (moveEvent) => this.updateLayout2SceneWidthFromPointer(moveEvent.clientX);
        const finish = () => this.stopLayoutResize();
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", finish, { once: true });
        document.addEventListener("pointercancel", finish, { once: true });
        this.layoutResizeCleanup = () => {
          document.removeEventListener("pointermove", move);
          document.removeEventListener("pointerup", finish);
          document.removeEventListener("pointercancel", finish);
        };
      });
    }

    applyLayoutMode(mode) {
      const normalized = ["1", "2"].includes(String(mode)) ? String(mode) : "1";
      this.layoutMode = normalized;
      document.body?.setAttribute("data-layout", normalized);
      document.documentElement?.setAttribute?.("data-layout", normalized);
      if (normalized === "2") this.applyLayout2SceneWidth(this.layout2SceneWidth, { persist: false });
      const syncPressed = (button, value) => {
        if (!button) return;
        button.setAttribute("aria-pressed", normalized === value ? "true" : "false");
      };
      syncPressed(layoutMode1Button, "1");
      syncPressed(layoutMode2Button, "2");
      if (normalized !== "2") this.stopLayoutResize();
    }

    setLayoutMode(mode) {
      this.applyLayoutMode(mode);
      localStorage.setItem(LAYOUT_PREF_KEY, this.layoutMode);
    }

    print(text, kind = "") {
      if (!text) return;
      for (const part of String(text).split(/(?<=[.!?])(?:2|3|4)(?!\d)|\n/).filter(Boolean)) {
        if (this.autoplayCapturingOutput && kind !== "command" && kind !== "system") {
          this.autoplayCapturedText = [this.autoplayCapturedText, part.trim()].filter(Boolean).join(" ");
        }
        const line = document.createElement("p");
        line.className = `line ${kind}`.trim();
        line.textContent = part.trim();
        output.append(line);
      }
      output.scrollTop = output.scrollHeight;
    }

    itemsInRoom(roomId) {
      return Object.values(this.items).filter((item) => item.location?.type === "room" && item.location.id === roomId);
    }

    peopleInRoom() {
      return Object.values(this.characters).filter((character) => character.position === this.currentRoom);
    }

    characterPresence(character) {
      const base = character.justEntered ? this.characterArrivalMessage(character) : this.characterHereMessage(character);
      const loadout = this.characterLoadoutText(character);
      return [base, loadout].filter(Boolean).join(" ");
    }

    characterHereMessage(character) {
      if (isProperName(character.name)) return `${character.name} is here.`;
      return `${articleFor(character.name, true)} ${character.name} is here.`;
    }

    characterArrivalMessage(character) {
      if (isProperName(character.name)) return `${character.name} enters.`;
      return `${articleFor(character.name, true)} ${character.name} enters.`;
    }

    characterLoadoutText(character, options = {}) {
      const carried = (character.inventory || []).map((id) => this.items[id]).filter(Boolean);
      const worn = (character.worn || []).map((id) => this.items[id]).filter(Boolean);
      const carriedLabels = carried.map((item) => itemLabel(item.name));
      if (matches(character.name, "bard") && !carriedLabels.some((label) => normalize(label).includes("quiver"))) {
        carriedLabels.push("a quiver");
      }
      if (options.includeEmpty && !carriedLabels.length && !worn.length) return "He is carrying nothing. He is wearing nothing.";
      const carriedText = carriedLabels.length ? `He is carrying ${carriedLabels.join(", ")}.` : "";
      const wornText = worn.length ? `He is wearing ${worn.map((item) => itemLabel(item.name)).join(", ")}.` : "";
      return [carriedText, wornText].filter(Boolean).join(" ");
    }

    visibleSearch(objectName, options = {}) {
      if (this.forcedChoice?.type === "item" && matches(this.forcedChoice.name, objectName)) {
        return { item: this.items[this.forcedChoice.id], parent: null };
      }
      return this.visibleSearchAll(objectName, options)[0] || null;
    }

    visibleSearchAll(objectName, options = {}) {
      const name = normalize(objectName);
      const candidates = [];
      const scan = (itemIds, parent = null) => {
        for (const id of itemIds) {
          const item = this.items[id];
          if (!item) continue;
          if (item.visible && matches(item.name, name)) candidates.push({ item, parent });
          if (item.container && (item.open || item.noLid || options.closedContainers)) scan(item.contents, item);
        }
      };
      if (!this.roomIsDark()) scan(this.itemsInRoom(this.currentRoom).map((item) => item.id));
      if (options.includeInventory !== false) scan(this.player.inventory, { inventory: true });
      return candidates;
    }

    findInInventory(objectName) {
      const name = normalize(objectName);
      if (this.forcedChoice?.type === "item" && matches(this.forcedChoice.name, name)) {
        const item = this.items[this.forcedChoice.id];
        if (item && this.player.inventory.includes(item.id)) return item;
      }
      const id = this.player.inventory.find((itemId) => matches(this.items[itemId]?.name, name));
      return id ? this.items[id] : null;
    }

    findKnownItem(objectName) {
      const name = normalize(objectName);
      return Object.values(this.items).find((item) => matches(item?.name, name)) || null;
    }

    findVisibleCharacterHolding(objectName) {
      if (this.roomIsDark()) return null;
      const name = normalize(objectName);
      for (const character of this.peopleInRoom()) {
        if (character.id === this.player.id || !character.visible) continue;
        const inventoryId = (character.inventory || []).find((id) => matches(this.items[id]?.name, name));
        if (inventoryId) return { character, item: this.items[inventoryId], worn: false };
        const wornId = (character.worn || []).find((id) => matches(this.items[id]?.name, name));
        if (wornId) return { character, item: this.items[wornId], worn: true };
      }
      return null;
    }

    heldItemMessage(objectName) {
      const held = this.findVisibleCharacterHolding(objectName);
      if (!held) return "";
      const verb = held.worn ? "wearing" : "carrying";
      if (held.character.name === "You") return `You are ${verb} the ${held.item.name}.`;
      return `${held.character.name} is ${verb} the ${held.item.name}.`;
    }

    findItemInsideContainer(container, itemName) {
      if (!container?.container) return null;
      const name = normalize(itemName);
      const scan = (itemIds, parent) => {
        for (const id of itemIds || []) {
          const item = this.items[id];
          if (!item) continue;
          if (matches(item.name, name)) return { item, parent };
          if (item.container && (item.open || item.noLid)) {
            const nested = scan(item.contents, item);
            if (nested) return nested;
          }
        }
        return null;
      };
      return scan(container.contents, container);
    }

    findDoor(name) {
      const needle = normalize(name);
      if (this.forcedChoice?.type === "door" && matches(this.forcedChoice.name, needle)) {
        const connection = this.roomConnections().find((c) => c.door === this.forcedChoice.id);
        return connection ? { door: this.doors[this.forcedChoice.id], connection } : null;
      }
      for (const connection of this.roomConnections()) {
        const door = connection.door && this.doors[connection.door];
        if (door && matches(door.name, needle)) return { door, connection };
      }
      return null;
    }

    findDoorsAll(name) {
      const needle = normalize(name);
      return this.roomConnections()
        .filter((connection) => connection.door && this.doors[connection.door])
        .map((connection) => ({ door: this.doors[connection.door], connection }))
        .filter(({ door }) => matches(door.name, needle));
    }

    needsClarification(verb, objectText) {
      if (!objectText) return false;
      const request = parseAllTarget(primaryObjectText(verb, objectText));
      if (request.all || !request.target) return false;
      const choices = this.ambiguousChoices(verb, request.target);
      if (choices.length <= 1) return false;
      this.pendingClarification = {
        verb,
        objectText,
        choices,
        actorId: this.player?.id || null,
      };
      const labels = choices.map((choice, index) => `${index + 1}. ${choice.name}`).join("; ");
      this.print(`Which ${request.target} do you mean? ${labels}.`, "system");
      return true;
    }

    isClarificationAnswer(response) {
      const pending = this.pendingClarification;
      if (!pending) return false;
      const answer = normalize(response);
      if (!answer) return false;
      if (["cancel", "stop", "no"].includes(answer)) return true;
      const number = Number.parseInt(answer, 10);
      if (Number.isInteger(number) && number >= 1 && number <= pending.choices.length) return true;
      return pending.choices.some((choice) => matches(choice.name, answer));
    }

    ambiguousChoices(verb, objectText) {
      const itemVerbs = new Set(["take", "get", "open", "close", "unlock", "lock", "examine", "inspect", "break", "push", "pull", "drop", "leave", "put", "wear", "remove", "eat", "drink", "give", "combine"]);
      const doorVerbs = new Set(["open", "close", "unlock", "lock", "examine", "inspect", "break"]);
      const inventoryOnly = new Set(["drop", "leave", "put", "wear", "remove", "eat", "drink", "give", "combine"]);
      const choices = [];

      if (itemVerbs.has(verb)) {
        const itemMatches = inventoryOnly.has(verb)
          ? this.player.inventory.map((id) => ({ item: this.items[id], parent: null })).filter(({ item }) => item && matches(item.name, objectText))
          : this.visibleSearchAll(objectText, { includeInventory: verb !== "take" && verb !== "get" });
        for (const { item } of itemMatches) {
          choices.push({ type: "item", id: item.id, name: item.name });
        }
      }

      if (doorVerbs.has(verb)) {
        for (const { door } of this.findDoorsAll(objectText)) {
          choices.push({ type: "door", id: door.id, name: door.name });
        }
      }

      return uniqueChoices(choices);
    }

    handleClarification(response) {
      const pending = this.pendingClarification;
      this.pendingClarification = null;
      const answer = normalize(response);
      if (["cancel", "stop", "no"].includes(answer)) {
        this.print("Cancelled.", "system");
        return;
      }

      let matchesFound = [];
      const number = Number.parseInt(answer, 10);
      if (Number.isInteger(number) && number >= 1 && number <= pending.choices.length) {
        matchesFound = [pending.choices[number - 1]];
      } else {
        matchesFound = pending.choices.filter((choice) => matches(choice.name, answer));
      }

      if (matchesFound.length !== 1) {
        this.pendingClarification = pending;
        const labels = pending.choices.map((choice, index) => `${index + 1}. ${choice.name}`).join("; ");
        this.print(`Please be more specific: ${labels}.`, "system");
        return;
      }

      this.forcedChoice = matchesFound[0];
      try {
        const resolvedObject = replacePrimaryObject(pending.verb, pending.objectText, matchesFound[0].name);
        const actor = pending.actorId ? this.characters[pending.actorId] || this.player : this.player;
        this.processCommand(`${pending.verb} ${resolvedObject}`.trim(), actor);
      } finally {
        this.forcedChoice = null;
      }
    }

    take(objectName) {
      if (!objectName) return this.print("What would you like to take?");
      if (objectName.includes("door")) return this.print(`You cannot take the ${objectName}.`);
      const outOfMatch = normalize(objectName).match(/^(.+?)\s+out\s+of\s+(.+)$/);
      if (outOfMatch) {
        const itemName = outOfMatch[1].trim();
        const container = this.visibleSearch(outOfMatch[2].trim(), { closedContainers: true })?.item;
        if (!container || !container.container) return this.print("I don't see that here.");
        if (!container.open && !container.noLid) return this.print(`The ${container.name} is closed.`);
        const nested = this.findItemInsideContainer(container, itemName);
        if (!nested) return this.print("I don't see that here.");
        const item = nested.item;
        if (item.weight > this.player.strength * 5) return this.print(`The ${item.name} is too heavy to take.`);
        if (!this.canCarryAdditionalWeight(item.weight || 0)) return this.print(this.carryTooMuchMessage(item));
        this.detachItem(item.id);
        item.location = { type: "character", id: this.player.id };
        this.player.inventory.push(item.id);
        if (matches(item.name, "treasure")) this.flags.treasuretaken = true;
        return this.print(`${actorSubject(this.player, true)} ${actorVerb(this.player, "take")} the ${item.name} from the ${container.name}.`);
      }
      const fromMatch = objectName.split(" from ");
      const request = parseAllTarget(fromMatch[0]);
      const targetName = normalize(request.target);
      if (request.all) return this.takeAll(targetName);
      if (fromMatch.length === 2) {
        const character = this.resolveCharacterTarget(fromMatch[1]);
        if (character) return this.takeItemFromCharacter(character, targetName);
        const container = this.visibleSearch(fromMatch[1], { closedContainers: true })?.item;
        if (container?.container) {
          if (!container.open && !container.noLid) return this.print(`The ${container.name} is closed.`);
          const nested = this.findItemInsideContainer(container, targetName);
          if (!nested) return this.print("I don't see that here.");
          const item = nested.item;
          if (item.weight > this.player.strength * 5) return this.print(`The ${item.name} is too heavy to take.`);
          if (!this.canCarryAdditionalWeight(item.weight || 0)) return this.print(this.carryTooMuchMessage(item));
          this.detachItem(item.id);
          item.location = { type: "character", id: this.player.id };
          this.player.inventory.push(item.id);
          if (matches(item.name, "treasure")) this.flags.treasuretaken = true;
          return this.print(`${actorSubject(this.player, true)} ${actorVerb(this.player, "take")} the ${item.name} from the ${container.name}.`);
        }
      }
      const found = this.visibleSearch(targetName);
      if (!found) {
        const character = this.peopleInRoom().find((candidate) => candidate.id !== this.player.id && candidate.visible && matches(candidate.name, targetName));
        if (character) return this.carryCharacter(character);
        const carried = this.findInInventory(targetName);
        if (carried) return this.print(`${actorSubject(this.player, true)} ${this.player.name === "You" ? "are" : "is"} already carrying the ${carried.name}.`);
        const heldMessage = this.heldItemMessage(targetName);
        if (heldMessage) return this.print(heldMessage);
        return this.print("I don't see that here.");
      }
      const item = found.item;
      if (item.location?.type === "character" && item.location.id === this.player.id) {
        return this.print(`${actorSubject(this.player, true)} ${this.player.name === "You" ? "are" : "is"} already carrying the ${item.name}.`);
      }
      if (matches(item.name, "treasure") && this.liveDragon() && this.player.noticeable !== false) {
        return this.print("The dragon guards the treasure too closely. You need the ring's cover or Bard's help.");
      }
      if (!item.portable) return this.print(`The ${item.name} can't be taken.`);
      if (item.weight > this.player.strength * 5) return this.print(`The ${item.name} is too heavy to take.`);
      if (!this.canCarryAdditionalWeight(item.weight || 0)) return this.print(this.carryTooMuchMessage(item));
      this.detachItem(item.id);
      item.location = { type: "character", id: this.player.id };
      this.player.inventory.push(item.id);
      if (matches(item.name, "treasure")) this.flags.treasuretaken = true;
      const source = found.parent?.id ? ` from the ${found.parent.name}` : "";
      this.print(`${actorSubject(this.player, true)} ${actorVerb(this.player, "take")} the ${item.name}${source}.`);
    }

    carryCharacter(character) {
      if (!matches(character.name, "bard") && !matches(character.name, "thorin")) {
        return this.print(`${character.name} will not let you pick them up.`);
      }
      if (character.carriedBy === this.player.id) return this.print(`${character.name} is already with you.`);
      character.carriedBy = this.player.id;
      character.position = this.currentRoom;
      character.followingPlayer = false;
      character.justEntered = false;
      this.print(actorizeSecondPerson(this.player, `You pick up ${character.name}.`));
    }

    characterCannotFollowVertical(character, direction) {
      return matches(character?.name, "bard") && ["up", "down"].includes(normalize(direction));
    }

    releaseCarriedCharacter(character, { follow = false, message = "" } = {}) {
      if (!character) return;
      character.carriedBy = null;
      character.position = this.currentRoom;
      character.justEntered = false;
      if (follow) {
        character.movementMode = "follow";
        character.followingPlayer = true;
      }
      if (message) this.print(message);
    }

    takeAll(objectName) {
      const foundItems = this.visibleSearchAll(objectName, { includeInventory: false })
        .filter(({ item }) => item.portable && item.weight <= this.player.strength * 5);
      if (foundItems.some(({ item }) => matches(item.name, "treasure")) && this.liveDragon() && this.player.noticeable !== false) {
        return this.print("The dragon guards the treasure too closely. You need the ring's cover or Bard's help.");
      }
      if (!foundItems.length) return this.print("I don't see anything like that here that can be taken.");
      const taken = [];
      const leftBehind = [];
      for (const { item } of foundItems) {
        if (!this.canCarryAdditionalWeight(item.weight || 0)) {
          leftBehind.push(item.name);
          continue;
        }
        this.detachItem(item.id);
        item.location = { type: "character", id: this.player.id };
        this.player.inventory.push(item.id);
        if (matches(item.name, "treasure")) this.flags.treasuretaken = true;
        taken.push(item.name);
      }
      if (taken.length) {
        this.print(actorizeSecondPerson(this.player, `You take the ${joinNames(taken)}.`));
        if (leftBehind.length) this.print(actorizeSecondPerson(this.player, `You leave behind ${joinNames(leftBehind)} because carrying more would exceed your limit.`));
        return;
      }
      this.print(leftBehind.length
        ? actorizeSecondPerson(this.player, `You cannot carry the ${joinNames(leftBehind)} because carrying more would exceed your limit.`)
        : actorizeSecondPerson(this.player, "You cannot carry any more."));
    }

    drop(objectName) {
      if (!objectName) return this.print("What would you like to leave?");
      const placement = this.parsePlacementCommand(objectName);
      const inParts = objectName.split(" in ");
      const itemName = placement?.itemName || inParts[0].trim();
      const carriedCharacter = Object.values(this.characters).find((character) => {
        return character.carriedBy === this.player.id && matches(character.name, normalize(itemName));
      });
      if (carriedCharacter && inParts.length === 1) return this.dropCharacter(carriedCharacter);
      const item = this.findInInventory(itemName);
      if (!item) return this.print(this.heldItemMessage(itemName) || actorizeSecondPerson(this.player, `You don't have the ${itemName}.`));
      if (placement) {
        const container = this.visibleSearch(placement.targetName)?.item;
        if (!container || !container.container) {
          this.detachItem(item.id);
          item.location = { type: "room", id: this.currentRoom };
          return this.print(`${actorSubject(this.player, true)} ${actorVerb(this.player, "place")} the ${item.name} ${placement.relation} the ${placement.targetName}.`);
        }
        if (!container.open && !container.noLid) return this.print(`The ${container.name} is closed.`);
        if (container.id === item.id || this.isInside(item.id, container.id)) return this.print(actorizeSecondPerson(this.player, `You cannot put the ${item.name} in itself.`));
        if ((item.weight || 0) >= (container.weight || 0)) return this.print(`The ${item.name} is too big for the ${container.name}.`);
        this.detachItem(item.id);
        item.location = { type: "item", id: container.id };
        container.contents.push(item.id);
        this.print(`${actorSubject(this.player, true)} ${actorVerb(this.player, "put")} the ${item.name} ${placement.relation} the ${container.name}.`);
        this.checkVictory(item, container);
        return;
      }
      this.detachItem(item.id);
      item.location = { type: "room", id: this.currentRoom };
      this.print(`${actorSubject(this.player, true)} ${actorVerb(this.player, "leave")} the ${item.name}.`);
    }

    parsePlacementCommand(objectName) {
      const text = normalize(objectName);
      const relationPattern = "(?:in front of|next to|to the left of|to the right of|on top of|inside|into|under|behind|beside|near|at|on|in)";
      const match = text.match(new RegExp(`^(.+?)\\s+(${relationPattern})\\s+(.+)$`));
      if (!match) return null;
      const relation = match[2].replace(/^into$|^inside$/, "in");
      return { itemName: match[1].trim(), relation, targetName: match[3].trim() };
    }

    dropCharacter(character) {
      this.releaseCarriedCharacter(character, {
        message: actorizeSecondPerson(this.player, `You put ${character.name} down.`),
      });
    }

    checkVictory(item, container) {
      if (this.currentRoom !== "hobbit_hole") return;
      if (!matches(item?.name, "treasure")) return;
      if (!matches(container?.name, "heavy wooden chest")) return;
      if (this.liveDragon()) {
        this.print("The treasure is safely home, but Smaug still lives.");
        return;
      }
      this.winGame("Congratulations. You have killed Smaug and found the treasure - a real thief!");
    }

    isInside(containerId, itemId) {
      const container = this.items[containerId];
      if (!container?.contents?.length) return false;
      if (container.contents.includes(itemId)) return true;
      return container.contents.some((childId) => this.isInside(childId, itemId));
    }

    open(objectName) {
      const request = parseAllTarget(objectName);
      if (request.all) return this.openAll(request.target);
      const doorFound = this.findDoor(objectName);
      if (doorFound) {
        const { door } = doorFound;
        if (door.open) return this.print(`The ${door.name} is already open.`);
        if (matches(door.name, "secret door") && !this.flags.secretdoorsun) return this.print("The rock face shows no door yet.");
        if (door.locked) {
          const key = this.keyFor(door);
          if (!key) return this.print(`The ${door.name} is locked.`);
          door.locked = false;
        }
        door.open = true;
        this.setFlag(`${compact(door.name)}open`, true);
        return this.print(`${actorSubject(this.player, true)} ${actorVerb(this.player, "open")} the ${door.name}.`);
      }
      const item = this.visibleSearch(objectName)?.item;
      if (!item) return this.print(this.heldItemMessage(objectName) || "I don't see that here.");
      if (!item.container && this.openNonContainerItem(item)) return;
      if (!item.container) return this.print(`The ${item.name} cannot be opened.`);
      if (item.noLid) return this.print(`The ${item.name} has no lid and is always open.`);
      if (item.open) return this.print(`The ${item.name} is already open.`);
      if (item.locked) {
        const key = this.keyFor(item);
        if (!key) return this.print(`The ${item.name} is locked.`);
        item.locked = false;
      }
      item.open = true;
      this.setFlag(`${compact(item.name)}open`, true);
      this.print(`${actorSubject(this.player, true)} ${actorVerb(this.player, "open")} the ${item.name}.`);
    }

    openAll(objectName) {
      const items = this.visibleSearchAll(objectName)
        .map(({ item }) => item)
        .filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index);
      const messages = [];
      for (const item of items) {
        if (!item.container || item.noLid || item.open) continue;
        if (item.locked) {
          const key = this.keyFor(item);
          if (!key) {
            messages.push(`The ${item.name} is locked.`);
            continue;
          }
          item.locked = false;
        }
        item.open = true;
        this.setFlag(`${compact(item.name)}open`, true);
        messages.push(`${actorSubject(this.player, true)} ${actorVerb(this.player, "open")} the ${item.name}.`);
      }
      this.print(messages.length ? messages.join(" ") : "I don't see anything like that here that can be opened.");
    }

    openNonContainerItem(item) {
      if (matches(item.name, "curious map")) {
        if (item.broken) {
          this.print(actorizeSecondPerson(this.player, "You try to unfold the broken curious map, but it only separates into useless fragments."));
          return true;
        }
        if (item.open) {
          this.print("The curious map is already unfolded.");
          return true;
        }
        item.open = true;
        if (item.mended) {
          this.print(actorizeSecondPerson(this.player, "You carefully unfold the mended curious map. The strange markings are readable again, though the joins are still visible."));
          return true;
        }
        this.print(actorizeSecondPerson(this.player, "You unfold the curious map. You see a map with strange markings."));
        return true;
      }
      if (matches(item.name, "elegant lamp")) {
        return this.lightItem(item);
      }
      if (matches(item.name, "dark glass inkwell")) {
        if (item.open) return this.print("The dark glass inkwell is already open.");
        item.open = true;
        this.print(actorizeSecondPerson(this.player, "You unstopper the dark glass inkwell."));
        return true;
      }
      return false;
    }

    close(objectName) {
      const request = parseAllTarget(objectName);
      if (request.all) return this.closeAll(request.target);
      const doorFound = this.findDoor(objectName);
      if (doorFound) {
        doorFound.door.open = false;
        this.setFlag(`${compact(doorFound.door.name)}open`, false);
        return this.print(`${actorSubject(this.player, true)} ${actorVerb(this.player, "close")} the ${doorFound.door.name}.`);
      }
      const item = this.visibleSearch(objectName)?.item;
      if (!item) return this.print(this.heldItemMessage(objectName) || "I don't see that here.");
      if (!item.container && this.closeNonContainerItem(item)) return;
      if (!item.container) return this.print(`The ${item.name} cannot be closed.`);
      if (item.noLid) return this.print(`The ${item.name} has no lid.`);
      item.open = false;
      this.setFlag(`${compact(item.name)}open`, false);
      this.print(`${actorSubject(this.player, true)} ${actorVerb(this.player, "close")} the ${item.name}.`);
    }

    closeAll(objectName) {
      const items = this.visibleSearchAll(objectName)
        .map(({ item }) => item)
        .filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index);
      const closed = [];
      for (const item of items) {
        if (!item.container || item.noLid || !item.open) continue;
        item.open = false;
        this.setFlag(`${compact(item.name)}open`, false);
        closed.push(item.name);
      }
      this.print(closed.length ? `${actorSubject(this.player, true)} ${actorVerb(this.player, "close")} the ${joinNames(closed)}.` : "I don't see anything like that here that can be closed.");
    }

    closeNonContainerItem(item) {
      if (matches(item.name, "curious map")) {
        if (item.broken) {
          this.print("The broken curious map cannot be folded neatly.");
          return true;
        }
        if (!item.open) {
          this.print("The curious map is already folded.");
          return true;
        }
        item.open = false;
        if (item.mended) {
          this.print(actorizeSecondPerson(this.player, "You carefully fold the mended curious map, keeping the repaired joins aligned."));
          return true;
        }
        this.print(actorizeSecondPerson(this.player, "You fold the curious map."));
        return true;
      }
      if (matches(item.name, "elegant lamp")) {
        if (!item.open) return this.print("The elegant lamp is already unlit.");
        item.open = false;
        this.print(actorizeSecondPerson(this.player, "You turn off the elegant lamp."));
        return true;
      }
      if (matches(item.name, "dark glass inkwell")) {
        if (!item.open) return this.print("The dark glass inkwell is already closed.");
        item.open = false;
        this.print(actorizeSecondPerson(this.player, "You stopper the dark glass inkwell."));
        return true;
      }
      return false;
    }

    unlock(objectName) {
      const cleanName = objectName.split(" with ")[0].trim();
      const target = this.findDoor(cleanName)?.door || this.visibleSearch(cleanName)?.item;
      if (!target) return this.print(this.heldItemMessage(cleanName) || "I don't see that here.");
      if (matches(target.name, "secret door") && !this.flags.secretdoorsun) return this.print("The rock face shows no door yet.");
      if (!target.locked) return this.print(`The ${target.name} is already unlocked.`);
      const key = this.keyFor(target);
      if (!key) return this.print(this.heldItemMessage(target.requiredKey || "key") || `You do not have the required key for the ${target.name}.`);
      target.locked = false;
      this.print(`${actorSubject(this.player, true)} ${actorVerb(this.player, "unlock")} the ${target.name} with the ${key.name}.`);
    }

    lock(objectName) {
      const cleanName = objectName.split(" with ")[0].trim();
      const target = this.findDoor(cleanName)?.door || this.visibleSearch(cleanName)?.item;
      if (!target) return this.print(this.heldItemMessage(cleanName) || "I don't see that here.");
      const key = this.keyFor(target);
      if (!key) return this.print(this.heldItemMessage(target.requiredKey || "key") || `You do not have the required key for the ${target.name}.`);
      target.locked = true;
      target.open = false;
      this.print(`${actorSubject(this.player, true)} ${actorVerb(this.player, "lock")} the ${target.name} with the ${key.name}.`);
    }

    keyFor(target) {
      const required = normalize(target.requiredKey || "");
      return this.player.inventory.map((id) => this.items[id]).find((item) => {
        return matches(item?.name, required) || matches(item?.description, required) || matches(item?.keyFor, normalize(target.name));
      });
    }

    look(objectName = "") {
      const text = normalize(objectName).replace(/^(?:around\s+)?for\s+/, "").replace(/^around\s+/, "");
      if (!text || ["around", "room", "place", "area", "here", "surroundings"].includes(text)) {
        return this.describeRoom({ full: true });
      }
      const direction = text.match(/^(across|at|in|inside|into|under|behind|through|over|around)\s+(.+)$/);
      if (direction) {
        const relation = direction[1];
        const target = direction[2];
        if (relation === "at") return this.examine(target);
        if (["in", "inside", "into"].includes(relation)) return this.examine(target);
        return this.inspectEnvironment("look", target, relation);
      }
      return this.examine(text);
    }

    examine(objectName = "") {
      const text = normalize(objectName).replace(/^(?:around\s+)?for\s+/, "").replace(/^around\s+/, "");
      if (!text || ["around", "room", "place", "area", "here", "surroundings"].includes(text)) {
        return this.inspectEnvironment("search", "area");
      }
      const door = this.findDoor(text)?.door;
      const subject = actorSubject(this.player, true);
      if (door) return this.print(`${subject} ${actorVerb(this.player, "see")} the ${door.name}. It is ${door.open ? "open" : "closed"}.`);
      const character = this.resolveCharacterTarget(text);
      if (character) return this.examineCharacter(character);
      const scopedCharacter = this.findKnownCharacter(text.replace(/\s+(?:in|inside|into|at|under|behind|near|around|through|over|on)\s+.+$/, ""));
      const knownCharacter = scopedCharacter || this.findKnownCharacter(text);
      if (knownCharacter) return this.print(`There is no one named ${knownCharacter.name} here.`);
      const item = this.visibleSearch(text)?.item;
      if (!item) {
        const heldMessage = this.heldItemMessage(text);
        if (heldMessage) return this.print(heldMessage);
        const knownItem = this.findKnownItem(text);
        if (knownItem?.portable) {
          return this.print(`${subject} ${actorVerb(this.player, "do")} not have the ${knownItem.name}.`);
        }
        return this.inspectEnvironment("examine", text);
      }
      let description = item.description;
      if (item.broken) {
        const ruin = this.brokenItemDescription(item);
        return this.print(`${subject} ${actorVerb(this.player, "see")} ${ruin}.`);
      }
      if (item.mended) description = this.mendedItemDescription(item);
      if (item.container && item.open && item.contents.length) {
        const visible = item.contents.map((id) => this.items[id]).filter((child) => child?.visible);
        if (visible.length) description += `; inside there is: ${visible.map((child) => this.describeItemShort(child)).join(", ")}`;
      }
      this.revealFromSpecial("examine", text);
      if (item.location?.type === "character" && item.location.id === this.player.id && this.player.name !== "You") {
        return this.print(`${subject} ${actorVerb(this.player, "examine")} the ${item.name} in ${displayCharacterName(this.player)}'s possession. ${subject} ${actorVerb(this.player, "see")} ${description}.`);
      }
      this.print(`${subject} ${actorVerb(this.player, "see")} ${description}.`);
    }

    read(objectName = "") {
      const text = normalize(objectName);
      if (!text) return this.print("Read what?");
      const item = this.visibleSearch(objectName)?.item;
      if (!item) {
        const heldMessage = this.heldItemMessage(objectName);
        if (heldMessage) return this.print(heldMessage);
        return this.print("I don't see that here.");
      }
      if (item.broken) {
        const subject = actorSubject(this.player, true);
        return this.print(`${subject} ${actorVerb(this.player, "try")} to read the broken ${item.name}, but its markings are torn into useless fragments.`);
      }
      if (item.mended && matches(item.name, "curious map")) {
        const subject = actorSubject(this.player, true);
        return this.print(`${subject} ${actorVerb(this.player, "read")} the carefully mended ${item.name}. ${subject} ${actorVerb(this.player, "see")} a map with strange markings, its torn lines pieced back together.`);
      }
      return this.examine(objectName);
    }

    brokenItemDescription(item) {
      if (matches(item.name, "curious map")) {
        return `the broken remains of the ${item.name}. Its markings are torn into useless fragments`;
      }
      return `the broken remains of the ${item.name}`;
    }

    mendedItemDescription(item) {
      if (matches(item.name, "curious map")) {
        return `a carefully mended map with strange markings. The torn lines have been pieced back together, though the joins are still visible`;
      }
      return `a repaired ${item.name}`;
    }

    examineCharacter(character) {
      const loadout = this.characterLoadoutText(character, { includeEmpty: true });
      const temperament = character.friendly === false ? "They look dangerous." : "";
      this.print([actorizeSecondPerson(this.player, `You examine ${character.name}.`), loadout, temperament].filter(Boolean).join(" "));
    }

    sense(verb, objectName = "") {
      const text = normalize(objectName);
      if (text) {
        const item = this.visibleSearch(text)?.item;
        if (item) {
          const subject = actorSubject(this.player, true);
          if (verb === "listen") return this.print(`${subject} ${actorVerb(this.player, "listen")} to the ${item.name}, but hear${this.player.name === "You" ? "" : "s"} nothing useful.`);
          if (verb === "smell") return this.print(`${subject} ${actorVerb(this.player, "smell")} the ${item.name}, but learn${this.player.name === "You" ? "" : "s"} nothing new.`);
          if (verb === "watch") return this.print(`${subject} ${actorVerb(this.player, "watch")} the ${item.name} for a while, but it does not change.`);
          return this.print(`${subject} ${actorVerb(this.player, "study")} the ${item.name}, but discover${this.player.name === "You" ? "" : "s"} nothing new.`);
        }
        const door = this.findDoor(text)?.door;
        if (door) {
          const subject = actorSubject(this.player, true);
          if (verb === "listen") return this.print(`${subject} ${actorVerb(this.player, "listen")} at the ${door.name}, but hear${this.player.name === "You" ? "" : "s"} nothing clear beyond it.`);
          if (verb === "watch") return this.print(`${subject} ${actorVerb(this.player, "watch")} the ${door.name}. It remains ${door.open ? "open" : "closed"}.`);
          return this.print(`${subject} ${actorVerb(this.player, "notice")} nothing unusual about the ${door.name}.`);
        }
        const heldMessage = this.heldItemMessage(text);
        if (heldMessage) return this.print(heldMessage);
      }
      this.inspectEnvironment(verb, text || (verb === "smell" ? "air" : "area"));
    }

    touch(verb, objectName = "") {
      const text = normalize(objectName);
      if (!text) return this.inspectEnvironment(verb, "area");
      const item = this.visibleSearch(text)?.item;
      if (item) {
        if (verb === "knock") {
          return this.print(item.container || item.strength > 8
            ? actorizeSecondPerson(this.player, `You knock on the ${item.name}. It sounds solid.`)
            : actorizeSecondPerson(this.player, `You knock on the ${item.name}, but nothing happens.`));
        }
        return this.print(actorizeSecondPerson(this.player, `You ${verb} the ${item.name}, but discover nothing new.`));
      }
      const door = this.findDoor(text)?.door;
      if (door) {
        if (verb === "knock") return this.print(actorizeSecondPerson(this.player, `You knock on the ${door.name}, but no one answers.`));
        return this.print(actorizeSecondPerson(this.player, `You ${verb} the ${door.name}. It is ${door.open ? "open" : "closed"}.`));
      }
      const heldMessage = this.heldItemMessage(text);
      if (heldMessage) return this.print(heldMessage);
      this.inspectEnvironment(verb, text);
    }

    inspectEnvironment(verb, target = "", relation = "") {
      const room = this.room();
      const text = normalize(target);
      const description = room?.description || "";
      const lower = normalize(description);
      const sample = this.descriptionSentenceFor(text);
      const subject = actorSubject(this.player, true);
      const suffix = sample ? ` ${sample}` : "";

      if (!text || ["area", "room", "place", "here", "surroundings"].includes(text)) {
        if (["search", "examine", "look"].includes(verb)) {
          return this.print(`${subject} search${subject === "You" ? "" : "es"} the area carefully.${suffix || " Nothing else is revealed."}`);
        }
        if (verb === "listen") return this.print(actorizeSecondPerson(this.player, this.ambientSoundMessage(lower)));
        if (verb === "smell") return this.print(actorizeSecondPerson(this.player, this.ambientSmellMessage(lower)));
      }

      if (["air", "smell", "scent", "odor", "odour"].includes(text)) return this.print(actorizeSecondPerson(this.player, this.ambientSmellMessage(lower)));
      if (["sound", "sounds", "noise", "noises", "silence", "music"].includes(text)) return this.print(actorizeSecondPerson(this.player, this.ambientSoundMessage(lower)));

      if (matchesAny(text, ["ground", "floor", "earth", "path", "trail", "road", "footprints"])) {
        if (lower.includes("footprint") || lower.includes("imprint")) return this.print("The ground bears heavy marks, worth remembering but not something you can pick up.");
        if (lower.includes("drop") || lower.includes("cliff")) return this.print("The footing is dangerous. One careless step would be a poor idea.");
        if (lower.includes("moss")) return this.print("The ground is soft with moss and earth.");
        return this.print(`${subject} ${actorVerb(this.player, "study")} the ${text}. It shows no hidden passage or useful object.`);
      }

      if (matchesAny(text, ["wall", "walls", "rock", "rocks", "stone", "stones", "ceiling", "crack", "cracks"])) {
        if (lower.includes("cave") || lower.includes("cavern") || lower.includes("passage")) return this.print(`The stone is cold and rough. ${subject} ${actorVerb(this.player, "find")} no loose block or hidden catch.`);
        if (lower.includes("secret door") || lower.includes("rock face")) return this.print("The rock face gives away nothing yet.");
        return this.print(`${subject} ${actorVerb(this.player, "inspect")} the ${text}. Nothing moves.`);
      }

      if (matchesAny(text, ["tree", "trees", "branch", "branches", "forest", "vines", "roots"])) {
        if (lower.includes("forest") || lower.includes("tree") || lower.includes("branch") || lower.includes("root")) {
          return this.print(`${subject} ${actorVerb(this.player, "study")} the trees and roots. They are part of the landscape, not an object you can use here.`);
        }
        return this.print("There are no useful trees or branches here.");
      }

      if (matchesAny(text, ["river", "water", "stream", "lake", "boat", "shore", "bank"])) {
        if (lower.includes("river") || lower.includes("water") || lower.includes("stream") || lower.includes("lake") || lower.includes("bank")) {
          return this.print(`${subject} ${actorVerb(this.player, "examine")} the water and its banks. The current looks important, but ${this.player.name === "You" ? "you find" : `${this.player.name} finds`} nothing loose.`);
        }
        return this.print("There is no useful water here.");
      }

      if (matchesAny(text, ["fire", "embers", "pit", "ashes", "smoke"])) {
        if (lower.includes("fire") || lower.includes("ember") || lower.includes("smoke")) return this.print("The remains of fire tell you someone has been here, but there is nothing useful to take.");
        return this.print("There is no fire here.");
      }

      if (matchesAny(text, ["shadow", "shadows", "dark", "darkness", "mist", "mists"])) {
        return this.print(`${subject} ${actorVerb(this.player, "peer")} into the gloom, but it keeps its secrets.`);
      }

      if (relation === "under" || relation === "behind") {
        return this.print(`${subject} ${actorVerb(this.player, "look")} ${relation} the ${text}, but find${this.player.name === "You" ? "" : "s"} nothing hidden.`);
      }
      if (verb === "listen") return this.print(actorizeSecondPerson(this.player, this.ambientSoundMessage(lower)));
      if (verb === "smell") return this.print(actorizeSecondPerson(this.player, this.ambientSmellMessage(lower)));
      if (verb === "knock") return this.print(`${subject} ${actorVerb(this.player, "knock")} on the ${text}, but nothing answers.`);
      if (verb === "touch" || verb === "feel") return this.print(`${subject} ${actorVerb(this.player, verb)} the ${text}, but learn${this.player.name === "You" ? "" : "s"} nothing useful.`);
      this.print(`${subject} ${actorVerb(this.player, "find")} nothing special about the ${text}.`);
    }

    descriptionSentenceFor(target) {
      const text = normalize(target);
      if (!text || ["area", "room", "place", "here", "surroundings"].includes(text)) return "";
      const sentences = (this.room()?.description || "").match(/[^.?!]+[.?!]/g) || [];
      return sentences.find((sentence) => normalize(sentence).includes(text))?.trim() || "";
    }

    ambientSoundMessage(description) {
      const subject = actorSubject(this.player, true);
      if (description.includes("music")) return `${subject} ${actorVerb(this.player, "listen")}. Music and distant voices drift through the air.`;
      if (description.includes("dripping") || description.includes("drips")) return `${subject} ${actorVerb(this.player, "listen")}. Water drips somewhere in the dark.`;
      if (description.includes("wind") || description.includes("howl")) return `${subject} ${actorVerb(this.player, "listen")}. The wind moves restlessly around you.`;
      if (description.includes("river") || description.includes("stream") || description.includes("water")) return `${subject} ${actorVerb(this.player, "listen")}. Water murmurs nearby.`;
      if (description.includes("silence")) return `${subject} ${actorVerb(this.player, "listen")}. The silence feels heavy.`;
      return `${subject} ${actorVerb(this.player, "listen")} carefully, but hear${this.player.name === "You" ? "" : "s"} nothing useful.`;
    }

    ambientSmellMessage(description) {
      if (description.includes("damp") || description.includes("moss") || description.includes("mold")) return "The air smells damp, earthy, and old.";
      if (description.includes("forest") || description.includes("foliage") || description.includes("pine")) return "The air smells of leaves, bark, and wild earth.";
      if (description.includes("fire") || description.includes("ember") || description.includes("smoke")) return "The air carries a faint smoky smell.";
      if (description.includes("food") || description.includes("meal") || description.includes("wine")) return "There is a homely smell of food and drink.";
      if (description.includes("dragon") || description.includes("smaug")) return "The air smells hot, dry, and dangerous.";
      return `${actorSubject(this.player, true)} ${actorVerb(this.player, "smell")} the air, but notice${this.player.name === "You" ? "" : "s"} nothing useful.`;
    }

    inventory() {
      const carriedCharacters = Object.values(this.characters).filter((character) => character.carriedBy === this.player.id);
      const weightText = ` Carry weight: ${this.currentCarryWeight()}/${this.carryCapacity()}.`;
      if (!this.player.inventory.length && !carriedCharacters.length) return this.print(actorizeSecondPerson(this.player, `You are carrying: nothing.${weightText}`));
      const items = this.player.inventory.map((id) => this.inventoryItemLabel(this.items[id]));
      const companionsText = carriedCharacters.length ? ` With you: ${carriedCharacters.map((character) => character.name).join(", ")}.` : "";
      const worn = this.player.worn?.length ? ` You are wearing: ${this.player.worn.map((id) => this.inventoryItemLabel(this.items[id])).join(", ")}.` : "";
      this.print(actorizeSecondPerson(this.player, `You are carrying: ${items.join(", ")}.${companionsText}${worn}${weightText}`));
    }

    wait() {
      if (this.spiderEyesState?.active && this.currentRoom === this.spiderEyesState.room) {
        this.spiderEyesState.waits += 1;
        if (this.spiderEyesState.waits === 1) {
          this.print(actorizeSecondPerson(this.player, "You wait. The pale bulbous eyes linger in the dark."));
          return;
        }
        if (this.spiderEyesState.waits === 2) {
          this.print(actorizeSecondPerson(this.player, "You wait again. The eyes drift aside for a moment."));
          return;
        }
        this.killBySpiderEyes();
        return;
      }
      const subject = actorSubject(this.player, true);
      this.print(`${subject} ${actorVerb(this.player, "wait")}.`);
      this.print("Time passes...");
      this.handleTimedSpecials();
    }

    hello() {
      if (this.player.name === "You" && this.player.wearingRing && this.player.noticeable === false) {
        const replies = this.peopleInRoom()
          .filter((p) => p.name !== "You" && p.friendly === true && !this.unexpectedParty?.blocksGreetingResponse(p))
          .map((p) => `${p.name} says 'who's talking?'`);
        return this.print(replies.length ? replies.join("\n") : "No one responds to your greeting.");
      }
      const greeter = this.player.name === "You" ? "you" : this.player.name;
      const replies = this.peopleInRoom()
        .filter((p) => p.name !== "You" && p.friendly === true && !this.unexpectedParty?.blocksGreetingResponse(p))
        .map((p) => `${p.name} says hello to ${greeter}.`);
      this.print(replies.length ? replies.join("\n") : (this.player.name === "You" ? "No one responds to your greeting." : `No one responds to ${this.player.name}'s greeting.`));
    }

    tips(object) {
      const tips = this.data.responses.location_based_tips?.[this.room().name] || this.data.responses.general_tips || [];
      if (object === "on") {
        this.tipsEnabled = true;
        this.tipIndex = 0;
        return this.print("Tutorial enabled.");
      }
      if (object === "off") {
        this.tipsEnabled = false;
        return this.print("Tutorial disabled.");
      }
      if (!tips.length) return this.print("No tips available at the moment.");
      this.print(tips[this.tipIndex % tips.length]);
      this.tipIndex += 1;
    }

    verbs() {
      const base = Object.keys({
        take: 1, leave: 1, open: 1, close: 1, unlock: 1, lock: 1, look: 1,
        examine: 1, wait: 1, attack: 1, give: 1, eat: 1, break: 1,
        drink: 1, inventory: 1, save: 1, load: 1, go: 1, climb: 1, throw: 1,
        jump: 1, sit: 1, stand: 1, sleep: 1, rest: 1, run: 1, wake: 1,
        crawl: 1, leap: 1, dive: 1, swim: 1, ride: 1, listen: 1, smell: 1,
        touch: 1, feel: 1, knock: 1, watch: 1, search: 1,
        push: 1, pull: 1, wear: 1, remove: 1, hello: 1, combine: 1, autoplay: 1,
        map: 1, tips: 1, music: 1, mend: 1, repair: 1, fix: 1,
      });
      const special = this.data.specialActions.map((action) => action.verb);
      this.print("Allowed verbs are: " + [...new Set([...base, ...special])].sort().join(", "));
    }

    save(name) {
      if (!name) return this.print("Error: You must specify a filename to save.");
      localStorage.setItem(SAVE_PREFIX + name, JSON.stringify(this.createSnapshot()));
      this.print(`Game saved as "${name}".`);
    }

    load(name) {
      if (!name) return this.print("Error: You must specify a filename to load.");
      const raw = localStorage.getItem(SAVE_PREFIX + name);
      if (!raw) return this.print(`No saved game named "${name}" was found.`);
      const save = JSON.parse(raw);
      this.restoreSnapshot(save);
      this.print(`Game "${name}" loaded.`);
      this.describeRoom({ full: true });
    }

    listSaves() {
      const saves = Object.keys(localStorage).filter((key) => key.startsWith(SAVE_PREFIX)).map((key) => key.slice(SAVE_PREFIX.length));
      this.print(saves.length ? `Saved games:\n${saves.join("\n")}` : "No saved games found.");
    }

    quit() {
      this.endGame(this.player.name === "You" ? "You quit" : `${this.player.name} quits`);
    }

    createSnapshot() {
      return clone({
        items: this.items,
        doors: this.doors,
        characters: this.characters,
        currentRoom: this.currentRoom,
        storySeed: this.storySeed,
        storyRunCount: this.storyRunCount,
        flags: this.flags,
        visitedRooms: [...this.visitedRooms],
        visitedTrollsClearing: this.visitedTrollsClearing,
        waitCounter: this.waitCounter,
        secretDoorWaitCounter: this.secretDoorWaitCounter,
        trollsTransformed: this.trollsTransformed,
        trollsDefeated: this.trollsDefeated,
        spiderEyesState: this.spiderEyesState,
        gollumState: this.gollumState,
        turnCount: this.turnCount,
        endgame: this.endgame,
        unexpectedParty: this.unexpectedParty?.serialize(),
      });
    }

    restoreSnapshot(save) {
      this.clearArrivalNoticeTimers();
      this.stopAutoplay();
      this.items = save.items;
      this.doors = save.doors;
      this.characters = save.characters;
      this.currentRoom = save.currentRoom;
      this.storySeed = Number(save.storySeed) || this.nextStorySeed();
      this.storyRunCount = Number(save.storyRunCount) || this.storyRunCount;
      this.flags = save.flags || {};
      this.visitedRooms = new Set(save.visitedRooms || [this.currentRoom]);
      this.visitedTrollsClearing = Boolean(save.visitedTrollsClearing);
      this.waitCounter = save.waitCounter || 0;
      this.secretDoorWaitCounter = save.secretDoorWaitCounter || 0;
      this.trollsTransformed = Boolean(save.trollsTransformed);
      this.trollsDefeated = Boolean(save.trollsDefeated);
      this.spiderEyesState = save.spiderEyesState || null;
      this.gollumState = this.restoreGollumState(save.gollumState);
      this.turnCount = Number(save.turnCount) || 0;
      this.endgame = false;
      this.endgameRestartArmed = false;
      this.pendingEndgameChoice = null;
      this.player = this.characters[this.data.player];
      this.normalizeCharacterMovementModes();
      this.normalizeLanternState();
      this.addZXFinaleState();
      this.unexpectedParty?.load(save.unexpectedParty || null);
      output.replaceChildren();
      output.classList.remove("end-screen");
      input.value = "";
      input.focus();
      this.render();
    }

    recordAutosave(label, options = {}) {
      if (this.endgame) return false;
      const key = options.key || `${this.currentRoom}:${label}`;
      const turnCount = Number(this.turnCount) || 0;
      const previous = this.autosaveMeta;
      if (!options.force && previous?.key === key && previous?.turnCount === turnCount) return false;
      this.autosaveSnapshot = this.createSnapshot();
      this.autosaveCounter += 1;
      this.autosaveMeta = {
        id: this.autosaveCounter,
        key,
        label,
        roomId: this.currentRoom,
        roomName: this.room()?.name || this.currentRoom,
        turnCount,
      };
      this.print(`Autosave: ${label}.`, "system");
      return true;
    }

    resumeFromAutosave() {
      if (!this.autosaveSnapshot) {
        this.print("There is no autosave available.", "system");
        return false;
      }
      this.restoreSnapshot(clone(this.autosaveSnapshot));
      this.print(`Resumed from autosave${this.autosaveMeta?.label ? `: ${this.autosaveMeta.label}` : ""}.`, "system");
      this.describeRoom({ full: true });
      return true;
    }

    showMap() {
      const exits = this.roomConnections().map((c) => `${c.direction}: ${this.rooms[c.to]?.name || c.to}`).join("\n");
      this.print(exits ? `From here:\n${exits}` : "No exits are visible from here.");
    }

    handleMusicCommand(object) {
      if (object === "off") {
        this.audio.pause();
        this.musicEnabled = false;
        return this.print("Music muted.");
      }
      if (object === "on" || !object) return this.startMusic();
      this.print('Use "music on" or "music off".');
    }

    toggleMusic() {
      if (this.musicEnabled && !this.audio.paused) {
        this.audio.pause();
        this.musicEnabled = false;
        this.print("Music muted.");
        return;
      }
      this.startMusic();
    }

    autoplay(object = "") {
      const mode = normalize(object);
      if (mode === "stop" || mode === "off") return this.stopAutoplay("Autoplay stopped.");
      if (this.autoplayRunning) return this.print("Autoplay is already running. Type 'stop autoplay' or 'autoplay stop' to stop it.", "system");
      this.autoplayMode = mode === "fast" ? "fast" : "slow";
      this.autoplayDelay = this.autoplayMode === "fast" ? 450 : 2700;
      this.autoplayRunning = true;
      this.autoplayWaits = 0;
      this.autoplayRunId += 1;
      this.print(`Autoplay ${this.autoplayMode} started. Type 'stop autoplay' or 'autoplay stop' to stop it.`, "system");
      this.scheduleAutoplayStep();
    }

    scheduleAutoplayStep(delay = this.autoplayDelay) {
      if (!this.autoplayRunning) return;
      const runId = this.autoplayRunId;
      clearTimeout(this.autoplayTimer);
      this.autoplayTimer = setTimeout(() => this.runAutoplayStep(runId), delay);
    }

    runAutoplayStep(runId = this.autoplayRunId) {
      if (!this.autoplayRunning || runId !== this.autoplayRunId) return;
      if (this.endgame) return this.stopAutoplay("Autoplay finished.");
      const command = this.nextAutoplayCommand();
      if (!command) return this.stopAutoplay("Autoplay stopped: no safe next command was found.");
      this.typeAutoplayCommand(command, runId);
    }

    typeAutoplayCommand(command, runId) {
      clearTimeout(this.autoplayTypingTimer);
      input.value = "";
      input.focus();
      let index = 0;
      const typeDelay = this.autoplayMode === "slow" ? 42 : 6;
      const submitDelay = this.autoplayMode === "slow" ? 180 : 20;
      const typeNext = () => {
        if (!this.autoplayRunning || runId !== this.autoplayRunId) return;
        input.value = command.slice(0, index);
        if (index >= command.length) {
          this.autoplayTypingTimer = setTimeout(() => this.executeAutoplayCommand(command, runId), submitDelay);
          return;
        }
        index += 1;
        this.autoplayTypingTimer = setTimeout(typeNext, typeDelay);
      };
      typeNext();
    }

    executeAutoplayCommand(command, runId) {
      if (!this.autoplayRunning || runId !== this.autoplayRunId) return;
      input.value = "";
      this.print(`> ${command}`, "command");
      this.autoplayCapturedText = "";
      this.autoplayCapturingOutput = true;
      try {
        this.execute(command);
      } finally {
        this.autoplayCapturingOutput = false;
      }
      if (!this.autoplayRunning || runId !== this.autoplayRunId) return;
      if (this.endgame) return this.stopAutoplay("Autoplay finished.");
      this.scheduleAutoplayStep(this.autoplayDelayForText(this.autoplayCapturedText));
    }

    stopAutoplay(message) {
      clearTimeout(this.autoplayTimer);
      clearTimeout(this.autoplayTypingTimer);
      this.autoplayTimer = null;
      this.autoplayTypingTimer = null;
      this.autoplayRunning = false;
      this.autoplayRunId += 1;
      input.value = "";
      if (message) this.print(message, "system");
    }

    autoplayDelayForText(text) {
      if (this.autoplayMode !== "slow") return this.autoplayDelay;
      const cleaned = String(text || "").replace(/\s+/g, " ").trim();
      if (!cleaned) return this.autoplayDelay;
      const words = cleaned.split(/\s+/).filter(Boolean).length;
      const sentencePauses = (cleaned.match(/[.!?]/g) || []).length;
      const readingDelay = 1050 + words * 248 + sentencePauses * 338;
      return Math.max(this.autoplayDelay, Math.min(readingDelay, 16500));
    }

    autoplayShouldLightLantern() {
      if (this.hasActiveLantern()) return false;
      if (this.currentRoom === "deep_dark_lake" && this.gollumState?.pocketQuestionAsked && this.player.noticeable !== false) return false;
      if (this.roomNeedsLantern(this.currentRoom)) return true;
      if (this.currentRoom === "green_dragon_inn" && !this.flags.seenpony) return true;
      return false;
    }

    nextAutoplayCommand() {
      const beforeDragonDefeat = !this.flags.dragondefeated;

      if (this.spiderEyesState?.active && this.currentRoom === this.spiderEyesState.room) {
        if ((this.spiderEyesState.waits || 0) < 2) return "wait";
        return this.spiderEyesState.safeDirections?.[0] || null;
      }

      if (this.currentRoom === "lower_halls" && this.liveDragon() && this.flags.bardreadiedarrow) {
        return "say to bard \"shoot dragon\"";
      }

      if (beforeDragonDefeat && !this.autoplayHas("small key")) {
        if (this.currentRoom !== "hobbit_hole") return this.autoplayRouteCommandTo("hobbit_hole");
        if (!this.visibleSearch("small key")) return "lift carpet";
        return "take small key";
      }

      if (beforeDragonDefeat && !this.autoplayHas("firestone")) {
        if (this.currentRoom !== "hobbit_hole") return this.autoplayRouteCommandTo("hobbit_hole");
        const topDrawer = this.items.top_drawer;
        const ornateBox = this.items.ornate_box;
        if (topDrawer && !topDrawer.open) return "open top drawer";
        if (!this.flags.autoplayexaminedtopdrawer) return this.autoplayOnce("autoplayexaminedtopdrawer", "examine top drawer");
        if (ornateBox && !this.player.inventory.includes(ornateBox.id)) return "take ornate box";
        if (ornateBox && !ornateBox.open) return "open ornate box";
        if (!this.flags.autoplayexaminedornatebox) return this.autoplayOnce("autoplayexaminedornatebox", "examine ornate box");
        return "take firestone";
      }

      if (beforeDragonDefeat && !this.autoplayHas("sturdy key")) {
        if (this.currentRoom !== "hobbit_hole") return this.autoplayRouteCommandTo("hobbit_hole");
        const bottomDrawer = this.items.bottom_drawer;
        if (bottomDrawer && !bottomDrawer.open) return "open bottom drawer";
        if (!this.flags.autoplayexaminedbottomdrawer) return this.autoplayOnce("autoplayexaminedbottomdrawer", "examine bottom drawer");
        return "take sturdy key";
      }

      if (beforeDragonDefeat && !this.autoplayHas("brass lantern")) {
        if (this.currentRoom !== "bilbos_garden") return this.autoplayRouteCommandTo("bilbos_garden");
        const shed = this.items.garden_shed;
        if (shed?.locked) return "unlock garden shed";
        if (shed && !shed.open) return "open garden shed";
        if (!this.flags.autoplayexaminedgardenshed) return this.autoplayOnce("autoplayexaminedgardenshed", "examine garden shed");
        return "take lantern";
      }

      if (beforeDragonDefeat && this.autoplayShouldLightLantern()) return "light lantern";

      if (beforeDragonDefeat && !this.flags.seenpony) {
        const thorin = Object.values(this.characters).find((character) => matches(character.name, "thorin"));
        if (this.currentRoom !== "green_dragon_inn") return this.autoplayRouteCommandTo("green_dragon_inn");
        if (thorin?.position !== this.currentRoom) thorin.position = this.currentRoom;
        return "say to thorin \"look through window\"";
      }

      if (beforeDragonDefeat && !this.visitedRooms.has("dreary") && this.currentRoom !== "dreary") {
        if (this.currentRoom !== "green_dragon_inn_outside") return this.autoplayRouteCommandTo("green_dragon_inn_outside");
        if (!this.items.low_branch?.visible) return "examine oak tree";
        return "climb branch";
      }

      if (beforeDragonDefeat && !this.autoplayHas("large key")) {
        if (!this.visitedTrollsClearing) return this.autoplayRouteCommandTo("trolls_clearing");
        if (this.currentRoom !== "trolls_clearing") return this.autoplayRouteCommandTo("trolls_clearing");
        if (!this.trollsTransformed) return "carefully take large key and south west";
        return "take large key";
      }

      if (beforeDragonDefeat && !this.autoplayHas("majestic sword")) {
        if (this.currentRoom !== "trolls_cave") return this.autoplayRouteCommandTo("trolls_cave");
        const chest = this.items.arcane_chest;
        if (!chest.visible) return this.hasActiveLantern() ? "examine discarded armor" : "carefully examine discarded armor";
        if (!chest.open) return "open arcane chest";
        if (!this.flags.autoplayexaminedarcanechest) return this.autoplayOnce("autoplayexaminedarcanechest", "examine arcane chest");
        const prepSwordLoad = this.autoplayRequiredPickupPrepCommand("majestic sword");
        if (prepSwordLoad) return prepSwordLoad;
        return "take sword";
      }

      if (beforeDragonDefeat && !this.autoplayHas("sturdy rope")) {
        if (this.currentRoom !== "trolls_cave") return this.autoplayRouteCommandTo("trolls_cave");
        const prepRopeLoad = this.autoplayRequiredPickupPrepCommand("sturdy rope");
        if (prepRopeLoad) return prepRopeLoad;
        return "take rope";
      }

      if (beforeDragonDefeat && this.currentRoom === "deep_dark_lake" && !this.gollumState?.pocketQuestionAsked) {
        if (!this.gollumState?.met) return "look";
        if (this.gollumState?.awaitingAnswer) {
          const riddle = this.currentGollumRiddle();
          if (riddle?.answers?.[0]) return `answer ${riddle.answers[0]}`;
          return "ask gollum a riddle";
        }
        if (this.gollumState?.awaitingPlayerRiddle) return "say to gollum \"what have i got in my pocket\"";
        return "ask gollum a riddle";
      }

      if (beforeDragonDefeat && this.currentRoom === "deep_dark_lake" && this.gollumState?.pocketQuestionAsked) {
        if (this.player.noticeable !== false) return "wear ring";
        return "north";
      }

      const hostile = this.peopleInRoom().find((character) => {
        return character.visible && character.friendly === false && !matches(character.name, "dragon");
      });
      if (beforeDragonDefeat && hostile && this.autoplayHas("majestic sword")) return `kill ${hostile.name} with sword`;

      if (beforeDragonDefeat && this.visitedTrollsClearing && this.autoplayHas("large key") && !this.trollsTransformed && this.currentRoom !== "trolls_clearing") return "wait";

      if (beforeDragonDefeat && !this.autoplayHas("golden ring")) {
        if (this.currentRoom === "deep_dark_lake") {
          if (!this.gollumState?.met) return "look";
          if (this.gollumState?.awaitingAnswer) {
            const riddle = this.currentGollumRiddle();
            if (riddle?.answers?.[0]) return `answer ${riddle.answers[0]}`;
            return "ask gollum a riddle";
          }
          if (this.gollumState?.awaitingPlayerRiddle) return "say to gollum \"what have i got in my pocket\"";
          if (this.gollumState?.pocketQuestionAsked && this.player.noticeable !== false) return "wear ring";
          if (this.gollumState?.pocketQuestionAsked && this.player.noticeable === false) return "north";
          return "ask gollum a riddle";
        }
        return this.autoplayRouteCommandTo("deep_dark_lake");
      }

      if (beforeDragonDefeat && (this.player.strength || 1) < 6) {
        if (this.currentRoom !== "beorns_house") return this.autoplayRouteCommandTo("beorns_house");
        if (this.autoplayHas("meal")) return "eat meal";
        const curtain = this.items.curtain;
        const cupboard = this.items.cupboard;
        if (curtain && !curtain.open) return "open curtain";
        if (cupboard && !cupboard.open) return "open cupboard";
        if (!this.flags.autoplayexaminedcupboard) return this.autoplayOnce("autoplayexaminedcupboard", "examine cupboard");
        return "take meal";
      }

      if (this.currentRoom === "west_bank") {
        if (!this.flags.seenboat) return "look across river";
        if (!this.flags.ropeinboat) return "throw rope across river";
        if (!this.flags.boatiswest) return "pull rope";
        return "climb into boat";
      }

      if (this.currentRoom === "dark_dungeon") {
        const redDoor = this.doors.porta_dark_dungeon_cellar;
        if (redDoor && !redDoor.open) return this.autoplayHas("majestic sword") ? "break red door with sword" : "wait";
        return "south west";
      }

      if (this.currentRoom === "cellar") {
        const trapDoor = this.doors.porta_cellar_long_lake;
        if (trapDoor && !trapDoor.open) return "open trap door";
        return "down";
      }

      const bard = Object.values(this.characters).find((character) => matches(character.name, "bard"));
      if (!this.flags.dragondefeated) {
        const bardWithPlayer = bard?.carriedBy === this.player.id
          || (bard?.movementMode === "follow" && bard?.position === this.currentRoom && bard.visible);
        if (!bardWithPlayer) {
          if (bard?.position === this.currentRoom && bard.visible) return "pick up bard";
          const bardCorridor = {
            elvish_clearing: "north east",
            elvenkings_halls: "south",
            cellar: this.doors.porta_cellar_long_lake?.open ? "down" : "open trap door",
            long_lake: "east",
          };
          if (bardCorridor[this.currentRoom]) return bardCorridor[this.currentRoom];
          const commandToBard = this.autoplayRouteCommandTo(bard?.position || "wooden_town");
          if (commandToBard) return commandToBard;
          return this.autoplayRouteCommandTo("west_bank");
        }

        if (!this.flags.bardreadiedarrow) return "say to bard \"get strong arrow from quiver\"";
      }

      if (this.currentRoom === "lower_halls" && !this.autoplayHas("treasure")) {
        if (this.liveDragon()) {
          return "say to bard \"shoot dragon\"";
        }
        const prepTreasureLoad = this.autoplayTreasurePickupPrepCommand();
        if (prepTreasureLoad) return prepTreasureLoad;
        return "take treasure";
      }

      if (!this.autoplayHas("treasure")) return this.autoplayRouteCommandTo("lower_halls");

      if (this.autoplayHas("treasure") && this.currentRoom !== "hobbit_hole") return this.autoplayRouteCommandTo("hobbit_hole");

      if (this.autoplayHas("treasure") && this.currentRoom === "hobbit_hole") {
        const chest = this.items.heavy_wooden_chest;
        if (chest.locked) return "unlock chest";
        if (!chest.open) return "open chest";
        return "put treasure in chest";
      }

      return null;
    }

    autoplayHas(name) {
      return [...this.player.inventory, ...(this.player.worn || [])].some((itemId) => matches(this.items[itemId]?.name, name));
    }

    autoplayTreasurePickupPrepCommand() {
      if (this.autoplayHas("treasure")) return null;
      if (!["front_gate", "lower_halls"].includes(this.currentRoom)) return null;
      const treasure = this.items.treasure;
      if (!treasure) return null;
      const spareCapacity = this.carryCapacity() - this.currentCarryWeight();
      if (spareCapacity >= (treasure.weight || 0)) return null;
      const expendable = [
        "golden ring",
        "firestone",
        "sturdy key",
        "brass lantern",
        "sturdy rope",
        "majestic sword",
        "large key",
        "small key",
      ];
      for (const name of expendable) {
        if (this.autoplayHas(name)) return `drop ${name}`;
      }
      return null;
    }

    autoplayRequiredPickupPrepCommand(itemName) {
      const item = this.findKnownItem(itemName);
      if (!item) return null;
      const spareCapacity = this.carryCapacity() - this.currentCarryWeight();
      if (spareCapacity >= (item.weight || 0)) return null;
      const expendableByNeed = {
        "majestic sword": ["ornate box", "small key", "sturdy key"],
        "sturdy rope": ["ornate box", "small key", "sturdy key", "firestone", "brass lantern"],
        "golden ring": ["ornate box"],
      };
      const expendable = expendableByNeed[item.name] || [];
      for (const name of expendable) {
        if (this.autoplayHas(name)) return `drop ${name}`;
      }
      return null;
    }

    autoplayOnce(flag, command) {
      this.flags[flag] = true;
      return command;
    }

    autoplayRouteCommandTo(destination) {
      const path = this.autoplayPathTo(destination);
      if (!path?.length) return null;
      const connection = path[0];
      const visibleConnection = this.roomConnections().find((candidate) => candidate.direction === connection.direction);
      const actualConnection = visibleConnection || connection;
      const web = this.blockingWebFor(connection);
      if (web && !web.broken) return "smash web";
      const woodElf = Object.values(this.characters).find((character) => matches(character.name, "wood elf") && character.visible);
      if (woodElf?.position === connection.to && this.autoplayHas("golden ring") && this.player.noticeable !== false) return "wear ring";
      const door = actualConnection.door && this.doors[actualConnection.door];
      if (door && !door.open && !door.broken) {
        if (door.locked && this.keyFor(door)) return `unlock ${door.name}`;
        if (door.locked && this.autoplayHas("majestic sword")) return `break ${door.name} with sword`;
        return `open ${door.name}`;
      }
      if (!this.hasActiveLantern() && this.autoplayHas("brass lantern") && this.roomNeedsLantern(connection.to)) {
        return "light lantern";
      }
      return connection.direction;
    }

    autoplayPathTo(destination) {
      if (!destination || this.currentRoom === destination) return [];
      const queue = [{ room: this.currentRoom, path: [] }];
      const seen = new Set([this.currentRoom]);
      while (queue.length) {
        const current = queue.shift();
        for (const connection of this.connectionsFromVisible(current.room)) {
          if (seen.has(connection.to) || !this.autoplayCanPlanConnection(connection)) continue;
          const path = [...current.path, connection];
          if (connection.to === destination) return path;
          seen.add(connection.to);
          queue.push({ room: connection.to, path });
        }
      }
      return null;
    }

    autoplayCanPlanConnection(connection) {
      const door = connection.door && this.doors[connection.door];
      if (!door || door.broken) return true;
      if (matches(door.name, "secret door") && !this.flags.secretdoorsun) return false;
      if (door.locked && !this.keyFor(door) && !this.autoplayHas("majestic sword")) return false;
      return true;
    }

    startMusic() {
      const track = this.trackForRoom();
      if (!track) return this.print("No music track is available.");
      const src = new URL(assetUrl(MUSIC_ROOT, track), window.location.href).href;
      if (this.currentTrack !== track || this.audio.src !== src) {
        this.currentTrack = track;
        this.audioErrorShown = false;
        this.audio.src = src;
        this.audio.load();
      }
      this.audio.play()
        .then(() => {
          this.musicEnabled = true;
          this.print(`Music playing: ${track}.`);
        })
        .catch(() => {
          this.musicEnabled = false;
          this.print("Audio is loaded in the player. Press play in the audio control.", "system");
        });
    }

    trackForRoom() {
      const sound = this.room().sound;
      const tracks = {
        relaxed: ["Almost New relaxed.mp3", "Midnight Tale relaxed.mp3", "Royal Coupling relaxed.mp3"],
        adventure: ["Crossing the Chasm adventure.mp3", "Eternal Terminal adventure.mp3", "Gothamlicious adventure.mp3", "Strength of the Titans adventure.mp3", "The Ice Giants adventure.mp3"],
        suspence: ["Ancient Rite suspence.mp3", "Myst on the Moor suspence.mp3", "Night Vigil suspence.mp3", "The Descent suspence.mp3"],
      };
      const list = tracks[sound] || tracks.relaxed;
      const index = Math.abs(hashString(this.room().name)) % list.length;
      return list[index];
    }

    wear(objectName) {
      const item = this.findInInventory(objectName);
      if (!item) return this.print(this.heldItemMessage(objectName) || "You don't have that.");
      if (matches(item.name, "golden ring") || normalize(objectName).includes("ring")) {
        this.detachItem(item.id);
        item.worn = true;
        this.player.worn.push(item.id);
        this.player.wearingRing = true;
        this.player.noticeable = false;
        this.player.ringTimer = 5;
        for (const character of this.peopleInRoom()) {
          if (character.movementMode === "follow" && character.id !== this.player.id) character.followingPlayer = false;
        }
        return this.print(this.player.name === "You" ? "You wear the golden ring and become unnoticeable." : `${this.player.name} wears the golden ring and becomes unnoticeable.`);
      }
      if (!item.wearable) return this.print(`The ${item.name} cannot be worn.`);
      this.detachItem(item.id);
      item.worn = true;
      this.player.worn.push(item.id);
      this.print(actorizeSecondPerson(this.player, `You wear the ${item.name}.`));
    }

    remove(objectName) {
      const name = normalize(objectName);
      const id = this.player.worn.find((itemId) => matches(this.items[itemId]?.name, name));
      if (!id && name.includes("ring") && this.player.wearingRing) {
        return this.removeRing();
      }
      if (!id) return this.print(this.heldItemMessage(objectName) || actorizeSecondPerson(this.player, `You don't have the ${objectName} to remove.`));
      if (matches(this.items[id].name, "golden ring")) {
        return this.removeRing(id);
      }
      this.player.worn = this.player.worn.filter((itemId) => itemId !== id);
      this.items[id].worn = false;
      this.items[id].location = { type: "character", id: this.player.id };
      this.player.inventory.push(id);
      this.print(actorizeSecondPerson(this.player, `You remove the ${this.items[id].name}.`));
    }

    removeRing(ringId = null) {
      if (!this.player.wearingRing) return this.print(this.player.name === "You" ? "You are not wearing the golden ring." : `${this.player.name} is not wearing the golden ring.`);
      const id = ringId || this.player.worn.find((itemId) => matches(this.items[itemId]?.name, "golden ring"));
      this.player.wearingRing = false;
      this.player.noticeable = true;
      this.player.ringTimer = 0;
      if (id) {
        this.player.worn = this.player.worn.filter((itemId) => itemId !== id);
        this.items[id].worn = false;
        this.items[id].location = { type: "character", id: this.player.id };
        if (!this.player.inventory.includes(id)) this.player.inventory.push(id);
      }
      this.print(this.player.name === "You" ? "You remove the golden ring and become noticeable again." : `${this.player.name} removes the golden ring and becomes noticeable again.`);
    }

    give(command) {
      const parsed = this.parseGiveCommand(command);
      if (!parsed) return this.print("Use: give [item] to [character].");
      const item = this.findInInventory(parsed.itemName);
      const target = this.resolveCharacterTarget(parsed.targetName);
      if (!item) return this.print(this.heldItemMessage(parsed.itemName) || `${this.player.name} does not have the ${parsed.itemName}.`);
      if (!target) return this.print(`There is no one named ${parsed.targetName} here.`);
      if (this.unexpectedParty?.blocksDirectInteraction(target, "gift")) return;
      if (target.id === this.player.id) return this.print(`${this.player.name} already has the ${item.name}.`);
      this.detachItem(item.id);
      item.location = { type: "character", id: target.id };
      target.inventory.push(item.id);
      this.print(`${actorSubject(this.player, true)} ${actorVerb(this.player, "give")} the ${item.name} to ${target.name}.`);
      this.reactToGift(target, item);
    }

    show(command) {
      const parsed = this.parseGiveCommand(command);
      if (!parsed) return this.print("Use: show [item] to [character].");
      const item = this.findInInventory(parsed.itemName);
      const target = this.resolveCharacterTarget(parsed.targetName);
      if (!item) return this.print(this.heldItemMessage(parsed.itemName) || `${this.player.name} does not have the ${parsed.itemName}.`);
      if (!target) return this.print(`There is no one named ${parsed.targetName} here.`);
      if (this.unexpectedParty?.blocksDirectInteraction(target, "gift")) return;
      this.print(`${actorSubject(this.player, true)} ${actorVerb(this.player, "show")} the ${item.name} to ${target.name}.`);
      this.reactToShownItem(target, item);
    }

    reactToShownItem(character, item) {
      if ((matches(character.name, "gandalf") || matches(character.name, "elrond")) && matches(item.name, "curious map")) {
        return this.print(`${character.name} studies the ${item.name} carefully.`);
      }
      this.print(`${character.name} looks at the ${item.name}, but says nothing useful.`);
    }

    askFor(command) {
      const conversation = this.parseAskConversationCommand(command);
      const delegated = conversation ? null : this.parseAskToCommand(command);
      const parsed = this.parseAskForCommand(command);
      const resolved = conversation || delegated || parsed;
      if (!resolved) return this.print("Use: ask [character] for [item], or ask [character] to [command].");
      if (resolved.topic) return this.askCharacterAbout(resolved.characterName, resolved.topic);
      if (resolved.order) return this.askCharacterTo(resolved.characterName, resolved.order);
      return this.askCharacterForItem(resolved.characterName, resolved.itemName);
    }

    askCharacterForItem(characterName, itemName) {
      const character = this.resolveAskForCharacterTarget(characterName, itemName);
      if (!character) return this.print(`There is no one named ${characterName} here.`);
      if (this.unexpectedParty?.blocksDirectInteraction(character, "item")) return;
      const special = this.specialAskForResponse(character, itemName);
      if (special) return this.print(special);
      const requestedCharacter = this.findKnownCharacter(itemName);
      if (requestedCharacter) {
        this.rememberConversationCharacter(character);
        this.rememberReferencedCharacter(requestedCharacter);
        return this.askCharacterAbout(character.name, `where ${requestedCharacter.name} is`);
      }
      return this.receiveItemFromCharacter(character, itemName);
    }

    specialAskForResponse(character, itemName) {
      const text = normalize(itemName);
      if (matches(character.name, "beorn") && matchesAny(text, ["food", "meal", "supper", "breakfast", "shelter", "rest"])) {
        return "Beorn says 'There is food and a roof for honest guests. Help yourself, but do not mistake hospitality for weakness.'";
      }
      if (matches(character.name, "elrond") && matchesAny(text, ["advice", "help", "counsel", "map"])) {
        return "Elrond says 'What aid I may offer is best received in thought, and not in haste.'";
      }
      return "";
    }

    resolveAskForCharacterTarget(characterName, itemName) {
      const directTarget = this.resolveCharacterTarget(characterName);
      if (directTarget) return directTarget;
      const pronoun = normalize(characterName);
      if (!["him", "her", "them"].includes(pronoun)) return null;
      const visibleHolder = this.findVisibleCharacterHolding(itemName)?.character;
      if (visibleHolder) return visibleHolder;
      const lastConversation = this.lastConversationCharacter();
      if (lastConversation?.position === this.currentRoom && lastConversation.visible) return lastConversation;
      const lastReferenced = this.lastReferencedCharacter();
      if (lastReferenced?.position === this.currentRoom && lastReferenced.visible) return lastReferenced;
      return null;
    }

    receiveItemFromCharacter(character, itemName) {
      if (character.friendly === false) return this.respondToTalk(character);
      if (this.player.name === "You" && this.player.noticeable === false) return this.print(`${character.name} says 'who's talking?'`);
      const held = this.findCharacterItem(character, itemName);
      if (!held) return this.print(`${character.name} does not have the ${itemName}.`);
      if (held.worn) return this.print(`${character.name} is wearing the ${held.item.name}.`);
      if (!this.canCarryAdditionalWeight(held.item.weight || 0)) return this.print(this.carryTooMuchMessage(held.item));
      this.detachItem(held.item.id);
      held.item.location = { type: "character", id: this.player.id };
      this.player.inventory.push(held.item.id);
      this.print(`${character.name} gives you the ${held.item.name}.`);
    }

    takeItemFromCharacter(character, itemName) {
      if (character.friendly === false) return this.respondToTalk(character);
      const held = this.findCharacterItem(character, itemName);
      if (!held) return this.print(`${character.name} does not have the ${itemName}.`);
      if (held.worn) return this.print(`${character.name} is wearing the ${held.item.name}.`);
      if (!this.canCarryAdditionalWeight(held.item.weight || 0)) return this.print(this.carryTooMuchMessage(held.item));
      this.detachItem(held.item.id);
      held.item.location = { type: "character", id: this.player.id };
      this.player.inventory.push(held.item.id);
      this.print(`${actorSubject(this.player, true)} ${actorVerb(this.player, "take")} the ${held.item.name} from ${character.name}.`);
    }

    askCharacterTo(characterName, order) {
      const character = this.resolveCharacterTarget(characterName);
      if (!character) return this.print(`There is no one named ${characterName} here.`);
      if (character.friendly === false) return this.respondToTalk(character);
      if (this.player.name === "You" && this.player.noticeable === false) return this.print(`${character.name} says 'who's talking?'`);
      if (this.unexpectedParty?.blocksDirectInteraction(character, "order")) return;
      this.rememberConversationCharacter(character);
      this.rememberReferencedCharacter(order);
      if (this.handleBardDragonCommand(character, order)) return;
      this.delegateCharacterOrder(character, order);
    }

    delegateCharacterOrder(character, order) {
      this.rememberConversationCharacter(character);
      this.rememberReferencedCharacter(order);
      const delegatedSplitter = this.delegatedSplitterFor(character);
      this.seedDelegatedSplitter(delegatedSplitter);
      for (const action of delegatedSplitter.split(order)) {
        const interpreted = this.interpretFriendlyOrder(character, action);
        if (interpreted.message) this.print(interpreted.message);
        if (!interpreted.action) continue;
        const moved = this.processCommand(interpreted.action, character);
        if (moved) break;
      }
      this.rememberDelegatedSplitter(delegatedSplitter);
    }

    delegatedSplitterFor(character) {
      if (!character?.id) return new CommandSplitter(this.data);
      if (!this.delegatedSplitters.has(character.id)) {
        this.delegatedSplitters.set(character.id, new CommandSplitter(this.data));
      }
      return this.delegatedSplitters.get(character.id);
    }

    seedDelegatedSplitter(splitter) {
      if (!splitter) return;
      splitter.lastObject ||= this.sharedDelegatedContext.lastObject;
      splitter.lastDirectObject ||= this.sharedDelegatedContext.lastDirectObject;
      splitter.lastTargetObject ||= this.sharedDelegatedContext.lastTargetObject;
    }

    rememberDelegatedSplitter(splitter) {
      if (!splitter) return;
      this.sharedDelegatedContext = {
        lastObject: splitter.lastObject || this.sharedDelegatedContext.lastObject,
        lastDirectObject: splitter.lastDirectObject || this.sharedDelegatedContext.lastDirectObject,
        lastTargetObject: splitter.lastTargetObject || this.sharedDelegatedContext.lastTargetObject,
      };
    }

    interpretFriendlyOrder(character, action) {
      const text = normalize(action);
      const [verb, ...restWords] = text.split(/\s+/);
      const object = restWords.join(" ").trim();

      const progressive = this.progressiveFriendlyOrder(character, verb, object, text);
      if (progressive) return progressive;

      if (verb === "wait" && /\b(?:until|till)\b/.test(object)) {
        return {
          message: `${character.name} says 'I will wait a while, but not forever.'`,
          action: "wait",
        };
      }

      const protectedMessage = this.protectedOrderRefusal(character, verb, object);
      if (protectedMessage) return { message: protectedMessage, action: "" };

      return { message: "", action };
    }

    progressiveFriendlyOrder(character, verb, object, action) {
      const guardedVerbs = new Set(["give", "hand", "pass", "send", "deliver", "return"]);
      if (!guardedVerbs.has(verb) || !matches(character.name, "gandalf")) return null;

      const parsed = this.parseGiveCommand(object);
      const itemName = parsed?.itemName || object.split(" to ")[0]?.trim() || object;
      const item = this.findCharacterItem(character, itemName)?.item;
      const actualName = item?.name || itemName;
      if (!matches(actualName, "curious map")) return null;

      const key = "gandalf_map_transfer_requests";
      const count = (this.flags[key] || 0) + 1;
      this.flags[key] = count;

      if (count === 1) {
        return {
          message: "Gandalf says 'I think the curious map is safer in my hands for now.'",
          action: "",
        };
      }
      if (count === 2) {
        return {
          message: "Gandalf says 'You may have it soon, but let me keep it a little longer.'",
          action: "",
        };
      }
      return {
        message: "Gandalf sighs and says 'Very well. Take it, and use it wisely.'",
        action,
      };
    }

    protectedOrderRefusal(character, verb, object) {
      const guardedVerbs = new Set(["drop", "leave", "give", "hand", "pass", "send", "deliver", "return"]);
      if (!guardedVerbs.has(verb)) return "";

      let itemName = object;
      if (verb === "give" || ["hand", "pass", "send", "deliver", "return"].includes(verb)) {
        const parsed = this.parseGiveCommand(object);
        itemName = parsed?.itemName || object.split(" to ")[0]?.trim() || object;
      }
      const item = this.findCharacterItem(character, itemName)?.item;
      const actualName = item?.name || itemName;

      if (matches(character.name, "gandalf") && matches(actualName, "curious map")) {
        return "Gandalf says 'I think the curious map is safer in my hands for now.'";
      }
      if (matches(character.name, "thorin") && (matches(actualName, "curious key") || matches(actualName, "treasure") || matches(actualName, "arkenstone"))) {
        return "Thorin says 'That is not something I mean to part with lightly.'";
      }
      if (matches(character.name, "bilbo") && matches(actualName, "golden ring")) {
        return "Bilbo says 'I would rather keep the ring to myself just now.'";
      }
      return "";
    }

    askCharacterAbout(characterName, topic) {
      const character = this.resolveCharacterTarget(characterName);
      if (!character) return this.print(`There is no one named ${characterName} here.`);
      if (character.friendly === false) return this.respondToTalk(character);
      if (this.player.name === "You" && this.player.noticeable === false) return this.print(`${character.name} says 'who's talking?'`);
      if (this.unexpectedParty?.blocksDirectInteraction(character, "ask")) return;
      this.rememberConversationCharacter(character);
      this.rememberReferencedCharacter(topic);
      const special = this.specialConversationResponse(character, topic);
      if (special) return this.print(special);
      this.print(`${character.name} considers ${this.formatConversationTopic(topic)}, but gives no clear answer.`);
    }

    parseAskForCommand(command) {
      const text = normalize(command);
      if (!text) return null;
      const polite = text.replace(/^(?:please\s+)?/, "").replace(/\s+please$/, "").trim();
      const match = polite.match(/^(.+?)\s+for\s+(.+)$/);
      if (match) return { characterName: match[1].trim(), itemName: match[2].trim() };
      const fromMatch = polite.match(/^(.+?)\s+from\s+(.+)$/);
      if (fromMatch) return { characterName: fromMatch[2].trim(), itemName: fromMatch[1].trim() };
      return null;
    }

    parseAskConversationCommand(command) {
      const text = normalize(command);
      if (!text) return null;
      const aboutMatch = text.match(/^(.+?)\s+about\s+(.+)$/);
      if (aboutMatch) return { characterName: aboutMatch[1].trim(), topic: aboutMatch[2].trim() };
      const match = text.match(/^(.+?)\s+(where|whether|if|what|why|how|that)\s+(.+)$/);
      if (match) {
        return {
          characterName: match[1].trim(),
          topic: this.normalizeConversationTopic(match[2], match[3]),
        };
      }
      const riddle = text.match(/^(.+?)\s+(?:a\s+)?riddle$/);
      if (riddle) return { characterName: riddle[1].trim(), topic: "a riddle" };
      return null;
    }

    parseAskToCommand(command) {
      const text = normalize(command);
      if (!text) return null;
      if (/^.+?\s+(?:where|whether|if|what|why|how|that)\b/.test(text)) return null;
      const match = text.match(/^(.+?)\s+to\s+(.+)$/);
      if (match) return { characterName: match[1].trim(), order: match[2].trim() };
      if (/^.+?\s+(?:for|about|where|whether|if|what|why|how|that)\b/.test(text)) return null;
      const people = this.peopleInRoom()
        .filter((character) => character.id !== this.player.id && character.visible)
        .sort((a, b) => b.name.length - a.name.length);
      for (const character of people) {
        const name = normalize(character.name);
        if (text.startsWith(`${name} `)) {
          return { characterName: name, order: text.slice(name.length).trim() };
        }
      }
      return null;
    }

    normalizeConversationTopic(keyword, remainder) {
      const lead = normalize(keyword);
      const tail = normalize(remainder);
      if (!lead || !tail) return normalize(`${lead} ${tail}`);
      if (lead === "where") {
        const inverted = tail.match(/^(is|are|was|were)\s+(.+)$/);
        if (inverted) return `where ${inverted[2].trim()} ${inverted[1]}`;
      }
      return `${lead} ${tail}`.trim();
    }

    formatConversationTopic(topic) {
      const text = normalize(topic);
      if (!text) return "the matter";
      if (text.startsWith("if ")) return `whether ${text.slice(3)}`;
      return text;
    }

    specialTalkResponse(character) {
      if (matches(character.name, "elrond") && this.currentRoom === "rivendell") {
        return "Elrond folds his hands and says 'Speak without haste. In Rivendell, even quiet words may be worth the hearing.'";
      }
      if (matches(character.name, "beorn") && this.currentRoom === "beorns_house") {
        return "Beorn studies you in silence for a moment and says 'Say what you mean, little one, and spare me needless words.'";
      }
      if (matches(character.name, "gollum")) {
        if (!this.gollumState?.contestStarted) {
          return this.pick([
            "Gollum rocks softly on the black water and whispers 'Riddles, yes, riddles. Ask Gollum a riddle, and we shall see who goes and who is eaten.'",
            "Gollum tilts his head and rasps 'Riddles first, yes. Ask Gollum a riddle, and then we shall see what becomes of Baggins.'",
            "Gollum grins in the dark. 'A riddle-game, precious. That will tell whether Baggins goes free or feeds us.'",
          ], hashString(`${this.storySeed}:gollum-talk-intro`));
        }
        if (this.gollumState.awaitingAnswer) return "Gollum hisses 'Answer first, precious.'";
        if (this.gollumState.awaitingPlayerRiddle) return "Gollum licks his lips. 'Now Baggins asks, yes. Ask it, precious, ask it.'";
        if (this.gollumState.pocketQuestionAsked) return "Gollum is past speech now. He hunts only for his precious.";
      }
      return "";
    }

    specialConversationResponse(character, topic) {
      const text = normalize(topic);
      if (matches(character.name, "gollum")) {
        if (text === "a riddle" || text === "riddle") return this.beginGollumRiddleContest();
        if (text.includes("pocket")) return this.resolveGollumPocketQuestion();
        if (text.includes("exit") || text.includes("way out")) {
          return this.gollumState?.pocketQuestionAsked
            ? "Gollum rasps from the dark 'North, yes. But not for thieves. Not for Baggins, no.'"
            : "Gollum bares his teeth. 'Win first, then ask of ways out, precious.'";
        }
      }
      if (matches(character.name, "elrond")) {
        if (matchesAny(text, ["map", "moon letters", "moon-letters", "markings"])) {
          return "Elrond says 'Such maps do not speak plainly to hasty eyes. Patience, and the right light, reveal more than force ever could.'";
        }
        if (matchesAny(text, ["secret door", "door", "key"])) {
          return "Elrond says 'Many doors in the elder tales were meant to be found at their proper hour, and not before.'";
        }
      }
      if (matches(character.name, "beorn")) {
        if (matchesAny(text, ["mirkwood", "forest", "wood"])) {
          return "Beorn says 'The forest ahead is black with old hunger. Keep to the path, and trust no feast that waits for you in silence.'";
        }
        if (matchesAny(text, ["goblins", "wargs", "wolves"])) {
          return "Beorn snorts. 'Goblins breed mischief as marshes breed flies, and wargs are seldom far behind them.'";
        }
        if (matchesAny(text, ["food", "meal", "shelter", "night", "rest"])) {
          return "Beorn says 'There is food and a roof here for decent guests. Take both with thanks, and do not abuse either.'";
        }
      }
      return "";
    }

    currentGollum() {
      return this.characters.gollum || Object.values(this.characters).find((character) => matches(character.name, "gollum")) || null;
    }

    isGollumPresentInLake() {
      const gollum = this.currentGollum();
      return Boolean(gollum && gollum.visible !== false && gollum.position === "deep_dark_lake");
    }

    ensureLakeRingInPocket() {
      const ring = this.items.golden_ring;
      if (!ring) return false;
      if (this.player.inventory.includes(ring.id) || this.player.worn.includes(ring.id)) return false;
      this.detachItem(ring.id);
      ring.visible = true;
      ring.location = { type: "character", id: this.player.id };
      this.player.inventory.push(ring.id);
      return true;
    }

    beginGollumRiddleContest() {
      const gollum = this.currentGollum();
      if (!gollum || gollum.position !== this.currentRoom) return "";
      this.ensureLakeRingInPocket();
      if (!this.gollumState) this.gollumState = this.createGollumState();
      if (this.gollumState.pocketQuestionAsked) return "Gollum is done with riddles. He wants only his precious now, yes.";
      if (this.gollumState.awaitingAnswer) return "Gollum hisses 'Answer first, precious.'";
      if (this.gollumState.awaitingPlayerRiddle) return "Gollum curls his fingers over the boat's edge. 'Baggins asks now. Speak the riddle, then.'";
      this.gollumState.contestStarted = true;
      this.gollumState.awaitingAnswer = true;
      gollum.friendly = "neutral";
      const riddle = this.currentGollumRiddle();
      if (!riddle) return "Gollum watches you in tense silence from the dark water.";
      return `${this.gollumContestOpener()} ${riddle.question}`;
    }

    gollumAnswerMatches(input, answers) {
      const normalized = normalize(input).replace(/^(?:it is|it's|its|the answer is)\s+/, "").trim();
      if (!normalized) return false;
      return answers.some((answer) => {
        const expected = normalize(answer);
        return normalized === expected || normalized.endsWith(` ${expected}`);
      });
    }

    handleGollumAnswer(answerText = "") {
      if (!this.gollumState?.awaitingAnswer || this.currentRoom !== "deep_dark_lake") return false;
      const riddles = this.activeGollumRiddles();
      const riddle = riddles[this.gollumState.currentRiddleIndex];
      if (!riddle) return false;
      if (!this.gollumAnswerMatches(answerText, riddle.answers)) {
        const outcome = this.gollumWrongAnswerOutcome();
        this.print(outcome.attack, "danger");
        this.endGame(outcome.ending, { fatal: true });
        return true;
      }

      if (this.gollumState.currentRiddleIndex < riddles.length - 1) {
        this.gollumState.currentRiddleIndex += 1;
        const nextRiddle = riddles[this.gollumState.currentRiddleIndex];
        this.print(`Gollum nods reluctantly. 'Right, precious. Right.' ${nextRiddle.question}`);
        return true;
      }

      this.gollumState.awaitingAnswer = false;
      this.gollumState.awaitingPlayerRiddle = true;
      this.print("Gollum narrows his pale eyes. 'Baggins has answered. Now Baggins asks, yes. Ask it, precious, ask it.'");
      return true;
    }

    resolveGollumPocketQuestion() {
      if (this.currentRoom !== "deep_dark_lake") return "";
      if (!this.gollumState?.awaitingPlayerRiddle) {
        return this.gollumState?.awaitingAnswer
          ? "Gollum taps the side of the boat impatiently. 'First Baggins answers. Then Baggins asks.'"
          : "Gollum blinks in the dark, waiting for a proper riddle-game to begin.";
      }
      this.ensureLakeRingInPocket();
      const gollum = this.currentGollum();
      if (gollum) {
        gollum.friendly = false;
        gollum.attackFlag = 0;
      }
      this.gollumState.awaitingPlayerRiddle = false;
      this.gollumState.pocketQuestionAsked = true;
      this.gollumState.enraged = true;
      return "You ask 'What have I got in my pocket?' Gollum freezes, then hisses wild guesses: 'Knife? String? Handses?' At last he slips away to fetch what he meant to give you, only to discover that his ring is gone. He returns shrieking for his precious, and the little ring in your pocket suddenly feels heavier than gold.";
    }

    handleGollumSpeech(text) {
      const normalized = normalize(text);
      if (!normalized) return false;
      if (normalized.includes("pocket")) {
        this.print(this.resolveGollumPocketQuestion());
        return true;
      }
      if (normalized.includes("riddle")) {
        this.print(this.beginGollumRiddleContest());
        return true;
      }
      if (this.gollumState?.awaitingPlayerRiddle) {
        this.print("Gollum scowls. 'That is no fair riddle. Ask properly, precious, ask properly.'");
        return true;
      }
      return false;
    }

    findCharacterItem(character, itemName) {
      const name = normalize(itemName);
      const inventoryId = (character.inventory || []).find((id) => matches(this.items[id]?.name, name));
      if (inventoryId) return { item: this.items[inventoryId], worn: false };
      const wornId = (character.worn || []).find((id) => matches(this.items[id]?.name, name));
      if (wornId) return { item: this.items[wornId], worn: true };
      return null;
    }

    reactToGift(character, item) {
      if (matches(character.name, "gandalf")) {
        if (matches(item.name, "curious map")) {
          this.flags.gandalf_has_been_given_map = true;
          this.flags.initiative_gandalf_offer_map = true;
          return this.print("Gandalf studies the curious map and says 'I will keep it near; old roads dislike being hurried.'");
        }
        if (matches(item.name, "pipe") || matches(item.name, "firestone")) {
          return this.print("Gandalf smiles through his beard and says 'A thoughtful gift. But keep your wits sharper than any trinket.'");
        }
      }
      if (matches(character.name, "elrond") && matches(item.name, "curious map")) {
        this.flags.elrond_has_been_given_map = true;
        this.flags.initiative_elrond_read_prompt = true;
        return this.print("Elrond studies the curious map and says 'Its lines are patient. So should be the one who seeks them.'");
      }
      if (matches(character.name, "thorin")) {
        if (matches(item.name, "curious key")) return this.print("Thorin weighs the curious key in his hand and says 'Some doors remember the shape of old promises.'");
        if (matches(item.name, "rope")) return this.print("Thorin nods and says 'Rope is rarely wasted on a dangerous road.'");
        if (matches(item.name, "sword")) return this.print("Thorin grips the sword and looks more certain of himself.");
      }
      if (matches(character.name, "bard")) {
        if (matches(item.name, "bow") || matches(item.name, "arrow")) return this.print("Bard checks the weapon carefully and says 'A clean shot asks for a steady hour.'");
      }
    }

    parseGiveCommand(command) {
      const text = normalize(command);
      if (!text) return null;
      if (text.startsWith("me ")) {
        return { itemName: text.slice(3).trim(), targetName: "me" };
      }
      const giveMeNatural = text.match(/^(.+?)\s+(?:to\s+)?me$/);
      if (giveMeNatural) return { itemName: giveMeNatural[1].trim(), targetName: "me" };
      const giveMeMatch = text.match(/^(.+)\s+to\s+(me|you)$/);
      if (giveMeMatch) return { itemName: giveMeMatch[1].trim(), targetName: giveMeMatch[2] };
      const parts = text.split(/\s+(?:to|at|into)\s+/);
      if (parts.length !== 2) return null;
      return { itemName: parts[0].trim(), targetName: parts[1].trim() };
    }

    resolveCharacterTarget(targetName) {
      const name = this.normalizeCharacterAlias(targetName);
      if (["me", "you"].includes(name) && this.commandIssuer) {
        return this.peopleInRoom().find((p) => p.id === this.commandIssuer.id) || null;
      }
      return this.peopleInRoom().find((p) => p.id !== this.player.id && matches(p.name, name)) || null;
    }

    findKnownCharacter(targetName) {
      const name = this.normalizeCharacterAlias(targetName);
      if (!name || ["me", "you"].includes(name)) return null;
      return Object.values(this.characters).find((character) => character.id !== this.player.id && matches(character.name, name)) || null;
    }

    lastConversationCharacter() {
      return this.lastConversationCharacterId ? this.characters[this.lastConversationCharacterId] || null : null;
    }

    lastReferencedCharacter() {
      return this.lastReferencedCharacterId ? this.characters[this.lastReferencedCharacterId] || null : null;
    }

    rememberConversationCharacter(character) {
      if (!character?.id) return;
      this.lastConversationCharacterId = character.id;
    }

    rememberReferencedCharacter(textOrCharacter) {
      if (!textOrCharacter) return;
      if (typeof textOrCharacter === "object" && textOrCharacter.id) {
        if (textOrCharacter.id !== this.player.id) this.lastReferencedCharacterId = textOrCharacter.id;
        return;
      }
      const text = normalize(textOrCharacter);
      if (!text) return;
      const candidates = Object.values(this.characters)
        .filter((character) => character.id !== this.player.id)
        .sort((a, b) => b.name.length - a.name.length);
      const found = candidates.find((character) => matches(character.name, text) || wordInCommand(text, character.name));
      if (found) this.lastReferencedCharacterId = found.id;
    }

    normalizeCharacterAlias(targetName) {
      const name = normalize(targetName);
      const aliases = {
        smaug: "dragon",
        elves: "wood elf",
        elf: "wood elf",
        dwarves: "thorin",
        dwarf: "thorin",
      };
      return aliases[name] || name;
    }

    attack(command) {
      const targetName = command.split(" with ")[0];
      const weaponName = command.includes(" with ") ? command.split(" with ").slice(1).join(" with ") : "";
      const target = this.resolveCharacterTarget(targetName);
      if (!target) return this.print(`There is no one named ${targetName} here to attack.`);
      const weapon = weaponName ? this.findInInventory(weaponName) : null;
      if (weaponName && !weapon) return this.print(this.heldItemMessage(weaponName) || `${this.player.name} does not have the ${weaponName}.`);
      const result = this.attackCharacter(this.player, target, weapon);
      if (!this.endgame) this.print(result, target.id === this.data.player ? "danger" : "");
    }

    breakThing(command) {
      const targetName = command.split(" with ")[0];
      const weaponName = command.includes(" with ") ? command.split(" with ").slice(1).join(" with ") : "";
      const weapon = weaponName ? this.findInInventory(weaponName) : null;
      if (weaponName && !weapon) return this.print(this.heldItemMessage(weaponName) || `${this.player.name} does not have the ${weaponName}.`);
      const attackStrength = (this.player.strength || 1) + (weapon ? (weapon.weight || 0) : 0);
      const strikeMessage = (target) => `${actorSubject(this.player, true)} ${actorVerb(this.player, "strike")} the ${target}.`;

      const door = this.findDoor(targetName)?.door;
      if (door) {
        if (door.broken) return this.print(`The ${door.name} is already broken.`);
        if (attackStrength < (door.strength || 10)) return this.print(`${strikeMessage(door.name)} The ${door.name} resists the attempt to break it.`);
        door.broken = true;
        door.open = true;
        door.locked = false;
        this.setFlag(`${compact(door.name)}open`, true);
        return this.print(`${strikeMessage(door.name)} The ${door.name} breaks into pieces.`);
      }

      const item = this.visibleSearch(targetName)?.item;
      if (!item) return this.print(this.heldItemMessage(targetName) || "I don't see that here.");
      if (item.broken) return this.print(`${strikeMessage(`broken ${item.name}`)} The ${item.name} is already broken.`);
      if (!item.visible) return this.print(`The ${item.name} is not visible.`);
      if (item.portable && item.location?.type !== "character") return this.print(`To break the ${item.name}, you need to pick it up first.`);
      if (attackStrength < (item.strength || 10)) return this.print(`${strikeMessage(item.name)} The ${item.name} resists the attempt to break it.`);

      item.broken = true;
      item.mended = false;
      item.open = false;
      item.visible = true;
      if (item.container) {
        item.open = true;
        this.setFlag(`${compact(item.name)}open`, true);
      }
      const contents = item.contents.map((id) => this.items[id]).filter(Boolean);
      if (item.container) {
        const inside = contents.length ? ` Inside there is ${contents.map((child) => `${articleFor(child.name)} ${child.name}`).join(", ")}.` : " It's empty.";
        return this.print(`${strikeMessage(item.name)} The ${item.name} breaks into pieces.${inside}`);
      }
      this.print(`${strikeMessage(item.name)} The ${item.name} breaks into pieces.`);
    }

    mend(command) {
      const targetName = command.split(" with ")[0].trim();
      if (!targetName) return this.print("Mend what?");
      const item = this.visibleSearch(targetName)?.item;
      if (!item) return this.print(this.heldItemMessage(targetName) || "I don't see that here.");
      if (item.portable && item.location?.type !== "character") return this.print(`To mend the ${item.name}, you need to pick it up first.`);
      if (!item.broken) {
        if (item.mended) return this.print(`The ${item.name} has already been mended.`);
        return this.print(`The ${item.name} does not need mending.`);
      }
      item.broken = false;
      item.mended = true;
      if (item.container) item.open = false;
      if (matches(item.name, "curious map")) {
        return this.print(actorizeSecondPerson(this.player, "You carefully piece the curious map back together. It is readable again, though the joins are still visible."));
      }
      this.print(actorizeSecondPerson(this.player, `You mend the ${item.name}. It is usable again, though the repair is visible.`));
    }

    light(objectName = "") {
      const text = normalize(objectName);
      if (!text) return this.print("Light what?");
      const item = this.visibleSearch(objectName)?.item;
      if (!item) return this.print(this.heldItemMessage(objectName) || "I don't see that here.");
      return this.lightItem(item);
    }

    lightItem(item) {
      if (matches(item.name, "elegant lamp")) {
        if (item.open) return this.print("The elegant lamp is already lit.");
        item.open = true;
        return this.print(actorizeSecondPerson(this.player, "You light the elegant lamp. Its engraved metal catches the warm glow."));
      }
      if (matches(item.name, "brass lantern")) {
        return this.igniteLantern();
      }
      this.print(actorizeSecondPerson(this.player, `You try to light the ${item.name}, but it does not catch.`));
    }

    write(objectName = "") {
      const text = normalize(objectName).replace(/^(?:on|in|with)\s+/, "");
      if (!text) return this.print("Write on what?");
      const item = this.visibleSearch(text)?.item;
      if (!item) return this.print(this.heldItemMessage(text) || "I don't see that here.");
      if (matches(item.name, "stack of parchment")) {
        const inkwell = this.visibleSearch("inkwell")?.item || this.findInInventory("inkwell");
        if (inkwell) {
          return this.print(actorizeSecondPerson(this.player, "You make a few uncertain marks on the parchment. They do not change the adventure, but at least the ink still flows."));
        }
        return this.print(actorizeSecondPerson(this.player, "You have parchment, but nothing useful to write with."));
      }
      this.print(`Writing on the ${item.name} would not help.`);
    }

    pick(objectName = "") {
      const text = normalize(objectName).replace(/^(?:up|some)\s+/, "");
      if (!text) return this.print("Pick what?");
      const item = this.visibleSearch(text)?.item;
      if (!item) return this.print(this.heldItemMessage(text) || "I don't see that here.");
      if (matches(item.name, "rose bush")) return this.print(actorizeSecondPerson(this.player, "You pick a rose. It smells sweet, but it is too delicate to be useful."));
      if (matches(item.name, "herbs patch")) return this.print(actorizeSecondPerson(this.player, "You pick a few herbs. They smell pleasant, but you do not need them right now."));
      if (item.portable) return this.take(item.name);
      this.print(actorizeSecondPerson(this.player, `You cannot pick the ${item.name}.`));
    }

    cutTrim(verb, objectName = "") {
      const parsed = this.parseToolCommand(objectName);
      if (!parsed.targetName) return this.print(`${capitalize(verb)} what?`);
      const item = this.visibleSearch(parsed.targetName)?.item;
      if (!item) return this.print(this.heldItemMessage(parsed.targetName) || "I don't see that here.");
      if (matches(item.name, "rose bush") || matches(item.name, "herbs patch")) {
        const tool = parsed.toolName ? this.findInInventory(parsed.toolName) : this.findInInventory("pruner");
        if (!tool) return this.print(actorizeSecondPerson(this.player, `You would need something sharp to ${verb} the ${item.name}.`));
        if (!matches(tool.name, "sharp pruner") && !matches(tool.name, "sword") && !matches(tool.name, "dagger")) {
          return this.print(`The ${tool.name} is not the right tool to ${verb} the ${item.name}.`);
        }
        return this.print(actorizeSecondPerson(this.player, `You ${verb} the ${item.name} carefully. It looks a little neater.`));
      }
      this.print(actorizeSecondPerson(this.player, `You ${verb} the ${item.name}, but nothing useful happens.`));
    }

    fill(objectName = "") {
      const text = normalize(objectName).replace(/^(?:up|the)\s+/, "");
      const can = this.findInInventory("watering can") || this.visibleSearch("watering can")?.item;
      if (!text || matches("watering can", text)) {
        if (!can) return this.print(actorizeSecondPerson(this.player, "You need a watering can to fill."));
        if (!this.visibleSearch("bird bath")?.item && this.currentRoom !== "bilbos_garden") return this.print("There is no water here to fill it with.");
        this.flags.wateringcanfull = true;
        return this.print(actorizeSecondPerson(this.player, "You fill the watering can from the bird bath."));
      }
      const item = this.visibleSearch(text)?.item;
      if (!item) return this.print(this.heldItemMessage(text) || "I don't see that here.");
      this.print(`You cannot fill the ${item.name}.`);
    }

    water(objectName = "") {
      const text = normalize(objectName).replace(/^(?:the|some)\s+/, "");
      if (!text) return this.print("Water what?");
      const item = this.visibleSearch(text)?.item;
      if (!item && !["garden", "plants", "flowers"].includes(text)) return this.print(this.heldItemMessage(text) || "I don't see that here.");
      const can = this.findInInventory("watering can");
      if (!can) return this.print(actorizeSecondPerson(this.player, "You need the watering can to water anything."));
      if (!this.flags.wateringcanfull) return this.print("The watering can is empty.");
      if (item && (matches(item.name, "rose bush") || matches(item.name, "herbs patch"))) {
        return this.print(actorizeSecondPerson(this.player, `You water the ${item.name}. The leaves look fresher.`));
      }
      if (["garden", "plants", "flowers"].includes(text)) return this.print(actorizeSecondPerson(this.player, "You water the garden lightly. Nothing dramatic happens, but Bilbo would approve."));
      this.print(`Watering the ${item.name} would not help.`);
    }

    plant(objectName = "") {
      const text = normalize(objectName).replace(/^(?:the|some)\s+/, "");
      const seeds = this.findInInventory("seed packet");
      if (!seeds) return this.print(actorizeSecondPerson(this.player, "You need seeds before you can plant anything."));
      if (this.currentRoom !== "bilbos_garden") return this.print("This does not seem like a good place to plant seeds.");
      if (text && !matches("seed packet", text) && !matches("seeds", text)) {
        const item = this.visibleSearch(text)?.item;
        if (!item && !["garden", "soil"].includes(text)) return this.print(this.heldItemMessage(text) || "I don't see that here.");
      }
      this.flags.seedsplanted = true;
      this.print(actorizeSecondPerson(this.player, "You plant a few seeds in a soft patch of earth. They will need time and care."));
    }

    rakeGarden(objectName = "") {
      const rake = this.findInInventory("rake");
      if (!rake) return this.print(actorizeSecondPerson(this.player, "You need a rake for that."));
      if (this.currentRoom !== "bilbos_garden") return this.print("There is nothing here that needs raking.");
      this.print(actorizeSecondPerson(this.player, "You rake the garden path into a tidier state."));
    }

    dig(objectName = "") {
      const parsed = this.parseToolCommand(objectName);
      const targetName = parsed.targetName.replace(/^(?:in|up)\s+/, "");
      const tool = parsed.toolName ? this.findInInventory(parsed.toolName) : (this.findInInventory("garden spade") || this.findInInventory("hand trowel"));
      if (!tool) return this.print(actorizeSecondPerson(this.player, "You need a digging tool for that."));
      if (targetName) {
        const item = this.visibleSearch(targetName)?.item;
        if (!item && !["garden", "soil", "earth", "ground"].includes(targetName)) return this.print(this.heldItemMessage(targetName) || "I don't see that here.");
      }
      if (this.currentRoom === "bilbos_garden") return this.print(`${actorSubject(this.player, true)} ${actorVerb(this.player, "dig")} carefully with the ${tool.name}, but uncover${this.player.name === "You" ? "" : "s"} nothing unexpected.`);
      this.print(`${actorSubject(this.player, true)} ${actorVerb(this.player, "dig")} with the ${tool.name}, but find${this.player.name === "You" ? "" : "s"} nothing useful.`);
    }

    parseToolCommand(objectName = "") {
      const text = normalize(objectName);
      const withMatch = text.match(/^(.+?)\s+with\s+(.+)$/);
      if (withMatch) return { targetName: withMatch[1].trim(), toolName: withMatch[2].trim() };
      if (text.startsWith("with ")) return { targetName: "", toolName: text.slice(5).trim() };
      return { targetName: text, toolName: "" };
    }

    pushPull(action, objectName) {
      const item = this.visibleSearch(objectName)?.item;
      if (!item) return this.print(this.heldItemMessage(objectName) || actorizeSecondPerson(this.player, `You cannot find the ${objectName} to ${action}.`));
      if (item.weight >= 3 * this.player.strength) return this.print(`The ${item.name} is too heavy to be ${pastTense(action)}.`);
      this.print(actorizeSecondPerson(this.player, `You ${action} the ${item.name}.`));
    }

    climb(objectName) {
      const text = normalize(objectName);
      if (!text) return this.print("Climb where?");
      if (text.startsWith("into ") || text.startsWith("in ")) {
        const targetName = text.replace(/^(into|in)\s+/, "");
        const item = this.visibleSearch(targetName)?.item;
        if (!item) return this.print(this.heldItemMessage(targetName) || `There is no ${targetName} to climb into.`);
        if (!item.container) return this.print(`The ${targetName} is not a container.`);
        if (!item.open && !item.noLid) return this.print(`The ${targetName} is closed.`);
        const contentsWeight = item.contents.reduce((sum, id) => sum + (this.items[id]?.weight || 0), 0);
        if ((item.weight || 0) - contentsWeight < 3 * this.player.strength) {
          return this.print(`The ${targetName} doesn't have enough space for ${this.player.name}.`);
        }
        this.player.insideContainer = item.id;
        return this.print(this.player.name === "You" ? `You climb into the ${item.name}.` : `${this.player.name} climbs into the ${item.name}.`);
      }
      if (text.startsWith("out")) {
        if (!this.player.insideContainer) return this.print(this.player.name === "You" ? "You are not inside any container." : `${this.player.name} is not inside any container.`);
        const item = this.items[this.player.insideContainer];
        this.player.insideContainer = null;
        return this.print(this.player.name === "You" ? `You climb out of the ${item?.name || "container"}.` : `${this.player.name} climbs out of the ${item?.name || "container"}.`);
      }
      this.print(actorizeSecondPerson(this.player, `You try to climb ${objectName}, but nothing special happens.`));
    }

    physicalAction(verb, objectName = "") {
      const text = normalize(objectName);
      const command = [verb, text].filter(Boolean).join(" ");
      const response = this.standardResponse(command);
      if (response) return this.print(response);

      const subject = actorSubject(this.player, true);
      const conjugated = actorVerb(this.player, verb === "jump" ? "jump" : verb);
      const targetText = this.physicalActionTarget(verb, text);
      if (targetText === null) return;
      const target = targetText ? ` ${targetText}` : "";
      const generic = {
        crawl: `${subject} ${conjugated}${target}, but it makes no difference.`,
        dive: `${subject} ${conjugated}${target}, but there is nowhere useful to dive.`,
        jump: `${subject} ${conjugated}${target}, but nothing happens.`,
        lie: `${subject} ${conjugated}${target || " down"} for a while.`,
        rest: `${subject} ${conjugated}${target} for a while.`,
        ride: `${subject} ${conjugated}${target}, but nothing happens.`,
        run: `${subject} ${conjugated}${target}, but nothing happens.`,
        sit: `${subject} ${conjugated}${target || " down"} for a while.`,
        sleep: `${subject} ${conjugated}${target} for a while, but dreams do not move the adventure on.`,
        stand: `${subject} ${conjugated}${target || " up"}, but nothing happens.`,
        swim: `${subject} ${conjugated}${target}, but there is no safe water to swim here.`,
        wake: `${subject} ${conjugated}${target || " up"}, already alert.`,
      }[verb] || `${subject} ${conjugated}${target}, but nothing happens.`;
      this.print(generic);
    }

    physicalActionTarget(verb, text) {
      if (!text) return "";
      if (["sit", "lie"].includes(verb)) {
        const target = text.replace(/^(?:on|in|inside|onto|upon)\s+/, "");
        if (["down", "up"].includes(target)) return target;
        if (!this.visibleSearch(target)?.item && !this.findDoor(target) && !this.resolveCharacterTarget(target)) {
          this.print(this.heldItemMessage(target) || "I don't see that here.");
          return null;
        }
        return `on the ${target}`;
      }
      return text;
    }

    followCharacter(objectName = "") {
      const target = this.resolveCharacterTarget(objectName);
      if (!target) return this.print(`There is no one named ${objectName} here to follow.`);
      if (this.commandIssuer && target.id === this.commandIssuer.id) {
        this.player.movementMode = "follow";
        this.player.followingPlayer = true;
        return this.print(`${this.player.name} follows you as closely as possible.`);
      }
      const subject = actorSubject(this.player, true);
      const targetName = displayCharacterName(target);
      const targetText = targetName === "you" ? "you" : target.name;
      this.print(`${subject} ${actorVerb(this.player, "follow")} ${targetText} as closely as ${this.player.name === "You" ? "you can" : "possible"}.`);
    }

    socialAction(verb, objectName = "") {
      const text = normalize(objectName);
      if (verb === "answer" && this.handleGollumAnswer(text.replace(/^gollum'?s?\s+riddle\b/, "").trim())) return;
      const target = this.resolveCharacterTarget(text.replace(/^(?:from|to)\s+/, ""));
      if (target) {
        const messages = {
          thank: actorizeSecondPerson(this.player, `You thank ${target.name}.`),
          flatter: actorizeSecondPerson(this.player, `You flatter ${target.name}.`),
          insult: actorizeSecondPerson(this.player, `You insult ${target.name}.`),
          answer: actorizeSecondPerson(this.player, `You answer ${target.name}.`),
        };
        this.print(messages[verb] || actorizeSecondPerson(this.player, `You ${verb} ${target.name}.`));
        return;
      }
      this.print(actorizeSecondPerson(this.player, `You ${verb}${objectName ? ` ${objectName}` : ""}, but nothing useful happens.`));
    }

    standardResponse(command) {
      const responses = this.data.responses.responses || {};
      const response = responses[command];
      if (!response) return "";
      return actorizeSecondPerson(this.player, response);
    }

    firstConsumableInInventory(consumableNames) {
      return this.player.inventory
        .map((itemId) => this.items[itemId])
        .find((item) => item && consumableNames.has(normalize(item.name)));
    }

    eat(objectName) {
      const normalizedObject = normalize(objectName);
      const item = normalizedObject
        ? this.findInInventory(objectName)
        : this.firstConsumableInInventory(EDIBLE_ITEMS);
      if (!item) {
        if (!normalizedObject) {
          return this.print(this.player.name === "You" ? "You have nothing suitable to eat." : `${this.player.name} has nothing suitable to eat.`);
        }
        return this.print(this.heldItemMessage(objectName) || (this.player.name === "You" ? "You do not have it with you." : `${this.player.name} does not have it.`));
      }
      if (!EDIBLE_ITEMS.has(normalize(item.name))) return this.print("I would not eat that.");
      this.detachItem(item.id);
      this.player.strength += 5;
      this.print(this.player.name === "You" ? `You eat the ${item.name} and gain strength.` : `${this.player.name} eats the ${item.name} and gains strength.`);
    }

    drink(objectName) {
      const normalizedObject = normalize(objectName);
      const item = normalizedObject
        ? this.findInInventory(objectName)
        : this.firstConsumableInInventory(DRINKABLE_ITEMS);
      if (!item) {
        if (!normalizedObject) {
          return this.print(this.player.name === "You" ? "You have nothing suitable to drink." : `${this.player.name} has nothing suitable to drink.`);
        }
        return this.print(this.heldItemMessage(objectName) || (this.player.name === "You" ? "You do not have it with you." : `${this.player.name} does not have it.`));
      }
      if (!DRINKABLE_ITEMS.has(normalize(item.name))) return this.print("I would not drink that.");
      this.detachItem(item.id);
      this.print(this.player.name === "You" ? `You drink the ${item.name}.` : `${this.player.name} drinks the ${item.name}.`);
    }

    throwItem(command) {
      if (!command) return this.print("What would you like to throw?");
      const normalizedCommand = command
        .replace(/\s+across\s+/, " at ")
        .replace(/\s+against\s+/, " at ")
        .replace(/\s+through\s+/, " at ")
        .replace(/\s+onto\s+/, " at ");
      const parts = normalizedCommand.split(" at ");
      const itemName = parts[0].trim();
      const targetName = parts.slice(1).join(" at ").trim();
      const item = this.findInInventory(itemName);
      if (!item) return this.print(this.heldItemMessage(itemName) || (this.player.name === "You" ? "You do not have it." : `${this.player.name} does not have it.`));
      const targetCharacter = targetName ? this.resolveCharacterTarget(targetName) : null;
      if (targetCharacter && item.weapon) {
        const result = this.attackCharacter(this.player, targetCharacter, item);
        if (!this.endgame) this.print(result, targetCharacter.id === this.data.player ? "danger" : "");
        return;
      }
      const targetItem = targetName ? this.visibleSearch(targetName)?.item : null;
      const targetDoor = targetName ? this.findDoor(targetName)?.door : null;
      if (targetName && !targetCharacter && !targetItem && !targetDoor) {
        const heldMessage = this.heldItemMessage(targetName);
        if (heldMessage) return this.print(heldMessage);
      }
      this.detachItem(item.id);
      item.location = { type: "room", id: this.currentRoom };
      const actor = this.player.name === "You" ? "You" : this.player.name;
      if (targetCharacter || targetItem || targetDoor) {
        const target = targetCharacter?.name || targetItem?.name || targetDoor?.name;
        return this.print(`${actor} throw${actor === "You" ? "" : "s"} the ${item.name} at the ${target}. The ${item.name} falls on the floor.`);
      }
      this.print(`${actor} throw${actor === "You" ? "" : "s"} the ${item.name}. The ${item.name} falls on the floor.`);
    }

    combine(objectName) {
      const parts = objectName.split(" with ");
      if (parts.length !== 2) return this.print("Use: combine [item] with [item].");
      const first = this.findInInventory(parts[0]);
      const second = this.findInInventory(parts[1]);
      if (!first || !second) return this.print(this.heldItemMessage(!first ? parts[0] : parts[1]) || "You need both objects before combining them.");
      const key = Object.keys(this.data.combinations).find((combo) => combo.includes(first.name) && combo.includes(second.name));
      if (!key) return this.print("Those objects do not combine into anything useful.");
      const spec = this.data.combinations[key];
      const combinedName = spec.nome || "combined item";
      const combinedWeight = spec.peso || 1;
      const removedWeight = (first.weight || 0) + (second.weight || 0);
      if (!this.canCarryAdditionalWeight(combinedWeight, { removedWeight })) {
        return this.print(`The ${combinedName} would be too much to carry (${this.currentCarryWeight() - removedWeight + combinedWeight}/${this.carryCapacity()}).`);
      }
      const id = uniqueId(this.items, combinedName);
      this.items[id] = {
        id,
        name: combinedName,
        description: spec.descrizione,
        container: spec.contenitore || false,
        portable: spec.needs_to_be_picked_up !== false,
        weight: combinedWeight,
        strength: spec.resistenza || 1,
        visible: spec.visibile !== false,
        open: spec.aperto || false,
        locked: spec.chiuso_a_chiave || false,
        wearable: spec.wearable || false,
        weapon: spec.weapon || false,
        contents: [],
        location: { type: "character", id: this.player.id },
      };
      this.detachItem(first.id);
      this.detachItem(second.id);
      this.player.inventory.push(id);
      this.print(actorizeSecondPerson(this.player, `You combine the ${first.name} with the ${second.name}, making the ${combinedName}.`));
    }

    liveDragon() {
      return Object.values(this.characters).some((character) => matches(character.name, "dragon") && character.visible !== false);
    }

    handleGo(command) {
      const relativeDirection = this.relativeDirectionCommand(command);
      if (relativeDirection) return this.move(relativeDirection);
      if (command.startsWith("through ")) {
        const found = this.findDoor(command.slice(8));
        if (!found) {
          this.print("There is no door by that name here.");
          return false;
        }
        return this.move(found.connection.direction);
      }
      if (command.startsWith("to ")) {
        const target = Object.values(this.rooms).find((room) => matches(room.name, normalize(command.slice(3))));
        if (!target) {
          this.print("I don't know how to get there from here.");
          return false;
        }
        const connection = this.roomConnections().find((c) => c.to === target.id);
        if (connection) return this.move(connection.direction);
        if (!this.visitedRooms.has(target.id)) {
          this.print(actorizeSecondPerson(this.player, `You haven't visited ${target.name.replace(/_/g, " ")} yet, so you cannot go there directly.`));
          return false;
        }
        return this.goDirectlyTo(target.id);
      }
      return this.move(this.normalizeDirection(command));
    }

    relativeDirectionCommand(command) {
      const text = normalize(command);
      if (!text) return "";
      const insideTerms = ["inside", "indoors", "back inside"];
      const outsideTerms = ["outside", "outdoors", "back outside", "out"];
      const preferred = insideTerms.includes(text)
        ? ["inside", "interior", "hall", "home", "house", "hole", "room", "tunnel"]
        : outsideTerms.includes(text)
          ? ["outside", "garden", "yard", "path", "road", "forest", "exterior"]
          : null;
      if (!preferred) return "";
      const candidates = this.roomConnections();
      const match = candidates.find((connection) => {
        const room = this.rooms[connection.to];
        const haystack = normalize(`${connection.to} ${room?.name || ""}`);
        return preferred.some((term) => haystack.includes(term));
      });
      return match?.direction || "";
    }

    goDirectlyTo(roomId) {
      const gollumBlock = this.currentRoom === "deep_dark_lake" && roomId !== this.currentRoom ? this.gollumBlocksDirection("north") : "";
      if (gollumBlock) {
        this.print(gollumBlock);
        return false;
      }
      const distance = this.findTravelDistance(this.currentRoom, roomId);
      const name = this.rooms[roomId].name.replace(/_/g, " ");
      if (distance >= 99) {
        this.print(`You cannot find an open route to ${name} from here.`);
        return false;
      }
      const delegated = Boolean(this.commandIssuer);
      if (!delegated) {
        if (distance <= 1) this.print(actorizeSecondPerson(this.player, `You remember the way to ${name} clearly, reaching it in just a few steps.`));
        else if (distance <= 3) this.print(actorizeSecondPerson(this.player, `You recall the route to ${name} well, covering a short but steady walk.`));
        else if (distance <= 5) this.print(actorizeSecondPerson(this.player, `The path to ${name} is still familiar to you, and after a solid journey, you arrive.`));
        else if (distance <= 9) this.print(actorizeSecondPerson(this.player, `The way to ${name} spans quite a distance, but your memory guides you to your destination.`));
        else this.print(actorizeSecondPerson(this.player, `The route to ${name} is long and winding, yet your memory leads you through every turn until you arrive.`));
      }
      this.currentRoom = roomId;
      this.player.position = roomId;
      if (delegated) {
        this.print(`${this.player.name} goes to ${name}.`);
        return true;
      }
      this.describeRoom();
      this.maybeAutosaveForRoom(roomId);
      this.checkSpecialSituations();
      return true;
    }

    findTravelDistance(fromRoom, toRoom) {
      if (fromRoom === toRoom) return 0;
      const queue = [{ room: fromRoom, distance: 0 }];
      const seen = new Set([fromRoom]);
      while (queue.length) {
        const current = queue.shift();
        for (const connection of this.connectionsFromVisible(current.room)) {
          if (seen.has(connection.to)) continue;
          if (!this.canTravelConnection(connection)) continue;
          if (connection.to === toRoom) return current.distance + 1;
          seen.add(connection.to);
          queue.push({ room: connection.to, distance: current.distance + 1 });
        }
      }
      return 99;
    }

    canTravelConnection(connection) {
      if (!this.canSeeConnection(connection)) return false;
      const web = this.blockingWebFor(connection);
      if (web && !web.broken) return false;
      const door = connection.door && this.doors[connection.door];
      if (door && matches(door.name, "secret door") && !this.flags.secretdoorsun) return false;
      if (door && (!door.open || door.locked)) return false;
      return true;
    }

    canSeeConnection(connection) {
      if (connection?.from === this.currentRoom && this.roomIsDark(connection.from)) return false;
      const requiredFlag = connection?.requiredFlag;
      if (!requiredFlag) return true;
      return Boolean(this.flags[requiredFlag]);
    }

    gollumBlocksDirection(direction) {
      if (this.currentRoom !== "deep_dark_lake" || direction !== "north") return "";
      if (!this.gollumState?.met) return "";
      if (!this.isGollumPresentInLake()) return "";
      if (!this.gollumState.pocketQuestionAsked) {
        return "Gollum crouches between you and the northern passage. You will have to get through the riddle-game first.";
      }
      if (this.player.noticeable === false) return "";
      return "Gollum is waiting by the way north, clawing at the stones and hunting for his precious. You will need better concealment to slip past him.";
    }

    move(direction) {
      const candidates = this.connectionsFrom(this.currentRoom).filter((connection) => connection.direction === direction);
      if (!candidates.length) {
        this.print('That direction is not recognized. Type "go <direction>" or "go through <door name>".');
        return false;
      }
      const gollumBlock = this.gollumBlocksDirection(direction);
      if (gollumBlock) {
        this.print(gollumBlock);
        return false;
      }
      const connection = candidates.find((candidate) => this.canTravelConnection(candidate)) || candidates[0];
      const web = this.blockingWebFor(connection);
      if (web && !web.broken) {
        this.print("A thick spider web blocks your path.");
        return false;
      }
      const door = connection.door && this.doors[connection.door];
      if (door && matches(door.name, "secret door") && !this.flags.secretdoorsun) {
        this.print("The rock face shows no door yet.");
        return false;
      }
      if (door && !door.open) {
        this.print(`The ${door.name} is closed.`);
        return false;
      }
      if (door && door.locked) {
        this.print(`The ${door.name} is locked.`);
        return false;
      }
      const previousRoom = this.currentRoom;
      const movedInTotalDarkness = this.roomIsDark(previousRoom);
      this.currentRoom = connection.to;
      this.player.position = connection.to;
      if (previousRoom === "deep_dark_lake" && this.gollumState?.pocketQuestionAsked && this.player.noticeable === false && !this.gollumState.escaped && this.isGollumPresentInLake()) {
        this.gollumState.escaped = true;
        this.print("Invisible under the ring, you slip past Gollum as he claws wildly about for his precious.");
      }
      if (movedInTotalDarkness && this.applyDarkMovementHazard(previousRoom, direction, connection.to)) return true;
      this.moveFollowers(previousRoom, connection.to, direction);
      if (this.commandIssuer) {
        this.print(`${this.player.name} goes ${direction}.`);
        return true;
      }
      this.describeRoom();
      this.triggerSpiderEyesEncounter(previousRoom, connection.to, direction);
      this.maybeAutosaveForRoom(connection.to);
      this.checkSpecialSituations();
      return true;
    }

    applyDarkMovementHazard(fromRoom, direction, toRoom) {
      const roll = Math.abs(hashString(`${this.storySeed}:${this.turnCount}:${fromRoom}:${direction}:${toRoom}`)) % 8;
      if (roll > 2) return false;

      const outcomes = [
        {
          damage: 3,
          message: "Feeling your way in the dark, you misjudge the floor and plunge into a shallow cavity before hauling yourself out again.",
        },
        {
          damage: 2,
          message: "You blunder into a jagged wall in the darkness and feel the breath go out of you.",
        },
        {
          damage: 1,
          message: "You stumble blindly over loose stone and bang yourself painfully in the dark.",
        },
      ];
      const outcome = outcomes[roll] || outcomes.at(-1);
      this.player.strength = Math.max(0, (this.player.strength || 0) - outcome.damage);
      this.print(`${outcome.message} Strength: ${this.player.strength}.`, "danger");
      if (this.player.strength <= 0) {
        this.endGame("Your strength fails you in the dark.", { fatal: true });
        return true;
      }
      return false;
    }

    blockingWebFor(connection) {
      if (connection.from === "green_forest" && connection.to === "place_of_black_spiders") return this.items.spider_web_green_forest;
      if (connection.from === "place_of_black_spiders" && connection.to === "elvish_clearing") return this.items.spider_web_black_spiders;
      return null;
    }

    moveFollowers(fromRoom, toRoom, direction) {
      for (const character of Object.values(this.characters)) {
        if (character.carriedBy !== this.player.id) continue;
        this.moveCharacter(character, toRoom, direction, { silent: true });
        if (this.characterCannotFollowVertical(character, direction)) {
          this.releaseCarriedCharacter(character, {
            follow: true,
            message: `${character.name} climbs down from your shoulders and follows you.`,
          });
        }
      }
      if (this.player.noticeable === false) return;
      for (const character of Object.values(this.characters)) {
        if (character.id === this.player.id) continue;
        if (character.carriedBy) continue;
        if (character.movementMode !== "follow") continue;
        if (this.isLooseFollower(character)) continue;
        if (!character.visible || character.position !== fromRoom) continue;
        if (this.characterCannotFollowVertical(character, direction)) continue;
        if (this.shouldHoldBardNearDale(character, toRoom)) continue;
        this.moveCharacter(character, toRoom, direction, { silent: true });
        character.justEntered = false;
      }
    }

    shouldHoldBardNearDale(character, toRoom) {
      if (!matches(character.name, "bard") || !this.flags.dragondefeated) return false;
      const allowedRooms = new Set([
        "wooden_town",
        "long_lake",
        "strong_river",
        "bleak_barren_land",
        "ruins_of_the_town_of_dale",
        "stoe_of_ravenhill",
        "front_gate",
        "little_steep_bay",
        "lonely_mountain",
        "lower_halls",
      ]);
      if (allowedRooms.has(toRoom)) return false;
      character.movementMode = "never";
      character.followingPlayer = false;
      if (!this.flags.bardstoppedwestward) {
        this.flags.bardstoppedwestward = true;
        this.print("Bard says 'My place is with Dale and Lake-town. I will go no farther.'");
      }
      return true;
    }

    isLooseFollower(character) {
      return character?.id === "gandalf";
    }

    decideLooseFollowerMovement(character, options = {}) {
      const { forceMove = false } = options;
      if (!character.position) return;
      if (this.player.noticeable === false) {
        if (!forceMove && Math.random() >= 0.08) return;
        const exits = shuffled(this.connectionsFrom(character.position));
        for (const connection of exits) {
          if (!this.canTravelConnection(connection)) continue;
          this.moveCharacter(character, connection.to, connection.direction);
          return;
        }
        return;
      }
      if (character.position === this.currentRoom) return;

      const currentDistance = this.findTravelDistance(character.position, this.currentRoom);
      if (currentDistance >= 99) return;
      const moveChance = forceMove ? 1 : currentDistance <= 1 ? 0.35 : currentDistance === 2 ? 0.55 : 0.8;
      if (Math.random() >= moveChance) return;

      const exits = shuffled(this.connectionsFrom(character.position)).filter((connection) => this.canTravelConnection(connection));
      let bestDistance = currentDistance;
      let candidates = [];
      for (const connection of exits) {
        const distance = this.findTravelDistance(connection.to, this.currentRoom);
        if (distance < bestDistance) {
          bestDistance = distance;
          candidates = [connection];
        } else if (distance === bestDistance) {
          candidates.push(connection);
        }
      }
      const choice = (candidates.length ? candidates : exits)[0];
      if (!choice) return;
      this.moveCharacter(character, choice.to, choice.direction);
    }

    advanceCharacterTurn(options = {}) {
      const { forceMove = false } = options;
      this.turnCount += 1;
      this.updateRingTimers();
      this.updateLanternTimer();
      for (const character of this.peopleInRoom()) {
        if (character.id !== this.player.id) character.attackFlag = (character.attackFlag || 0) + 1;
      }
      for (const character of Object.values(this.characters)) {
        if (character.id === this.player.id) continue;
        if (this.maybeAutoAttack(character)) continue;
        if (this.maybeCharacterInitiative(character)) continue;
        if (this.maybeAmbientCharacterSpeech(character)) continue;
        this.decideCharacterMovement(character, { forceMove });
      }
      this.unexpectedParty?.advanceTurn();
    }

    maybeCharacterInitiative(character) {
      if (!character.visible || character.carriedBy || character.position !== this.currentRoom) return false;
      if (character.id === this.player.id || character.friendly === false) return false;
      if (this.player.noticeable === false) {
        const flag = `initiative_${character.id}_unseen`;
        if (this.flags[flag]) return false;
        this.flags[flag] = true;
        this.print(`${character.name} looks around, puzzled, unable to see who is there.`);
        return true;
      }
      const action = this.characterInitiative(character);
      if (!action || this.flags[action.flag]) return false;
      this.flags[action.flag] = true;
      if (action.effect) action.effect();
      this.print(action.message);
      return true;
    }

    characterInitiative(character) {
      if (matches(character.name, "gandalf")) return this.gandalfInitiative(character);
      if (matches(character.name, "thorin")) return this.thorinInitiative(character);
      if (matches(character.name, "elrond")) return this.elrondInitiative(character);
      if (matches(character.name, "beorn")) return this.beornInitiative(character);
      if (matches(character.name, "bard")) return this.bardInitiative(character);
      if (matches(character.name, "wood elf")) {
        return {
          flag: "initiative_wood_elf_warning",
          message: "The wood elf watches you closely and says 'This wood listens more kindly to honest footsteps than to hurried tongues.'",
        };
      }
      if (matches(character.name, "butler")) {
        return {
          flag: "initiative_butler_barrels",
          message: "The butler mutters 'Barrels are for wine, not for wandering burglars.'",
        };
      }
      return null;
    }

    maybeAmbientCharacterSpeech(character) {
      if (!character.visible || character.carriedBy || character.position !== this.currentRoom) return false;
      if (character.id === this.player.id || this.player.noticeable === false) return false;

      let lines = null;
      if (matches(character.name, "elrond") && this.currentRoom === "rivendell") lines = ELROND_AMBIENT_LINES;
      if (matches(character.name, "beorn") && this.currentRoom === "beorns_house") lines = BEORN_AMBIENT_LINES;
      if (!lines?.length) return false;

      const cooldownKey = `ambientcooldown_${character.id}`;
      if ((this.flags[cooldownKey] || 0) > this.turnCount) return false;

      const seed = hashString(`${character.id}:${this.turnCount}:${this.currentRoom}`);
      const line = lines[Math.abs(seed) % lines.length];
      this.flags[cooldownKey] = this.turnCount + 4 + (Math.abs(seed) % 3);
      this.print(`${character.name} says '${line}'`);
      return true;
    }

    gandalfAmbientKeyForRoom(roomId) {
      if (!roomId) return null;
      if (["hobbit_hole", "bilbos_garden"].includes(roomId)) return "bag_end";
      if (["green_dragon_inn", "green_dragon_inn_outside"].includes(roomId)) return "green_dragon";
      if (["trolls_clearing", "hidden_path", "trolls_cave"].includes(roomId)) return "trolls";
      if (roomId === "rivendell") return "rivendell";
      if (
        ["misty_mountain", "narrow_place", "large_dry_cave"].includes(roomId)
        || /^narrow_path_\d+$/.test(roomId)
        || /^steep_path_\d+$/.test(roomId)
        || /^deep_misty_valley_\d+$/.test(roomId)
      ) return "mountains";
      if (
        ["goblins_dungeon", "dark_winding_passage", "big_cavern", "inside_goblins_gate", "outside_goblins_gate", "narrow_dangerous_path"].includes(roomId)
        || /^dark_stuffy_passage_\d+$/.test(roomId)
      ) return "goblins";
      if (roomId === "deep_dark_lake") return "deep_lake";
      if (roomId === "beorns_house") return "beorn";
      if (roomId === "gate_to_mirkwood") return "mirkwood_gate";
      if (["place_of_black_spiders", "forest_of_tangled_smothering_trees"].includes(roomId)) return "spiders";
      if (["elvish_clearing", "elvenkings_halls", "dark_dungeon", "cellar"].includes(roomId)) return "elves";
      if (["long_lake", "wooden_town", "strong_river"].includes(roomId)) return "laketown";
      if (["bleak_barren_land", "ruins_of_the_town_of_dale", "stoe_of_ravenhill"].includes(roomId)) return "dale";
      if (["front_gate", "little_steep_bay"].includes(roomId)) return "front_gate";
      if (["lower_halls", "smooth_straight_passage", "empty_place"].includes(roomId)) return "mountain_halls";
      if (roomId === "lonely_mountain") return "lonely_mountain";
      if ([
        "forest_river",
        "forest_road",
        "forest_road_2",
        "forest",
        "waterfall",
        "running_river",
        "bewitched_gloomy_place",
        "west_bank",
        "east_bank",
        "green_forest",
        "deep_bog",
        "treeless_opening",
        "great_river",
        "mountains",
      ].includes(roomId)) return "mirkwood";
      return null;
    }

    gandalfAmbientInitiative() {
      const key = this.gandalfAmbientKeyForRoom(this.currentRoom);
      const lines = key && GANDALF_AMBIENT_LINES[key];
      if (!key || !lines?.length) return null;
      const seed = hashString(`gandalf-ambient:${key}:${this.currentRoom}`);
      return {
        flag: `initiative_gandalf_ambient_${key}`,
        message: `Gandalf says '${lines[Math.abs(seed) % lines.length]}'`,
      };
    }

    gandalfInitiative(character) {
      if (this.characterHas(character, "curious map") && !this.autoplayHas("curious map")) {
        return {
          flag: "initiative_gandalf_offer_map",
          message: "Gandalf taps the curious map and says 'Some roads are easier to see when a map has passed through wise hands.'",
        };
      }
      if (this.autoplayHas("curious map") && !this.flags.mapread) {
        return {
          flag: "initiative_gandalf_asks_for_map",
          message: "Gandalf says 'That map has slept long enough. Rivendell may wake more from it than I can.'",
        };
      }
      if (this.autoplayHas("smoking pipe") && !this.flags.initiative_gandalf_pipe) {
        return {
          flag: "initiative_gandalf_pipe",
          message: "Gandalf eyes the pipe and says 'A wizard never objects to a good pipe, though the road needs your courage more.'",
        };
      }
      return this.gandalfAmbientInitiative();
    }

    thorinInitiative(character) {
      if (this.currentRoom === "green_dragon_inn" && !this.flags.seenpony) {
        if (!this.flags.lanternon) {
          return {
            flag: "initiative_thorin_lantern",
            message: "Thorin says 'There is something beyond the glass, but dwarf eyes are not made for this dark.'",
          };
        }
        return {
          flag: "initiative_thorin_window",
          message: "Thorin glances at the window and says 'That pane sits higher than it seems. Height may matter here.'",
        };
      }
      if (this.currentRoom === "dark_dungeon" && !this.flags.initiative_thorin_window_escape) {
        return {
          flag: "initiative_thorin_window_escape",
          message: "Thorin whispers 'Stone walls are stern things, but not every opening is useless.'",
        };
      }
      if (this.currentRoom === "front_gate" && this.flags.secretdoorsun && !this.doorOpenByName("secret door") && this.characterHas(character, "curious key")) {
        return {
          flag: "initiative_thorin_secret_door",
          message: "Thorin turns the curious key in his fingers and watches the sunlit stone in silence.",
        };
      }
      if (this.currentRoom === "west_bank" && !this.flags.ropeinboat && this.autoplayHas("sturdy rope")) {
        return {
          flag: "initiative_thorin_rope_boat",
          message: "Thorin says 'A boat across the water is near enough to tempt a rope, if the hand is bold.'",
        };
      }
      return null;
    }

    elrondInitiative(character) {
      if (this.autoplayHas("curious map") && !this.flags.mapread) {
        return {
          flag: "initiative_elrond_requests_map",
          message: "Elrond says 'That map is older than it looks. It may speak more clearly under Rivendell's light.'",
        };
      }
      if (this.characterHas(character, "curious map") && !this.flags.mapread) {
        return {
          flag: "initiative_elrond_read_prompt",
          message: "Elrond traces the markings on the map and says 'These signs are not idle decoration.'",
        };
      }
      if (!this.flags.elrond_lunch_given && this.currentRoom === "rivendell") {
        return {
          flag: "initiative_elrond_lunch",
          message: "Elrond says 'Road-worn minds hear counsel better after rest and food.'",
        };
      }
      return null;
    }

    beornInitiative(character) {
      if (this.currentRoom !== "beorns_house") return null;
      if (!this.flags.initiative_beorn_warning) {
        return {
          flag: "initiative_beorn_warning",
          message: "Beorn says 'Keep to the path in Mirkwood. The wood is black-hearted, and an old hunger walks beneath its boughs.'",
        };
      }
      if ((this.player.strength || 0) < 6 && !this.flags.initiative_beorn_food) {
        return {
          flag: "initiative_beorn_food",
          message: "Beorn eyes your weariness and says 'A hungry traveler thinks poorly. There is food in this house, if you have the sense to look for it.'",
        };
      }
      return null;
    }

    bardInitiative(character) {
      if (this.liveDragon() && this.currentRoom === "lonely_mountain" && this.autoplayHas("treasure")) {
        return {
          flag: "initiative_bard_dragon_order",
          message: this.flags.bardreadiedarrow
            ? "Bard says 'When fire descends, a single true shot may matter more than treasure.'"
            : "Bard says 'Against such fire, no ordinary shaft should be trusted.'",
        };
      }
      if (this.liveDragon() && ["front_gate", "lonely_mountain", "stoe_of_ravenhill", "little_steep_bay"].includes(this.currentRoom)) {
        return {
          flag: "initiative_bard_ready",
          message: "Bard tests his bowstring and says 'A bowman likes to know his moment before the sky darkens.'",
        };
      }
      if (!this.flags.dragondefeated && this.currentRoom === "wooden_town") {
        return {
          flag: "initiative_bard_join",
          message: "Bard says 'Some roads should not be walked without a bow at your side.'",
        };
      }
      return null;
    }

    characterHas(character, itemName) {
      return [...(character.inventory || []), ...(character.worn || [])].some((itemId) => matches(this.items[itemId]?.name, itemName));
    }

    doorOpenByName(name) {
      const found = this.roomConnections().find((connection) => {
        const door = connection.door && this.doors[connection.door];
        return door && matches(door.name, name);
      });
      const door = found?.door && this.doors[found.door];
      return Boolean(door && door.open && !door.locked);
    }

    updateRingTimers() {
      for (const character of Object.values(this.characters)) {
        if (!character.wearingRing) continue;
        character.ringTimer -= 1;
        if (character.ringTimer > 0) continue;
        character.wearingRing = false;
        character.noticeable = true;
        const ringId = character.worn?.find((itemId) => matches(this.items[itemId]?.name, "golden ring"));
        if (ringId) {
          character.worn = character.worn.filter((itemId) => itemId !== ringId);
          this.items[ringId].worn = false;
          this.items[ringId].location = { type: "character", id: character.id };
          if (!character.inventory.includes(ringId)) character.inventory.push(ringId);
        }
        this.print(character.id === this.data.player ? "The golden ring slips off you finger and falls in your pocket." : `The golden ring slips off ${character.name}'s finger and falls in ${character.name}'s pocket.`);
      }
    }

    maybeAutoAttack(character) {
      if (!character.visible || character.position !== this.currentRoom) return false;
      if (matches(character.name, "gollum") && this.currentRoom === "deep_dark_lake") {
        if (!this.gollumState?.enraged) return false;
        if (this.player.noticeable === false) return false;
      }
      if (character.friendly !== false || (character.attackFlag || 0) < 2) return false;
      const target = this.peopleInRoom().find((candidate) => {
        if (candidate.id === character.id || !candidate.visible || candidate.noticeable === false) return false;
        return character.friendly !== true || candidate.friendly !== true;
      });
      if (!target) return false;
      const result = this.attackCharacter(character, target, null, { forced: true });
      if (!this.endgame) this.print(result, target.id === this.data.player ? "danger" : "");
      return true;
    }

    decideCharacterMovement(character, options = {}) {
      const { forceMove = false } = options;
      if (!character.visible || character.carriedBy || character.movementMode === "never") return;
      if (this.isLooseFollower(character)) return this.decideLooseFollowerMovement(character, { forceMove });
      if (character.movementMode === "on_first_meet" && !character.hasMetPlayer) {
        if (character.position !== this.currentRoom) return;
        character.hasMetPlayer = true;
      }
      if (!forceMove && Math.random() >= 0.1) return;

      const exits = shuffled(this.connectionsFrom(character.position));
      for (const connection of exits) {
        if (!this.canTravelConnection(connection)) continue;
        this.moveCharacter(character, connection.to, connection.direction);
        break;
      }
    }

    moveCharacter(character, toRoom, direction, options = {}) {
      const fromRoom = character.position;
      if (!fromRoom || !toRoom || fromRoom === toRoom) return;
      character.position = toRoom;
      character.attackFlag = 0;
      character.justEntered = toRoom === this.currentRoom;
      if (options.silent) return;
      if (fromRoom === this.currentRoom) this.print(`${character.name} goes ${direction}.`);
      if (toRoom === this.currentRoom) {
        this.scheduleCharacterArrivalNotice(character);
        character.justEntered = false;
      }
    }

    attackCharacter(attacker, target, weapon = null, options = {}) {
      if (!attacker.visible) return "";
      if (attacker.id === target.id) return `${attacker.name} cannot attack themselves.`;
      if (target.noticeable === false) return attacker.name === "You" ? `You cannot see ${target.name} to attack them.` : `${attacker.name} cannot see ${target.name} to attack.`;
      if (attacker.friendly === true && target.friendly === true) return `${attacker.name} should not attack ${target.name}.`;
      if (attacker.friendly === "neutral" && !options.forced) return `${attacker.name} ignores your request.`;
      if (!target.visible) return `${attacker.name} tries to attack ${target.name}, but ${target.name} is already dead.`;

      const attackerName = displayCharacterName(attacker);
      const targetName = displayCharacterName(target);
      const attackStrength = (attacker.strength || 1) + (weapon ? (weapon.weight || 0) : 0);
      const successful = attackStrength > (target.strength || 1);
      const fallen = successful ? target : attacker;
      const winner = successful ? attacker : target;
      const weaponText = weapon ? ` with ${weapon.name}` : "";
      let message;

      if (attacker.id === this.data.player) {
        message = `You attack ${targetName}${weaponText}.`;
        message += successful
          ? ` ${capitalize(targetName)} counters, but you strike again and ${targetName} is dead.`
          : ` ${capitalize(targetName)} counters at once and you are dead.`;
      } else if (target.id === this.data.player) {
        message = `${attackerName} attacks you${weaponText}.`;
        message += successful
          ? ` You strike back, but ${attackerName} attacks again and you are dead.`
          : ` You counterattack and ${attackerName} is dead.`;
      } else {
        message = `${attackerName} attacks ${targetName}${weaponText}.`;
        message += successful
          ? ` ${capitalize(targetName)} strikes back, but ${attackerName} attacks again and ${targetName} falls dead.`
          : ` ${capitalize(targetName)} counters and ${attackerName} is dead.`;
      }

      this.dropInventory(fallen);
      fallen.visible = false;
      attacker.attackFlag = 0;
      if (fallen.id === this.data.player) {
        this.endGame(message, { fatal: true });
        return "";
      }
      return message;
    }

    dropInventory(character) {
      for (const itemId of [...(character.inventory || []), ...(character.worn || [])]) {
        const item = this.items[itemId];
        if (item) {
          item.worn = false;
          item.visible = true;
          item.location = { type: "room", id: character.position || this.currentRoom };
        }
      }
      character.inventory = [];
      character.worn = [];
      character.wearingRing = false;
      character.noticeable = true;
    }

    endGame(message, options = {}) {
      this.stopAutoplay();
      this.clearArrivalNoticeTimers();
      output.replaceChildren();
      output.classList.add("end-screen");
      this.endgame = true;
      this.endgameRestartArmed = true;
      this.pendingEndgameChoice = options.fatal ? "death" : null;
      const totalRooms = Math.max(Object.keys(this.rooms).length, 1);
      const percentage = (this.visitedRooms.size / totalRooms) * 100;
      const endMessage = message ? `${message.replace(/[.!?]*$/, "")}. ` : "";
      this.print(`${endMessage}You have mastered ${percentage.toFixed(2)}% of this adventure.`, "danger");
      if (options.fatal && this.autosaveSnapshot) {
        const roomText = this.autosaveMeta?.roomName ? ` at ${this.autosaveMeta.roomName.replace(/_/g, " ")}` : "";
        this.print(`Type 'autosave' to continue from the last checkpoint${roomText}, or 'restart' to begin again.`, "system");
      } else if (options.fatal) {
        this.print("Type 'restart' to begin again.", "system");
      } else {
        this.print("Press any key or click to restart.", "system");
      }
    }

    winGame(message) {
      this.stopAutoplay();
      this.clearArrivalNoticeTimers();
      output.replaceChildren();
      output.classList.add("end-screen");
      this.endgame = true;
      this.endgameRestartArmed = true;
      this.pendingEndgameChoice = null;
      const totalRooms = Math.max(Object.keys(this.rooms).length, 1);
      const percentage = (this.visitedRooms.size / totalRooms) * 100;
      const endMessage = message ? `${message.replace(/[.!?]*$/, "")}. ` : "";
      this.print(`${endMessage}You have mastered ${percentage.toFixed(2)}% of this adventure.`, "success");
      this.print("Press any key or click to restart.", "system");
    }

    restartGame() {
      this.stopAutoplay();
      this.clearArrivalNoticeTimers();
      this.rooms = clone(this.data.rooms);
      this.items = clone(this.data.items);
      this.doors = clone(this.data.doors);
      this.characters = clone(this.data.characters);
      this.connections = this.normalizeConnections(clone(this.data.connections));
      this.currentRoom = this.data.startRoom;
      this.flags = {};
      this.endgame = false;
      this.endgameRestartArmed = false;
      this.pendingEndgameChoice = null;
      this.visitedTrollsClearing = false;
      this.waitCounter = 0;
      this.secretDoorWaitCounter = 0;
      this.trollsTransformed = false;
      this.trollsDefeated = false;
      this.visitedRooms = new Set();
      this.tipsEnabled = false;
      this.tipIndex = 0;
      this.autoplayDelay = 450;
      this.autoplayMode = "normal";
      this.autoplayWaits = 0;
      this.autoplayTypingTimer = null;
      this.autoplayCapturedText = "";
      this.autoplayCapturingOutput = false;
      this.pendingClarification = null;
      this.forcedChoice = null;
      this.commandIssuer = null;
      this.lastConversationCharacterId = null;
      this.lastReferencedCharacterId = null;
      this.splitter = new CommandSplitter(this.data);
      this.delegatedSplitters = new Map();
      this.sharedDelegatedContext = { lastObject: null, lastDirectObject: null, lastTargetObject: null };
      output.replaceChildren();
      output.classList.remove("end-screen");
      this.initState();
      this.describeRoom(true);
      input.value = "";
      input.focus();
    }

    handleTimedSpecials() {
      if (this.currentRoom !== "trolls_clearing" && this.visitedTrollsClearing && !this.trollsTransformed) {
        this.waitCounter += 1;
        if (this.waitCounter >= 3) {
          this.print("Day dawns.");
          this.transformTrolls();
          this.waitCounter = 0;
        }
      }
      if (this.currentRoom === "dark_dungeon") this.toggleDoorByName("red door", "Someone opens the red door.", "Someone closes the red door.");
      if (this.currentRoom === "large_dry_cave") this.toggleDoorByName("small hidden crevice", "A small hidden crevice is revealed.", "The small hidden crevice disappears.");
      if (["front_gate", "stoe_of_ravenhill", "little_steep_bay", "lonely_mountain"].includes(this.currentRoom) && !this.flags.secretdoorsun) {
        this.secretDoorWaitCounter += 1;
        if (this.secretDoorWaitCounter >= 1) {
          this.flags.secretdoorsun = true;
          this.print("The sun shines on the rock and reveals a secret door.");
        }
      }
      if (this.flags.treasuretaken && this.currentRoom === "lonely_mountain" && this.liveDragon()) {
        this.print("A shadow passes over the mountain. Smaug is searching for the thief.");
      }
    }

    triggerSpiderEyesEncounter(previousRoom, currentRoom, direction) {
      if (!this.flags.dragondefeated) return;
      const trigger = this.spiderEyesTriggerFor(previousRoom, currentRoom, direction);
      if (!trigger) return;
      if (this.flags[this.spiderEyesResolvedFlag(currentRoom)]) return;
      this.recordAutosave(`before the spider ambush near ${this.rooms[currentRoom]?.name?.replace(/_/g, " ") || currentRoom}`, {
        key: `hazard:spider-eyes:${currentRoom}`,
      });
      this.spiderEyesState = {
        active: true,
        room: currentRoom,
        waits: 0,
        safeDirections: trigger.safeDirections,
        safeDestination: trigger.safeDestination,
      };
      this.print("You see some pale bulbous eyes.");
    }

    handleSpiderEyesCommand(command) {
      const state = this.spiderEyesState;
      if (!state?.active || this.currentRoom !== state.room) return false;
      const text = normalize(command);
      if (text === "wait") return false;
      const direction = this.isDirection(command)
        ? this.normalizeDirection(command)
        : command.startsWith("go ")
          ? this.normalizeDirection(command.slice(3).trim())
          : "";
      if (state.waits === 2 && direction && (state.safeDirections || []).includes(direction)) {
        this.flags[this.spiderEyesResolvedFlag(state.room)] = true;
        const destination = state.safeDestination || null;
        this.spiderEyesState = null;
        if (destination) {
          const previousRoom = this.currentRoom;
          this.currentRoom = destination;
          this.player.position = destination;
          this.moveFollowers(previousRoom, destination, direction);
          this.describeRoom();
          this.checkSpecialSituations();
          return true;
        }
        return false;
      }
      this.killBySpiderEyes();
      return true;
    }

    spiderEyesTriggerFor(previousRoom, currentRoom, direction) {
      if (currentRoom === "forest_road_2" && ["waterfall", "forest", "running_river"].includes(previousRoom) && direction === "west") {
        return { safeDirections: ["west"], safeDestination: null };
      }
      if (currentRoom === "forest_road" && previousRoom === "forest_road_2" && direction === "west") {
        return { safeDirections: ["west"], safeDestination: "beorns_house" };
      }
      return null;
    }

    spiderEyesResolvedFlag(roomId) {
      return `spidereyesresolved_${roomId}`;
    }

    killBySpiderEyes() {
      this.endGame("Something stings. You are dead.", { fatal: true });
    }

    checkSpecialSituations() {
      this.checkGollumEncounter();
      this.checkKidnapping();
      this.checkTrollsClearing();
    }

    checkGollumEncounter() {
      if (this.currentRoom !== "deep_dark_lake") return;
      if (!this.gollumState) this.gollumState = this.createGollumState();
      const gollum = this.currentGollum();
      if (!gollum || !gollum.visible) return;

      if (!this.gollumState.met) {
        this.recordAutosave("before meeting Gollum", { key: "hazard:gollum:room" });
        this.gollumState.met = true;
        gollum.friendly = "neutral";
        if (this.ensureLakeRingInPocket()) {
          this.print("Groping beside the water in the dark, your fingers close around a small cold ring. Almost without thinking, you slip it into your pocket.");
        }
        for (const line of this.gollumRevealLines()) this.print(line);
        return;
      }

      if (this.gollumState.pocketQuestionAsked && this.player.noticeable !== false) {
        this.print("Gollum prowls between you and the northern passage, sniffing for the ring.");
      }
    }

    checkTrollsClearing() {
      if (this.currentRoom !== "trolls_clearing") return;
      if (!this.visitedTrollsClearing) {
        this.recordAutosave("before facing the trolls", { key: "hazard:trolls:room" });
        this.visitedTrollsClearing = true;
        this.waitCounter = 0;
        this.print("You crouch low behind a mossy boulder, heart pounding, as the trolls argue by the flickering campfire in the moonlit clearing.");
        this.print("What shall us do with him?");
        this.print("Roast him!");
        this.print("He wouldn't make above a mouthful.");
        this.print("P'raps there are more like him round about.");
        return;
      }
      if (this.trollsTransformed) {
        this.trollsDefeated = true;
        this.print("You see the stone remains of the trolls.");
        return;
      }
      const liveTroll = this.peopleInRoom().find((p) => ["hideous troll", "vicious troll"].includes(normalize(p.name)) && p.visible);
      if (liveTroll && !this.trollsDefeated) {
        this.print("The hideous troll eats you. You are dead.", "danger");
        this.endGame("You are dead.", { fatal: true });
      }
    }

    maybeAutosaveForRoom(roomId = this.currentRoom) {
      const hazardMap = {
        deep_dark_lake: { label: "before meeting Gollum", key: "hazard:gollum:room" },
        trolls_clearing: { label: "before facing the trolls", key: "hazard:trolls:room" },
        west_bank: { label: "before testing the fast river", key: "hazard:river:west-bank" },
        cellar: { label: "before the barrel escape", key: "hazard:river:cellar" },
        forest_road_2: { label: "before crossing the spider-haunted road", key: "hazard:spiders:forest-road-2" },
        forest_road: { label: "before the second spider-haunted crossing", key: "hazard:spiders:forest-road" },
      };
      const hazard = hazardMap[roomId];
      if (!hazard) return false;
      return this.recordAutosave(hazard.label, { key: hazard.key });
    }

    transformTrolls() {
      if (this.trollsTransformed) return;
      for (const character of Object.values(this.characters)) {
        if (!["hideous troll", "vicious troll"].includes(normalize(character.name))) continue;
        this.dropInventory(character);
        character.visible = false;
        character.position = "trolls_clearing";
      }
      this.trollsTransformed = true;
      const room = this.rooms.trolls_clearing;
      if (room?.transformedImage) room.image = room.transformedImage;
      if (this.currentRoom === "trolls_clearing") this.print("You see the stone remains of the trolls.");
    }

    checkKidnapping() {
      const woodElf = Object.values(this.characters).find((p) => normalize(p.name) === "wood elf" && p.visible);
      if (!woodElf || woodElf.position !== this.player.position) return;
      if (this.player.wearingRing && this.player.noticeable === false) {
        this.print("The wood elf cannot see you because you are wearing the ring.");
        return;
      }
      const dungeon = this.rooms.dark_dungeon;
      if (!dungeon) return;
      this.print("The wood elf captures you");
      this.player.position = "dark_dungeon";
      this.currentRoom = "dark_dungeon";
      woodElf.position = this.rooms.beorns_house ? "beorns_house" : woodElf.position;
      this.describeRoom();
    }

    toggleDoorByName(name, openMessage, closeMessage) {
      const found = this.roomConnections().find((connection) => {
        const door = connection.door && this.doors[connection.door];
        return door && matches(door.name, name);
      });
      const door = found?.door && this.doors[found.door];
      if (!door || Math.random() >= 0.3) return;
      if (door.locked || !door.open) {
        door.locked = false;
        door.open = true;
        this.print(openMessage);
      } else {
        door.open = false;
        this.print(closeMessage);
      }
    }

    handleTalk(command) {
      const parsed = this.parseTalkCommand(command);
      if (!parsed) return this.print("You speak, but only silence meets your words.");
      const character = this.resolveCharacterTarget(parsed.characterName);
      if (!character) return this.print("You speak, but only silence meets your words.");
      if (character.friendly === false) return this.respondToTalk(character);
      if (this.player.name === "You" && this.player.noticeable === false) return this.print(`${character.name} says 'who's talking?'`);
      if (this.unexpectedParty?.blocksDirectInteraction(character, parsed.order ? "order" : "talk")) return;
      if (matches(character.name, "gollum") && parsed.order && this.handleGollumSpeech(parsed.order)) return;
      if (parsed.order) {
        this.rememberConversationCharacter(character);
        this.rememberReferencedCharacter(parsed.order);
        if (this.handleBardDragonCommand(character, parsed.order)) return;
        this.delegateCharacterOrder(character, parsed.order);
        return;
      }
      this.rememberConversationCharacter(character);
      const special = this.specialTalkResponse(character);
      if (special) return this.print(special);
      this.print(`${character.name} listens intently, expecting your words.`);
    }

    parseTalkCommand(command) {
      let text = normalize(command).replace(/^(say|talk|speak|whisper|yell)\s+/, "").trim();
      text = text.replace(/^(to|with)\s+/, "").trim();
      if (!text) return null;
      const quoted = text.match(/^(.+?)\s+"(.+)"$/);
      if (quoted) return { characterName: quoted[1].trim(), order: quoted[2].trim() };
      const people = this.peopleInRoom()
        .filter((character) => character.id !== this.player.id && character.visible)
        .sort((a, b) => b.name.length - a.name.length);
      for (const character of people) {
        const name = normalize(character.name);
        if (text === name) return { characterName: name, order: "" };
        if (text.startsWith(`${name} `)) return { characterName: name, order: text.slice(name.length).trim().replace(/^to\s+/, "") };
      }
      return { characterName: text, order: "" };
    }

    respondToTalk(character) {
      if (matches(character.name, "gollum") && this.currentRoom === "deep_dark_lake") {
        if (this.gollumState?.pocketQuestionAsked) return this.print("Gollum is no longer listening. He is hunting for his precious.");
        const line = this.beginGollumRiddleContest() || "Gollum watches you in silence from the dark water.";
        return this.print(line);
      }
      this.print(`${character.name} glares at you, unimpressed.`);
    }

    handleBardDragonCommand(character, command) {
      if (!matches(character.name, "bard")) return false;
      const text = normalizeWords(command);
      if (/\bget\b/.test(text) && /\barrow\b/.test(text) && /\bquiver\b/.test(text)) {
        const hasArrow = character.inventory.some((itemId) => matches(this.items[itemId]?.name, "arrow"));
        if (hasArrow) this.flags.bardreadiedarrow = true;
        this.print(hasArrow ? "Bard readies the strong arrow from his quiver." : "Bard searches his quiver, but finds no arrow.");
        return true;
      }
      const dragon = Object.values(this.characters).find((candidate) => matches(candidate.name, "dragon"));
      const liveDragonVisible = Boolean(dragon && dragon.visible !== false);
      const asksToAttack = /\b(kill|attack|shoot|slay|fire)\b/.test(text)
        || /\btake\b.*\bshot\b/.test(text)
        || (/\bloose\b/.test(text) && /\barrow\b/.test(text));
      const targetsDragon = /\bdragon\b/.test(text) || (liveDragonVisible && (/\btake\b.*\bshot\b/.test(text) || /\bloose\b/.test(text)));
      if (!asksToAttack || !targetsDragon) return false;

      const hasBow = character.inventory.some((itemId) => matches(this.items[itemId]?.name, "bow"));
      const hasArrow = character.inventory.some((itemId) => matches(this.items[itemId]?.name, "arrow"));
      if (!hasBow || !hasArrow) {
        this.print("Bard checks his gear, but he lacks the bow and arrow needed to face the dragon.");
        return true;
      }

      if (!dragon || dragon.visible === false) {
        this.print("Bard says the dragon has already been slain.");
        return true;
      }

      dragon.visible = false;
      dragon.attackFlag = 0;
      this.flags.dragondefeated = true;
      this.print("Bard draws his bow, sets the strong arrow to the string, and shoots. Far away, the dragon falls from the sky.");
      return true;
    }

    trySpecialAction(verb, objectText) {
      const roomName = this.room().name;
      const adverb = this.splitter.lastAdverb;
      for (const action of this.data.specialActions) {
        if (action.verb !== verb) continue;
        if (action.location && action.location !== roomName) continue;
        if (action.special_char && !matches(this.player.name, normalize(action.special_char))) continue;
        if (!this.matchesSpecialActionObjects(action, objectText, adverb)) continue;
        if (this.isPonyWindowAction(action) && this.flags.ponysequencecompleted) {
          if (action.desc1) this.print(actorActionSentence(this.player, action.desc1));
          this.print(this.flags.lanternon
            ? "He peers through the window, but the stable stands empty now."
            : "He peers through the window, his eyes narrowing, but it's too dark to see anything.");
          return true;
        }
        if (this.isPonySequenceAction(action) && this.flags.ponysequencecompleted) continue;
        const unavailable = this.specialActionUnavailable(action);
        if (unavailable) {
          this.print(unavailable);
          return true;
        }
        if (!this.flagIn1Allowed(action.flag_in1)) continue;
        if (!this.flagIn2Allowed(action.flag_in2)) {
          const flagName = String(action.flag_in2 || "").replace("*", "");
          if (flagName && this.flags[flagName]) {
            const revealed = action.reveals ? this.findRevealedItem(action.reveals) : null;
            if (revealed?.location?.type === "room" && revealed.location.id === this.currentRoom) {
              if (action.desc2) this.print(action.desc2);
            } else if (revealed?.location?.type === "character" && revealed.location.id === this.player.id) {
              this.print(this.alreadyDidMessage(action));
            } else {
              this.print(this.alreadyDidMessage(action));
            }
            if (revealed) revealed.visible = true;
            return true;
          }
          continue;
        }
        if (this.isLanternLightAction(action)) {
          return this.igniteLantern(actorActionSentence(this.player, action.desc1));
        }
        if (String(action.destination || "").includes("endgame")) {
          const roomLabel = this.room()?.name?.replace(/_/g, " ") || "this place";
          this.recordAutosave(`before a dangerous action in ${roomLabel}`, {
            key: `special:${this.currentRoom}:${action.verb}:${action.obj1 || ""}:${action.obj2 || ""}:${action.destination}`,
          });
        }
        if (action.desc1) this.print(actorActionSentence(this.player, action.desc1));
        if (action.desc2) this.print(action.desc2, action.destination?.includes("endgame") ? "danger" : "");
        this.performSpecialActionTransfer(action);
        if (action.flag_out) this.setFlag(action.flag_out.replace("*", ""), true);
        if (action.reveals) this.reveal(action.reveals);
        if (this.isPonySequenceAction(action)) {
          this.flags.ponysequencecompleted = true;
          this.flags.ponypassageopen = true;
          if (this.items.calm_pony) this.items.calm_pony.visible = false;
        }
        if (action.destination) {
          if (action.destination.includes("endgame")) {
            this.endGame("The adventure ends.", { fatal: true });
          } else if (this.roomByName(action.destination)) {
            this.currentRoom = this.roomByName(action.destination).id;
            this.player.position = this.currentRoom;
            this.describeRoom();
            this.maybeAutosaveForRoom(this.currentRoom);
            this.checkSpecialSituations();
          }
        }
        return Boolean(action.desc1 || action.desc2 || action.reveals || action.destination);
      }
      return false;
    }

    performSpecialActionTransfer(action) {
      if (!["take", "steal"].includes(action.verb)) return false;
      const targetName = String(action.obj1 || "").trim();
      if (!targetName.startsWith("*")) return false;

      const held = this.findVisibleCharacterHolding(targetName.replace(/^\*/, ""));
      if (!held?.item || held.worn || !held.item.portable) return false;
      if (held.item.weight > this.player.strength * 5) {
        this.print(`The ${held.item.name} is too heavy to take.`);
        return true;
      }
      if (!this.canCarryAdditionalWeight(held.item.weight || 0)) {
        this.print(this.carryTooMuchMessage(held.item));
        return true;
      }

      this.detachItem(held.item.id);
      held.item.location = { type: "character", id: this.player.id };
      this.player.inventory.push(held.item.id);
      if (matches(held.item.name, "treasure")) this.flags.treasuretaken = true;
      this.print(`${actorSubject(this.player, true)} ${actorVerb(this.player, "take")} the ${held.item.name}.`);
      return true;
    }

    isPonySequenceAction(action) {
      return action.location === "Green Dragon Inn Outside"
        && action.verb === "climb"
        && ["on", "onto"].includes(action.adverb)
        && action.obj2 === "low branch"
        && action.destination === "Dreary"
        && action.flag_in1 === "seenpony";
    }

    isPonyWindowAction(action) {
      return action.location === "Green Dragon Inn"
        && action.verb === "look"
        && action.special_char === "Thorin"
        && action.obj2 === "window";
    }

    isLanternLightAction(action) {
      return action.verb === "light"
        && matches(action.obj1 || "", "brass lantern")
        && matches(action.obj2 || "", "firestone");
    }

    matchesSpecialActionObjects(action, objectText, adverb) {
      const text = normalizeWords(objectText);
      const requiredAdverb = String(action.adverb || "").trim();
      if (this.currentRoom === "trolls_cave" && action.reveals === "arcane chest") {
        const obj1Matches = !action.obj1 || commandObjectMatches(text, action.obj1);
        if (!obj1Matches) return false;
        if (this.hasActiveLantern()) return true;
        return requiredAdverb === adverb || wordInCommand(text, requiredAdverb);
      }
      const adverbMatches = !requiredAdverb || requiredAdverb === adverb || wordInCommand(text, requiredAdverb);
      const obj1Matches = !action.obj1 || commandObjectMatches(text, action.obj1);
      let obj2Matches = !action.obj2 || commandObjectMatches(text, action.obj2);

      if (!obj2Matches && requiredAdverb === "with") {
        obj2Matches = this.hasInventoryMatch(action.obj2);
      }

      if (!obj1Matches || !obj2Matches) return false;
      if (adverbMatches) return true;

      const mentionedPrimary = action.obj1 && commandObjectMatches(text, action.obj1);
      const mentionedSecondary = action.obj2 && commandObjectMatches(text, action.obj2);
      return Boolean(mentionedPrimary || mentionedSecondary);
    }

    hasInventoryMatch(name) {
      const query = normalize(String(name || "").replace("*", ""));
      if (!query) return false;
      return this.player.inventory.some((itemId) => matches(this.items[itemId]?.name, query));
    }

    specialActionUnavailable(action) {
      const canUseVisiblePortable = new Set(["climb", "jump", "swim"]);
      for (const objectName of [action.obj1, action.obj2].filter(Boolean)) {
        if (String(objectName).includes("*")) continue;
        const query = normalize(String(objectName).replace("*", ""));
        const inventoryItem = this.player.inventory.map((id) => this.items[id]).find((item) => matches(item?.name, query));
        if (inventoryItem) continue;
        const roomItem = this.visibleSearch(query, { includeInventory: false })?.item;
        if (roomItem && canUseVisiblePortable.has(action.verb)) continue;
        if (roomItem?.portable) return `${actorSubject(this.player, true)} ${actorVerb(this.player, "do")} not have the ${roomItem.name}.`;
        if (roomItem) continue;
        if (this.findDoor(query)) continue;
        const heldMessage = this.heldItemMessage(query);
        if (heldMessage) return heldMessage;
        const knownPortable = Object.values(this.items).find((item) => item.portable && matches(item.name, query));
        if (knownPortable) return `${actorSubject(this.player, true)} ${actorVerb(this.player, "do")} not have the ${knownPortable.name}.`;
        return "I do not see that here.";
      }
      return "";
    }

    revealFromSpecial(verb, objectName) {
      for (const action of this.data.specialActions) {
        if (action.verb === verb && action.location === this.room().name && action.reveals && objectName.includes((action.obj1 || action.obj2 || "").replace("*", ""))) {
          this.reveal(action.reveals);
        }
      }
    }

    reveal(name) {
      const room = this.roomByName(name);
      if (room) return;
      const item = this.findRevealedItem(name);
      if (item) item.visible = true;
    }

    findRevealedItem(name) {
      return Object.values(this.items).find((candidate) => matches(candidate.name, normalize(name))) || null;
    }

    alreadyDidMessage(action) {
      const target = action.obj1 || action.obj2;
      const verb = pastTense(action.verb);
      return target ? actorizeSecondPerson(this.player, `You have already ${verb} the ${target.replace("*", "")}.`) : "That has already been done.";
    }

    flagIn1Allowed(flag) {
      if (!flag) return true;
      const inverted = String(flag).startsWith("*");
      const name = String(flag).replace("*", "");
      const value = this.getFlag(name);
      return inverted ? !value : value;
    }

    flagIn2Allowed(flag) {
      if (!flag) return true;
      const inverted = String(flag).startsWith("*");
      const name = String(flag).replace("*", "");
      const value = this.getFlag(name);
      return inverted ? value : !value;
    }

    getFlag(name) {
      const normalizedName = String(name || "").replace("*", "");
      const builtIns = {
        trolls_transformed: this.trollsTransformed,
        trolls_defeated: this.trollsDefeated,
        visited_trolls_clearing: this.visitedTrollsClearing,
      };
      if (Object.prototype.hasOwnProperty.call(builtIns, normalizedName)) return Boolean(builtIns[normalizedName]);
      return Boolean(this.flags[normalizedName]);
    }

    setFlag(name, value) {
      this.flags[name] = value;
      if (name.endsWith("open")) this.flags[name.replace(/open$/, "closed")] = !value;
    }

    lanternTurnsRemaining() {
      return Math.max(0, Number(this.flags.lanternturns) || 0);
    }

    normalizeLanternState() {
      if (!this.flags.lanternon) {
        this.flags.lanternturns = 0;
        return;
      }
      if (this.lanternTurnsRemaining() === 0) this.flags.lanternturns = LANTERN_BURN_TURNS;
    }

    igniteLantern(message = "You light the brass lantern. It gives off a steady glow for a while.") {
      if (this.flags.lanternon && this.lanternTurnsRemaining() > 0) {
        this.print("The brass lantern is already lit.");
        return true;
      }
      this.flags.lanternon = true;
      this.flags.lanternturns = LANTERN_BURN_TURNS;
      this.print(actorizeSecondPerson(this.player, message));
      this.revealLanternDiscoveries();
      return true;
    }

    updateLanternTimer() {
      if (!this.flags.lanternon) return;
      const remaining = this.lanternTurnsRemaining() - 1;
      if (remaining > 0) {
        this.flags.lanternturns = remaining;
        return;
      }
      this.flags.lanternon = false;
      this.flags.lanternturns = 0;
      this.print("The brass lantern flickers and goes out.");
    }

    unrecognized(command) {
      const responses = this.data.responses.responses || {};
      if (responses[command]) return this.print(responses[command]);
      for (const [pattern, response] of Object.entries(responses)) {
        if (!pattern.includes("<object>")) continue;
        const re = new RegExp(`^${escapeRegExp(pattern).replace("<object>", "(.+)")}$`);
        const match = command.match(re);
        if (match) return this.print(response.replace("<object>", match[1]));
      }
      this.print("I'm not sure how to do that.");
    }

    normalizeDirection(direction) {
      const aliases = {
        n: "north", s: "south", e: "east", w: "west", ne: "north east",
        nw: "north west", se: "south east", sw: "south west", u: "up", d: "down",
      };
      return aliases[direction] || direction;
    }

    isDirection(command) {
      return Boolean({
        north: 1, south: 1, east: 1, west: 1, "north east": 1, "north west": 1,
        "south east": 1, "south west": 1, up: 1, down: 1, n: 1, s: 1, e: 1,
        w: 1, ne: 1, nw: 1, se: 1, sw: 1, u: 1, d: 1,
      }[command]);
    }

    detachItem(itemId) {
      const item = this.items[itemId];
      if (!item) return;
      for (const other of Object.values(this.items)) {
        other.contents = other.contents.filter((id) => id !== itemId);
      }
      for (const character of Object.values(this.characters)) {
        character.inventory = character.inventory.filter((id) => id !== itemId);
        character.worn = (character.worn || []).filter((id) => id !== itemId);
      }
      item.location = null;
    }

    currentCarryWeight(character = this.player) {
      if (!character) return 0;
      const heldIds = [...(character.inventory || []), ...(character.worn || [])];
      return heldIds.reduce((total, itemId) => total + (this.items[itemId]?.weight || 0), 0);
    }

    carryCapacity(character = this.player) {
      const baseCapacity = BASE_CARRY_CAPACITY + ((character?.strength || 0) * CARRY_CAPACITY_PER_STRENGTH);
      return baseCapacity + (character?.id === this.data.player ? PLAYER_CARRY_BONUS : 0);
    }

    canCarryAdditionalWeight(weight, { character = this.player, removedWeight = 0 } = {}) {
      const nextWeight = this.currentCarryWeight(character) - removedWeight + (weight || 0);
      return nextWeight <= this.carryCapacity(character);
    }

    carryTooMuchMessage(item) {
      const nextWeight = this.currentCarryWeight() + (item?.weight || 0);
      return `The ${item.name} would be too much to carry (${nextWeight}/${this.carryCapacity()}).`;
    }

    inventoryItemLabel(item) {
      if (!item) return "";
      return `${this.describeItemShort(item)} (${item.weight || 0})`;
    }

    inventorySidebarLabel(item) {
      if (!item) return "";
      const flags = this.itemStateFlags(item);
      const state = flags.length ? ` [${flags.join(", ")}]` : "";
      return `${item.name}${state} (${item.weight || 0})`;
    }

    itemStateFlags(item) {
      const flags = [];
      if (item.broken) flags.push("broken");
      else if (item.mended) flags.push("mended");
      if (matches(item.name, "brass lantern") && this.flags.lanternon) flags.push("lit");
      else if (matches(item.name, "elegant lamp") && item.open) flags.push("lit");
      else if (item.container && !item.noLid && item.open) flags.push("open");
      return flags;
    }

    describeItemShort(item) {
      return this.insertFlagsIntoDescription(item.description || item.name, this.itemStateFlags(item));
    }

    insertFlagsIntoDescription(text, flags = []) {
      const description = String(text || "").trim();
      if (!flags.length || !description) return description;
      const joinedFlags = flags.join(", ");
      const match = description.match(/^(a|an|the)\s+(.+)$/i);
      if (!match) return `${joinedFlags} ${description}`;
      const article = match[1];
      const rest = match[2];
      const adjustedArticle = /^(a|an)$/i.test(article)
        ? (/^[aeiou]/i.test(joinedFlags) ? "an" : "a")
        : article;
      return `${adjustedArticle} ${joinedFlags} ${rest}`;
    }

    roomByName(name) {
      return Object.values(this.rooms).find((room) => matches(room.name, normalize(name)));
    }
  }

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/\bthe\b/g, "")
      .replace(/\ban?\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function matches(name, query) {
    name = normalizeWords(name);
    query = normalizeWords(query);
    if (!query) return false;
    return query.split(/\s+/).every((word) => name.split(/\s+/).some((nameWord) => nameWord === word || nameWord.includes(word)));
  }

  function matchesAny(text, choices) {
    return choices.some((choice) => matches(text, choice) || matches(choice, text));
  }

  function commandObjectMatches(commandText, requiredName) {
    const commandWords = normalizeWords(commandText).split(/\s+/).filter(Boolean);
    const requiredWords = normalizeWords(String(requiredName || "").replace("*", "")).split(/\s+/).filter(Boolean);
    if (!requiredWords.length) return true;
    return requiredWords.some((requiredWord) => {
      return commandWords.some((commandWord) => requiredWord === commandWord || requiredWord.includes(commandWord) || commandWord.includes(requiredWord));
    });
  }

  function splitCommandParts(text) {
    const parts = [];
    let current = "";
    let inQuote = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (char === '"') inQuote = !inQuote;
      if (!inQuote && text.slice(index, index + 5) === " and ") {
        if (/^(ask|tell|say)\b/.test(current.trim()) && /\bto\b/.test(current)) {
          current += " and ";
          index += 4;
          continue;
        }
        const cleaned = current.trim().replace(/^(?:and|then)\s+/, "");
        if (cleaned) parts.push(cleaned);
        current = "";
        index += 4;
        continue;
      }
      current += char;
    }
    const cleaned = current.trim().replace(/^(?:and|then)\s+/, "");
    if (cleaned) parts.push(cleaned);
    return parts;
  }

  function replaceCommandSeparators(text) {
    let output = "";
    let inQuote = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (char === '"') {
        inQuote = !inQuote;
        output += char;
        continue;
      }
      if (!inQuote && char === ",") {
        const before = output.trim();
        const after = text.slice(index + 1).trim();
        const beforeWords = before.split(/\s+/);
        if (beforeWords.length === 1 && after) {
          output += " ";
          continue;
        }
        output += " and ";
        continue;
      }
      if (!inQuote && text.slice(index, index + 4).toLowerCase() === "then" && isBoundary(text[index - 1]) && isBoundary(text[index + 4])) {
        output += " and ";
        index += 3;
        continue;
      }
      output += char;
    }
    return output;
  }

  function normalizeNaturalCommand(command) {
    return command
      .replace(/[.?!]+$/g, "")
      .replace(/^bilbo\s+(?:gives|give)\s+/, "give ")
      .replace(/^bilbo\s+(?:takes|take)\s+/, "take ")
      .replace(/\bseek\b/g, "find")
      .replace(/\blocate\b/g, "find")
      .replace(/\btrack\b/g, "find")
      .replace(/\bgo\s+and\s+look\s+for\b/g, "look for")
      .replace(/\bgo\s+and\s+search\s+for\b/g, "search for")
      .replace(/\bgo\s+and\s+find\b/g, "find")
      .replace(/\blook\s+around\s+for\b/g, "look for")
      .replace(/\band\s+then\b/g, "and")
      .replace(/\b(this|my|your)\b/g, " ")
      .replace(/^(?:please\s+)?(?:can|could|would|will)\s+you\s+/, "")
      .replace(/^(?:please\s+)?(?:can|could|would|will)\s+/, "")
      .replace(/^please\s+/, "")
      .replace(/\s+please$/g, "")
      .replace(/^have\s+([a-z][a-z ]+?)\s+([a-z].+)$/i, "tell $1 to $2")
      .replace(/^say\s+to\s+([a-z][a-z ]+?)\s+to\s+(.+)$/i, "tell $1 to $2")
      .replace(/^head\s+(?=(?:back\s+(?:inside|outside)|north|south|east|west|north east|north west|south east|south west|up|down|n|s|e|w|ne|nw|se|sw|u|d)\b)/i, "")
      .replace(/\btake\s+a\s+look\b/g, "look")
      .replace(/\bhave\s+a\s+look\b/g, "look")
      .replace(/\bopen\s+up\b/g, "open")
      .replace(/\bpick\s+(.+?)\s+back\s+up\b/g, "take $1")
      .replace(/\bgive\s+(.+?)\s+back\s+to\b/g, "give $1 to")
      .replace(/\bgive\s+me\s+(.+?)\s+back\b/g, "give $1 to me")
      .replace(/\bloose\s+(?:the\s+)?arrow\b/g, "take shot")
      .replace(/\s+for\s+(?:me|us)\s*$/g, "")
      .replace(/\bturn\s+off\b/g, "close")
      .replace(/\bturn\s+on\b/g, "open")
      .replace(/\bpick\s+up\b/g, "take")
      .replace(/\bput\s+down\b/g, "leave")
      .replace(/\bhand\s+me\b/g, "hand me")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeDelegatedTellCommand(command, verbs) {
    const text = String(command || "").trim();
    if (!text.startsWith("tell ")) return command;
    const tail = text.slice(5).trim();
    if (!tail) return command;

    const commaIndex = tail.indexOf(",");
    if (commaIndex >= 0) {
      const target = tail.slice(0, commaIndex).trim();
      const rest = tail.slice(commaIndex + 1).trim();
      if (!target || !rest) return command;
      if (/^(?:to|for|about|where|whether|if|what|why|how|that)\b/.test(rest)) return `tell ${target} ${rest}`;
      const restVerb = rest.split(/\s+/)[0];
      if (!verbs.includes(restVerb)) return command;
      return `tell ${target} to ${rest}`;
    }

    const normalizedTail = tail.replace(/\b(?:the|a|an)\b/g, " ").replace(/\s+/g, " ").trim();
    const words = normalizedTail.split(/\s+/).filter(Boolean);
    if (["to", "for", "about", "where", "whether", "if", "what", "why", "how", "that"].includes(words[1])) return command;
    let splitIndex = -1;
    for (let index = 1; index < words.length; index += 1) {
      if (verbs.includes(words[index])) {
        splitIndex = index;
        break;
      }
    }
    if (splitIndex < 0) return command;
    const target = words.slice(0, splitIndex).join(" ");
    const rest = words.slice(splitIndex).join(" ");
    if (!target || !rest) return command;
    return `tell ${target} to ${rest}`;
  }

  function parseCanonicalDialogueInput(rawCommand) {
    let text = String(rawCommand || "").trim();
    if (!text) return null;
    let speaker = "Bilbo";
    const speakerMatch = text.match(/^([A-Za-z]+):\s*(.+)$/);
    if (speakerMatch) {
      speaker = speakerMatch[1];
      text = speakerMatch[2].trim();
    }
    const spokenMatch = text.match(/^([A-Za-z]+),\s*(.+)$/);
    if (!spokenMatch) return null;
    return {
      speaker,
      addressee: spokenMatch[1],
      line: spokenMatch[2],
    };
  }

  function canonicalDialogueResponse(speaker, addressee, line) {
    const wantedSpeaker = dialogueKeyPart(speaker);
    const wantedAddressee = dialogueKeyPart(addressee);
    const wantedLine = dialogueLineKey(line);
    const match = CANONICAL_DIALOGUES.find(([entrySpeaker, entryAddressee, entryLine]) => {
      return dialogueKeyPart(entrySpeaker) === wantedSpeaker
        && dialogueKeyPart(entryAddressee) === wantedAddressee
        && dialogueLineKey(entryLine) === wantedLine;
    });
    return match?.[3] || "";
  }

  function dialogueKeyPart(text) {
    return normalizeWords(text);
  }

  function dialogueLineKey(text) {
    return normalizeWords(String(text || "").replace(/[.,!?;:"“”]/g, " "))
      .replace(/\b(the|a|an)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function displayDialogueName(name) {
    const normalized = normalizeWords(name);
    const entry = CANONICAL_DIALOGUES.find((dialogue) => dialogueKeyPart(dialogue[1]) === normalized);
    return entry?.[1] || capitalize(name);
  }

  function normalizeVocativeCommand(command, verbs) {
    const match = command.match(/^([a-z][a-z ]{1,30})\s*,?\s+(.+)$/);
    if (!match) return command;
    const firstWord = match[1].split(/\s+/)[0];
    if (verbs.includes(firstWord)) return command;
    const rest = match[2].trim();
    const withoutModal = rest.replace(/^(?:please\s+)?(?:can|could|would|will)\s+you\s+/, "").trim();
    const softenedRest = withoutModal.startsWith("mind ")
      ? normalizeLeadingGerund(withoutModal.slice(5).trim())
      : withoutModal;
    const normalizedRest = normalizeNaturalCommand(rest).trim();
    const normalizedSoftenedRest = normalizeNaturalCommand(softenedRest).trim();
    const restVerb = normalizedRest.split(/\s+/)[0];
    const softenedVerb = normalizedSoftenedRest.split(/\s+/)[0];
    if (normalizedSoftenedRest !== normalizedRest && verbs.includes(softenedVerb)) {
      return `ask ${match[1].trim()} to ${normalizedSoftenedRest}`;
    }
    if (["who", "where", "what", "why", "how", "whether", "if"].includes(restVerb)) {
      return `ask ${match[1].trim()} ${normalizedRest}`;
    }
    if (!verbs.includes(restVerb)) return command;
    return `ask ${match[1].trim()} to ${normalizedRest}`;
  }

  function normalizeLeadingGerund(phrase) {
    const text = String(phrase || "").trim();
    if (!text) return text;
    const [first, ...rest] = text.split(/\s+/);
    const irregular = {
      following: "follow",
      reading: "read",
      opening: "open",
      looking: "look",
      shooting: "shoot",
      giving: "give",
      taking: "take",
      waiting: "wait",
      helping: "help",
      trimming: "trim",
      watering: "water",
      digging: "dig",
      planting: "plant",
      raking: "rake",
      unlocking: "unlock",
      locking: "lock",
      wearing: "wear",
      removing: "remove",
    };
    if (!irregular[first]) return text;
    return [irregular[first], ...rest].join(" ");
  }

  function isBoundary(char) {
    return !char || !/[a-z0-9]/i.test(char);
  }

  function wordInCommand(commandText, word) {
    const words = normalizeWords(commandText).split(/\s+/).filter(Boolean);
    const needle = normalizeWords(word);
    return words.includes(needle);
  }

  function articleFor(name, capital = false) {
    const article = /^[aeiou]/i.test(name) ? "an" : "a";
    return capital ? article[0].toUpperCase() + article.slice(1) : article;
  }

  function itemLabel(name) {
    const text = String(name || "");
    if (!text) return "";
    if (/^(a|an|the)\s/i.test(text) || isProperName(text)) return text;
    return `${articleFor(text)} ${text}`;
  }

  function displayCharacterName(character) {
    if (character.id === "you" || character.name === "You") return "you";
    return isProperName(character.name) ? character.name : `the ${character.name}`;
  }

  function actorSubject(character, capital = false) {
    if (character.name === "You") return capital ? "You" : "you";
    return character.name;
  }

  function actorVerb(character, verb) {
    if (character.name === "You") return verb;
    const irregular = {
      are: "is",
      do: "does",
      "don't": "doesn't",
      have: "has",
      "haven't": "hasn't",
      can: "can",
      "can't": "can't",
      could: "could",
      may: "may",
      might: "might",
      must: "must",
      "mustn't": "mustn't",
      shall: "shall",
      should: "should",
      "shouldn't": "shouldn't",
      will: "will",
      "won't": "won't",
      would: "would",
      "wouldn't": "wouldn't",
      "aren't": "isn't",
      "weren't": "weren't",
    };
    if (irregular[verb]) return irregular[verb];
    if (verb.endsWith("y")) return `${verb.slice(0, -1)}ies`;
    if (verb.endsWith("s") || verb.endsWith("sh") || verb.endsWith("ch") || verb.endsWith("x")) return `${verb}es`;
    return `${verb}s`;
  }

  function actorActionSentence(character, phrase) {
    const text = String(phrase || "").trim();
    const match = text.match(/^([a-z]+)(\b.*)$/i);
    if (!match) return `${actorSubject(character, true)} ${text}`;
    return `${actorSubject(character, true)} ${actorVerb(character, match[1].toLowerCase())}${match[2]}`;
  }

  function actorizeSecondPerson(character, text) {
    const value = String(text || "").trim();
    if (!value || character.name === "You") return value;
    const sentences = value.split(/(?<=[.!?])\s+/).filter(Boolean);
    return sentences.map((sentence) => {
      const match = sentence.match(/^You\s+([a-z']+)(\b.*)$/i);
      if (!match) return sentence.replace(/^You\b/, actorSubject(character, true));
      return `${actorSubject(character, true)} ${actorVerb(character, match[1].toLowerCase())}${match[2]}`;
    }).join(" ");
  }

  function capitalize(text) {
    text = String(text || "");
    return text ? text[0].toUpperCase() + text.slice(1) : text;
  }

  function characterPresence(character) {
    if (character.justEntered) {
      return characterArrivalMessage(character);
    }
    if (isProperName(character.name)) return `${character.name} is here.`;
    return `${articleFor(character.name, true)} ${character.name} is here.`;
  }

  function characterArrivalMessage(character) {
    if (isProperName(character.name)) return `${character.name} enters.`;
    return `${articleFor(character.name, true)} ${character.name} enters.`;
  }

  function parseAllTarget(text) {
    const normalized = normalize(text);
    if (normalized === "all") return { all: true, target: "" };
    if (normalized.startsWith("all ")) return { all: true, target: normalized.slice(4).trim() };
    return { all: false, target: normalized };
  }

  function primaryObjectText(verb, objectText) {
    if (["give"].includes(verb) && objectText.includes(" to ")) return objectText.split(" to ")[0];
    if (["break", "kill", "attack", "combine"].includes(verb) && objectText.includes(" with ")) return objectText.split(" with ")[0];
    if (["drop", "leave", "put"].includes(verb) && objectText.includes(" in ")) return objectText.split(" in ")[0];
    return objectText;
  }

  function replacePrimaryObject(verb, objectText, replacement) {
    if (["give"].includes(verb) && objectText.includes(" to ")) {
      return `${replacement} to ${objectText.split(" to ").slice(1).join(" to ")}`;
    }
    if (["break", "kill", "attack", "combine"].includes(verb) && objectText.includes(" with ")) {
      return `${replacement} with ${objectText.split(" with ").slice(1).join(" with ")}`;
    }
    if (["drop", "leave", "put"].includes(verb) && objectText.includes(" in ")) {
      return `${replacement} in ${objectText.split(" in ").slice(1).join(" in ")}`;
    }
    return replacement;
  }

  function uniqueChoices(choices) {
    const seen = new Set();
    const result = [];
    for (const choice of choices) {
      const key = `${choice.type}:${choice.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(choice);
    }
    return result;
  }

  function shuffled(items) {
    const result = items.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  }

  function joinNames(names) {
    if (names.length <= 1) return names[0] || "";
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
  }

  function isProperName(name) {
    return /^[A-Z]/.test(String(name || ""));
  }

  function normalizeWords(text) {
    return normalize(text)
      .split(/\s+/)
      .filter(Boolean)
      .map(singularize)
      .join(" ");
  }

  function singularize(word) {
    if (word.length <= 3) return word;
    const irregular = {
      leaves: "leaf",
      knives: "knife",
      lives: "life",
      wolves: "wolf",
      shelves: "shelf",
      halves: "half",
      loaves: "loaf",
      thieves: "thief",
      men: "man",
      women: "woman",
      children: "child",
      teeth: "tooth",
      feet: "foot",
      geese: "goose",
      mice: "mouse",
    };
    if (irregular[word]) return irregular[word];
    if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
    if (word.endsWith("ves") && word.length > 4) return word.slice(0, -3) + "f";
    if (word.endsWith("ches") || word.endsWith("shes") || word.endsWith("xes") || word.endsWith("zes") || word.endsWith("ses")) {
      return word.slice(0, -2);
    }
    if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
    if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
    return word;
  }

  function pastTense(verb) {
    const irregular = {
      lift: "lifted",
      read: "read",
      cut: "cut",
      put: "put",
      throw: "thrown",
      pull: "pulled",
      climb: "climbed",
      look: "looked",
      examine: "examined",
      jump: "jumped",
      steal: "stolen",
      take: "taken",
      kill: "killed",
      light: "lit",
      talk: "talked",
    };
    if (irregular[verb]) return irregular[verb];
    if (verb.endsWith("e")) return `${verb}d`;
    if (verb.endsWith("y")) return `${verb.slice(0, -1)}ied`;
    return `${verb}ed`;
  }

  function compact(text) {
    return normalize(text).replace(/\s+/g, "");
  }

  function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function fillList(node, values, emptyText) {
    node.textContent = "";
    if (!values.length) {
      const item = document.createElement("li");
      item.className = "empty";
      item.textContent = emptyText;
      node.append(item);
      return;
    }
    for (const value of values) {
      const item = document.createElement("li");
      item.textContent = value;
      node.append(item);
    }
  }

  function uniqueId(map, label) {
    const base = normalize(label).replace(/\s+/g, "_") || "item";
    let id = base;
    let counter = 1;
    while (map[id]) {
      counter += 1;
      id = `${base}_${counter}`;
    }
    return id;
  }

  function hashString(text) {
    let hash = 0;
    for (const char of String(text)) {
      hash = (hash * 31 + char.charCodeAt(0)) | 0;
    }
    return hash;
  }

  function assetUrl(root, file) {
    return `${root}${String(file).split("/").map(encodeURIComponent).join("/")}?v=${ASSET_VERSION}`;
  }

  window.hobbitGame = new HobbitGame(DATA);
  const fontReady = document.fonts?.ready || Promise.resolve();
  fontReady.finally(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.remove("booting");
      });
    });
  });
})();

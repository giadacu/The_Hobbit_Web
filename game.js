(() => {
  const DATA = window.HOBBIT_DATA;
  const IMAGE_ROOT = "assets/local-images/";
  const MUSIC_ROOT = "assets/local-music/";
  const ASSET_VERSION = "20260606-1931";
  const SAVE_PREFIX = "hobbit-web-save:";

  const $ = (id) => document.getElementById(id);
  const output = $("output");
  const input = $("command-input");
  const form = $("command-form");
  const roomImage = $("room-image");
  const musicPlayer = $("music-player");
  const inventoryList = $("inventory-list");
  const exitsList = $("exits-list");
  const peopleList = $("people-list");

  const commandsWithoutObject = new Set([
    "look", "wait", "inventory", "i", "save", "load", "quit", "verbs",
    "mysaves", "hello", "tips", "map", "location", "music",
  ]);

  class CommandSplitter {
    constructor(data) {
      this.verbs = data.parser.verbs || [];
      this.directions = [
        "north", "south", "east", "west", "north east", "north west",
        "south east", "south west", "up", "down", "n", "s", "e", "w",
        "ne", "nw", "se", "sw", "u", "d",
      ];
      this.synonyms = data.parser.synonyms || {};
      this.adverbs = data.parser.adverbs || [];
      this.lastAdverb = null;
      this.lastObject = null;
    }

    split(text) {
      let command = text.trim().toLowerCase();
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
        command = command.replace(new RegExp(`\\b${escapeRegExp(from)}\\b`, "gi"), to);
      }
      command = command.replace(/\bthen\b/gi, " and ").replace(/,/g, " and ").replace(/\s+/g, " ").trim();

      const raw = command.split(" and ").map((part) => part.trim()).filter(Boolean);
      const result = [];
      let lastVerb = null;
      for (const part of raw) {
        let words = part.split(/\s+/);
        words = words.map((word) => {
          if (["it", "him", "her"].includes(word) && this.lastObject) return this.lastObject;
          return word;
        });
        let verb = words[0];
        let object = words.slice(1).join(" ");
        if (!this.verbs.includes(verb) && !this.directions.includes(part)) {
          object = words.join(" ");
          verb = lastVerb || "";
        }
        if (verb) {
          lastVerb = verb;
          result.push(`${verb} ${object}`.trim());
        } else if (object) {
          result.push(object);
        }
        if (object) this.lastObject = object.split(/\s+/).pop();
      }
      return result.length ? result : [command];
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
      this.connections = data.connections;
      this.currentRoom = data.startRoom;
      this.flags = {};
      this.tipsEnabled = false;
      this.tipIndex = 0;
      this.musicEnabled = false;
      this.currentTrack = null;
      this.audioErrorShown = false;
      this.pendingClarification = null;
      this.forcedChoice = null;
      this.audio = musicPlayer;
      this.audio.loop = true;
      this.audio.preload = "auto";
      this.audio.volume = 0.75;
      this.initState();
      this.bind();
      this.describeRoom(true);
    }

    initState() {
      for (const item of Object.values(this.items)) {
        item.location = null;
        item.contents = [];
        item.broken = false;
      }
      for (const character of Object.values(this.characters)) {
        character.inventory = [];
        character.worn = [];
        character.visible = character.visible !== false;
      }
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
      this.player = this.characters[this.data.player] || Object.values(this.characters).find((c) => c.name === "You");
      this.currentRoom = this.player.position || this.data.startRoom;
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
    }

    execute(rawCommand) {
      const lower = rawCommand.toLowerCase();
      if (this.pendingClarification) {
        this.handleClarification(rawCommand);
        this.render();
        return;
      }
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
      for (const command of commands) {
        const moved = this.processCommand(command);
        if (moved) break;
      }
      this.render();
    }

    processCommand(command) {
      if (this.isDirection(command)) {
        this.move(this.normalizeDirection(command));
        return true;
      }

      if (command.startsWith("go ")) {
        this.handleGo(command.slice(3).trim());
        return true;
      }

      if (command.startsWith("say to ") || command.startsWith("talk to ")) {
        this.handleTalk(command);
        return false;
      }

      const [verb, ...rest] = command.split(/\s+/);
      const object = rest.join(" ").trim();
      if (!verb) return false;

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
        look: () => this.describeRoom(),
        examine: () => this.examine(object),
        inspect: () => this.examine(object),
        inventory: () => this.inventory(),
        i: () => this.inventory(),
        wait: () => this.wait(),
        hello: () => this.hello(),
        tips: () => this.tips(object),
        verbs: () => this.verbs(),
        mysaves: () => this.listSaves(),
        save: () => this.save(object),
        load: () => this.load(object),
        map: () => this.showMap(),
        location: () => this.print(`You are currently in ${this.room().name.replace(/_/g, " ")}.`),
        music: () => this.handleMusicCommand(object),
        wear: () => this.wear(object),
        remove: () => this.remove(object),
        give: () => this.give(object),
        kill: () => this.attack(object),
        attack: () => this.attack(object),
        break: () => this.breakThing(object),
        push: () => this.pushPull("push", object),
        pull: () => this.pushPull("pull", object),
        climb: () => this.climb(object),
        eat: () => this.eat(object),
        combine: () => this.combine(object),
      };

      if (handlers[verb]) handlers[verb]();
      else this.unrecognized(command);
      return false;
    }

    room() {
      return this.rooms[this.currentRoom];
    }

    roomConnections() {
      const seen = new Set();
      return this.connections.filter((connection) => {
        if (connection.from !== this.currentRoom) return false;
        const key = connection.direction;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    describeRoom(initial = false) {
      const room = this.room();
      if (!room) return;
      const doorText = this.roomConnections()
        .filter((c) => c.door && this.doors[c.door])
        .map((c) => `To the ${c.direction} there is the ${this.doors[c.door].name}. The ${this.doors[c.door].name} is ${this.doors[c.door].open ? "open" : "closed"}.`)
        .join(" ");
      const objects = this.itemsInRoom(this.currentRoom).filter((item) => item.visible);
      const objectText = objects.length ? `You see: ${objects.map((item) => this.describeItemShort(item)).join(", ")}.` : "";
      const people = this.peopleInRoom().filter((p) => p.name !== "You" && p.visible);
      const peopleText = people.map((p) => characterPresence(p)).join(" ");
      this.print([room.description, doorText, objectText, peopleText].filter(Boolean).join(" "));
      if (initial) {
        this.print('Type "tips" for a hint, "commands" or "verbs" for recognized words, "save name" to save.', "system");
      }
      this.render();
    }

    render() {
      const room = this.room();
      if (room?.image) {
        roomImage.src = assetUrl(IMAGE_ROOT, room.image);
        roomImage.alt = room.name;
      }
      fillList(inventoryList, this.player.inventory.map((id) => this.items[id]?.name).filter(Boolean), "nothing");
      fillList(exitsList, this.roomConnections().map((c) => c.direction), "none");
      fillList(peopleList, this.peopleInRoom().filter((p) => p.name !== "You" && p.visible).map((p) => p.name), "none");
    }

    print(text, kind = "") {
      if (!text) return;
      for (const part of String(text).split(/(?<=\.)2|(?<=\.)3|(?<=\.)4|\n/).filter(Boolean)) {
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
          if ((item.visible || item.broken) && matches(item.name, name)) candidates.push({ item, parent });
          if (item.container && (item.open || item.noLid || options.closedContainers)) scan(item.contents, item);
        }
      };
      scan(this.itemsInRoom(this.currentRoom).map((item) => item.id));
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
      this.pendingClarification = { verb, objectText, choices };
      const labels = choices.map((choice, index) => `${index + 1}. ${choice.name}`).join("; ");
      this.print(`Which ${request.target} do you mean? ${labels}.`, "system");
      return true;
    }

    ambiguousChoices(verb, objectText) {
      const itemVerbs = new Set(["take", "get", "open", "close", "unlock", "lock", "examine", "inspect", "break", "push", "pull", "drop", "leave", "put", "wear", "remove", "eat", "give", "combine"]);
      const doorVerbs = new Set(["open", "close", "unlock", "lock", "examine", "inspect", "break"]);
      const inventoryOnly = new Set(["drop", "leave", "put", "wear", "remove", "eat", "give", "combine"]);
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
        this.processCommand(`${pending.verb} ${resolvedObject}`.trim());
      } finally {
        this.forcedChoice = null;
      }
    }

    take(objectName) {
      if (!objectName) return this.print("What would you like to take?");
      if (objectName.includes("door")) return this.print(`You cannot take the ${objectName}.`);
      const fromMatch = objectName.split(" from ");
      const request = parseAllTarget(fromMatch[0]);
      const targetName = normalize(request.target);
      if (request.all) return this.takeAll(targetName);
      const found = this.visibleSearch(targetName, { includeInventory: false });
      if (!found) {
        const carried = this.findInInventory(targetName);
        return carried ? this.print(`You are already carrying the ${carried.name}.`) : this.print("I don't see that here.");
      }
      const item = found.item;
      if (item.location?.type === "character" && item.location.id === this.player.id) {
        return this.print(`You are already carrying the ${item.name}.`);
      }
      if (!item.portable) return this.print(`The ${item.name} can't be taken.`);
      if (item.weight > this.player.strength * 5) return this.print(`The ${item.name} is too heavy to take.`);
      this.detachItem(item.id);
      item.location = { type: "character", id: this.player.id };
      this.player.inventory.push(item.id);
      const source = found.parent?.id ? ` from the ${found.parent.name}` : "";
      this.print(`You take the ${item.name}${source}.`);
    }

    takeAll(objectName) {
      const foundItems = this.visibleSearchAll(objectName, { includeInventory: false })
        .filter(({ item }) => item.portable && item.weight <= this.player.strength * 5);
      if (!foundItems.length) return this.print("I don't see anything like that here that can be taken.");
      const taken = [];
      for (const { item } of foundItems) {
        this.detachItem(item.id);
        item.location = { type: "character", id: this.player.id };
        this.player.inventory.push(item.id);
        taken.push(item.name);
      }
      this.print(`You take the ${joinNames(taken)}.`);
    }

    drop(objectName) {
      if (!objectName) return this.print("What would you like to leave?");
      const item = this.findInInventory(objectName);
      if (!item) return this.print(`You don't have the ${objectName}.`);
      const inParts = objectName.split(" in ");
      if (inParts.length === 2) {
        const container = this.visibleSearch(inParts[1])?.item;
        if (!container || !container.container) return this.print(`I don't see the ${inParts[1]} here.`);
        if (!container.open && !container.noLid) return this.print(`The ${container.name} is closed.`);
        this.detachItem(item.id);
        item.location = { type: "item", id: container.id };
        container.contents.push(item.id);
        return this.print(`You put the ${item.name} in the ${container.name}.`);
      }
      this.detachItem(item.id);
      item.location = { type: "room", id: this.currentRoom };
      this.print(`You leave the ${item.name}.`);
    }

    open(objectName) {
      const request = parseAllTarget(objectName);
      if (request.all) return this.openAll(request.target);
      const doorFound = this.findDoor(objectName);
      if (doorFound) {
        const { door } = doorFound;
        if (door.open) return this.print(`The ${door.name} is already open.`);
        if (door.locked) {
          const key = this.keyFor(door);
          if (!key) return this.print(`The ${door.name} is locked.`);
          door.locked = false;
        }
        door.open = true;
        this.setFlag(`${compact(door.name)}open`, true);
        return this.print(`You open the ${door.name}.`);
      }
      const item = this.visibleSearch(objectName)?.item;
      if (!item) return this.print("I don't see that here.");
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
      this.print(`You open the ${item.name}.`);
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
        messages.push(`You open the ${item.name}.`);
      }
      this.print(messages.length ? messages.join(" ") : "I don't see anything like that here that can be opened.");
    }

    close(objectName) {
      const request = parseAllTarget(objectName);
      if (request.all) return this.closeAll(request.target);
      const doorFound = this.findDoor(objectName);
      if (doorFound) {
        doorFound.door.open = false;
        this.setFlag(`${compact(doorFound.door.name)}open`, false);
        return this.print(`You close the ${doorFound.door.name}.`);
      }
      const item = this.visibleSearch(objectName)?.item;
      if (!item) return this.print("I don't see that here.");
      if (!item.container) return this.print(`The ${item.name} cannot be closed.`);
      if (item.noLid) return this.print(`The ${item.name} has no lid.`);
      item.open = false;
      this.setFlag(`${compact(item.name)}open`, false);
      this.print(`You close the ${item.name}.`);
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
      this.print(closed.length ? `You close the ${joinNames(closed)}.` : "I don't see anything like that here that can be closed.");
    }

    unlock(objectName) {
      const target = this.findDoor(objectName)?.door || this.visibleSearch(objectName)?.item;
      if (!target) return this.print("I don't see that here.");
      if (!target.locked) return this.print(`The ${target.name} is already unlocked.`);
      const key = this.keyFor(target);
      if (!key) return this.print(`You do not have the required key for the ${target.name}.`);
      target.locked = false;
      this.print(`You unlock the ${target.name} with the ${key.name}.`);
    }

    lock(objectName) {
      const target = this.findDoor(objectName)?.door || this.visibleSearch(objectName)?.item;
      if (!target) return this.print("I don't see that here.");
      const key = this.keyFor(target);
      if (!key) return this.print(`You do not have the required key for the ${target.name}.`);
      target.locked = true;
      target.open = false;
      this.print(`You lock the ${target.name} with the ${key.name}.`);
    }

    keyFor(target) {
      const required = normalize(target.requiredKey || "");
      return this.player.inventory.map((id) => this.items[id]).find((item) => {
        return matches(item?.name, required) || matches(item?.keyFor, normalize(target.name));
      });
    }

    examine(objectName) {
      const door = this.findDoor(objectName)?.door;
      if (door) return this.print(`You see the ${door.name}. It is ${door.open ? "open" : "closed"}.`);
      const item = this.visibleSearch(objectName)?.item;
      if (!item) return this.print("I don't see that here.");
      let description = item.description;
      if (item.container && item.open && item.contents.length) {
        const visible = item.contents.map((id) => this.items[id]).filter((child) => child?.visible);
        if (visible.length) description += `; inside there is: ${visible.map((child) => this.describeItemShort(child)).join(", ")}`;
      }
      this.revealFromSpecial("examine", objectName);
      this.print(`You see ${description}.`);
    }

    inventory() {
      if (!this.player.inventory.length) return this.print("You are carrying: nothing.");
      const items = this.player.inventory.map((id) => this.describeItemShort(this.items[id])).join(", ");
      const worn = this.player.worn?.length ? ` You are wearing: ${this.player.worn.map((id) => this.items[id].name).join(", ")}.` : "";
      this.print(`You are carrying: ${items}.${worn}`);
    }

    wait() {
      this.print("You wait.");
      this.print("Time passes...");
    }

    hello() {
      const replies = this.peopleInRoom().filter((p) => p.name !== "You" && p.friendly === true).map((p) => `${p.name} says hello to you.`);
      this.print(replies.length ? replies.join("\n") : "No one responds to your greeting.");
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
        inventory: 1, save: 1, load: 1, go: 1, climb: 1, throw: 1,
        push: 1, pull: 1, wear: 1, remove: 1, hello: 1, combine: 1,
        map: 1, tips: 1, music: 1,
      });
      const special = this.data.specialActions.map((action) => action.verb);
      this.print("Allowed verbs are: " + [...new Set([...base, ...special])].sort().join(", "));
    }

    save(name) {
      if (!name) return this.print("Error: You must specify a filename to save.");
      localStorage.setItem(SAVE_PREFIX + name, JSON.stringify({
        items: this.items,
        doors: this.doors,
        characters: this.characters,
        currentRoom: this.currentRoom,
        flags: this.flags,
      }));
      this.print(`Game saved as "${name}".`);
    }

    load(name) {
      if (!name) return this.print("Error: You must specify a filename to load.");
      const raw = localStorage.getItem(SAVE_PREFIX + name);
      if (!raw) return this.print(`No saved game named "${name}" was found.`);
      const save = JSON.parse(raw);
      this.items = save.items;
      this.doors = save.doors;
      this.characters = save.characters;
      this.currentRoom = save.currentRoom;
      this.flags = save.flags || {};
      this.player = this.characters[this.data.player];
      this.print(`Game "${name}" loaded.`);
      this.describeRoom();
    }

    listSaves() {
      const saves = Object.keys(localStorage).filter((key) => key.startsWith(SAVE_PREFIX)).map((key) => key.slice(SAVE_PREFIX.length));
      this.print(saves.length ? `Saved games:\n${saves.join("\n")}` : "No saved games found.");
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
      if (!item) return this.print("You don't have that.");
      if (!item.wearable) return this.print(`The ${item.name} cannot be worn.`);
      this.detachItem(item.id);
      item.worn = true;
      this.player.worn.push(item.id);
      this.print(`You wear the ${item.name}.`);
    }

    remove(objectName) {
      const name = normalize(objectName);
      const id = this.player.worn.find((itemId) => matches(this.items[itemId]?.name, name));
      if (!id) return this.print(`You don't have the ${objectName} to remove.`);
      this.player.worn = this.player.worn.filter((itemId) => itemId !== id);
      this.items[id].worn = false;
      this.items[id].location = { type: "character", id: this.player.id };
      this.player.inventory.push(id);
      this.print(`You remove the ${this.items[id].name}.`);
    }

    give(command) {
      const parts = command.split(" to ");
      if (parts.length !== 2) return this.print("Use: give [item] to [character].");
      const item = this.findInInventory(parts[0]);
      const target = this.peopleInRoom().find((p) => p.name !== "You" && matches(p.name, normalize(parts[1])));
      if (!item) return this.print(`You don't have the ${parts[0]}.`);
      if (!target) return this.print(`There is no one named ${parts[1]} here.`);
      this.detachItem(item.id);
      item.location = { type: "character", id: target.id };
      target.inventory.push(item.id);
      this.print(`You give the ${item.name} to ${target.name}.`);
    }

    attack(command) {
      const targetName = command.split(" with ")[0];
      const target = this.peopleInRoom().find((p) => p.name !== "You" && matches(p.name, normalize(targetName)));
      if (!target) return this.print(`There is no one named ${targetName} here to attack.`);
      target.visible = false;
      this.print(`You attack ${target.name}. ${target.name} falls.`);
    }

    breakThing(command) {
      const targetName = command.split(" with ")[0];
      const door = this.findDoor(targetName)?.door;
      if (door) {
        door.open = true;
        door.locked = false;
        return this.print(`You break the ${door.name}.`);
      }
      const item = this.visibleSearch(targetName)?.item;
      if (!item) return this.print("I don't see that here.");
      item.broken = true;
      item.open = item.container ? true : item.open;
      this.print(`You break the ${item.name}.`);
    }

    pushPull(action, objectName) {
      const item = this.visibleSearch(objectName)?.item;
      if (!item) return this.print(`You cannot find the ${objectName} to ${action}.`);
      if (item.weight >= 3 * this.player.strength) return this.print(`The ${item.name} is too heavy to be ${action}ed.`);
      this.print(`You ${action} the ${item.name}.`);
    }

    climb(objectName) {
      this.print(objectName ? `You try to climb ${objectName}, but nothing special happens.` : "Climb where?");
    }

    eat(objectName) {
      const item = this.findInInventory(objectName);
      if (!item) return this.print(`You don't have the ${objectName}.`);
      this.detachItem(item.id);
      this.print(`You eat the ${item.name}.`);
    }

    combine(objectName) {
      const parts = objectName.split(" with ");
      if (parts.length !== 2) return this.print("Use: combine [item] with [item].");
      const first = this.findInInventory(parts[0]);
      const second = this.findInInventory(parts[1]);
      if (!first || !second) return this.print("You need both objects before combining them.");
      const key = Object.keys(this.data.combinations).find((combo) => combo.includes(first.name) && combo.includes(second.name));
      if (!key) return this.print("Those objects do not combine into anything useful.");
      const spec = this.data.combinations[key];
      const id = uniqueId(this.items, spec.nome || "combined item");
      this.items[id] = {
        id,
        name: spec.nome,
        description: spec.descrizione,
        container: spec.contenitore || false,
        portable: spec.needs_to_be_picked_up !== false,
        weight: spec.peso || 1,
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
      this.print(`You combine the ${first.name} with the ${second.name}, making the ${spec.nome}.`);
    }

    handleGo(command) {
      if (command.startsWith("through ")) {
        const found = this.findDoor(command.slice(8));
        if (!found) return this.print("There is no door by that name here.");
        return this.move(found.connection.direction);
      }
      if (command.startsWith("to ")) {
        const target = Object.values(this.rooms).find((room) => matches(room.name, normalize(command.slice(3))));
        if (!target) return this.print("I don't know how to get there from here.");
        const connection = this.roomConnections().find((c) => c.to === target.id);
        return connection ? this.move(connection.direction) : this.print("I don't know how to get there from here.");
      }
      this.move(this.normalizeDirection(command));
    }

    move(direction) {
      const connection = this.roomConnections().find((c) => c.direction === direction);
      if (!connection) return this.print('That direction is not recognized. Type "go <direction>" or "go through <door name>".');
      const door = connection.door && this.doors[connection.door];
      if (door && !door.open) return this.print(`The ${door.name} is closed.`);
      if (door && door.locked) return this.print(`The ${door.name} is locked.`);
      this.currentRoom = connection.to;
      this.player.position = connection.to;
      this.describeRoom();
    }

    handleTalk(command) {
      const quoted = command.match(/^(?:say|talk) to ([^"]+) "(.+)"$/);
      if (quoted) {
        const character = this.peopleInRoom().find((p) => p.name !== "You" && matches(p.name, normalize(quoted[1])));
        if (!character) return this.print("You speak, but only silence meets your words.");
        this.processCommand(quoted[2]);
        return;
      }
      const name = command.replace(/^(say|talk) to /, "");
      const character = this.peopleInRoom().find((p) => p.name !== "You" && matches(p.name, normalize(name)));
      if (!character) return this.print("You speak, but only silence meets your words.");
      this.print(character.friendly ? `${character.name} listens intently, expecting your words.` : `${character.name} glares at you, unimpressed.`);
    }

    trySpecialAction(verb, objectText) {
      const roomName = this.room().name;
      const adverb = this.splitter.lastAdverb;
      for (const action of this.data.specialActions) {
        if (action.verb !== verb) continue;
        if (action.location && action.location !== roomName) continue;
        if (action.adverb && action.adverb.trim() !== adverb && !objectText.includes(action.adverb.trim())) continue;
        if (action.obj1 && !objectText.includes(action.obj1.replace("*", ""))) continue;
        if (action.obj2 && !objectText.includes(action.obj2.replace("*", ""))) continue;
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
        if (action.desc1) this.print(`You ${action.desc1}`);
        if (action.desc2) this.print(action.desc2, action.destination?.includes("endgame") ? "danger" : "");
        if (action.flag_out) this.setFlag(action.flag_out.replace("*", ""), true);
        if (action.reveals) this.reveal(action.reveals);
        if (action.destination) {
          if (action.destination.includes("endgame")) {
            this.print("The adventure ends.", "danger");
          } else if (this.roomByName(action.destination)) {
            this.currentRoom = this.roomByName(action.destination).id;
            this.player.position = this.currentRoom;
            this.describeRoom();
          }
        }
        return Boolean(action.desc1 || action.desc2 || action.reveals || action.destination);
      }
      return false;
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
      return target ? `You have already ${verb} the ${target.replace("*", "")}.` : "That has already been done.";
    }

    flagIn1Allowed(flag) {
      if (!flag) return true;
      const inverted = String(flag).startsWith("*");
      const name = String(flag).replace("*", "");
      return inverted ? !this.flags[name] : Boolean(this.flags[name]);
    }

    flagIn2Allowed(flag) {
      if (!flag) return true;
      const inverted = String(flag).startsWith("*");
      const name = String(flag).replace("*", "");
      return inverted ? Boolean(this.flags[name]) : !this.flags[name];
    }

    setFlag(name, value) {
      this.flags[name] = value;
      if (name.endsWith("open")) this.flags[name.replace(/open$/, "closed")] = !value;
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

    describeItemShort(item) {
      const flags = [];
      if (item.broken) flags.push("broken");
      if (item.container && !item.noLid && item.open) flags.push("open");
      return `${flags.length ? `${flags.join(", ")} ` : ""}${item.description || item.name}`;
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

  function articleFor(name, capital = false) {
    const article = /^[aeiou]/i.test(name) ? "an" : "a";
    return capital ? article[0].toUpperCase() + article.slice(1) : article;
  }

  function characterPresence(character) {
    if (isProperName(character.name)) return `${character.name} is here.`;
    return `${articleFor(character.name, true)} ${character.name} is here.`;
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
})();

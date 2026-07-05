const fs = require("fs");
const path = require("path");
const {
  bootGame,
  outputLines,
  withSeed,
  execStep,
} = require("./headless-boot");

const FOREST_TO_CLEARING = [
  "open curtain", "open cupboard", "examine cupboard", "take meal", "eat meal",
  "north", "east", "south", "south east",
  "east", "east", "north", "east", "north", "east",
  "help dwarves", "break web with sword", "north",
];

function ringTargetSatisfied(game) {
  if (!game.bilboHasRecoveredRing?.()) return false;
  if (
    game.currentRoom === "deep_dark_lake"
    && game.gollumState?.met
    && !game.gollumState?.pocketQuestionAsked
    && !game.gollumState?.escaped
  ) {
    return false;
  }
  return true;
}

const STOP = {
  rivendell: (game) => game.currentRoom === "rivendell" && !game.endgame,
  rivendellComplete: (game) => Boolean(game.rivendellPreparationsComplete?.()) && !game.endgame,
  haveRing: (game) => ringTargetSatisfied(game) && !game.endgame,
  beornHouse: (game) => game.currentRoom === "beorns_house" && !game.endgame,
  mirkwoodCleared: (game) => Boolean(
    game.flags?.mirkwoodjourneycomplete
    || game.currentRoom === "elvish_clearing"
    || game.visitedRooms?.has("elvish_clearing")
  ) && !game.endgame,
  woodenTown: (game) => game.currentRoom === "wooden_town" && !game.endgame,
  longLake: (game) => game.currentRoom === "long_lake" && !game.endgame,
  frontGate: (game) => game.currentRoom === "front_gate" && !game.endgame,
  fatalDeath: (game) => game.endgame && game.pendingEndgameChoice === "death",
};

function makeExec(game, transcript) {
  const commands = [];
  const exec = (command) => {
    if (game.endgame) return commands;
    commands.push(command);
    execStep(game, command, transcript);
    return commands;
  };
  return { exec, commands };
}

function mirkwoodVulnerableSetup(game, seed) {
  return defaultSetup(game, seed, "jump mirkwood", {
    afterSetup(target) {
      target.debugMovePlayer("mirkwood_spider_grove", { markRoute: true });
      for (const itemName of ["majestic sword", "short strong dagger"]) {
        const item = target.findInInventory?.(itemName);
        if (item?.id) {
          target.detachItem(item.id);
          item.visible = false;
          item.location = null;
          target.player.inventory = target.player.inventory.filter((id) => id !== item.id);
          target.player.worn = target.player.worn.filter((id) => id !== item.id);
        }
      }
      if (typeof target.setMirkwoodEnergy === "function") target.setMirkwoodEnergy(2);
      target.player.strength = Math.min(Number(target.player?.strength || 0), 3);
    },
  });
}

function goblinAmbushSetup(game, seed) {
  return defaultSetup(game, seed, "jump rivendell", {
    afterSetup(target) {
      target.debugMovePlayer("dark_stuffy_passage_14", { markRoute: true });
      for (const name of ["thorin", "gandalf"]) {
        const character = Object.values(target.characters || {}).find(
          (entry) => String(entry.name || "").toLowerCase() === name
        );
        if (character) {
          character.position = target.currentRoom;
          character.visible = true;
        }
      }
      target.checkSpecialSituations();
    },
  });
}

function slugify(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function defaultSetup(game, seed, jumpCommand, options = {}) {
  outputLines.length = 0;
  game.restartGame();
  game.storySeed = seed;
  game.execute(jumpCommand);
  game.storySeed = seed;
  if (typeof game.createGollumState === "function") {
    game.gollumState = game.createGollumState();
  }
  if (typeof options.afterSetup === "function") {
    options.afterSetup(game);
  }
  if (typeof game.checkSpecialSituations === "function") {
    game.checkSpecialSituations();
  }
  return outputLines.slice();
}

function cellarEscapeSetup(game, seed) {
  return defaultSetup(game, seed, "jump mirkwood", {
    afterSetup(target) {
      target.flags.mirkwooddwarvesfreed = true;
      target.flags.mirkwoodjourneycomplete = true;
      target.flags.barrel_company_prepared = false;
      target.flags.barrel_company_launched = false;
      target.flags.barrel_company_ready_prompted = false;
      target.flags.barrelthrown = false;
      target.flags.laketown_barrel_arrival_seen = false;
      target.flags.laketown_barrel_arrival_pending = false;
      target.debugMovePlayer("cellar", { markRoute: true });
    },
  });
}

function autoplayUntil(game, stopWhen, transcript, stepLimit = 120) {
  const commands = [];
  for (let step = 0; step < stepLimit && !game.endgame; step += 1) {
    if (stopWhen(game)) break;
    const command = game.nextAutoplayCommand();
    if (!command) break;
    commands.push(command);
    execStep(game, command, transcript);
  }
  return commands;
}

function runRouteVariant(game, seed, route, variant) {
  return withSeed(seed, () => {
    const setupOutput = route.setup(game, seed);
    const startRoom = game.currentRoom;
    const transcript = [];
    const driven = variant.drive ? variant.drive(game, transcript) : null;
    if (variant.skipAutoplay !== true) {
      autoplayUntil(
        game,
        route.stopWhen,
        transcript,
        route.stepLimit || 120
      );
    }
    void driven;
    const commands = transcript.map((step) => step.command);
    const isDeathRoute = route.kind === "death";
    const success = isDeathRoute
      ? STOP.fatalDeath(game)
      : route.stopWhen(game);
    const meta = route.meta ? route.meta(game) : {};
    if (isDeathRoute) {
      meta.Outcome = success ? "fatal death" : "unexpected";
      meta["Death choice"] = game.pendingEndgameChoice || "none";
      if (route.outcomeCode) meta["Outcome code"] = route.outcomeCode;
      if (game.temporaryImage?.file) meta["Death image"] = game.temporaryImage.file;
    }
    return {
      routeId: route.id,
      title: route.title,
      label: variant.label,
      kind: route.kind || "win",
      seed,
      success,
      endgame: Boolean(game.endgame),
      startRoom,
      finalRoom: game.currentRoom,
      commands,
      setupOutput,
      transcript,
      meta,
    };
  });
}

function formatTranscript(result) {
  const lines = [
    result.title,
    `Variant: ${result.label}`,
    `Seed: ${result.seed}`,
    `Success: ${result.success ? "yes" : "no"}`,
    `Start room: ${result.startRoom}`,
    `Final room: ${result.finalRoom}`,
    `Steps: ${result.commands.length}`,
  ];

  if (result.meta && Object.keys(result.meta).length) {
    for (const [key, value] of Object.entries(result.meta)) {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push("");

  if (result.setupOutput?.length) {
    lines.push("[setup]", ...result.setupOutput, "");
  }

  for (const [index, step] of result.transcript.entries()) {
    lines.push(`> ${step.command}`);
    lines.push(`(${index + 1}/${result.transcript.length} · room: ${step.room})`);
    lines.push(...(step.lines.length ? step.lines : ["(no output)"]), "");
  }

  lines.push("[final]");
  lines.push(`room=${result.finalRoom}`);
  lines.push(`commands=${result.commands.join(" -> ")}`);
  return `${lines.join("\n")}\n`;
}

function writeTranscripts(results, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const written = [];
  for (const result of results) {
    const filename = `${slugify(result.label) || "variant"}.txt`;
    const filePath = path.join(outDir, filename);
    fs.writeFileSync(filePath, formatTranscript(result), "utf8");
    written.push(filePath);
  }
  return written;
}

function runRoute(game, seed, route) {
  return route.variants.map((variant) => runRouteVariant(game, seed, route, variant));
}

function printSummary(routeId, results) {
  console.log(`\n${routeId.toUpperCase()}\n`);
  for (const result of results) {
    console.log(`--- ${result.label} ---`);
    const outcomeLabel = result.kind === "death"
      ? `fatal=${result.success ? "yes" : "no"}`
      : `success=${result.success ? "yes" : "no"}`;
    console.log(
      `${outcomeLabel} start=${result.startRoom} final=${result.finalRoom} endgame=${result.endgame ? "yes" : "no"} steps=${result.commands.length}`
    );
    if (result.meta?.["Death image"]) {
      console.log(`death image: ${result.meta["Death image"]}`);
    }
    if (result.commands.length) {
      const preview = result.commands.slice(0, 8).join(" -> ");
      const suffix = result.commands.length > 8 ? " -> ..." : "";
      console.log(`commands: ${preview}${suffix}`);
    }
    console.log("");
  }
}

module.exports = {
  FOREST_TO_CLEARING,
  STOP,
  ringTargetSatisfied,
  slugify,
  defaultSetup,
  cellarEscapeSetup,
  mirkwoodVulnerableSetup,
  goblinAmbushSetup,
  makeExec,
  autoplayUntil,
  runRouteVariant,
  runRoute,
  formatTranscript,
  writeTranscripts,
  printSummary,
};

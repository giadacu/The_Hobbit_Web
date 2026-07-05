const fs = require("fs");
const path = require("path");
const {
  bootGame,
  outputLines,
  withSeed,
  execStep,
} = require("./headless-boot");

function parseCliOptions(argv = []) {
  const options = {
    fullTranscript: false,
    seed: 1,
    outDir: path.join(__dirname, "transcripts", "before-trolls-to-rivendell"),
  };
  for (const arg of argv) {
    if (arg === "--full-transcript") {
      options.fullTranscript = true;
      continue;
    }
    if (arg.startsWith("--seed=")) {
      options.seed = Number.parseInt(arg.split("=")[1], 10) || options.seed;
      continue;
    }
    if (arg.startsWith("--out-dir=")) {
      options.outDir = path.resolve(arg.split("=")[1]);
    }
  }
  return options;
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

function resetBeforeTrolls(game, seed) {
  outputLines.length = 0;
  game.restartGame();
  game.storySeed = seed;
  game.execute("jump trolls");
  game.storySeed = seed;
  if (typeof game.createGollumState === "function") game.gollumState = game.createGollumState();
  return outputLines.slice();
}

function hasKey(game) {
  return Boolean(game.flags?.trollkeytaken || game.findInInventory?.("large key"));
}

function autoplayUntil(game, stopWhen, transcript, stepLimit = 120) {
  const commands = [];
  for (let step = 0; step < stepLimit && !game.endgame; step += 1) {
    if (stopWhen()) break;
    const command = game.nextAutoplayCommand();
    if (!command) break;
    commands.push(command);
    execStep(game, command, transcript);
  }
  return commands;
}

function runRoute(game, seed, label, drive) {
  return withSeed(seed, () => {
    const setupOutput = resetBeforeTrolls(game, seed);
    const startRoom = game.currentRoom;
    const transcript = [];
    const driven = drive(game, transcript) || [];
    const tail = autoplayUntil(game, () => game.currentRoom === "rivendell", transcript, 120);
    const commands = [...driven, ...tail];
    const trollSegment = commands.slice(0, Math.min(commands.length, 25));
    const narrativeTail = outputLines.filter((line) =>
      /troll|dawn|Day dawns|key|Rivendell|Elrond|Last Homely House|clearing/i.test(line)
    ).slice(-12);
    return {
      label,
      seed,
      success: game.currentRoom === "rivendell" && !game.endgame,
      endgame: Boolean(game.endgame),
      startRoom,
      finalRoom: game.currentRoom,
      hasKey: hasKey(game),
      trollsTransformed: Boolean(game.trollsTransformed),
      commands,
      trollSegment,
      narrativeTail,
      setupOutput,
      transcript,
    };
  });
}

function signature(result) {
  const trollPart = result.commands
    .slice(0, 8)
    .map((cmd) => cmd.replace(/\s+/g, " ").trim())
    .join(" | ");
  const keyTiming = result.commands.some((cmd, index) =>
    index < 8 && /take large key carefully|carefully take large key/i.test(cmd)
  ) ? "steal-live" : result.commands.some((cmd, index) =>
    index < 8 && /^take large key$/i.test(String(cmd).trim())
  ) ? "take-after-dawn" : "no-key-yet";
  return `${keyTiming}::${result.trollsTransformed ? "dawn" : "live-trolls"}::${trollPart}`;
}

function formatTranscript(result) {
  const lines = [
    "BEFORE TROLLS -> RIVENDELL",
    `Variant: ${result.label}`,
    `Seed: ${result.seed}`,
    `Success: ${result.success ? "yes" : "no"}`,
    `Final room: ${result.finalRoom}`,
    `Large key: ${result.hasKey ? "yes" : "no"}`,
    `Trolls transformed: ${result.trollsTransformed ? "yes" : "no"}`,
    `Steps: ${result.commands.length}`,
    "",
  ];

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

const cli = parseCliOptions(process.argv.slice(2));
const startedAt = Date.now();
const game = bootGame();
const seed = cli.seed;

const routeDefinitions = [
  {
    label: "1 · Rubare la chiave e uscire subito",
    drive(g, transcript) {
      const cmds = [];
      const exec = (c) => { cmds.push(c); execStep(g, c, transcript); };
      exec("north");
      exec("take large key carefully");
      exec("south west");
      return cmds;
    },
  },
  {
    label: "2 · Uscire senza chiave, aspettare l'alba",
    drive(g, transcript) {
      const cmds = [];
      const exec = (c) => { cmds.push(c); execStep(g, c, transcript); };
      exec("north");
      exec("south west");
      for (let i = 0; i < 8 && !g.trollsTransformed; i += 1) exec("wait");
      return cmds;
    },
  },
];

const routes = routeDefinitions.map((route) => runRoute(game, seed, route.label, route.drive));

console.log(`\nBEFORE TROLLS -> RIVENDELL (seed ${seed})\n`);

const successes = routes.filter((r) => r.success);
const groups = new Map();
for (const result of successes) {
  const key = signature(result);
  if (!groups.has(key)) groups.set(key, result);
}

for (const result of routes) {
  console.log(`--- ${result.label} ---`);
  console.log(`success=${result.success ? "yes" : "no"} room=${result.finalRoom} key=${result.hasKey ? "yes" : "no"} dawn=${result.trollsTransformed ? "yes" : "no"} steps=${result.commands.length}`);
  console.log(`troll segment: ${result.trollSegment.join(" -> ")}`);
  if (result.narrativeTail.length) {
    console.log("narrative highlights:");
    for (const line of result.narrativeTail) console.log(`  ${line}`);
  }
  console.log("");
}

console.log(`Distinct winning sequences found: ${groups.size}`);
for (const [, result] of groups.entries()) {
  console.log(`\n== ${result.label} ==`);
  console.log(`signature: ${signature(result)}`);
  console.log(`full commands (${result.commands.length}):`);
  console.log(result.commands.join(" -> "));
}

if (cli.fullTranscript) {
  const written = writeTranscripts(routes, cli.outDir);
  console.log(`\nFull transcripts written (${written.length}):`);
  for (const filePath of written) console.log(`  ${filePath}`);
}

console.log(`\nCompleted in ${Date.now() - startedAt} ms.`);
process.exit(0);

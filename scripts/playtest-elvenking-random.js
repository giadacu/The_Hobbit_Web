const fs = require("fs");
const path = require("path");
const { bootGame, outputLines, makeSeededRandom, withSeed } = require("./headless-boot");

const ISSUES = [];
const RUNS = [];
const SEED_COUNT = Number(process.env.SEED_COUNT || 40);
const STEP_LIMIT = Number(process.env.STEP_LIMIT || 350);
const STRATEGIES = ["mixed", "failure", "optimal"];

function note(runId, type, detail, step = null) {
  ISSUES.push({ runId, type, detail, step, room: step?.room || "" });
}

function setupElvenkingHalls(game, seed) {
  outputLines.length = 0;
  game.restartGame();
  outputLines.length = 0;
  game.storySeed = seed;
  game.handleJumpCommand("mirkwood", { silent: true });
  game.storySeed = seed;
  game.flags.mirkwooddwarvesfreed = true;
  game.flags.mirkwoodjourneycomplete = true;
  for (const roomId of [
    "elvish_clearing", "place_of_black_spiders", "mirkwood_spider_grove",
    "mirkwood_ruined_clearing", "forest_road",
  ]) {
    game.visitedRooms.add(roomId);
  }
  game.debugMovePlayer("elvenkings_halls", { markRoute: true });
  game.companionDirector?.sync();
  if (typeof game.checkSpecialSituations === "function") {
    game.checkSpecialSituations();
  }
  game.describeRoom({ full: true });
  if (typeof game.checkSpecialSituations === "function") {
    game.checkSpecialSituations();
  }
}

function pickRandom(rng, list) {
  if (!list.length) return null;
  return list[Math.floor(rng() * list.length)];
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

function randomCandidates(game, rng, strategy) {
  const candidates = [];
  const autoplay = game.nextAutoplayCommand?.();
  if (autoplay) candidates.push({ command: autoplay, kind: "optimal" });

  for (const connection of game.roomConnections?.() || []) {
    if (connection.direction) candidates.push({ command: connection.direction, kind: "move" });
  }

  candidates.push(
    { command: "look", kind: "safe" },
    { command: "wait", kind: "safe" },
    { command: "inventory", kind: "safe" },
  );

  if (game.currentRoom === "cellar") {
    candidates.push(
      { command: "down", kind: "failure" },
      { command: "jump trap door", kind: "failure" },
      { command: "open trap door", kind: "alt" },
      { command: "ask thorin to enter barrels", kind: "alt" },
    );
  }
  if (game.currentRoom === "dark_dungeon") {
    candidates.push(
      { command: "break red door with sword", kind: "alt" },
      { command: "wait", kind: "safe" },
    );
  }
  if (game.currentRoom === "long_lake") {
    candidates.push(
      { command: "climb barrel", kind: "alt" },
      { command: "swim", kind: "failure" },
    );
  }
  if (game.currentRoom === "lower_halls" && game.liveDragon?.()) {
    candidates.push(
      { command: "take treasure", kind: "failure" },
      { command: "take cup", kind: "alt" },
      { command: "wear ring", kind: "alt" },
      { command: "ask smaug about treasure", kind: "alt" },
    );
  }
  if (game.currentRoom === "stoe_of_ravenhill" && game.flags?.bardreadiedarrow) {
    candidates.push({ command: 'say to bard "shoot dragon"', kind: "alt" });
  }
  if (game.findInInventory?.("golden ring")) {
    candidates.push({ command: "wear ring", kind: "alt" });
  }

  const deduped = [];
  const seen = new Set();
  for (const entry of candidates) {
    const key = entry.command.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }

  if (strategy === "optimal") {
    return deduped.filter((e) => e.kind === "optimal");
  }
  if (strategy === "failure") {
    const failures = deduped.filter((e) => e.kind === "failure");
    if (failures.length) return failures;
    return deduped.filter((e) => e.kind !== "optimal");
  }
  // mixed: weighted random
  const weighted = [];
  for (const entry of deduped) {
    const weight = entry.kind === "optimal" ? 3 : entry.kind === "failure" ? 2 : 1;
    for (let i = 0; i < weight; i += 1) weighted.push(entry);
  }
  return weighted;
}

function selectCommand(game, rng, strategy) {
  const pool = randomCandidates(game, rng, strategy);
  if (!pool.length) return null;
  const entry = pickRandom(rng, pool);
  return entry ? entry.command : null;
}

function checkNarrative(game, step, lines, transcript) {
  const text = lines.join(" ");
  const room = step.room;
  const flags = game.flags || {};

  if (flags.dragondefeated && /Smaug (?:lies|prowls|stirs|searches|hunts|sleeps)/i.test(text)) {
    note(step.runId, "contradiction", `Dragon defeated but live Smaug prose: ${text.slice(0, 140)}`, step);
  }
  if (flags.laketown_burning_echo_seen && /Lake-town, where wet planks/i.test(text)) {
    note(step.runId, "contradiction", "Pre-dragon Lake-town description after burning echo", step);
  }
  if (flags.black_arrow_committed && /Bard is carrying a bow, a black arrow/i.test(text)) {
    note(step.runId, "inventory", "Bard still described with black arrow after loosing it", step);
  }
  if (flags.barrelthrown && !flags.laketown_barrel_arrival_seen && /wooden_town|Lake-town/i.test(text) && room === "long_lake") {
    // fine - approaching town from lake
  }
  if (!flags.laketown_barrel_arrival_seen && room === "wooden_town" && /barrel.*(arriv|bob|float)/i.test(text)) {
    note(step.runId, "sequence", "Lake-town barrel arrival prose before arrival flag set", step);
  }
  if (flags.elvenking_prisoner_seen && room === "elvenkings_halls" && /wholly under watch/i.test(text) && /You stand in the great halls/i.test(text)) {
    // prisoner returning to halls - check if description mentions captivity wrongly
  }
  if (room === "cellar" && flags.barrel_company_launched && !flags.barrelthrown && /one last empty barrel waits/i.test(text)) {
    note(step.runId, "sequence", "Cellar text says last barrel waits after dwarves launched but before Bilbo's barrel", step);
  }
  if (room === "cellar" && flags.barrelthrown && /dwarves are stowed away in barrels at last/i.test(text)) {
    note(step.runId, "sequence", "Cellar text says dwarves still stowed after Bilbo threw his barrel", step);
  }
  if (flags.erebor_standoff_started && /sealed by age, ruin, and shadow/i.test(text)) {
    note(step.runId, "contradiction", "Standoff started but gate still described as sealed", step);
  }
  if (flags.thorin_fallen && /Thorin has little attention left for anything but the halls ahead/i.test(text)) {
    note(step.runId, "contradiction", "Thorin fallen but active at gate description", step);
  }
  if (game.homewardJourneyStarted?.() && /You stand before the Front Gate/i.test(text)) {
    note(step.runId, "anachronism", "Homeward started but Front Gate description shown", step);
  }
  if (/craftmanship/i.test(text)) {
    note(step.runId, "typo", "Misspelling: craftmanship", step);
  }
  if (/stoe_of_ravenhill|stoe of ravenhill/i.test(text) && !/Ravenhill/i.test(text)) {
    note(step.runId, "typo", "Room id 'stoe' leaked into player text", step);
  }

  // Sequence: wooden_town before barrel chapter complete
  const barrelChapterRooms = new Set(["elvenkings_halls", "dark_dungeon", "cellar", "long_lake", "strong_river"]);
  if (room === "wooden_town" && !flags.laketown_barrel_arrival_seen) {
    const priorRooms = transcript.map((s) => s.afterRoom).filter(Boolean);
    const skippedBarrel = !priorRooms.some((r) => ["long_lake", "strong_river", "cellar"].includes(r));
    if (skippedBarrel && !game.debugJumpInProgress) {
      note(step.runId, "sequence", "Reached wooden_town without visiting barrel escape path", step);
    }
  }

  // Dark dungeon without prisoner flag
  if (room === "dark_dungeon" && !flags.elvenking_prisoner_seen && step.command !== "restart") {
    const enteredFromHalls = transcript.some((s) => s.afterRoom === "dark_dungeon" && s.beforeRoom === "elvenkings_halls");
    if (enteredFromHalls) {
      note(step.runId, "sequence", "Entered dark_dungeon from halls without elvenking_prisoner_seen / questioning scene", step);
    }
  }

  if (room === "long_lake" && !flags.barrel_company_launched && !flags.laketown_barrel_arrival_pending) {
    note(step.runId, "sequence", "On Long Lake without barrel escape initiated", step);
  }
  if (room === "cellar" && !flags.elvenking_prisoner_seen && step.command !== "restart") {
    const enteredFromHalls = step.beforeRoom === "elvenkings_halls" || transcript.some(
      (s) => s.afterRoom === "cellar" && s.beforeRoom === "elvenkings_halls"
    );
    if (enteredFromHalls) {
      note(step.runId, "sequence", "Entered cellar from halls without capture or Elvenking questioning (elvenking_prisoner_seen unset)", step);
    }
  }
  if (room === "dark_dungeon" && !flags.elvenking_prisoner_seen && /whispering secrets of forgotten ages/i.test(text)) {
    note(step.runId, "narrative", "Legacy placeholder dungeon description shown without prisoner flag", step);
  }
}

function runPlaythrough(seed, strategy) {
  const runId = `${strategy}:${seed}`;
  return withSeed(seed, () => {
    const rng = makeSeededRandom(seed + strategy.length * 997);
    const game = bootGame();
    setupElvenkingHalls(game, seed);
    const transcript = [];
    let stallCount = 0;
    let lastRoom = game.currentRoom;

    for (let step = 0; step < STEP_LIMIT && !game.endgame; step += 1) {
      const command = selectCommand(game, rng, strategy);
      if (!command) {
        stallCount += 1;
        if (stallCount >= 8) {
          note(runId, "softlock", `No commands for ${stallCount} turns at ${game.currentRoom}`, { runId, room: game.currentRoom, command: "(none)" });
          break;
        }
        continue;
      }
      stallCount = 0;
      const before = outputLines.length;
      const beforeRoom = game.currentRoom;
      game.execute(command);
      const lines = outputLines.slice(before);
      if (outputLines.length > 3000) outputLines.splice(0, outputLines.length - 800);

      const entry = {
        runId,
        command,
        room: beforeRoom,
        beforeRoom,
        afterRoom: game.currentRoom,
        lines: lines.slice(0, 8),
      };
      transcript.push(entry);
      checkNarrative(game, entry, lines, transcript);

      if (game.currentRoom === lastRoom && command === "wait") {
        // detect excessive waiting loops
      }
      lastRoom = game.currentRoom;

      if (game.flags.epilogue_complete) break;
    }

    const milestones = {
      prisoner: Boolean(game.flags.elvenking_prisoner_seen),
      cellar: game.visitedRooms?.has("cellar"),
      longLake: game.visitedRooms?.has("long_lake"),
      laketown: game.visitedRooms?.has("wooden_town"),
      frontGate: game.visitedRooms?.has("front_gate"),
      dragonDefeated: Boolean(game.flags.dragondefeated),
      standoff: Boolean(game.flags.erebor_standoff_started),
      battle: Boolean(game.flags.battle_won),
      homeward: Boolean(game.homewardJourneyStarted?.()),
      epilogue: Boolean(game.flags.epilogue_complete),
      death: game.endgame && game.pendingEndgameChoice === "death",
    };

    return {
      runId,
      seed,
      strategy,
      steps: transcript.length,
      finalRoom: game.currentRoom,
      endgame: Boolean(game.endgame),
      milestones,
      tail: transcript.slice(-6).map((s) => `${s.command} (${s.beforeRoom}->${s.afterRoom})`),
    };
  });
}

function dedupeIssues() {
  const seen = new Set();
  return ISSUES.filter((issue) => {
    const key = `${issue.type}|${issue.detail}|${issue.room}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function main() {
  let seedBase = Number(process.env.SEED_START || 1);
  for (const strategy of STRATEGIES) {
    for (let i = 0; i < SEED_COUNT; i += 1) {
      const seed = seedBase + i * 17;
      RUNS.push(runPlaythrough(seed, strategy));
    }
  }

  const uniqueIssues = dedupeIssues();
  const reportPath = path.join(__dirname, "playtest-elvenking-random-report.txt");
  const lines = [
    "Elvenking Halls onward — random playtest report",
    `Date: ${new Date().toISOString()}`,
    `Runs: ${RUNS.length} (${STRATEGIES.join(", ")}, ${SEED_COUNT} seeds each)`,
    `Step limit: ${STEP_LIMIT}`,
    "",
    `Unique issues: ${uniqueIssues.length}`,
    "",
  ];

  if (uniqueIssues.length) {
    const byType = {};
    for (const issue of uniqueIssues) {
      byType[issue.type] = (byType[issue.type] || 0) + 1;
    }
    lines.push("Issue counts by type:");
    for (const [type, count] of Object.entries(byType)) {
      lines.push(`  ${type}: ${count}`);
    }
    lines.push("");
    lines.push("ISSUES:");
    for (const issue of uniqueIssues.slice(0, 80)) {
      lines.push(`  [${issue.type}] run=${issue.runId} room=${issue.room}`);
      lines.push(`    ${issue.detail}`);
    }
    if (uniqueIssues.length > 80) {
      lines.push(`  ... and ${uniqueIssues.length - 80} more`);
    }
    lines.push("");
  } else {
    lines.push("No automated narrative/sequence issues detected.");
    lines.push("");
  }

  const reached = {
    laketown: RUNS.filter((r) => r.milestones.laketown).length,
    frontGate: RUNS.filter((r) => r.milestones.frontGate).length,
    dragon: RUNS.filter((r) => r.milestones.dragonDefeated).length,
    epilogue: RUNS.filter((r) => r.milestones.epilogue).length,
    death: RUNS.filter((r) => r.milestones.death).length,
    softlock: uniqueIssues.filter((i) => i.type === "softlock").length,
  };
  lines.push("Milestone reach (across all runs):");
  for (const [k, v] of Object.entries(reached)) {
    lines.push(`  ${k}: ${v}/${RUNS.length}`);
  }
  lines.push("");

  const interesting = RUNS.filter((r) => r.milestones.death || r.steps >= STEP_LIMIT - 5);
  lines.push(`Stalled/death runs: ${interesting.length}`);
  for (const run of interesting.slice(0, 12)) {
    lines.push(`  ${run.runId}: room=${run.finalRoom} steps=${run.steps} death=${run.milestones.death}`);
    lines.push(`    tail: ${run.tail.join(" | ")}`);
  }

  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Random playtest complete: ${uniqueIssues.length} unique issues, ${RUNS.length} runs`);
  console.log(`Report: ${reportPath}`);
  if (uniqueIssues.length) {
    for (const issue of uniqueIssues.slice(0, 15)) {
      console.log(`  [${issue.type}] ${issue.detail.slice(0, 100)}`);
    }
  }
  process.exit(uniqueIssues.filter((i) => i.type !== "softlock").length ? 1 : 0);
}

main();

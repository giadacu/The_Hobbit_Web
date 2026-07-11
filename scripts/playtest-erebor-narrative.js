const fs = require("fs");
const path = require("path");
const { bootGame, outputLines, execStep } = require("./headless-boot");
const { defaultSetup, autoplayUntil } = require("./route-transcript-lib");

const ISSUES = [];

function note(type, context, detail) {
  ISSUES.push({ type, context, detail });
}

function exec(game, command, transcript) {
  const before = outputLines.length;
  game.execute(command);
  const lines = outputLines.slice(before);
  transcript.push({ command, room: game.currentRoom, lines });
  if (outputLines.length > 4000) outputLines.length = 0;
  return lines;
}

function checkNarrativeConsistency(game, step, lines) {
  const text = lines.join(" ");
  const room = step.room;

  if (game.flags.dragondefeated && /Smaug (?:lies|prowls|stirs|searches|hunts)/i.test(text)) {
    note("contradiction", step.command, `Dragon defeated but text mentions live Smaug: ${text.slice(0, 160)}`);
  }
  if (game.flags.dragondefeated && /dragon-smoke is fading|dragon-smoke, while Smaug lies/i.test(text) === false) {
    if (/Smaug lies upon the gold like a fallen hill/i.test(text) && !game.liveDragon?.()) {
      note("contradiction", step.command, "Dead Smaug described as if still lying on treasure in live-dragon pose");
    }
  }
  if (game.flags.erebor_standoff_started && /sealed by age, ruin, and shadow/i.test(text)) {
    note("contradiction", step.command, "Standoff started but gate still described as sealed");
  }
  if (game.flags.thorin_fallen && /Thorin has little attention left for anything but the halls ahead/i.test(text)) {
    note("contradiction", step.command, "Thorin fallen but described as active at gate");
  }
  if (game.flags.thorin_reconciled && /Thorin has gone within Erebor/i.test(text)) {
    note("contradiction", step.command, "Post-reconciliation text still says Thorin is inside during standoff");
  }
  if (game.homewardJourneyStarted?.() && /You stand before the Front Gate/i.test(text)) {
    note("anachronism", step.command, "Homeward journey started but still at Front Gate description");
  }
  if (/Lake-town, where wet planks/i.test(text) && game.flags.laketown_burning_echo_seen) {
    note("contradiction", step.command, "Lake-town pre-dragon description after burning echo seen");
  }
  if (/Bard is carrying a bow, a black arrow, a quiver/i.test(text) && game.flags.black_arrow_committed) {
    note("inventory", step.command, "Bard still described with black arrow after it was loosed");
  }
  if (game.flags.battle_started && !game.flags.battle_won && /hard negotiation beneath the Mountain/i.test(text) && room === "ruins_of_the_town_of_dale") {
    note("tone", step.command, "Standoff negotiation language during active battle");
  }
  if (/stoe_of_ravenhill|stoe of ravenhill/i.test(text) && !/Ravenhill/i.test(text)) {
    note("typo", step.command, "Room id 'stoe' may leak into player-facing text");
  }
  if (/craftmanship/i.test(text)) {
    note("typo", step.command, "Misspelling: craftmanship -> craftsmanship");
  }
}

function carryBard(game) {
  const bard = game.characters.bard;
  if (!bard) return;
  bard.carriedBy = game.player.id;
  bard.position = game.currentRoom;
  bard.followingPlayer = false;
  bard.movementMode = "follow";
  bard.visible = true;
}

function playFromFrontGate(game) {
  const transcript = [];
  defaultSetup(game, 1, "jump front_gate");

  exec(game, 'ask bard to follow me', transcript);
  exec(game, 'say to bard "get black arrow from quiver"', transcript);
  exec(game, "read map", transcript);
  exec(game, "north east", transcript);

  let stepLimit = 400;
  for (let i = 0; i < stepLimit && !game.endgame; i += 1) {
    if (game.flags.epilogue_complete) break;
    const command = game.nextAutoplayCommand?.();
    if (!command) {
      note("blocked", `step ${i}`, `Autoplay stopped at room ${game.currentRoom}`);
      break;
    }
    const lines = exec(game, command, transcript);
    const step = transcript[transcript.length - 1];
    checkNarrativeConsistency(game, step, lines);

    if (game.flags.dragondefeated && !game.flags.erebor_standoff_started && game.currentRoom === "ruins_of_the_town_of_dale") {
      game.beginEreborStandoff();
    }
  }

  return transcript;
}

function playOptimalEndgameBranches(game) {
  const branches = [];

  function runBranch(label, setupFn, commands) {
    const g = bootGame();
    setupFn(g);
    const transcript = [];
    for (const command of commands) {
      exec(g, command, transcript);
    }
    branches.push({ label, finalRoom: g.currentRoom, endgame: g.endgame, flags: { ...g.flags }, transcript });
  }

  runBranch("dragon-optimal", (g) => {
    g.execute("jump smaug");
    g.flags.bardreadiedarrow = true;
  }, [
    "wear ring",
    "ask smaug about treasure",
    "ask bard about the weak spot",
    "take cup",
  ]);

  runBranch("battle-thorin", (g) => {
    g.execute("jump smaug");
    g.flags.dragondefeated = true;
    g.flags.negotiation_started = true;
    g.flags.dain_arrived = true;
    g.currentRoom = "ruins_of_the_town_of_dale";
    g.player.position = "ruins_of_the_town_of_dale";
    g.beginBattleOfFiveArmies();
  }, ["stand with thorin", "stand with thorin", "wait", "talk to thorin", "wait"]);

  runBranch("battle-bard", (g) => {
    g.execute("jump smaug");
    g.flags.dragondefeated = true;
    g.flags.negotiation_started = true;
    g.flags.dain_arrived = true;
    g.currentRoom = "ruins_of_the_town_of_dale";
    g.player.position = "ruins_of_the_town_of_dale";
    g.beginBattleOfFiveArmies();
  }, ["help bard", "help bard", "wait", "talk to thorin", "wait"]);

  return branches;
}

function main() {
  const game = bootGame();
  const transcript = playFromFrontGate(game);

  const milestones = {
    secretDoor: Boolean(game.flags.secretdoorsun),
    dragonDefeated: Boolean(game.flags.dragondefeated),
    standoff: Boolean(game.flags.erebor_standoff_started),
    dain: Boolean(game.flags.dain_arrived),
    battle: Boolean(game.flags.battle_won),
    thorinFallen: Boolean(game.flags.thorin_fallen),
    reconciled: Boolean(game.flags.thorin_reconciled),
    homeward: Boolean(game.homewardJourneyStarted?.()),
    epilogue: Boolean(game.flags.epilogue_complete),
    won: Boolean(game.endgame && game.pendingEndgameChoice !== "death"),
  };

  const branches = process.env.SKIP_NARRATIVE_BRANCHES ? [] : playOptimalEndgameBranches(game);

  const reportPath = path.join(__dirname, "playtest-erebor-narrative-report.txt");
  const lines = [
    "EREbor final sequence narrative audit",
    `Date: ${new Date().toISOString()}`,
    "",
    "Milestones:",
    ...Object.entries(milestones).map(([k, v]) => `  ${k}: ${v ? "yes" : "no"}`),
    "",
    `Steps played: ${transcript.length}`,
    `Final room: ${game.currentRoom}`,
    `Issues found: ${ISSUES.length}`,
    "",
  ];

  if (ISSUES.length) {
    lines.push("ISSUES:");
    for (const issue of ISSUES) {
      lines.push(`  [${issue.type}] ${issue.context}: ${issue.detail}`);
    }
    lines.push("");
  } else {
    lines.push("No automated narrative issues detected.");
    lines.push("");
  }

  lines.push("--- MAIN TRANSCRIPT (last 40 steps) ---");
  for (const step of transcript.slice(-40)) {
    lines.push(`> ${step.command} (${step.room})`);
    lines.push(...step.lines.slice(0, 6));
    if (step.lines.length > 6) lines.push("  ...");
    lines.push("");
  }

  for (const branch of branches) {
    lines.push(`--- BRANCH: ${branch.label} ---`);
    lines.push(`final=${branch.finalRoom} endgame=${branch.endgame}`);
    for (const step of branch.transcript.slice(-8)) {
      lines.push(`> ${step.command}`);
      lines.push(...step.lines.slice(0, 4));
    }
    lines.push("");
  }

  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Report written: ${reportPath}`);
  console.log(`Milestones: ${JSON.stringify(milestones)}`);
  console.log(`Issues: ${ISSUES.length}`);
  if (ISSUES.length) {
    for (const issue of ISSUES.slice(0, 10)) {
      console.log(`  [${issue.type}] ${issue.detail}`);
    }
    process.exit(1);
  }
  process.exit(0);
}

try {
  main();
} catch (error) {
  console.error(`Narrative playtest failed: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}

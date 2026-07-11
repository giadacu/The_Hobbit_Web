const fs = require("fs");
const path = require("path");
const { bootGame, outputLines } = require("./headless-boot");

const ISSUES = [];
const RESULTS = [];

function note(scenario, type, detail) {
  ISSUES.push({ scenario, type, detail });
}

function linesSince(before) {
  return outputLines.slice(before).join(" ");
}

function setupStandoff(game, room = "ruins_of_the_town_of_dale") {
  game.execute("jump smaug");
  game.flags.dragondefeated = true;
  game.flags.smaug_fall_image_seen = true;
  game.flags.laketown_burning_echo_seen = true;
  game.flags.erebor_standoff_started = true;
  game.flags.bard_camp_active = true;
  game.flags.thorin_inside_erebor = true;
  game.currentRoom = room;
  game.player.position = room;
}

function setupBattle(game, room = "ruins_of_the_town_of_dale") {
  setupStandoff(game, room);
  game.flags.negotiation_started = true;
  game.flags.dain_arrived = true;
  game.flags.dwarf_reinforcements_present = true;
  game.beginBattleOfFiveArmies();
}

function runScenario(id, label, setup, commands, evaluate) {
  outputLines.length = 0;
  const game = bootGame();
  try {
    setup(game);
    const steps = [];
    for (const command of commands) {
      if (game.endgame && command !== "restart") break;
      const before = outputLines.length;
      game.execute(command);
      if (outputLines.length > 2000) outputLines.splice(0, outputLines.length - 500);
      steps.push({
        command,
        room: game.currentRoom,
        output: linesSince(before).slice(0, 500),
        image: game.temporaryImage?.file || "-",
        endgame: Boolean(game.endgame),
        death: game.pendingEndgameChoice === "death",
      });
    }
    const result = evaluate(game, steps) || { status: "unchecked" };
    RESULTS.push({ id, label, status: result.status, detail: result.detail || "", steps });
    if (result.issue) note(id, result.issueType || "unexpected", result.issue);
  } catch (error) {
    RESULTS.push({ id, label, status: "error", detail: error.message, steps: [] });
    note(id, "error", error.message);
  }
  outputLines.length = 0;
}

function hasText(steps, pattern) {
  const text = steps.map((s) => s.output).join(" ");
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

function lastStep(steps) {
  return steps[steps.length - 1] || {};
}

function readySmaugEndgame(game, options = {}) {
  game.execute("jump smaug");
  game.flags.bardreadiedarrow = true;
  if (options.weakSpot !== false) {
    game.flags.smaug_weakspot_known = true;
    game.flags.smaug_weakspot_shared_with_bard = true;
  }
  if (options.sighting) {
    game.flags.smaug_sighted_from_ravenhill = true;
    game.flags.bard_ready_at_ravenhill = true;
    game.flags.thrush_message_sent = true;
  }
  game.currentRoom = options.room || "stoe_of_ravenhill";
  game.player.position = game.currentRoom;
  const bard = game.characters.bard;
  if (bard) {
    bard.position = game.currentRoom;
    bard.visible = true;
    bard.carriedBy = options.carryBard ? game.player.id : null;
    bard.followingPlayer = false;
    bard.movementMode = "follow";
  }
}

function main() {
  runScenario(
    "shoot-no-weak-spot",
    "Sparare senza conoscere il punto debole",
    (g) => readySmaugEndgame(g, { weakSpot: false }),
    ['say to bard "shoot dragon"', "wait"],
    (g, steps) => {
      if (g.flags.dragondefeated) return { status: "fail", issue: "Dragon defeated without weak spot", issueType: "logic" };
      if (!hasText(steps, /blind shot|Tell me plainly|weakness/i)) {
        return { status: "fail", issue: "No guidance when shooting blind", issueType: "narrative" };
      }
      return { status: "ok", detail: "Shot blocked with guidance" };
    },
  );

  runScenario(
    "shoot-wrong-room",
    "Sparare dal Front Gate invece che da Ravenhill",
    (g) => readySmaugEndgame(g, { room: "front_gate" }),
    ['say to bard "shoot dragon"', "wait"],
    (g, steps) => {
      if (g.flags.dragondefeated) return { status: "fail", issue: "Dragon killed from Front Gate", issueType: "logic" };
      if (!hasText(steps, /Ravenhill|Not from here/i)) {
        return { status: "fail", issue: "No Ravenhill guidance from wrong room", issueType: "narrative" };
      }
      return { status: "ok", detail: "Wrong-room shot blocked" };
    },
  );

  runScenario(
    "shoot-before-sighting",
    "Sparare da Ravenhill prima dell'avvistamento",
    (g) => readySmaugEndgame(g, { sighting: false }),
    ['say to bard "shoot dragon"', "wait"],
    (g, steps) => {
      if (g.flags.black_arrow_committed) return { status: "fail", issue: "Arrow loosed before sighting staged", issueType: "logic" };
      if (!hasText(steps, /has not yet shown himself|measures the sky|dark shape lifts/i)) {
        return { status: "warn", detail: "Staging may be unclear", issue: "No sighting staging text", issueType: "narrative" };
      }
      return { status: "ok", detail: "Sighting staged before kill shot" };
    },
  );

  runScenario(
    "treasure-visible",
    "Prendere il tesoro visibile con Smaug vivo",
    (g) => {
      g.execute("jump smaug");
      g.currentRoom = "lower_halls";
      g.player.position = "lower_halls";
      g.player.noticeable = true;
    },
    ["take treasure", "wait"],
    (g, steps) => {
      if (g.flags.treasuretaken) return { status: "fail", issue: "Treasure taken while visible to Smaug", issueType: "logic" };
      if (!hasText(steps, /ring's cover|Bard's help/i)) return { status: "fail", issue: "No treasure guard message", issueType: "narrative" };
      return { status: "ok", detail: "Visible treasure take blocked" };
    },
  );

  runScenario(
    "treasure-ring-death",
    "Rubare il tesoro con l'anello (morte attesa)",
    (g) => {
      g.execute("jump smaug");
      g.currentRoom = "lower_halls";
      g.player.position = "lower_halls";
    },
    ["wear ring", "drop majestic sword", "drop sturdy rope", "drop brass lantern", "take treasure", "wait"],
    (g, steps) => {
      if (!g.endgame || g.pendingEndgameChoice !== "death") {
        return { status: "fail", issue: "Expected fatal Smaug death after ring theft", issueType: "logic" };
      }
      if (!hasText(steps, /ring.*pocket|patience breaks/i)) {
        return { status: "warn", detail: "Death occurred but ring-expiry prose unclear" };
      }
      return { status: "ok", detail: "Fatal end after treasure theft with ring" };
    },
  );

  runScenario(
    "cup-visible",
    "Rubare la coppa senza anello",
    (g) => {
      g.execute("jump smaug");
      g.currentRoom = "lower_halls";
      g.player.position = "lower_halls";
      g.player.noticeable = true;
    },
    ["take cup", "wait"],
    (g, steps) => {
      if (g.flags.cuptaken) return { status: "fail", issue: "Cup taken while visible", issueType: "logic" };
      if (!hasText(steps, /wake Smaug/i)) return { status: "fail", issue: "No cup guard message", issueType: "narrative" };
      return { status: "ok", detail: "Visible cup take blocked" };
    },
  );

  runScenario(
    "cup-ring-awakens",
    "Rubare la coppa con l'anello",
    (g) => {
      g.execute("jump smaug");
      g.currentRoom = "lower_halls";
      g.player.position = "lower_halls";
    },
    ["wear ring", "take cup", "wait", "wait", "wait"],
    (g, steps) => {
      if (!g.flags.cuptaken) return { status: "fail", issue: "Cup not stolen with ring", issueType: "logic" };
      if (!g.endgame && !hasText(steps, /Smaug rises|search|enraged|attacks/i)) {
        return { status: "warn", detail: "Cup taken but Smaug reaction unclear", issue: "Weak Smaug reaction after cup", issueType: "narrative" };
      }
      return { status: "ok", detail: g.endgame ? "Cup theft leads to fatal grapple" : "Cup theft triggers dragon unrest" };
    },
  );

  runScenario(
    "kill-smaug-sword",
    "Attaccare Smaug con la spada",
    (g) => {
      g.execute("jump smaug");
      g.currentRoom = "lower_halls";
      g.player.position = "lower_halls";
    },
    ["kill smaug with sword", "wait"],
    (g, steps) => {
      if (g.flags.dragondefeated) return { status: "fail", issue: "Dragon defeated by sword", issueType: "logic" };
      if (!g.endgame) return { status: "fail", issue: "Sword attack did not end fatally", issueType: "logic" };
      return { status: "ok", detail: "Fatal combat outcome" };
    },
  );

  runScenario(
    "battle-retreat",
    "Ritirarsi dalla Battaglia delle Cinque Armate",
    (g) => setupBattle(g),
    ["retreat"],
    (g, steps) => {
      if (!g.endgame || g.pendingEndgameChoice !== "death") {
        return { status: "fail", issue: "Retreat did not end fatally", issueType: "logic" };
      }
      if (!hasText(steps, /retreat becomes rout/i)) return { status: "fail", issue: "Retreat death prose missing", issueType: "narrative" };
      return { status: "ok", detail: "Battle retreat is fatal" };
    },
  );

  runScenario(
    "standoff-no-negotiation",
    "Standoff: wait senza mai avviare il negoziato",
    (g) => {
      setupStandoff(g);
      g.beginEreborStandoff();
    },
    ["wait", "wait", "wait", "wait", "wait"],
    (g, steps) => {
      if (g.flags.dain_arrived) return { status: "fail", issue: "Dain arrived without negotiation_started", issueType: "logic" };
      return { status: "ok", detail: "Dain blocked until negotiation begins (player must ask Bard/Gandalf)" };
    },
  );

  runScenario(
    "standoff-wait-only",
    "Standoff: negoziato avviato, poi solo wait",
    (g) => {
      setupStandoff(g);
      g.flags.negotiation_started = true;
    },
    ["wait", "wait", "wait"],
    (g, steps) => {
      if (!g.flags.dain_arrived) return { status: "fail", issue: "Dain never arrived after negotiation + waits", issueType: "logic" };
      if (!hasText(steps, /Iron Hills|mail-clad dwarves|Dain/i)) {
        return { status: "warn", detail: "Dain flag set but arrival prose missing" };
      }
      return { status: "ok", detail: "Dain arrives on wait without further parley" };
    },
  );

  runScenario(
    "negotiation-failure-thorin",
    "Chiedere a Thorin i termini dopo l'arrivo di Dain",
    (g) => {
      setupStandoff(g);
      g.flags.negotiation_started = true;
      g.flags.dain_arrived = true;
      g.flags.dwarf_reinforcements_present = true;
      g.debugSetCharacterRoom("thorin", "front_gate", { visible: true, movementMode: "never" });
      g.currentRoom = "front_gate";
      g.player.position = "front_gate";
    },
    ["ask thorin about negotiation"],
    (g, steps) => {
      if (!g.flags.negotiation_failed) return { status: "fail", issue: "Thorin did not harden negotiation", issueType: "logic" };
      if (!hasText(steps, /patience is not surrender|bargain out of fear/i)) {
        return { status: "warn", detail: "negotiation_failed set but prose unclear" };
      }
      return { status: "ok", detail: "Thorin hardens standoff after Dain" };
    },
  );

  runScenario(
    "thorin-early-talk",
    "Parlare con Thorin prima della caduta",
    (g) => {
      setupStandoff(g);
      g.flags.negotiation_started = true;
      g.currentRoom = "front_gate";
      g.player.position = "front_gate";
      g.characters.thorin.position = "erebor_great_hall";
    },
    ["talk to thorin", "wait"],
    (g, steps) => {
      if (g.flags.thorin_reconciled) return { status: "fail", issue: "Thorin reconciled too early", issueType: "logic" };
      return { status: "ok", detail: "Early Thorin talk does not skip farewell" };
    },
  );

  runScenario(
    "dragon-kill-skip-waits",
    "Uccidere il drago e correre subito al Front Gate",
    (g) => readySmaugEndgame(g, { sighting: true }),
    ['say to bard "shoot dragon"', "east", "south", "wait"],
    (g, steps) => {
      if (!g.flags.dragondefeated) return { status: "fail", issue: "Dragon not defeated", issueType: "logic" };
      if (!g.flags.erebor_standoff_started) return { status: "fail", issue: "Standoff not triggered on rushed return", issueType: "logic" };
      const images = steps.map((s) => s.image).filter((f) => f !== "-");
      if (!images.includes("black_arrow_loosed.png")) {
        return { status: "warn", detail: "Black arrow image missing in rushed path", issue: "Missing black arrow image", issueType: "image" };
      }
      return { status: "ok", detail: `Image chain: ${images.join(" -> ")}` };
    },
  );

  runScenario(
    "mixed-battle-choices",
    "Battaglia: prima Gandalf, poi Bard",
    (g) => setupBattle(g),
    ["follow gandalf", "help bard", "wait"],
    (g, steps) => {
      if (!g.flags.battle_won) return { status: "fail", issue: "Mixed battle choices did not win", issueType: "logic" };
      if (g.flags.battle_stage_1_choice !== "follow_gandalf") return { status: "fail", issue: "Stage 1 choice not recorded", issueType: "logic" };
      if (g.flags.battle_stage_2_choice !== "help_bard") return { status: "fail", issue: "Stage 2 choice not recorded", issueType: "logic" };
      return { status: "ok", detail: "Gandalf then Bard wins battle" };
    },
  );

  runScenario(
    "battle-thorin-thorin",
    "Battaglia: stare con Thorin due volte",
    (g) => setupBattle(g),
    ["stand with thorin", "stand with thorin", "wait"],
    (g, steps) => {
      if (!g.flags.battle_won) return { status: "fail", issue: "Thorin path did not win", issueType: "logic" };
      if (g.currentRoom !== "stoe_of_ravenhill" && !g.flags.thorin_fallen) {
        return { status: "warn", detail: `Ended at ${g.currentRoom} before Thorin fall` };
      }
      return { status: "ok", detail: "Thorin-front-gate path resolves" };
    },
  );

  runScenario(
    "battle-double-gandalf",
    "Battaglia: seguire Gandalf due volte (vittoria aquile)",
    (g) => setupBattle(g),
    ["follow gandalf", "follow gandalf", "wait"],
    (g, steps) => {
      if (!g.flags.battle_won) return { status: "fail", issue: "Double Gandalf path did not win", issueType: "logic" };
      const eagleImage = steps.some((s) => s.image === "eagles_battle_turning.png");
      if (!eagleImage && !hasText(steps, /eagles wheel down/i)) {
        return { status: "warn", detail: "Battle won but eagle victory art/text missing" };
      }
      return { status: "ok", detail: "Ravenhill twice triggers eagle victory" };
    },
  );

  runScenario(
    "no-bard-at-ravenhill",
    "Sparare senza Bard sulla collina",
    (g) => {
      readySmaugEndgame(g, { sighting: true });
      const bard = g.characters.bard;
      bard.position = "wooden_town";
      bard.visible = false;
      bard.carriedBy = null;
    },
    ['say to bard "shoot dragon"', "wait"],
    (g, steps) => {
      if (g.flags.dragondefeated) return { status: "fail", issue: "Dragon defeated without Bard present", issueType: "logic" };
      return { status: "ok", detail: "Shot blocked without Bard" };
    },
  );

  runScenario(
    "insult-smaug",
    "Insultare Smaug nelle Lower Halls",
    (g) => {
      g.execute("jump smaug");
      g.currentRoom = "lower_halls";
      g.player.position = "lower_halls";
    },
    ["insult smaug", "wait", "wait"],
    (g, steps) => {
      if (g.flags.dragondefeated) return { status: "fail", issue: "Dragon defeated by insult", issueType: "logic" };
      if (!g.endgame) return { status: "fail", issue: "Insult did not lead to fatal encounter", issueType: "logic" };
      return { status: "ok", detail: "Insult escalates to fatal Smaug attack" };
    },
  );

  runScenario(
    "homeward-without-farewell",
    "Tentare il ritorno senza l'addio di Thorin",
    (g) => {
      g.execute("jump smaug");
      g.flags.dragondefeated = true;
      g.flags.battle_won = true;
      g.flags.thorin_fallen = true;
      g.currentRoom = "stoe_of_ravenhill";
      g.player.position = "stoe_of_ravenhill";
    },
    ["wait", "wait", "wait"],
    (g, steps) => {
      if (g.homewardJourneyStarted()) return { status: "fail", issue: "Homeward started without Thorin farewell", issueType: "logic" };
      return { status: "ok", detail: "Homeward blocked until farewell" };
    },
  );

  runScenario(
    "leave-halls-without-bard",
    "Uscire dalle Lower Halls senza Bard",
    (g) => {
      g.execute("jump smaug");
      g.currentRoom = "lower_halls";
      g.player.position = "lower_halls";
      const bard = g.characters.bard;
      if (bard) {
        bard.position = "lower_halls";
        bard.carriedBy = null;
        bard.followingPlayer = false;
        bard.visible = true;
      }
    },
    ["east", "wait"],
    (g, steps) => {
      if (g.flags.dragondefeated) return { status: "fail", issue: "Left halls without dragon arc", issueType: "logic" };
      if (g.currentRoom === "lower_halls") return { status: "warn", detail: "Could not leave lower halls" };
      return { status: "ok", detail: `Exited to ${g.currentRoom} without carrying Bard` };
    },
  );

  runScenario(
    "weak-spot-without-sharing",
    "Sparare con weak spot noto ma non condiviso con Bard",
    (g) => {
      readySmaugEndgame(g, { sighting: true });
      g.flags.smaug_weakspot_shared_with_bard = false;
    },
    ['say to bard "shoot dragon"', "wait"],
    (g, steps) => {
      if (g.flags.dragondefeated) return { status: "fail", issue: "Dragon killed without sharing weak spot", issueType: "logic" };
      if (!hasText(steps, /weakness|weak spot|Tell Bard/i)) {
        return { status: "warn", detail: "Block works but guidance text unclear" };
      }
      return { status: "ok", detail: "Shot blocked until Bard knows weak spot" };
    },
  );

  const reportPath = path.join(__dirname, "playtest-erebor-deviations-report.txt");
  const lines = [
    "Erebor endgame deviation playtest",
    `Date: ${new Date().toISOString()}`,
    `Scenarios: ${RESULTS.length}`,
    `Issues: ${ISSUES.length}`,
    "",
    "SUMMARY",
    ...RESULTS.map((r) => `- [${r.status}] ${r.id}: ${r.label}${r.detail ? ` — ${r.detail}` : ""}`),
    "",
  ];
  if (ISSUES.length) {
    lines.push("ISSUES:");
    for (const issue of ISSUES) lines.push(`  [${issue.type}] ${issue.scenario}: ${issue.detail}`);
    lines.push("");
  }
  for (const result of RESULTS) {
    lines.push(`--- ${result.id} (${result.status}) ---`);
    for (const step of result.steps) {
      lines.push(`> ${step.command} @ ${step.room} img=${step.image} endgame=${step.endgame}`);
      if (step.output) lines.push(`  ${step.output.replace(/\s+/g, " ").slice(0, 220)}`);
    }
    lines.push("");
  }
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");

  const fails = RESULTS.filter((r) => r.status === "fail" || r.status === "error").length;
  const warns = RESULTS.filter((r) => r.status === "warn").length;
  console.log(`Report: ${reportPath}`);
  console.log(`Scenarios: ${RESULTS.length}, fails: ${fails}, warns: ${warns}, issues: ${ISSUES.length}`);
  process.exit(fails > 0 ? 1 : 0);
}

try {
  main();
} catch (error) {
  console.error(`Deviation playtest crashed: ${error.message}`);
  process.exit(1);
}

const fs = require("fs");
const path = require("path");
const { bootGame, outputLines, execStep } = require("./headless-boot");
const { defaultSetup } = require("./route-transcript-lib");

const IMAGE_DIR = path.join(__dirname, "..", "assets", "local-images");
const ENDGAME_ALIASES = Object.fromEntries(
  Object.entries({
    "smaug-sleeping-lower-halls": "smaug_sleeping_lower_halls.png",
    "smaug-stirs-curious": "smaug_stirs_curious.png",
    "smaug-searching-lower-halls": "smaug_searching_lower_halls.png",
    "smaug-enraged-lower-halls": "smaug_enraged_lower_halls.png",
    "smaug-weak-spot-glimpse": "smaug_weak_spot_glimpse.png",
    "golden-cup-stolen": "golden_cup_stolen.png",
    "ravenhill-dragon-sighting": "ravenhill_dragon_sighting.png",
    "thrush-warning-ravenhill": "thrush_warning_ravenhill.png",
    "black-arrow-loosed": "black_arrow_loosed.png",
    "smaug-falls-from-sky": "smaug_falls_from_sky.png",
    "laketown-burning": "laketown_burning.png",
    "dale-standoff-camps": "dale_standoff_camps.png",
    "dain-iron-hills-arrival": "dain_iron_hills_arrival.png",
    "battle-five-armies-begins": "battle_five_armies_begins.png",
    "battle-ravenhill-gandalf": "battle_ravenhill_gandalf.png",
    "battle-front-gate-thorin": "battle_front_gate_thorin.png",
    "battle-dale-bard": "battle_dale_bard.png",
    "beorn-bear-battle": "beorn_bear_battle.png",
    "eagles-battle-turning": "eagles_battle_turning.png",
    "thorin-wounded-ravenhill": "thorin_wounded_ravenhill.png",
    "thorin-farewell-ravenhill": "thorin_farewell_ravenhill.png",
    "homeward-road-west": "homeward_road_west.png",
    "bag-end-auction-chaos": "bag_end_auction_chaos.png",
    "epilogue-gandalf-balin-fireside": "epilogue_gandalf_balin_fireside.png",
  })
);

const ISSUES = [];

function note(type, step, detail) {
  ISSUES.push({ type, step, detail });
}

function roomImage(game) {
  return game.temporaryImage?.file || game.contextualRoomImage(game.room()) || game.room()?.image || "-";
}

function exec(game, command, transcript, imageLog) {
  execStep(game, command, transcript);
  imageLog.push({
    command,
    room: game.currentRoom,
    temporary: game.temporaryImage?.file || "-",
    displayed: roomImage(game),
    flags: {
      dragondefeated: Boolean(game.flags.dragondefeated),
      smaugstate: game.flags.smaugstate || "-",
      laketown_seen: Boolean(game.flags.laketown_burning_echo_seen),
      standoff: Boolean(game.flags.erebor_standoff_started),
    },
  });
}

function assertAssetsExist() {
  const missing = Object.values(ENDGAME_ALIASES).filter((file) => !fs.existsSync(path.join(IMAGE_DIR, file)));
  if (missing.length) throw new Error(`Missing endgame image files: ${missing.join(", ")}`);
}

function auditImageLog(imageLog) {
  const idx = (file) => imageLog.findIndex((e) => e.temporary === file);
  const fallIdx = idx("smaug_falls_from_sky.png");
  const laketownIdx = idx("laketown_burning.png");
  const standoffIdx = idx("dale_standoff_camps.png");
  const arrowIdx = idx("black_arrow_loosed.png");

  if (arrowIdx < 0) note("shoot-sequence", "shoot dragon", "black_arrow_loosed never appeared");
  if (fallIdx < 0) note("shoot-sequence", "after shoot", "smaug_falls_from_sky never appeared");
  if (arrowIdx >= 0 && fallIdx >= 0 && fallIdx <= arrowIdx) {
    note("shoot-sequence", imageLog[arrowIdx].command, "Smaug fall image did not come after the black arrow shot");
  }
  if (laketownIdx >= 0 && fallIdx >= 0 && laketownIdx < fallIdx) {
    note("sequence", "laketown-burning", "Lake-town burning image appeared before Smaug fall");
  }
  if (standoffIdx >= 0 && laketownIdx >= 0 && standoffIdx < laketownIdx) {
    note("sequence", "dale-standoff-camps", "Standoff image appeared before Lake-town burning");
  }
  if (standoffIdx >= 0 && laketownIdx >= 0 && standoffIdx === laketownIdx) {
    note("sequence", imageLog[standoffIdx].command, "Standoff and Lake-town images competed on the same command");
  }
  if (imageLog.some((e) => e.temporary === "thrush_warning_ravenhill.png")) {
    note("thrush-overwritten", "ravenhill", "Thrush image still appeared on the same command as sighting");
  }

  for (const entry of imageLog) {
    if (entry.displayed === "lower_halls.jpeg" && entry.room === "lower_halls" && !entry.flags.dragondefeated) {
      note("lower-halls-base", entry.command, "Base lower_halls.jpeg shown with live Smaug and no state overlay");
    }
  }
}

function playOptimalDragon(game, transcript, imageLog) {
  exec(game, 'ask bard to follow me', transcript, imageLog);
  exec(game, 'say to bard "get black arrow from quiver"', transcript, imageLog);
  exec(game, "read map", transcript, imageLog);
  exec(game, "north east", transcript, imageLog);
  for (let i = 0; i < 3; i += 1) exec(game, "wait", transcript, imageLog);
  exec(game, "unlock secret door with curious key", transcript, imageLog);
  exec(game, "open secret door", transcript, imageLog);
  exec(game, "east", transcript, imageLog);
  while (game.currentRoom !== "lower_halls" && !game.endgame) {
    const cmd = game.nextAutoplayCommand?.();
    if (!cmd) break;
    exec(game, cmd, transcript, imageLog);
  }
  exec(game, "wear ring", transcript, imageLog);
  exec(game, "ask smaug about treasure", transcript, imageLog);
  while (game.currentRoom !== "stoe_of_ravenhill" && !game.endgame) {
    const cmd = game.nextAutoplayCommand?.();
    if (!cmd) break;
    exec(game, cmd, transcript, imageLog);
  }
  exec(game, 'say to bard "shoot dragon"', transcript, imageLog);
  exec(game, 'say to bard "shoot dragon"', transcript, imageLog);
  exec(game, "wait", transcript, imageLog);
  exec(game, "wait", transcript, imageLog);
  exec(game, "east", transcript, imageLog);
  exec(game, "wait", transcript, imageLog);
}

function playEndgame(game, transcript, imageLog) {
  while (!game.flags.negotiation_started && !game.endgame) {
    const cmd = game.nextAutoplayCommand?.();
    if (!cmd) break;
    exec(game, cmd, transcript, imageLog);
  }
  for (let i = 0; i < 4; i += 1) exec(game, "wait", transcript, imageLog);
  exec(game, "follow gandalf", transcript, imageLog);
  exec(game, "help bard", transcript, imageLog);
  for (let i = 0; i < 3; i += 1) exec(game, "wait", transcript, imageLog);
  exec(game, "talk to thorin", transcript, imageLog);
  exec(game, "wait", transcript, imageLog);
  game.debugMovePlayer("hobbit_hole", { markRoute: true });
  game.noteBagEndAuction();
  game.flags.dragon_arc_complete = true;
  game.resolveTreasureHomecoming();
}

function main() {
  assertAssetsExist();
  const game = bootGame();
  const transcript = [];
  const imageLog = [];
  defaultSetup(game, 1, "jump front_gate");
  imageLog.push({
    command: "[setup]",
    room: game.currentRoom,
    temporary: game.temporaryImage?.file || "-",
    displayed: roomImage(game),
    flags: {},
  });

  playOptimalDragon(game, transcript, imageLog);
  playEndgame(game, transcript, imageLog);
  auditImageLog(imageLog);

  const reportPath = path.join(__dirname, "playtest-erebor-images-report.txt");
  const lines = [
    "Erebor endgame image transition audit",
    `Date: ${new Date().toISOString()}`,
    `Image transitions logged: ${imageLog.length}`,
    `Issues: ${ISSUES.length}`,
    "",
  ];
  if (ISSUES.length) {
    lines.push("ISSUES:");
    for (const issue of ISSUES) lines.push(`  [${issue.type}] ${issue.step}: ${issue.detail}`);
    lines.push("");
  } else {
    lines.push("No image transition issues detected.");
    lines.push("");
  }
  lines.push("--- TRANSITION LOG ---");
  for (const entry of imageLog) {
    lines.push(`${entry.command} @ ${entry.room}`);
    lines.push(`  temp=${entry.temporary} displayed=${entry.displayed}`);
    if (entry.flags?.smaugstate) lines.push(`  smaugstate=${entry.flags.smaugstate}`);
  }

  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Report: ${reportPath}`);
  console.log(`Transitions: ${imageLog.length}, Issues: ${ISSUES.length}`);
  if (ISSUES.length) {
    for (const issue of ISSUES.slice(0, 12)) console.log(`  [${issue.type}] ${issue.detail}`);
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(`Image audit failed: ${error.message}`);
  process.exit(1);
}

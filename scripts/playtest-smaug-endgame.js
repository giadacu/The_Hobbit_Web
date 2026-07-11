const fs = require("fs");
const path = require("path");
const { bootGame } = require("./headless-boot");

const IMAGE_DIR = path.join(__dirname, "..", "assets", "local-images");
const ENDGAME_FILES = [
  "smaug_sleeping_lower_halls.png",
  "smaug_stirs_curious.png",
  "smaug_searching_lower_halls.png",
  "smaug_enraged_lower_halls.png",
  "smaug_weak_spot_glimpse.png",
  "golden_cup_stolen.png",
  "ravenhill_dragon_sighting.png",
  "thrush_warning_ravenhill.png",
  "black_arrow_loosed.png",
  "smaug_falls_from_sky.png",
  "laketown_burning.png",
  "dale_standoff_camps.png",
  "dain_iron_hills_arrival.png",
  "battle_five_armies_begins.png",
  "battle_ravenhill_gandalf.png",
  "battle_front_gate_thorin.png",
  "battle_dale_bard.png",
  "beorn_bear_battle.png",
  "eagles_battle_turning.png",
  "thorin_wounded_ravenhill.png",
  "thorin_farewell_ravenhill.png",
  "homeward_road_west.png",
  "bag_end_auction_chaos.png",
  "epilogue_gandalf_balin_fireside.png",
  "smaug_incinirates_bilbo_lower_halls_death.png",
  "gollum_enraged_pocket_death.png",
];

function assertImageFiles() {
  const missing = ENDGAME_FILES.filter((file) => !fs.existsSync(path.join(IMAGE_DIR, file)));
  if (missing.length) {
    throw new Error(`Missing endgame images: ${missing.join(", ")}`);
  }
}

function expectImage(game, expected, label) {
  const actual = game.temporaryImage?.file || "";
  if (actual !== expected) {
    throw new Error(`${label}: expected image ${expected}, got ${actual || "none"}`);
  }
}

function carryBard(game) {
  const bard = game.characters.bard;
  if (!bard) throw new Error("Bard missing from jump smaug setup.");
  bard.carriedBy = game.player.id;
  bard.position = game.currentRoom;
  bard.followingPlayer = false;
  bard.movementMode = "follow";
  bard.visible = true;
}

function snapshot(game, label) {
  return {
    label,
    room: game.currentRoom,
    endgame: game.endgame,
    image: game.temporaryImage?.file || "-",
  };
}

function main() {
  assertImageFiles();
  const game = bootGame();
  const log = [];

  game.execute("jump smaug");
  game.flags.bardreadiedarrow = true;
  log.push(snapshot(game, "jump-smaug"));

  game.execute("wear ring");
  game.execute("ask smaug about treasure");
  expectImage(game, "smaug_weak_spot_glimpse.png", "weak-spot-discovery");
  log.push(snapshot(game, "weak-spot"));

  game.execute("ask bard about the weak spot");
  if (!game.flags.smaug_weakspot_shared_with_bard) {
    throw new Error("Weak spot was not shared with Bard.");
  }

  game.execute("take cup");
  if (!game.flags.cuptaken) throw new Error("Cup theft flag not set.");
  log.push(snapshot(game, "cup-theft"));

  carryBard(game);
  game.currentRoom = "lonely_mountain";
  game.player.position = "lonely_mountain";
  game.characters.bard.position = "lonely_mountain";
  game.execute("south");
  game.execute("west");
  if (!game.flags.smaug_sighted_from_ravenhill) {
    throw new Error("Smaug was not sighted from Ravenhill.");
  }
  expectImage(game, "ravenhill_dragon_sighting.png", "ravenhill-sighting");
  log.push(snapshot(game, "ravenhill-sighting"));

  game.execute('say to bard "shoot dragon"');
  if (!game.flags.dragondefeated) throw new Error("Dragon was not defeated.");
  expectImage(game, "smaug_falls_from_sky.png", "dragon-fall");
  log.push(snapshot(game, "dragon-fall"));

  game.execute("wait");
  if (!game.flags.laketown_burning_echo_seen) throw new Error("Lake-town burning echo missing.");
  expectImage(game, "laketown_burning.png", "laketown-burning");
  log.push(snapshot(game, "laketown-echo"));

  game.flags.negotiation_started = true;
  game.currentRoom = "ruins_of_the_town_of_dale";
  game.player.position = "ruins_of_the_town_of_dale";
  game.beginEreborStandoff();
  expectImage(game, "dale_standoff_camps.png", "standoff");
  log.push(snapshot(game, "standoff"));

  game.flags.negotiation_started = true;
  game.beginDainArrival();
  expectImage(game, "dain_iron_hills_arrival.png", "dain-arrival");
  log.push(snapshot(game, "dain-arrival"));

  game.beginBattleOfFiveArmies();
  expectImage(game, "battle_five_armies_begins.png", "battle-begins");
  game.handleBattleChoice("follow_gandalf");
  expectImage(game, "battle_ravenhill_gandalf.png", "battle-stage-1");
  game.handleBattleChoice("follow_gandalf");
  expectImage(game, "eagles_battle_turning.png", "battle-won");
  log.push(snapshot(game, "battle-won"));

  game.beginThorinFall();
  expectImage(game, "thorin_wounded_ravenhill.png", "thorin-wounded");
  game.execute("talk to thorin");
  expectImage(game, "thorin_farewell_ravenhill.png", "thorin-farewell");
  log.push(snapshot(game, "thorin-farewell"));

  game.beginHomewardJourney();
  expectImage(game, "homeward_road_west.png", "homeward");
  game.debugMovePlayer("hobbit_hole", { markRoute: true });
  game.noteBagEndAuction();
  expectImage(game, "bag_end_auction_chaos.png", "bag-end-auction");
  game.flags.dragon_arc_complete = true;
  game.resolveTreasureHomecoming();
  expectImage(game, "epilogue_gandalf_balin_fireside.png", "epilogue");
  log.push(snapshot(game, "epilogue"));

  const reportPath = path.join(__dirname, "playtest-smaug-endgame-report.txt");
  const lines = [
    "Smaug endgame playtest: PASS",
    `Images checked: ${ENDGAME_FILES.length}`,
    `Steps: ${log.length}`,
    "",
    ...log.map((entry) => JSON.stringify(entry)),
  ];
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Smaug endgame playtest passed (${ENDGAME_FILES.length} images, ${log.length} steps).`);
  console.log(`Report: ${reportPath}`);
}

try {
  main();
} catch (error) {
  console.error(`Smaug endgame playtest failed: ${error.message}`);
  process.exit(1);
}

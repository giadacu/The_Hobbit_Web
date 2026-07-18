const fs = require("fs");
const path = require("path");
const { bootGame } = require("./headless-boot");

const IMAGE_DIR = path.join(__dirname, "..", "assets", "local-images");
const REQUIRED_FILES = [
  "hobbit_hole_party.png",
  "bag_end_parlour_party.png",
  "bag_end_kitchen_party.png",
  "Dwalin_glimpse_bag_end_start.png",
  "Thorin_glimpse_bag_end_start.png",
  "gandalf_glimpse_bag_end_quiet_start.png",
  "gandalf_glimpse_bag_end_quiet_start_garden.png",
  "gandalf_glimpse_bag_end_not_yet.png",
  "gandalf_glimpse_bag_end_not_yet_garden.png",
  "gandalf_glimpse_bag_end_briefing.png",
  "gandalf_glimpse_bag_end_briefing_garden.png",
];

function assertImageFiles() {
  const missing = REQUIRED_FILES.filter((file) => !fs.existsSync(path.join(IMAGE_DIR, file)));
  if (missing.length) throw new Error(`Missing Bag End party images: ${missing.join(", ")}`);
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function expectTempImage(game, expected, label) {
  const actual = game.temporaryImage?.file || "";
  if (actual !== expected) {
    throw new Error(`${label}: expected temporary image ${expected}, got ${actual || "none"}`);
  }
}

function expectPresentation(game, expectedEffect, expectedFocus, label) {
  const actualEffect = game.temporaryImage?.presentation?.effect || "";
  const actualFocus = game.temporaryImage?.presentation?.focus || "";
  if (actualEffect !== expectedEffect || actualFocus !== expectedFocus) {
    throw new Error(
      `${label}: expected presentation ${expectedEffect}/${expectedFocus}, got ${actualEffect || "-"} / ${actualFocus || "-"}`
    );
  }
}

function expectRoomImage(game, roomId, expected, label) {
  const room = game.rooms[roomId];
  const actual = game.contextualRoomImage(room);
  if (actual !== expected) {
    throw new Error(`${label}: expected contextual image ${expected}, got ${actual || "none"}`);
  }
}

function clearTemp(game) {
  game.clearTemporaryImage({ render: false });
}

function advanceUntil(game, predicate, limit = 30) {
  for (let step = 0; step < limit; step += 1) {
    if (predicate()) return step;
    game.execute("wait");
  }
  throw new Error(`Advance limit reached (${limit}) before condition was met.`);
}

function snapshot(game, label) {
  return {
    label,
    room: game.currentRoom,
    phase: game.bagEndPartyPhase(),
    image: game.temporaryImage?.file || "-",
  };
}

function ensureQuietStart(game) {
  if (game.characters.gandalf) game.characters.gandalf.position = game.currentRoom;
  advanceUntil(game, () => Boolean(game.unexpectedParty?.state?.quietStartShown));
}

function testFirstKnockHall(log) {
  const game = bootGame();
  expect(game.currentRoom === "hobbit_hole", "Game should start in hobbit_hole.");
  advanceUntil(game, () => game.unexpectedParty?.state?.currentArrival?.dwarfId === "unexpected_party_dwalin" && game.unexpectedParty.state.currentArrival.stage === 1);
  expectTempImage(game, "Dwalin_glimpse_bag_end_start.png", "first-knock-hall");
  expectPresentation(game, "party-glimpse", "", "first-knock-hall-presentation");
  log.push({
    ...snapshot(game, "first-knock-hall"),
    effect: game.temporaryImage?.presentation?.effect || "-",
    focus: game.temporaryImage?.presentation?.focus || "-",
  });
}

function testFirstKnockGarden(log) {
  const game = bootGame();
  ensureQuietStart(game);
  game.execute("open round green door");
  game.execute("outside");
  expect(game.currentRoom === "bilbos_garden", "Player should reach bilbos_garden.");
  // After a move, the knock glimpse may flush on the next wait while stage already advanced.
  advanceUntil(game, () => game.temporaryImage?.file === "Dwalin_glimpse_bag_end_start.png");
  expect(game.unexpectedParty?.state?.arrived?.includes("unexpected_party_dwalin")
    || game.unexpectedParty?.state?.currentArrival?.dwarfId === "unexpected_party_dwalin",
  "Dwalin arrival should be underway or complete.");
  expectTempImage(game, "Dwalin_glimpse_bag_end_start.png", "first-knock-garden");
  expectPresentation(game, "party-glimpse", "", "first-knock-garden-presentation");
  log.push({
    ...snapshot(game, "first-knock-garden"),
    effect: game.temporaryImage?.presentation?.effect || "-",
    focus: game.temporaryImage?.presentation?.focus || "-",
  });
}

function testThorinHall(log) {
  const game = bootGame();
  advanceUntil(game, () => game.unexpectedParty?.state?.thorinStage === 2);
  expectTempImage(game, "Thorin_glimpse_bag_end_start.png", "thorin-hall");
  expectPresentation(game, "party-glimpse", "", "thorin-hall-presentation");
  log.push({
    ...snapshot(game, "thorin-hall"),
    effect: game.temporaryImage?.presentation?.effect || "-",
    focus: game.temporaryImage?.presentation?.focus || "-",
  });
}

function testThorinGarden(log) {
  const game = bootGame();
  ensureQuietStart(game);
  game.execute("open round green door");
  game.execute("outside");
  expect(game.currentRoom === "bilbos_garden", "Player should reach bilbos_garden.");
  advanceUntil(game, () => game.temporaryImage?.file === "Thorin_glimpse_bag_end_start.png");
  expect(game.unexpectedParty?.state?.thorinStage >= 1, "Thorin arrival should have begun.");
  expectTempImage(game, "Thorin_glimpse_bag_end_start.png", "thorin-garden");
  expectPresentation(game, "party-glimpse", "", "thorin-garden-presentation");
  log.push({
    ...snapshot(game, "thorin-garden"),
    effect: game.temporaryImage?.presentation?.effect || "-",
    focus: game.temporaryImage?.presentation?.focus || "-",
  });
}

function testPersistentVariants(log) {
  const game = bootGame();
  advanceUntil(game, () => game.bagEndPartyPhase() === "arrivals");
  clearTemp(game);
  expectRoomImage(game, "hobbit_hole", "hobbit_hole_party.png", "hobbit-hole-persistent");
  expectRoomImage(game, "bag_end_parlour", "bag_end_parlour_party.png", "parlour-persistent");
  expectRoomImage(game, "bag_end_kitchen", "bag_end_kitchen_party.png", "kitchen-persistent");
  log.push({
    label: "persistent-variants",
    phase: game.bagEndPartyPhase(),
    hobbit_hole: game.contextualRoomImage(game.rooms.hobbit_hole),
    bag_end_parlour: game.contextualRoomImage(game.rooms.bag_end_parlour),
    bag_end_kitchen: game.contextualRoomImage(game.rooms.bag_end_kitchen),
  });
}

function testNoWrongRoomCutscene(log) {
  const game = bootGame();
  ensureQuietStart(game);
  game.execute("west");
  expect(game.currentRoom === "bag_end_parlour", "Player should reach bag_end_parlour.");
  advanceUntil(game, () => game.unexpectedParty?.state?.currentArrival?.dwarfId === "unexpected_party_dwalin" && game.unexpectedParty.state.currentArrival.stage === 1);
  expect(!game.temporaryImage, "Parlour should not receive hall/garden first-knock cutscene.");
  log.push(snapshot(game, "no-wrong-room-cutscene"));
}

function testCompanionGlimpse(log) {
  const game = bootGame();
  advanceUntil(game, () => game.unexpectedParty?.state?.arrivalIndex >= 2 && !game.unexpectedParty?.state?.currentArrival);
  expectTempImage(game, "hobbit_hole_party.png", "companions-glimpse-image");
  expectPresentation(game, "party-glimpse", "right", "companions-glimpse-presentation");
  log.push({
    ...snapshot(game, "companions-glimpse"),
    effect: game.temporaryImage?.presentation?.effect || "-",
    focus: game.temporaryImage?.presentation?.focus || "-",
  });
}

function testGandalfQuietStartHall(log) {
  const game = bootGame();
  advanceUntil(game, () => game.temporaryImage?.file === "gandalf_glimpse_bag_end_quiet_start.png");
  expectTempImage(game, "gandalf_glimpse_bag_end_quiet_start.png", "gandalf-quiet-hall-image");
  expectPresentation(game, "party-glimpse", "left", "gandalf-quiet-hall-presentation");
  log.push({
    ...snapshot(game, "gandalf-quiet-hall"),
    effect: game.temporaryImage?.presentation?.effect || "-",
    focus: game.temporaryImage?.presentation?.focus || "-",
  });
}

function testGandalfQuietStartGarden(log) {
  const game = bootGame();
  game.execute("open round green door");
  game.execute("outside");
  expect(game.currentRoom === "bilbos_garden", "Player should reach bilbos_garden.");
  // Quiet-start glimpse requires Gandalf to share the room.
  if (game.characters.gandalf) game.characters.gandalf.position = "bilbos_garden";
  advanceUntil(game, () => game.temporaryImage?.file === "gandalf_glimpse_bag_end_quiet_start_garden.png");
  expectTempImage(game, "gandalf_glimpse_bag_end_quiet_start_garden.png", "gandalf-quiet-garden-image");
  expectPresentation(game, "party-glimpse", "left", "gandalf-quiet-garden-presentation");
  log.push({
    ...snapshot(game, "gandalf-quiet-garden"),
    effect: game.temporaryImage?.presentation?.effect || "-",
    focus: game.temporaryImage?.presentation?.focus || "-",
  });
}

function testGandalfNotYetGarden(log) {
  const game = bootGame();
  ensureQuietStart(game);
  game.execute("open round green door");
  game.execute("outside");
  expect(game.currentRoom === "bilbos_garden", "Player should reach bilbos_garden.");
  game.execute("east");
  expectTempImage(game, "gandalf_glimpse_bag_end_not_yet_garden.png", "gandalf-not-yet-garden-image");
  expectPresentation(game, "party-glimpse", "left", "gandalf-not-yet-garden-presentation");
  log.push({
    ...snapshot(game, "gandalf-not-yet-garden"),
    effect: game.temporaryImage?.presentation?.effect || "-",
    focus: game.temporaryImage?.presentation?.focus || "-",
  });
}

function testGandalfBriefingHall(log) {
  const game = bootGame();
  advanceUntil(game, () => game.unexpectedParty?.state?.questBriefingDone);
  expectTempImage(game, "gandalf_glimpse_bag_end_briefing.png", "gandalf-briefing-hall-image");
  expectPresentation(game, "party-glimpse", "left", "gandalf-briefing-hall-presentation");
  log.push({
    ...snapshot(game, "gandalf-briefing-hall"),
    effect: game.temporaryImage?.presentation?.effect || "-",
    focus: game.temporaryImage?.presentation?.focus || "-",
  });
}

function testGandalfBriefingGarden(log) {
  const game = bootGame();
  game.execute("open round green door");
  game.execute("outside");
  expect(game.currentRoom === "bilbos_garden", "Player should reach bilbos_garden.");
  if (game.characters.gandalf) game.characters.gandalf.position = "bilbos_garden";
  advanceUntil(game, () => game.unexpectedParty?.state?.questBriefingDone);
  expectTempImage(game, "gandalf_glimpse_bag_end_briefing_garden.png", "gandalf-briefing-garden-image");
  expectPresentation(game, "party-glimpse", "left", "gandalf-briefing-garden-presentation");
  log.push({
    ...snapshot(game, "gandalf-briefing-garden"),
    effect: game.temporaryImage?.presentation?.effect || "-",
    focus: game.temporaryImage?.presentation?.focus || "-",
  });
}

function main() {
  assertImageFiles();
  const log = [];
  testGandalfQuietStartHall(log);
  testGandalfQuietStartGarden(log);
  testFirstKnockHall(log);
  testFirstKnockGarden(log);
  testGandalfNotYetGarden(log);
  testThorinHall(log);
  testThorinGarden(log);
  testPersistentVariants(log);
  testCompanionGlimpse(log);
  testGandalfBriefingHall(log);
  testGandalfBriefingGarden(log);
  testNoWrongRoomCutscene(log);

  const reportPath = path.join(__dirname, "playtest-bag-end-party-images-report.txt");
  const lines = [
    "Bag End party image playtest: PASS",
    `Images checked: ${REQUIRED_FILES.length}`,
    `Checks: ${log.length}`,
    "",
    ...log.map((entry) => JSON.stringify(entry)),
  ];
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Bag End party image playtest passed (${REQUIRED_FILES.length} images, ${log.length} checks).`);
  console.log(`Report: ${reportPath}`);
}

try {
  main();
} catch (error) {
  console.error(`Bag End party image playtest failed: ${error.message}`);
  process.exit(1);
}

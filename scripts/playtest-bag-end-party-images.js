const fs = require("fs");
const path = require("path");
const { bootGame } = require("./headless-boot");

const IMAGE_DIR = path.join(__dirname, "..", "assets", "local-images");
const REQUIRED_FILES = [
  "hobbit_hole_party.png",
  "bag_end_parlour_party.png",
  "bag_end_kitchen_party.png",
  "unexpected_party_first_knock.png",
  "unexpected_party_first_knock_garden.png",
  "unexpected_party_thorin_at_door_hall.png",
  "unexpected_party_thorin_at_door_garden.png",
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

function testFirstKnockHall(log) {
  const game = bootGame();
  expect(game.currentRoom === "hobbit_hole", "Game should start in hobbit_hole.");
  advanceUntil(game, () => game.unexpectedParty?.state?.currentArrival?.dwarfId === "unexpected_party_dwalin" && game.unexpectedParty.state.currentArrival.stage === 1);
  expectTempImage(game, "unexpected_party_first_knock.png", "first-knock-hall");
  log.push(snapshot(game, "first-knock-hall"));
}

function testFirstKnockGarden(log) {
  const game = bootGame();
  game.execute("open round green door");
  game.execute("outside");
  expect(game.currentRoom === "bilbos_garden", "Player should reach bilbos_garden.");
  advanceUntil(game, () => game.unexpectedParty?.state?.currentArrival?.dwarfId === "unexpected_party_dwalin" && game.unexpectedParty.state.currentArrival.stage === 1);
  expectTempImage(game, "unexpected_party_first_knock_garden.png", "first-knock-garden");
  log.push(snapshot(game, "first-knock-garden"));
}

function testThorinHall(log) {
  const game = bootGame();
  advanceUntil(game, () => game.unexpectedParty?.state?.thorinStage === 2);
  expectTempImage(game, "unexpected_party_thorin_at_door_hall.png", "thorin-hall");
  log.push(snapshot(game, "thorin-hall"));
}

function testThorinGarden(log) {
  const game = bootGame();
  game.execute("open round green door");
  game.execute("outside");
  expect(game.currentRoom === "bilbos_garden", "Player should reach bilbos_garden.");
  advanceUntil(game, () => game.unexpectedParty?.state?.thorinStage === 2);
  expectTempImage(game, "unexpected_party_thorin_at_door_garden.png", "thorin-garden");
  log.push(snapshot(game, "thorin-garden"));
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
  game.execute("west");
  expect(game.currentRoom === "bag_end_parlour", "Player should reach bag_end_parlour.");
  advanceUntil(game, () => game.unexpectedParty?.state?.currentArrival?.dwarfId === "unexpected_party_dwalin" && game.unexpectedParty.state.currentArrival.stage === 1);
  expect(!game.temporaryImage, "Parlour should not receive hall/garden first-knock cutscene.");
  log.push(snapshot(game, "no-wrong-room-cutscene"));
}

function main() {
  assertImageFiles();
  const log = [];
  testFirstKnockHall(log);
  testFirstKnockGarden(log);
  testThorinHall(log);
  testThorinGarden(log);
  testPersistentVariants(log);
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

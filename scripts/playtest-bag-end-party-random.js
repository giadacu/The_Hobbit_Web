const fs = require("fs");
const path = require("path");
const { bootGame, outputLines, makeSeededRandom, withSeed } = require("./headless-boot");

const SEED_COUNT = Number(process.env.SEED_COUNT || 24);
const STEP_LIMIT = Number(process.env.STEP_LIMIT || 80);
const ISSUES = [];

const FEAST_SEEN = /\b(plates disappear|house fills with laughter|chorus grows louder|pantry is beginning to look)/i;
const FEAST_HEARD = /\b(from elsewhere in bag end|somewhere deeper in the smial|distant chair-scrapes)/i;
const PRE_PARTY_FEAST = /\b(sizzling in butter|cutlery, cupboard|dwarf laughter|dwarven song)/i;
const HEARTH_SEEN = /\bsettles near the hearth\b/i;
const HEARTH_AMBIENT = /\b(by the hearth|near the hearth|near the fire)\b/i;
const BALIN_HEARD = /\b(from the parlour comes|withdraws toward the parlour)/i;
const QUIET_START = /\b(gandalf lingers nearby|carefully arranged evening|quiet before a larger design|first note of a tune)\b/i;
const MOVE_SEEN = /\b(wanders off toward|slips out into the garden|comes out into the garden|goes back inside|comes in again from the garden|slips away in search)\b/i;

function note(runId, type, detail, ctx = {}) {
  ISSUES.push({ runId, type, detail, ...ctx });
}

function pick(rng, list) {
  if (!list.length) return null;
  return list[Math.floor(rng() * list.length)];
}

function peopleHere(game) {
  return Object.values(game.characters || {}).filter(
    (c) => c && c.id !== game.player?.id && c.position === game.currentRoom && c.visible !== false
  );
}

function dwarvesHere(game) {
  return peopleHere(game).filter((c) => game.unexpectedParty?.isAmbientDwarf(c));
}

function gandalfHere(game) {
  return game.characters.gandalf?.position === game.currentRoom;
}

function candidates(game, rng) {
  const cmds = ["look", "wait", "wait", "inventory", "exits"];
  for (const connection of game.roomConnections?.() || []) {
    if (!connection.direction) continue;
    // Bag End east from garden is blocked until quest begins — still try sometimes.
    cmds.push(connection.direction);
    cmds.push(connection.direction);
  }
  if (game.currentRoom === "hobbit_hole" || game.currentRoom === "bilbos_garden") {
    cmds.push("open round green door", "close round green door");
  }
  if (game.currentRoom === "hobbit_hole") cmds.push("outside", "west", "south", "north east");
  if (game.currentRoom === "bilbos_garden") cmds.push("west", "inside");
  if (gandalfHere(game)) cmds.push("look at gandalf", "talk to gandalf", "wait");
  const dwarf = pick(rng, dwarvesHere(game));
  if (dwarf) cmds.push(`look at ${dwarf.name}`, `talk to ${dwarf.name}`);
  return cmds;
}

function checkIncongruences(runId, game, step, lines) {
  const text = lines.join("\n");
  const party = game.unexpectedParty;
  const arrived = party?.state?.arrived?.length || 0;
  const entered = game.bagEndPartyHasEnteredHouse?.() || false;
  const crowd = game.bagEndPartyShowsCrowdArt?.() || false;
  const roomImage = game.contextualRoomImage?.(game.room()) || "";
  const visibleDwarves = dwarvesHere(game);
  const ctx = {
    step: step.index,
    command: step.command,
    room: game.currentRoom,
    arrived,
    phase: game.bagEndPartyPhase?.(),
    temp: game.temporaryImage?.file || "",
    roomImage,
  };

  if (!entered && PRE_PARTY_FEAST.test(text)) {
    note(runId, "pre_party_feast_atmosphere", text.slice(0, 180), ctx);
  }

  if (roomImage.includes("_party.") && !crowd) {
    note(runId, "crowd_art_too_early", `room image ${roomImage} with arrived=${arrived}`, ctx);
  }

  if (HEARTH_SEEN.test(text) && game.currentRoom !== "bag_end_parlour") {
    note(runId, "balin_hearth_without_parlour", text.slice(0, 180), ctx);
  }

  if (HEARTH_AMBIENT.test(text) && !BALIN_HEARD.test(text) && !HEARTH_SEEN.test(text)) {
    // Pose lines like "stands near the hearth" should not appear outside parlour-like rooms.
    if (!/\b(stands near the hearth|claims a little more room by the hearth|place by the hearth|place near the hearth)\b/i.test(text)) {
      // ignore softer fire wording
    } else if (game.currentRoom !== "bag_end_parlour") {
      note(runId, "hearth_ambient_wrong_room", text.slice(0, 180), ctx);
    }
  }

  if (FEAST_SEEN.test(text) && visibleDwarves.length === 0) {
    note(runId, "feast_seen_without_visible_dwarves", text.slice(0, 180), ctx);
  }

  if (FEAST_HEARD.test(text) && visibleDwarves.length > 0) {
    // Soft: heard wording while dwarves are present is odd but not fatal.
    note(runId, "feast_heard_while_dwarves_visible", text.slice(0, 180), ctx);
  }

  if (MOVE_SEEN.test(text)) {
    // Seen-style move lines should involve this room as from or to; hard to verify perfectly.
    // Flag if no dwarves were here before and line claims local motion like "settles" — skip.
  }

  if (QUIET_START.test(text)) {
    if (!gandalfHere(game) && !party?.pendingGlimpse) {
      note(runId, "quiet_start_without_gandalf", text.slice(0, 180), ctx);
    }
    step.sawQuietStartText = true;
  }

  const gandalfGlimpse = /gandalf_glimpse_bag_end_/i.test(game.temporaryImage?.file || "");
  if (gandalfGlimpse && !gandalfHere(game) && !/not_yet|briefing/i.test(game.temporaryImage.file)) {
    note(runId, "presence_glimpse_without_co_presence", game.temporaryImage.file, ctx);
  }

  // Track whether quiet-start text ever got a glimpse in this run.
  if (step.sawQuietStartText && gandalfHere(game)) {
    step.expectQuietGlimpseSoon = true;
  }
}

function playRun(seed) {
  return withSeed(seed, () => {
    const rng = makeSeededRandom(seed + 17);
    const game = bootGame();
    outputLines.length = 0;
    game.restartGame?.();
    outputLines.length = 0;
    if (Number.isFinite(seed)) game.storySeed = seed;

    const runId = `seed-${seed}`;
    const log = [];
    let quietStartTextAt = null;
    let quietStartGlimpseAt = null;
    let sharedRoomWithGandalfTurns = 0;

    for (let i = 0; i < STEP_LIMIT; i += 1) {
      const command = pick(rng, candidates(game, rng)) || "wait";
      const before = outputLines.length;
      const gandalfBefore = gandalfHere(game);
      game.execute(command);
      const lines = outputLines.slice(before);
      if (outputLines.length > 2500) outputLines.splice(0, outputLines.length - 600);

      const step = { index: i, command, room: game.currentRoom, sawQuietStartText: false };
      checkIncongruences(runId, game, step, lines);

      const joined = lines.join("\n");
      if (QUIET_START.test(joined) && quietStartTextAt == null) quietStartTextAt = i;
      if (/gandalf_glimpse_bag_end_quiet_start/i.test(game.temporaryImage?.file || "") && quietStartGlimpseAt == null) {
        quietStartGlimpseAt = i;
      }
      if (gandalfHere(game)) sharedRoomWithGandalfTurns += 1;

      log.push({
        i,
        command,
        room: game.currentRoom,
        arrived: game.unexpectedParty?.state?.arrived?.length || 0,
        phase: game.bagEndPartyPhase?.(),
        crowd: game.bagEndPartyShowsCrowdArt?.() || false,
        temp: game.temporaryImage?.file || "",
        gandalf: gandalfHere(game),
        dwarves: dwarvesHere(game).map((d) => d.name),
      });

      if (game.unexpectedParty?.state?.questBriefingDone && i > 40) break;
      if (!gandalfBefore && gandalfHere(game) && game.unexpectedParty?.pendingGlimpse) {
        // next stationary turns should flush
      }
    }

    if (quietStartTextAt != null && quietStartGlimpseAt == null && sharedRoomWithGandalfTurns >= 3) {
      // Allow pending flush within a few turns of the text.
      const laterGlimpse = log.some(
        (row, idx) => idx >= quietStartTextAt && /gandalf_glimpse_bag_end_quiet_start/i.test(row.temp || "")
      );
      if (!laterGlimpse) {
        note(runId, "quiet_start_text_without_glimpse", `text@${quietStartTextAt}, sharedGandalfTurns=${sharedRoomWithGandalfTurns}`, {
          arrived: game.unexpectedParty?.state?.arrived?.length || 0,
          pending: Boolean(game.unexpectedParty?.pendingGlimpse),
          quietStartShown: Boolean(game.unexpectedParty?.state?.quietStartShown),
          presenceCount: game.unexpectedParty?.state?.gandalfPresenceGlimpseCount || 0,
        });
      }
    }

    return {
      runId,
      seed,
      steps: log.length,
      arrived: game.unexpectedParty?.state?.arrived?.length || 0,
      thorin: Boolean(game.unexpectedParty?.state?.thorinArrived),
      briefing: Boolean(game.unexpectedParty?.state?.questBriefingDone),
      quietStartTextAt,
      quietStartGlimpseAt,
      sharedRoomWithGandalfTurns,
    };
  });
}

function main() {
  const runs = [];
  for (let n = 0; n < SEED_COUNT; n += 1) {
    const seed = 20260719 + n * 97;
    runs.push(playRun(seed));
  }

  const byType = {};
  for (const issue of ISSUES) {
    byType[issue.type] = (byType[issue.type] || 0) + 1;
  }

  const report = {
    seeds: SEED_COUNT,
    stepLimit: STEP_LIMIT,
    issueCount: ISSUES.length,
    byType,
    issues: ISSUES.slice(0, 80),
    runs: runs.map((r) => ({
      seed: r.seed,
      steps: r.steps,
      arrived: r.arrived,
      thorin: r.thorin,
      briefing: r.briefing,
      quietStartTextAt: r.quietStartTextAt,
      quietStartGlimpseAt: r.quietStartGlimpseAt,
      sharedGandalf: r.sharedRoomWithGandalfTurns,
    })),
  };

  const reportPath = path.join(__dirname, "playtest-bag-end-party-random-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Bag End random party playtest: ${SEED_COUNT} seeds x ${STEP_LIMIT} steps`);
  console.log(`Issues: ${ISSUES.length}`);
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}x ${type}`);
  }
  if (!ISSUES.length) console.log("  (none)");
  console.log(`Report: ${reportPath}`);

  // Soft fail only on hard incongruences.
  const hard = ISSUES.filter((i) => ![
    "feast_heard_while_dwarves_visible",
  ].includes(i.type));
  if (hard.length) {
    console.error(`Hard incongruences: ${hard.length}`);
    process.exitCode = 2;
  }
  process.exit(process.exitCode || 0);
}

try {
  main();
} catch (error) {
  console.error(`Bag End random party playtest failed: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}
